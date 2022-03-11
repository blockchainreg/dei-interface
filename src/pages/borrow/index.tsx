import React, { useCallback } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'

import { BorrowPool } from 'state/borrow/reducer'

import Hero from 'components/Hero'
import Disclaimer from 'components/Disclaimer'
import { useSearch, SearchField, Table } from 'components/App/Borrow'

const Container = styled.div`
  display: flex;
  flex-flow: column nowrap;
  overflow: visible;
  margin: 0 auto;
`

const Wrapper = styled(Container)`
  margin: 0 auto;
  margin-top: 50px;
  width: clamp(250px, 90%, 1200px);

  & > * {
    &:nth-child(2) {
      margin-bottom: 25px;
      display: flex;
      flex-flow: row nowrap;
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

export default function Borrow() {
  const router = useRouter()
  const { snapshot, searchProps } = useSearch()

  const onMintClick = useCallback(
    (contract: string) => {
      router.push(`/borrow/${contract}`)
    },
    [router]
  )

  return (
    <Container>
      <Hero>Get ready to borrow.</Hero>
      <Wrapper>
        <div style={{ marginBottom: '15px' }}>Total DEI Borrowed: N/A</div>
        <div>
          <SearchField searchProps={searchProps} />
          {/* <PrimaryButton>Claim All</PrimaryButton> */}
        </div>
        <Table options={snapshot.options as unknown as BorrowPool[]} onMintClick={onMintClick} />
      </Wrapper>
      <Disclaimer />
    </Container>
  )
}
