# ts-contractbridge

A TypeScript library for contract bridge

## Installation

```bash
npm install ts-contractbridge
```

## Usage

```typescript
import { Card, Suit, Rank, Deck } from 'ts-contractbridge'

// Cards are PBN strings: suit first, then rank
const ace: Card = Card.aceOfSpades   // 'SA'
const ten: Card = Card.tenOfClubs    // 'CT'

// Decompose a card
Card.suit('SA')    // 'S'
Card.rank('SA')    // 'A'
Card.name('SA')    // 'Ace of Spades'
Card.hcp('SA')     // 4

// Suits and ranks are string literal types
const s: Suit = 'S'
const r: Rank = 'A'

Suit.name('H')     // 'Hearts'
Suit.symbol('H')   // '♥'
Suit.isMajor('H')  // true

Rank.hcp('K')      // 3
Rank.bridgeRank('A') // 12 (highest)

// Deck
const deck = Deck.shuffle(Deck.fresh())
const [hand, remaining] = Deck.deal(deck, 13)
```

## Development

```bash
npm test              # run tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
npm run build         # compile to dist/
npm run typecheck     # type-check without emitting
```

## Project structure

```
src/
  bridge.ts    # Card, Suit, Rank, Deck
  index.ts     # public barrel export
tests/
  bridge.test.ts
```
