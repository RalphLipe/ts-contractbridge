import type { JSX } from 'react'
import { Card, Direction } from 'ts-contractbridge'
import { PBNFormattedText } from './PBNFormattedText.js'
import { SuitSymbol } from './SuitSymbol.js'

export type OpeningLeadViewProps = {
  readonly position: Direction
  readonly card: Card
  // Optional — the explanation attached to the lead in the PBN (e.g. "highest of series"), shown
  // after the card as PBN formatted text. Omitted entirely if there's none.
  readonly note?: string
}

// One line: who led, and what. Ranks are shown the way HandDiagram shows them (T, not 10), so the
// lead reads the same as the card does in the hand above. The shape matches what
// PBNGame.getOpeningLead() returns, so an app can spread its result straight in.
export function OpeningLeadView({ position, card, note }: OpeningLeadViewProps): JSX.Element {
  return (
    <p>
      Opening lead: {Direction.name(position)} <SuitSymbol suit={Card.suit(card)} />{Card.rank(card)}
      {note !== undefined && <> — <PBNFormattedText text={note} /></>}
    </p>
  )
}
