import { Direction } from './direction.js'
import { PairDirection } from './direction.js'

export type Vulnerable = 'None' | 'NS' | 'EW' | 'All'

const None: Vulnerable = 'None'
const NS:   Vulnerable = 'NS'
const EW:   Vulnerable = 'EW'
const All:  Vulnerable = 'All'

// Order must stay None=0, NS=1, EW=2, All=3 — used for board number calculation
const all: readonly Vulnerable[] = ['None', 'NS', 'EW', 'All']

const isVulnerable = (x: string): x is Vulnerable =>
  x === 'None' || x === 'NS' || x === 'EW' || x === 'All'

/** Vulnerability for a given board number (1-based) */
const fromBoardNumber = (boardNumber: number): Vulnerable => {
  const b = boardNumber - 1
  return all[(b + Math.floor(b / 4)) % 4]!
}

const isVulPair = (v: Vulnerable, pair: PairDirection): boolean =>
  v === 'All' || (v === 'NS' && pair === 'NS') || (v === 'EW' && pair === 'EW')

const isVulDirection = (v: Vulnerable, direction: Direction): boolean =>
  isVulPair(v, Direction.pairDirection(direction))

export const Vulnerable = {
  None, NS, EW, All,
  all,
  isVulnerable, fromBoardNumber, isVulPair, isVulDirection,
}
