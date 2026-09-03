import { describe, it, expect } from 'vitest'
import { parsePBNFormattedText } from '../../src/pbn/pbnFormattedText.js'
import type { PBNTextRun } from '../../src/pbn/pbnFormattedText.js'

const plain = (text: string): PBNTextRun => ({ kind: 'text', text, bold: false, italic: false, underline: false })

describe('parsePBNFormattedText', () => {
  it('returns plain text as a single unformatted run', () => {
    expect(parsePBNFormattedText('hello world')).toEqual([plain('hello world')])
  })

  it('trims leading and trailing whitespace', () => {
    expect(parsePBNFormattedText('  hello  ')).toEqual([plain('hello')])
  })

  describe('newlines', () => {
    it('collapses an ordinary line wrap (a single real newline) to a space', () => {
      expect(parsePBNFormattedText('line one\nline two')).toEqual([plain('line one line two')])
    })

    it('a blank line becomes exactly one forced break', () => {
      expect(parsePBNFormattedText('paragraph one\n\nparagraph two'))
        .toEqual([plain('paragraph one\nparagraph two')])
    })

    it('multiple consecutive blank lines still become exactly one break', () => {
      expect(parsePBNFormattedText('paragraph one\n\n\n\nparagraph two'))
        .toEqual([plain('paragraph one\nparagraph two')])
    })

    it('an explicit "\\n" escape is a forced break wherever it appears', () => {
      expect(parsePBNFormattedText('one\\ntwo')).toEqual([plain('one\ntwo')])
    })

    it('an explicit "\\n " (with trailing space) does not leave a stray leading space', () => {
      expect(parsePBNFormattedText('one\\n two')).toEqual([plain('one\ntwo')])
    })

    it('a real hand-record-shaped comment block: line-wraps collapse, the blank line breaks', () => {
      const raw = 'This file uses new minor forcing.\n\nTODO: How to implement conditional tests'
      expect(parsePBNFormattedText(raw)).toEqual([
        plain('This file uses new minor forcing.\nTODO: How to implement conditional tests'),
      ])
    })
  })

  describe('bold/italic/underline', () => {
    it('wraps <b>...</b> content as bold', () => {
      expect(parsePBNFormattedText('plain <b>bold</b> plain')).toEqual([
        plain('plain '),
        { kind: 'text', text: 'bold', bold: true, italic: false, underline: false },
        plain(' plain'),
      ])
    })

    it('wraps <i>...</i> content as italic', () => {
      expect(parsePBNFormattedText('<i>italic</i>')).toEqual([
        { kind: 'text', text: 'italic', bold: false, italic: true, underline: false },
      ])
    })

    it('wraps <u>...</u> content as underline', () => {
      expect(parsePBNFormattedText('<u>underlined</u>')).toEqual([
        { kind: 'text', text: 'underlined', bold: false, italic: false, underline: true },
      ])
    })

    it('handles properly nested tags, combining flags correctly at each level', () => {
      const runs = parsePBNFormattedText('<b>bold<i>bold-italic</i>bold again</b>')
      expect(runs).toEqual([
        { kind: 'text', text: 'bold', bold: true, italic: false, underline: false },
        { kind: 'text', text: 'bold-italic', bold: true, italic: true, underline: false },
        { kind: 'text', text: 'bold again', bold: true, italic: false, underline: false },
      ])
    })

    it('handles overlapping (non-well-nested) tags without throwing', () => {
      // "<b>foo<i>bar</b>baz</i>" -- <i> is still open when </b> closes; a naive Swift-style
      // stack-free replace would mishandle this, this should still resolve each run correctly.
      const runs = parsePBNFormattedText('<b>foo<i>bar</b>baz</i>')
      expect(runs).toEqual([
        { kind: 'text', text: 'foo', bold: true, italic: false, underline: false },
        { kind: 'text', text: 'bar', bold: true, italic: true, underline: false },
        { kind: 'text', text: 'baz', bold: false, italic: true, underline: false },
      ])
    })

    it('an unmatched closing tag is ignored rather than throwing', () => {
      expect(parsePBNFormattedText('plain</b>text')).toEqual([plain('plaintext')])
    })
  })

  describe('suit escapes', () => {
    it('converts \\S \\H \\D \\C to suit runs', () => {
      expect(parsePBNFormattedText('\\S \\H \\D \\C')).toEqual([
        { kind: 'suit', suit: 'S', bold: false, italic: false, underline: false },
        plain(' '),
        { kind: 'suit', suit: 'H', bold: false, italic: false, underline: false },
        plain(' '),
        { kind: 'suit', suit: 'D', bold: false, italic: false, underline: false },
        plain(' '),
        { kind: 'suit', suit: 'C', bold: false, italic: false, underline: false },
      ])
    })

    it('a suit inside bold text keeps the bold flag', () => {
      expect(parsePBNFormattedText('<b>lead the \\S</b>')).toEqual([
        { kind: 'text', text: 'lead the ', bold: true, italic: false, underline: false },
        { kind: 'suit', suit: 'S', bold: true, italic: false, underline: false },
      ])
    })
  })

  it('combines newline normalization, nested tags, and suit escapes together', () => {
    const raw = 'Lead the <b>\\S</b>.\n\nThen play <i>low</i>.'
    expect(parsePBNFormattedText(raw)).toEqual([
      plain('Lead the '),
      { kind: 'suit', suit: 'S', bold: true, italic: false, underline: false },
      plain('.\nThen play '),
      { kind: 'text', text: 'low', bold: false, italic: true, underline: false },
      plain('.'),
    ])
  })
})
