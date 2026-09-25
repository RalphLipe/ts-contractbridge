# ts-contractbridge

A TypeScript library for contract bridge: cards, hands, deals, bids and auctions, contracts and scoring,
and reading and writing [PBN](https://tistis.nl/pbn/) (Portable Bridge Notation) files.

It is designed to run anywhere JavaScript does: browsers, Node, and JavaScriptCore (for Swift apps).
It has no dependencies.

> **Version 0.x.** The API may still change between minor versions.

## Install

```bash
npm install ts-contractbridge
```

The package is ESM-only and ships its own type declarations.

## What's in it

- **Basics:** `Suit`, `Rank`, `Card`, `Deck`, `Strain`, `Direction`, `PairDirection`, `Vulnerable`, and the
  `Deal` / `Hand` types.
- **Calls and contracts:** `Bid`, `Call`, `Contract`, `DeclaredContract`, and `DealOutcome`, with duplicate
  scoring (`Contract.declarerScore`) and matchpoints (`MatchpointCalculator`).
- **Analysis data:** `DoubleDummyTricks`.
- **PBN files:** `PBNDocument` (a whole file), `PBNGame` (one deal, with typed accessors for Board, Dealer,
  Vulnerable, Deal, Declarer, Contract, Result, the player names, the double-dummy tricks, the auction,
  the play and the opening lead), `PBNAuction`, `PBNPlay`, and the free-text formatter
  `parsePBNFormattedText`.
- **Files and bytes:** `PBNDocument.toPBN()` and the standalone `decodePBNBytes` / `encodePBNBytes`.

## Examples

```ts
import {
  Card, Deal, PBNDocument, PBNAuction, DeclaredContract, encodePBNBytes, decodePBNBytes,
} from 'ts-contractbridge'

// Cards and deals. Cards are PBN strings: suit first, then rank.
Card.name('SA')   // 'Ace of Spades'
Card.hcp('SA')    // 4

const deal = Deal.fromPBN('N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85')
if ('type' in deal) throw new Error('not a valid deal')   // parsing returns a DealError on failure
Deal.hcp(deal.hands.N)                                    // 13

// Read a PBN file (`text` is the contents of a .pbn file).
const doc = PBNDocument.fromPBN(text)
const game = doc.games[0]
game.getBoard()                                // 1
game.getDealer()                               // 'N'
DeclaredContract.toPBN(game.getDeclaredContract()!)  // '5HXS'
PBNAuction.isComplete(game.getAuction()!)      // true

// Write it back out in PBN export format.
doc.convertToExportFormat()   // mandatory tags in order, "% PBN 2.1" and "% EXPORT" header lines
const pbn = doc.toPBN()       // CRLF line endings; pass '\n' for LF

// File bytes. PBN is specified as ISO 8859-1 but many files are UTF-8; these handle both.
const bytes = encodePBNBytes(pbn)
decodePBNBytes(bytes)         // back to the same string
```

## Design notes

- **Values are immutable.** `Card`, `Bid`, `Call`, `Contract`, `Deal` and the like are plain data, each with a
  same-named object of functions (`Card.hcp('SA')`, `Contract.declarerScore(...)`).
- **Documents are mutable.** `PBNDocument` and `PBNGame` are ordinary classes that you load, edit and save.
  They keep every line of the original text, so reading then writing loses nothing until you ask for
  `convertToExportFormat()`. A `PBNSection`'s lines are read-only: replace a section with
  `game.setSection(lines)`.
- **Parsers do not throw.** They return `undefined` (or a `DealError`) for input they cannot read.
  Building an auction or a play card by card does throw (`PBNAuctionError`, `PBNPlayError`) when the call
  or card is illegal.
- **No platform APIs.** The library uses no Node or DOM APIs and loads and runs in JavaScriptCore.
  The one exception is `decodePBNBytes`, which needs `TextDecoder`.

## License

MIT
