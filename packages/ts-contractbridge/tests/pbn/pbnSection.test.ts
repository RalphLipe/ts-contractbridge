import { describe, it, expect } from 'vitest'
import { PBNSection } from '../../src/pbn/pbnSection.js'

describe('PBNSection', () => {
  it('defaults to an empty section', () => {
    const section = new PBNSection()
    expect(section.lines).toEqual([])
  })

  it('can be constructed with initial lines', () => {
    const section = new PBNSection(['[Declarer "N"]'])
    expect(section.lines).toEqual(['[Declarer "N"]'])
  })

  it('lines are read-only (compile-time check)', () => {
    const section = new PBNSection(['[Auction "N"]'])
    // @ts-expect-error - lines is readonly; the only way to change a section's content is
    // PBNGame.setSection, which replaces it wholesale.
    section.lines.push('P P P P')
  })

  // Exhaustive tag-line parsing edge cases live in tagLine.test.ts. These just confirm PBNSection
  // wires tagPair up to the first line correctly.
  describe('tagPair', () => {
    it('parses a simple tag pair from the first line', () => {
      const section = new PBNSection(['[Declarer "N"]'])
      expect(section.tagPair).toEqual({ name: 'Declarer', value: 'N' })
    })

    it('only looks at the first line, ignoring any body lines that follow', () => {
      const section = new PBNSection(['[Auction "N"]', 'P P P P'])
      expect(section.tagPair).toEqual({ name: 'Auction', value: 'N' })
    })

    it('is undefined for the global/no-tag section (comments before the first tag)', () => {
      const section = new PBNSection(['; a comment about the whole game'])
      expect(section.tagPair).toBeUndefined()
    })

    it('is undefined for an empty section', () => {
      const section = new PBNSection()
      expect(section.tagPair).toBeUndefined()
    })
  })
})
