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
