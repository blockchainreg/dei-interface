import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { getAddress } from '@ethersproject/address'
import { Currency, Token } from '@sushiswap/core-sdk'
import find from 'lodash/find'
import { AppState, useAppSelector } from 'state'

import { PendingBorrowPool, BorrowPool, BorrowState } from './reducer'
import { useCurrency } from 'hooks/useCurrency'
import { constructPercentage } from 'utils/prices'
import { SupportedChainId } from 'constants/chains'
import { CollateralType } from 'state/borrow/reducer'
import { DEI_TOKEN } from 'constants/borrow'

export function useBorrowState(): BorrowState {
  return useAppSelector((state: AppState) => state.borrow)
}

export function useBorrowPools(): BorrowPool[] {
  const { pools } = useBorrowState()
  return useMemo(() => {
    return pools.map((o) => ({
      ...o,
      liquidationFee: constructPercentage(o.liquidationFee),
    }))
  }, [pools])
}

export function use0xDaoPools(): PendingBorrowPool[] {
  const { pendingPools } = useBorrowState()
  return useMemo(() => {
    if (!pendingPools) return []
    // console.log(pendingPools)

    return pendingPools.map(
      ({ poolData }: { poolData: any }) =>
        ({
          contract: new Token(SupportedChainId.FANTOM, poolData.id, 18, poolData.symbol),
          dei: DEI_TOKEN,
          token0: new Token(SupportedChainId.FANTOM, poolData.token0Address, Number(poolData.token0Decimals)),
          token1: new Token(SupportedChainId.FANTOM, poolData.token1Address, Number(poolData.token1Decimals)),
          composition: poolData.symbol,
          type: CollateralType.OXDAO,
        } as PendingBorrowPool)
    )
  }, [pendingPools])
}

export function useBorrowPoolFromURL(): BorrowPool | null {
  const router = useRouter()
  const params = router.query?.params

  const [contract, id]: (string | null)[] = useMemo(() => {
    if (!params) return [null, null]
    try {
      const contract = params[0] ?? undefined
      const id = params[1] ?? null
      return [typeof contract === 'string' ? getAddress(contract) : null, id]
    } catch (err) {
      // err will be thrown by getAddress invalidation
      return [null, null]
    }
  }, [params])

  return useBorrowPoolByContract(contract ?? undefined, id ?? undefined)
}

export function useBorrowPoolByContract(contract: string | undefined, id: string | undefined): BorrowPool | null {
  const pools = useBorrowPools()
  return useMemo(() => {
    if (!contract) return null
    const pool = find(pools, (o) => {
      if (id == undefined) return o.generalLender.toLowerCase() === contract.toLowerCase()
      return o.generalLender.toLowerCase() === contract.toLowerCase() && o.id?.toString() === id
    })
    return pool || null
  }, [contract, id, pools])
}

export function useCurrenciesFromPool(pool: BorrowPool | undefined): {
  collateralCurrency: Currency | undefined
  borrowCurrency: Currency | undefined
} {
  const collateralCurrency = useCurrency(pool?.contract.address) || undefined
  const borrowCurrency = useCurrency(pool?.dei.address) || undefined
  return { collateralCurrency, borrowCurrency }
}

export function useAllPoolTokens() {
  const pools = useBorrowPools()
  return useMemo(() => {
    return pools.reduce((acc: Token[], pool) => {
      acc.push(...[pool.token0, pool.token1])
      return acc
    }, [])
  }, [pools])
}
