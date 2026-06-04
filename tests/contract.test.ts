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
    expect(Contract.pbn(Contract.make('3NT'))).toBe('3NT')
    expect(Contract.pbn(Contract.make('4H', 'X'))).toBe('4HX')
    expect(Contract.pbn(Contract.make('5C', 'XX'))).toBe('5CXX')
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
      expect(Contract.fromPBN(Contract.pbn(c))).toEqual(c)
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
})
