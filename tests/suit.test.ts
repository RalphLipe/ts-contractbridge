import { describe, it, expect } from 'vitest'
import { Suit } from '../src/suit.js'

describe('Suit', () => {
  it('has all four suits', () => {
    expect(Suit.all).toEqual(['S', 'H', 'D', 'C'])
  })

  it('correctly identifies majors and minors', () => {
    expect(Suit.isMajor('S')).toBe(true)
    expect(Suit.isMajor('H')).toBe(true)
    expect(Suit.isMinor('D')).toBe(true)
    expect(Suit.isMinor('C')).toBe(true)
    expect(Suit.isMajor('D')).toBe(false)
    expect(Suit.isMinor('S')).toBe(false)
  })

  it('validates suit strings', () => {
    expect(Suit.isSuit('S')).toBe(true)
    expect(Suit.isSuit('X')).toBe(false)
    expect(Suit.isSuit('')).toBe(false)
  })

  it('returns correct bridge rank order (C < D < H < S)', () => {
    expect(Suit.bridgeRank('C')).toBeLessThan(Suit.bridgeRank('D'))
    expect(Suit.bridgeRank('D')).toBeLessThan(Suit.bridgeRank('H'))
    expect(Suit.bridgeRank('H')).toBeLessThan(Suit.bridgeRank('S'))
  })

  it('returns display names and symbols', () => {
    expect(Suit.name('S')).toBe('Spades')
    expect(Suit.symbol('H')).toBe('♥')
  })
})
