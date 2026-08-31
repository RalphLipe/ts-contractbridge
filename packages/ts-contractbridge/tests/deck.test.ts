import { describe, it, expect } from 'vitest'
import { Deck } from '../src/deck.js'

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
