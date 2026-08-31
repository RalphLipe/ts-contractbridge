import { Suit } from './suit.js'
import { Rank } from './rank.js'
import { PBNCodable } from './pbnCodable.js'

// PBN format: suit first, then rank — e.g. "SA" = Ace of Spades, "CT" = Ten of Clubs

export type Card = `${Suit}${Rank}`

// Spades
const aceOfSpades:   Card = 'SA'
const kingOfSpades:  Card = 'SK'
const queenOfSpades: Card = 'SQ'
const jackOfSpades:  Card = 'SJ'
const tenOfSpades:   Card = 'ST'
const nineOfSpades:  Card = 'S9'
const eightOfSpades: Card = 'S8'
const sevenOfSpades: Card = 'S7'
const sixOfSpades:   Card = 'S6'
const fiveOfSpades:  Card = 'S5'
const fourOfSpades:  Card = 'S4'
const threeOfSpades: Card = 'S3'
const twoOfSpades:   Card = 'S2'

// Hearts
const aceOfHearts:   Card = 'HA'
const kingOfHearts:  Card = 'HK'
const queenOfHearts: Card = 'HQ'
const jackOfHearts:  Card = 'HJ'
const tenOfHearts:   Card = 'HT'
const nineOfHearts:  Card = 'H9'
const eightOfHearts: Card = 'H8'
const sevenOfHearts: Card = 'H7'
const sixOfHearts:   Card = 'H6'
const fiveOfHearts:  Card = 'H5'
const fourOfHearts:  Card = 'H4'
const threeOfHearts: Card = 'H3'
const twoOfHearts:   Card = 'H2'

// Diamonds
const aceOfDiamonds:   Card = 'DA'
const kingOfDiamonds:  Card = 'DK'
const queenOfDiamonds: Card = 'DQ'
const jackOfDiamonds:  Card = 'DJ'
const tenOfDiamonds:   Card = 'DT'
const nineOfDiamonds:  Card = 'D9'
const eightOfDiamonds: Card = 'D8'
const sevenOfDiamonds: Card = 'D7'
const sixOfDiamonds:   Card = 'D6'
const fiveOfDiamonds:  Card = 'D5'
const fourOfDiamonds:  Card = 'D4'
const threeOfDiamonds: Card = 'D3'
const twoOfDiamonds:   Card = 'D2'

// Clubs
const aceOfClubs:   Card = 'CA'
const kingOfClubs:  Card = 'CK'
const queenOfClubs: Card = 'CQ'
const jackOfClubs:  Card = 'CJ'
const tenOfClubs:   Card = 'CT'
const nineOfClubs:  Card = 'C9'
const eightOfClubs: Card = 'C8'
const sevenOfClubs: Card = 'C7'
const sixOfClubs:   Card = 'C6'
const fiveOfClubs:  Card = 'C5'
const fourOfClubs:  Card = 'C4'
const threeOfClubs: Card = 'C3'
const twoOfClubs:   Card = 'C2'

/** All 52 cards, ordered S→C high→low */
const all: readonly Card[] = Suit.all.flatMap(s =>
  Rank.all.map(r => `${s}${r}` as Card)
)

const isCard = (x: string): x is Card =>
  x.length === 2 && Suit.isSuit(x[0]!) && Rank.isRank(x[1]!)

const toPBN = (c: Card): string => c

const fromPBN = (s: string): Card | undefined => {
  const u = s.toUpperCase()
  return isCard(u) ? u : undefined
}

const suit = (c: Card): Suit => c[0] as Suit
const rank = (c: Card): Rank => c[1] as Rank

/** High card points for this card */
const hcp = (c: Card): number => Rank.hcp(rank(c))

/** Bridge rank: higher = stronger card, within a suit */
const bridgeRank = (c: Card): number => Rank.bridgeRank(rank(c))

const name = (c: Card): string =>
  `${Rank.name(rank(c))} of ${Suit.name(suit(c))}`

const symbol = (c: Card): string =>
  `${Rank.name(rank(c))}${Suit.symbol(suit(c))}`

/** Compare two cards of the same suit (returns negative if a < b) */
const compareRank = (a: Card, b: Card): number =>
  bridgeRank(a) - bridgeRank(b)

export const Card = {
  aceOfSpades, kingOfSpades, queenOfSpades, jackOfSpades, tenOfSpades, nineOfSpades,
  eightOfSpades, sevenOfSpades, sixOfSpades, fiveOfSpades, fourOfSpades, threeOfSpades, twoOfSpades,
  aceOfHearts, kingOfHearts, queenOfHearts, jackOfHearts, tenOfHearts, nineOfHearts,
  eightOfHearts, sevenOfHearts, sixOfHearts, fiveOfHearts, fourOfHearts, threeOfHearts, twoOfHearts,
  aceOfDiamonds, kingOfDiamonds, queenOfDiamonds, jackOfDiamonds, tenOfDiamonds, nineOfDiamonds,
  eightOfDiamonds, sevenOfDiamonds, sixOfDiamonds, fiveOfDiamonds, fourOfDiamonds, threeOfDiamonds, twoOfDiamonds,
  aceOfClubs, kingOfClubs, queenOfClubs, jackOfClubs, tenOfClubs, nineOfClubs,
  eightOfClubs, sevenOfClubs, sixOfClubs, fiveOfClubs, fourOfClubs, threeOfClubs, twoOfClubs,
  all,
  isCard, toPBN, fromPBN,
  suit, rank, hcp, bridgeRank,
  name, symbol, compareRank,
}

Card satisfies PBNCodable<Card>
