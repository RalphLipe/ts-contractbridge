export type Suit = 'S' | 'H' | 'D' | 'C'

const Spades: Suit   = 'S'
const Hearts: Suit   = 'H'
const Diamonds: Suit = 'D'
const Clubs: Suit    = 'C'

const all: readonly Suit[] = ['S', 'H', 'D', 'C']

/** Major suits (Spades, Hearts) */
const majors: readonly Suit[] = ['S', 'H']

/** Minor suits (Diamonds, Clubs) */
const minors: readonly Suit[] = ['D', 'C']

const isMajor = (s: Suit): boolean => s === 'S' || s === 'H'
const isMinor = (s: Suit): boolean => s === 'D' || s === 'C'

const isSuit = (x: string): x is Suit =>
  x === 'S' || x === 'H' || x === 'D' || x === 'C'

/** Higher index = higher-ranking suit (bridge ordering: C < D < H < S) */
const rank = (s: Suit): number => all.indexOf(s)
const bridgeRank = (s: Suit): number => 3 - all.indexOf(s)

const name = (s: Suit): string => ({
  S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs'
})[s]

const symbol = (s: Suit): string => ({
  S: '♠', H: '♥', D: '♦', C: '♣'
})[s]

export const Suit = {
  Spades, Hearts, Diamonds, Clubs,
  all, majors, minors,
  isMajor, isMinor, isSuit,
  rank, bridgeRank,
  name, symbol,
}
