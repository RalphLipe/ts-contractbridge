import { describe, it, expect } from 'vitest'
import { Deal, DealError } from '../src/deal.js'
import { Direction } from '../src/direction.js'

// A real PBN deal string (board 1 from a standard deal)
const SAMPLE_PBN = 'N:AKQ.JT9.876.5432 JT9.AKQ.5432.876 876.5432.AKQ.JT9 5432.876.JT9.AKQ'

describe('Deal', () => {
  it('creates an empty deal', () => {
    const deal = Deal.make('N')
    expect(deal.dealer).toBe('N')
    expect(deal.hands['N'].size).toBe(0)
  })

  it('round-trips through PBN', () => {
    const result = Deal.fromPBN(SAMPLE_PBN)
    expect('type' in result).toBe(false)
    const deal = result as Deal
    expect(Deal.toPBN(deal)).toBe(SAMPLE_PBN)
  })

  it('parses correct number of cards per hand', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    for (const dir of Direction.all) {
      expect(deal.hands[dir].size).toBe(13)
    }
  })

  it('parses dealer correctly', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    expect(deal.dealer).toBe('N')
    const deal2 = Deal.fromPBN('E:' + SAMPLE_PBN.slice(2)) as Deal
    expect(deal2.dealer).toBe('E')
  })

  it('validates a full deal', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    expect(Deal.validate(deal)).toBeNull()
  })

  it('finds position for a card', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    expect(Deal.positionFor(deal, 'SA')).toBe('N')
    expect(Deal.positionFor(deal, 'SJ')).toBe('E')
  })

  it('returns error for card not in any hand', () => {
    const deal = Deal.make()
    const result = Deal.positionFor(deal, 'SA')
    expect((result as DealError).type).toBe('cardNotFoundInAnyHand')
  })

  it('detects duplicate cards', () => {
    const pbn = 'N:AKQ.JT9.876.5432 AJT.AKQ.5432.876 876.5432.AKQ.JT9 5432.876.JT9.AKQ'
    const result = Deal.fromPBN(pbn)
    expect((result as DealError).type).toBe('duplicateCard')
  })

  it('rejects invalid PBN', () => {
    expect((Deal.fromPBN('') as DealError).type).toBe('invalidFirstPosition')
    expect((Deal.fromPBN('X:...') as DealError).type).toBe('invalidFirstPosition')
    expect((Deal.fromPBN('N:hand1 hand2') as DealError).type).toBe('invalidNumberOfHands')
  })

  it('rotates a deal', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    const rotated = Deal.rotated(deal, 1)
    expect(rotated.dealer).toBe('E')
    // North's hand moves to East after rotating 1 seat
    expect(rotated.hands['E']).toEqual(deal.hands['N'])
  })

  it('computes HCP for a hand', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    // North has AKQ of spades (4+3+2=9) + J of hearts (1) = 10 HCP
    expect(Deal.hcp(deal.hands['N'])).toBe(10)
  })

  it('returns cards in suit high to low', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    const spades = Deal.cardsInSuit(deal.hands['N'], 'S')
    expect(spades).toEqual(['SA', 'SK', 'SQ'])
  })

  it('addCard returns a new deal with the card added', () => {
    const deal = Deal.make()
    const updated = Deal.addCard(deal, 'N', 'SA')
    expect(updated.hands['N'].has('SA')).toBe(true)
    expect(deal.hands['N'].has('SA')).toBe(false) // original unchanged
  })

  it('removeCard returns a new deal with the card removed', () => {
    const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
    const updated = Deal.removeCard(deal, 'N', 'SA')
    expect(updated.hands['N'].has('SA')).toBe(false)
    expect(deal.hands['N'].has('SA')).toBe(true) // original unchanged
  })

  it('handles empty hand PBN', () => {
    const result = Deal.fromPBN('N:- - - -')
    expect('type' in result).toBe(false)
    const deal = result as Deal
    expect(deal.hands['N'].size).toBe(0)
  })
})
