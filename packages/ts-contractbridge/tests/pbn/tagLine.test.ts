import { describe, it, expect } from 'vitest'
import { parseTagLine, formatTagLine } from '../../src/pbn/tagLine.js'

describe('parseTagLine', () => {
  it('parses a simple tag pair', () => {
    expect(parseTagLine('[Declarer "N"]')).toEqual({ name: 'Declarer', value: 'N' })
  })

  it('preserves spaces inside the quoted value', () => {
    expect(parseTagLine('[Event "World Championship"]')).toEqual({ name: 'Event', value: 'World Championship' })
  })

  it('tolerates leading/trailing whitespace on the line', () => {
    expect(parseTagLine('  [Board "1"]  ')).toEqual({ name: 'Board', value: '1' })
  })

  it('allows an empty quoted value', () => {
    expect(parseTagLine('[Declarer ""]')).toEqual({ name: 'Declarer', value: '' })
  })

  it('is undefined when the line is not bracketed', () => {
    expect(parseTagLine('Declarer "N"')).toBeUndefined()
  })

  it('is undefined when there is no space separating name and value', () => {
    expect(parseTagLine('[Foo]')).toBeUndefined()
  })

  it('is undefined when the value is missing its quotes', () => {
    expect(parseTagLine('[Foo Bar]')).toBeUndefined()
  })

  it('is undefined for an empty string', () => {
    expect(parseTagLine('')).toBeUndefined()
  })
})

describe('formatTagLine', () => {
  it('formats a simple tag pair', () => {
    expect(formatTagLine({ name: 'Declarer', value: 'N' })).toBe('[Declarer "N"]')
  })

  it('formats a value containing spaces', () => {
    expect(formatTagLine({ name: 'Event', value: 'World Championship' })).toBe('[Event "World Championship"]')
  })

  it('formats an empty value', () => {
    expect(formatTagLine({ name: 'Declarer', value: '' })).toBe('[Declarer ""]')
  })

  it('has no trailing newline', () => {
    expect(formatTagLine({ name: 'Board', value: '1' })).not.toMatch(/\n$/)
  })
})

describe('parseTagLine / formatTagLine round-trip', () => {
  it('round-trips a variety of tag pairs', () => {
    const tags = [
      { name: 'Declarer', value: 'N' },
      { name: 'Event', value: 'World Championship' },
      { name: 'Board', value: '1' },
      { name: 'Declarer', value: '' },
    ]
    for (const tag of tags) {
      expect(parseTagLine(formatTagLine(tag))).toEqual(tag)
    }
  })
})
