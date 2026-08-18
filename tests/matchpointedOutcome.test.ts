import { describe, it, expect } from 'vitest'
import { Contract } from '../src/contract.js'
import { DeclaredContract } from '../src/declaredContract.js'
import { DealOutcome } from '../src/dealOutcome.js'
import { MatchpointedOutcome } from '../src/matchpointedOutcome.js'

const dc = DeclaredContract.make(Contract.make('3NT'), 'W')

describe('MatchpointedOutcome', () => {
  it('make constructs from parts', () => {
    const mo = MatchpointedOutcome.make(DealOutcome.played(dc, 9), 1, 6, 8)
    expect(mo).toEqual({ dealOutcome: DealOutcome.played(dc, 9), outcomeFrequency: 1, nsMatchpoints: 6, maxMatchpoints: 8 })
  })

  it('ewMatchpoints is maxMatchpoints minus nsMatchpoints', () => {
    const mo = MatchpointedOutcome.make(DealOutcome.played(dc, 9), 1, 6, 8)
    expect(MatchpointedOutcome.ewMatchpoints(mo)).toBe(2)
  })

  it('ratioScore divides matchpoints by the max', () => {
    const mo = MatchpointedOutcome.make(DealOutcome.played(dc, 9), 1, 6, 8)
    expect(MatchpointedOutcome.ratioScore(mo, 'NS')).toBe(0.75)
    expect(MatchpointedOutcome.ratioScore(mo, 'EW')).toBe(0.25)
  })

  it('ratioScore is 50/50 when there is only a single score (maxMatchpoints <= 0)', () => {
    const mo = MatchpointedOutcome.make(DealOutcome.passedOut, 1, 0, 0)
    expect(MatchpointedOutcome.ratioScore(mo, 'NS')).toBe(0.5)
    expect(MatchpointedOutcome.ratioScore(mo, 'EW')).toBe(0.5)
  })

  describe('compare', () => {
    it('orders by nsMatchpoints first', () => {
      const low = MatchpointedOutcome.make(DealOutcome.passedOut, 1, 2, 8)
      const high = MatchpointedOutcome.make(DealOutcome.passedOut, 1, 6, 8)
      expect(MatchpointedOutcome.compare(low, high)).toBeLessThan(0)
      expect(MatchpointedOutcome.compare(high, low)).toBeGreaterThan(0)
    })

    it('ties between two played outcomes break on DeclaredContract order', () => {
      const dcLow = DeclaredContract.make(Contract.make('3NT'), 'W')
      const dcHigh = DeclaredContract.make(Contract.make('4NT'), 'W')
      const a = MatchpointedOutcome.make(DealOutcome.played(dcLow, 9), 1, 4, 8)
      const b = MatchpointedOutcome.make(DealOutcome.played(dcHigh, 10), 1, 4, 8)
      expect(MatchpointedOutcome.compare(a, b)).toBeLessThan(0)
    })

    it('ties between non-played outcomes break on the fixed sort order', () => {
      // played(0) < scoreOnly(1) < passedOut(2) < averagePlus(3) < average(4) < averageMinus(5) < noScore(6)
      const played = MatchpointedOutcome.make(DealOutcome.played(dc, 9), 1, 4, 8)
      const scoreOnly = MatchpointedOutcome.make(DealOutcome.scoreOnly(100), 1, 4, 8)
      const passedOut = MatchpointedOutcome.make(DealOutcome.passedOut, 1, 4, 8)
      expect(MatchpointedOutcome.compare(played, scoreOnly)).toBeLessThan(0)
      expect(MatchpointedOutcome.compare(scoreOnly, passedOut)).toBeLessThan(0)
      expect(MatchpointedOutcome.compare(passedOut, played)).toBeGreaterThan(0)
    })

    it('equal outcomes compare as 0', () => {
      const a = MatchpointedOutcome.make(DealOutcome.passedOut, 1, 4, 8)
      const b = MatchpointedOutcome.make(DealOutcome.passedOut, 3, 4, 8)
      expect(MatchpointedOutcome.compare(a, b)).toBe(0)
    })
  })
})
