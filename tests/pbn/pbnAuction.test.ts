import { describe, it, expect } from 'vitest'
import { PBNAuction, PBNAuctionError } from '../../src/pbn/pbnAuction.js'
import { DeclaredContract } from '../../src/declaredContract.js'
import { Contract } from '../../src/contract.js'

describe('PBNAuction', () => {
  it('starts empty with correct dealer', () => {
    const a = PBNAuction.make('N')
    expect(a.dealer).toBe('N')
    expect(a.calls).toHaveLength(0)
    expect(PBNAuction.isEmpty(a)).toBe(true)
    expect(PBNAuction.isComplete(a)).toBe(false)
  })

  it('nextToAct starts at dealer', () => {
    expect(PBNAuction.nextToAct(PBNAuction.make('N'))).toBe('N')
    expect(PBNAuction.nextToAct(PBNAuction.make('E'))).toBe('E')
  })

  it('nextToAct advances clockwise', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.nextToAct(a)).toBe('E')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.nextToAct(a)).toBe('S')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.nextToAct(a)).toBe('W')
  })

  it('makingCall is immutable — original unchanged', () => {
    const a = PBNAuction.make('N')
    const b = PBNAuction.makingCall(a, 'Pass')
    expect(a.calls).toHaveLength(0)
    expect(b.calls).toHaveLength(1)
  })

  it('passed-out auction', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.isComplete(a)).toBe(false)
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.isComplete(a)).toBe(true)
    expect(PBNAuction.isPassedOut(a)).toBe(true)
    expect(PBNAuction.declaredContract(a)).toBeUndefined()
  })

  it('normal contract', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')  // N bids 1S
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(PBNAuction.isComplete(a)).toBe(true)
    expect(PBNAuction.isPassedOut(a)).toBe(false)
    const dc = PBNAuction.declaredContract(a)
    expect(dc).toEqual(DeclaredContract.make(Contract.make('1S'), 'N'))
  })

  it('declarer is first to bid the strain in the pair', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, 'Pass')   // N
    a = PBNAuction.makingCall(a, 'Pass')   // E
    a = PBNAuction.makingCall(a, '1S')     // S bids 1S first for NS
    a = PBNAuction.makingCall(a, 'Pass')   // W
    a = PBNAuction.makingCall(a, '2S')     // N raises to 2S
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    const dc = PBNAuction.declaredContract(a)
    expect(dc?.declarer).toBe('S')    // S bid spades first for NS
    expect(dc?.contract.bid).toBe('2S')
  })

  it('doubled contract', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '3NT')   // N
    a = PBNAuction.makingCall(a, 'X')     // E doubles
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    const dc = PBNAuction.declaredContract(a)
    expect(dc?.contract.risk).toBe('X')
    expect(dc?.contract.bid).toBe('3NT')
  })

  it('redoubled contract', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '3NT')   // N
    a = PBNAuction.makingCall(a, 'X')     // E doubles
    a = PBNAuction.makingCall(a, 'XX')    // S redoubles
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, 'Pass')
    const dc = PBNAuction.declaredContract(a)
    expect(dc?.contract.risk).toBe('XX')
  })

  it('undoingLast', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')
    a = PBNAuction.makingCall(a, 'Pass')
    const trimmed = PBNAuction.undoingLast(a)
    expect(trimmed.calls).toHaveLength(1)
    expect(a.calls).toHaveLength(2) // original unchanged
  })

  it('throws auctionAlreadyComplete', () => {
    let a = PBNAuction.make('N')
    for (let i = 0; i < 4; i++) a = PBNAuction.makingCall(a, 'Pass')
    try {
      PBNAuction.makingCall(a, 'Pass')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(PBNAuctionError)
      expect((e as PBNAuctionError).kind).toBe('auctionAlreadyComplete')
    }
  })

  it('throws insufficientBid', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '2S')
    expect(() => PBNAuction.makingCall(a, '1S')).toThrow(PBNAuctionError)
    expect(() => PBNAuction.makingCall(a, '2S')).toThrow(PBNAuctionError)
  })

  it('throws invalidDouble — no bid', () => {
    const a = PBNAuction.make('N')
    expect(() => PBNAuction.makingCall(a, 'X')).toThrow(PBNAuctionError)
  })

  it('throws invalidDouble — cannot double partner', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')  // N bids
    a = PBNAuction.makingCall(a, 'Pass')
    // S tries to double N's bid (same pair)
    expect(() => PBNAuction.makingCall(a, 'X')).toThrow(PBNAuctionError)
  })

  it('throws invalidDouble — already doubled', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')
    a = PBNAuction.makingCall(a, 'X')   // E doubles
    a = PBNAuction.makingCall(a, 'Pass')
    // W tries to double again
    expect(() => PBNAuction.makingCall(a, 'X')).toThrow(PBNAuctionError)
  })

  it('throws invalidRedouble — not doubled', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')
    a = PBNAuction.makingCall(a, 'Pass')
    expect(() => PBNAuction.makingCall(a, 'XX')).toThrow(PBNAuctionError)
  })

  it('throws invalidRedouble — wrong pair', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')    // N bids for NS
    a = PBNAuction.makingCall(a, 'X')     // E doubles
    a = PBNAuction.makingCall(a, 'Pass')  // S passes — now W is next
    // W (EW) tries to redouble NS's bid — wrong pair
    expect(() => PBNAuction.makingCall(a, 'XX')).toThrow(PBNAuctionError)
  })

  it('notes are tracked with sequential numbers', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S', 'natural')
    a = PBNAuction.makingCall(a, 'Pass')
    a = PBNAuction.makingCall(a, '2S', 'raise')
    expect(a.calls[0]!.noteNumber).toBe(1)
    expect(a.calls[1]!.noteNumber).toBeUndefined()
    expect(a.calls[2]!.noteNumber).toBe(2)
    expect(PBNAuction.hasNotes(a)).toBe(true)
  })

  it('rotated shifts dealer and all positions', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')   // N
    a = PBNAuction.makingCall(a, 'Pass') // E
    const r = PBNAuction.rotated(a, 1)
    expect(r.dealer).toBe('E')
    expect(r.calls[0]!.position).toBe('E')
    expect(r.calls[1]!.position).toBe('S')
    expect(PBNAuction.rotated(a, 4).dealer).toBe('N') // full rotation returns to start
  })

  it('hasNotes is false with no notes', () => {
    let a = PBNAuction.make('N')
    a = PBNAuction.makingCall(a, '1S')
    expect(PBNAuction.hasNotes(a)).toBe(false)
  })

  describe('toPBNSection', () => {
    it('an empty auction is just the tag line, plus "+" since it is not complete', () => {
      const a = PBNAuction.make('N')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '+'])
    })

    it('up to 4 calls fit on one body line, "+" joins them since the auction is incomplete', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', 'Pass Pass Pass +'])
    })

    it('exactly 4 calls stay on one line', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S Pass Pass Pass'])
    })

    it('breaks to a new line after every 4th call', () => {
      let a = PBNAuction.make('N')
      for (const call of ['1S', 'Pass', '2S', 'Pass', 'Pass'] as const) {
        a = PBNAuction.makingCall(a, call)
      }
      // Not complete (last 3 calls are '2S','Pass','Pass', not all Pass) — "+" joins the last line.
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S Pass 2S Pass', 'Pass +'])
    })

    it('an exact multiple of 4 calls does not add a trailing empty line', () => {
      // Constructed directly rather than via makingCall — last 3 calls are Pass, so this is
      // complete and "+" is correctly omitted; keeps this test focused on line-grouping alone.
      const calls = ['1S', 'Pass', '2S', 'Pass', '3S', 'Pass', 'Pass', 'Pass'] as const
      const a = {
        dealer: 'N' as const,
        calls: calls.map(call => ({ position: 'N' as const, call })),
      }
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S Pass 2S Pass', '3S Pass Pass Pass'])
    })

    it('notes get sequential =N= markers inline and trailing [Note] lines', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S', 'natural')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, '2S', 'raise')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual([
        '[Auction "N"]',
        '1S =1= Pass 2S =2= Pass',
        'Pass Pass',
        '[Note "1:natural"]',
        '[Note "2:raise"]',
      ])
    })

    it('recomputes note numbers fresh, ignoring a mismatched stored noteNumber', () => {
      // Constructed directly (not via makingCall) with deliberately wrong stored noteNumbers, to
      // prove toPBNSection recomputes from scratch rather than trusting the stored field.
      const a = {
        dealer: 'N' as const,
        calls: [
          { position: 'N' as const, call: '1S' as const, note: 'first note', noteNumber: 99 },
          { position: 'E' as const, call: 'Pass' as const, note: 'second note', noteNumber: 1 },
        ],
      }
      expect(PBNAuction.toPBNSection(a)).toEqual([
        '[Auction "N"]',
        '1S =1= Pass =2= +',
        '[Note "1:first note"]',
        '[Note "2:second note"]',
      ])
    })
  })

  describe('fromPBNSection', () => {
    it('parses an empty auction', () => {
      const result = PBNAuction.fromPBNSection(['[Auction "N"]'])
      expect(result).toEqual(PBNAuction.make('N'))
    })

    it('parses a simple sequence of calls', () => {
      let expected = PBNAuction.make('N')
      expected = PBNAuction.makingCall(expected, '1S')
      expected = PBNAuction.makingCall(expected, 'Pass')
      expected = PBNAuction.makingCall(expected, 'Pass')
      expected = PBNAuction.makingCall(expected, 'Pass')
      const result = PBNAuction.fromPBNSection(['[Auction "N"]', '1S Pass Pass Pass'])
      expect(result).toEqual(expected)
    })

    it('parses notes and reassociates them with the correct call', () => {
      let expected = PBNAuction.make('N')
      expected = PBNAuction.makingCall(expected, '1S', 'natural')
      expected = PBNAuction.makingCall(expected, 'Pass')
      expected = PBNAuction.makingCall(expected, '2S', 'raise')
      expected = PBNAuction.makingCall(expected, 'Pass')
      expected = PBNAuction.makingCall(expected, 'Pass')
      expected = PBNAuction.makingCall(expected, 'Pass')
      const result = PBNAuction.fromPBNSection([
        '[Auction "N"]',
        '1S =1= Pass 2S =2= Pass',
        'Pass Pass',
        '[Note "1:natural"]',
        '[Note "2:raise"]',
      ])
      expect(result).toEqual(expected)
    })

    it('expands "AP" (all pass) to enough passes to complete the auction', () => {
      const result = PBNAuction.fromPBNSection(['[Auction "N"]', '1S AP'])
      expect(result?.calls.map(ac => ac.call)).toEqual(['1S', 'Pass', 'Pass', 'Pass'])
    })

    it('round-trips through toPBNSection for a variety of auctions', () => {
      let passedOut = PBNAuction.make('N')
      for (let i = 0; i < 4; i++) passedOut = PBNAuction.makingCall(passedOut, 'Pass')

      let withNotes = PBNAuction.make('E')
      withNotes = PBNAuction.makingCall(withNotes, '1NT', 'strong notrump')  // E
      withNotes = PBNAuction.makingCall(withNotes, 'X', 'penalty')           // S doubles
      withNotes = PBNAuction.makingCall(withNotes, 'XX')                    // W redoubles (EW pair)
      withNotes = PBNAuction.makingCall(withNotes, 'Pass')                  // N
      withNotes = PBNAuction.makingCall(withNotes, 'Pass')                  // E
      withNotes = PBNAuction.makingCall(withNotes, 'Pass')                  // S

      for (const a of [PBNAuction.make('S'), passedOut, withNotes]) {
        expect(PBNAuction.fromPBNSection(PBNAuction.toPBNSection(a))).toEqual(a)
      }
    })

    it('is undefined for an empty lines array', () => {
      expect(PBNAuction.fromPBNSection([])).toBeUndefined()
    })

    it('is undefined for a non-Auction tag', () => {
      expect(PBNAuction.fromPBNSection(['[Board "1"]'])).toBeUndefined()
    })

    it('is undefined for an invalid dealer', () => {
      expect(PBNAuction.fromPBNSection(['[Auction "X"]'])).toBeUndefined()
    })

    it('is undefined for an unparseable call token', () => {
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', 'garbage'])).toBeUndefined()
    })

    it('is undefined for a note marker with no matching [Note] line', () => {
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', '1S =1= Pass Pass Pass'])).toBeUndefined()
    })

    it('is undefined for an illegal call sequence', () => {
      // 2S is not a sufficient bid over 3NT
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', '3NT 2S'])).toBeUndefined()
    })
  })

  describe('NAGs and suffixes', () => {
    it('matches the spec\'s own example: "1S !! =1= $25" imports as note + nags [3, 25], exports as "1S =1= $3 $25"', () => {
      const result = PBNAuction.fromPBNSection([
        '[Auction "N"]',
        '1S !! =1= $25 Pass Pass Pass',
        '[Note "1:some note"]',
      ])
      expect(result?.calls[0]).toEqual({
        position: 'N', call: '1S', note: 'some note', noteNumber: 1, nags: [3, 25],
      })
      expect(PBNAuction.toPBNSection(result!)).toEqual([
        '[Auction "N"]',
        '1S =1= $3 $25 Pass Pass Pass',
        '[Note "1:some note"]',
      ])
    })

    it('converts each of the six suffixes to its 1:1 NAG value', () => {
      const suffixToNag: [string, number][] = [
        ['!', 1], ['?', 2], ['!!', 3], ['??', 4], ['!?', 5], ['?!', 6],
      ]
      for (const [suffix, nag] of suffixToNag) {
        const result = PBNAuction.fromPBNSection(['[Auction "N"]', `1S ${suffix} Pass Pass Pass`])
        expect(result?.calls[0]?.nags).toEqual([nag])
      }
    })

    it('parses a raw $N NAG token directly, with no suffix involved', () => {
      const result = PBNAuction.fromPBNSection(['[Auction "N"]', '1S $7 Pass Pass Pass'])
      expect(result?.calls[0]?.nags).toEqual([7])
    })

    it('never emits a suffix on export, even for NAG values 1-6', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S', undefined, [1])
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S $1 +'])
    })

    it('sorts multiple NAGs ascending on export regardless of parse order', () => {
      const result = PBNAuction.fromPBNSection(['[Auction "N"]', '1S $25 $3 Pass Pass Pass'])
      expect(result?.calls[0]?.nags).toEqual([25, 3])
      expect(PBNAuction.toPBNSection(result!)[1]).toBe('1S $3 $25 Pass Pass Pass')
    })

    it('is undefined for a NAG value outside 0-255', () => {
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', '1S $256 Pass Pass Pass'])).toBeUndefined()
    })

    it('is undefined for a suffix/NAG with no preceding call', () => {
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', '!!'])).toBeUndefined()
      expect(PBNAuction.fromPBNSection(['[Auction "N"]', '$1'])).toBeUndefined()
    })

    it('makingCall accepts nags directly, without going through parsing', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S', undefined, [1, 3])
      expect(a.calls[0]!.nags).toEqual([1, 3])
    })

    it('an empty nags array is not stored as a field at all', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, 'Pass', undefined, [])
      expect(a.calls[0]!.nags).toBeUndefined()
    })

    it('round-trips an auction with notes and NAGs through toPBNSection/fromPBNSection', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S', 'natural', [1, 3])
      a = PBNAuction.makingCall(a, 'Pass', undefined, [7])
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.fromPBNSection(PBNAuction.toPBNSection(a))).toEqual(a)
    })
  })

  describe('"+" incomplete-auction marker', () => {
    it('toPBNSection appends "+" alone for a fresh, empty auction', () => {
      const a = PBNAuction.make('N')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '+'])
    })

    it('toPBNSection appends "+" on the same line when there is room', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S Pass +'])
    })

    it('toPBNSection starts a new line for "+" when the previous line is already full', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S')
      a = PBNAuction.makingCall(a, 'Pass')
      a = PBNAuction.makingCall(a, '2S')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', '1S Pass 2S Pass', '+'])
    })

    it('toPBNSection omits "+" for a complete auction', () => {
      let a = PBNAuction.make('N')
      for (let i = 0; i < 4; i++) a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.toPBNSection(a)).toEqual(['[Auction "N"]', 'Pass Pass Pass Pass'])
    })

    it('fromPBNSection ignores "+", leaving the auction incomplete with just the calls given', () => {
      const result = PBNAuction.fromPBNSection(['[Auction "N"]', '1S Pass +'])
      expect(result?.calls.map(ac => ac.call)).toEqual(['1S', 'Pass'])
      expect(result !== undefined && PBNAuction.isComplete(result)).toBe(false)
    })

    it('round-trips an incomplete auction through toPBNSection/fromPBNSection', () => {
      let a = PBNAuction.make('N')
      a = PBNAuction.makingCall(a, '1S')
      a = PBNAuction.makingCall(a, 'Pass')
      expect(PBNAuction.fromPBNSection(PBNAuction.toPBNSection(a))).toEqual(a)
    })
  })

  describe('fromPBNSection: "{...}" comment blocks within the body', () => {
    it('skips a single-line "{ ... }" comment on its own line, between calls', () => {
      // "{...}" detection is line-based (matching Swift): it only recognizes "{" as the first
      // content on a line, same as PBNDocument.fromPBN — not mixed inline with call tokens.
      const result = PBNAuction.fromPBNSection([
        '[Auction "N"]', '1S Pass', '{ a comment }', 'Pass Pass',
      ])
      expect(result?.calls.map(ac => ac.call)).toEqual(['1S', 'Pass', 'Pass', 'Pass'])
    })

    it('skips a multi-line comment block, including a blank line inside it', () => {
      const result = PBNAuction.fromPBNSection([
        '[Auction "N"]',
        '1S Pass',
        '{',
        'This file uses new minor forcing.',
        '',
        'TODO: still needs work',
        '}',
        '2S Pass Pass',
      ])
      expect(result?.calls.map(ac => ac.call)).toEqual(['1S', 'Pass', '2S', 'Pass', 'Pass'])
    })

    it('does not confuse note references inside a comment block with real ones', () => {
      // "=1=" here is just prose inside the comment, not an actual note marker.
      const result = PBNAuction.fromPBNSection([
        '[Auction "N"]',
        '1S =1= Pass Pass Pass',
        '[Note "1:natural"]',
        '{',
        'unrelated commentary mentioning =1= inside prose',
        '}',
      ])
      expect(result?.calls[0]).toMatchObject({ call: '1S', note: 'natural' })
      expect(result?.calls).toHaveLength(4)
    })

    it('reproduces the real-world case: notes plus a trailing multi-line comment block', () => {
      // Matches test-data/Responder Rebid.pbn's second game.
      const result = PBNAuction.fromPBNSection([
        '[Auction "S"]',
        '1C Pass 1S Pass',
        '1NT Pass 2D =1=',
        '[Note "1:New minor forcing"]',
        '{',
        'This file uses new minor forcing.',
        '',
        'TODO: How to implement conditional tests',
        '}',
      ])
      expect(result).toBeDefined()
      expect(result?.calls).toHaveLength(7)
      expect(result?.calls[6]).toMatchObject({ call: '2D', note: 'New minor forcing' })
    })
  })
})
