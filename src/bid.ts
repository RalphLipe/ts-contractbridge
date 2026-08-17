import { Strain } from './strain.js'

type BidLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7'

export type Bid = `${BidLevel}${Strain}`

const all: readonly Bid[] = [1, 2, 3, 4, 5, 6, 7].flatMap(level =>
  Strain.all.map(strain => `${level}${strain}` as Bid)
)

const isBid = (x: string): x is Bid =>
  x.length >= 2 &&
  '1234567'.includes(x[0]!) &&
  Strain.isStrain(x.slice(1))

const level = (b: Bid): number => parseInt(b[0]!)

const strain = (b: Bid): Strain => b.slice(1) as Strain

/** Construct a bid from level (1–7) and strain, clamped to valid range */
const make = (lvl: number, s: Strain): Bid => {
  const clamped = Math.max(1, Math.min(7, lvl))
  return `${clamped}${s}` as Bid
}

/** 0-based index matching Swift rawValue (0=1C, 1=1D, ... 34=7NT) */
const index = (b: Bid): number =>
  (level(b) - 1) * 5 + Strain.bridgeRank(strain(b))

/** Compare two bids by bridge ordering */
const compare = (a: Bid, b: Bid): number => index(a) - index(b)

const name = (b: Bid): string =>
  `${level(b)} ${Strain.name(strain(b))}`

const symbol = (b: Bid): string =>
  `${level(b)}${Strain.symbol(strain(b))}`

/** Parse a PBN bid string (e.g. "3NT", "1C"). Returns undefined if invalid. */
const fromPBN = (s: string): Bid | undefined =>
  isBid(s) ? s : undefined

export const Bid = {
  all, isBid, level, strain, make, index, compare, name, symbol, fromPBN,
}
