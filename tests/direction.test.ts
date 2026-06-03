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

  it('returns pair direction', () => {
    expect(Direction.pairDirection('N')).toBe('NS')
    expect(Direction.pairDirection('S')).toBe('NS')
    expect(Direction.pairDirection('E')).toBe('EW')
    expect(Direction.pairDirection('W')).toBe('EW')
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
})
