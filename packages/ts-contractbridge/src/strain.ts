import { Suit } from './suit.js'

export type Strain = 'C' | 'D' | 'H' | 'S' | 'NT'

const Clubs:   Strain = 'C'
const Diamonds: Strain = 'D'
const Hearts:  Strain = 'H'
const Spades:  Strain = 'S'
const NoTrump: Strain = 'NT'

/** Ordered lowest to highest (bridge ranking) */
const all: readonly Strain[] = ['C', 'D', 'H', 'S', 'NT']

const isStrain = (x: string): x is Strain =>
  x === 'C' || x === 'D' || x === 'H' || x === 'S' || x === 'NT'

/** 0=Clubs, 1=Diamonds, 2=Hearts, 3=Spades, 4=NoTrump */
const bridgeRank = (s: Strain): number => all.indexOf(s)

const fromSuit = (s: Suit | null): Strain =>
  s === null ? 'NT' : s as Strain

const toSuit = (s: Strain): Suit | null =>
  s === 'NT' ? null : s as Suit

const name = (s: Strain): string =>
  s === 'NT' ? 'No Trump' : Suit.name(s as Suit)

const symbol = (s: Strain): string =>
  s === 'NT' ? 'NT' : Suit.symbol(s as Suit)

export const Strain = {
  Clubs, Diamonds, Hearts, Spades, NoTrump,
  all,
  isStrain, bridgeRank,
  fromSuit, toSuit,
  name, symbol,
}
