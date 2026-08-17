---
name: feedback-naming
description: Naming can diverge from the Swift source when the TS port surfaces a better name
metadata:
  type: feedback
---

TS type/file names don't have to match the Swift source 1:1. Ralph is willing to rename on the
TS side only, leaving Swift as-is, when the port work reveals the original name was imprecise
(e.g. DoubleDummyTricks → DoubleDummyTable — see [[project-porting-status]]).

**Why:** Porting one type at a time surfaces naming issues Ralph didn't notice when he first wrote
the Swift version. He'd rather fix it in TS now than carry the imprecision forward, and doesn't
mind the two codebases disagreeing on this one name.

**How to apply:** If a Swift name seems off during a port (implies behavior it doesn't have, unclear
shape, etc.), it's fine to suggest a better TS name — don't assume 1:1 naming is a hard rule. Still
ask before assuming the rename should also apply back to Swift; default is TS-only unless told
otherwise.
