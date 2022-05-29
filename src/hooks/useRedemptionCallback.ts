import { useCallback, useMemo } from 'react'
import { Currency, CurrencyAmount, NativeCurrency, Token } from '@sushiswap/core-sdk'

import { useTransactionAdder } from 'state/transactions/hooks'
import useWeb3React from 'hooks/useWeb3'
import { useDynamicRedeemerContract } from 'hooks/useContract'
import { toHex } from 'utils/hex'
import { createTransactionCallback } from 'utils/web3'

export enum RedeemCallbackState {
  INVALID = 'INVALID',
  VALID = 'VALID',
}

export default function useRedemptionCallback(
  deiCurrency: Currency | undefined | null,
  usdcCurrency: Currency | undefined | null,
  deiAmount: CurrencyAmount<NativeCurrency | Token> | null | undefined,
  usdcAmount: CurrencyAmount<NativeCurrency | Token> | null | undefined,
  deusAmount: string | null | undefined
): {
  state: RedeemCallbackState
  callback: null | (() => Promise<string>)
  error: string | null
} {
  const { account, chainId, library } = useWeb3React()
  const addTransaction = useTransactionAdder()
  const dynamicRedeemer = useDynamicRedeemerContract()

  const constructCall = useCallback(() => {
    try {
      if (!account || !library || !dynamicRedeemer || !deiAmount) {
        throw new Error('Missing dependencies.')
      }

      const methodName = 'redeemDEI'
      const args = [toHex(deiAmount.quotient)]

      return {
        address: dynamicRedeemer.address,
        calldata: dynamicRedeemer.interface.encodeFunctionData(methodName, args) ?? '',
        value: 0,
      }
    } catch (error) {
      return {
        error,
      }
    }
  }, [account, library, dynamicRedeemer, deiAmount])

  return useMemo(() => {
    if (!account || !chainId || !library || !dynamicRedeemer || !usdcCurrency || !deiCurrency || !deiAmount) {
      return {
        state: RedeemCallbackState.INVALID,
        callback: null,
        error: 'Missing dependencies',
      }
    }
    if (!usdcAmount || !deusAmount || !deiAmount) {
      return {
        state: RedeemCallbackState.INVALID,
        callback: null,
        error: 'No amount provided',
      }
    }
    const methodName = 'Redeem'
    const summary = `Redeem ${deiAmount?.toSignificant()} DEI for ${usdcAmount?.toSignificant()} USDC & $${deusAmount} as DEUS NFT`

    return {
      state: RedeemCallbackState.VALID,
      error: null,
      callback: () => createTransactionCallback(methodName, constructCall, addTransaction, account, library, summary),
    }
  }, [
    account,
    chainId,
    library,
    addTransaction,
    constructCall,
    dynamicRedeemer,
    usdcCurrency,
    deiCurrency,
    usdcAmount,
    deusAmount,
    deiAmount,
  ])
}
/* 
 callback: async function onRedeem(): Promise<string> {
        console.log('onRedeem callback')
        const call = constructCall()
        const { address, calldata, value } = call

        if ('error' in call) {
          console.error(call.error)
          if (call.error.message) {
            throw new Error(call.error.message)
          } else {
            throw new Error('Unexpected error. Could not construct calldata.')
          }
        }

        const tx = !value
          ? { from: account, to: address, data: calldata }
          : { from: account, to: address, data: calldata, value }

        console.log('REDEEM TRANSACTION', { tx, value })
        const isForceEnabled = true

        let estimatedGas = await library.estimateGas(tx).catch((gasError) => {
          console.debug('Gas estimate failed, trying eth_call to extract error', call)

          return library
            .call(tx)
            .then((result) => {
              console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
              return {
                error: new Error('Unexpected issue with estimating the gas. Please try again.'),
              }
            })
            .catch((callError) => {
              console.debug('Call threw an error', call, callError)
              toast.error(DefaultHandlerError(callError))
              return {
                error: new Error(callError.message), // TODO make this human readable
              }
            })
        })

        if ('error' in estimatedGas) {
          if (isForceEnabled) {
            estimatedGas = BigNumber.from(500_000)
          } else {
            throw new Error('Unexpected error. Could not estimate gas for this transaction.')
          }
        }

        return library
          .getSigner()
          .sendTransaction({
            ...tx,
            ...(estimatedGas ? { gasLimit: calculateGasMargin(estimatedGas) } : {}),
            // gasPrice /// TODO add gasPrice based on EIP 1559
          })
          .then((response: TransactionResponse) => {
            console.log(response)
            const summary = `Redeem ${deiAmount?.toSignificant()} DEI for ${usdcAmount?.toSignificant()} USDC & $${deusAmount} as DEUS NFT`
            addTransaction(response, { summary })

            return response.hash
          })
          .catch((error) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Transaction failed`, error, address, calldata, value)
              throw new Error(`Transaction failed: ${error.message}`)
            }
          })
      }, */
