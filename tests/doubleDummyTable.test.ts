import { describe, it, expect } from 'vitest'
import { DoubleDummyTable } from '../src/doubleDummyTable.js'

// Real-world example from a PBN hand record: N=S=[NT7,S9,H6,D6,C8], E=W=[NT6,S4,H6,D7,C4]
const SAMPLE_PBN = '79668796686467464674'

describe('DoubleDummyTable', () => {
  it('creates an empty instance', () => {
    const dd = DoubleDummyTable.make()
    expect(dd.N).toEqual({})
    expect(dd.E).toEqual({})
    expect(dd.S).toEqual({})
    expect(dd.W).toEqual({})
  })

  it('withTricks sets a single value without mutating the original', () => {
    const dd = DoubleDummyTable.make()
    const updated = DoubleDummyTable.withTricks(dd, 'N', 'NT', 9)
    expect(updated.N.NT).toBe(9)
    expect(dd.N.NT).toBeUndefined()
  })

  it('parses a PBN double dummy tricks string', () => {
    const dd = DoubleDummyTable.fromPBN(SAMPLE_PBN)!
    expect(dd.N).toEqual({ NT: 7, S: 9, H: 6, D: 6, C: 8 })
    expect(dd.S).toEqual({ NT: 7, S: 9, H: 6, D: 6, C: 8 })
    expect(dd.E).toEqual({ NT: 6, S: 4, H: 6, D: 7, C: 4 })
    expect(dd.W).toEqual({ NT: 6, S: 4, H: 6, D: 7, C: 4 })
  })

  it('round-trips through PBN', () => {
    const dd = DoubleDummyTable.fromPBN(SAMPLE_PBN)!
    expect(DoubleDummyTable.toPBN(dd)).toBe(SAMPLE_PBN)
  })

  it('treats F digits as unknown', () => {
    const pbn = 'F'.repeat(20)
    const dd = DoubleDummyTable.fromPBN(pbn)!
    expect(dd.N).toEqual({})
    expect(DoubleDummyTable.toPBN(dd)).toBe(pbn)
  })

  it('rejects a string of the wrong length', () => {
    expect(DoubleDummyTable.fromPBN('7966879668')).toBeUndefined()
    expect(DoubleDummyTable.fromPBN(SAMPLE_PBN + '7')).toBeUndefined()
  })

  it('drops bogus 1-trick entries when every non-making contract is a 1', () => {
    // All 20 positions "make" exactly 1 trick below game -> treated as bogus/unknown data.
    const pbn = '1'.repeat(20)
    const dd = DoubleDummyTable.fromPBN(pbn)!
    for (const direction of ['N', 'S', 'E', 'W'] as const) {
      expect(dd[direction]).toEqual({})
    }
  })

  it('keeps 1-trick entries when at least one position makes 2-6 tricks', () => {
    // N/NT=13 (>=7, doesn't disqualify), N/S=3 (a genuine below-game make, disqualifies
    // the "all non-making are 1" bogus-data heuristic), everything else claims 1.
    const pbn = 'd3' + '1'.repeat(18)
    const dd = DoubleDummyTable.fromPBN(pbn)!
    expect(dd.N.NT).toBe(13)
    expect(dd.N.S).toBe(3)
    expect(dd.N.H).toBe(1)
    expect(dd.S.NT).toBe(1)
  })

  it('rotates: N,S,E,W tricks move with the rotated direction', () => {
    const dd = DoubleDummyTable.fromPBN(SAMPLE_PBN)!
    const rotated = DoubleDummyTable.rotated(dd, 1)
    expect(rotated.E).toEqual(dd.N)
    expect(rotated.W).toEqual(dd.S)
    expect(rotated.S).toEqual(dd.E)
    expect(rotated.N).toEqual(dd.W)
  })

  it('rotating by 0 seats is a no-op', () => {
    const dd = DoubleDummyTable.fromPBN(SAMPLE_PBN)!
    expect(DoubleDummyTable.rotated(dd, 0)).toEqual(dd)
  })
})
