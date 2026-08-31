import { describe, it, expect } from 'vitest'
import { splitLines } from '../../src/pbn/splitLines.js'

describe('splitLines', () => {
  it('splits on LF (Unix/modern Mac)', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  it('splits on CRLF (Windows)', () => {
    expect(splitLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c'])
  })

  it('splits on bare CR (classic Mac OS)', () => {
    expect(splitLines('a\rb\rc')).toEqual(['a', 'b', 'c'])
  })

  it('handles mixed line endings within the same text', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not treat CRLF as two line breaks', () => {
    expect(splitLines('a\r\nb')).toEqual(['a', 'b'])
    expect(splitLines('a\r\nb')).not.toEqual(['a', '', 'b'])
  })

  it('does not produce a phantom trailing empty line for terminated text', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
    expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b'])
    expect(splitLines('a\rb\r')).toEqual(['a', 'b'])
  })

  it('a genuine trailing blank line is still preserved', () => {
    expect(splitLines('a\n\n')).toEqual(['a', ''])
  })

  it('a single line with no terminator is one line', () => {
    expect(splitLines('hello')).toEqual(['hello'])
  })

  it('an empty string has no lines', () => {
    expect(splitLines('')).toEqual([])
  })

  it('a lone terminator is a single empty line', () => {
    expect(splitLines('\n')).toEqual([''])
  })

  it('handles a realistic multi-line PBN snippet', () => {
    const pbn = '[Event "Test"]\r\n[Site "Somewhere"]\r\n[Board "1"]\r\n'
    expect(splitLines(pbn)).toEqual(['[Event "Test"]', '[Site "Somewhere"]', '[Board "1"]'])
  })
})
