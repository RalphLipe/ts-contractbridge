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

  it('lines are mutable', () => {
    const section = new PBNSection(['[Auction "N"]'])
    section.lines.push('P P P P')
    expect(section.lines).toEqual(['[Auction "N"]', 'P P P P'])
  })

  // Exhaustive tag-line parsing edge cases live in parseTagLine.test.ts. These just confirm
  // PBNSection wires tagName/tagValue up to the first line correctly.
  describe('tagName / tagValue', () => {
    it('parses a simple tag pair from the first line', () => {
      const section = new PBNSection(['[Declarer "N"]'])
      expect(section.tagName).toBe('Declarer')
      expect(section.tagValue).toBe('N')
    })

    it('only looks at the first line, ignoring any body lines that follow', () => {
      const section = new PBNSection(['[Auction "N"]', 'P P P P'])
      expect(section.tagName).toBe('Auction')
      expect(section.tagValue).toBe('N')
    })

    it('is undefined for the global/no-tag section (comments before the first tag)', () => {
      const section = new PBNSection(['; a comment about the whole game'])
      expect(section.tagName).toBeUndefined()
      expect(section.tagValue).toBeUndefined()
    })

    it('is undefined for an empty section', () => {
      const section = new PBNSection()
      expect(section.tagName).toBeUndefined()
      expect(section.tagValue).toBeUndefined()
    })
  })
})
