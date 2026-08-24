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

## Skipped permanently — do not suggest porting again
- **ScoreValidator** — precomputes every achievable N/S score (all vulnerabilities × contracts ×
  declarers × tricks) into a set, to answer "could this score possibly be valid?". Ralph decided
  2026-08 to skip this permanently.

## Skipped for now — conditional, may revisit if actually needed
- **RankSet** — bitset for rank subsets. Confirmed 2026-08 it's used only by `CardSet.swift` and
  the `Analysis/` module (SuitLayout, LeadGenerator, RankBrackets, LeadPlan) — not by PBN reading/
  writing. Ralph's current goal is PBN support, not analysis, so this is skipped *for now*. Unlike
  ScoreValidator, this is NOT a permanent no — port it if something later actually needs it (most
  likely: the Analysis module, or if CardSet turns out to need it — see note below). Don't
  proactively suggest porting it; wait until something depends on it.

## Current goal (2026-08)
Ralph's stated priority: get PBN reading/writing working. This reprioritizes the porting order —
PBN module (Game/Document, tags, parse/encode) matters more right now than RankSet/CardSet/Analysis.
**Watch for:** Swift's `CardSet.swift` uses `RankSet` internally. If PBN work ends up needing
CardSet (e.g. for hand manipulation beyond the `Set<Card>` the current `Deal`/`Hands` types already
use), check whether that dependency actually requires porting RankSet too, or whether it can be
avoided/simplified in the TS port.

## PBN module — in progress (started 2026-08)
Building this one piece at a time per Ralph's request, not all at once like earlier types. New
subdirectory `src/pbn/` (mirrors Swift's own `PBN/` folder — a deliberate deviation from this repo's
previous flat `src/` layout, since this module will grow to many files) and `tests/pbn/` to match.
Swift's `PBN.Document`/`PBN.Game` (nested under an enum used purely as a namespace) become top-level
`PBNDocument`/`PBNGame` classes — prefixed (not bare `Document`/`Game`) both to avoid colliding with
the DOM's global `Document` type and to stay consistent with this codebase's existing `PBNCodable`
acronym-casing convention.

**Governing rule, confirmed 2026-08: raw text is the single source of truth, always re-parsed —
never cached.** `PBNSection.lines` is the only real state; `tagPair`, `PBNGame.getTagValue`, and
every future typed accessor recompute from it on every call rather than caching a derived value.
**Why:** `lines` is a plain mutable public array anyone can mutate directly (`section.lines.push`),
so there's no reliable way to invalidate a cache on every mutation path anyway — caching would just
be a second copy of the truth that can silently drift stale. Ralph judged the performance cost
negligible (PBN documents are tiny — a handful of short lines per tag, this is document-editing
code, not a hot loop) and correct: a caching layer could always be added later as a purely internal
implementation detail without changing any public API, so this isn't a foreclosing decision.
**How to apply:** every future `PBNGame`/`PBNDocument` accessor must derive its answer from
`sections`/`lines` at call time — never store a parsed value as a field and return it.
- **`PBNDocument`** (`src/pbn/pbnDocument.ts`) — done. Real mutable class (per the mutability
  principle below), currently just two public fields: `games: PBNGame[]` and `escapedText:
  string[]` (lines starting with `%`, typically in the file header before any game; PBN's spec
  doesn't strictly require that, but header-level escaped lines are treated as a special case here,
  unrelated to any single PBNGame). No methods yet — being built incrementally.
- **`PBNGame`** (`src/pbn/pbnGame.ts`):
  - `sections: readonly PBNSection[]` — a read-only view over a private backing array. Sections
    can only be added/replaced through `setSection`, never spliced in directly, matching
    `PBNSection.lines` (also read-only) — the only way to change a section's content anywhere in
    this module is wholesale replacement, not in-place mutation.
  - `getTagValue(tagName): string | undefined` — linear scan over sections, matching
    `tagPair.name` case-insensitively, returning the first match's value. No caching — recomputed
    from `sections` on every call.
  - `setSection(lines: string[]): void` — builds a `PBNSection` from `lines`, then finds an
    existing section whose `tagPair?.name` matches the new one's (case-insensitive; `undefined ===
    undefined` also matches, so a "global"/untagged section replaces the existing untagged section
    rather than adding a second one) and overwrites it in place; adds a new section if none
    matches. **Design call, not explicitly specified by Ralph — flag if wrong:** the target section
    is identified by parsing the tag name out of the new `lines` themselves (upsert semantics),
    not by index or an explicit separate tag-name parameter.
  - `setTag(tag: TagPair): void` — convenience for the common single-line/simple-tag case:
    `formatTagLine(tag)` then `setSection([line])`. Just composition, no new logic of its own.
  - `deleteSection(tagName: string): void` — removes the section with a matching tag name
    (case-insensitive), no-op if none matches. Only targets named sections — there's no way to
    pass "no tag" through a `string` parameter, so the global/untagged section can't be deleted
    this way.
- **`PBNSection`** (`src/pbn/pbnSection.ts`, new 2026-08) — `lines: readonly string[]`, raw/unparsed
  and read-only (mutate only by replacing the whole section via `PBNGame.setSection`). Concept
  introduced by Ralph: per the PBN spec, a game is really a sequence of "sections," each starting
  with a tag pair (e.g. `[Declarer "N"]`) and optionally followed by body lines (auction/play
  tokens), comments, notes (their own tag lines, but considered part of the section they follow),
  and even stray `%`-escaped lines (allowed but Ralph's never seen them in practice). A section
  with no tag line at all holds comments before a game's first tag — those apply to the whole game,
  associated with a "null" tag.
  **`TagPair`** (`src/pbn/tagLine.ts`) — `{ name: string; value: string }`, the parsed halves of a
  tag line. Went through two renames before landing here: started as `TagLine` (Ralph: doesn't
  describe a line), briefly `ParsedTag`, settled on `TagPair` since that's the PBN spec's own term
  for this — accepting the tradeoff that Swift already uses "tagPair" for something adjacent but
  different (`Tag.tagPair(value) -> String` *serializes* to the full line, the opposite direction).
  Ralph wants `TagPair` used as the first-class concept throughout this module, not separate
  name/value fields — e.g. `PBNSection` exposes one `tagPair` getter, not `tagName`+`tagValue`.
  **`parseTagLine(s: string): TagPair | undefined`** — parses `[TagName "TagValue"]` (splits on the
  *first* space only, so quoted values may contain spaces, e.g. `[Event "World Championship"]`;
  value must be double-quoted). Returns `undefined` for anything that isn't a valid tag pair — no
  lines, a comment-only "global" section, a malformed line — matching this codebase's established
  `T | undefined` convention rather than throwing (there's no PBNError equivalent yet; still open,
  see below).
  **`formatTagLine(tag: TagPair): string`** — the inverse, in the same file (renamed from
  `parseTagLine.ts` to `tagLine.ts` once it held both directions, matching how e.g. `contract.ts`
  holds both `toPBN`/`fromPBN`). Produces `[Name "Value"]` with no trailing newline — joining lines
  is left to whatever assembles a full section/document, unlike Swift's `tagPair` which bakes one
  in. Round-trips with `parseTagLine`; exhaustive edge-case tests live in `tests/pbn/tagLine.test.ts`.
  **`PBNSection.tagPair: TagPair | undefined`** — a single getter parsing `this.lines[0]`, replacing
  an earlier two-getter (`tagName`/`tagValue`) design. `PBNSection`'s own tests just confirm the
  wiring (first-line-only, undefined for the global section) — exhaustive parsing cases stay on
  `parseTagLine`'s own tests, not duplicated here.
  **This supersedes the flat `Map<string,string>`-keyed-by-tag-name idea in the "PBN.Game storage
  design" section below** for how data is actually stored — `PBNGame` now holds an ordered
  `PBNSection[]`, not a map. The *typed-accessor*, *validation*, *reconciliation*, and
  *error-strategy* open questions in that section are still live and unaffected by this change;
  they'll need to be answered in terms of "find/parse the right section(s)" rather than "map
  lookup" once accessors are actually built.
- **Not started yet:** parsing a section's first line into tag name/value, Tags/SimpleTag/ComplexTag
  shape, the actual parser (Swift's `Parse.swift`), PBNError equivalent,
  Note/ContractTagValue/OptimumScoreTagValue/AnnotatedPlay value types.
**How to apply:** Don't jump ahead and implement PBNGame's real storage or the parser unless asked
— Ralph is deliberately sequencing this "a step at a time." Ask what's next rather than assuming
the natural next chunk (e.g. don't assume "now do the parser" just because it seems logical).

## Remaining types (priority order — reflects current PBN-first goal)
1. PBN module — full PBN parse/encode (in progress, see section above)
2. CardSet / CardArray extensions — utility functions for card collections (only if PBN work needs them)
3. RankSet — see conditional-skip note above
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
**Confirmed 2026-08 (resolves the open question above):** mutable things are REAL TS `class`es with
instance methods — `game.setDealer(d)`, `game.getDealOutcome()`, not free functions over a mutable
object (`Game.setDealer(game, d)`). This is a general principle, not just for Game/Document: Ralph
floated `AuctionBuilder` as another example — the existing immutable `Auction` const-object stays as
the value/snapshot type; a *builder* class would be the live/in-progress counterpart, same
relationship as Game/Document to their own data. Not requested/built yet, just the pattern to reuse
whenever something needs "construct/edit over time" rather than "immutable derived value."
**How to apply:** Game/Document are real classes. Everything else in the PBN module that's a plain
value (tags, individual PBN records like Note/ContractTagValue/OptimumScoreTagValue) still follows
the immutable type+const-object pattern; check per-type, don't assume "in the PBN module" alone
means "gets a class."

## PBN.Game storage design (2026-08, agreed before implementation)
- **`entries` is a uniform `Map<string, string>`** — every tag (known or unknown) stores its raw PBN
  string value, not a typed value. Avoids Swift's `[String: any Sendable]` type-erasure/cast problem
  entirely; TS has no clean equivalent to reach for instead.
- **Parsing preserves the original substring on success**, not a reparsed/recanonicalized one — so
  loading a file and saving it back unchanged reproduces it byte-for-byte (matters for e.g. Date,
  which has 3 valid input formats but only one canonical output format). Only a typed setter
  (`game.setDeal(deal)`) synthesizes a fresh string, via `toPBN`.
- **Typed accessor methods per known tag** (`getDeal`/`setDeal`, `getDealer`/`setDealer`, etc.)
  convert to/from the raw string via each type's existing `toPBN`/`fromPBN`. Some have side effects
  on other tags — e.g. `setDealer` also rewrites the `d:` prefix embedded in the `Deal` tag's string
  (redundant data PBN itself carries). `getDealOutcome`/`setDealOutcome` compose from three tags at
  once (Contract, Declarer, Result) — **`setDealOutcome` is new, Swift only ever had a read-only
  `dealOutcome` getter; still need to decide what it does for DealOutcome kinds that don't map to
  Contract/Declarer/Result at all (scoreOnly, average, averagePlus, averageMinus, noScore) — not yet
  resolved, ask Ralph before implementing `setDealOutcome`.**
- **Complex tags (Auction, Play) store their whole multi-line block as one string blob**, same
  uniform `Map<string,string>` as simple tags — no separate storage mechanism. `Auction.toComplexPBN`/
  `fromComplexPBN` (naming TBD) own serializing/parsing the entire `[Auction "..."]` block including
  body tokens AND the `=N=`-note-numbering / `[Note "N:text"]` lines, using `AuctionCall.note`/
  `noteNumber` which already exist. This moves note-handling OUT of the top-level parser (where
  Swift's `Parser` class currently owns it, entangled with generic complex-tag-body collection) and
  INTO Auction/AnnotatedPlay's own encode/decode — a deliberate improvement on the Swift structure,
  not just a straight port.
- **Comments** stay a parallel `Map<string, string[]>` keyed by tag name, independent of the
  entries-storage decision above — same shape as Swift's `comments: [String: [String]]`.
- **Still open, not yet decided:**
  1. Does the generic/untyped string setter (for setting a tag by name, not through a typed method)
     validate known tags the way Swift's `setValue(_:for: tagName)` does (looks up known tags, runs
     them through `parse(from:)`, throws on invalid) — or does the raw-string design let it store
     anything? Recommend carrying Swift's validate-known-tags behavior over.
  2. Proactive dual-write (setDealer syncing Deal's embedded dealer too) does NOT eliminate needing
     a `reconcileTags`-equivalent step when parsing arbitrary PBN text from real files, which can
     arrive with Dealer/Deal (or Contract/Declarer/Result) already disagreeing — Swift's
     `reconcileTags()` exists for exactly that reason and something like it is still needed at parse
     time even with proactive sync on the setters.
  3. Overall error/validation strategy for the parser is still unresolved — Swift's `ValidationLevel`
     (strict/bestEffort/ignoreErrors) has no TS analog yet; every other `fromPBN` in this codebase
     returns `T | undefined` (single best-effort value, no error collection), but a whole-document
     parser that wants "keep going and report what went wrong per-line" needs a different shape.
     Don't default to `T | undefined` here without deciding this explicitly first.

**Why (porting order):** User is porting one type at a time; Swift project is the authoritative reference.
**How to apply (porting order):** When user asks to port the next type, read the corresponding Swift file first, then implement using the existing TS type-alias+const-object pattern (except Game/Document, see above).
