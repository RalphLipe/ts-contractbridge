import { Bid } from './bid.js'
import { Call } from './call.js'
import { Contract, Risk } from './contract.js'
import { DeclaredContract } from './declaredContract.js'
import { Direction } from './direction.js'
import { formatTagLine, parseTagLine } from './pbn/tagLine.js'
import type { PBNSectionCodable } from './pbn/pbnSectionCodable.js'

export class AuctionError extends Error {
  constructor(
    readonly kind: 'auctionAlreadyComplete' | 'insufficientBid' | 'invalidDouble' | 'invalidRedouble',
    message: string
  ) {
    super(message)
    this.name = 'AuctionError'
  }
}

export type AuctionCall = {
  readonly id: number
  readonly position: Direction
  readonly call: Call
  readonly note?: string
  readonly noteNumber?: number
}

export type Auction = {
  readonly dealer: Direction
  readonly calls: readonly AuctionCall[]
}

const make = (dealer: Direction): Auction => ({ dealer, calls: [] })

const isEmpty = (a: Auction): boolean => a.calls.length === 0

const isComplete = (a: Auction): boolean =>
  a.calls.length >= 4 && a.calls.slice(-3).every(ac => ac.call === 'Pass')

const nextToAct = (a: Auction): Direction => {
  const last = a.calls[a.calls.length - 1]
  return last === undefined ? a.dealer : Direction.next(last.position)
}

const hasNotes = (a: Auction): boolean => a.calls.some(ac => ac.note !== undefined)

const declaredContract = (a: Auction): DeclaredContract | undefined => {
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

const isPassedOut = (a: Auction): boolean =>
  isComplete(a) && declaredContract(a) === undefined

function validateCall(a: Auction, call: Call, caller: Direction): void {
  if (call === 'Pass') return

  if (Call.isBid(call)) {
    const current = declaredContract(a)
    if (current !== undefined && Bid.compare(call, current.contract.bid) <= 0) {
      throw new AuctionError('insufficientBid', 'Bid must be higher than the current bid')
    }
    return
  }

  if (call === 'X') {
    const current = declaredContract(a)
    if (current === undefined) {
      throw new AuctionError('invalidDouble', 'No bid to double')
    }
    if (current.contract.risk !== '') {
      throw new AuctionError('invalidDouble', 'Contract already doubled or redoubled')
    }
    if (Direction.pairDirection(current.declarer) === Direction.pairDirection(caller)) {
      throw new AuctionError('invalidDouble', "Cannot double partner's bid")
    }
    return
  }

  if (call === 'XX') {
    const current = declaredContract(a)
    if (current === undefined || current.contract.risk !== 'X') {
      throw new AuctionError('invalidRedouble', 'Contract must be doubled to redouble')
    }
    if (Direction.pairDirection(current.declarer) !== Direction.pairDirection(caller)) {
      throw new AuctionError('invalidRedouble', "Can only redouble own partnership's bid")
    }
    return
  }
}

/** Returns a new Auction with the call appended, or throws AuctionError if invalid. */
const makingCall = (a: Auction, call: Call, note?: string): Auction => {
  if (isComplete(a)) throw new AuctionError('auctionAlreadyComplete', 'Auction is already complete')

  const caller = nextToAct(a)
  validateCall(a, call, caller)

  const lastNoteNumber = Math.max(0, ...a.calls.map(ac => ac.noteNumber ?? 0))
  const noteNumber = note !== undefined ? lastNoteNumber + 1 : undefined
  const newCall: AuctionCall = {
    id: a.calls.length,
    position: caller,
    call,
    ...(note !== undefined && { note }),
    ...(noteNumber !== undefined && { noteNumber }),
  }
  return { ...a, calls: [...a.calls, newCall] }
}

/** Returns a new Auction with the last call removed. */
const undoingLast = (a: Auction): Auction =>
  ({ ...a, calls: a.calls.slice(0, -1) })

const rotated = (a: Auction, seats: number): Auction => ({
  dealer: Direction.rotated(a.dealer, seats),
  calls: a.calls.map(ac => ({ ...ac, position: Direction.rotated(ac.position, seats) }))
})

// Encodes the whole [Auction "D"] section: tag line, then body lines of up to 4 calls each
// (blank calls array produces no body at all), followed by one [Note "N:text"] line per note.
// Note numbers are computed fresh here (the order notes are encountered during this pass), not
// from AuctionCall.noteNumber — that field can develop gaps if an earlier note's call is later
// removed via undoingLast, and Swift's own serialization recomputes fresh too.
const toPBNSection = (a: Auction): string[] => {
  const lines: string[] = [formatTagLine({ name: 'Auction', value: Direction.toPBN(a.dealer) })]
  const notes: string[] = []
  let currentLine = ''
  a.calls.forEach((ac, index) => {
    let token = Call.toPBN(ac.call)
    if (ac.note !== undefined) {
      notes.push(ac.note)
      token += ` =${notes.length}=`
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

type RawAnnotatedToken = { value: string; note?: string }

// Decodes an [Auction "D"] section built by toPBNSection (or a real PBN file's equivalent).
// Returns undefined for anything malformed: bad tag line, unrecognized dealer, an unparseable
// call token, a note marker with no matching [Note] line, or an illegal call sequence (a caught
// AuctionError from makingCall) — matching this codebase's usual "T | undefined" convention
// rather than inventing a new AuctionError kind just for "unparseable input."
const fromPBNSection = (lines: readonly string[]): Auction | undefined => {
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

  // Fold "=N=" note markers into the token they follow, per the PBN convention — they don't
  // create tokens of their own.
  const rawTokens = bodyLines.join(' ').split(/\s+/).filter(t => t.length > 0)
  const tokens: RawAnnotatedToken[] = []
  for (const raw of rawTokens) {
    if (/^=\d+=$/.test(raw)) {
      const note = notesByKey.get(raw)
      const last = tokens[tokens.length - 1]
      if (note === undefined || last === undefined) return undefined
      last.note = note
    } else {
      tokens.push({ value: raw })
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
      auction = makingCall(auction, call, token.note)
    }
  } catch {
    return undefined
  }

  return auction
}

export const Auction = {
  make, isEmpty, isComplete, nextToAct, hasNotes, declaredContract,
  isPassedOut, makingCall, undoingLast, rotated, toPBNSection, fromPBNSection,
}

Auction satisfies PBNSectionCodable<Auction>
