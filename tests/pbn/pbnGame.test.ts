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

  it('sections are mutable', () => {
    const game = new PBNGame()
    game.sections.push(new PBNSection(['[Board "1"]']))
    expect(game.sections).toHaveLength(1)
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

    it('reflects mutations to sections immediately (no stale caching)', () => {
      const game = new PBNGame()
      expect(game.getTagValue('Declarer')).toBeUndefined()
      game.sections.push(new PBNSection(['[Declarer "N"]']))
      expect(game.getTagValue('Declarer')).toBe('N')
    })
  })
})
