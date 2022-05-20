import React, { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { darken } from 'polished'

import { useCurrencyBalance } from 'state/wallet/hooks'
import { useWalletModalToggle } from 'state/application/hooks'
import useWeb3React from 'hooks/useWeb3'
import { useSupportedChainId } from 'hooks/useSupportedChainId'
import useApproveCallback, { ApprovalState } from 'hooks/useApproveCallback'
import useRedemptionCallback from 'hooks/useRedemptionCallback'
import { useRedeemAmounts, useRedeemData } from 'hooks/useRedemptionPage'
import { tryParseAmount } from 'utils/parse'

import { PrimaryButton } from 'components/Button'
import Hero, { HeroSubtext } from 'components/Hero'
import Disclaimer from 'components/Disclaimer'
import InputBox from 'components/App/Redemption/InputBox'
import { DEI_ADDRESS, USDC_ADDRESS, DEUS_ADDRESS } from 'constants/addresses'
import { SupportedChainId } from 'constants/chains'
import { useCurrency } from 'hooks/useCurrency'
import { Loader } from 'components/Icons'
import { RowBetween, RowStart } from 'components/Row'
import { CountDown } from 'components/App/Redemption/CountDown'
import { DotFlashing } from 'components/Icons'

import { DEI_TOKEN, DEUS_TOKEN, USDC_TOKEN } from 'constants/tokens'
import { DynamicRedeemer } from 'constants/addresses'

const Container = styled.div`
  display: flex;
  flex-flow: column nowrap;
  overflow: visible;
  margin: 0 auto;
`

const Wrapper = styled(Container)`
  margin: 0 auto;
  margin-top: 50px;
  width: clamp(250px, 90%, 500px);

  & > * {
    &:nth-child(2) {
      margin-bottom: 25px;
      display: flex;
      width: 100%;
      gap: 15px;
      & > * {
        &:last-child {
          max-width: 300px;
        }
      }
    }
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    margin-top: 20px;
  `}
`


// const RedemptionInfoWrapper = styled.div`
const RedemptionInfoWrapper = styled(RowBetween)`
  // display: grid;
  // gap: 10px;
  justify-content: center;
  // grid-template-columns: auto auto auto;
  flex-wrap: nowrap;
  overflow: hidden;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.bg1};
  border: 1px solid ${({ theme }) => theme.border1};
  border-radius: 2px;
  padding: 1.5rem 2rem;

  ${({ theme }) => theme.mediaWidth.upToSmall`
  padding: 1rem;
  display: grid;
  row-gap: 20px;
  justify-content: center;
  grid-template-columns: auto;
  `}
`

const InfoRow = styled(RowStart)`
  display: flex;
  flex-flow: row nowrap;
  white-space: nowrap;
`

const ItemValue = styled.div`
  color: ${({ theme }) => theme.yellow3};
  margin-left: 5px;
`

const Description = styled.div`
  font-size: 0.5rem;
  color: ${({ theme }) => darken(0.4, theme.text1)};
`

export default function Redemption() {
  const { chainId, account } = useWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const isSupportedChainId = useSupportedChainId()

    const [deusPrice, setDeusPrice] = useState(43)
  const [deusAmount, setDeusAmount] = useState(10)
  
  const deiCurrency = DEI_TOKEN
  const usdcCurrency = USDC_TOKEN
  const deusCurrency = DEUS_TOKEN
  const deiCurrencyBalance = useCurrencyBalance(account ?? undefined, deiCurrency)

  const { amountIn, amountOut1, amountOut2, onUserInput, onUserOutput1, onUserOutput2 } = useRedeemAmounts()
  const { redeemPaused } = useRedeemData()
  // console.log({ redeemPaused, rest })

  // Amount typed in either fields
  const deiAmount = useMemo(() => {
    return tryParseAmount(amountIn, deiCurrency || undefined)
  }, [amountIn, deiCurrency])

  const insufficientBalance = useMemo(() => {
    if (!deiAmount) return false
    return deiCurrencyBalance?.lessThan(deiAmount)
  }, [deiCurrencyBalance, deiAmount])

  const usdcAmount = useMemo(() => {
    return tryParseAmount(amountOut1, usdcCurrency || undefined)
  }, [amountOut1, usdcCurrency])

  const {
    state: redeemCallbackState,
    callback: redeemCallback,
    error: redeemCallbackError,
  } = useRedemptionCallback(deiCurrency, usdcCurrency, deiAmount, usdcAmount, amountOut2)

  const [awaitingApproveConfirmation, setAwaitingApproveConfirmation] = useState<boolean>(false)
  const spender = useMemo(() => (chainId ? DynamicRedeemer[chainId] : undefined), [chainId])
  const [approvalState, approveCallback] = useApproveCallback(deiCurrency ?? undefined, spender)
  const [showApprove, showApproveLoader] = useMemo(() => {
    const show = deiCurrency && approvalState !== ApprovalState.APPROVED && !!amountIn
    return [show, show && approvalState === ApprovalState.PENDING]
  }, [deiCurrency, approvalState, amountIn])

  const handleApprove = async () => {
    setAwaitingApproveConfirmation(true)
    await approveCallback()
    setAwaitingApproveConfirmation(false)
  }

  const handleRedeem = useCallback(async () => {
    console.log('called handleRedeem')
    console.log(redeemCallbackState, redeemCallback, redeemCallbackError)
    if (!redeemCallback) return

    // let error = ''
    try {
      const txHash = await redeemCallback()
      console.log({ txHash })
    } catch (e) {
      if (e instanceof Error) {
        // error = e.message
      } else {
        console.error(e)
        // error = 'An unknown error occurred.'
      }
    }
  }, [redeemCallbackState, redeemCallback, redeemCallbackError])

  function getApproveButton(): JSX.Element | null {
    if (!isSupportedChainId || !account) {
      return null
    }
    if (awaitingApproveConfirmation) {
      return (
        <PrimaryButton active>
          Awaiting Confirmation <DotFlashing style={{ marginLeft: '10px' }} />
        </PrimaryButton>
      )
    }
    if (showApproveLoader) {
      return (
        <PrimaryButton active>
          Approving <DotFlashing style={{ marginLeft: '10px' }} />
        </PrimaryButton>
      )
    }
    if (showApprove) {
      return <PrimaryButton onClick={handleApprove}>Allow us to spend {deiCurrency?.symbol}</PrimaryButton>
    }
    return null
  }

  function getActionButton(): JSX.Element | null {
    if (!chainId || !account) {
      return <PrimaryButton onClick={toggleWalletModal}>Connect Wallet</PrimaryButton>
    }
    if (showApprove) {
      return null
    }
    if (redeemPaused) {
      return <PrimaryButton disabled>Redeem Paused</PrimaryButton>
    }

    if (insufficientBalance) {
      return <PrimaryButton disabled>Insufficient {deiCurrency?.symbol} Balance</PrimaryButton>
    }

    return <PrimaryButton onClick={() => handleRedeem()}>Redeem DEI</PrimaryButton>
  }

  const redemptionInfo = [
    { label: 'Deus Ratio', value: '9' },
    { label: 'Usdc Ratio', value: '9' },
    { label: 'Remaining Amount', value: '9' },
    { label: 'End Time', value: <CountDown hours={0} minutes={24} seconds={5} /> },
  ]

  return (
    <Container>
      <Hero>
        <div>Redemption</div>
        <HeroSubtext>redeem your dei</HeroSubtext>
      </Hero>
      <Wrapper>

        <RedemptionInfoWrapper>
          {redemptionInfo.map((item, index) => (
            <InfoRow key={index}>
              {item.label}: <ItemValue>{item.value == '0' ? <Loader /> : item.value}</ItemValue>
            </InfoRow>
          ))}
        </RedemptionInfoWrapper>
        <InputBox currency={deiCurrency} value={amountIn} onChange={(value: string) => onUserInput(value)} />
        <InputBox currency={usdcCurrency} value={amountOut1} onChange={(value: string) => onUserOutput1(value)} />
        <InputBox currency={deusCurrency} value={amountOut2} onChange={(value: string) => onUserOutput2(value)} />
        <Description>{`get ${deusAmount} DEUS with ${deusPrice} price.`}</Description>
        <div style={{ marginTop: '20px' }}></div>
        {getApproveButton()}
        {getActionButton()}

      </Wrapper>
      <Disclaimer />
    </Container>
  )
}
