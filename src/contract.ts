import { Bid } from './bid.js'
import { Strain } from './strain.js'

export type Risk = '' | 'X' | 'XX'

const riskNormal: Risk = ''
const riskDoubled: Risk = 'X'
const riskRedoubled: Risk = 'XX'

const riskAll: readonly Risk[] = ['', 'X', 'XX']

const isRisk = (s: string): s is Risk =>
  s === '' || s === 'X' || s === 'XX'

const riskName = (r: Risk): string =>
  r === '' ? 'Normal' : r === 'X' ? 'Doubled' : 'Redoubled'

const riskFromPBN = (s: string): Risk | undefined => {
  const u = s.toUpperCase()
  return isRisk(u) ? u as Risk : undefined
}

export const Risk = {
  Normal: riskNormal, Doubled: riskDoubled, Redoubled: riskRedoubled,
  all: riskAll,
  isRisk,
  name: riskName,
  fromPBN: riskFromPBN,
}

export type Contract = { readonly bid: Bid; readonly risk: Risk }

// ─── Score calculation ──────────────────────────────────────────────────────
// Private implementation of Contract.declarerScore; ported from Swift's (internal)
// ScoreCalculator. Score is relative to the declarer: negative if tricksTaken is
// short of the contract, positive otherwise.

const trickScore = (strain: Strain): number =>
  strain === 'C' || strain === 'D' ? 20 : 30

const firstTrickScore = (strain: Strain): number =>
  strain === 'NT' ? 40 : trickScore(strain)

const slamBonus = (level: number, isVul: boolean): number => {
  if (level === 6) return isVul ? 750 : 500
  if (level === 7) return isVul ? 1500 : 1000
  return 0
}

const overTrickScore = (risk: Risk, strain: Strain, isVul: boolean): number => {
  switch (risk) {
    case '':   return trickScore(strain)
    case 'X':  return isVul ? 200 : 100
    case 'XX': return isVul ? 400 : 200
  }
}

const insultBonus = (risk: Risk): number =>
  risk === '' ? 0 : risk === 'X' ? 50 : 100

const makingMultiplier = (risk: Risk): number =>
  risk === '' ? 1 : risk === 'X' ? 2 : 4

const makingBonus = (contractScore: number, isVul: boolean): number =>
  contractScore < 100 ? 50 : isVul ? 500 : 300

// Total score for 1, 2, and 3 under tricks, doubled, vulnerable and non-vulnerable. For
// 4-13 down the penalty is the same regardless of vulnerability: 300 per trick beyond 3.
const vulDoubledDown = [-200, -500, -800]
const nonVulDoubledDown = [-100, -300, -500]

const penaltyScore = (risk: Risk, underTrickCount: number, isVul: boolean): number => {
  if (risk === '') return underTrickCount * (isVul ? -100 : -50)
  const downScores = isVul ? vulDoubledDown : nonVulDoubledDown
  let score = downScores[Math.min(3, underTrickCount) - 1]!
  if (underTrickCount >= 4) score -= (underTrickCount - 3) * 300
  return risk === 'XX' ? score * 2 : score
}

const make = (bid: Bid, risk: Risk = ''): Contract => ({ bid, risk })

const fromBidParts = (level: number, strain: Strain, risk: Risk = ''): Contract =>
  make(Bid.make(level, strain), risk)

/** PBN string (e.g. "3NT", "4HX", "5CXX"). */
const pbn = (c: Contract): string => `${c.bid}${c.risk}`

const symbol = (c: Contract): string => `${Bid.symbol(c.bid)}${c.risk}`

const contractFromPBN = (s: string): Contract | undefined => {
  const u = s.toUpperCase()
  if (u.length < 2) return undefined
  let rest = u
  let risk: Risk = ''
  if (rest.endsWith('XX')) {
    risk = 'XX'
    rest = rest.slice(0, -2)
  } else if (rest.endsWith('X')) {
    risk = 'X'
    rest = rest.slice(0, -1)
  }
  const bid = Bid.fromPBN(rest)
  return bid === undefined ? undefined : { bid, risk }
}

/** Returns negative if a < b, positive if a > b, 0 if equal. */
const compare = (a: Contract, b: Contract): number => {
  const bidCmp = Bid.compare(a.bid, b.bid)
  if (bidCmp !== 0) return bidCmp
  const riskRank = (r: Risk) => r === '' ? 0 : r === 'X' ? 1 : 2
  return riskRank(a.risk) - riskRank(b.risk)
}

/** Score for the declarer, given tricksTaken (0-13). Negative if the contract failed. */
const declarerScore = (c: Contract, isVul: boolean, tricksTaken: number): number => {
  const level = Bid.level(c.bid)
  const strain = Bid.strain(c.bid)
  if (tricksTaken >= level + 6) {
    const contractScore = (firstTrickScore(strain) + trickScore(strain) * (level - 1)) * makingMultiplier(c.risk)
    const overScore = (tricksTaken - level - 6) * overTrickScore(c.risk, strain, isVul)
    return contractScore + overScore + makingBonus(contractScore, isVul) + slamBonus(level, isVul) + insultBonus(c.risk)
  }
  return penaltyScore(c.risk, level + 6 - tricksTaken, isVul)
}

/** Tricks taken (0-13) that produce the given declarer score, or undefined if none do. */
const tricksFor = (c: Contract, declarerScoreValue: number, isVul: boolean): number | undefined => {
  for (let tricks = 0; tricks <= 13; tricks++) {
    if (declarerScoreValue === declarerScore(c, isVul, tricks)) return tricks
  }
  return undefined
}

/** Over/under tricks (0 = made exactly, negative = down) that produced the given score. */
const overUnderTricks = (c: Contract, score: number, isVul: boolean): number | undefined => {
  const tricks = tricksFor(c, score, isVul)
  return tricks === undefined ? undefined : tricks - Bid.level(c.bid) - 6
}

export const Contract = {
  make, fromBidParts,
  pbn, symbol,
  fromPBN: contractFromPBN,
  compare,
  declarerScore, tricksFor, overUnderTricks,
}
