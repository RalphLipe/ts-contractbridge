import { PBNSection } from './pbnSection.js'

// A game's sections are read-only from the outside — the only way to add or replace one is
// setSection, which keeps "one section per tag name" as an invariant rather than something
// callers have to maintain by hand.
export class PBNGame {
  private readonly _sections: PBNSection[]

  constructor(sections: PBNSection[] = []) {
    this._sections = sections
  }

  get sections(): readonly PBNSection[] {
    return this._sections
  }

  // Always re-derived from sections — no cached state to go stale. Tag names are matched
  // case-insensitively (PBN tag names are conventionally capitalized, e.g. "Declarer", but
  // nothing enforces that on read).
  getTagValue(tagName: string): string | undefined {
    const lowerTagName = tagName.toLowerCase()
    for (const section of this._sections) {
      const tagPair = section.tagPair
      if (tagPair !== undefined && tagPair.name.toLowerCase() === lowerTagName) {
        return tagPair.value
      }
    }
    return undefined
  }

  // Completely replaces the section whose tag name matches the new lines' tag name
  // (case-insensitive) — or the "global"/untagged section, if the new lines have no tag pair
  // either — with a fresh PBNSection built from `lines`. Adds a new section if none matches.
  setSection(lines: string[]): void {
    const newSection = new PBNSection(lines)
    const newTagName = newSection.tagPair?.name.toLowerCase()
    const index = this._sections.findIndex(section => section.tagPair?.name.toLowerCase() === newTagName)
    if (index === -1) {
      this._sections.push(newSection)
    } else {
      this._sections[index] = newSection
    }
  }

  // Removes the section with a matching tag name (case-insensitive), if one exists. A no-op
  // otherwise. Only targets named sections — there's no tagName to pass for the "global"/untagged
  // section, so it can't be deleted through this method.
  deleteSection(tagName: string): void {
    const lowerTagName = tagName.toLowerCase()
    const index = this._sections.findIndex(section => section.tagPair?.name.toLowerCase() === lowerTagName)
    if (index !== -1) {
      this._sections.splice(index, 1)
    }
  }
}
