import { Bid } from '../bid.js'
import { Call } from '../call.js'
import { Contract, Risk } from '../contract.js'
import { DeclaredContract } from '../declaredContract.js'
import { Direction } from '../direction.js'
import { formatTagLine, parseTagLine } from './tagLine.js'
import type { PBNSectionCodable } from './pbnSectionCodable.js'

export class PBNAuctionError extends Error {
  constructor(
    readonly kind: 'auctionAlreadyComplete' | 'insufficientBid' | 'invalidDouble' | 'invalidRedouble',
    message: string
  ) {
    super(message)
    this.name = 'PBNAuctionError'
  }
}

export type PBNAuctionCall = {
  readonly id: number
  readonly position: Direction
  readonly call: Call
  readonly note?: string
  readonly noteNumber?: number
  // Numeric Annotation Glyphs (0-255) — PBN's language-independent per-call evaluation, e.g. "good
  // call" ($1) or "very poor call" ($4). A call may carry zero or more, alongside its note.
  readonly nags?: readonly number[]
}

// The six PBN suffix annotations (!, ?, !!, ??, !?, ?!) are 1:1 shorthand for NAG values 1-6.
// Import format accepts either form; export format always canonicalizes to the numeric $N form
// (per the spec), so a suffix is converted to its NAG on parse and never stored/emitted as such.
const suffixToNag: Readonly<Record<string, number>> = {
  '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6,
}

export type PBNAuction = {
  readonly dealer: Direction
  readonly calls: readonly PBNAuctionCall[]
}

const make = (dealer: Direction): PBNAuction => ({ dealer, calls: [] })

const isEmpty = (a: PBNAuction): boolean => a.calls.length === 0

const isComplete = (a: PBNAuction): boolean =>
  a.calls.length >= 4 && a.calls.slice(-3).every(ac => ac.call === 'Pass')

const nextToAct = (a: PBNAuction): Direction => {
  const last = a.calls[a.calls.length - 1]
  return last === undefined ? a.dealer : Direction.next(last.position)
}

const hasNotes = (a: PBNAuction): boolean => a.calls.some(ac => ac.note !== undefined)

const declaredContract = (a: PBNAuction): DeclaredContract | undefined => {
  let contractBid: Bid | undefined
  let bidderPair: ReturnType<typeof Direction.pairDirection> | undefined
  let risk: Risk = ''

  // Scan backwards: find last bid and accumulate risk
  for (let i = a.calls.length - 1; i >= 0; i--) {
    const ac = a.calls[i]!
    if (Call.isBid(ac.call)) {
      contractBid = ac.call
      bidderPair = Direction.pairDirection(ac.position)
      break
    } else if (ac.call === 'XX') {
      risk = 'XX'
    } else if (ac.call === 'X' && risk === '') {
      risk = 'X'
    }
  }

  if (contractBid === undefined || bidderPair === undefined) return undefined

  // Find who first bid the contract strain within that pair
  const strain = Bid.strain(contractBid)
  for (const ac of a.calls) {
    if (Call.isBid(ac.call) &&
        Bid.strain(ac.call) === strain &&
        Direction.pairDirection(ac.position) === bidderPair) {
      return DeclaredContract.make(Contract.make(contractBid, risk), ac.position)
    }
  }
  return undefined
}

const isPassedOut = (a: PBNAuction): boolean =>
  isComplete(a) && declaredContract(a) === undefined

function validateCall(a: PBNAuction, call: Call, caller: Direction): void {
  if (call === 'Pass') return

  if (Call.isBid(call)) {
    const current = declaredContract(a)
    if (current !== undefined && Bid.compare(call, current.contract.bid) <= 0) {
      throw new PBNAuctionError('insufficientBid', 'Bid must be higher than the current bid')
    }
    return
  }

  if (call === 'X') {
    const current = declaredContract(a)
    if (current === undefined) {
      throw new PBNAuctionError('invalidDouble', 'No bid to double')
    }
    if (current.contract.risk !== '') {
      throw new PBNAuctionError('invalidDouble', 'Contract already doubled or redoubled')
    }
    if (Direction.pairDirection(current.declarer) === Direction.pairDirection(caller)) {
      throw new PBNAuctionError('invalidDouble', "Cannot double partner's bid")
    }
    return
  }

  if (call === 'XX') {
    const current = declaredContract(a)
    if (current === undefined || current.contract.risk !== 'X') {
      throw new PBNAuctionError('invalidRedouble', 'Contract must be doubled to redouble')
    }
    if (Direction.pairDirection(current.declarer) !== Direction.pairDirection(caller)) {
      throw new PBNAuctionError('invalidRedouble', "Can only redouble own partnership's bid")
    }
    return
  }
}

/** Returns a new PBNAuction with the call appended, or throws PBNAuctionError if invalid. */
const makingCall = (a: PBNAuction, call: Call, note?: string, nags?: readonly number[]): PBNAuction => {
  if (isComplete(a)) throw new PBNAuctionError('auctionAlreadyComplete', 'Auction is already complete')

  const caller = nextToAct(a)
  validateCall(a, call, caller)

  const lastNoteNumber = Math.max(0, ...a.calls.map(ac => ac.noteNumber ?? 0))
  const noteNumber = note !== undefined ? lastNoteNumber + 1 : undefined
  const newCall: PBNAuctionCall = {
    id: a.calls.length,
    position: caller,
    call,
    ...(note !== undefined && { note }),
    ...(noteNumber !== undefined && { noteNumber }),
    ...(nags !== undefined && nags.length > 0 && { nags }),
  }
  return { ...a, calls: [...a.calls, newCall] }
}

/** Returns a new PBNAuction with the last call removed. */
const undoingLast = (a: PBNAuction): PBNAuction =>
  ({ ...a, calls: a.calls.slice(0, -1) })

const rotated = (a: PBNAuction, seats: number): PBNAuction => ({
  dealer: Direction.rotated(a.dealer, seats),
  calls: a.calls.map(ac => ({ ...ac, position: Direction.rotated(ac.position, seats) }))
})

// Encodes the whole [Auction "D"] section: tag line, then body lines of up to 4 calls each
// (blank calls array produces no body at all), followed by one [Note "N:text"] line per note.
// Note numbers are computed fresh here (the order notes are encountered during this pass), not
// from PBNAuctionCall.noteNumber — that field can develop gaps if an earlier note's call is later
// removed via undoingLast, and Swift's own serialization recomputes fresh too.
const toPBNSection = (a: PBNAuction): string[] => {
  const lines: string[] = [formatTagLine({ name: 'Auction', value: Direction.toPBN(a.dealer) })]
  const notes: string[] = []
  let currentLine = ''
  a.calls.forEach((ac, index) => {
    let token = Call.toPBN(ac.call)
    // Export order per the spec: note reference, then NAGs in ascending order — never a suffix.
    if (ac.note !== undefined) {
      notes.push(ac.note)
      token += ` =${notes.length}=`
    }
    if (ac.nags !== undefined && ac.nags.length > 0) {
      token += [...ac.nags].sort((x, y) => x - y).map(nag => ` $${nag}`).join('')
    }
    currentLine += currentLine === '' ? token : ` ${token}`
    if ((index + 1) % 4 === 0 || index === a.calls.length - 1) {
      lines.push(currentLine)
      currentLine = ''
    }
  })
  notes.forEach((note, i) => {
    lines.push(formatTagLine({ name: 'Note', value: `${i + 1}:${note}` }))
  })
  return lines
}

type RawAnnotatedToken = { value: string; note?: string; nags: number[] }

// Decodes an [Auction "D"] section built by toPBNSection (or a real PBN file's equivalent).
// Returns undefined for anything malformed: bad tag line, unrecognized dealer, an unparseable
// call token, a note marker with no matching [Note] line, or an illegal call sequence (a caught
// PBNAuctionError from makingCall) — matching this codebase's usual "T | undefined" convention
// rather than inventing a new PBNAuctionError kind just for "unparseable input."
const fromPBNSection = (lines: readonly string[]): PBNAuction | undefined => {
  const first = lines[0]
  if (first === undefined) return undefined
  const tag = parseTagLine(first)
  if (tag === undefined || tag.name.toLowerCase() !== 'auction') return undefined
  const dealer = Direction.fromPBN(tag.value)
  if (dealer === undefined) return undefined

  // Separate trailing [Note "N:text"] lines (keyed by their "=N=" marker) from body text.
  const notesByKey = new Map<string, string>()
  const bodyLines: string[] = []
  for (const line of lines.slice(1)) {
    const lineTag = parseTagLine(line)
    if (lineTag !== undefined && lineTag.name.toLowerCase() === 'note') {
      const colonIndex = lineTag.value.indexOf(':')
      if (colonIndex === -1) return undefined
      const id = lineTag.value.slice(0, colonIndex).trim()
      notesByKey.set(`=${id}=`, lineTag.value.slice(colonIndex + 1).trim())
    } else {
      bodyLines.push(line)
    }
  }

  // Fold "=N=" note markers, suffixes (!, ?, !!, ??, !?, ?!), and "$N" NAGs into the token they
  // follow, per the PBN convention — none of these create tokens of their own. Import format
  // allows these in any order and any combination (a call can carry a note AND multiple NAGs).
  const rawTokens = bodyLines.join(' ').split(/\s+/).filter(t => t.length > 0)
  const tokens: RawAnnotatedToken[] = []
  for (const raw of rawTokens) {
    if (/^=\d+=$/.test(raw)) {
      const note = notesByKey.get(raw)
      const last = tokens[tokens.length - 1]
      if (note === undefined || last === undefined) return undefined
      last.note = note
    } else if (raw in suffixToNag) {
      const last = tokens[tokens.length - 1]
      if (last === undefined) return undefined
      last.nags.push(suffixToNag[raw]!)
    } else if (/^\$\d+$/.test(raw)) {
      const nag = Number(raw.slice(1))
      const last = tokens[tokens.length - 1]
      if (nag > 255 || last === undefined) return undefined
      last.nags.push(nag)
    } else {
      tokens.push({ value: raw, nags: [] })
    }
  }

  let auction = make(dealer)
  try {
    for (const token of tokens) {
      if (token.value === 'AP') {
        while (!isComplete(auction)) {
          auction = makingCall(auction, 'Pass')
        }
        continue
      }
      const call = Call.fromPBN(token.value)
      if (call === undefined) return undefined
      auction = makingCall(auction, call, token.note, token.nags)
    }
  } catch {
    return undefined
  }

  return auction
}

export const PBNAuction = {
  make, isEmpty, isComplete, nextToAct, hasNotes, declaredContract,
  isPassedOut, makingCall, undoingLast, rotated, toPBNSection, fromPBNSection,
}

PBNAuction satisfies PBNSectionCodable<PBNAuction>
