import { describe, it, expect } from 'vitest'
import { Auction, AuctionError } from '../src/auction.js'
import { DeclaredContract } from '../src/declaredContract.js'
import { Contract } from '../src/contract.js'

describe('Auction', () => {
  it('starts empty with correct dealer', () => {
    const a = Auction.make('N')
    expect(a.dealer).toBe('N')
    expect(a.calls).toHaveLength(0)
    expect(Auction.isEmpty(a)).toBe(true)
    expect(Auction.isComplete(a)).toBe(false)
  })

  it('nextToAct starts at dealer', () => {
    expect(Auction.nextToAct(Auction.make('N'))).toBe('N')
    expect(Auction.nextToAct(Auction.make('E'))).toBe('E')
  })

  it('nextToAct advances clockwise', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.nextToAct(a)).toBe('E')
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.nextToAct(a)).toBe('S')
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.nextToAct(a)).toBe('W')
  })

  it('makeCall is immutable — original unchanged', () => {
    const a = Auction.make('N')
    const b = Auction.makeCall(a, 'Pass')
    expect(a.calls).toHaveLength(0)
    expect(b.calls).toHaveLength(1)
  })

  it('passed-out auction', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.isComplete(a)).toBe(false)
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.isComplete(a)).toBe(true)
    expect(Auction.isPassedOut(a)).toBe(true)
    expect(Auction.declaredContract(a)).toBeUndefined()
  })

  it('normal contract', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')  // N bids 1S
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    expect(Auction.isComplete(a)).toBe(true)
    expect(Auction.isPassedOut(a)).toBe(false)
    const dc = Auction.declaredContract(a)
    expect(dc).toEqual(DeclaredContract.make(Contract.make('1S'), 'N'))
  })

  it('declarer is first to bid the strain in the pair', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, 'Pass')   // N
    a = Auction.makeCall(a, 'Pass')   // E
    a = Auction.makeCall(a, '1S')     // S bids 1S first for NS
    a = Auction.makeCall(a, 'Pass')   // W
    a = Auction.makeCall(a, '2S')     // N raises to 2S
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    const dc = Auction.declaredContract(a)
    expect(dc?.declarer).toBe('S')    // S bid spades first for NS
    expect(dc?.contract.bid).toBe('2S')
  })

  it('doubled contract', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '3NT')   // N
    a = Auction.makeCall(a, 'X')     // E doubles
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    const dc = Auction.declaredContract(a)
    expect(dc?.contract.risk).toBe('X')
    expect(dc?.contract.bid).toBe('3NT')
  })

  it('redoubled contract', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '3NT')   // N
    a = Auction.makeCall(a, 'X')     // E doubles
    a = Auction.makeCall(a, 'XX')    // S redoubles
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, 'Pass')
    const dc = Auction.declaredContract(a)
    expect(dc?.contract.risk).toBe('XX')
  })

  it('removeLast', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')
    a = Auction.makeCall(a, 'Pass')
    const trimmed = Auction.removeLast(a)
    expect(trimmed.calls).toHaveLength(1)
    expect(a.calls).toHaveLength(2) // original unchanged
  })

  it('throws auctionAlreadyComplete', () => {
    let a = Auction.make('N')
    for (let i = 0; i < 4; i++) a = Auction.makeCall(a, 'Pass')
    try {
      Auction.makeCall(a, 'Pass')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuctionError)
      expect((e as AuctionError).kind).toBe('auctionAlreadyComplete')
    }
  })

  it('throws insufficientBid', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '2S')
    expect(() => Auction.makeCall(a, '1S')).toThrow(AuctionError)
    expect(() => Auction.makeCall(a, '2S')).toThrow(AuctionError)
  })

  it('throws invalidDouble — no bid', () => {
    const a = Auction.make('N')
    expect(() => Auction.makeCall(a, 'X')).toThrow(AuctionError)
  })

  it('throws invalidDouble — cannot double partner', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')  // N bids
    a = Auction.makeCall(a, 'Pass')
    // S tries to double N's bid (same pair)
    expect(() => Auction.makeCall(a, 'X')).toThrow(AuctionError)
  })

  it('throws invalidDouble — already doubled', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')
    a = Auction.makeCall(a, 'X')   // E doubles
    a = Auction.makeCall(a, 'Pass')
    // W tries to double again
    expect(() => Auction.makeCall(a, 'X')).toThrow(AuctionError)
  })

  it('throws invalidRedouble — not doubled', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')
    a = Auction.makeCall(a, 'Pass')
    expect(() => Auction.makeCall(a, 'XX')).toThrow(AuctionError)
  })

  it('throws invalidRedouble — wrong pair', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')    // N bids for NS
    a = Auction.makeCall(a, 'X')     // E doubles
    a = Auction.makeCall(a, 'Pass')  // S passes — now W is next
    // W (EW) tries to redouble NS's bid — wrong pair
    expect(() => Auction.makeCall(a, 'XX')).toThrow(AuctionError)
  })

  it('notes are tracked with sequential numbers', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S', 'natural')
    a = Auction.makeCall(a, 'Pass')
    a = Auction.makeCall(a, '2S', 'raise')
    expect(a.calls[0]!.noteNumber).toBe(1)
    expect(a.calls[1]!.noteNumber).toBeUndefined()
    expect(a.calls[2]!.noteNumber).toBe(2)
    expect(Auction.hasNotes(a)).toBe(true)
  })

  it('rotated shifts dealer and all positions', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')   // N
    a = Auction.makeCall(a, 'Pass') // E
    const r = Auction.rotated(a, 1)
    expect(r.dealer).toBe('E')
    expect(r.calls[0]!.position).toBe('E')
    expect(r.calls[1]!.position).toBe('S')
    expect(Auction.rotated(a, 4).dealer).toBe('N') // full rotation returns to start
  })

  it('hasNotes is false with no notes', () => {
    let a = Auction.make('N')
    a = Auction.makeCall(a, '1S')
    expect(Auction.hasNotes(a)).toBe(false)
  })
})
