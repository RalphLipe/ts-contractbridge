import { Direction } from './direction.js'
import { PairDirection } from './direction.js'
import { PBNCodable } from './pbnCodable.js'

export type Vulnerable = 'None' | 'NS' | 'EW' | 'All'

const None: Vulnerable = 'None'
const NS:   Vulnerable = 'NS'
const EW:   Vulnerable = 'EW'
const All:  Vulnerable = 'All'

// Order must stay None=0, NS=1, EW=2, All=3 — used for board number calculation
const all: readonly Vulnerable[] = ['None', 'NS', 'EW', 'All']

const isVulnerable = (x: string): x is Vulnerable =>
  x === 'None' || x === 'NS' || x === 'EW' || x === 'All'

const toPBN = (v: Vulnerable): string => v

/** Parse a PBN vulnerability string. Accepts synonyms ("Love"/"-" for None, "Both" for All),
 *  case-insensitively. Returns undefined if invalid. */
const fromPBN = (s: string): Vulnerable | undefined => {
  switch (s.toUpperCase()) {
    case 'NONE': case 'LOVE': case '-': return 'None'
    case 'NS':                          return 'NS'
    case 'EW':                          return 'EW'
    case 'ALL':  case 'BOTH':           return 'All'
    default:                            return undefined
  }
}

/** Vulnerability for a given board number (1-based) */
const fromBoardNumber = (boardNumber: number): Vulnerable => {
  const b = boardNumber - 1
  return all[(b + Math.floor(b / 4)) % 4]!
}

const isVulPair = (v: Vulnerable, pair: PairDirection): boolean =>
  v === 'All' || (v === 'NS' && pair === 'NS') || (v === 'EW' && pair === 'EW')

const isVulDirection = (v: Vulnerable, direction: Direction): boolean =>
  isVulPair(v, Direction.pairDirection(direction))

/** None/All are unaffected by rotation; NS and EW swap on odd seats. */
const rotated = (v: Vulnerable, seats: number): Vulnerable => {
  if (v === 'All' || v === 'None' || seats % 2 === 0) return v
  return v === 'NS' ? 'EW' : 'NS'
}

export const Vulnerable = {
  None, NS, EW, All,
  all,
  isVulnerable, fromBoardNumber, isVulPair, isVulDirection,
  toPBN, fromPBN,
  rotated,
}

Vulnerable satisfies PBNCodable<Vulnerable>
