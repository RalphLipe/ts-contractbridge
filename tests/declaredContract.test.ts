import { describe, it, expect } from 'vitest'
import { Contract } from '../src/contract.js'
import { DeclaredContract } from '../src/declaredContract.js'

describe('DeclaredContract', () => {
  it('make', () => {
    const dc = DeclaredContract.make(Contract.make('3NT'), 'W')
    expect(dc.contract).toEqual({ bid: '3NT', risk: '' })
    expect(dc.declarer).toBe('W')
  })

  it('pbn', () => {
    expect(DeclaredContract.pbn(DeclaredContract.make(Contract.make('3NT'), 'W'))).toBe('3NTW')
    expect(DeclaredContract.pbn(DeclaredContract.make(Contract.make('4H', 'X'), 'N'))).toBe('4HXN')
    expect(DeclaredContract.pbn(DeclaredContract.make(Contract.make('5D', 'XX'), 'E'))).toBe('5DXXE')
  })

  it('fromPBN', () => {
    expect(DeclaredContract.fromPBN('3NTW')).toEqual({ contract: { bid: '3NT', risk: '' }, declarer: 'W' })
    expect(DeclaredContract.fromPBN('4HXN')).toEqual({ contract: { bid: '4H', risk: 'X' }, declarer: 'N' })
    expect(DeclaredContract.fromPBN('5DXXE')).toEqual({ contract: { bid: '5D', risk: 'XX' }, declarer: 'E' })
  })

  it('fromPBN returns undefined for invalid input', () => {
    expect(DeclaredContract.fromPBN('3N')).toBeUndefined()   // too short
    expect(DeclaredContract.fromPBN('3NTZ')).toBeUndefined() // invalid direction
    expect(DeclaredContract.fromPBN('badN')).toBeUndefined() // invalid contract
  })

  it('pbn round-trips', () => {
    const dcs = [
      DeclaredContract.make(Contract.make('3NT'), 'W'),
      DeclaredContract.make(Contract.make('4H', 'X'), 'N'),
      DeclaredContract.make(Contract.make('6C', 'XX'), 'S'),
    ]
    for (const dc of dcs) {
      expect(DeclaredContract.fromPBN(DeclaredContract.pbn(dc))).toEqual(dc)
    }
  })

  it('compare orders by contract then declarer', () => {
    const a = DeclaredContract.make(Contract.make('3NT'), 'N')
    const b = DeclaredContract.make(Contract.make('4C'), 'N')
    const c = DeclaredContract.make(Contract.make('3NT'), 'E')
    expect(DeclaredContract.compare(a, b)).toBeLessThan(0)
    expect(DeclaredContract.compare(b, a)).toBeGreaterThan(0)
    expect(DeclaredContract.compare(a, c)).toBeLessThan(0)
    expect(DeclaredContract.compare(a, a)).toBe(0)
  })
})
