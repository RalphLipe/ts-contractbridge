import { PBNGame } from './pbnGame.js'
import { PBNSection } from './pbnSection.js'
import { parseTagLine } from './tagLine.js'
import { splitLines } from './splitLines.js'

// A PBN document is mutable — it represents a file the user loads, edits, and saves, not an
// atomic derived value. See memory/project_porting_status.md's mutability notes.
export class PBNDocument {
  games: PBNGame[]

  // Lines starting with "%" — typically found in the file header, before any game. Not part of
  // any single PBNGame; the PBN spec doesn't strictly require them to stay in the header, but we
  // treat header-level escaped lines as a special case here rather than tying them to a game.
  escapedText: string[]

  constructor(games: PBNGame[] = [], escapedText: string[] = []) {
    this.games = games
    this.escapedText = escapedText
  }

  // Parses raw PBN text into games/sections. Never fails and never discards a line — every line
  // of input ends up somewhere (escapedText, or some game's some section's lines), verbatim, with
  // no trimming/normalization of its content. Only structural decisions (is this line blank? does
  // it start a new section?) look at trimmed content; storage always keeps the original line.
  //
  // Rules (agreed with Ralph, simpler than Swift's Parse.swift since PBNSection defers all
  // per-tag interpretation to later, on demand):
  // - One or more blank lines end the current game (matches Swift) — UNLESS inside an open
  //   "{...}" multi-line comment block (see below), in which case a blank line is just more
  //   comment content, not a game boundary.
  // - A line matching [TagName "Value"] starts a new section — except a Note tag, which is
  //   absorbed into the current section instead (Notes are "their own tag lines, but considered
  //   part of the section they follow").
  // - A line whose trimmed content starts with "{" opens a multi-line comment block, UNLESS that
  //   same line's trimmed content also ends with "}" (a single-line "{ ... }" comment, which
  //   never enters the multi-line state at all). While a block is open, every line — blank, "%",
  //   tag-shaped, anything — is treated purely as comment content and joins the current section,
  //   until a line whose trimmed content ends with "}" closes the block (matches Swift).
  // - "%" lines keep their "%" and all original whitespace. They only go to the document-level
  //   escapedText when no section is open at all (nothing accumulated yet for the current game);
  //   once any section is open (global or tagged), a "%" line just joins it like any other line.
  // - Everything else (comments, unrecognized/malformed bracketed lines, body content) joins
  //   whichever section is currently open, starting a game's "global" section if none is open yet.
  static fromPBN(text: string): PBNDocument {
    const escapedText: string[] = []
    const games: PBNGame[] = []
    let currentGameSections: PBNSection[] | null = null
    let currentSectionLines: string[] | null = null
    let inCommentBlock = false

    const flushSection = (): void => {
      if (currentSectionLines !== null && currentGameSections !== null) {
        currentGameSections.push(new PBNSection(currentSectionLines))
      }
      currentSectionLines = null
    }

    const flushGame = (): void => {
      flushSection()
      if (currentGameSections !== null) {
        games.push(new PBNGame(currentGameSections))
      }
      currentGameSections = null
    }

    // Returns the lines array for whatever section is currently open, opening a new game and/or
    // a new "global" section first if neither is open yet.
    const openSectionLines = (): string[] => {
      if (currentGameSections === null) currentGameSections = []
      if (currentSectionLines === null) currentSectionLines = []
      return currentSectionLines
    }

    for (const line of splitLines(text)) {
      const trimmed = line.trim()

      if (inCommentBlock) {
        openSectionLines().push(line)
        if (trimmed.endsWith('}')) inCommentBlock = false
        continue
      }

      if (trimmed === '') {
        flushGame()
        continue
      }

      if (trimmed.startsWith('%')) {
        if (currentGameSections === null && currentSectionLines === null) {
          escapedText.push(line)
        } else {
          openSectionLines().push(line)
        }
        continue
      }

      if (trimmed.startsWith('{')) {
        openSectionLines().push(line)
        if (!trimmed.endsWith('}')) inCommentBlock = true
        continue
      }

      const tag = parseTagLine(line)
      if (tag !== undefined && tag.name.toLowerCase() !== 'note') {
        // A real (non-Note) tag starts a new section.
        flushSection()
        openSectionLines().push(line)
        continue
      }

      // A Note tag line, or ordinary body/comment/unrecognized content — both join whatever
      // section is currently open.
      openSectionLines().push(line)
    }

    flushGame()

    return new PBNDocument(games, escapedText)
  }
}
