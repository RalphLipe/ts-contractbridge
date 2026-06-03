// ─── Suit ────────────────────────────────────────────────────────────────────

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
  export const rank = (s: Suit): number => all.indexOf(s) // reversed: S=0,H=1,D=2,C=3 → flip:
  // bridge rank: C=0, D=1, H=2, S=3
  export const bridgeRank = (s: Suit): number => 3 - all.indexOf(s)

  export const name = (s: Suit): string => ({
    S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs'
  })[s]

  export const symbol = (s: Suit): string => ({
    S: '♠', H: '♥', D: '♦', C: '♣'
  })[s]
}

// ─── Rank ─────────────────────────────────────────────────────────────────────

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

// ─── Card ─────────────────────────────────────────────────────────────────────
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

// ─── Deck ─────────────────────────────────────────────────────────────────────

export type Deck = readonly Card[]

export namespace Deck {
  /** A fresh unshuffled deck */
  export const fresh = (): Card[] => [...Card.all]

  /** Fisher-Yates shuffle (returns a new array) */
  export const shuffle = (deck: Deck): Card[] => {
    const d = [...deck]
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]]
    }
    return d
  }

  /** Deal n cards from the top of the deck; returns [hand, remaining] */
  export const deal = (deck: Deck, n: number): [Card[], Card[]] =>
    [deck.slice(0, n) as Card[], deck.slice(n) as Card[]]
}
