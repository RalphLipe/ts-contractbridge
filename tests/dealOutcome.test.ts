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
    expect(DealOutcome.toPBN(DealOutcome.passedOut)).toBe('Pass')
    expect(DealOutcome.toPBN(DealOutcome.average)).toBe('AVE')
    expect(DealOutcome.toPBN(DealOutcome.averagePlus)).toBe('AVE+')
    expect(DealOutcome.toPBN(DealOutcome.averageMinus)).toBe('AVE-')
    expect(DealOutcome.toPBN(DealOutcome.noScore)).toBe('NS')
  })

  it('pbn for scoreOnly', () => {
    expect(DealOutcome.toPBN(DealOutcome.scoreOnly(100))).toBe('100')
    expect(DealOutcome.toPBN(DealOutcome.scoreOnly(-50))).toBe('-50')
  })

  it('pbn for played: making exactly', () => {
    expect(DealOutcome.toPBN(DealOutcome.played(dc, 9))).toBe('3NTW=')
  })

  it('pbn for played: overtricks', () => {
    expect(DealOutcome.toPBN(DealOutcome.played(dc, 10))).toBe('3NTW+1')
    expect(DealOutcome.toPBN(DealOutcome.played(dcDoubled, 12))).toBe('4HXN+2')
  })

  it('pbn for played: undertricks', () => {
    expect(DealOutcome.toPBN(DealOutcome.played(dc, 8))).toBe('3NTW-1')
    expect(DealOutcome.toPBN(DealOutcome.played(dc, 6))).toBe('3NTW-3')
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

  describe('nsScore / ewScore', () => {
    it('played: negates the declarer score for an EW declarer', () => {
      // dc = 3NT by W, making exactly (9 tricks). Not vul: 400. EW declared, so N/S score is -400.
      expect(DealOutcome.nsScore(DealOutcome.played(dc, 9), 'None')).toBe(-400)
      expect(DealOutcome.ewScore(DealOutcome.played(dc, 9), 'None')).toBe(400)
    })

    it('played: keeps the declarer score as-is for an NS declarer', () => {
      // dcDoubled = 4HX by N, making exactly (10 tricks). Vul: 790. NS declared, so N/S score is +790.
      expect(DealOutcome.nsScore(DealOutcome.played(dcDoubled, 10), 'NS')).toBe(790)
      expect(DealOutcome.ewScore(DealOutcome.played(dcDoubled, 10), 'NS')).toBe(-790)
    })

    it('played: uses the declarer\'s own vulnerability, not a blanket flag', () => {
      // dc = 3NT by W (EW pair): Vulnerable 'EW' makes W vul (600), 'NS' does not (400).
      expect(DealOutcome.nsScore(DealOutcome.played(dc, 9), 'EW')).toBe(-600)
      expect(DealOutcome.nsScore(DealOutcome.played(dc, 9), 'NS')).toBe(-400)
    })

    it('passedOut always scores 0', () => {
      expect(DealOutcome.nsScore(DealOutcome.passedOut, 'All')).toBe(0)
      expect(DealOutcome.ewScore(DealOutcome.passedOut, 'None')).toBe(0)
    })

    it('scoreOnly returns its stored score regardless of vulnerability', () => {
      expect(DealOutcome.nsScore(DealOutcome.scoreOnly(-140), 'All')).toBe(-140)
      expect(DealOutcome.ewScore(DealOutcome.scoreOnly(-140), 'All')).toBe(140)
    })

    it('average/averagePlus/averageMinus/noScore have no score', () => {
      expect(DealOutcome.nsScore(DealOutcome.average, 'None')).toBeUndefined()
      expect(DealOutcome.nsScore(DealOutcome.averagePlus, 'None')).toBeUndefined()
      expect(DealOutcome.nsScore(DealOutcome.averageMinus, 'None')).toBeUndefined()
      expect(DealOutcome.nsScore(DealOutcome.noScore, 'None')).toBeUndefined()
      expect(DealOutcome.ewScore(DealOutcome.average, 'None')).toBeUndefined()
    })
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
      expect(DealOutcome.fromPBN(DealOutcome.toPBN(o))).toEqual(o)
    }
  })
})
