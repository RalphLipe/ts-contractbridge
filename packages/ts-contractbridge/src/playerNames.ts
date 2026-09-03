import { Direction } from './direction.js'

// Deliberately independent of PBN — a useful value type on its own, not something PBNGame owns.
// Each direction is optional: a name might be known for some seats and not others; a direction
// missing here means "unknown", not an empty string.
export type PlayerNames = { readonly [direction in Direction]?: string }

const make = (): PlayerNames => ({})

const withName = (names: PlayerNames, direction: Direction, name: string): PlayerNames =>
  ({ ...names, [direction]: name })

// Rotates names `seats` positions clockwise, matching Direction.rotated — e.g. seats=1 moves
// North's name to East. A direction with no name stays genuinely absent afterward (not present
// with an undefined value), matching how DoubleDummyTricks/Tricks model "unknown" elsewhere.
const rotated = (names: PlayerNames, seats: number): PlayerNames => {
  const result: Partial<Record<Direction, string>> = {}
  for (const direction of Direction.all) {
    const name = names[direction]
    if (name !== undefined) result[Direction.rotated(direction, seats)] = name
  }
  return result
}

export const PlayerNames = {
  make, withName, rotated,
}
