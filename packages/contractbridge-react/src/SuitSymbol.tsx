import type { CSSProperties, JSX } from 'react'
import { Suit } from 'ts-contractbridge'

export type SuitSymbolProps = {
  readonly suit: Suit
  // Optional override — defaults to the conventional red (H/D) / black (S/C) bridge coloring.
  readonly color?: string
}

const defaultColor = (suit: Suit): string =>
  suit === 'H' || suit === 'D' ? '#c62828' : '#1a1a1a'

// A single suit glyph, colored per the conventional red/black bridge convention. Deliberately the
// smallest possible real component — the first shared building block a card fan or hand diagram
// will compose, not a placeholder.
export function SuitSymbol({ suit, color }: SuitSymbolProps): JSX.Element {
  const style: CSSProperties = { color: color ?? defaultColor(suit) }
  return <span style={style}>{Suit.symbol(suit)}</span>
}
