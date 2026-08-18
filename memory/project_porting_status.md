---
name: project-porting-status
description: Swift→TypeScript port progress for ts-contractbridge; which types are done and which remain
metadata:
  type: project
---

Swift source: /Users/ralphlipe/Documents/GitHub/swift-contract-bridge/Sources/ContractBridge/
TypeScript source: /Users/ralphlipe/Documents/GitHub/ts-contractbridge/src/

## Already ported (19 types)
- MatchpointCalculator + MatchpointedOutcome → matchpointCalculator.ts / matchpointedOutcome.ts.
  Required adding `DealOutcome.nsScore`/`ewScore` first (deliberately left out when DealOutcome was
  first ported, before Contract.declarerScore existed — now wired up). **Design note:** Swift's
  MatchpointCalculator groups/counts outcomes in a `[DealOutcome: MatchpointedOutcome]` dictionary,
  relying on DealOutcome's structural `Hashable`. A JS `Map` keyed by the DealOutcome object itself
  would use *reference* equality instead, silently failing to merge two separately-constructed but
  content-identical DealOutcomes (exactly the case this function exists to count). Fixed by keying
  the merge step on `DealOutcome.toPBN(outcome)` (a string) instead of the object — verified with a
  test that builds the "same" outcome from two separate DeclaredContract instances and confirms they
  merge. Same "TODO" limitation carried over from Swift: outcomes with no N/S score (AVE/AVE+/AVE-/
  NoScore) are excluded from the matchpointed field entirely rather than being factored in properly.
- Deal → deal.ts (4-hand card distribution, PBN serialization)
- DoubleDummyTricks (Swift) → DoubleDummyTable → doubleDummyTable.ts (renamed on the TS side only —
  Ralph felt "Tricks" implied analysis when it's really just a results table; Swift stays
  DoubleDummyTricks). {N,E,S,W}: Partial<Record<Strain,number>>; pbn/fromPBN use hex digits, N,S,E,W
  order / NT,S,H,D,C strain order per Swift; 'F'=unknown; bogus all-1's filter preserved from Swift.
  Output function is `toPBN`, not `pbn` (see PBNCodable note below).
- ScoreCalculator → merged into contract.ts (not its own file) — Swift marks it `internal`, only used
  by Contract.declarerScore, so the TS port keeps the arithmetic as non-exported module-private
  functions and adds Contract.declarerScore/tricksFor/overUnderTricks to the Contract object
- Suit → suit.ts (single-char type alias + const object)
- Rank → rank.ts (single-char type alias + const object)
- Card → card.ts (string type alias + const object)
- Deck → deck.ts (TypeScript-only, no Swift equivalent)
- Direction + PairDirection → direction.ts
- Vulnerable → vulnerable.ts
- Strain + Bid → bid.ts (Strain is nested in Swift but is separate in TS)
- Call → call.ts (union type: Bid | 'Pass' | 'X' | 'XX')
- Risk + Contract → contract.ts (Risk = '' | 'X' | 'XX'; Contract = { bid, risk } only — no declarer)
- DeclaredContract → declaredContract.ts ({ contract, declarer }; toPBN = contract toPBN + direction, e.g. "3NTW")
- DealOutcome → dealOutcome.ts (discriminated union on `kind`; nsScore/ewScore added 2026-08 once
  Contract.declarerScore existed — passedOut=0, played=declarerScore negated for an EW declarer,
  scoreOnly=stored value, average*/noScore=undefined. ewScore normalizes -0 to 0.)
- Auction + AuctionCall + AuctionError → auction.ts (immutable; makingCall/undoingLast return new instances; no PBN parsing)
- RotateFn → rotatable.ts (type alias `(value: T, seats: number) => T`; Direction/PairDirection/DeclaredContract/DealOutcome/Auction/Deal/DoubleDummyTable/Vulnerable all support rotated)

## Coding pattern used
Swift enums/structs → TypeScript string type alias + a plain `const` companion object holding the
related functions/constants (NOT `namespace` — that was the original pattern but got refactored
away across all 17 files in 2026-08 since `namespace` is legacy TS; see [[feedback-namespace]]).
Example: `export type Suit = 'C'|'D'|'H'|'S'` + `export const Suit = { Spades, all, isSuit, ... }`,
where each object member is a top-level `const` in the same file (dropped from inside a namespace
block) and the object literal at the bottom just collects them, using ES2015 shorthand
(`{ memberName }`) wherever the local const name matches the public key. Only rename a local const
when two type+object pairs share a file and would collide as flat top-level names (e.g.
`direction.ts`'s `Direction.all`/`PairDirection.all` → locals `directionAll`/`pairDirectionAll`,
public key stays `.all` for both).
Format-specific parsers named `fromPBN`, `fromLIN`, etc. (not generic `parse`).

## PBNCodable pattern (2026-08)
Types that both parse from and serialize to a PBN string get `toPBN`/`fromPBN` (not a bare `pbn` —
that was the original naming, mismatched with `fromPBN`; renamed for symmetry). Their companion
object is checked against `src/pbnCodable.ts`'s `PBNCodable<T, E = undefined>` interface (the TS
structural analog of Swift's `PBNCodable` protocol) via `X satisfies PBNCodable<X>` right after the
object's declaration — e.g. `Card satisfies PBNCodable<Card>`, `Deal satisfies PBNCodable<Deal,
DealError>` (Deal's `fromPBN` returns `DealError` on failure instead of `undefined`, hence the 2nd
type param). This is compile-time-only, zero runtime cost. Applies today to: Card, Call, Contract,
DeclaredContract, DealOutcome, DoubleDummyTable, Deal, Vulnerable, Direction, PairDirection — NOT
Suit/Rank/Strain, which validate via `isX` type guards instead of parsing (no separate string
transform needed) and so don't have `toPBN`/`fromPBN` at all. **Caution:** don't assume "value
already looks like its own PBN string" means no real `fromPBN` is needed, or that a type lacking
`fromPBN` today is correct — check the Swift source's `PBNCodable` conformance and `init(pbn:)`
first; this was missed initially for Vulnerable, Direction, and PairDirection (all conform in
Swift). Vulnerable's `fromPBN` also isn't just validation, it accepts synonyms ("LOVE"/"-" for
None, "BOTH" for All) case-insensitively, unlike `isVulnerable`.
**When two type+object pairs share a file** (direction.ts has both Direction and PairDirection),
watch for `toPBN`/`fromPBN`/`rotated` colliding too, not just `all`/`fromPBN` from the earlier
namespace-flattening pass — PairDirection's got the same `pairDirection`-prefix treatment.
**Note:** `satisfies` must be applied to the already-declared const (a reference), never to the
object literal directly — TS's excess-property check rejects a literal with more members than the
interface, but does not reject a reference of a type that's merely assignable/wider.
**How to apply:** Every future port with both a "to PBN" and "from PBN" function should follow this
— add the `satisfies PBNCodable<X>` line, don't skip it.

## Skipped — intentionally not porting
- **ScoreValidator** — precomputes every achievable N/S score (all vulnerabilities × contracts ×
  declarers × tricks) into a set, to answer "could this score possibly be valid?". Ralph decided
  2026-08 to skip this permanently — not a "do later," don't suggest porting it again.

## Remaining types (priority order — core domain first)
1. RankSet — bitset for rank subsets (bridge analysis)
2. CardSet / CardArray extensions — utility functions for card collections
3. PBN module — full PBN parse/encode (many files, includes Game/Document — see mutability note below)
4. Analysis module — DoubleDummySolver, LeadGenerator, etc.

## Mutability: values vs. documents
Confirmed 2026-08: Ralph wants the small domain value types (Direction, Card, Rank, Suit, Strain,
Bid, Call, Contract, Risk, DeclaredContract, DealOutcome, Deal, Auction, DoubleDummyTable, Vulnerable)
to stay immutable, using the plain-type + const-companion-object pattern above. But PBN **Game** and
**Document** (in the not-yet-ported PBN module, e.g. Swift's `PBN/Game.swift`) are expected to be
**mutable classes** — they represent an editable document a user loads/edits/saves (holding a Deal,
an Auction, comments, tags, etc.), which is a different kind of thing than a derived/atomic value.
**Why:** Ralph prefers OOP generally and pushed back on the const-object pattern for everything; on
reflection he agrees atomic values (rotated/derived facts about a board) should stay immutable like
the current pattern, but a Game/Document users actively edit should be a normal mutable object, not
force-fit into copy-and-return-a-new-instance style.
**How to apply:** When porting the PBN module, don't default to the immutable type+const-object
pattern for Game/Document — ask Ralph to confirm the class design (likely a real `class` with
mutable fields/methods) before implementing. Everything else in the PBN module that's a plain value
(tags, individual PBN records) can probably still follow the immutable pattern; check per-type.

**Why (porting order):** User is porting one type at a time; Swift project is the authoritative reference.
**How to apply (porting order):** When user asks to port the next type, read the corresponding Swift file first, then implement using the existing TS type-alias+const-object pattern (except Game/Document, see above).
