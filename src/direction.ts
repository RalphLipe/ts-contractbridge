export type PairDirection = 'NS' | 'EW'

const pairDirectionNS: PairDirection = 'NS'
const pairDirectionEW: PairDirection = 'EW'

const pairDirectionAll: readonly PairDirection[] = ['NS', 'EW']

const pairDirectionDirections = (pd: PairDirection): ['N', 'S'] | ['E', 'W'] =>
  pd === 'NS' ? ['N', 'S'] : ['E', 'W']

const pairDirectionOpponents = (pd: PairDirection): PairDirection =>
  pd === 'NS' ? 'EW' : 'NS'

export const PairDirection = {
  NS: pairDirectionNS, EW: pairDirectionEW,
  all: pairDirectionAll,
  directions: pairDirectionDirections,
  opponents: pairDirectionOpponents,
}

export type Direction = 'N' | 'E' | 'S' | 'W'

const directionNorth: Direction = 'N'
const directionEast:  Direction = 'E'
const directionSouth: Direction = 'S'
const directionWest:  Direction = 'W'

/** All four directions in clockwise order */
const directionAll: readonly Direction[] = ['N', 'E', 'S', 'W']

const isDirection = (x: string): x is Direction =>
  x === 'N' || x === 'E' || x === 'S' || x === 'W'

const directionName = (d: Direction): string => ({
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
  North: directionNorth, East: directionEast, South: directionSouth, West: directionWest,
  all: directionAll,
  isDirection,
  name: directionName,
  dealer, next, previous, partner, rotated,
  pairDirection,
}
