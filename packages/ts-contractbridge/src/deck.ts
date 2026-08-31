import { Card } from './card.js'

export type Deck = readonly Card[]

/** A fresh unshuffled deck */
const fresh = (): Card[] => [...Card.all]

/** Fisher-Yates shuffle (returns a new array) */
const shuffle = (deck: Deck): Card[] => {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j]!, d[i]!]
  }
  return d
}

/** Deal n cards from the top of the deck; returns [hand, remaining] */
const deal = (deck: Deck, n: number): [Card[], Card[]] =>
  [deck.slice(0, n) as Card[], deck.slice(n) as Card[]]

export const Deck = {
  fresh, shuffle, deal,
}
