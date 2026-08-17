import { Bid } from './bid.js'

export type Call = Bid | 'Pass' | 'X' | 'XX'

const Pass: Call = 'Pass'
const Double: Call = 'X'
const Redouble: Call = 'XX'

const isPass = (c: Call): c is 'Pass' => c === 'Pass'
const isDouble = (c: Call): c is 'X' => c === 'X'
const isRedouble = (c: Call): c is 'XX' => c === 'XX'
const isBid = (c: Call): c is Bid => Bid.isBid(c)

/** Parse PBN call string ("Pass", "-", "X", "XX", "3NT", …). Returns undefined if invalid. */
const fromPBN = (s: string): Call | undefined => {
  const u = s.toUpperCase()
  if (u === 'PASS' || u === '-') return 'Pass'
  if (u === 'X') return 'X'
  if (u === 'XX') return 'XX'
  return Bid.fromPBN(u)
}

/** PBN string representation */
const pbn = (c: Call): string => c

/** Convenience: construct a bid call from level and strain */
const bid = (level: number, strain: Parameters<typeof Bid.make>[1]): Call =>
  Bid.make(level, strain)

export const Call = {
  Pass, Double, Redouble,
  isPass, isDouble, isRedouble, isBid,
  fromPBN, pbn, bid,
}
