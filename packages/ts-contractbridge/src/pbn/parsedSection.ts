import { parseTagLine } from './tagLine.js'
import type { TagPair } from './tagLine.js'

// The result of classifying a section's raw lines into their structural parts. Any code that
// parses its own complex-tag section (Auction today; Play or others later) needs the same three
// things split out from the same two comment forms ("{...}" blocks and ";" line comments) and the
// same [Note "N:text"] absorption — this is that classification, factored out once so it can't
// drift out of sync between callers the way it briefly did between PBNDocument.fromPBN and
// PBNAuction.fromPBNSection.
export type ParsedSection = {
  // undefined for a "global" section with no tag line of its own (see PBNSection.tagPair).
  readonly tagPair: TagPair | undefined
  // Everything after the tag line that isn't a comment or a [Note] line, in original order and
  // exactly as written (no trimming) — e.g. an Auction section's call tokens.
  readonly bodyLines: readonly string[]
  // Keyed by the literal "=N=" marker text used in body content (e.g. "=1="), so a caller can look
  // a reference up directly. Values are trimmed.
  readonly notes: ReadonlyMap<string, string>
  // One entry per "{...}" block or ";" line comment, in original order, with the delimiter
  // characters removed. A multi-line "{...}" block becomes one entry whose lines are joined with
  // "\n" — an internal blank line (a paragraph break within the comment) is kept, but a line that
  // was purely the opening "{" or closing "}" contributes no leading/trailing blank line.
  readonly comments: readonly string[]
}

// Strips a multi-line "{...}" block's leading "{" and trailing "}" and joins what's left with
// "\n". blockLines runs from the line that opened the block through the line that closed it
// (inclusive) — or through the last line of input, if the block was never closed.
function joinCommentBlock(blockLines: readonly string[]): string {
  const result = blockLines.map((line, i) => {
    let stripped = line
    if (i === 0) stripped = stripped.replace(/^\s*\{\s*/, '')
    if (i === blockLines.length - 1) stripped = stripped.replace(/\s*\}\s*$/, '')
    return stripped
  })
  while (result.length > 0 && result[0]!.trim() === '') result.shift()
  while (result.length > 0 && result[result.length - 1]!.trim() === '') result.pop()
  return result.join('\n')
}

// Classifies a section's raw lines (as stored in PBNSection.lines) into tagPair/bodyLines/notes/
// comments. Never fails and never discards a line: a malformed [Note] line (no colon) falls
// through to bodyLines rather than being dropped, matching this module's usual "keep every line
// somewhere" discipline.
export function parseSectionLines(lines: readonly string[]): ParsedSection {
  const first = lines[0]
  const tagPair = first === undefined ? undefined : parseTagLine(first)
  const contentLines = tagPair === undefined ? lines : lines.slice(1)

  const bodyLines: string[] = []
  const notes = new Map<string, string>()
  const comments: string[] = []
  let commentBlock: string[] | null = null

  for (const line of contentLines) {
    const trimmed = line.trim()

    if (commentBlock !== null) {
      commentBlock.push(line)
      if (trimmed.endsWith('}')) {
        comments.push(joinCommentBlock(commentBlock))
        commentBlock = null
      }
      continue
    }

    if (trimmed.startsWith('{')) {
      if (trimmed.endsWith('}')) {
        comments.push(trimmed.slice(1, -1).trim())
      } else {
        commentBlock = [line]
      }
      continue
    }

    if (trimmed.startsWith(';')) {
      comments.push(trimmed.slice(1).trim())
      continue
    }

    const lineTag = parseTagLine(line)
    if (lineTag !== undefined && lineTag.name.toLowerCase() === 'note') {
      const colonIndex = lineTag.value.indexOf(':')
      if (colonIndex !== -1) {
        const id = lineTag.value.slice(0, colonIndex).trim()
        notes.set(`=${id}=`, lineTag.value.slice(colonIndex + 1).trim())
        continue
      }
      // Malformed Note (no colon) — fall through, keep as ordinary body content.
    }

    bodyLines.push(line)
  }

  // An unclosed block at end of input still becomes a comment (matches PBNDocument.fromPBN, which
  // absorbs the rest of the text rather than throwing).
  if (commentBlock !== null) {
    comments.push(joinCommentBlock(commentBlock))
  }

  return { tagPair, bodyLines, notes, comments }
}
