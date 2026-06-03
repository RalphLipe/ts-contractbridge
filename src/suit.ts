export type Suit = 'S' | 'H' | 'D' | 'C'

export namespace Suit {
  export const Spades: Suit   = 'S'
  export const Hearts: Suit   = 'H'
  export const Diamonds: Suit = 'D'
  export const Clubs: Suit    = 'C'

  export const all: readonly Suit[] = ['S', 'H', 'D', 'C']

  /** Major suits (Spades, Hearts) */
  export const majors: readonly Suit[] = ['S', 'H']

  /** Minor suits (Diamonds, Clubs) */
  export const minors: readonly Suit[] = ['D', 'C']

  export const isMajor = (s: Suit): boolean => s === 'S' || s === 'H'
  export const isMinor = (s: Suit): boolean => s === 'D' || s === 'C'

  export const isSuit = (x: string): x is Suit =>
    x === 'S' || x === 'H' || x === 'D' || x === 'C'

  /** Higher index = higher-ranking suit (bridge ordering: C < D < H < S) */
  export const rank = (s: Suit): number => all.indexOf(s)
  export const bridgeRank = (s: Suit): number => 3 - all.indexOf(s)

  export const name = (s: Suit): string => ({
    S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs'
  })[s]

  export const symbol = (s: Suit): string => ({
    S: '♠', H: '♥', D: '♦', C: '♣'
  })[s]
}
