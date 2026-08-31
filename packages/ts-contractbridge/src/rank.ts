export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

const Ace:   Rank = 'A'
const King:  Rank = 'K'
const Queen: Rank = 'Q'
const Jack:  Rank = 'J'
const Ten:   Rank = 'T'
const Nine:  Rank = '9'
const Eight: Rank = '8'
const Seven: Rank = '7'
const Six:   Rank = '6'
const Five:  Rank = '5'
const Four:  Rank = '4'
const Three: Rank = '3'
const Two:   Rank = '2'

/** Ordered high-to-low */
const all: readonly Rank[] = [
  'A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'
]

const isRank = (x: string): x is Rank => (all as string[]).includes(x)

/** 0 = Two (lowest), 12 = Ace (highest) */
const bridgeRank = (r: Rank): number => 12 - all.indexOf(r)

/** High card points (Ace=4, King=3, Queen=2, Jack=1, else 0) */
const hcp = (r: Rank): number => ({ A: 4, K: 3, Q: 2, J: 1 } as Partial<Record<Rank, number>>)[r] ?? 0

const name = (r: Rank): string => ({
  A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten',
  '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six',
  '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two'
})[r]

export const Rank = {
  Ace, King, Queen, Jack, Ten, Nine, Eight, Seven, Six, Five, Four, Three, Two,
  all,
  isRank, bridgeRank, hcp,
  name,
}
