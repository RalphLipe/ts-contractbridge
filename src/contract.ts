import { Bid } from './bid.js'
import { Strain } from './strain.js'

export type Risk = '' | 'X' | 'XX'

export namespace Risk {
  export const Normal: Risk = ''
  export const Doubled: Risk = 'X'
  export const Redoubled: Risk = 'XX'

  export const all: readonly Risk[] = ['', 'X', 'XX']

  export const isRisk = (s: string): s is Risk =>
    s === '' || s === 'X' || s === 'XX'

  export const name = (r: Risk): string =>
    r === '' ? 'Normal' : r === 'X' ? 'Doubled' : 'Redoubled'

  export const fromPBN = (s: string): Risk | undefined => {
    const u = s.toUpperCase()
    return isRisk(u) ? u as Risk : undefined
  }
}

export type Contract = { readonly bid: Bid; readonly risk: Risk }

export namespace Contract {
  export const make = (bid: Bid, risk: Risk = ''): Contract => ({ bid, risk })

  export const fromBidParts = (level: number, strain: Strain, risk: Risk = ''): Contract =>
    make(Bid.make(level, strain), risk)

  /** PBN string (e.g. "3NT", "4HX", "5CXX"). */
  export const pbn = (c: Contract): string => `${c.bid}${c.risk}`

  export const symbol = (c: Contract): string => `${Bid.symbol(c.bid)}${c.risk}`

  export const fromPBN = (s: string): Contract | undefined => {
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
  export const compare = (a: Contract, b: Contract): number => {
    const bidCmp = Bid.compare(a.bid, b.bid)
    if (bidCmp !== 0) return bidCmp
    const riskRank = (r: Risk) => r === '' ? 0 : r === 'X' ? 1 : 2
    return riskRank(a.risk) - riskRank(b.risk)
  }
}
