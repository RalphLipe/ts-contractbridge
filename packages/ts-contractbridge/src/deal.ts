import { Card } from './card.js'
import { Suit } from './suit.js'
import { Rank } from './rank.js'
import { Direction } from './direction.js'
import { PBNCodable } from './pbnCodable.js'

export type Hand  = ReadonlySet<Card>
export type Hands = Readonly<Record<Direction, Hand>>

export type DealError =
  | { type: 'invalidFirstPosition' }
  | { type: 'cardNotFoundInAnyHand' }
  | { type: 'invalidNumberOfHands'; count: number }
  | { type: 'notFullHand'; position: Direction; count: number }
  | { type: 'duplicateCard'; card: Card }
  | { type: 'tooManyCards'; position: Direction; count: number }

// ─── Hand PBN helpers ─────────────────────────────────────────────────────────
// Hand PBN format: "AKQ.JT9.876.5432" — suits S,H,D,C separated by dots,
// ranks high-to-low within each suit. Empty hand is "-".

function handToPBN(hand: Hand): string {
  if (hand.size === 0) return '-'
  return Suit.all.map(suit =>
    Rank.all.filter(r => hand.has(`${suit}${r}` as Card)).join('')
  ).join('.')
}

function handFromPBN(s: string): Hand | DealError {
  if (s === '-') return new Set<Card>()
  const parts = s.split('.')
  if (parts.length !== 4) return { type: 'invalidFirstPosition' }
  const hand = new Set<Card>()
  for (let i = 0; i < 4; i++) {
    const suit = Suit.all[i]!
    for (const ch of parts[i]!) {
      const rank = ch.toUpperCase() as Rank
      if (!Rank.isRank(rank)) return { type: 'invalidFirstPosition' }
      const card = `${suit}${rank}` as Card
      if (hand.has(card)) return { type: 'duplicateCard', card }
      hand.add(card)
    }
  }
  return hand
}

// ─── Deal ───────────────────────────────────────────────────────────────────

export interface Deal {
  dealer: Direction
  hands: Hands
}

const make = (dealer: Direction = 'N'): Deal => ({
  dealer,
  hands: { N: new Set(), E: new Set(), S: new Set(), W: new Set() }
})

const positionFor = (deal: Deal, card: Card): Direction | DealError => {
  for (const dir of Direction.all) {
    if (deal.hands[dir].has(card)) return dir
  }
  return { type: 'cardNotFoundInAnyHand' }
}

const validate = (deal: Deal, fullDeal = true): DealError | null => {
  const seen = new Set<Card>()
  for (const dir of Direction.all) {
    const hand = deal.hands[dir]
    if (hand.size > 13) return { type: 'tooManyCards', position: dir, count: hand.size }
    for (const card of hand) {
      if (seen.has(card)) return { type: 'duplicateCard', card }
      seen.add(card)
    }
    if (fullDeal && hand.size !== 13) return { type: 'notFullHand', position: dir, count: hand.size }
  }
  return null
}

const toPBN = (deal: Deal): string => {
  const parts: string[] = []
  let pos = deal.dealer
  do {
    parts.push(handToPBN(deal.hands[pos]))
    pos = Direction.next(pos)
  } while (pos !== deal.dealer)
  return `${deal.dealer}:${parts.join(' ')}`
}

const fromPBN = (s: string): Deal | DealError => {
  if (s.length < 2) return { type: 'invalidFirstPosition' }
  if (!Direction.isDirection(s[0]!)) return { type: 'invalidFirstPosition' }
  if (s[1] !== ':') return { type: 'invalidFirstPosition' }
  const dealer = s[0] as Direction
  const handStrings = s.slice(2).trim().split(/\s+/)
  if (handStrings.length !== 4) return { type: 'invalidNumberOfHands', count: handStrings.length }
  const hands: Record<string, Hand> = { N: new Set(), E: new Set(), S: new Set(), W: new Set() }
  let pos = dealer
  for (const hs of handStrings) {
    const result = handFromPBN(hs)
    if ('type' in result) return result
    hands[pos] = result
    pos = Direction.next(pos)
  }
  const deal: Deal = { dealer, hands: hands as Hands }
  return validate(deal, false) ?? deal
}

const rotated = (deal: Deal, seats: number): Deal => {
  const hands: Record<string, Hand> = { N: new Set(), E: new Set(), S: new Set(), W: new Set() }
  for (const dir of Direction.all) {
    hands[Direction.rotated(dir, seats)] = deal.hands[dir]
  }
  return {
    dealer: Direction.rotated(deal.dealer, seats),
    hands: hands as Hands
  }
}

const addCard = (deal: Deal, position: Direction, card: Card): Deal => {
  const hand = new Set(deal.hands[position])
  hand.add(card)
  return { ...deal, hands: { ...deal.hands, [position]: hand } }
}

const removeCard = (deal: Deal, position: Direction, card: Card): Deal => {
  const hand = new Set(deal.hands[position])
  hand.delete(card)
  return { ...deal, hands: { ...deal.hands, [position]: hand } }
}

/** Total HCP in a hand */
const hcp = (hand: Hand): number =>
  [...hand].reduce((sum, card) => sum + Card.hcp(card), 0)

/** Cards in a hand belonging to a specific suit, sorted high to low */
const cardsInSuit = (hand: Hand, suit: Suit): Card[] =>
  Rank.all
    .filter(r => hand.has(`${suit}${r}` as Card))
    .map(r => `${suit}${r}` as Card)

export const Deal = {
  make, positionFor, validate, toPBN, fromPBN, rotated, addCard, removeCard, hcp, cardsInSuit,
}

Deal satisfies PBNCodable<Deal, DealError>
