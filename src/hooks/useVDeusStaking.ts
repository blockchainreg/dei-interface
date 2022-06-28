import { useMemo } from 'react'
import { useERC20Contract, useMasterChefV2Contract, useVDeusMasterChefV2Contract } from 'hooks/useContract'
import { useSingleContractMultipleMethods } from 'state/multicall/hooks'
import { toBN } from 'utils/numbers'
import { formatUnits } from '@ethersproject/units'
import { useDeusPrice } from './useCoingeckoPrice'
import { vDeusMasterChefV2 } from 'constants/addresses'
import { SupportedChainId } from 'constants/chains'

const pids = [0, 1, 2]
const stakingTokens: { [pid: number]: string } = {
  [pids[0]]: '0x24651a470D08009832d62d702d1387962A2E5d60',
  [pids[1]]: '0x65875f75d5CDEf890ea97ADC43E216D3f0c2b2D8',
  [pids[2]]: '0xCf18eCa0EaC101eb47828BFd460D1922000213db',
}

export function useGlobalMasterChefData(): {
  tokenPerSecond: number
  totalAllocPoint: number
  poolLength: number
} {
  const contract = useVDeusMasterChefV2Contract()

  const calls = [
    {
      methodName: 'tokenPerSecond',
      callInputs: [],
    },
    {
      methodName: 'totalAllocPoint',
      callInputs: [],
    },
    {
      methodName: 'poolLength',
      callInputs: [],
    },
  ]

  const [tokenPerSecond, totalAllocPoint, poolLength] = useSingleContractMultipleMethods(contract, calls)

  console.log({ tokenPerSecond, totalAllocPoint, poolLength })

  const { tokenPerSecondValue, totalAllocPointValue, poolLengthValue } = useMemo(() => {
    return {
      tokenPerSecondValue: tokenPerSecond?.result ? toBN(formatUnits(tokenPerSecond.result[0], 18)).toNumber() : 0,
      totalAllocPointValue: totalAllocPoint?.result ? toBN(totalAllocPoint.result[0].toString()).toNumber() : 0,
      poolLengthValue: poolLength?.result ? toBN(poolLength.result[0].toString()).toNumber() : 0,
    }
  }, [tokenPerSecond, totalAllocPoint, poolLength])

  return {
    tokenPerSecond: tokenPerSecondValue,
    totalAllocPoint: totalAllocPointValue,
    poolLength: poolLengthValue,
  }
}

//TODO: totalDeposited should consider decimals of token
export function usePoolInfo(pid: number): {
  accTokensPerShare: number
  lastRewardBlock: number
  allocPoint: number
  totalDeposited: number
} {
  const contract = useVDeusMasterChefV2Contract()
  const tokenAddress = stakingTokens[pid]

  const ERC20Contract = useERC20Contract(tokenAddress)
  const calls = [
    {
      methodName: 'poolInfo',
      callInputs: [pid.toString()],
    },
  ]

  const balanceCall = [
    {
      methodName: 'balanceOf',
      callInputs: [vDeusMasterChefV2[SupportedChainId.FANTOM]],
    },
  ]

  const [poolInfo] = useSingleContractMultipleMethods(contract, calls)
  const [tokenBalance] = useSingleContractMultipleMethods(ERC20Contract, balanceCall)
  console.log({ tokenBalance, poolInfo })

  const { accTokensPerShare, lastRewardBlock, allocPoint, totalDeposited } = useMemo(() => {
    return {
      accTokensPerShare: poolInfo?.result ? toBN(poolInfo.result[0].toString()).toNumber() : 0,
      lastRewardBlock: poolInfo?.result ? toBN(poolInfo.result[1].toString()).toNumber() : 0,
      allocPoint: poolInfo?.result ? toBN(poolInfo.result[2].toString()).toNumber() : 0,
      totalDeposited: tokenBalance?.result ? toBN(formatUnits(tokenBalance.result[0], 18)).toNumber() : 0,
    }
  }, [poolInfo, tokenBalance])

  return {
    accTokensPerShare,
    lastRewardBlock,
    allocPoint,
    totalDeposited,
  }
}

export function useGetApr(pid: number): number {
  const { tokenPerSecond, totalAllocPoint } = useGlobalMasterChefData()
  const { totalDeposited, allocPoint } = usePoolInfo(pid)

  const deusPrice = useDeusPrice()
  if (totalDeposited === 0 || totalAllocPoint === 0) return 0
  return (
    (tokenPerSecond * (allocPoint / totalAllocPoint) * parseFloat(deusPrice) * 365 * 24 * 60 * 60 * 100) /
    totalDeposited
  )
}
