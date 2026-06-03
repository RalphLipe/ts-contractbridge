export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

export namespace Rank {
  export const Ace:   Rank = 'A'
  export const King:  Rank = 'K'
  export const Queen: Rank = 'Q'
  export const Jack:  Rank = 'J'
  export const Ten:   Rank = 'T'
  export const Nine:  Rank = '9'
  export const Eight: Rank = '8'
  export const Seven: Rank = '7'
  export const Six:   Rank = '6'
  export const Five:  Rank = '5'
  export const Four:  Rank = '4'
  export const Three: Rank = '3'
  export const Two:   Rank = '2'

  /** Ordered high-to-low */
  export const all: readonly Rank[] = [
    'A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'
  ]

  export const isRank = (x: string): x is Rank => (all as string[]).includes(x)

  /** 0 = Two (lowest), 12 = Ace (highest) */
  export const bridgeRank = (r: Rank): number => 12 - all.indexOf(r)

  /** High card points (Ace=4, King=3, Queen=2, Jack=1, else 0) */
  export const hcp = (r: Rank): number => ({ A: 4, K: 3, Q: 2, J: 1 }[r] ?? 0)

  export const name = (r: Rank): string => ({
    A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten',
    '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six',
    '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two'
  })[r]
}
