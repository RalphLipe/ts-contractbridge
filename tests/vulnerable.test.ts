import { describe, it, expect } from 'vitest'
import { Vulnerable } from '../src/vulnerable.js'

describe('Vulnerable', () => {
  it('has all four vulnerability values in correct order', () => {
    expect(Vulnerable.all).toEqual(['None', 'NS', 'EW', 'All'])
  })

  it('validates vulnerability strings', () => {
    expect(Vulnerable.isVulnerable('None')).toBe(true)
    expect(Vulnerable.isVulnerable('NS')).toBe(true)
    expect(Vulnerable.isVulnerable('EW')).toBe(true)
    expect(Vulnerable.isVulnerable('All')).toBe(true)
    expect(Vulnerable.isVulnerable('Both')).toBe(false)
    expect(Vulnerable.isVulnerable('')).toBe(false)
  })

  it('computes vulnerability from board number', () => {
    // Boards 1-16 cycle: None NS EW All / NS EW All None / EW All None NS / All None NS EW
    expect(Vulnerable.fromBoardNumber(1)).toBe('None')
    expect(Vulnerable.fromBoardNumber(2)).toBe('NS')
    expect(Vulnerable.fromBoardNumber(3)).toBe('EW')
    expect(Vulnerable.fromBoardNumber(4)).toBe('All')
    expect(Vulnerable.fromBoardNumber(5)).toBe('NS')
    expect(Vulnerable.fromBoardNumber(6)).toBe('EW')
    expect(Vulnerable.fromBoardNumber(7)).toBe('All')
    expect(Vulnerable.fromBoardNumber(8)).toBe('None')
    expect(Vulnerable.fromBoardNumber(16)).toBe('EW')
  })

  it('correctly determines vulnerability by pair', () => {
    expect(Vulnerable.isVulPair('None', 'NS')).toBe(false)
    expect(Vulnerable.isVulPair('None', 'EW')).toBe(false)
    expect(Vulnerable.isVulPair('NS', 'NS')).toBe(true)
    expect(Vulnerable.isVulPair('NS', 'EW')).toBe(false)
    expect(Vulnerable.isVulPair('EW', 'EW')).toBe(true)
    expect(Vulnerable.isVulPair('EW', 'NS')).toBe(false)
    expect(Vulnerable.isVulPair('All', 'NS')).toBe(true)
    expect(Vulnerable.isVulPair('All', 'EW')).toBe(true)
  })

  it('correctly determines vulnerability by direction', () => {
    expect(Vulnerable.isVulDirection('NS', 'N')).toBe(true)
    expect(Vulnerable.isVulDirection('NS', 'S')).toBe(true)
    expect(Vulnerable.isVulDirection('NS', 'E')).toBe(false)
    expect(Vulnerable.isVulDirection('EW', 'E')).toBe(true)
    expect(Vulnerable.isVulDirection('EW', 'N')).toBe(false)
    expect(Vulnerable.isVulDirection('All', 'W')).toBe(true)
    expect(Vulnerable.isVulDirection('None', 'N')).toBe(false)
  })

  it('toPBN returns the canonical PBN string', () => {
    expect(Vulnerable.toPBN('None')).toBe('None')
    expect(Vulnerable.toPBN('NS')).toBe('NS')
    expect(Vulnerable.toPBN('EW')).toBe('EW')
    expect(Vulnerable.toPBN('All')).toBe('All')
  })

  it('fromPBN parses canonical strings', () => {
    expect(Vulnerable.fromPBN('None')).toBe('None')
    expect(Vulnerable.fromPBN('NS')).toBe('NS')
    expect(Vulnerable.fromPBN('EW')).toBe('EW')
    expect(Vulnerable.fromPBN('All')).toBe('All')
  })

  it('fromPBN accepts synonyms and is case-insensitive', () => {
    expect(Vulnerable.fromPBN('LOVE')).toBe('None')
    expect(Vulnerable.fromPBN('-')).toBe('None')
    expect(Vulnerable.fromPBN('BOTH')).toBe('All')
    expect(Vulnerable.fromPBN('none')).toBe('None')
    expect(Vulnerable.fromPBN('ns')).toBe('NS')
    expect(Vulnerable.fromPBN('ew')).toBe('EW')
    expect(Vulnerable.fromPBN('all')).toBe('All')
    expect(Vulnerable.fromPBN('love')).toBe('None')
    expect(Vulnerable.fromPBN('both')).toBe('All')
  })

  it('fromPBN returns undefined for invalid input', () => {
    expect(Vulnerable.fromPBN('')).toBeUndefined()
    expect(Vulnerable.fromPBN('garbage')).toBeUndefined()
  })

  it('pbn round-trips for canonical strings', () => {
    for (const v of Vulnerable.all) {
      expect(Vulnerable.fromPBN(Vulnerable.toPBN(v))).toBe(v)
    }
  })

  it('rotated: None and All are unaffected at any seat count', () => {
    expect(Vulnerable.rotated('None', 1)).toBe('None')
    expect(Vulnerable.rotated('None', 2)).toBe('None')
    expect(Vulnerable.rotated('All', 1)).toBe('All')
    expect(Vulnerable.rotated('All', 3)).toBe('All')
  })

  it('rotated: NS/EW swap on odd seats, unchanged on even', () => {
    expect(Vulnerable.rotated('NS', 1)).toBe('EW')
    expect(Vulnerable.rotated('EW', 1)).toBe('NS')
    expect(Vulnerable.rotated('NS', 3)).toBe('EW')
    expect(Vulnerable.rotated('NS', 2)).toBe('NS')
    expect(Vulnerable.rotated('EW', 4)).toBe('EW')
  })
})
