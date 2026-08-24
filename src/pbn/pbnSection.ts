import { parseTagLine } from './tagLine.js'
import type { TagPair } from './tagLine.js'

// A PBN "section" (per the PBN spec) starts with a tag pair line — e.g. [Declarer "N"] — and may
// be followed by body lines (auction/play tokens), comments, notes (which are their own tag lines
// but considered part of the section), and even stray "%"-escaped lines. A section with no tag
// line at all holds comments that appear before a game's first tag; those apply to the whole game
// and are associated with a "null" tag rather than any specific one.
//
// Stored here purely as raw lines — the tag pair on the first line (if present) isn't parsed out
// yet; that happens later, one step at a time.
//
// A section's lines are read-only: the only way to change a section's content is to replace it
// wholesale via PBNGame.setSection.
export class PBNSection {
  readonly lines: readonly string[]

  constructor(lines: string[] = []) {
    this.lines = lines
  }

  // Returns undefined if there are no lines, or the first line isn't a valid tag pair — e.g. the
  // "global" section holding only comments before a game's first tag, which has no tag of its own.
  get tagPair(): TagPair | undefined {
    const line = this.lines[0]
    return line === undefined ? undefined : parseTagLine(line)
  }
}
