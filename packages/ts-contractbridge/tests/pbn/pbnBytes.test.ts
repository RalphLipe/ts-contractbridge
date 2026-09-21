import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodePBNBytes, encodePBNBytes } from '../../src/pbn/pbnBytes.js'
import { PBNDocument } from '../../src/pbn/pbnDocument.js'

const ascii = (text: string): number[] => [...text].map(c => c.charCodeAt(0))
const bytesOf = (...values: number[]): Uint8Array => Uint8Array.from(values)
const readTestBytes = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`../../test-data/${name}`, import.meta.url)))

describe('decodePBNBytes', () => {
  it('decodes ASCII', () => {
    expect(decodePBNBytes(bytesOf(...ascii('[Board "1"]\r\n')))).toBe('[Board "1"]\r\n')
  })

  it('decodes an empty byte array to an empty string', () => {
    expect(decodePBNBytes(new Uint8Array())).toBe('')
  })

  it('decodes valid UTF-8', () => {
    expect(decodePBNBytes(new TextEncoder().encode('[West "José €"]'))).toBe('[West "José €"]')
  })

  it('drops a UTF-8 byte-order mark', () => {
    expect(decodePBNBytes(new TextEncoder().encode('﻿[Board "1"]'))).toBe('[Board "1"]')
  })

  it('decodes bytes that are not valid UTF-8 as Latin 1', () => {
    expect(decodePBNBytes(bytesOf(...ascii('[West "Jos'), 0xe9, ...ascii('"]')))).toBe('[West "José"]')
  })

  it('decodes every Latin 1 byte to the character with the same code, including 0x80-0x9F', () => {
    const all = bytesOf(...Array.from({ length: 256 }, (_, i) => i))
    const text = decodePBNBytes(all) // 0x80 on its own is not valid UTF-8, so this is Latin 1
    expect(text.length).toBe(256)
    for (let i = 0; i < 256; i++) expect(text.charCodeAt(i)).toBe(i)
  })

  it('feeds PBNDocument.fromPBN', () => {
    const doc = PBNDocument.fromPBN(decodePBNBytes(bytesOf(...ascii('[West "Jos'), 0xe9, ...ascii('"]\r\n'))))
    expect(doc.games[0]!.getTagValue('West')).toBe('José')
  })
})

describe('encodePBNBytes', () => {
  it('encodes ASCII as one byte per character', () => {
    expect(Array.from(encodePBNBytes('[Board "1"]\r\n'))).toEqual(ascii('[Board "1"]\r\n'))
  })

  it('encodes an empty string to an empty byte array', () => {
    expect(encodePBNBytes('')).toEqual(new Uint8Array())
  })

  it('encodes a Latin 1 character as a single byte', () => {
    expect(Array.from(encodePBNBytes('José'))).toEqual([...ascii('Jos'), 0xe9])
  })

  it('encodes every character up to U+00FF as the byte with the same code', () => {
    const text = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i))
    expect(Array.from(encodePBNBytes(text))).toEqual(Array.from({ length: 256 }, (_, i) => i))
  })

  it('encodes a character Latin 1 cannot hold as "?"', () => {
    expect(Array.from(encodePBNBytes('€ Ω 漢'))).toEqual(ascii('? ? ?'))
  })

  it('encodes a character outside the BMP as a single "?", not one per UTF-16 unit', () => {
    expect(Array.from(encodePBNBytes('😀'))).toEqual(ascii('?'))
  })

  it('leaves line breaks as they are', () => {
    expect(Array.from(encodePBNBytes('a\nb\r\nc'))).toEqual(ascii('a\nb\r\nc'))
  })

  it('takes the output of PBNDocument.toPBN', () => {
    const doc = PBNDocument.fromPBN('[West "José"]\n')
    expect(Array.from(encodePBNBytes(doc.toPBN()))).toEqual([...ascii('[West "Jos'), 0xe9, ...ascii('"]\r\n')])
  })
})

describe('decodePBNBytes and encodePBNBytes together', () => {
  it('round-trips a Latin 1 file byte for byte, including bytes 0x80-0x9F', () => {
    const original = bytesOf(...ascii('[West "Jos'), 0xe9, 0x93, 0xff, ...ascii('"]\r\n'))
    expect(Array.from(encodePBNBytes(decodePBNBytes(original)))).toEqual(Array.from(original))
  })

  it('round-trips a Latin 1 file through PBNDocument byte for byte', () => {
    const original = bytesOf(...ascii('[Board "1"]\r\n[West "Jos'), 0xe9, ...ascii('"]\r\n'))
    const doc = PBNDocument.fromPBN(decodePBNBytes(original))
    expect(Array.from(encodePBNBytes(doc.toPBN()))).toEqual(Array.from(original))
  })

  it('turns a UTF-8 file into Latin 1 when written back', () => {
    const utf8 = new TextEncoder().encode('[West "José"]\r\n')
    expect(Array.from(encodePBNBytes(decodePBNBytes(utf8)))).toEqual([...ascii('[West "Jos'), 0xe9, ...ascii('"]\r\n')])
  })

  it.each(['hand-record-1.pbn', 'hand-record-2.pbn', 'TOB L5 Hands.pbn'])(
    'reads %s and writes back exactly the bytes it came from',
    name => {
      const original = readTestBytes(name)
      expect(Array.from(encodePBNBytes(decodePBNBytes(original)))).toEqual(Array.from(original))
    }
  )
})
