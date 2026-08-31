import { DealOutcome } from './dealOutcome.js'
import { MatchpointedOutcome } from './matchpointedOutcome.js'
import { Vulnerable } from './vulnerable.js'

// TODO (carried over from Swift): this ignores DealOutcomes with no N/S score (AVE, AVE+, AVE-,
// NoScore) entirely rather than factoring them into the field the way real matchpoint scoring
// (Ave = 50%, etc) would. Matches the Swift implementation's known limitation for now.

/** Standard matchpoint scoring: for n sorted scores, the lowest scores 0, the highest scores
 *  n-1, and ties split the points they'd have earned evenly. */
const scoreMatchpoints = (sortedScores: readonly number[]): Map<number, number> => {
  const matchpoints = new Map<number, number>()
  if (sortedScores.length === 0) return matchpoints
  let lastScore = sortedScores[0]!
  let countSameScore = 1
  let placePoints = 0
  for (let i = 1; i < sortedScores.length; i++) {
    if (sortedScores[i] === lastScore) {
      placePoints += i
      countSameScore += 1
    } else {
      matchpoints.set(lastScore, placePoints / countSameScore)
      countSameScore = 1
      lastScore = sortedScores[i]!
      placePoints = i
    }
  }
  matchpoints.set(lastScore, placePoints / countSameScore)
  return matchpoints
}

/** Matchpoints every DealOutcome in the field against each other for a given vulnerability.
 *  DealOutcomes with no N/S score (AVE, AVE+, AVE-, NoScore) are excluded from the field.
 *  Structurally identical outcomes (same PBN string) are merged into one MatchpointedOutcome
 *  with outcomeFrequency counting how many times that result occurred. */
const matchpoint = (dealOutcomes: readonly DealOutcome[], vulnerable: Vulnerable): MatchpointedOutcome[] => {
  const sortedScores = dealOutcomes
    .map(o => DealOutcome.nsScore(o, vulnerable))
    .filter((s): s is number => s !== undefined)
    .sort((a, b) => a - b)
  const matchpoints = scoreMatchpoints(sortedScores)
  const maxPoints = sortedScores.length - 1

  const results = new Map<string, MatchpointedOutcome>()
  for (const outcome of dealOutcomes) {
    const nsScore = DealOutcome.nsScore(outcome, vulnerable)
    if (nsScore === undefined) continue
    const mp = matchpoints.get(nsScore)
    if (mp === undefined) continue
    const key = DealOutcome.toPBN(outcome)
    const count = (results.get(key)?.outcomeFrequency ?? 0) + 1
    results.set(key, MatchpointedOutcome.make(outcome, count, mp, maxPoints))
  }
  return [...results.values()].sort(MatchpointedOutcome.compare)
}

export const MatchpointCalculator = {
  matchpoint,
}
