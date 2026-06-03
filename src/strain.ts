import { Suit } from './suit.js'

export type Strain = 'C' | 'D' | 'H' | 'S' | 'NT'

export namespace Strain {
  export const Clubs:   Strain = 'C'
  export const Diamonds: Strain = 'D'
  export const Hearts:  Strain = 'H'
  export const Spades:  Strain = 'S'
  export const NoTrump: Strain = 'NT'

  /** Ordered lowest to highest (bridge ranking) */
  export const all: readonly Strain[] = ['C', 'D', 'H', 'S', 'NT']

  export const isStrain = (x: string): x is Strain =>
    x === 'C' || x === 'D' || x === 'H' || x === 'S' || x === 'NT'

  /** 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades, 4=NoTrump */
  export const bridgeRank = (s: Strain): number => all.indexOf(s)

  export const fromSuit = (s: Suit | null): Strain =>
    s === null ? 'NT' : s as Strain

  export const toSuit = (s: Strain): Suit | null =>
    s === 'NT' ? null : s as Suit

  export const name = (s: Strain): string =>
    s === 'NT' ? 'No Trump' : Suit.name(s as Suit)

  export const symbol = (s: Strain): string =>
    s === 'NT' ? 'NT' : Suit.symbol(s as Suit)
}
