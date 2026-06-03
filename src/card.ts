import { Suit } from './suit.js'
import { Rank } from './rank.js'

// PBN format: suit first, then rank — e.g. "SA" = Ace of Spades, "CT" = Ten of Clubs

export type Card = `${Suit}${Rank}`

export namespace Card {
  // Spades
  export const aceOfSpades:   Card = 'SA'
  export const kingOfSpades:  Card = 'SK'
  export const queenOfSpades: Card = 'SQ'
  export const jackOfSpades:  Card = 'SJ'
  export const tenOfSpades:   Card = 'ST'
  export const nineOfSpades:  Card = 'S9'
  export const eightOfSpades: Card = 'S8'
  export const sevenOfSpades: Card = 'S7'
  export const sixOfSpades:   Card = 'S6'
  export const fiveOfSpades:  Card = 'S5'
  export const fourOfSpades:  Card = 'S4'
  export const threeOfSpades: Card = 'S3'
  export const twoOfSpades:   Card = 'S2'

  // Hearts
  export const aceOfHearts:   Card = 'HA'
  export const kingOfHearts:  Card = 'HK'
  export const queenOfHearts: Card = 'HQ'
  export const jackOfHearts:  Card = 'HJ'
  export const tenOfHearts:   Card = 'HT'
  export const nineOfHearts:  Card = 'H9'
  export const eightOfHearts: Card = 'H8'
  export const sevenOfHearts: Card = 'H7'
  export const sixOfHearts:   Card = 'H6'
  export const fiveOfHearts:  Card = 'H5'
  export const fourOfHearts:  Card = 'H4'
  export const threeOfHearts: Card = 'H3'
  export const twoOfHearts:   Card = 'H2'

  // Diamonds
  export const aceOfDiamonds:   Card = 'DA'
  export const kingOfDiamonds:  Card = 'DK'
  export const queenOfDiamonds: Card = 'DQ'
  export const jackOfDiamonds:  Card = 'DJ'
  export const tenOfDiamonds:   Card = 'DT'
  export const nineOfDiamonds:  Card = 'D9'
  export const eightOfDiamonds: Card = 'D8'
  export const sevenOfDiamonds: Card = 'D7'
  export const sixOfDiamonds:   Card = 'D6'
  export const fiveOfDiamonds:  Card = 'D5'
  export const fourOfDiamonds:  Card = 'D4'
  export const threeOfDiamonds: Card = 'D3'
  export const twoOfDiamonds:   Card = 'D2'

  // Clubs
  export const aceOfClubs:   Card = 'CA'
  export const kingOfClubs:  Card = 'CK'
  export const queenOfClubs: Card = 'CQ'
  export const jackOfClubs:  Card = 'CJ'
  export const tenOfClubs:   Card = 'CT'
  export const nineOfClubs:  Card = 'C9'
  export const eightOfClubs: Card = 'C8'
  export const sevenOfClubs: Card = 'C7'
  export const sixOfClubs:   Card = 'C6'
  export const fiveOfClubs:  Card = 'C5'
  export const fourOfClubs:  Card = 'C4'
  export const threeOfClubs: Card = 'C3'
  export const twoOfClubs:   Card = 'C2'

  /** All 52 cards, ordered S→C high→low */
  export const all: readonly Card[] = Suit.all.flatMap(s =>
    Rank.all.map(r => `${s}${r}` as Card)
  )

  export const isCard = (x: string): x is Card =>
    x.length === 2 && Suit.isSuit(x[0]) && Rank.isRank(x[1])

  export const suit = (c: Card): Suit => c[0] as Suit
  export const rank = (c: Card): Rank => c[1] as Rank

  /** High card points for this card */
  export const hcp = (c: Card): number => Rank.hcp(rank(c))

  /** Bridge rank: higher = stronger card, within a suit */
  export const bridgeRank = (c: Card): number => Rank.bridgeRank(rank(c))

  export const name = (c: Card): string =>
    `${Rank.name(rank(c))} of ${Suit.name(suit(c))}`

  export const symbol = (c: Card): string =>
    `${Rank.name(rank(c))}${Suit.symbol(suit(c))}`

  /** Compare two cards of the same suit (returns negative if a < b) */
  export const compareRank = (a: Card, b: Card): number =>
    bridgeRank(a) - bridgeRank(b)
}
