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
})
