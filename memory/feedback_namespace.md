---
name: feedback-namespace
description: Don't use TS `namespace` for grouping — use a plain const object instead
metadata:
  type: feedback
---

Never use TypeScript's `namespace` keyword in ts-contractbridge, even though it mirrors Swift's
`enum` + static members shape closely. Ralph wants clean, modern TS with no legacy constructs.

Use a plain `const` object instead: `export type X = ...` stays as-is, but the companion
functions/constants become a `export const X = { memberA, memberB, ... }` object literal built from
top-level `const`s in the same file (not nested in a `namespace X { ... }` block). This preserves
the exact same call-site ergonomics (`Direction.rotated(d, seats)`) with zero impact on any caller
— see [[project-porting-status]] "Coding pattern used" for the exact mechanics (shorthand property
names, when to rename a local const to avoid same-file collisions, etc).

**Why:** `namespace` predates ES modules and is considered legacy by the TS team. Ralph pushed back
when he noticed raw-literal comparisons and asked where the pattern came from; discussing it
surfaced that Claude had suggested `namespace` early in the port (on another computer, no
transcript) purely to mirror Swift's shape for easy 1:1 verification, not because it was idiomatic
TS. Ralph decided the grouped-call-site ergonomics were worth keeping (they match how JS's own
stdlib groups things — `Math.max`, `Object.keys`, `Array.isArray` — all plain objects, no
`namespace`, no class), but the legacy keyword itself had to go. All 17 already-ported files were
rewritten in one pass (2026-08) rather than left as technical debt.

**How to apply:** Every future port (ScoreValidator onward) should use the const-object pattern
from the start — never reach for `namespace` again in this codebase, even as a quick first draft.
