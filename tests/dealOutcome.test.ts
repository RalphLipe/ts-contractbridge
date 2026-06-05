import { describe, it, expect } from 'vitest'
import { Contract } from '../src/contract.js'
import { DeclaredContract } from '../src/declaredContract.js'
import { DealOutcome } from '../src/dealOutcome.js'

const dc = DeclaredContract.make(Contract.make('3NT'), 'W')
const dcDoubled = DeclaredContract.make(Contract.make('4H', 'X'), 'N')

describe('DealOutcome', () => {
  it('singleton constants', () => {
    expect(DealOutcome.passedOut.kind).toBe('passedOut')
    expect(DealOutcome.average.kind).toBe('average')
    expect(DealOutcome.averagePlus.kind).toBe('averagePlus')
    expect(DealOutcome.averageMinus.kind).toBe('averageMinus')
    expect(DealOutcome.noScore.kind).toBe('noScore')
  })

  it('played constructor', () => {
    const o = DealOutcome.played(dc, 9)
    expect(o.kind).toBe('played')
    if (o.kind === 'played') {
      expect(o.declaredContract).toEqual(dc)
      expect(o.tricksTaken).toBe(9)
    }
  })

  it('scoreOnly constructor', () => {
    const o = DealOutcome.scoreOnly(-50)
    expect(o.kind).toBe('scoreOnly')
    if (o.kind === 'scoreOnly') expect(o.nsScore).toBe(-50)
  })

  it('declaredContract accessor', () => {
    expect(DealOutcome.declaredContract(DealOutcome.played(dc, 9))).toEqual(dc)
    expect(DealOutcome.declaredContract(DealOutcome.passedOut)).toBeUndefined()
    expect(DealOutcome.declaredContract(DealOutcome.scoreOnly(100))).toBeUndefined()
  })

  it('pbn for keywords', () => {
    expect(DealOutcome.pbn(DealOutcome.passedOut)).toBe('Pass')
    expect(DealOutcome.pbn(DealOutcome.average)).toBe('AVE')
    expect(DealOutcome.pbn(DealOutcome.averagePlus)).toBe('AVE+')
    expect(DealOutcome.pbn(DealOutcome.averageMinus)).toBe('AVE-')
    expect(DealOutcome.pbn(DealOutcome.noScore)).toBe('NS')
  })

  it('pbn for scoreOnly', () => {
    expect(DealOutcome.pbn(DealOutcome.scoreOnly(100))).toBe('100')
    expect(DealOutcome.pbn(DealOutcome.scoreOnly(-50))).toBe('-50')
  })

  it('pbn for played: making exactly', () => {
    expect(DealOutcome.pbn(DealOutcome.played(dc, 9))).toBe('3NTW=')
  })

  it('pbn for played: overtricks', () => {
    expect(DealOutcome.pbn(DealOutcome.played(dc, 10))).toBe('3NTW+1')
    expect(DealOutcome.pbn(DealOutcome.played(dcDoubled, 12))).toBe('4HXN+2')
  })

  it('pbn for played: undertricks', () => {
    expect(DealOutcome.pbn(DealOutcome.played(dc, 8))).toBe('3NTW-1')
    expect(DealOutcome.pbn(DealOutcome.played(dc, 6))).toBe('3NTW-3')
  })

  it('fromPBN keywords', () => {
    expect(DealOutcome.fromPBN('PASS')).toEqual(DealOutcome.passedOut)
    expect(DealOutcome.fromPBN('pass')).toEqual(DealOutcome.passedOut)
    expect(DealOutcome.fromPBN('AVE')).toEqual(DealOutcome.average)
    expect(DealOutcome.fromPBN('AVE+')).toEqual(DealOutcome.averagePlus)
    expect(DealOutcome.fromPBN('AVE-')).toEqual(DealOutcome.averageMinus)
    expect(DealOutcome.fromPBN('NS')).toEqual(DealOutcome.noScore)
  })

  it('fromPBN scoreOnly', () => {
    expect(DealOutcome.fromPBN('100')).toEqual(DealOutcome.scoreOnly(100))
    expect(DealOutcome.fromPBN('-50')).toEqual(DealOutcome.scoreOnly(-50))
  })

  it('fromPBN played', () => {
    expect(DealOutcome.fromPBN('3NTW=')).toEqual(DealOutcome.played(dc, 9))
    expect(DealOutcome.fromPBN('3NTW==')).toEqual(DealOutcome.played(dc, 9))
    expect(DealOutcome.fromPBN('3NTW+1')).toEqual(DealOutcome.played(dc, 10))
    expect(DealOutcome.fromPBN('3NTW-1')).toEqual(DealOutcome.played(dc, 8))
    expect(DealOutcome.fromPBN('4HXN+2')).toEqual(DealOutcome.played(dcDoubled, 12))
  })

  it('fromPBN returns undefined for invalid input', () => {
    expect(DealOutcome.fromPBN('garbage')).toBeUndefined()
    expect(DealOutcome.fromPBN('3NTW')).toBeUndefined()       // missing suffix
    expect(DealOutcome.fromPBN('3NTZ=')).toBeUndefined()      // bad direction
  })

  it('rotated: played rotates the declaredContract', () => {
    const o = DealOutcome.played(DeclaredContract.make(Contract.make('3NT'), 'N'), 9)
    const r = DealOutcome.rotated(o, 1)
    expect(r.kind).toBe('played')
    if (r.kind === 'played') {
      expect(r.declaredContract.declarer).toBe('E')
      expect(r.tricksTaken).toBe(9)
    }
  })

  it('rotated: scoreOnly negates on odd seats, unchanged on even', () => {
    const o = DealOutcome.scoreOnly(420)
    expect(DealOutcome.rotated(o, 1)).toEqual(DealOutcome.scoreOnly(-420))
    expect(DealOutcome.rotated(o, 3)).toEqual(DealOutcome.scoreOnly(-420))
    expect(DealOutcome.rotated(o, 2)).toEqual(o)
    expect(DealOutcome.rotated(o, 4)).toEqual(o)
  })

  it('rotated: averagePlus/averageMinus swap on odd seats', () => {
    expect(DealOutcome.rotated(DealOutcome.averagePlus, 1)).toEqual(DealOutcome.averageMinus)
    expect(DealOutcome.rotated(DealOutcome.averageMinus, 1)).toEqual(DealOutcome.averagePlus)
    expect(DealOutcome.rotated(DealOutcome.averagePlus, 2)).toEqual(DealOutcome.averagePlus)
  })

  it('rotated: passedOut, average, noScore are unchanged', () => {
    expect(DealOutcome.rotated(DealOutcome.passedOut, 1)).toEqual(DealOutcome.passedOut)
    expect(DealOutcome.rotated(DealOutcome.average, 1)).toEqual(DealOutcome.average)
    expect(DealOutcome.rotated(DealOutcome.noScore, 3)).toEqual(DealOutcome.noScore)
  })

  it('pbn round-trips', () => {
    const outcomes = [
      DealOutcome.played(dc, 9),
      DealOutcome.played(dc, 10),
      DealOutcome.played(dc, 8),
      DealOutcome.scoreOnly(100),
      DealOutcome.scoreOnly(-50),
      DealOutcome.passedOut,
      DealOutcome.average,
      DealOutcome.averagePlus,
      DealOutcome.averageMinus,
      DealOutcome.noScore,
    ]
    for (const o of outcomes) {
      expect(DealOutcome.fromPBN(DealOutcome.pbn(o))).toEqual(o)
    }
  })
})
