import { PBNGame } from './pbnGame.js'

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
}
