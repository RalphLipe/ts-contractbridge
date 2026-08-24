import { describe, it, expect } from 'vitest'
import { PBNGame } from '../../src/pbn/pbnGame.js'
import { PBNSection } from '../../src/pbn/pbnSection.js'

describe('PBNGame', () => {
  it('defaults to no sections', () => {
    const game = new PBNGame()
    expect(game.sections).toEqual([])
  })

  it('can be constructed with initial sections', () => {
    const section = new PBNSection(['[Declarer "N"]'])
    const game = new PBNGame([section])
    expect(game.sections).toEqual([section])
  })

  it('sections are read-only (compile-time check)', () => {
    const game = new PBNGame()
    // @ts-expect-error - sections is a read-only view; setSection is the only way to add/replace one
    game.sections.push(new PBNSection(['[Board "1"]']))
  })

  describe('getTagValue', () => {
    it('finds the value of a matching tag', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('matches tag names case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      expect(game.getTagValue('declarer')).toBe('N')
      expect(game.getTagValue('DECLARER')).toBe('N')
      expect(game.getTagValue('DeClArEr')).toBe('N')
    })

    it('ignores sections with no tag pair (comments, malformed lines)', () => {
      const game = new PBNGame([
        new PBNSection(['; a comment about the whole game']),
        new PBNSection(['[Declarer "N"]']),
      ])
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('is undefined when no section has that tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      expect(game.getTagValue('Declarer')).toBeUndefined()
    })

    it('is undefined for an empty game', () => {
      const game = new PBNGame()
      expect(game.getTagValue('Declarer')).toBeUndefined()
    })

    it('reflects setSection changes immediately (no stale caching)', () => {
      const game = new PBNGame()
      expect(game.getTagValue('Declarer')).toBeUndefined()
      game.setSection(['[Declarer "N"]'])
      expect(game.getTagValue('Declarer')).toBe('N')
    })
  })

  describe('setSection', () => {
    it('adds a new section when no existing section has a matching tag', () => {
      const game = new PBNGame()
      game.setSection(['[Declarer "N"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('replaces an existing section with the same tag name', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.setSection(['[Declarer "S"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('matches the existing section case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[declarer "N"]'])])
      game.setSection(['[DECLARER "S"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('leaves other sections untouched', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      game.setSection(['[Declarer "S"]'])
      expect(game.sections).toHaveLength(2)
      expect(game.getTagValue('Board')).toBe('1')
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('replaces the whole section, including any body lines', () => {
      const game = new PBNGame([new PBNSection(['[Auction "N"]', 'P P P P'])])
      game.setSection(['[Auction "N"]', '1NT P P P'])
      expect(game.sections).toHaveLength(1)
      expect(game.sections[0]!.lines).toEqual(['[Auction "N"]', '1NT P P P'])
    })

    it('replaces the "global" untagged section when the new lines also have no tag', () => {
      const game = new PBNGame([new PBNSection(['; an old comment'])])
      game.setSection(['; a new comment'])
      expect(game.sections).toHaveLength(1)
      expect(game.sections[0]!.lines).toEqual(['; a new comment'])
    })

    it('adds a global untagged section alongside tagged ones rather than merging with them', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      game.setSection(['; a comment'])
      expect(game.sections).toHaveLength(2)
    })
  })

  describe('deleteSection', () => {
    it('removes the section with a matching tag name', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBeUndefined()
      expect(game.getTagValue('Board')).toBe('1')
    })

    it('matches case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.deleteSection('declarer')
      expect(game.sections).toHaveLength(0)
    })

    it('is a no-op when no section has that tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Board')).toBe('1')
    })

    it('is a no-op on an empty game', () => {
      const game = new PBNGame()
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(0)
    })
  })
})
