import { Bid } from './bid.js'
import { Call } from './call.js'
import { Contract, Risk } from './contract.js'
import { DeclaredContract } from './declaredContract.js'
import { Direction } from './direction.js'

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

export namespace Auction {
  export const make = (dealer: Direction): Auction => ({ dealer, calls: [] })

  export const isEmpty = (a: Auction): boolean => a.calls.length === 0

  export const isComplete = (a: Auction): boolean =>
    a.calls.length >= 4 && a.calls.slice(-3).every(ac => ac.call === 'Pass')

  export const nextToAct = (a: Auction): Direction => {
    const last = a.calls[a.calls.length - 1]
    return last === undefined ? a.dealer : Direction.next(last.position)
  }

  export const hasNotes = (a: Auction): boolean => a.calls.some(ac => ac.note !== undefined)

  export const declaredContract = (a: Auction): DeclaredContract | undefined => {
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

  export const isPassedOut = (a: Auction): boolean =>
    isComplete(a) && declaredContract(a) === undefined

  /** Returns a new Auction with the call appended, or throws AuctionError if invalid. */
  export const makingCall = (a: Auction, call: Call, note?: string): Auction => {
    if (isComplete(a)) throw new AuctionError('auctionAlreadyComplete', 'Auction is already complete')

    const caller = nextToAct(a)
    validateCall(a, call, caller)

    const lastNoteNumber = Math.max(0, ...a.calls.map(ac => ac.noteNumber ?? 0))
    const noteNumber = note !== undefined ? lastNoteNumber + 1 : undefined
    const newCall: AuctionCall = { id: a.calls.length, position: caller, call, note, noteNumber }
    return { ...a, calls: [...a.calls, newCall] }
  }

  /** Returns a new Auction with the last call removed. */
  export const undoingLast = (a: Auction): Auction =>
    ({ ...a, calls: a.calls.slice(0, -1) })

  export const rotated = (a: Auction, seats: number): Auction => ({
    dealer: Direction.rotated(a.dealer, seats),
    calls: a.calls.map(ac => ({ ...ac, position: Direction.rotated(ac.position, seats) }))
  })
}

function validateCall(a: Auction, call: Call, caller: Direction): void {
  if (call === 'Pass') return

  if (Call.isBid(call)) {
    const current = Auction.declaredContract(a)
    if (current !== undefined && Bid.compare(call, current.contract.bid) <= 0) {
      throw new AuctionError('insufficientBid', 'Bid must be higher than the current bid')
    }
    return
  }

  if (call === 'X') {
    const current = Auction.declaredContract(a)
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
    const current = Auction.declaredContract(a)
    if (current === undefined || current.contract.risk !== 'X') {
      throw new AuctionError('invalidRedouble', 'Contract must be doubled to redouble')
    }
    if (Direction.pairDirection(current.declarer) !== Direction.pairDirection(caller)) {
      throw new AuctionError('invalidRedouble', "Can only redouble own partnership's bid")
    }
    return
  }
}
