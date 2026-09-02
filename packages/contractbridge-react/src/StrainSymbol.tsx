import type { JSX } from 'react'
import { Strain } from 'ts-contractbridge'
import { SuitSymbol } from './SuitSymbol.js'

export type StrainSymbolProps = {
  readonly strain: Strain
}

// Renders any strain — an actual suit via SuitSymbol (so it gets the same red/black theming), or
// the literal "NT" text for no-trump (Strain.toSuit represents that as null). Factored out of
// AuctionTable, which needed this exact "suit or NT" rendering — now shared with
// DoubleDummyTricksView, which needs it too.
export function StrainSymbol({ strain }: StrainSymbolProps): JSX.Element {
  const suit = Strain.toSuit(strain)
  return suit === null ? <>NT</> : <SuitSymbol suit={suit} />
}
