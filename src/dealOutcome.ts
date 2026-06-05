import { Bid } from './bid.js'
import { DeclaredContract } from './declaredContract.js'

export type DealOutcome =
  | { readonly kind: 'played';      readonly declaredContract: DeclaredContract; readonly tricksTaken: number }
  | { readonly kind: 'scoreOnly';   readonly nsScore: number }
  | { readonly kind: 'passedOut' }
  | { readonly kind: 'average' }
  | { readonly kind: 'averagePlus' }
  | { readonly kind: 'averageMinus' }
  | { readonly kind: 'noScore' }

export namespace DealOutcome {
  export const played = (declaredContract: DeclaredContract, tricksTaken: number): DealOutcome =>
    ({ kind: 'played', declaredContract, tricksTaken })

  export const scoreOnly = (nsScore: number): DealOutcome =>
    ({ kind: 'scoreOnly', nsScore })

  export const passedOut:    DealOutcome = { kind: 'passedOut' }
  export const average:      DealOutcome = { kind: 'average' }
  export const averagePlus:  DealOutcome = { kind: 'averagePlus' }
  export const averageMinus: DealOutcome = { kind: 'averageMinus' }
  export const noScore:      DealOutcome = { kind: 'noScore' }

  export const declaredContract = (o: DealOutcome): DeclaredContract | undefined =>
    o.kind === 'played' ? o.declaredContract : undefined

  /** PBN-style string representation (e.g. "3NTW=", "4HXN+1", "AVE+", "PASS", "-50"). */
  export const pbn = (o: DealOutcome): string => {
    switch (o.kind) {
      case 'played': {
        const overUnder = o.tricksTaken - (Bid.level(o.declaredContract.contract.bid) + 6)
        const suffix = overUnder === 0 ? '=' : overUnder > 0 ? `+${overUnder}` : `${overUnder}`
        return `${DeclaredContract.pbn(o.declaredContract)}${suffix}`
      }
      case 'scoreOnly':    return `${o.nsScore}`
      case 'passedOut':    return 'Pass'
      case 'average':      return 'AVE'
      case 'averagePlus':  return 'AVE+'
      case 'averageMinus': return 'AVE-'
      case 'noScore':      return 'NS'
    }
  }

  const keywords: Record<string, DealOutcome> = {
    'PASS': passedOut,
    'AVE':  average,
    'AVE+': averagePlus,
    'AVE-': averageMinus,
    'NS':   noScore,
  }

  /** Parse a PBN-style deal outcome string. Returns undefined if invalid. */
  export const fromPBN = (s: string): DealOutcome | undefined => {
    const keyword = keywords[s.toUpperCase()]
    if (keyword !== undefined) return keyword

    const asNumber = Number(s)
    if (!isNaN(asNumber) && Number.isInteger(asNumber)) return scoreOnly(asNumber)

    // Must be DeclaredContract + over/under suffix (+n, -n, =, ==)
    const splitIdx = s.search(/[+\-=]/)
    if (splitIdx === -1) return undefined
    const dcStr = s.slice(0, splitIdx)
    const suffix = s.slice(splitIdx)
    const overUnder = (suffix === '=' || suffix === '==') ? 0 : parseInt(suffix, 10)
    if (isNaN(overUnder)) return undefined
    const dc = DeclaredContract.fromPBN(dcStr)
    if (dc === undefined) return undefined
    const tricks = Bid.level(dc.contract.bid) + 6 + overUnder
    if (tricks < 0 || tricks > 13) return undefined
    return played(dc, tricks)
  }
}
