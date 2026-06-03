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
})
