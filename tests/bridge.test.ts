import { describe, it, expect } from 'vitest'
import { Suit } from '../src/suit.js'
import { Rank } from '../src/rank.js'
import { Card } from '../src/card.js'
import { Deck } from '../src/deck.js'

// ─── Suit ─────────────────────────────────────────────────────────────────────

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

// ─── Rank ─────────────────────────────────────────────────────────────────────

describe('Rank', () => {
  it('has 13 ranks ordered high to low', () => {
    expect(Rank.all).toHaveLength(13)
    expect(Rank.all[0]).toBe('A')
    expect(Rank.all[12]).toBe('2')
  })

  it('validates rank strings', () => {
    expect(Rank.isRank('A')).toBe(true)
    expect(Rank.isRank('T')).toBe(true)
    expect(Rank.isRank('1')).toBe(false)
    expect(Rank.isRank('10')).toBe(false)
  })

  it('assigns correct HCP values', () => {
    expect(Rank.hcp('A')).toBe(4)
    expect(Rank.hcp('K')).toBe(3)
    expect(Rank.hcp('Q')).toBe(2)
    expect(Rank.hcp('J')).toBe(1)
    expect(Rank.hcp('T')).toBe(0)
    expect(Rank.hcp('2')).toBe(0)
  })

  it('returns correct bridge rank order (2 < 3 < ... < A)', () => {
    expect(Rank.bridgeRank('2')).toBe(0)
    expect(Rank.bridgeRank('A')).toBe(12)
    expect(Rank.bridgeRank('K')).toBeLessThan(Rank.bridgeRank('A'))
    expect(Rank.bridgeRank('T')).toBeLessThan(Rank.bridgeRank('J'))
  })
})

// ─── Card ─────────────────────────────────────────────────────────────────────

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

// ─── Deck ─────────────────────────────────────────────────────────────────────

describe('Deck', () => {
  it('fresh deck has 52 cards', () => {
    expect(Deck.fresh()).toHaveLength(52)
  })

  it('fresh deck contains every card exactly once', () => {
    const deck = Deck.fresh()
    const unique = new Set(deck)
    expect(unique.size).toBe(52)
  })

  it('shuffle returns a deck of 52 cards', () => {
    const shuffled = Deck.shuffle(Deck.fresh())
    expect(shuffled).toHaveLength(52)
    expect(new Set(shuffled).size).toBe(52)
  })

  it('shuffle does not mutate the original deck', () => {
    const original = Deck.fresh()
    const snapshot = [...original]
    Deck.shuffle(original)
    expect(original).toEqual(snapshot)
  })

  it('deals the correct number of cards', () => {
    const deck = Deck.fresh()
    const [hand, remaining] = Deck.deal(deck, 13)
    expect(hand).toHaveLength(13)
    expect(remaining).toHaveLength(39)
  })

  it('deal covers all 52 cards with no overlap', () => {
    const deck = Deck.fresh()
    const [hand, remaining] = Deck.deal(deck, 13)
    const all = new Set([...hand, ...remaining])
    expect(all.size).toBe(52)
  })
})
