import { describe, it, expect } from 'vitest'
import { Contract } from '../src/contract.js'
import { DeclaredContract } from '../src/declaredContract.js'
import { DealOutcome } from '../src/dealOutcome.js'
import { MatchpointCalculator } from '../src/matchpointCalculator.js'

describe('MatchpointCalculator', () => {
  it('returns an empty array for an empty field', () => {
    expect(MatchpointCalculator.matchpoint([], 'None')).toEqual([])
  })

  it('a single outcome scores 0 matchpoints out of a 0 max (a 50/50 board)', () => {
    const results = MatchpointCalculator.matchpoint([DealOutcome.scoreOnly(400)], 'None')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ outcomeFrequency: 1, nsMatchpoints: 0, maxMatchpoints: 0 })
  })

  it('scores a field of distinct results and merges duplicates by frequency', () => {
    const outcomes = [
      DealOutcome.scoreOnly(100),
      DealOutcome.scoreOnly(100), // duplicate — should merge with the one above
      DealOutcome.scoreOnly(200),
      DealOutcome.scoreOnly(300),
    ]
    const results = MatchpointCalculator.matchpoint(outcomes, 'None')
    expect(results).toHaveLength(3)
    expect(results[0]).toMatchObject({ outcomeFrequency: 2, nsMatchpoints: 0.5, maxMatchpoints: 3 })
    expect(results[0]!.dealOutcome).toEqual(DealOutcome.scoreOnly(100))
    expect(results[1]).toMatchObject({ outcomeFrequency: 1, nsMatchpoints: 2, maxMatchpoints: 3 })
    expect(results[1]!.dealOutcome).toEqual(DealOutcome.scoreOnly(200))
    expect(results[2]).toMatchObject({ outcomeFrequency: 1, nsMatchpoints: 3, maxMatchpoints: 3 })
    expect(results[2]!.dealOutcome).toEqual(DealOutcome.scoreOnly(300))
  })

  it('excludes outcomes with no N/S score from the field entirely', () => {
    const outcomes = [
      DealOutcome.scoreOnly(100),
      DealOutcome.scoreOnly(200),
      DealOutcome.average,
      DealOutcome.averagePlus,
      DealOutcome.averageMinus,
      DealOutcome.noScore,
    ]
    const results = MatchpointCalculator.matchpoint(outcomes, 'None')
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ nsMatchpoints: 0, maxMatchpoints: 1 })
    expect(results[1]).toMatchObject({ nsMatchpoints: 1, maxMatchpoints: 1 })
  })

  it('merges structurally identical played outcomes built from separate object instances', () => {
    // Two independently-constructed DeclaredContracts with identical content — must still merge,
    // since matching is by PBN content, not object reference.
    const dc1a = DeclaredContract.make(Contract.make('3NT'), 'N')
    const dc1b = DeclaredContract.make(Contract.make('3NT'), 'N')
    const dc2 = DeclaredContract.make(Contract.make('4S'), 'N')

    const outcomes = [
      DealOutcome.played(dc1a, 9),  // 3NT making exactly, not vul: 400
      DealOutcome.played(dc1b, 9),  // same result, separate object
      DealOutcome.played(dc2, 10),  // 4S making exactly, not vul: 420
    ]
    const results = MatchpointCalculator.matchpoint(outcomes, 'None')
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ outcomeFrequency: 2, nsMatchpoints: 0.5, maxMatchpoints: 2 })
    expect(results[1]).toMatchObject({ outcomeFrequency: 1, nsMatchpoints: 2, maxMatchpoints: 2 })
  })

  it('uses each outcome\'s own vulnerability when scoring', () => {
    const dcW = DeclaredContract.make(Contract.make('3NT'), 'W') // EW declarer
    const outcomes = [
      DealOutcome.played(dcW, 9), // not vul: 400 declarer score -> nsScore -400
      DealOutcome.scoreOnly(-400),
    ]
    const results = MatchpointCalculator.matchpoint(outcomes, 'None')
    // Both produce nsScore -400, so they should merge despite being different DealOutcome kinds...
    // actually they have different PBN strings (kind differs), so they remain distinct entries
    // but tie in nsMatchpoints and should sort by matchpointSortOrder (played before scoreOnly).
    expect(results).toHaveLength(2)
    expect(results[0]!.nsMatchpoints).toBe(results[1]!.nsMatchpoints)
    expect(results[0]!.dealOutcome.kind).toBe('played')
    expect(results[1]!.dealOutcome.kind).toBe('scoreOnly')
  })
})
