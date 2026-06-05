---
name: project-porting-status
description: Swift→TypeScript port progress for ts-contractbridge; which types are done and which remain
metadata:
  type: project
---

Swift source: /Users/ralphlipe/Documents/GitHub/swift-contract-bridge/Sources/ContractBridge/
TypeScript source: /Users/ralphlipe/Documents/GitHub/ts-contractbridge/src/

## Already ported (11 types)
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
- DealOutcome → dealOutcome.ts (discriminated union on `kind`; nsScore/ewScore/rotated omitted — depend on scoring/rotatable)

## Coding pattern used
Swift enums/structs → TypeScript string type alias + namespace object with functions.
Example: `export type Suit = 'C'|'D'|'H'|'S'` + `export namespace Suit { ... }`
Format-specific parsers named `fromPBN`, `fromLIN`, etc. (not generic `parse`).

## Remaining types (priority order — core domain first)
1. Auction — struct tracking calls, dealer, declared contract
5. Deal + Hands — 4-hand card distribution with PBN serialization
6. DealOutcome — played/passedOut/average/etc with ns/ew scores
7. DoubleDummyTricks — 2D Direction×Strain→tricks with hex encoding
8. ScoreCalculator — internal; computes declarer score
9. ScoreValidator — caches valid scores per vulnerability
10. MatchpointCalculator + MatchpointedOutcome — matchpoint scoring
11. RankSet — bitset for rank subsets (bridge analysis)
12. CardSet / CardArray extensions — utility functions for card collections
13. PBN module — full PBN parse/encode (many files)
14. Analysis module — DoubleDummySolver, LeadGenerator, etc.

**Why:** User is porting one type at a time; Swift project is the authoritative reference.
**How to apply:** When user asks to port the next type, read the corresponding Swift file first, then implement using the existing TS type-alias+namespace pattern.
