import { describe, it, expect } from 'vitest'
import { Rank } from '../src/rank.js'

describe('Rank', () => {
  it('has 13 ranks ordered high to low', () => {
    expect(Rank.all).toHaveLength(13)
    expect(Rank.all[0]).toBe('A')
    expect(Rank.all[12]).toBe('2')
  })

  it('validates rank strings', () => {
    expect(Rank.isRank('A')).toBe(true)
    expect(Rank.isRank('T')).toBe(true)
    expect(Rank.isRank('1')).toBe(false)
    expect(Rank.isRank('10')).toBe(false)
  })

  it('assigns correct HCP values', () => {
    expect(Rank.hcp('A')).toBe(4)
    expect(Rank.hcp('K')).toBe(3)
    expect(Rank.hcp('Q')).toBe(2)
    expect(Rank.hcp('J')).toBe(1)
    expect(Rank.hcp('T')).toBe(0)
    expect(Rank.hcp('2')).toBe(0)
  })

  it('returns correct bridge rank order (2 < 3 < ... < A)', () => {
    expect(Rank.bridgeRank('2')).toBe(0)
    expect(Rank.bridgeRank('A')).toBe(12)
    expect(Rank.bridgeRank('K')).toBeLessThan(Rank.bridgeRank('A'))
    expect(Rank.bridgeRank('T')).toBeLessThan(Rank.bridgeRank('J'))
  })
})
