import type { JSX } from 'react'
import { Strain } from 'ts-contractbridge'
import { SuitSymbol } from './SuitSymbol.js'

export type StrainSymbolProps = {
  readonly strain: Strain
  // Overrides SuitSymbol's default red/black coloring — for callers like BiddingBox that color a
  // whole call (level digit and strain glyph together) some other way, so the glyph doesn't end
  // up a different color than the text next to it.
  readonly color?: string
}

// Renders any strain — an actual suit via SuitSymbol (so it gets the same red/black theming), or
// the literal "NT" text for no-trump (Strain.toSuit represents that as null). Factored out of
// AuctionTable, which needed this exact "suit or NT" rendering — now shared with
// DoubleDummyTricksView, which needs it too.
export function StrainSymbol({ strain, color }: StrainSymbolProps): JSX.Element {
  const suit = Strain.toSuit(strain)
  if (suit === null) {
    // Smaller than the surrounding text (e.g. the bid level next to it), same as the Swift
    // reference's BidView, which renders "NT" in a smaller font than the level digit by default.
    // A plain inline element's default vertical-align keeps it sitting on the same baseline.
    return <span style={{ fontSize: '0.7em' }}>NT</span>
  }
  return <SuitSymbol suit={suit} {...(color !== undefined && { color })} />
}
