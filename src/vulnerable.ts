import { Direction } from './direction.js'
import { PairDirection } from './direction.js'

export type Vulnerable = 'None' | 'NS' | 'EW' | 'All'

export namespace Vulnerable {
  export const None: Vulnerable = 'None'
  export const NS:   Vulnerable = 'NS'
  export const EW:   Vulnerable = 'EW'
  export const All:  Vulnerable = 'All'

  // Order must stay None=0, NS=1, EW=2, All=3 — used for board number calculation
  export const all: readonly Vulnerable[] = ['None', 'NS', 'EW', 'All']

  export const isVulnerable = (x: string): x is Vulnerable =>
    x === 'None' || x === 'NS' || x === 'EW' || x === 'All'

  /** Vulnerability for a given board number (1-based) */
  export const fromBoardNumber = (boardNumber: number): Vulnerable => {
    const b = boardNumber - 1
    return all[(b + Math.floor(b / 4)) % 4]!
  }

  export const isVulPair = (v: Vulnerable, pair: PairDirection): boolean =>
    v === 'All' || (v === 'NS' && pair === 'NS') || (v === 'EW' && pair === 'EW')

  export const isVulDirection = (v: Vulnerable, direction: Direction): boolean =>
    isVulPair(v, Direction.pairDirection(direction))
}
