import { Direction } from './direction.js'
import { Strain } from './strain.js'
import { PBNCodable } from './pbnCodable.js'

export type Tricks = { readonly [strain in Strain]?: number }
export type DoubleDummyTable = { readonly [direction in Direction]: Tricks }

// Double dummy tricks are stored in the order N,S,E,W for each strain in order NT,S,H,D,C.
// Each trick count is a single hex digit (0-13, 'A'-'D'); 'F' means unknown. Not part of the
// official PBN spec, but this is the convention PBN files use for the [DoubleDummyTable] tag.

const make = (): DoubleDummyTable => ({ N: {}, E: {}, S: {}, W: {} })

const withTricks = (
  dd: DoubleDummyTable, direction: Direction, strain: Strain, count: number
): DoubleDummyTable =>
  ({ ...dd, [direction]: { ...dd[direction], [strain]: count } })

const directionsInOrder: readonly Direction[] = ['N', 'S', 'E', 'W']
const strainsInOrder: readonly Strain[] = ['NT', 'S', 'H', 'D', 'C']

const toPBN = (dd: DoubleDummyTable): string => {
  let result = ''
  for (const direction of directionsInOrder) {
    for (const strain of strainsInOrder) {
      result += (dd[direction][strain] ?? 15).toString(16).toUpperCase()
    }
  }
  return result
}

/** Parse a PBN [DoubleDummyTable] tag value. Returns undefined if the length is wrong. */
const fromPBN = (s: string): DoubleDummyTable | undefined => {
  if (s.length !== directionsInOrder.length * strainsInOrder.length) return undefined
  const result: Record<Direction, Record<string, number>> = { N: {}, E: {}, S: {}, W: {} }
  let allNonMakingAreOne = true
  let i = 0
  for (const direction of directionsInOrder) {
    for (const strain of strainsInOrder) {
      const m = parseInt(s[i++]!, 16)
      // Invalid digits and 'F' (unknown) are simply left unset for this position.
      if (!isNaN(m) && m <= 13) {
        result[direction][strain] = m
        if (m < 7 && m !== 1) allNonMakingAreOne = false
      }
    }
  }
  // If every contract making less than 7 tricks is shown as making exactly 1, this is
  // bogus data (a common encoding for "unknown" in some PBN generators) — drop the 1's.
  if (allNonMakingAreOne) {
    for (const direction of directionsInOrder) {
      for (const strain of strainsInOrder) {
        if (result[direction][strain] === 1) delete result[direction][strain]
      }
    }
  }
  return result as DoubleDummyTable
}

const rotated = (dd: DoubleDummyTable, seats: number): DoubleDummyTable => {
  const result = { N: {}, E: {}, S: {}, W: {} } as Record<Direction, Tricks>
  for (const direction of Direction.all) {
    result[Direction.rotated(direction, seats)] = dd[direction]
  }
  return result as DoubleDummyTable
}

export const DoubleDummyTable = {
  make, withTricks, toPBN, fromPBN, rotated,
}

DoubleDummyTable satisfies PBNCodable<DoubleDummyTable>
