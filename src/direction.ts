export type PairDirection = 'NS' | 'EW'

export namespace PairDirection {
  export const NS: PairDirection = 'NS'
  export const EW: PairDirection = 'EW'

  export const all: readonly PairDirection[] = ['NS', 'EW']

  export const directions = (pd: PairDirection): ['N', 'S'] | ['E', 'W'] =>
    pd === 'NS' ? ['N', 'S'] : ['E', 'W']

  export const opponents = (pd: PairDirection): PairDirection =>
    pd === 'NS' ? 'EW' : 'NS'
}

export type Direction = 'N' | 'E' | 'S' | 'W'

export namespace Direction {
  export const North: Direction = 'N'
  export const East:  Direction = 'E'
  export const South: Direction = 'S'
  export const West:  Direction = 'W'

  /** All four directions in clockwise order */
  export const all: readonly Direction[] = ['N', 'E', 'S', 'W']

  export const isDirection = (x: string): x is Direction =>
    x === 'N' || x === 'E' || x === 'S' || x === 'W'

  export const name = (d: Direction): string => ({
    N: 'North', E: 'East', S: 'South', W: 'West'
  })[d]

  /** 0-based index in clockwise order (N=0, E=1, S=2, W=3) */
  const index = (d: Direction): number => all.indexOf(d)

  /** The dealer for a given board number (1-based, cycles N→E→S→W) */
  export const dealer = (boardNumber: number): Direction =>
    all[(boardNumber - 1) % 4]!

  /** Next direction clockwise */
  export const next = (d: Direction): Direction =>
    all[(index(d) + 1) % 4]!

  /** Previous direction (counter-clockwise) */
  export const previous = (d: Direction): Direction =>
    all[(index(d) + 3) % 4]!

  /** Partner sits opposite */
  export const partner = (d: Direction): Direction =>
    all[(index(d) + 2) % 4]!

  export const pairDirection = (d: Direction): PairDirection =>
    d === 'N' || d === 'S' ? 'NS' : 'EW'
}
