import { describe, it, expect } from 'vitest'
import { Call } from '../src/call.js'

describe('Call', () => {
  it('constants', () => {
    expect(Call.Pass).toBe('Pass')
    expect(Call.Double).toBe('X')
    expect(Call.Redouble).toBe('XX')
  })

  it('type guards', () => {
    expect(Call.isPass('Pass')).toBe(true)
    expect(Call.isPass('X')).toBe(false)
    expect(Call.isDouble('X')).toBe(true)
    expect(Call.isDouble('XX')).toBe(false)
    expect(Call.isRedouble('XX')).toBe(true)
    expect(Call.isRedouble('X')).toBe(false)
    expect(Call.isBid('3NT')).toBe(true)
    expect(Call.isBid('Pass')).toBe(false)
  })

  it('parses pass variants', () => {
    expect(Call.fromPBN('Pass')).toBe('Pass')
    expect(Call.fromPBN('pass')).toBe('Pass')
    expect(Call.fromPBN('-')).toBe('Pass')
  })

  it('parses double and redouble', () => {
    expect(Call.fromPBN('X')).toBe('X')
    expect(Call.fromPBN('x')).toBe('X')
    expect(Call.fromPBN('XX')).toBe('XX')
    expect(Call.fromPBN('xx')).toBe('XX')
  })

  it('parses bid calls', () => {
    expect(Call.fromPBN('3NT')).toBe('3NT')
    expect(Call.fromPBN('1c')).toBe('1C')
    expect(Call.fromPBN('7S')).toBe('7S')
  })

  it('returns undefined for invalid strings', () => {
    expect(Call.fromPBN('garbage')).toBeUndefined()
    expect(Call.fromPBN('8C')).toBeUndefined()
    expect(Call.fromPBN('')).toBeUndefined()
  })

  it('pbn round-trips', () => {
    const calls: Call[] = ['Pass', 'X', 'XX', '3NT', '1C']
    for (const c of calls) {
      expect(Call.fromPBN(Call.pbn(c))).toBe(c)
    }
  })

  it('constructs bid calls from level and strain', () => {
    expect(Call.bid(3, 'NT')).toBe('3NT')
    expect(Call.bid(1, 'C')).toBe('1C')
  })
})
