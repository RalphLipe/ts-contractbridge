import { describe, it, expect } from 'vitest'
import { Direction, PairDirection } from '../src/direction.js'

describe('Direction', () => {
  it('has all four directions in clockwise order', () => {
    expect(Direction.all).toEqual(['N', 'E', 'S', 'W'])
  })

  it('validates direction strings', () => {
    expect(Direction.isDirection('N')).toBe(true)
    expect(Direction.isDirection('W')).toBe(true)
    expect(Direction.isDirection('X')).toBe(false)
    expect(Direction.isDirection('')).toBe(false)
  })

  it('returns display names', () => {
    expect(Direction.name('N')).toBe('North')
    expect(Direction.name('E')).toBe('East')
    expect(Direction.name('S')).toBe('South')
    expect(Direction.name('W')).toBe('West')
  })

  it('computes dealer from board number', () => {
    expect(Direction.dealer(1)).toBe('N')
    expect(Direction.dealer(2)).toBe('E')
    expect(Direction.dealer(3)).toBe('S')
    expect(Direction.dealer(4)).toBe('W')
    expect(Direction.dealer(5)).toBe('N') // cycles
  })

  it('returns next direction clockwise', () => {
    expect(Direction.next('N')).toBe('E')
    expect(Direction.next('E')).toBe('S')
    expect(Direction.next('S')).toBe('W')
    expect(Direction.next('W')).toBe('N')
  })

  it('returns previous direction counter-clockwise', () => {
    expect(Direction.previous('N')).toBe('W')
    expect(Direction.previous('E')).toBe('N')
    expect(Direction.previous('S')).toBe('E')
    expect(Direction.previous('W')).toBe('S')
  })

  it('returns partner (opposite direction)', () => {
    expect(Direction.partner('N')).toBe('S')
    expect(Direction.partner('S')).toBe('N')
    expect(Direction.partner('E')).toBe('W')
    expect(Direction.partner('W')).toBe('E')
  })

  it('rotates clockwise by seats', () => {
    expect(Direction.rotated('N', 0)).toBe('N')
    expect(Direction.rotated('N', 1)).toBe('E')
    expect(Direction.rotated('N', 2)).toBe('S')
    expect(Direction.rotated('N', 3)).toBe('W')
    expect(Direction.rotated('N', 4)).toBe('N')
    expect(Direction.rotated('W', 1)).toBe('N')
  })

  it('returns pair direction', () => {
    expect(Direction.pairDirection('N')).toBe('NS')
    expect(Direction.pairDirection('S')).toBe('NS')
    expect(Direction.pairDirection('E')).toBe('EW')
    expect(Direction.pairDirection('W')).toBe('EW')
  })

  it('toPBN returns the single-character code', () => {
    expect(Direction.toPBN('N')).toBe('N')
    expect(Direction.toPBN('E')).toBe('E')
    expect(Direction.toPBN('S')).toBe('S')
    expect(Direction.toPBN('W')).toBe('W')
  })

  it('fromPBN parses direction strings case-insensitively', () => {
    expect(Direction.fromPBN('N')).toBe('N')
    expect(Direction.fromPBN('n')).toBe('N')
    expect(Direction.fromPBN('w')).toBe('W')
  })

  it('fromPBN returns undefined for invalid input', () => {
    expect(Direction.fromPBN('X')).toBeUndefined()
    expect(Direction.fromPBN('')).toBeUndefined()
  })

  it('pbn round-trips', () => {
    for (const d of Direction.all) {
      expect(Direction.fromPBN(Direction.toPBN(d))).toBe(d)
    }
  })
})

describe('PairDirection', () => {
  it('has both pair directions', () => {
    expect(PairDirection.all).toEqual(['NS', 'EW'])
  })

  it('returns the two directions for each pair', () => {
    expect(PairDirection.directions('NS')).toEqual(['N', 'S'])
    expect(PairDirection.directions('EW')).toEqual(['E', 'W'])
  })

  it('returns the opposing pair', () => {
    expect(PairDirection.opponents('NS')).toBe('EW')
    expect(PairDirection.opponents('EW')).toBe('NS')
  })

  it('toPBN returns the two-character code', () => {
    expect(PairDirection.toPBN('NS')).toBe('NS')
    expect(PairDirection.toPBN('EW')).toBe('EW')
  })

  it('fromPBN parses pair-direction strings case-insensitively', () => {
    expect(PairDirection.fromPBN('NS')).toBe('NS')
    expect(PairDirection.fromPBN('ns')).toBe('NS')
    expect(PairDirection.fromPBN('ew')).toBe('EW')
  })

  it('fromPBN returns undefined for invalid input', () => {
    expect(PairDirection.fromPBN('X')).toBeUndefined()
    expect(PairDirection.fromPBN('')).toBeUndefined()
  })

  it('pbn round-trips', () => {
    for (const pd of PairDirection.all) {
      expect(PairDirection.fromPBN(PairDirection.toPBN(pd))).toBe(pd)
    }
  })

  it('rotated: unchanged on even seats, swaps to opponents on odd seats', () => {
    expect(PairDirection.rotated('NS', 0)).toBe('NS')
    expect(PairDirection.rotated('NS', 1)).toBe('EW')
    expect(PairDirection.rotated('NS', 2)).toBe('NS')
    expect(PairDirection.rotated('EW', 1)).toBe('NS')
    expect(PairDirection.rotated('EW', 3)).toBe('NS')
  })
})
