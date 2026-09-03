---
name: project-porting-status
description: Swift→TypeScript port progress for ts-contractbridge; which types are done and which remain
metadata:
  type: project
---

Swift source: /Users/ralphlipe/Documents/GitHub/swift-contract-bridge/Sources/ContractBridge/
TypeScript source: /Users/ralphlipe/Documents/GitHub/ts-contractbridge/packages/ts-contractbridge/src/
(moved here 2026-08 when the repo became an npm workspace — see "Workspace restructuring" below;
was a flat repo-root src/ before that.)

## Already ported (20 types)
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
- DoubleDummyTricks → doubleDummyTricks.ts. Briefly renamed to "DoubleDummyTable" on the TS side
  only (Ralph felt "Tricks" implied analysis when it's really just a results table) — that turned
  out to be a mistake: `PBNGame`'s accessor then assumed the PBN wire tag was also "DoubleDummyTable"
  (it isn't — real files use `[DoubleDummyTricks "..."]`), which was a real bug caught loading a
  real file. Renamed back to `DoubleDummyTricks` everywhere (2026-09) to match both the wire tag and
  Swift's own type name, eliminating the mismatch at its root — see the dedicated section below for
  the full story. {N,E,S,W}: Partial<Record<Strain,number>>; pbn/fromPBN use hex digits, N,S,E,W
  order / NT,S,H,D,C strain order per Swift; 'F'=unknown; bogus all-1's filter preserved from Swift.
  Output function is `toPBN`, not `pbn` (see PBNCodable note below).
- PlayerNames → playerNames.ts (2026-09, new, TS-only concept — Swift models this as a bare
  `[Direction: String]` computed property directly on `PBN.Game`, no standalone type). Ralph
  explicitly asked for player names to be a real, independent value type reusable outside PBN, not
  something PBNGame owns — see the dedicated section below.
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
- Auction + AuctionCall + AuctionError → renamed to PBNAuction/PBNAuctionCall/PBNAuctionError and
  relocated to `src/pbn/pbnAuction.ts` (2026-08, see the PBN module section below for why and for
  the NAG/suffix work in progress there) — immutable; makingCall/undoingLast return new instances
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
  - `getBoard(): number | undefined` / `setBoard(board: number): void` — first typed tag accessor,
    started 2026-08. Board's PBN value is a non-negative integer (matches Swift's `UInt`); anything
    that doesn't match `/^\d+$/` (negative, decimal, non-numeric, empty) reads as `undefined` rather
    than throwing — no PBNError equivalent exists yet. `setBoard` doesn't validate its input is a
    non-negative integer (trusts the caller, matching this codebase's "validate only at boundaries"
    convention); passing a non-integer would round-trip to a value `getBoard` can't parse back.
    **How to apply going forward:** most future accessors (Deal, Contract, Declarer, Vulnerable) are
    expected to be thin wrappers delegating to existing types' `fromPBN`/`toPBN` — Board needed its
    own tiny parse/format logic only because there's no existing "non-negative integer" PBN type.
    One exception flagged by Ralph: `getDealOutcome`/`setDealOutcome` will NOT be thin — it combines
    three tags (Declarer, Contract, Result) — build accessors one at a time, starting simple.
  - `getDealer(): Direction | undefined` / `setDealer(dealer: Direction): void` — second accessor,
    the first genuinely thin one: delegates entirely to `Direction.fromPBN`/`Direction.toPBN`
    (already handle case-insensitivity/validation), no new parsing logic at all. Confirms the "most
    accessors are thin wrappers" expectation above.
  - `getVulnerable(): Vulnerable | undefined` / `setVulnerable(vulnerable: Vulnerable): void` — same
    thin-wrapper shape as `getDealer`/`setDealer`, delegating to `Vulnerable.fromPBN`/`toPBN` (gets
    the "Love"/"-"/"Both" PBN synonyms and case-insensitivity for free).
  - `getDeal(): Deal | undefined` / `setDeal(deal: Deal): void` — **the one exception so far to
    "just delegate to fromPBN/toPBN directly"**: `Deal.fromPBN` returns `Deal | DealError`, not
    `Deal | undefined` (per its `PBNCodable<Deal, DealError>` conformance), so `getDeal` has to
    check `'type' in result` and fold a `DealError` into `undefined` to match every other
    accessor's undefined-on-failure convention. Worth remembering for any future accessor backed
    by a type whose `fromPBN` doesn't return a plain `T | undefined` (so far, only `Deal`).
  - `getDeclarer(): Direction | undefined` / `setDeclarer(declarer: Direction): void` — thin wrapper
    like `getDealer`/`setDealer` (same `Direction.fromPBN`/`toPBN`), but a genuinely distinct tag:
    Dealer = who dealt the hand, Declarer = who won the auction (absent until the auction ends).
    They're independent tags/sections, not aliases of each other.
  - `getContract(): Contract | undefined` / `setContract(contract: Contract): void` — thin wrapper
    over `Contract.fromPBN`/`toPBN`. **Known simplification, flagged to Ralph:** Swift's real
    Contract tag can hold the literal `"Pass"` (auction ended with no contract), modeled there as a
    separate `ContractTagValue` (`.pass | .contract(Contract)`), not a bare `Contract`. Using plain
    `Contract` here means `"Pass"` fails `Contract.fromPBN` just like any invalid string — a passed
    -out auction and a missing/malformed tag both collapse to `undefined`, undistinguished. Revisit
    if that distinction turns out to matter (e.g. once `getDealOutcome` needs to tell them apart).
  - `getResult(): number | undefined` / `setResult(result: number): void` — same non-negative-
    integer shape as `getBoard`/`setBoard`, further constrained to 0-13 (tricks taken); out-of-range
    or malformed values read as `undefined` rather than throwing.
  - `getDealOutcome(): DealOutcome | undefined` — done 2026-08, the non-thin-wrapper accessor
    flagged earlier. Reads the raw `Contract` tag value directly (not via `getContract()`, which
    already collapses `"Pass"` into `undefined`) to detect `"Pass"` case-insensitively → returns
    `DealOutcome.passedOut`. Otherwise combines `getContract()`/`getDeclarer()`/`getResult()` into
    `DealOutcome.played(...)` if all three are present, else `undefined`. Matches Swift's read-only
    `dealOutcome` getter exactly — only ever returns `passedOut` or `played`.
  - `setDealOutcome(outcome: DealOutcome): void` — **`passedOut`**: sets `Contract` to `"Pass"` and
    deletes `Declarer`/`Result` (Swift's getter doesn't check them once Contract="Pass", but leaving
    them behind would be exactly the stale-data problem this whole module has been trying to avoid,
    so they're cleared). **`played`**: sets `Contract`/`Declarer`/`Result` from the
    `DeclaredContract`+`tricksTaken`. **Everything else (`scoreOnly`/`average`/`averagePlus`/
    `averageMinus`/`noScore`) throws a plain `Error`** — confirmed with Ralph via AskUserQuestion:
    these kinds have no Declarer/Contract/Result representation at all, and silently no-op'ing or
    discarding data would hide a real caller mistake rather than surface it. No PBNError-equivalent
    exists yet (still an open question below), so this is a plain `Error`, not a typed one — revisit
    if/when a real error-type design lands for this module.
  - **`getAuction(): PBNAuction | undefined` — added by Ralph directly (2026-08), not by me.**
    Finds the section tagged `Auction` (case-insensitive) and delegates to
    `PBNAuction.fromPBNSection(section.lines)`. Simple and correct on its own — the bug this
    surfaced was in `PBNAuction.fromPBNSection` itself, not here (see below).
- **Bug found via Ralph's own test (2026-08): `PBNAuction.fromPBNSection` had no `{...}` comment
  -block awareness**, unlike `PBNDocument.fromPBN` (which got this right from the start). It
  tokenized *everything* after the tag line as call tokens, including the literal `{`, prose words,
  and `}` inside an embedded comment — so any Auction section containing a `{...}` block (a
  completely legal, real-world pattern — see `test-data/Responder Rebid.pbn`'s second game, which
  Ralph added specifically to catch this) failed to parse at all, returning `undefined`. Fixed with
  the same line-based `inCommentBlock` tracking as `PBNDocument.fromPBN`: while a block is open, its
  lines (including any that look like note markers, e.g. `=1=` mentioned in prose) are dropped
  entirely before tokenization, not treated as body content or notes. **Lesson: when a comment
  -block concept is added to one parser, check every other parser/tokenizer that walks the same raw
  lines — they need the same awareness, and won't get it for free.** `PBNGame`'s own line-walking
  (`getTagValue`, `setSection`, etc.) is unaffected since it operates on whole sections already
  split by `PBNDocument.fromPBN`, not on raw un-sectioned text.
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
- **`PBNSectionCodable<T, E = undefined>`** (`src/pbn/pbnSectionCodable.ts`, new 2026-08) — the
  complex-tag analog of `PBNCodable`, for types whose PBN representation spans multiple lines
  (Auction, and later Play) rather than a single string. `toPBNSection(value): string[]` /
  `fromPBNSection(lines: readonly string[]): T | E`; element 0 of the array is always the tag pair
  line. Deliberately placed in `src/pbn/` rather than alongside `PBNCodable` at top-level — unlike
  `PBNCodable` (used by core value types regardless of the PBN module), this only makes sense in
  terms of the `PBNSection` concept, and `auction.ts` already has to reach into `src/pbn/` for
  `formatTagLine` regardless. **`toPBNSection`/`fromPBNSection` accept/return plain (not readonly)
  vs. readonly arrays asymmetrically on purpose**: `toPBNSection`'s output must be a plain `string[]`
  so `game.setSection(X.toPBNSection(v))` type-checks against `setSection`'s existing `string[]`
  param; `fromPBNSection`'s input must accept `readonly string[]` so `X.fromPBNSection(section.lines)`
  type-checks against `PBNSection.lines`'s readonly type.
  **`Auction.toPBNSection`** (`src/auction.ts`) — tag line is `[Auction "<dealer>"]` via
  `formatTagLine`; body groups calls 4-per-line (matching Swift/standard PBN auction formatting);
  a call's note gets an inline `=N=` marker plus a trailing `[Note "N:text"]` line per note, in the
  order encountered. **Note numbers are recomputed fresh at serialize time** (a local counter), NOT
  read from `AuctionCall.noteNumber` — that stored field is assigned incrementally as calls are
  added and isn't guaranteed to match a fresh left-to-right scan of whatever calls currently
  remain; Swift's own serialization also recomputes fresh rather than using any stored number.
  **`Auction.fromPBNSection`** (`src/auction.ts`, done 2026-08 right after `toPBNSection` — no gap
  this time, so `Auction satisfies PBNSectionCodable<Auction>` is in place) — returns `Auction |
  undefined` (the interface's default `E`), NOT a new `AuctionError` kind: any failure (bad tag
  line/name, unrecognized dealer, unparseable call token, a `=N=` marker with no matching `[Note]`
  line, or an illegal call sequence — caught from `makingCall`'s own thrown `AuctionError`) folds to
  `undefined`, matching how nearly every other `fromPBN`-style function in this codebase behaves.
  Algorithm mirrors Swift's two-phase approach: (1) split remaining lines into `[Note "N:text"]`
  lines (build a `"=N="` → text map) vs. body-text lines; (2) tokenize the joined body text on
  whitespace, folding each `"=N="` marker into the *preceding* token (not looked ahead) since that's
  the token it annotates; (3) replay each token through `make`/`makingCall`, expanding the `"AP"`
  ("all pass") shorthand into repeated `Pass` calls until `isComplete`. Round-trips
  `fromPBNSection(toPBNSection(a))` back to the original `a`, verified in tests for empty, plain,
  and doubled/redoubled-with-notes auctions.

- **`parseSectionLines` / `ParsedSection` / `PBNGame.getParsedSection` — done 2026-08, Ralph's idea.**
  Ralph noticed the note/comment/body-separation logic in `PBNAuction.fromPBNSection` (see the
  comment-block bug above) is exactly the kind of thing every future complex-tag section parser
  (Play, etc.) will need again, and asked for it to be factored out once rather than re-derived —
  and re-drifted — per caller. Design, and naming feedback given as requested:
  - **`ParsedSection`** (`src/pbn/parsedSection.ts`, new file) — `{ tagPair: TagPair | undefined,
    bodyLines: readonly string[], notes: ReadonlyMap<string,string>, comments: readonly string[] }`.
    No `PBN` prefix, matching `TagPair`'s precedent (plain names for small structural shapes local
    to this module).
  - **`parseSectionLines(lines: readonly string[]): ParsedSection`** — the actual reusable logic,
    a standalone function rather than a `PBNGame` method, because `PBNAuction.fromPBNSection` only
    ever receives raw `lines: readonly string[]` (the `PBNSectionCodable` contract) — it has no
    `PBNGame` to call a method on. Absorbs what used to be hand-rolled separately in
    `PBNAuction.fromPBNSection`: strips the tag-pair line (via `parseTagLine(lines[0])`; if there's
    no valid tag pair — the "global" section case — `bodyLines` starts from `lines[0]` itself
    instead of skipping it), tracks `{...}` block state the same way `PBNDocument.fromPBN` does,
    and **also now recognizes `;`-prefixed single-line comments** — a genuinely new capability
    neither `PBNDocument.fromPBN` nor the old `PBNAuction.fromPBNSection` had (both previously left
    `;` lines as undifferentiated body/section content). `notes` is keyed by the literal `"=N="`
    marker text (e.g. `"=1="`), matching how it's referenced in body content, so a caller can look
    it up directly without reformatting. A malformed `[Note ...]` line (no colon) falls through to
    `bodyLines` rather than being silently dropped — matches this module's "never discard a line"
    discipline, and is a small deliberate behavior change from the old `fromPBNSection` (which
    returned `undefined` for the whole section on a malformed Note line; now it's just an
    unparseable body token, likely still `undefined` overall via a different path, but no longer a
    special case in the shared parser).
    **`comments` shape, my design call — flagged to Ralph, not yet corrected:** each `;` line or
    `{...}` block becomes one string with the delimiter characters removed; a multi-line block's
    lines are joined with `"\n"`, keeping a genuine internal blank line (a paragraph break) but
    *dropping* a leading/trailing line that was purely the opening `{` or closing `}` with nothing
    else on it (rather than keeping it as a spurious leading/trailing blank line). Text sharing a
    line with a delimiter (`"{ opening text"`, `"closing text }"`) has only the delimiter and its
    immediately-adjacent whitespace stripped, keeping the rest. An unclosed block at end-of-input
    still becomes a comment (matches `PBNDocument.fromPBN`'s same "absorb rather than throw"
    handling).
  - **`PBNGame.getParsedSection(tagName: string): ParsedSection | undefined`** — the method Ralph
    asked for by name (his suggestion, kept as-is: fits the `get`-prefix convention every other
    `PBNGame` accessor already uses). Thin: finds the section by tag name (case-insensitive, same
    scan as `getTagValue`), then calls `parseSectionLines(section.lines)`. `PBNGame.getAuction`
    itself does NOT use this — it still hands raw `section.lines` straight to
    `PBNAuction.fromPBNSection`, which needs the tag line included; `getParsedSection` is a sibling
    convenience for callers that want the split-apart shape directly, not a required detour.
  - **`PBNAuction.fromPBNSection` refactored to call `parseSectionLines` internally** — its own
    hand-rolled Note-separation and `inCommentBlock` tracking is gone, replaced by one call to the
    shared function; the NAG/suffix-folding and call-replay logic (Auction-specific) is unchanged.
    Its `PBNSectionCodable<PBNAuction>` public contract (`fromPBNSection(lines): PBNAuction |
    undefined`) is unchanged — the new shared parser is purely an internal implementation detail
    here, not a signature change.
  - Tests: `tests/pbn/parsedSection.test.ts` (new, exercises `parseSectionLines` directly — tag/body
    split, global-section case, notes keyed by `=N=`, malformed-Note fallthrough, `;` comments,
    single- and multi-line `{...}` comments including the real `Responder Rebid.pbn`-shaped case,
    text sharing a line with a delimiter, an unclosed trailing block, multiple comments in order)
    and a new `getParsedSection` describe block in `tests/pbn/pbnGame.test.ts`. All existing
    `PBNAuction`/`PBNDocument`/`PBNGame` tests pass unchanged — no behavior regression from the
    refactor. 370 tests total, `tsc --noEmit` and `npm run build` clean.

## PBNAuction: renamed from Auction, and real PBN-2.1-spec compliance work in progress (2026-08)
**Renamed `Auction`/`AuctionCall`/`AuctionError` → `PBNAuction`/`PBNAuctionCall`/`PBNAuctionError`**,
moved `src/auction.ts` → `src/pbn/pbnAuction.ts`, test file to `tests/pbn/pbnAuction.test.ts`. Ralph's
reasoning, which I agreed with: the *validation logic* (`makingCall`, `isComplete`,
`declaredContract`) is genuinely format-agnostic bridge domain logic, but `note`/`noteNumber` and
`toPBNSection`/`fromPBNSection` are PBN-specific, and PBN-only concepts (NAGs, alerts — see below)
are about to become a bigger part of the type. No second format (LIN, etc.) is on this library's
roadmap that would need an un-annotated "general" Auction, so splitting into two types now would be
solving a problem that doesn't exist yet — one renamed type is the pragmatic choice. Blast radius
was small (only `index.ts` and its own test imported it; `PBNGame` has no `getAuction`/`setAuction`
yet). **Careful gotcha when doing this kind of rename:** don't blind-replace the identifier
substring — string literals like `'[Auction "N"]'` are the actual PBN wire-format tag name and must
NOT be renamed, only the TS identifiers (`PBNAuction.make(...)`, `PBNAuctionError`, etc.) change.

**Fetched the real PBN 2.1 spec** (http://www.tistis.nl/pbn/pbn_v21.txt — I don't have it memorized;
had been relying on the Swift source + general recollection before this, which wasn't precise
enough for a compliance review) and compared it against the current `PBNAuction`. Gaps found,
confirmed with Ralph, tackling one at a time — **NAGs + suffixes first** (see decision below), then
`*` (auction ends via explicit termination, not 3 passes), then `+` (intentionally-incomplete
auction, replaces the next call), then `-` ("not yet player's turn" placeholder token), then `^I`/
`^S` (irregularity markers: insufficient bid / call skipped due to out-of-rotation call — these
record what *actually happened at the table*, including rule violations, a different job than
`makingCall`'s current legality-enforcing validation):
- **NAGs + suffixes — done 2026-08.** Suffixes (`!`, `?`, `!!`, `??`, `!?`, `?!`) are 1:1 shorthand
  for **NAG values 1-6** — the spec itself says so (worked example: import `"1S !! =1= $25"` →
  export `"1S =1= $3 $25"`), and export format always canonicalizes to the numeric `$N` form, never
  re-emitting the suffix even if that's what was parsed. **Ralph's decision, implemented as
  specified: parse both forms on import (`suffixToNag` lookup table converts on the spot), but only
  ever store and emit NAGs** — `PBNAuctionCall.nags?: readonly number[]` has no concept of "this
  came from a suffix," they're indistinguishable and equally valid post-conversion. `toPBNSection`
  sorts `nags` ascending on export (spec-mandated order: note reference first, then NAGs ascending);
  storage order is just encounter-order, sorting is purely an export-time concern.
  `makingCall(a, call, note?, nags?)` gained a 4th param so nags can be attached directly, not just
  via parsing. An empty `nags` array is never stored as a field (matches how `note`/`noteNumber` are
  omitted rather than stored empty/undefined).
  NAG values aren't Auction-specific either — the spec's own table (0-14 given directly in the doc;
  full 0-255 range lives in an external `.nag` file) shows 1-6 are for calls, **7-14 are for cards**
  (the not-yet-ported Play section) plus 13/14 = "call/card corrected manually". So NAGs are a
  shared annotation mechanism across Auction and Play, not something designed Auction-only — expect
  to reuse `suffixToNag`-equivalent logic (or extract it) when Play is ported.
  A call can carry a note reference AND zero-or-more NAGs simultaneously — these stack, they're not
  mutually exclusive alternatives. Parsing doesn't specifically reject "more than one suffix token"
  as a distinct error — after conversion there's no way to tell a suffix-derived NAG from a raw `$N`
  one anyway, so multiple suffix-like tokens on one call are just accepted as multiple NAGs, same as
  multiple raw `$N` tokens would be.
  Note reference range is documented as 1-32; nothing enforces that ceiling yet (low priority).
- **`PBNAuctionCall.id` removed (2026-08).** It was a straight carryover from Swift's `AuctionCall:
  Identifiable` — needed there only for SwiftUI's `ForEach` list-diffing, never read by any actual
  bridge/PBN logic (confirmed via grep of `Auction.swift`: `id` only appears in the struct
  definition and constructor, never consulted anywhere). Ralph caught this as Swift-specific
  baggage that shouldn't have carried over. **General lesson for future ports:** watch for fields
  whose only purpose in Swift is a UI-framework protocol conformance (`Identifiable`,
  `ObservableObject`, etc.) — those don't belong in a plain-data TS port.
- **`+` (auction not yet complete) — done 2026-08.** Ralph deliberately picked this as the simpler
  one to tackle before `*` (sequencing changed on the fly from the original `*`-first plan).
  **Parsing:** `+` is just skipped/ignored when encountered in the token stream — since it replaces
  the *next* call rather than being one, the calls already accumulated before it correctly represent
  an incomplete auction (`isComplete` is false by construction), nothing else to do. No validation
  that `+` only appears in a sensible position (e.g. not after 3 passes/AP) — kept permissive per
  Ralph's "keep it simple" framing, matching how malformed input elsewhere in this parser is mostly
  handled by falling through rather than added rejection rules.
  **`toPBNSection`:** appends `+` as one more slot after the last real call whenever `!isComplete(a)`
  — joins the current line if there's room (under 4 tokens so far), otherwise starts a new line,
  by including it in the *total* token count (`calls.length + 1`) that the existing 4-per-line
  grouping logic already uses to decide where to flush. A freshly-made empty auction now serializes
  as `['[Auction "D"]', '+']` rather than just the tag line alone.
  **Broke several pre-existing tests that used incomplete auctions to test line-wrapping/notes** (a
  trailing `+` is now correctly appended where none was expected before) — fixed each by either
  updating the expected output to include `+`, or reshaping the fixture to be complete (last 3 calls
  = Pass) where that kept the test's original single focus cleaner (e.g. the "exact multiple of 4"
  line-grouping test). Worth remembering for `*` next: it will likely touch the same set of tests
  again, for the same reason (any test built around an "auction that just stops" fixture interacts
  with whatever end-of-auction marker is currently implemented).
- **PAUSED 2026-08 — `PBNAuction` is "good enough for now" (Ralph's words).** `*`/`-`/`^I`/`^S` are
  NOT next up — Ralph judged them lower priority than other unstarted PBN-module work (see the
  reordered priority list below) and asked to explicitly deprioritize them rather than continue the
  original `*`→`-`→`^I`/`^S` sequence. **Don't resume this work proactively** — treat it the same as
  the conditionally-skipped items above (not forgotten, just parked) until Ralph asks for it again.
**How to apply:** Don't jump ahead and implement PBNGame's real storage or the parser unless asked
— Ralph is deliberately sequencing this "a step at a time." Ask what's next rather than assuming
the natural next chunk (e.g. don't assume "now do the parser" just because it seems logical).

## Remaining work (priority order, reordered 2026-08 — PBNAuction gaps explicitly deprioritized)
1. **PBN module core** — the actual payoff for "get PBN reading/writing working":
   - **Started 2026-08: `splitLines(text: string): string[]`** (`src/pbn/splitLines.ts`) — the first
     piece of the actual parser (Swift's `Parse.swift` used `String.enumerateLines` for exactly this
     reason: PBN files can use CRLF/LF/bare-CR line endings, sometimes mixed within one file, since
     they come from many eras/platforms). Splits on `/\r\n|\r|\n/` (CRLF tried first in the
     alternation so it's consumed as one terminator, never as a stray CR + separate LF). **Matches
     `enumerateLines`'s specific behavior that a terminated text produces no phantom trailing empty
     line** — `"a\n"` is one line, not two — while a genuine blank line (`"a\n\n"`) still counts.
     Exported publicly (`index.ts`), matching how `parseTagLine`/`formatTagLine` were also exposed
     as reusable primitives rather than kept as parser-internal helpers.
   - **`PBNDocument.fromPBN(text): PBNDocument` — done 2026-08.** Static factory method (not a
     `T | undefined`-returning function like every other `fromPBN` in this codebase — this one
     genuinely can't fail, see the "never discard a line" invariant below). Splits `text` into
     games/sections with these rules, agreed with Ralph:
     - One or more blank lines end the current game (matches Swift).
     - A `[TagName "Value"]` line starts a new section — except a `Note` tag, which is absorbed
       into the *current* section instead (matches the original `PBNSection` design intent).
     - **No line is ever transformed or discarded.** `%` lines keep their `%` and exact original
       whitespace (a deliberate reversal of my first proposal, which matched Swift by stripping
       the `%` and trimming — Ralph wants zero text modification anywhere, since **serialization
       will eventually just be "write the stored lines back out"**, so anything the parser
       normalizes would be permanently lost). A `%` line only goes to `PBNDocument.escapedText`
       when *no section is open at all yet*; once any section is open (global or tagged), a `%`
       line — like a comment, or a malformed bracket-looking line, or literally anything else —
       just joins that section's lines like ordinary body content.
     - **Known, accepted limitation:** `PBNGame`/`PBNDocument` don't track how many blank lines
       separated two games — "1 or more" all collapse to the same game-boundary. Ralph confirmed
       he doesn't care about this for round-tripping.
     - **`{...}` multi-line comment blocks — done 2026-08, right after the initial cut.** Ralph
       deliberately edited `Responder Rebid.pbn` to add a `{...}` block containing a blank line and
       said the file should still parse to 2 games (not 4) — confirming the gap flagged above
       needed fixing immediately, not deferring. `inCommentBlock: boolean` state now mirrors
       Swift: a line whose trimmed content starts with `{` opens the block (unless that same line
       also ends with `}` — a single-line `{ ... }` comment never enters the multi-line state at
       all); while open, EVERY line — blank, `%`, tag-shaped, anything — is pure comment content
       that joins the current section, until a line whose trimmed content ends with `}` closes it.
       An unclosed block at end-of-file just absorbs the rest of the text (no error). Ralph's test
       file exercises exactly this: a genuine blank line as a paragraph break inside prose commentary.
     - Verified against 5 real PBN files Ralph provided in `test-data/` (gitignored `.DS_Store`
       aside, the `.pbn` files themselves ARE meant to be committed — not test fixtures generated
       by us, genuine external hand-record/lesson files): a mix of LF and CRLF line endings, a
       leading blank line before the first game, 40 lines of `%` header content (some with a space
       after `%`, some without) before the first tag, multi-line `{...}` comment blocks sitting
       between two ordinary tags, a multi-line complex/table tag (`OptimumResultTable`), and
       custom/non-standard tags (`BCFlags`) — the parser doesn't need to know which tags are
       "real" PBN tags vs. app-specific extras, it treats any `[Name "Value"]`-shaped line the
       same. All 5 files parse into the expected number of games with sensible tag values.
   - `PBNDocument`'s remaining methods: `renumberBoards`, `delete`, `move`, `serialize` (explicitly
     next after `fromPBN`, but export-format rules need deciding first — Ralph flagged that written
     -out data "may be much different than originally read" once we get there, a separate
     discussion from parsing), `load` (Foundation/URLSession-specific in Swift, likely out of scope
     — probably just string-in/string-out here, file/network I/O left to the caller).
   - Remaining `PBNGame` typed accessors beyond what exists (Board/Dealer/Vulnerable/Deal/Declarer/
     Contract/Result/DealOutcome/**Auction (get only, Ralph-added)** are done): Event, Site, Date (3
     input formats, 1 canonical output — same "preserve original substring" question as the rest of
     this module), Scoring, the West/North/East/South player-name tags, `setAuction`,
     DoubleDummyTricks, OptimumScore.
   - Still-open design questions from the "PBN.Game storage design" section below: generic-setter
     validation, `reconcileTags`-equivalent at parse time, overall error/validation strategy
     (Swift's `ValidationLevel`) — these block the parser more than they block anything else, worth
     resolving before or during that work rather than as an afterthought.
   - Small supporting value types: `Note`, `ContractTagValue`, `OptimumScoreTagValue` — probably
     needed by the accessors/parser above rather than standalone work.
2. **`AnnotatedPlay` + Play section support** — the other complex tag alongside Auction; needs its
   own `PBNSectionCodable` conformance, and will reuse NAG handling (NAG values 7-14 are
   card-specific per the spec) once built.
3. **`PBNAuction` remaining PBN-2.1 gaps — paused, low priority** (see note above): `*` (explicit
   auction termination, vs. the 3-pass convention), `-` ("not yet player's turn" placeholder),
   `^I`/`^S` (irregularity markers for insufficient bids / out-of-rotation calls). Auction already
   supports the core spec (calls, AP, notes, NAGs/suffixes, `+`) well enough to be usable.
4. CardSet / CardArray extensions — utility functions for card collections (only if PBN work needs them)
5. RankSet — see conditional-skip note above
6. Analysis module — DoubleDummySolver, LeadGenerator, etc.

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

## Workspace restructuring: npm workspace + contractbridge-react + apps/pbn-viewer (2026-08)
**Why:** Ralph is building two React apps against this library — a PBN Viewer test app now, and
eventually a rich, interactive PBN editor. Rather than write the viewer's rendering as one-off app
code and rewrite it for the editor, this mirrors the split already proven in
`swift-contract-bridge` (`ContractBridge` core + `ContractBridgeUI` reusable views): a
framework-coupled middle layer of presentational React components that any app built on this
library can share. Ralph explicitly chose to scaffold the whole shape now, before writing any
viewer feature code, rather than build the viewer standalone and extract a shared package later.

**Repo converted to an npm workspace** (plain npm, no pnpm/yarn — npm workspaces, native since v7,
were already sufficient). Layout:
- Root `package.json` — `"private": true`, `"workspaces": ["packages/*", "apps/*"]`, no code of its
  own; a few passthrough scripts (`npm test`/`npm run build`/`npm run typecheck` at the root target
  `packages/ts-contractbridge`; `npm run dev:viewer` targets `apps/pbn-viewer`).
- Root `tsconfig.base.json` — the strict compiler options every package shares (`strict`,
  `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `esModuleInterop`,
  `forceConsistentCasingInFileNames`, `skipLibCheck`, `target: ES2022`). Every package's own
  `tsconfig.json` `extends` this and adds only what's package-specific.
- **`packages/ts-contractbridge/`** — the existing library, moved here via `git mv` with every
  internal relative path preserved exactly (`src/`, `tests/`, `test-data/`, `tsconfig.json`,
  `vitest.config.ts`, `package.json` all moved together, so e.g.
  `tests/pbn/pbnDocument.test.ts`'s `../../test-data/...` reference needed no change). Package name
  stays `ts-contractbridge`, version stays `0.1.0`. All 370 tests, `tsc --noEmit`, and `npm run build`
  confirmed clean in the new location, matching pre-move behavior exactly.
- **`packages/contractbridge-react/`** (new) — presentational React component library, package name
  `contractbridge-react`, `"private": true` (not published). Depends on `ts-contractbridge` via
  plain semver range (npm workspaces auto-link by package name — no `workspace:` protocol needed,
  unlike pnpm/yarn). Declares `react`/`react-dom` as `peerDependencies` (+ matching `devDependencies`
  for local typechecking), not direct dependencies — the consuming app supplies its own React.
  **Deliberately has no build step**: `"main"`/`"types"` point straight at `src/index.ts`; Vite in
  the consuming app transpiles the TS/TSX source on the fly. This is the standard pattern for a
  workspace-internal package still evolving alongside its one consumer — a real bundled build can
  be added later if/when this package is ever published standalone.
  **Component boundary, important for future work:** this package holds *presentational* components
  that take domain types (`Deal`, `PBNAuction`, `Contract`, etc.) as props and emit callbacks for
  interaction (`onCallSelected`, etc.) — no document/undo-redo/file-I/O state of its own. That
  state stays at the app level (viewer today, editor later). The editor payoff of this boundary:
  a component like a future `AuctionTable` can take an `editable`/`onCallEntered` prop so the viewer
  renders it read-only and the editor renders the *same* component with editing on — one component,
  not two.
  **First (and so far only) component: `SuitSymbol`** (`src/SuitSymbol.tsx`) — renders one suit
  glyph (`Suit.symbol(suit)`) colored red for H/D, black for S/C (standard bridge convention),
  overridable via an optional `color` prop. Deliberately the smallest genuinely-reusable building
  block (something a future card fan or hand diagram will actually compose), not a throwaway
  placeholder — but also deliberately NOT a first pass at `HandDiagram`/`AuctionTable`/etc.; those
  remain separate, not-yet-started next steps, to be scoped individually per Ralph's established
  "one piece at a time" preference.
  **React 19 / JSX namespace gotcha hit and fixed:** with React 19's `@types/react` + `"jsx":
  "react-jsx"`, a bare `JSX.Element` return type fails with `Cannot find namespace 'JSX'` — React 19
  no longer puts a global ambient `JSX` namespace in scope by default. Fix: `import type { JSX }
  from 'react'` explicitly in any file using `JSX.Element` as a return type. Hit this in both
  `SuitSymbol.tsx` and `App.tsx`; worth remembering for every future component file in this package
  and in `pbn-viewer`.
- **`apps/pbn-viewer/`** (new) — package name `pbn-viewer`, `"private": true`. Hand-written (not
  `create-vite`-wizarded, to keep it non-interactive and consistent with the rest of this repo)
  Vite + React + TS app shell: `vite.config.ts` (`@vitejs/plugin-react`), `index.html`,
  `src/main.tsx` (mounts `<App />` via `createRoot`), `src/App.tsx` (currently just the workspace
  wiring proof-of-life below — no PBN-loading or hand-record-rendering logic yet, that's the next
  step). `tsconfig.json` uses `"moduleResolution": "Bundler"` + `"jsx": "react-jsx"`, distinct from
  `packages/ts-contractbridge`'s `"Node16"` (each package's tsconfig is independent; only the shared
  strict options come from `tsconfig.base.json`).
  **Verified end-to-end, not just "files exist":** `npm install` at the repo root resolved the
  workspace links (`contractbridge-react` → `ts-contractbridge`, `pbn-viewer` → both); `npx tsc
  --noEmit` clean in all three packages; `npm run dev --workspace=apps/pbn-viewer` (via
  `.claude/launch.json`'s `"pbn-viewer"` config, port 5173) actually started Vite and rendered the
  page in the browser tool — confirmed via screenshot: heading, description text, and all four
  `SuitSymbol` glyphs rendered (♥/♦ visibly red). `npm run build --workspace=apps/pbn-viewer` (which
  runs `tsc --noEmit && vite build`) also succeeded, producing a real production bundle. This is
  genuine proof the cross-package resolution and bundling work, not just that the file tree is
  correctly shaped.
- **`.claude/launch.json`** (new, tracked in git — this is shared project dev-server config, unlike
  `.claude/settings.local.json` which stays gitignored as user-local permission-cache state) —
  defines the `"pbn-viewer"` launch config (`npm run dev --workspace=apps/pbn-viewer`, port 5173)
  used by the browser preview tool.

**Explicitly out of scope for this restructuring step** (per Ralph's plan approval — don't assume
more was built than this): no `HandDiagram`/`AuctionTable`/`ContractDisplay`/`DoubleDummyTable`/
`BiddingBox` components yet; no PBN file loading, game list, or hand-record rendering in
`pbn-viewer` yet; no build/bundling pipeline for `contractbridge-react` (source-only for now); no
`apps/pbn-editor` — not started. **How to apply:** don't jump ahead and build real display
components or viewer features without Ralph scoping that as its own step, same discipline as every
other feature in this project.

**Important workflow gotcha, hit right after the restructuring above: `packages/ts-contractbridge`'s
`dist/` is a real runtime dependency of the other two workspace packages, not just a build
artifact.** `contractbridge-react`/`pbn-viewer` depend on `ts-contractbridge` via its `package.json`
`main`/`types` fields, which point at `./dist/index.cjs` / `./dist/index.d.ts` — npm workspace
linking resolves that through a real `node_modules` symlink to the package folder, but the fields
inside still point at `dist`. Deleting `packages/ts-contractbridge/dist/` (e.g. as a "clean up the
build artifact" step, which is normally the right instinct since it's gitignored) breaks
`tsc --noEmit` in BOTH downstream packages immediately with `Cannot find module 'ts-contractbridge'
or its corresponding type declarations'` — hit exactly this right after building `HandDiagram`.
**How to apply:** don't reflexively `rm -rf` a package's `dist/` once other workspace packages
depend on it — rebuild it (`npm run build --workspace=packages/ts-contractbridge`) instead of
deleting-and-leaving-it-gone, and lean towards just leaving a freshly-built `dist/` in place between
work sessions rather than cleaning it up as a matter of habit. **Open question for later, not yet
decided:** whether `contractbridge-react`/`pbn-viewer` should instead resolve `ts-contractbridge`
straight from its `src/` during development (bypassing `dist` entirely, the way
`contractbridge-react` itself already ships source-only) — would remove this friction for a library
that's evolving as fast as this one is, at the cost of some resolution-config complexity. Not worth
solving until it's actually annoying in practice.

## `HandDiagram` — first real display component (2026-08)
**`packages/contractbridge-react/src/HandDiagram.tsx`** — Ralph's first requested display
component: a single hand, one row per suit, in standard hand-record order (Spades, Hearts,
Diamonds, Clubs). Takes a `Hand` (`ReadonlySet<Card>`, from `ts-contractbridge`) as its only prop —
purely presentational, no selection/editing, matching the `contractbridge-react` component boundary
established above.
- **Suit order comes for free from `Suit.all`** (`['S','H','D','C']`) — already in the exact order
  Ralph asked for, so `HandDiagram` just maps over it directly rather than hardcoding its own order.
- **Reuses existing library logic rather than reimplementing it:** `Deal.cardsInSuit(hand, suit)`
  (already existed in `deal.ts`, not previously used anywhere in `src/`) returns a hand's cards in
  one suit already sorted high-to-low — exactly what's needed per row, so `HandDiagram` doesn't sort
  anything itself, just maps each card to `Card.rank(card)` and joins the letters (e.g. `AKQ`, using
  `T` for Ten per the existing `Rank` convention, not `10`).
  A void suit renders as an em dash (`—`) rather than a blank line, matching standard hand-record
  convention (a blank row could look like missing data rather than "no cards here").
- **Composes `SuitSymbol`** (not a new copy of suit-glyph logic) for each row's suit symbol —
  confirms the payoff of building `SuitSymbol` as a genuinely reusable atom rather than a throwaway
  first component.
- **Verified visually, not just by typecheck:** wired into `apps/pbn-viewer/src/App.tsx` with a
  real sample hand (North's hand from the same sample deal string used throughout this project's
  tests) and confirmed via the browser tool/screenshot — `♠ AKQ`, `♥ JT9` (red), `♦ 876` (red),
  `♣ 5432`, exactly the expected order and content.
- **No test harness for `contractbridge-react` yet** (no vitest/`@testing-library/react`/jsdom set
  up in that package) — components have been verified by visual render in the browser tool instead.
  Flagged to Ralph, not yet decided: worth adding a real component-test setup once component logic
  gets non-trivial (e.g. once editability/interaction is added), given how strongly this project has
  otherwise valued test coverage everywhere else.
**Still not built:** `AuctionTable`, `ContractDisplay`, `DoubleDummyTable`, `BiddingBox`, a
multi-hand/board layout (N/E/S/W together), any PBN-loading in `pbn-viewer` — each a separate,
not-yet-scoped next step.

## Dark-mode bug: `SuitSymbol`'s hardcoded black was invisible on a dark background (2026-08)
**Bug, reported by Ralph:** running in dark mode (his real day-to-day setup, not a one-off), only
the diamond/heart were visible — spades/clubs disappeared entirely. Root cause: `SuitSymbol`'s
"black" suit color was a hardcoded near-black hex (`#1a1a1a`), and `pbn-viewer` itself declared no
light/dark theme at all (no `color-scheme`, no explicit background/text color) — so whatever
background happened to render (the browser's own dark-mode handling, an OS/browser force-dark
feature, or just this project's dark preview pane) showed near-black text on a near-black
background. Red (an explicit, distinctly-hued color) stayed visible regardless, so only S/C broke.

**Fix — deliberate theming, not a one-off color tweak, since this is meant to be reused by every
future app built on `contractbridge-react`:**
- **`packages/contractbridge-react/src/theme.css`** (new) — defines `--cb-suit-black`/
  `--cb-suit-red` custom properties at `:root`, with a `@media (prefers-color-scheme: dark)`
  override (light gray / brighter red in dark mode). Consuming apps can redefine either token for
  their own branding; nothing requires them to.
- **`SuitSymbol.tsx`** now reads `var(--cb-suit-black, #1a1a1a)` / `var(--cb-suit-red, #c62828)`
  instead of a bare hex, and imports `./theme.css` itself as a side effect — so any app that uses
  `SuitSymbol` (or anything built on it, like `HandDiagram`) gets correct light/dark suit colors
  automatically, without having to remember a separate CSS import. The hex fallback inside `var()`
  only matters if `theme.css` somehow isn't loaded at all (bypassed bundler, etc.) — normal usage
  always gets the CSS-variable value.
- **`packages/contractbridge-react/src/global.d.ts`** (new) — `declare module '*.css'`, needed for
  TS to resolve the side-effect `./theme.css` import. Deliberately a manual ambient declaration
  rather than depending on `vite/client`'s types — this package doesn't depend on any particular
  bundler (unlike `pbn-viewer`, which legitimately does).
- **`apps/pbn-viewer/src/index.css`** (new, imported once from `main.tsx`) — the app's *own* theme,
  a separate concern from the component library's: `color-scheme: light dark` on `:root` (tells the
  browser the page handles light/dark itself, which also suppresses any browser-level auto-dark
  "invert unstyled pages" heuristic that may have contributed to the original bug) plus explicit
  `body` background/text color pairs for light and dark. **Component-library tokens vs. app theme
  stay separate on purpose:** `contractbridge-react` only owns suit-color tokens; page-level
  background/text/layout theming is each app's own responsibility, not something the component
  library should dictate.
- **`apps/pbn-viewer/tsconfig.json`** gained `"types": ["vite/client"]` — needed to resolve the
  app's own `./index.css` side-effect import, and something the original scaffold should have
  included from the start for any Vite+TS app (also gives `import.meta.env` types for free).
**Verified in both themes, not just "looks plausible":** used the browser tool's `resize_window`
`colorScheme` emulation to force `dark` then `light` and re-screenshotted both — dark mode now shows
all four suits clearly (♠/♣ light gray, ♥/♦ red) against the app's dark background; light mode is
unchanged from before (♠/♣ black, ♥/♦ red on white).
**How to apply going forward:** every future `contractbridge-react` component that sets its own
color must go through a `--cb-*` custom property with a sane light-mode fallback (never a bare
hardcoded color), and any new app built on this library needs its own equivalent of
`index.css`/`color-scheme` — don't assume a browser's default rendering is theme-safe.

## `DealDiagram` — multi-hand compass layout (2026-08)
**`packages/contractbridge-react/src/DealDiagram.tsx`** — Ralph's second requested display
component: all four hands from a `Deal` (`{ dealer: Direction, hands: Hands }`, from
`ts-contractbridge`), arranged in the standard compass layout (North top-center, West/East either
side, South bottom-center, center cell empty). Ralph considered calling this `HandRecordDiagram`
then settled on `DealDiagram` — takes a `Deal` directly as its only prop, not a `Hands` record or
four separate hand props.
- **Composes `HandDiagram`** for each of the four hands (one `<HandDiagram hand={deal.hands[dir]}
  />` per direction) rather than reimplementing per-suit rendering — same reuse principle as
  `HandDiagram` composing `SuitSymbol`.
- **Layout via CSS Grid**, one `<div>` per direction placed by explicit `gridColumn`/`gridRow` (not
  by DOM order) in a 3×3 grid, with a bold direction-name label (`Direction.name(dir)`, e.g.
  "North") above each hand. `Direction.all`'s iteration order is just convenient here (used only to
  loop over the four cells), not what determines layout — the per-direction `cellStyle` map is what
  actually places North/West/East/South correctly.
- **No dealer/vulnerability decoration yet** (e.g. highlighting whose turn it is to deal) and no
  selection/editing — purely a static display of a `Deal`, matching the established
  `contractbridge-react` component boundary. Flagged as a natural future addition, not done now.
- **Verified visually in both themes**, same method as `HandDiagram`: wired into
  `apps/pbn-viewer/src/App.tsx` with the same sample deal used throughout this project's tests,
  screenshotted via the browser tool in both light and dark (via `resize_window`'s `colorScheme`
  emulation) — all four hands render in the correct compass positions with correct suit content in
  both themes; the dark-mode `--cb-suit-*` theming from the previous fix carries over correctly
  since `DealDiagram` only composes existing themed components, it doesn't set any colors itself.
**Still not built:** `AuctionTable`, `ContractDisplay`, `DoubleDummyTable`, `BiddingBox`, any
PBN-loading in `pbn-viewer` (the sample deal is still hardcoded in `App.tsx`) — each a separate,
not-yet-scoped next step.

## Real PBN file loading in `apps/pbn-viewer` (2026-08)
**`apps/pbn-viewer/src/App.tsx`** rewritten from the hardcoded sample deal to genuine file loading:
a plain `<input type="file" accept=".pbn,text/plain">`, read via `File.text()` (no upload, no
server — 100% client-side, matching Ralph's original requirement for this app), parsed with
`PBNDocument.fromPBN`. State lives in the app (`doc`/`selectedIndex`/`error` via `useState`), not in
`contractbridge-react` — matches the established component-library boundary (presentational
components only; document/selection state stays app-level).
- A `<select>` lists every game in the loaded document, labeled `Board ${n}` (falling back to
  `index + 1` if there's no `Board` tag) plus `— Dealer ${name}` if there's a `Dealer` tag — reuses
  `PBNGame.getBoard()`/`getDealer()` and `Direction.name()` directly, no new parsing logic.
- Selecting a game calls `PBNGame.getDeal()` and renders it via `DealDiagram` if present, or a
  plain "no Deal tag" message otherwise (a game with an Auction section but no play/deal isn't
  malformed, just has nothing for `DealDiagram` to show yet).
- `PBNDocument.fromPBN` never throws (per its own design — always returns a document, even from
  malformed/empty input), so the only real failure mode handled is "the file parsed to zero games"
  (shown as an error message) plus a defensive `try`/`catch` around `file.text()` itself.
**Verified against a real multi-game file, not just typecheck** — since the sandboxed browser
tool's `computer` action has no native "pick a file from disk" primitive, verification used
`javascript_tool` to construct a real `File` from `test-data/Responder Rebid.pbn`'s actual contents
(a genuinely tricky fixture: two games sharing one `Deal` tag where only North's hand is populated
and S/E/W are all void, plus the `{...}` comment block and `[Note]` tag from earlier
`PBNAuction`/`parseSectionLines` work) and dispatch a real `change` event on the `<input>` — this is
event simulation to verify already-written app code, not using JS to implement the UI itself. Result
confirmed correct: filename shown, game selector reads "Board 1 — Dealer South" / "Board 2 — Dealer
South", North's hand renders correctly (`♠ JT653 ♥ A3 ♦ AKJT5 ♣ 8`), and S/W/E each render as four
em dashes (the void-hand path). Switching the `<select>` to game 2 correctly re-rendered the second
game's deal. An empty file correctly showed "No games found in this file." No console errors beyond
the known-harmless Vite HMR WebSocket noise this preview harness always produces.
**Not yet built:** no Auction/contract/result display (still just the deal), no drag-and-drop file
input (click-to-browse only), no persisting the loaded file across a page reload — each a separate,
not-yet-scoped next step.

## `AuctionTable` — the standard W/N/E/S auction display (2026-08)
**`packages/contractbridge-react/src/AuctionTable.tsx`** — Ralph's third requested display
component: a standard 4-column auction table, columns fixed regardless of dealer — the dealer's
calls just start partway through the first row (leading blank cells before their column), matching
how `PBNAuction.toPBNSection` already groups calls 4-per-line. Takes a `PBNAuction` directly as its
only prop.
**Column order is `['W', 'N', 'E', 'S']`, a local `auctionColumns` constant — NOT `Direction.all`**
(which is `['N','E','S','W']`, clockwise from North). First built with `Direction.all` and shipped
that way; Ralph caught it immediately: standard bridge hand records put West first (leftmost),
matching the compass diagram's West-on-the-left placement, so West's calls read left-to-right
first too. **Why the fix was a one-line column-order swap, not a logic rewrite:** `['W','N','E','S']`
is *itself* a valid clockwise-from-West rotation (the same direction actual play always proceeds
in), so the existing "count blanks to the dealer's column index, then chunk the call sequence into
rows of 4" logic still works unchanged against the new column array — only `Direction.all` needed
replacing with `auctionColumns` everywhere in the file (header row, leading-blanks calculation, per-
row cell lookup). Re-verified against the same real fixture: header now reads "West North East
South", and South-dealt calls now land as blank/blank/blank/1♣ (row 1), Pass/1♠/Pass/1NT (row 2),
Pass/2♦¹ (row 3) — confirmed via the browser tool, both as page text and screenshot.
- **Cell content composes existing pieces rather than reimplementing bid formatting:** `Bid.level`/
  `Bid.strain` + `Strain.toSuit` decide whether a bid's strain is a suit (rendered via `SuitSymbol`,
  so it gets the same red/black theming as everywhere else) or no-trump (literal `"NT"` text);
  `Pass`/`X`/`XX` render as-is. No new "how does a call look" logic duplicated anywhere.
- **Notes**: a call with a `note` shows its `noteNumber` as a superscript in its cell; every noted
  call is collected into a numbered list (`<ol>`, `value={noteNumber}`) below the table — mirrors
  how PBN itself represents the `=N=` marker + trailing `[Note "N:text"]` line, just rendered
  instead of parsed.
- **Not shown yet, deliberately:** NAGs (`PBNAuctionCall.nags`) aren't rendered at all in this first
  pass — flagged as a clear next addition, not forgotten. No bidding-box/editing here either,
  matching the established component boundary (presentational only).
- **Wired into `apps/pbn-viewer/src/App.tsx`** alongside `DealDiagram`, via the already-existing
  `PBNGame.getAuction()`.
- **Verified against real content, both cells and notes, in both themes:** loaded
  `test-data/Responder Rebid.pbn`'s second game (the same real fixture used for
  `PBNAuction`/`parseSectionLines` work earlier) via the browser tool and confirmed: correct 2
  leading blanks before South's column (dealer), `1♣`/`Pass` on row 1, `1♠`/`Pass`/`1NT`/`Pass` on
  row 2, `2♦¹` alone on row 3 with the note "1. New minor forcing" listed below — and re-confirmed
  with `resize_window`'s dark-mode emulation that the suit glyph inside a bid cell (♦) and the
  black-suit glyphs stay correctly themed, since `AuctionTable` only composes `SuitSymbol` rather
  than setting any color itself.

## Tightened hand-diagram vertical spacing (2026-08)
**Bug, reported by Ralph:** the suit rows within a hand were spaced far apart — too much white
space overall in the deal display. Root cause: `HandDiagram` controlled row spacing via
`lineHeight: 1.7` on the outer container rather than an explicit gap between the row `<div>`s —
line-height at that multiplier inflates each row's box well beyond what's needed for legible
monospace text, and it compounds with `DealDiagram`'s own `1rem` grid gap between hands to make the
whole diagram feel sprawling.
**Fix:**
- **`HandDiagram.tsx`** — outer container is now `display: 'flex', flexDirection: 'column', gap:
  '0.15em'` with `lineHeight: 1.2` (normal text line-height, no longer doing double duty as the
  primary row-spacing mechanism). Explicit `gap` between rows is a more direct, predictable lever
  for "space between suit rows" than line-height ever was.
- **`DealDiagram.tsx`** — grid `gap` reduced from `1rem` to `0.5rem` (spacing *between* the four
  hands, a separate lever from `HandDiagram`'s own internal row spacing).
- **`AuctionTable.tsx`** deliberately left untouched — its cell padding (`0.15em 0.75em`) was
  already tight and wasn't part of what Ralph flagged.
**Verified visually, not just by CSS inspection:** loaded the same `Responder Rebid.pbn` fixture via
the browser tool and confirmed the whole deal (all four hands) plus the auction table and note now
fit in noticeably less vertical space, with suit rows reading as a tight, legible block rather than
spread out.
**How to apply going forward:** prefer an explicit flex/grid `gap` over `lineHeight` as the
mechanism for spacing between sibling block-level rows in any future `contractbridge-react`
component — `lineHeight` should only govern actual text line height, not double as layout spacing.

## `DealDiagram`: rounded HCP box, all four hands (2026-08, superseded a same-day first attempt)
**`packages/contractbridge-react/src/DealDiagram.tsx`** — a rounded square box in the grid's
(previously empty) center cell, sized to exactly match the height of the West/East column it sits
between, showing **all four hands'** HCP (not just West/East), each positioned toward its own
compass direction inside the box: North's count near the top, West's near the left, East's near
the right, South's near the bottom — via a 3×3 inner grid (`hcpCellStyle`) mirroring the outer
compass layout's own positions.
- **First attempt (same day) only showed West/East, in a small fixed-size flex box, and was wrong**
  — Ralph corrected it: every hand needed its HCP shown (North/South included), and the box needed
  to match the West/East hands' actual height, not an arbitrary constant. Rebuilt rather than
  patched, since both the content (2 numbers → 4) and the sizing mechanism (fixed em constant →
  dynamically matching row height) needed to change.
- **Sizing: `alignSelf: 'stretch'` + `aspectRatio: '1 / 1'`**, not a hardcoded em value — the box
  stretches to fill its grid row's height (which the browser sets from the *tallest* cell in that
  row, i.e. whichever of West/East's label+`HandDiagram` is taller), then `aspect-ratio` keeps it
  square by matching width to that same height. **Verified pixel-perfect, not just "looks close,"**
  via `getBoundingClientRect()` in the browser tool: box and the West column both measured
  106.98×106.98 for height and top/bottom position, exactly aligned — confirming this CSS approach
  (rather than a guessed fixed size) genuinely tracks the hands' real rendered height.
- **`hcpText(hand)`** unchanged from the first attempt — `Deal.hcp(hand)` if `hand.size > 0`, else
  `''`. Still checks `hand.size === 0` (empty/not-yet-dealt), NOT "computed HCP === 0" — a real
  13-card hand with zero honors must still show `0`; only a genuinely empty hand shows nothing.
- **Rounded corners** (`borderRadius: '12%'`, a Ralph request marked "would be great," not required)
  — a percentage so the rounding scales with the box's own size rather than a fixed px value that
  would look disproportionate if the box's size ever changes (e.g. a larger font-size app).
- **Border and text both use `currentColor`** (no explicit hex), so the box adapts to light/dark
  automatically without needing its own `--cb-*` token — same pattern this module has followed
  since the dark-mode fix earlier.
**Verified via the browser tool, three cases:** a full deal (10 HCP each) shows all four "10"s
correctly positioned per direction; the void-hand fixture (only North dealt, 13 HCP; W/E/S all
empty) shows North's `13` with the other three positions genuinely blank, not `0`; both re-confirmed
under `resize_window`'s dark-mode emulation.
**How to apply going forward:** when a Ralph-requested visual doesn't match what he actually wanted
even though it does what was literally asked, rebuild cleanly rather than patch around the wrong
design — this box's content model (2 numbers vs. 4) and sizing model (fixed constant vs. dynamic
stretch) both changed, so patching the first version in place would have been messier than starting
from the corrected requirements.

**Direction-name labels removed directly by Ralph (2026-08, edited the file himself, not via me):**
the bold "North"/"East"/"South"/"West" text above each hand in `DealDiagram.tsx` is gone — each
compass cell now holds just the bare `<HandDiagram hand={deal.hands[dir]} />`, no label wrapper.
Asked to confirm "everything still works" after this edit, since I hadn't made it myself:
- `tsc --noEmit` clean in `contractbridge-react` and `pbn-viewer` — `Direction` stays validly
  imported/used (`Direction.all` still drives both the compass loop and the HCP box's inner loop;
  `Direction.name` simply isn't called anywhere in this file anymore, not an unused-import error
  since `Direction` the import itself is still very much used).
- **The HCP box's `alignSelf: 'stretch'` + `aspectRatio: '1/1'` sizing adapted automatically, no
  code change needed** — re-measured via `getBoundingClientRect()`: box shrank from 106.98px to
  83.98px square (matching the West column's new, shorter height now that its label is gone),
  confirming this CSS mechanism really does track whatever the row's actual content height is,
  rather than assuming a label would always be present.
- Re-verified end-to-end via the browser tool: full-deal + void-hand HCP display, the auction table
  (including notes and game-switching) via a real fixture, and both light/dark themes — all still
  correct after the label removal. 370 core tests, full workspace typecheck, and the `pbn-viewer`
  production build all still clean.

**HCP box font size reduced (2026-08).** Ralph: the HCP numbers were too visually prominent, and
asked whether React has a SwiftUI-style named type-scale concept (`.footnote`, `.title`, etc. —
SwiftUI's Dynamic Type). **It doesn't** — there's no built-in relative-size-step primitive in
React/CSS the way there is in SwiftUI (that comes from iOS's OS-level Dynamic Type system, not
SwiftUI itself, and has no web equivalent); you just pick a concrete size. Set the HCP box's
`fontSize` to `0.75rem` (was `1rem`, inherited implicitly) — 75% of the surrounding hand text, small
enough to read as a secondary detail rather than competing with the cards. The box's own dimensions
are unaffected (still driven by `alignSelf: 'stretch'` + `aspectRatio: '1/1'` off the row's height,
not by this element's font-size), and the padding (`0.2em`/`0.35em`, relative to the box's own font)
shrank proportionally too, which read fine visually — no further adjustment needed. Verified in both
themes via the browser tool.

**`HandDiagram`: tightened suit-symbol-to-ranks gap (2026-08).** Each suit row's `<div style={{
display: 'flex', gap: ... }}>` (the fixed-width `1em` suit-symbol span + the ranks span) had
`gap: '0.5em'` between them — reduced to `0.2em`. The fixed-width `1em` wrapper around the suit
glyph (for column alignment across rows regardless of glyph width) is untouched, so ranks still line
up cleanly; only the space between the glyph and its ranks shrank. Verified in both themes via the
browser tool.

## Live test deploy: bigdealbridge.com/pbnviewer/ (2026-09)
**Ralph owns `bigdealbridge.com`, already hosted via GitHub Pages from a SEPARATE repo,
`RalphLipe/bigdealbridge-website`** (public, main branch, root path, legacy Jekyll build, custom
domain + HTTPS already fully provisioned — cert valid through 2026-11-17, no DNS work was needed).
That repo is Big Deal Bridge LLC's real public marketing site, with existing pages (`faq/`,
`handsee/`, `larryco/`, `library/`, `support/`, etc.) — **`handsee/index.html` was found to be
existing precedent** for exactly this pattern (a bare subfolder for one app, not linked from the
main nav). `_config.yml` only excludes `README.md`, nothing else — safe for a new subfolder, no
Jekyll interference expected (confirmed: no console errors, works identically to local).
**Deployed the viewer as an end-to-end deployment test, explicitly NOT for public consumption yet**
(reachable only by direct URL, not linked from the site's nav):
- **`apps/pbn-viewer/vite.config.ts`** — `base` is now command-conditional:
  `command === 'build' ? '/pbnviewer/' : '/'`. Only `vite build`'s output needs the subpath baked
  into asset URLs; `vite dev` stays at `base: '/'` so local dev (`.claude/launch.json`'s
  `"pbn-viewer"` config, `http://localhost:5173/`) is completely unaffected. **Important for any
  future deploy-affecting change:** don't set a bare top-level `base: '/pbnviewer/'` — that would
  break local dev by making `http://localhost:5173/` 404.
- **Mechanics (manual one-off, not CI — deliberately, per Ralph's "just a test" framing):** shallow
  `gh repo clone` of `bigdealbridge-website` into the scratchpad dir, `npm run build
  --workspace=apps/pbn-viewer`, copy `apps/pbn-viewer/dist/*` into a new `pbnviewer/` folder in that
  clone, `git add pbnviewer` (nothing else staged — confirmed no existing site file touched),
  commit, push to `main`. GitHub Pages' legacy build picked it up automatically; polled
  `gh api repos/RalphLipe/bigdealbridge-website/pages/builds/latest` until `status: "built"` (~50s).
- **Verified live, not just "pushed and assumed":** navigated the browser tool to
  `https://bigdealbridge.com/pbnviewer/` — correct page, no console errors, loaded a real sample
  deal via the actual file input (same technique used for local verification throughout this
  project) and confirmed the deal/HCP-box render identically to local. Local scratch clone deleted
  afterward — nothing left behind in the working tree.
- **Ralph confirmed via AskUserQuestion before I touched the live repo:** subpath `/pbnviewer/`
  (his own repo's `handsee/` precedent style — lowercase, no hyphen), and "push now" directly to
  `main` rather than showing a diff first (matches how that repo has always deployed — no PR/review
  step exists there).
**Not done, explicitly deferred by Ralph ("eventually"):** making the viewer an installable/offline
PWA. No work started on this — mentioned to Ralph only as a scope estimate (the standard tool is
`vite-plugin-pwa`, which auto-generates a manifest + Workbox service worker; since this app is
already 100% client-side with no backend calls, offline caching is a natural fit; the main real work
would be producing actual icon assets at a few sizes, not the code/config itself). No CI/automated
redeploy pipeline exists yet either — this was a manual one-off; worth automating later if the
viewer becomes more than a test.
**Hiding it from the public, clarified 2026-09:** Ralph does NOT want search-engine exclusion or a
password gate (both offered, both declined) — he only wants no link to it from the homepage/nav,
and doesn't care if someone stumbles on the URL by other means. That was already true (nothing was
ever added to `bigdealbridge-website`'s `index.html` or any nav) — confirmed by grepping the live
`index.html` for "pbnviewer" and finding nothing. **How to apply:** don't add search-engine
exclusion (`noindex`/`robots.txt`) or any access gate to this deploy unless Ralph asks again —
"hidden" here means "unlinked," nothing more.

## `DoubleDummyTableView` — ported from the ContractBridgeUI Swift reference (2026-09)
**Ralph explicitly pointed at a Swift reference implementation for this one** (unlike every other
`contractbridge-react` component so far, which were designed fresh): `DoubleDummuyTricksView.swift`
(yes, that's a typo in the actual filename — `DoubleDummuy`, not `DoubleDummy`; don't "fix" it if
ever asked to touch that repo) in `/Users/ralphlipe/Documents/GitHub/ContractBridgeUI/Sources/
ContractBridgeUI/`. That repo depends on the OLDER standalone `ContractBridge` Swift package
(`github.com/RalphLipe/ContractBridge`, branch `matchpoints` — see its `Package.swift`), not the
`swift-contract-bridge` repo this whole TS port otherwise treats as authoritative — but Ralph
pointed at it specifically for this feature, so it's the right reference for the display logic here
regardless of which Swift package backs it.
- **Algorithm, traced through by hand from `DoubleDummuyTricksView.swift`'s `makingTricks`/
  `underTricks`/`body`:** for each strain, compare each pair-member's raw double-dummy trick count
  (`a`, `b`, 0-13) against the "makes at least a part-score" threshold of 7:
  - **Both ≥7 (both make):** one combined result, one shared strain symbol — the contract level(s)
    (`a-6`/`b-6`) to its left; a single level if the partners agree, `"level/level"` if they don't
    (e.g. one partner makes 1NT, the other makes 2NT → `"1/2NT"`).
  - **Both ≤6 (neither makes):** one combined result, one shared strain symbol — the *raw trick
    count(s)* (not a level) to its **right** this time (`"NT6"`, or `"NT6/5"` if they differ).
  - **Split (one makes, one doesn't):** two full independent sub-results, each with its own strain
    symbol, always in seat order (not "maker first"), joined by a literal `"/"` — e.g. North makes
    1NT (7 tricks), South only takes 6 in NT → `"1NT/NT6"`, Ralph's own example, confirmed to render
    exactly that once built.
  - **Either value missing** (no double-dummy data for that direction/strain — the TS `Tricks` type
    already models this as optional, matching Swift's `if let a = ..., let b = ...` guard): render
    nothing for that strain, not a placeholder — matches the Swift reference exactly.
- **Strain symbol representation is identical in both branches — traced this down via Swift's
  custom string interpolation, not just assumed:** `makingTricks` calls `"\(strain, style:
  .symbol)"` explicitly; `underTricks` calls plain `"\(strain)"` — these LOOK different but the old
  `ContractBridge` package's `String.StringInterpolation.appendInterpolation(_ strain:Strain, style:
  = .symbol)` defaults its `style` parameter to `.symbol` too, so both branches produce the exact
  same suit-glyph-or-"NT" output. Confirms the TS port can use one shared representation
  (`StrainSymbol`) in every branch, not two different ones.
- **New shared `StrainSymbol` component** (`src/StrainSymbol.tsx`), factored out of
  `AuctionTable.tsx`'s inline "suit or NT" check (which had exactly this logic already, now reused
  rather than duplicated a second time) — renders an actual suit via `SuitSymbol` (same red/black
  theming) or plain `"NT"` text for no-trump. `AuctionTable.callNode` now composes it instead of
  its own copy.
- **One deliberate deviation from the Swift reference, confirmed via AskUserQuestion before
  building:** the Swift code colors the "doesn't make 7 tricks" text itself blue (foreground
  color). Ralph's original prose described a blue *background* instead — flagged the discrepancy
  explicitly (quoting the Swift code) rather than silently picking one, and Ralph confirmed:
  background fill, not foreground text color. Implemented as a `<span>` "chip" (`background-color`
  + small `border-radius`/padding) wrapping just the affected sub-expression — necessary because in
  the split case only HALF the cell (the non-making side) gets the treatment, so the fill can't
  live on the `<td>` itself.
  New theme token **`--cb-under-tricks-bg`** added to `theme.css` (light `#bbdefb`, dark `#0d47a1`)
  — the chip's fill, following the same "component owns a themed default, app can override" pattern
  as `--cb-suit-black`/`--cb-suit-red`. Text on top of the chip stays the normal foreground/suit
  color (not overridden to blue), matching what Ralph actually asked for.
- **`PBNGame.getDoubleDummyTable()`/`setDoubleDummyTable()`** (new, `pbnGame.ts`) — a thin wrapper
  over `DoubleDummyTable.fromPBN`/`toPBN` (already existed), same shape as `getContract`/
  `setContract`. Reads/writes the `[DoubleDummyTable "...hex..."]` tag (not part of the official PBN
  spec, but the established convention real PBN files use — same note already in
  `doubleDummyTable.ts`). 5 new tests in `pbnGame.test.ts` (round-trip, parse, missing tag,
  malformed/wrong-length value, replace) reusing the same real-world hex fixture
  (`'79668796686467464674'`) `doubleDummyTable.test.ts` already used — no new fixture invented.
  None of the real `test-data/*.pbn` files happen to contain a `[DoubleDummyTable]` tag, so
  end-to-end verification used a hand-constructed one instead (see below), covering every branch
  deliberately (both-make-same-level, both-make-different-levels, both-under-same, both-under-
  different, the split case, and an all-unknown EW pair to confirm empty cells render as nothing).
- **Verified visually in both themes**, not just by tracing the algorithm: loaded a synthetic
  `[DoubleDummyTable "7895668A46FFFFFFFFFF"]` fixture (N/S real values covering every branch above,
  E/W all `"F"`/unknown) via the browser tool and confirmed every cell matches the hand-traced
  expected output exactly, including Ralph's own `"1NT/NT6"` example — then re-confirmed via
  `resize_window`'s dark-mode emulation that the chip stays legible (light text on the darker
  `#0d47a1` fill) and suit colors stay correct.
**Not done:** no par-score display (Swift's `HandRecordView` shows one alongside the double-dummy
rows; not asked for here), no column headers (matches the Swift reference's own lack of them — the
reader is expected to recognize the strain symbols), no editing.

**Bug found immediately by Ralph loading a real file (2026-09): wrong PBN tag name, everything else
correct.** `PBNGame.getDoubleDummyTable`/`setDoubleDummyTable` read/wrote the tag as
`"DoubleDummyTable"` — but real PBN files (confirmed against both `test-data/hand-record-1.pbn` and
`hand-record-2.pbn`) use `[DoubleDummyTricks "...hex..."]`. So `getDoubleDummyTable()` always
returned `undefined` against genuine data — the display logic itself was never wrong, the accessor
just could never find the tag to feed it. Root cause: this TS port renamed the *type* from Swift's
`DoubleDummyTricks` to `DoubleDummyTable` (an earlier, reasonable-on-its-own naming choice — see
"Already ported" section), and a stale/incorrect comment in `doubleDummyTable.ts` had already
(wrongly) claimed `"DoubleDummyTable"` was the real tag name, before any code actually depended on
that claim being right. When I added the `PBNGame` accessor this session, I copied that wrong
comment's assumption instead of checking it against a real file — the exact kind of mismatch a
type rename can quietly cause down the line. **Fixed:** both `doubleDummyTable.ts` comments now say
`[DoubleDummyTricks]` and explain the type-name-vs-wire-tag distinction explicitly; `pbnGame.ts`'s
accessor now reads/writes tag name `"DoubleDummyTricks"`; `pbnGame.test.ts`'s 5 tests updated to
construct fixtures with the correct tag name (they were internally consistent with the same wrong
name before, which is exactly why they passed despite the real bug).
**Re-verified against real, unmodified production data, not just corrected synthetic tests:**
temporarily copied the actual `test-data/hand-record-2.pbn` (24,899 bytes, unmodified) into
`apps/pbn-viewer/public/` so the dev server could serve it, `fetch()`'d it in the browser tool, and
loaded it through the real file input exactly as a user would — confirmed Board 1's double-dummy
row now renders (`2♣ ♦6 ♥6 3♠ 1NT` / `♣4 1♦ ♥6 ♠4 NT6`), hand-checked against the raw hex
(`"79668796686467464674"`, N=S, E=W) to confirm every cell. Temp file removed afterward, nothing
left in the working tree.
**How to apply going forward:** when a comment claims a specific real-world wire format/tag name
convention, verify it against an actual real-data fixture (`test-data/*.pbn` here) before trusting
it and building an accessor on top of it — don't propagate an existing comment's claim unchecked,
even one that's been sitting in the codebase for a while. This applies to any future PBN tag
accessor, not just this one.

## Renamed `DoubleDummyTable` → `DoubleDummyTricks` everywhere (2026-09)
**Ralph's call, right after the tag-name bug above:** since the whole bug was caused by this type's
name (`DoubleDummyTable`) not matching the real PBN wire tag *or* Swift's own type name (both
`DoubleDummyTricks`), rather than leave that mismatch in place now that it's understood, rename the
type itself to eliminate the discrepancy at its root — not just patch the one tag-name string.
Renamed everywhere, methodically, one layer at a time, typechecking/testing after each:
- **`packages/ts-contractbridge/src/doubleDummyTable.ts` → `doubleDummyTricks.ts`** — type and const
  object `DoubleDummyTable` → `DoubleDummyTricks` throughout; comments updated to explain *why*
  (the type-name/wire-tag mismatch that caused the earlier bug), not just restate the rename.
- **`packages/ts-contractbridge/tests/doubleDummyTable.test.ts` → `doubleDummyTricks.test.ts`** —
  same rename throughout, no behavior change (still the same 10 test cases, same fixtures).
- **`src/index.ts`** — export path/name updated.
- **`src/pbn/pbnGame.ts`** — import updated; **the accessor methods themselves renamed too**
  (`getDoubleDummyTable`/`setDoubleDummyTable` → `getDoubleDummyTricks`/`setDoubleDummyTricks`),
  matching this codebase's established convention that an accessor's name mirrors the type it
  returns (`getContract`→`Contract`, `getDeal`→`Deal`, `getAuction`→`PBNAuction`, etc.) — leaving
  the method name as `getDoubleDummyTable` while the type became `DoubleDummyTricks` would have
  reintroduced a smaller version of the exact same name/reality mismatch that caused the original
  bug. `tests/pbn/pbnGame.test.ts` updated to match (method names, local variable name `table` →
  `tricks`; the `describe` block and all 5 `it` names too).
- **`packages/contractbridge-react/src/DoubleDummyTableView.tsx` → `DoubleDummyTricksView.tsx`** —
  component renamed to `DoubleDummyTricksView` (this also now matches the Swift reference's own
  view name, `DoubleDummyTricksView`, a nice side-effect of chasing consistency rather than a goal
  in itself), its prop renamed from `table` to `tricks` to match the type. `StrainSymbol.tsx`'s
  comment (which mentioned the old component name) and `src/index.ts`'s exports updated too.
- **`apps/pbn-viewer/src/App.tsx`** — import, local variable (`selectedDoubleDummy` →
  `selectedDoubleDummyTricks`), and JSX usage (`<DoubleDummyTricksView tricks={...} />`) all updated.
- **Every old file was `rm`'d after its replacement was written** (not `git mv`) — git's own
  content-similarity rename detection should still pick these up as renames rather than
  delete+create pairs once committed, since each new file is a near-verbatim copy with only the
  identifier renamed.
- **Two intentional exceptions left referencing the old name** — both are comments explaining the
  *history* of the bug/rename itself (in `doubleDummyTricks.ts` and `pbnGame.ts`), not dead code;
  correctly not "cleaned up" during the `grep` sweep that confirmed no other stale reference remained.
**Verified after every layer, not just once at the end:** `tsc --noEmit` + `npm test` in
`packages/ts-contractbridge` after the core rename (375 tests, unchanged); typecheck in
`contractbridge-react`; typecheck + `vite build` in `apps/pbn-viewer`; then **re-loaded the real,
unmodified `hand-record-2.pbn` through the actual file input again** (same technique as the bug-fix
verification — temp-copied into `apps/pbn-viewer/public/`, `fetch()`'d, dispatched through the
input) and confirmed the double-dummy display still renders correctly end-to-end after the rename,
with no console errors beyond the usual harmless HMR WebSocket noise. Temp file removed again
afterward.

## Swift reference source corrected: only `swift-contract-bridge` from now on (2026-09)
**Important standing rule, also saved to the cross-session memory system (not just this file) as
`swift-reference-source`:** the Swift reference for this whole port is
`/Users/ralphlipe/Documents/GitHub/swift-contract-bridge` — specifically `Sources/ContractBridge`
and `Sources/ContractBridgeUI` under it. Ralph is deleting the older standalone `ContractBridge`
and `ContractBridgeUI` repo clones (confirmed clean/fully pushed first) — they're stale duplicates,
not alternate valid sources.
**This was learned from a real mistake, not hypothetically:** `DoubleDummyTricksView` was built
this session by reading the *old* standalone `ContractBridgeUI` repo's `DoubleDummuyTricksView.swift`
(note: real typo in the filename — "DoubleDummuy" — present in BOTH the old repo and
`swift-contract-bridge`'s copy, so don't "fix" it if ever touching either). Ralph corrected me to
`swift-contract-bridge/Sources/ContractBridgeUI/DoubleDummuyTricksView.swift` specifically, and the
two files had genuinely diverged:
- **Styling:** the old repo's version colors the "doesn't make 7 tricks" text itself blue
  (`.foregroundColor(.blue)`) — which is what I'd flagged to Ralph as a discrepancy from his
  "blue background" description, and he then confirmed background over foreground. The
  *authoritative* `swift-contract-bridge` version actually already uses a **translucent background
  wash**, `Color.blue.opacity(0.45)` in a plain `HStack(spacing: 0)` with no padding/rounding of its
  own — i.e., Ralph's original "background" description matches the real reference exactly; I'd
  simply been comparing against the wrong (stale) file.
- **Layout/ordering — the real behavioral bug:** the old repo's version (and my first TS port)
  render cells in strict per-strain column order (C, D, H, S, NT), each strain's cell independently
  deciding making/under. `swift-contract-bridge`'s actual `body` makes **two full passes over every
  strain** (each pass in `Strain.allCases`/`Strain.all` order): first every strain where *at least
  one side makes* (`a > 6 || b > 6`, via `atLeastOneMakes` — this covers both the "both make" and
  the "split" sub-cases), **then** every strain where *both sides fail* (`a <= 6 && b <= 6`). The
  two groups are never interleaved. E.g. a real board from `hand-record-2.pbn` where N=S have
  NT7/S9/H6/D6/C8 renders as `"2♣ 3♠ 1NT ♦6 ♥6"` (making-strains C,S,NT together, then failing-
  strains D,H together) — **not** `"2♣ ♦6 ♥6 3♠ 1NT"` (strict per-strain order), which is what the
  first TS version produced and is simply wrong.
- **Layout structure follows from this:** since the two pairs' rows can have a different number of
  "making" vs "failing" cells, `DoubleDummyTricksView.tsx` no longer uses a `<table>` with fixed
  per-strain columns (which assumed the two rows always align cell-for-cell, which the real
  reference never does) — it's now a plain flex row per pair (`display: flex`, matching Swift's
  `HStack`), with `pairCells()` building the two-pass list of cells to render.
- **`--cb-under-tricks-bg` theme token removed** — since the fill is a translucent overlay
  (`rgba(0, 122, 255, 0.45)`, iOS's system blue at the same 0.45 opacity Swift uses) rather than a
  solid color, it naturally blends over whatever's underneath in either theme; no separate
  dark-mode value was needed, unlike the solid `--cb-suit-black`/`--cb-suit-red` tokens which
  genuinely do need distinct light/dark values.
**Re-verified against the real `hand-record-2.pbn` again** (same technique as before — temp-copied
into `apps/pbn-viewer/public/`, loaded through the actual file input) — confirmed Board 1's NS row
now reads `2♣ 3♠ 1NT ♦6 ♥6` and EW reads `1♦ ♣4 ♥6 ♠4 NT6`, hand-verified against the raw hex,
and confirmed the translucent blue wash reads correctly in both light and dark mode via
`resize_window`'s emulation. Full workspace typecheck/tests/build clean throughout.
**How to apply going forward:** before treating ANY Swift file as ground truth, confirm it's being
read from `swift-contract-bridge` specifically — a similarly-named file in a different local clone
is not an acceptable substitute, even if it looks identical at a glance. If the relevant file isn't
found under `swift-contract-bridge`, say so explicitly and ask rather than falling back silently.

## `PlayerNames` — new standalone value type + `PBNGame` accessor (2026-09)
Ralph's request: a `Direction → name` mapping, supporting rotation, that's genuinely independent of
PBN as a concept — `PBNGame.getPlayerNames`/`setPlayerNames` just reads/writes it via the West/
North/East/South simple tags, it doesn't own the type. Checked the Swift reference first (per the
new standing rule above): `swift-contract-bridge`'s `PBN.Game.playerNames` is just a computed
`[Direction: String]` property directly on `PBN.Game` — no standalone Swift type exists for this at
all. Ralph's ask is a deliberate improvement over that shape for the TS port, not a straight port.
- **`src/playerNames.ts`** (new) — `type PlayerNames = { readonly [direction in Direction]?: string }`,
  matching the same "optional per key" shape as `Tricks`/`DoubleDummyTricks` (a direction with no
  known name is genuinely *absent*, not present with an empty string or `undefined` value).
  `make()`, `withName(names, direction, name)` (same shape as `DoubleDummyTricks.withTricks`),
  `rotated(names, seats)` (shifts each name to `Direction.rotated(direction, seats)`; a missing
  direction stays missing after rotating, not reintroduced as an explicit `undefined` key).
  **No `toPBN`/`fromPBN`** — deliberately not `PBNCodable`, since there's no single-string PBN
  encoding for "all four names" the way `DoubleDummyTricks` has one hex string; the mapping to/from
  four independent simple tags is `PBNGame`'s job, not this type's.
- **`PBNGame.getPlayerNames(): PlayerNames`** — reads whichever of the four tags
  (`Direction.name(direction)` → "North"/"East"/"South"/"West", reused directly rather than a new
  mapping table) are present; **never returns `undefined`**, unlike most other `PBNGame` accessors —
  a deliberate difference, since `PlayerNames` already represents "nothing known" as `{}` (every
  direction absent), so wrapping that in an extra `| undefined` would just be redundant.
- **`PBNGame.setPlayerNames(names: PlayerNames): void`** — wholesale replace, matching
  `setDealOutcome`'s "no stale leftover data" discipline: a direction missing from the new `names`
  has its tag *deleted*, not left behind from a previous call.
- **Tests:** new `tests/playerNames.test.ts` (7 cases: empty, `withName` set + leaves-others-alone,
  and `rotated`'s 4 cases including the "stays genuinely absent" one) plus 5 new cases in
  `tests/pbn/pbnGame.test.ts` (empty game, reads-whichever-present, round-trip, delete-on-replace,
  clear-all-via-empty-value). 387 tests total, full workspace typecheck/build clean. No UI component
  requested this time — `contractbridge-react`/`pbn-viewer` untouched.

## `DealDiagram` gained an optional `playerNames` prop (2026-09)
Follow-up to `PlayerNames` above: `DealDiagram` can now show a player's name above their hand.
- **`DealDiagramProps.playerNames?: PlayerNames`** — optional; if omitted, or if a direction has no
  name, that hand shows no label at all, exactly matching the component's behavior before this prop
  existed (the direction-name labels were removed by Ralph himself a few steps back — this doesn't
  bring those back, it's a different, opt-in label).
  **`exactOptionalPropertyTypes` gotcha, hit wiring this into `apps/pbn-viewer`:** passing
  `playerNames={someDirectionMap | undefined}` directly failed to typecheck (`Type 'undefined' is
  not assignable to type 'PlayerNames'` under this repo's strict `exactOptionalPropertyTypes: true`,
  which distinguishes "prop omitted" from "prop explicitly set to undefined"). Fixed with this
  codebase's established conditional-spread idiom (already used in `pbnAuction.ts`'s
  `makingCall`): `{...(value !== undefined && { playerNames: value })}` — conditionally spreads the
  prop in only when it's actually present, never passes an explicit `undefined`.
- **Empty-string names count as "no name," not "an empty name" — a deliberate display-layer
  decision, not something `PBNGame.getPlayerNames()` itself does.** Real PBN files routinely have
  e.g. `[West ""]` (empty but present) rather than omitting the tag — confirmed by grepping
  `test-data/*.pbn`, where every existing West/North/East/South tag is empty-valued. `getPlayerNames`
  stays a faithful, unopinionated raw-tag reader (an empty-string tag still becomes an
  entry in the returned `PlayerNames`, matching how `getTagValue` never filters values); it's
  `DealDiagram` specifically that treats `name !== undefined && name !== ''` as "show a label" —
  the right layer for this call, since a different consumer of `PlayerNames` might legitimately
  want to see the raw empty string.
- **Verified via the browser tool, three cases, in both themes:** a fixture with West="Wanda",
  North="" (empty), East="Eddie", South="Sam" correctly shows labels for W/E/S and none for N; a
  fixture with no West/North/East/South tags at all shows no labels anywhere (matching pre-existing
  behavior exactly, confirmed via screenshot + an empty console-error check); both re-confirmed in
  light mode after starting in dark. 387 tests still pass, full workspace typecheck/build clean.

## PBN free-text formatting: `parsePBNFormattedText` + `PBNFormattedText` (2026-09)
Ralph's ask: PBN comments/notes use their own inline markup convention (checked the Swift
reference, `swift-contract-bridge/Sources/ContractBridgeUI/StringPBNFormatting.swift`'s
`String.pbnFormattedAttributedString()`) — `<b>`/`<i>`/`<u>` for bold/italic/underline, `\S \H \D
\C` for colored suit glyphs, `\n` for an explicit line break — and he wants both comments and notes
rendered through the same rules. Two explicit corrections to the Swift reference's own behavior,
both confirmed before building:
1. **Nested/overlapping tags must resolve correctly** — Swift's version does simple non-nested
   "find first open, find first close, replace" per tag type, which mishandles something like
   `<b>foo<i>bar</b>baz</i>`. The TS port uses a real stack of active tags instead (see below), so
   nesting and even overlapping/malformed tag sequences resolve every run's flags correctly.
2. **Ordinary line-wraps in the raw PBN source must NOT become visual line breaks** — comments are
   flowing paragraphs meant to fit whatever container displays them, not fixed-width text. Only two
   things force a real break: a genuine **blank line** in the source, or the author's own literal
   `\n` escape — and either one becomes **exactly one** forced break (never two, however many blank
   lines in a row).
- **`packages/ts-contractbridge/src/pbn/pbnFormattedText.ts`** (new) —
  `type PBNTextRun = { kind:'text', text, bold, italic, underline } | { kind:'suit', suit, bold,
  italic, underline }` (a flat list, not a tree — matches how this markup is actually used) and
  `parsePBNFormattedText(rawText: string): readonly PBNTextRun[]`.
  - **`normalizeNewlines`** — splits on real `\n` (exactly what `ParsedSection.comments`/
    `joinCommentBlock` already produce: lines joined with real newlines, a blank line surviving as
    an empty array entry). Consecutive non-blank lines join with a plain space (collapsing a
    source-only line-wrap); one or more consecutive blank lines become exactly one `\n`. Then the
    author's own literal `\n` (two ordinary characters, backslash + the letter n — not a real
    newline) is replaced with a real `\n` too, `"\n "` (trailing space) matched first so an explicit
    break doesn't leave a stray leading space on the next line — same precedence Swift uses.
  - **Tag/suit tokenization is a single left-to-right scan** with a real `stack: FormatTag[]`
    (pushed on `<b>`/`<i>`/`<u>`, popped on the matching close — an unmatched close is just
    ignored, not thrown) — at any point, `\S \H \D \C` becomes a `'suit'` run carrying whatever
    bold/italic/underline state is currently on the stack (so a suit mentioned inside bold text
    stays bold — matches Swift's own attribute-preservation, done via a genuinely different
    mechanism). Suit-escape matching is uppercase-only (`\S` not `\s`), matching Swift exactly.
  - **`mergeAdjacentText`** (new, not in the Swift reference) — a tag boundary always flushes the
    current text run, even a no-op one (an unmatched close, or a tag that doesn't actually change
    any active flag), which can otherwise split what should be one run into two identically-styled
    adjacent ones. A final merge pass folds those back together, so output is always exactly one
    run per genuine formatting change — added after a test written for "an unmatched closing tag is
    ignored" initially expected two runs and the fix (merge, not adjust the test) was clearly the
    better fix.
  - Exported from `index.ts` (`parsePBNFormattedText`, `PBNTextRun`).
  - **Tests:** `tests/pbn/pbnFormattedText.test.ts`, 17 cases — plain text, trimming, all three
    newline rules (line-wrap collapse, single blank-line break, multiple-blank-lines-still-one-
    break) plus the two-step explicit-`\n` precedence, using the *exact* text from the real
    `Responder Rebid.pbn`-shaped comment used elsewhere in this project as one case; bold/italic/
    underline individually; properly-nested tags; **the specific overlapping-tag case
    (`<b>foo<i>bar</b>baz</i>`) that would break Swift's own algorithm**, confirming the TS port
    handles it correctly; unmatched closing tag; suit escapes standalone and inside bold text; one
    combined "everything together" integration case. 404 tests total in `ts-contractbridge`.
- **`packages/contractbridge-react/src/PBNFormattedText.tsx`** (new) — `{ text: string }` in,
  renders each run as a `<span>` (bold/italic/underline via inline styles) or a `<SuitSymbol>` for
  suit runs (so suit color theming is free/shared, not reimplemented). A single `white-space:
  pre-line` on the outer wrapping `<span>` is what turns the parser's forced `\n`s back into actual
  visual line breaks — inherited down to every run's own inner `<span>`, so those don't set it
  individually. This is the piece that makes "parse once, render as flowing text that still
  respects explicit breaks" work with zero manual `<br/>`-splitting logic.
- **`AuctionTable.tsx`'s note list now renders through this** — `<li>{n.note}</li>` became
  `<li><PBNFormattedText text={n.note} /></li>`, per Ralph's explicit "make auction notes use the
  new escaped text."
- **Verified via the browser tool, in both themes:** a note combining suit escapes inside/outside
  tags, `<b>`/`<i>`, and an explicit `\n` — confirmed correct colored glyphs, bold, italic, and the
  forced break, with the surrounding prose flowing as intended; a second note with two explicit
  `\n`s confirmed multiple forced breaks in one string still work. The blank-line-vs-line-wrap
  newline rule has no live UI call site yet (comment display is explicitly deferred — see below),
  so it's covered by the Vitest suite only; the CSS `pre-line` rendering mechanism itself is
  already proven correct by the explicit-`\n` browser checks, since by rendering time both sources
  produce the identical character.
**Explicitly deferred, per Ralph:** displaying comments anywhere in `pbn-viewer` — "We will add more
display of comments once this work is done (specifically comments for the Result tag)." Not
started; `ParsedSection.comments` already exists and is exactly what a future comments UI would
feed into `PBNFormattedText`, one string at a time.

## Result tag comment display, the promised follow-up (2026-09)
Exactly the "specifically comments for the Result tag" work flagged as deferred above.
- **`packages/contractbridge-react/src/DealResultView.tsx`** (new) — presentational, matching the
  established component boundary: `{ comments: readonly string[], playedResult?: { tricksTaken,
  score } }`. Renders `null` (nothing at all) when `comments` is empty — "if the Result tag has a
  comment" is the outer gate, owned by the component itself so call sites don't need their own
  `{x.length > 0 && ...}` wrapper. When `playedResult` is present, a `"{tricksTaken} tricks,
  {+/-}{score}"` line renders above the comments (each comment its own `<p>` via
  `PBNFormattedText`, so the newline/formatting rules from the previous entry apply here too);
  when absent, only the comments render.
- **`apps/pbn-viewer/src/App.tsx` owns the orchestration/decision logic**, per this project's
  established split (components take ready-made data; apps compute it):
  `resultComments = selectedGame?.getParsedSection('Result')?.comments ?? []` (reusing
  `getParsedSection`, unchanged since it was built); `playedResult` is computed only when
  `getDealOutcome()?.kind === 'played'` **and** `getVulnerable()` is known (the score genuinely
  can't be computed without knowing vulnerability) — any other case (`passedOut`, no `DealOutcome`
  at all, vulnerability unknown) leaves `playedResult` `undefined`, falling back to "just the
  comments," matching Ralph's exact two-case description. Score is the **declarer's own
  perspective** (a single signed number, e.g. `+420`/`-100`) via the existing
  `Contract.declarerScore(contract, Vulnerable.isVulDirection(vulnerable, declarer), tricksTaken)`
  — no new score-computation logic, just composing what already existed. Hit the same
  `exactOptionalPropertyTypes` conditional-spread need as `DealDiagram`'s `playerNames` prop
  (`{...(playedResult !== undefined && { playedResult })}`), same established fix.
- **Verified via the browser tool, three cases in one fixture, in both themes:** Board 1 (Contract
  4H/Declarer N/Result 10/Vulnerable None, plus a `{...}` comment block with a blank line inside)
  shows `10 tricks, +420` then the comment with the blank line correctly collapsed to a single line
  break (not a blank paragraph gap) — confirms the previous entry's newline rule and this new
  scoring logic compose correctly together; Board 2 (no Contract/Declarer tags, so no
  `DealOutcome`, but a Result comment) shows only the comment, no tricks/score line; Board 3 (no
  Result comment at all) shows nothing. 404 tests still pass (no new core tests needed — this is
  pure composition of already-tested pieces), full workspace typecheck/build clean.

## Three small `pbn-viewer` UI tweaks (2026-09)
- **Dealer/Vulnerable line above the deal** — `apps/pbn-viewer/src/App.tsx` now shows
  `Dealer: {name}   Vulnerable: {value}` above `DealDiagram`, built from `getDealer()`/
  `getVulnerable()` (each independently optional — a missing one just drops from the joined
  string; the whole line disappears if both are missing). No new component — this is app-specific
  page copy, not something `contractbridge-react` needs to own.
- **`DealDiagram` left-justified, not centered** — `packages/contractbridge-react/src/
  DealDiagram.tsx`'s outer grid had `justifyContent: 'center'`; since that div is a full-width
  block sitting in whatever container it's placed in, centering the grid's own (narrower,
  content-sized) columns within it made the whole diagram float in the middle of the page instead
  of sitting at the page's left edge. Changed to `justifyContent: 'start'`. This is the component's
  own default now (not a new prop) — no consumer asked for center-alignment as an option.
- **Dealer dropped from the `Game:` selector** — `gameLabel()` now returns just `Board ${n}`; the
  `— Dealer ${name}` suffix (added when the selector was first built) is gone. The dealer is still
  fully visible via the new line above the deal, just not duplicated in the dropdown too.
**Verified via the browser tool in both themes:** selector shows "Board 1" only; "Dealer: North
Vulnerable: NS" line renders correctly above a left-justified (not centered) deal diagram. 404
tests unaffected (no core changes), full workspace typecheck/build clean.

## Game selector: "Game:" label removed, letters for missing board numbers, dedup for duplicates (2026-09)
Ralph's framing: "Game" makes no sense to a bridge player outside the PBN file format itself —
he thinks of these as **Boards** always, lesson files included ("For lesson deals the games become
'lessons'" was raised but deliberately NOT built — see below). Also flagged two real correctness
concerns with the old `board ?? index + 1` fallback: a missing board number silently became a
plain digit indistinguishable from a real one, and a genuine duplicate board number (two games both
"Board 3") would've produced two identical-looking dropdown entries.
- **The `<label>Game: …</label>` wrapper is gone entirely** — the `<select>` now stands alone; its
  options already say "Board N", so a preceding label added nothing once "Game" itself was wrong.
- **One word everywhere, no file-genre detection.** Discussed but deliberately rejected: labeling
  lesson-style files "Lesson N" instead of "Board N" (e.g. via sniffing `[Event]` for the word
  "Lesson", or "no game in this file has a Board tag"). Any such heuristic will eventually misfire
  on some real file; "Board" is already how bridge players refer to a single dealt hand regardless
  of tournament-vs-lesson context, so one consistent word beats a fragile guess.
- **`apps/pbn-viewer/src/App.tsx`'s label computation moved from a per-game pure function to a
  whole-document one, `gameLabels(games): readonly string[]`** — necessary because both new rules
  need to see every game at once, not one in isolation:
  - **Missing board number → a letter, not a number** (`letterLabel(n)`: spreadsheet-column style,
    A-Z then AA/AB/...) — assigned sequentially only across games that actually lack a Board tag,
    so the *n*-th such game gets the *n*-th letter regardless of its position among games that do
    have real numbers. A letter can never be mistaken for a real board number, which was exactly
    the ambiguity Ralph flagged in the old silent-index-fallback behavior.
  - **A real board number that repeats gets " (2)", " (3)", etc.** on the second-and-later
    occurrence (tracked via a `Map<number, count>` walked in document order) — the first occurrence
    of any number stays bare ("Board 3").
  - **Selection was never at risk either way** — the `<select>`'s `value`/`onChange` are the array
    index, not the label text; duplicate or synthetic labels are purely a display concern, and this
    was true before this change too.
**Verified via the browser tool, in both themes:** a 4-game fixture (`Board 5`, `Board 5` again, no
Board tag at all, `Board 12`) produced exactly `["Board 5", "Board 5 (2)", "Board A", "Board 12"]`;
selecting "Board A" correctly loaded that specific game (confirmed via its distinct Dealer value),
proving the index-based selection under a letter label works exactly like a numeric one. 404 tests
unaffected (no core changes), full workspace typecheck/build clean.
