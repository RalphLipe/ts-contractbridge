import { PBNSection } from './pbnSection.js'

export class PBNGame {
  sections: PBNSection[]

  constructor(sections: PBNSection[] = []) {
    this.sections = sections
  }

  // Always re-derived from `sections` — no cached state to go stale. Tag names are matched
  // case-insensitively (PBN tag names are conventionally capitalized, e.g. "Declarer", but
  // nothing enforces that on read).
  getTagValue(tagName: string): string | undefined {
    const lowerTagName = tagName.toLowerCase()
    for (const section of this.sections) {
      const tagPair = section.tagPair
      if (tagPair !== undefined && tagPair.name.toLowerCase() === lowerTagName) {
        return tagPair.value
      }
    }
    return undefined
  }
}
