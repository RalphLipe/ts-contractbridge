import { describe, it, expect } from 'vitest'
import { Risk, Contract } from '../src/contract.js'

describe('Risk', () => {
  it('constants', () => {
    expect(Risk.Normal).toBe('')
    expect(Risk.Doubled).toBe('X')
    expect(Risk.Redoubled).toBe('XX')
  })

  it('isRisk', () => {
    expect(Risk.isRisk('')).toBe(true)
    expect(Risk.isRisk('X')).toBe(true)
    expect(Risk.isRisk('XX')).toBe(true)
    expect(Risk.isRisk('Y')).toBe(false)
  })

  it('name', () => {
    expect(Risk.name('')).toBe('Normal')
    expect(Risk.name('X')).toBe('Doubled')
    expect(Risk.name('XX')).toBe('Redoubled')
  })

  it('fromPBN', () => {
    expect(Risk.fromPBN('')).toBe('')
    expect(Risk.fromPBN('X')).toBe('X')
    expect(Risk.fromPBN('x')).toBe('X')
    expect(Risk.fromPBN('XX')).toBe('XX')
    expect(Risk.fromPBN('xx')).toBe('XX')
    expect(Risk.fromPBN('Y')).toBeUndefined()
  })
})

describe('Contract', () => {
  it('make defaults to normal risk', () => {
    const c = Contract.make('3NT')
    expect(c.bid).toBe('3NT')
    expect(c.risk).toBe('')
  })

  it('make with explicit risk', () => {
    const c = Contract.make('4H', 'X')
    expect(c.bid).toBe('4H')
    expect(c.risk).toBe('X')
  })

  it('fromBidParts', () => {
    const c = Contract.fromBidParts(6, 'NT', 'XX')
    expect(c.bid).toBe('6NT')
    expect(c.risk).toBe('XX')
  })

  it('pbn', () => {
    expect(Contract.toPBN(Contract.make('3NT'))).toBe('3NT')
    expect(Contract.toPBN(Contract.make('4H', 'X'))).toBe('4HX')
    expect(Contract.toPBN(Contract.make('5C', 'XX'))).toBe('5CXX')
  })

  it('fromPBN', () => {
    expect(Contract.fromPBN('3NT')).toEqual({ bid: '3NT', risk: '' })
    expect(Contract.fromPBN('4hx')).toEqual({ bid: '4H', risk: 'X' })
    expect(Contract.fromPBN('5cxx')).toEqual({ bid: '5C', risk: 'XX' })
    expect(Contract.fromPBN('bad')).toBeUndefined()
  })

  it('pbn round-trips', () => {
    const contracts = [
      Contract.make('3NT'),
      Contract.make('4H', 'X'),
      Contract.make('6C', 'XX'),
    ]
    for (const c of contracts) {
      expect(Contract.fromPBN(Contract.toPBN(c))).toEqual(c)
    }
  })

  it('compare orders by bid then risk', () => {
    const a = Contract.make('3NT')
    const b = Contract.make('4C')
    const c = Contract.make('3NT', 'X')
    const d = Contract.make('3NT', 'XX')
    expect(Contract.compare(a, b)).toBeLessThan(0)
    expect(Contract.compare(b, a)).toBeGreaterThan(0)
    expect(Contract.compare(a, c)).toBeLessThan(0)
    expect(Contract.compare(c, d)).toBeLessThan(0)
    expect(Contract.compare(a, a)).toBe(0)
  })

  describe('declarerScore', () => {
    it('undoubled making exactly', () => {
      expect(Contract.declarerScore(Contract.make('4S'), false, 10)).toBe(420) // 4S making, not vul
      expect(Contract.declarerScore(Contract.make('3NT'), false, 9)).toBe(400) // 3NT making, not vul
      expect(Contract.declarerScore(Contract.make('3NT'), true, 9)).toBe(600) // 3NT making, vul
      expect(Contract.declarerScore(Contract.make('1C'), false, 7)).toBe(70)  // partscore under 100
    })

    it('undoubled with overtricks', () => {
      // 4S making 5 (2 overtricks), not vul: 420 + 2*30
      expect(Contract.declarerScore(Contract.make('4S'), false, 12)).toBe(480)
    })

    it('doubled and redoubled making exactly', () => {
      expect(Contract.declarerScore(Contract.make('4H', 'X'), true, 10)).toBe(790) // 4HX making, vul
      expect(Contract.declarerScore(Contract.make('1C', 'XX'), false, 7)).toBe(230) // 1CXX making, not vul
    })

    it('slam bonuses', () => {
      expect(Contract.declarerScore(Contract.make('6NT'), false, 12)).toBe(990)  // small slam, not vul
      expect(Contract.declarerScore(Contract.make('6NT'), true, 12)).toBe(1440)  // small slam, vul
      expect(Contract.declarerScore(Contract.make('7NT'), true, 13)).toBe(2220)  // grand slam, vul
    })

    it('undoubled going down', () => {
      expect(Contract.declarerScore(Contract.make('4S'), false, 9)).toBe(-50)   // down 1, not vul
      expect(Contract.declarerScore(Contract.make('4S'), true, 9)).toBe(-100)   // down 1, vul
      expect(Contract.declarerScore(Contract.make('4S'), true, 6)).toBe(-400)   // down 4, vul
    })

    it('doubled going down', () => {
      expect(Contract.declarerScore(Contract.make('4S', 'X'), false, 9)).toBe(-100)  // down 1, doubled, not vul
      expect(Contract.declarerScore(Contract.make('4S', 'X'), true, 9)).toBe(-200)   // down 1, doubled, vul
      expect(Contract.declarerScore(Contract.make('4S', 'X'), false, 7)).toBe(-500)  // down 3, doubled, not vul
      expect(Contract.declarerScore(Contract.make('4S', 'X'), true, 5)).toBe(-1400)  // down 5, doubled, vul
    })

    it('redoubled going down doubles the doubled penalty', () => {
      expect(Contract.declarerScore(Contract.make('4S', 'XX'), false, 9)).toBe(-200) // down 1, redoubled, not vul
    })
  })

  describe('tricksFor / overUnderTricks', () => {
    it('recovers tricks taken from a known score', () => {
      const c = Contract.make('3NT')
      expect(Contract.tricksFor(c, 400, false)).toBe(9)
      expect(Contract.tricksFor(c, 430, false)).toBe(10)
      expect(Contract.tricksFor(c, -50, false)).toBe(8)
    })

    it('returns undefined for a score the contract cannot produce', () => {
      expect(Contract.tricksFor(Contract.make('3NT'), 12345, false)).toBeUndefined()
    })

    it('overUnderTricks reports over/under relative to the contract', () => {
      const c = Contract.make('3NT')
      expect(Contract.overUnderTricks(c, 400, false)).toBe(0)
      expect(Contract.overUnderTricks(c, 430, false)).toBe(1)
      expect(Contract.overUnderTricks(c, -50, false)).toBe(-1)
    })
  })
})
