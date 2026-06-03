import { Card } from './card.js'

export type Deck = readonly Card[]

export namespace Deck {
  /** A fresh unshuffled deck */
  export const fresh = (): Card[] => [...Card.all]

  /** Fisher-Yates shuffle (returns a new array) */
  export const shuffle = (deck: Deck): Card[] => {
    const d = [...deck]
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j]!, d[i]!]
    }
    return d
  }

  /** Deal n cards from the top of the deck; returns [hand, remaining] */
  export const deal = (deck: Deck, n: number): [Card[], Card[]] =>
    [deck.slice(0, n) as Card[], deck.slice(n) as Card[]]
}
