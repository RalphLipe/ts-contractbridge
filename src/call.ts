import { Bid } from './bid.js'

export type Call = Bid | 'Pass' | 'X' | 'XX'

export namespace Call {
  export const Pass: Call = 'Pass'
  export const Double: Call = 'X'
  export const Redouble: Call = 'XX'

  export const isPass = (c: Call): c is 'Pass' => c === 'Pass'
  export const isDouble = (c: Call): c is 'X' => c === 'X'
  export const isRedouble = (c: Call): c is 'XX' => c === 'XX'
  export const isBid = (c: Call): c is Bid => Bid.isBid(c)

  /** Parse PBN call string ("Pass", "-", "X", "XX", "3NT", …). Returns undefined if invalid. */
  export const fromPBN = (s: string): Call | undefined => {
    const u = s.toUpperCase()
    if (u === 'PASS' || u === '-') return 'Pass'
    if (u === 'X') return 'X'
    if (u === 'XX') return 'XX'
    return Bid.fromPBN(u)
  }

  /** PBN string representation */
  export const pbn = (c: Call): string => c

  /** Convenience: construct a bid call from level and strain */
  export const bid = (level: number, strain: Parameters<typeof Bid.make>[1]): Call =>
    Bid.make(level, strain)
}
