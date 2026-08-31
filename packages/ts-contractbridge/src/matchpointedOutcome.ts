import { DealOutcome } from './dealOutcome.js'
import { DeclaredContract } from './declaredContract.js'
import { PairDirection } from './direction.js'

export type MatchpointedOutcome = {
  readonly dealOutcome: DealOutcome
  readonly outcomeFrequency: number
  readonly nsMatchpoints: number
  readonly maxMatchpoints: number
}

const make = (
  dealOutcome: DealOutcome, outcomeFrequency: number, nsMatchpoints: number, maxMatchpoints: number
): MatchpointedOutcome =>
  ({ dealOutcome, outcomeFrequency, nsMatchpoints, maxMatchpoints })

const ewMatchpoints = (mo: MatchpointedOutcome): number => mo.maxMatchpoints - mo.nsMatchpoints

/** Score as a 0.0–1.0 ratio for the given pair (1.0 == 100%). A single-score board is 50/50. */
const ratioScore = (mo: MatchpointedOutcome, pairDirection: PairDirection): number => {
  if (mo.maxMatchpoints <= 0) return 0.5
  return (pairDirection === 'NS' ? mo.nsMatchpoints : ewMatchpoints(mo)) / mo.maxMatchpoints
}

// Tiebreak order when nsMatchpoints are equal and the outcomes aren't both `played` (which
// instead tiebreak on DeclaredContract).
const matchpointSortOrder = (o: DealOutcome): number => {
  switch (o.kind) {
    case 'played':       return 0
    case 'scoreOnly':    return 1
    case 'passedOut':    return 2
    case 'averagePlus':  return 3
    case 'average':      return 4
    case 'averageMinus': return 5
    case 'noScore':      return 6
  }
}

/** Returns negative if a < b, positive if a > b, 0 if equal. */
const compare = (a: MatchpointedOutcome, b: MatchpointedOutcome): number => {
  if (a.nsMatchpoints !== b.nsMatchpoints) return a.nsMatchpoints - b.nsMatchpoints
  if (a.dealOutcome.kind === 'played' && b.dealOutcome.kind === 'played') {
    return DeclaredContract.compare(a.dealOutcome.declaredContract, b.dealOutcome.declaredContract)
  }
  return matchpointSortOrder(a.dealOutcome) - matchpointSortOrder(b.dealOutcome)
}

export const MatchpointedOutcome = {
  make, ewMatchpoints, ratioScore, compare,
}
