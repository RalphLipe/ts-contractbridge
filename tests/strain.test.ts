import { describe, it, expect } from 'vitest'
import { Strain } from '../src/strain.js'

describe('Strain', () => {
  it('has all five strains in bridge order', () => {
    expect(Strain.all).toEqual(['C', 'D', 'H', 'S', 'NT'])
  })

  it('validates strain strings', () => {
    expect(Strain.isStrain('C')).toBe(true)
    expect(Strain.isStrain('NT')).toBe(true)
    expect(Strain.isStrain('N')).toBe(false)
    expect(Strain.isStrain('')).toBe(false)
  })

  it('returns correct bridge rank order (C < D < H < S < NT)', () => {
    expect(Strain.bridgeRank('C')).toBeLessThan(Strain.bridgeRank('D'))
    expect(Strain.bridgeRank('D')).toBeLessThan(Strain.bridgeRank('H'))
    expect(Strain.bridgeRank('H')).toBeLessThan(Strain.bridgeRank('S'))
    expect(Strain.bridgeRank('S')).toBeLessThan(Strain.bridgeRank('NT'))
  })

  it('converts to and from suit', () => {
    expect(Strain.fromSuit('S')).toBe('S')
    expect(Strain.fromSuit('C')).toBe('C')
    expect(Strain.fromSuit(null)).toBe('NT')
    expect(Strain.toSuit('H')).toBe('H')
    expect(Strain.toSuit('NT')).toBe(null)
  })

  it('returns display names', () => {
    expect(Strain.name('C')).toBe('Clubs')
    expect(Strain.name('NT')).toBe('No Trump')
  })

  it('returns symbols', () => {
    expect(Strain.symbol('S')).toBe('♠')
    expect(Strain.symbol('H')).toBe('♥')
    expect(Strain.symbol('NT')).toBe('NT')
  })
})
