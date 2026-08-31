import type { JSX } from 'react'
import { Card, Deal, Suit } from 'ts-contractbridge'
import type { Hand } from 'ts-contractbridge'
import { SuitSymbol } from './SuitSymbol.js'

export type HandDiagramProps = {
  readonly hand: Hand
}

// A void suit shows as an em dash, matching standard hand-record convention rather than a blank
// (empty) line, which could otherwise look like missing data.
const ranksText = (hand: Hand, suit: Suit): string => {
  const cards = Deal.cardsInSuit(hand, suit)
  return cards.length === 0 ? '—' : cards.map(Card.rank).join('')
}

// A single hand, one row per suit, in standard hand-record order (Spades, Hearts, Diamonds,
// Clubs — Suit.all is already in that order) with ranks sorted high to low within each suit
// (via Deal.cardsInSuit). Just a display of a Hand — no selection/editing, that's a later step.
export function HandDiagram({ hand }: HandDiagramProps): JSX.Element {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '1rem', lineHeight: 1.7 }}>
      {Suit.all.map(suit => (
        <div key={suit} style={{ display: 'flex', gap: '0.5em' }}>
          <span style={{ display: 'inline-block', width: '1em' }}>
            <SuitSymbol suit={suit} />
          </span>
          <span>{ranksText(hand, suit)}</span>
        </div>
      ))}
    </div>
  )
}
