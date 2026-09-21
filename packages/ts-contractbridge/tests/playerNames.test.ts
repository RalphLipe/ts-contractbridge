import { describe, it, expect } from 'vitest'
import { PlayerNames } from '../src/playerNames.js'

describe('PlayerNames', () => {
  it('creates an empty instance', () => {
    expect(PlayerNames.make()).toEqual({})
  })

  it('withName sets a single value without mutating the original', () => {
    const names = PlayerNames.make()
    const updated = PlayerNames.withName(names, 'N', 'Alice')
    expect(updated.N).toBe('Alice')
    expect(names.N).toBeUndefined()
  })

  it('withName leaves other directions untouched', () => {
    let names = PlayerNames.make()
    names = PlayerNames.withName(names, 'N', 'Alice')
    names = PlayerNames.withName(names, 'S', 'Bob')
    expect(names).toEqual({ N: 'Alice', S: 'Bob' })
  })

  it('withName with an empty string removes the entry, since "" means no name', () => {
    const names = PlayerNames.withName(PlayerNames.make(), 'N', 'Alice')
    const cleared = PlayerNames.withName(names, 'N', '')
    expect(cleared).toEqual({})
    expect('N' in cleared).toBe(false)
    expect(names.N).toBe('Alice')
    expect(PlayerNames.withName(PlayerNames.make(), 'E', '')).toEqual({})
  })

  describe('rotated', () => {
    it('drops an empty-string name rather than carrying it to the new seat', () => {
      const rotated = PlayerNames.rotated({ N: 'Alice', E: '' }, 1)
      expect(rotated).toEqual({ E: 'Alice' })
      expect('S' in rotated).toBe(false)
    })

    it('moves each name to its rotated direction', () => {
      const names: PlayerNames = { N: 'Alice', E: 'Bob', S: 'Carol', W: 'Dave' }
      const rotated = PlayerNames.rotated(names, 1)
      expect(rotated).toEqual({ E: 'Alice', S: 'Bob', W: 'Carol', N: 'Dave' })
    })

    it('a direction with no name stays genuinely absent, not present as undefined', () => {
      const names: PlayerNames = { N: 'Alice' }
      const rotated = PlayerNames.rotated(names, 1)
      expect(rotated).toEqual({ E: 'Alice' })
      expect('N' in rotated).toBe(false)
      expect('S' in rotated).toBe(false)
      expect('W' in rotated).toBe(false)
    })

    it('rotating by 0 seats is a no-op', () => {
      const names: PlayerNames = { N: 'Alice', S: 'Bob' }
      expect(PlayerNames.rotated(names, 0)).toEqual(names)
    })

    it('rotating an empty instance stays empty', () => {
      expect(PlayerNames.rotated(PlayerNames.make(), 2)).toEqual({})
    })
  })
})
