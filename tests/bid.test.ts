import { describe, it, expect } from 'vitest'
import { Bid } from '../src/bid.js'

describe('Bid', () => {
  it('has all 35 bids', () => {
    expect(Bid.all).toHaveLength(35)
  })

  it('starts at 1C and ends at 7NT', () => {
    expect(Bid.all[0]).toBe('1C')
    expect(Bid.all[34]).toBe('7NT')
  })

  it('validates bid strings', () => {
    expect(Bid.isBid('1C')).toBe(true)
    expect(Bid.isBid('3NT')).toBe(true)
    expect(Bid.isBid('7S')).toBe(true)
    expect(Bid.isBid('8C')).toBe(false)  // level too high
    expect(Bid.isBid('0C')).toBe(false)  // level too low
    expect(Bid.isBid('1N')).toBe(false)  // not a valid strain
    expect(Bid.isBid('')).toBe(false)
  })

  it('extracts level and strain', () => {
    expect(Bid.level('1C')).toBe(1)
    expect(Bid.strain('1C')).toBe('C')
    expect(Bid.level('3NT')).toBe(3)
    expect(Bid.strain('3NT')).toBe('NT')
    expect(Bid.level('7S')).toBe(7)
    expect(Bid.strain('7S')).toBe('S')
  })

  it('constructs bids from level and strain', () => {
    expect(Bid.make(1, 'C')).toBe('1C')
    expect(Bid.make(3, 'NT')).toBe('3NT')
    expect(Bid.make(7, 'S')).toBe('7S')
  })

  it('clamps out-of-range levels', () => {
    expect(Bid.make(0, 'C')).toBe('1C')
    expect(Bid.make(8, 'S')).toBe('7S')
  })

  it('assigns correct index (0=1C, 34=7NT)', () => {
    expect(Bid.index('1C')).toBe(0)
    expect(Bid.index('1NT')).toBe(4)
    expect(Bid.index('2C')).toBe(5)
    expect(Bid.index('7NT')).toBe(34)
  })

  it('compares bids by bridge order', () => {
    expect(Bid.compare('1C', '1D')).toBeLessThan(0)
    expect(Bid.compare('2C', '1NT')).toBeGreaterThan(0)
    expect(Bid.compare('3NT', '3NT')).toBe(0)
  })

  it('returns display name', () => {
    expect(Bid.name('1C')).toBe('1 Clubs')
    expect(Bid.name('3NT')).toBe('3 No Trump')
  })
})
