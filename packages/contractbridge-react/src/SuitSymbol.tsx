import type { CSSProperties, JSX } from 'react'
import { Suit } from 'ts-contractbridge'
import './theme.css'

export type SuitSymbolProps = {
  readonly suit: Suit
  // Optional override — defaults to the conventional red (H/D) / black (S/C) bridge coloring.
  readonly color?: string
}

// Reads the --cb-suit-* custom properties from theme.css (dark-mode aware via
// prefers-color-scheme), falling back to the light-mode hex if theme.css somehow isn't loaded —
// never a hardcoded color on its own, or it'd go invisible against a dark background the way the
// original hardcoded #1a1a1a did.
const defaultColor = (suit: Suit): string =>
  suit === 'H' || suit === 'D'
    ? 'var(--cb-suit-red, #c62828)'
    : 'var(--cb-suit-black, #1a1a1a)'

// A single suit glyph, colored per the conventional red/black bridge convention. Deliberately the
// smallest possible real component — the first shared building block a card fan or hand diagram
// will compose, not a placeholder.
export function SuitSymbol({ suit, color }: SuitSymbolProps): JSX.Element {
  const style: CSSProperties = { color: color ?? defaultColor(suit) }
  return <span style={style}>{Suit.symbol(suit)}</span>
}
