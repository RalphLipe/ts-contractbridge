import { describe, it, expect } from 'vitest'
import { parseSectionLines } from '../../src/pbn/parsedSection.js'

describe('parseSectionLines', () => {
  it('splits the tag line out from body lines', () => {
    const parsed = parseSectionLines(['[Auction "N"]', '1C Pass 1S Pass', '1NT Pass Pass Pass'])
    expect(parsed.tagPair).toEqual({ name: 'Auction', value: 'N' })
    expect(parsed.bodyLines).toEqual(['1C Pass 1S Pass', '1NT Pass Pass Pass'])
    expect(parsed.notes.size).toBe(0)
    expect(parsed.comments).toEqual([])
  })

  it('has an undefined tagPair for a "global" section, and keeps its first line as body content', () => {
    const parsed = parseSectionLines(['; a comment about the whole game', 'more text'])
    expect(parsed.tagPair).toBeUndefined()
    expect(parsed.bodyLines).toEqual(['more text'])
    expect(parsed.comments).toEqual(['a comment about the whole game'])
  })

  it('is empty for an empty lines array', () => {
    const parsed = parseSectionLines([])
    expect(parsed.tagPair).toBeUndefined()
    expect(parsed.bodyLines).toEqual([])
    expect(parsed.notes.size).toBe(0)
    expect(parsed.comments).toEqual([])
  })

  describe('notes', () => {
    it('keys notes by their "=N=" marker, matching the body reference format', () => {
      const parsed = parseSectionLines([
        '[Auction "N"]', '1C Pass 1S Pass', '1NT Pass 2D =1=',
        '[Note "1:New minor forcing"]',
      ])
      expect(parsed.notes.get('=1=')).toBe('New minor forcing')
      expect(parsed.bodyLines).toEqual(['1C Pass 1S Pass', '1NT Pass 2D =1='])
    })

    it('collects multiple notes', () => {
      const parsed = parseSectionLines([
        '[Auction "N"]',
        '[Note "1:first"]',
        '[Note "2:second"]',
      ])
      expect(parsed.notes.get('=1=')).toBe('first')
      expect(parsed.notes.get('=2=')).toBe('second')
    })

    it('a malformed Note line (no colon) falls through to bodyLines instead of being dropped', () => {
      const parsed = parseSectionLines(['[Auction "N"]', '[Note "malformed"]'])
      expect(parsed.notes.size).toBe(0)
      expect(parsed.bodyLines).toEqual(['[Note "malformed"]'])
    })
  })

  describe('comments', () => {
    it('extracts a single-line ";" comment with the ";" removed', () => {
      const parsed = parseSectionLines(['[Auction "N"]', '; a remark', 'Pass Pass Pass Pass'])
      expect(parsed.comments).toEqual(['a remark'])
      expect(parsed.bodyLines).toEqual(['Pass Pass Pass Pass'])
    })

    it('extracts a single-line "{ ... }" comment with the braces removed', () => {
      const parsed = parseSectionLines(['[Auction "N"]', '{ a remark }', 'Pass Pass Pass Pass'])
      expect(parsed.comments).toEqual(['a remark'])
      expect(parsed.bodyLines).toEqual(['Pass Pass Pass Pass'])
    })

    it('joins a multi-line "{...}" block into one comment, dropping the delimiter-only lines', () => {
      const parsed = parseSectionLines([
        '[Auction "S"]', '1C Pass 1S Pass', '1NT Pass 2D =1=',
        '[Note "1:New minor forcing"]',
        '{',
        'This file uses new minor forcing.',
        '',
        'TODO: How to implement conditional tests',
        '}',
      ])
      expect(parsed.comments).toEqual([
        'This file uses new minor forcing.\n\nTODO: How to implement conditional tests',
      ])
      expect(parsed.bodyLines).toEqual(['1C Pass 1S Pass', '1NT Pass 2D =1='])
      expect(parsed.notes.get('=1=')).toBe('New minor forcing')
    })

    it('keeps text sharing a line with the opening/closing braces', () => {
      const parsed = parseSectionLines(['[Board "1"]', '{ opening text', 'middle', 'closing text }'])
      expect(parsed.comments).toEqual(['opening text\nmiddle\nclosing text'])
    })

    it('an unclosed block at end of input still becomes a comment', () => {
      const parsed = parseSectionLines(['[Board "1"]', '{', 'unterminated', 'still going'])
      expect(parsed.comments).toEqual(['unterminated\nstill going'])
    })

    it('collects multiple separate comments in order', () => {
      const parsed = parseSectionLines(['[Board "1"]', '; first', 'body', '{ second }', 'more body'])
      expect(parsed.comments).toEqual(['first', 'second'])
      expect(parsed.bodyLines).toEqual(['body', 'more body'])
    })
  })
})
