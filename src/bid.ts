import { Strain } from './strain.js'

type BidLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7'

export type Bid = `${BidLevel}${Strain}`

export namespace Bid {
  export const all: readonly Bid[] = [1, 2, 3, 4, 5, 6, 7].flatMap(level =>
    Strain.all.map(strain => `${level}${strain}` as Bid)
  )

  export const isBid = (x: string): x is Bid =>
    x.length >= 2 &&
    '1234567'.includes(x[0]!) &&
    Strain.isStrain(x.slice(1))

  export const level = (b: Bid): number => parseInt(b[0]!)

  export const strain = (b: Bid): Strain => b.slice(1) as Strain

  /** Construct a bid from level (1–7) and strain, clamped to valid range */
  export const make = (lvl: number, s: Strain): Bid => {
    const clamped = Math.max(1, Math.min(7, lvl))
    return `${clamped}${s}` as Bid
  }

  /** 0-based index matching Swift rawValue (0=1C, 1=1D, ... 34=7NT) */
  export const index = (b: Bid): number =>
    (level(b) - 1) * 5 + Strain.bridgeRank(strain(b))

  /** Compare two bids by bridge ordering */
  export const compare = (a: Bid, b: Bid): number => index(a) - index(b)

  export const name = (b: Bid): string =>
    `${level(b)} ${Strain.name(strain(b))}`
}
