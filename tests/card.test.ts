import { describe, it, expect } from 'vitest'
import { Card } from '../src/card.js'

describe('Card', () => {
  it('contains all 52 cards', () => {
    expect(Card.all).toHaveLength(52)
  })

  it('has no duplicate cards', () => {
    const unique = new Set(Card.all)
    expect(unique.size).toBe(52)
  })

  it('parses suit and rank from PBN string', () => {
    expect(Card.suit('SA')).toBe('S')
    expect(Card.rank('SA')).toBe('A')
    expect(Card.suit('CT')).toBe('C')
    expect(Card.rank('CT')).toBe('T')
  })

  it('validates card strings', () => {
    expect(Card.isCard('SA')).toBe(true)
    expect(Card.isCard('CT')).toBe(true)
    expect(Card.isCard('XA')).toBe(false)  // bad suit
    expect(Card.isCard('S1')).toBe(false)  // bad rank
    expect(Card.isCard('SAA')).toBe(false) // too long
  })

  it('computes HCP correctly', () => {
    expect(Card.hcp('SA')).toBe(4) // Ace
    expect(Card.hcp('HK')).toBe(3) // King
    expect(Card.hcp('DQ')).toBe(2) // Queen
    expect(Card.hcp('CJ')).toBe(1) // Jack
    expect(Card.hcp('ST')).toBe(0) // Ten
  })

  it('returns correct display name', () => {
    expect(Card.name('SA')).toBe('Ace of Spades')
    expect(Card.name('CT')).toBe('Ten of Clubs')
  })

  it('compares ranks within a suit', () => {
    expect(Card.compareRank('SA', 'SK')).toBeGreaterThan(0)  // Ace > King
    expect(Card.compareRank('D2', 'DA')).toBeLessThan(0)    // Two < Ace
    expect(Card.compareRank('HQ', 'HQ')).toBe(0)            // equal
  })

  it('exposes named constants matching PBN values', () => {
    expect(Card.aceOfSpades).toBe('SA')
    expect(Card.tenOfClubs).toBe('CT')
    expect(Card.twoOfDiamonds).toBe('D2')
  })
})
