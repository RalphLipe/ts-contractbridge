---
name: project-porting-status
description: Swift→TypeScript port progress for ts-contractbridge; which types are done and which remain
metadata:
  type: project
---

Swift source: /Users/ralphlipe/Documents/GitHub/swift-contract-bridge/Sources/ContractBridge/
TypeScript source: /Users/ralphlipe/Documents/GitHub/ts-contractbridge/src/

## Already ported (17 types)
- Deal → deal.ts (4-hand card distribution, PBN serialization)
- DoubleDummyTricks (Swift) → DoubleDummyTable → doubleDummyTable.ts (renamed on the TS side only —
  Ralph felt "Tricks" implied analysis when it's really just a results table; Swift stays
  DoubleDummyTricks). {N,E,S,W}: Partial<Record<Strain,number>>; pbn/fromPBN use hex digits, N,S,E,W
  order / NT,S,H,D,C strain order per Swift; 'F'=unknown; bogus all-1's filter preserved from Swift
- ScoreCalculator → merged into contract.ts (not its own file) — Swift marks it `internal`, only used
  by Contract.declarerScore, so the TS port keeps the arithmetic as non-exported module-private
  functions and adds Contract.declarerScore/tricksFor/overUnderTricks to the Contract namespace
- Suit → suit.ts (single-char type alias + namespace)
- Rank → rank.ts (single-char type alias + namespace)
- Card → card.ts (string type alias + namespace)
- Deck → deck.ts (TypeScript-only, no Swift equivalent)
- Direction + PairDirection → direction.ts
- Vulnerable → vulnerable.ts
- Strain + Bid → bid.ts (Strain is nested in Swift but is separate in TS)
- Call → call.ts (union type: Bid | 'Pass' | 'X' | 'XX')
- Risk + Contract → contract.ts (Risk = '' | 'X' | 'XX'; Contract = { bid, risk } only — no declarer)
- DeclaredContract → declaredContract.ts ({ contract, declarer }; pbn = contract pbn + direction, e.g. "3NTW")
- DealOutcome → dealOutcome.ts (discriminated union on `kind`; nsScore/ewScore omitted — depend on scoring)
- Auction + AuctionCall + AuctionError → auction.ts (immutable; makingCall/undoingLast return new instances; no PBN parsing)
- RotateFn → rotatable.ts (type alias `(value: T, seats: number) => T`; Direction/DeclaredContract/DealOutcome/Auction all support rotated)

## Coding pattern used
Swift enums/structs → TypeScript string type alias + namespace object with functions.
Example: `export type Suit = 'C'|'D'|'H'|'S'` + `export namespace Suit { ... }`
Format-specific parsers named `fromPBN`, `fromLIN`, etc. (not generic `parse`).

## Remaining types (priority order — core domain first)
1. ScoreValidator — caches valid scores per vulnerability
2. MatchpointCalculator + MatchpointedOutcome — matchpoint scoring
3. RankSet — bitset for rank subsets (bridge analysis)
4. CardSet / CardArray extensions — utility functions for card collections
5. PBN module — full PBN parse/encode (many files)
6. Analysis module — DoubleDummySolver, LeadGenerator, etc.

**Why:** User is porting one type at a time; Swift project is the authoritative reference.
**How to apply:** When user asks to port the next type, read the corresponding Swift file first, then implement using the existing TS type-alias+namespace pattern.
