import { PBNCodable } from './pbnCodable.js'

export type PairDirection = 'NS' | 'EW'

const NS: PairDirection = 'NS'
const EW: PairDirection = 'EW'

// Renamed from the bare `all` to avoid colliding with Direction's own `all` below, which
// shares this module (the only case in the file where two type+object pairs collide).
const pairDirectionAll: readonly PairDirection[] = ['NS', 'EW']

const directions = (pd: PairDirection): ['N', 'S'] | ['E', 'W'] =>
  pd === 'NS' ? ['N', 'S'] : ['E', 'W']

const opponents = (pd: PairDirection): PairDirection =>
  pd === 'NS' ? 'EW' : 'NS'

// `toPBN`/`fromPBN`/`rotated` are prefixed to avoid colliding with Direction's own bare
// versions below, which share this module.
const pairDirectionToPBN = (pd: PairDirection): string => pd

/** Parse a PBN pair-direction string ("NS", "EW"), case-insensitively. */
const pairDirectionFromPBN = (s: string): PairDirection | undefined => {
  const u = s.toUpperCase()
  return u === 'NS' || u === 'EW' ? u : undefined
}

/** Same pair on even seats; swaps to the opposing pair on odd seats. */
const pairDirectionRotated = (pd: PairDirection, seats: number): PairDirection =>
  seats % 2 === 0 ? pd : opponents(pd)

export const PairDirection = {
  NS, EW,
  all: pairDirectionAll,
  directions,
  opponents,
  toPBN: pairDirectionToPBN,
  fromPBN: pairDirectionFromPBN,
  rotated: pairDirectionRotated,
}

PairDirection satisfies PBNCodable<PairDirection>

export type Direction = 'N' | 'E' | 'S' | 'W'

const North: Direction = 'N'
const East:  Direction = 'E'
const South: Direction = 'S'
const West:  Direction = 'W'

/** All four directions in clockwise order */
const directionAll: readonly Direction[] = ['N', 'E', 'S', 'W']

const isDirection = (x: string): x is Direction =>
  x === 'N' || x === 'E' || x === 'S' || x === 'W'

const toPBN = (d: Direction): string => d

/** Parse a PBN direction string ("N", "E", "S", "W"), case-insensitively. */
const fromPBN = (s: string): Direction | undefined => {
  const u = s.toUpperCase()
  return isDirection(u) ? u : undefined
}

const name = (d: Direction): string => ({
  N: 'North', E: 'East', S: 'South', W: 'West'
})[d]

/** 0-based index in clockwise order (N=0, E=1, S=2, W=3) */
const index = (d: Direction): number => directionAll.indexOf(d)

/** The dealer for a given board number (1-based, cycles N→E→S→W) */
const dealer = (boardNumber: number): Direction =>
  directionAll[(boardNumber - 1) % 4]!

/** Next direction clockwise */
const next = (d: Direction): Direction =>
  directionAll[(index(d) + 1) % 4]!

/** Previous direction (counter-clockwise) */
const previous = (d: Direction): Direction =>
  directionAll[(index(d) + 3) % 4]!

/** Partner sits opposite */
const partner = (d: Direction): Direction =>
  directionAll[(index(d) + 2) % 4]!

/** Rotate clockwise by seats (e.g. seats=1: N→E, seats=2: N→S) */
const rotated = (d: Direction, seats: number): Direction =>
  directionAll[((index(d) + seats) % 4 + 4) % 4]!

const pairDirection = (d: Direction): PairDirection =>
  d === 'N' || d === 'S' ? 'NS' : 'EW'

export const Direction = {
  North, East, South, West,
  all: directionAll,
  isDirection,
  toPBN, fromPBN,
  name,
  dealer, next, previous, partner, rotated,
  pairDirection,
}

Direction satisfies PBNCodable<Direction>
