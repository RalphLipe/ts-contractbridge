import { describe, it, expect } from 'vitest'
import { PBNPlay, PBNPlayError } from '../../src/pbn/pbnPlay.js'
import type { PBNPlayCard } from '../../src/pbn/pbnPlay.js'
import { DeclaredContract } from '../../src/declaredContract.js'
import { Contract } from '../../src/contract.js'
import { Card } from '../../src/card.js'
import { Rank } from '../../src/rank.js'

const declared = (pbn: string): DeclaredContract => DeclaredContract.fromPBN(pbn)!

// Declarer South, so West leads.
const threeNT = declared('3NTS')
const fourHearts = declared('4HS')

const play = (start: PBNPlay, ...cards: (string | undefined)[]): PBNPlay =>
  cards.reduce<PBNPlay>((p, c) => PBNPlay.makingCard(p, c === undefined ? undefined : Card.fromPBN(c)), start)

const errorKind = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (e) {
    return e instanceof PBNPlayError ? e.kind : 'not a PBNPlayError'
  }
  return undefined
}

// The example from section 1.2 of the PBN spec: 5HX by South, West leads, hearts are trump.
const specExampleLines = [
  '[Play "W"]',
  'SK =1= H3 S4 S3',
  'C5 C2 C6 CK',
  'S2 H6 S5 S7',
  'C8 CA CT C4',
  'D2 DA DT D3',
  'D4 DK H5 H7',
  '-  -  -  H2',
  '*',
  '[Note "1:highest of series"]',
]
const fiveHeartsDoubled = declared('5HXS')

describe('PBNPlay', () => {
  describe('making and turn order', () => {
    it('starts empty, with the declarer\'s left-hand opponent to lead', () => {
      const p = PBNPlay.make(threeNT)
      expect(PBNPlay.isEmpty(p)).toBe(true)
      expect(PBNPlay.isComplete(p)).toBe(false)
      expect(PBNPlay.openingLeader(threeNT)).toBe('W')
      expect(PBNPlay.nextToAct(p)).toBe('W')
      expect(PBNPlay.openingLeader(declared('1CW'))).toBe('N')
    })

    it('advances clockwise within a trick and records each position', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'S6', 'S7')
      expect(p.cards.map(c => c.position)).toEqual(['W', 'N', 'E'])
      expect(PBNPlay.nextToAct(p)).toBe('S')
    })

    it('lets the winner of a trick lead the next one (no trump)', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'SK', 'S7', 'S2')
      expect(PBNPlay.tricks(p)[0]!.winner).toBe('N')
      expect(PBNPlay.nextToAct(p)).toBe('N')
    })

    it('does not let an off-suit discard win a no-trump trick', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'HA', 'S7', 'S2')
      expect(PBNPlay.tricks(p)[0]!.winner).toBe('E')
    })

    it('lets a trump beat the led suit, and a higher trump beat a lower one', () => {
      const p = play(PBNPlay.make(fourHearts), 'SA', 'H2', 'SK', 'H3')
      expect(PBNPlay.tricks(p)[0]!.winner).toBe('S')
      expect(PBNPlay.nextToAct(p)).toBe('S')
    })

    it('is immutable — the original is unchanged', () => {
      const a = PBNPlay.make(threeNT)
      const b = PBNPlay.makingCard(a, 'S5')
      expect(a.cards).toHaveLength(0)
      expect(b.cards).toHaveLength(1)
    })

    it('reports a partial trick with no winner', () => {
      const tricks = PBNPlay.tricks(play(PBNPlay.make(threeNT), 'S5', 'S6'))
      expect(tricks).toHaveLength(1)
      expect(tricks[0]!.leader).toBe('W')
      expect(tricks[0]!.winner).toBeUndefined()
    })

    it('undoingLast removes the last card', () => {
      const p = PBNPlay.undoingLast(play(PBNPlay.make(threeNT), 'S5', 'S6'))
      expect(p.cards.map(c => c.card)).toEqual(['S5'])
      expect(PBNPlay.nextToAct(p)).toBe('N')
    })
  })

  describe('legitimacy', () => {
    it('rejects a card that has already been played', () => {
      const p = play(PBNPlay.make(threeNT), 'S5')
      expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S5')))).toBe('duplicateCard')
    })

    it('rejects a suit a player already showed out of, when following', () => {
      // North discards a club on West's spade lead, so North has no spades. Then West wins the
      // trick and leads again; North cannot follow with a spade.
      const p = play(PBNPlay.make(threeNT), 'SA', 'C2', 'S2', 'S3', 'SK')
      expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S4')))).toBe('revoke')
    })

    it('rejects a suit a player showed out of, even when discarding rather than following', () => {
      // North has no spades, so cannot discard one on West's later heart lead either.
      const p = play(PBNPlay.make(threeNT), 'SA', 'C2', 'S2', 'S3', 'H5')
      expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S9')))).toBe('revoke')
    })

    it('accepts a discard from the player who showed out', () => {
      const p = play(PBNPlay.make(threeNT), 'SA', 'C2', 'S2', 'S3', 'SK')
      expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('H4')))).toBeUndefined()
    })

    it('rejects a card once the play is complete', () => {
      const p = PBNPlay.terminating(play(PBNPlay.make(threeNT), 'S5'))
      expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S6')))).toBe('playAlreadyComplete')
    })

    it('rejects NAGs reserved for calls, and NAGs out of range', () => {
      const p = PBNPlay.make(threeNT)
      for (const nag of [1, 6, 13, 256, -1]) {
        expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S5'), undefined, [nag]))).toBe('invalidNag')
      }
      for (const nag of [0, 7, 12, 14, 15, 255]) {
        expect(errorKind(() => PBNPlay.makingCard(p, Card.fromPBN('S5'), undefined, [nag]))).toBeUndefined()
      }
    })
  })

  describe('a complete play', () => {
    // West holds every spade, North every heart, East every diamond, South every club. West leads
    // a spade each trick and wins it, so the whole play is legitimate, and needs no trump.
    const fullPlay = Rank.all.reduce<PBNPlay>(
      (p, r) => play(p, `S${r}`, `H${r}`, `D${r}`, `C${r}`),
      PBNPlay.make(threeNT)
    )

    it('is complete after 13 tricks, with nobody left to act', () => {
      expect(fullPlay.cards).toHaveLength(52)
      expect(PBNPlay.isComplete(fullPlay)).toBe(true)
      expect(PBNPlay.nextToAct(fullPlay)).toBeUndefined()
      expect(PBNPlay.tricks(fullPlay).every(t => t.winner === 'W')).toBe(true)
    })

    it('serializes as 13 lines of 4, with no "+" and no "*"', () => {
      const lines = PBNPlay.toPBNSection(fullPlay)
      expect(lines).toHaveLength(14)
      expect(lines[0]).toBe('[Play "W"]')
      expect(lines[1]).toBe('SA HA DA CA')
      expect(lines[13]).toBe('S2 H2 D2 C2')
    })

    it('ignores a terminating "*" — there is nothing left to terminate', () => {
      expect(PBNPlay.terminating(fullPlay).terminated).toBe(false)
    })

    it('round-trips through PBN', () => {
      expect(PBNPlay.fromPBNSection(PBNPlay.toPBNSection(fullPlay), threeNT)).toEqual(fullPlay)
    })
  })

  describe('toPBNSection', () => {
    it('writes just the tag line and a "+" for a play that has not started', () => {
      expect(PBNPlay.toPBNSection(PBNPlay.make(fourHearts))).toEqual(['[Play "W"]', '+'])
    })

    it('puts a "+" in the next slot of an unfinished play, sharing a line when there is room', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'S6', 'S7')
      expect(PBNPlay.toPBNSection(p)).toEqual(['[Play "W"]', 'S5 S6 S7 +'])
    })

    it('starts a new line for "+" when the last trick is full', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'S6', 'S7', 'S8')
      expect(PBNPlay.toPBNSection(p)).toEqual(['[Play "W"]', 'S5 S6 S7 S8', '+'])
    })

    it('writes "*" on its own line for a terminated play', () => {
      const p = PBNPlay.terminating(play(PBNPlay.make(threeNT), 'S5', 'S6'))
      expect(PBNPlay.toPBNSection(p)).toEqual(['[Play "W"]', 'S5 S6', '*'])
    })

    it('writes note references then NAGs in ascending order, and notes at the end', () => {
      let p = PBNPlay.make(threeNT)
      p = PBNPlay.makingCard(p, Card.fromPBN('SK'), 'highest of series', [14, 9])
      p = PBNPlay.makingCard(p, Card.fromPBN('S3'))
      expect(PBNPlay.toPBNSection(p)).toEqual([
        '[Play "W"]',
        'SK =1= $9 $14 S3 +',
        '[Note "1:highest of series"]',
      ])
    })

    it('numbers notes fresh, in the order met, even after an undo left a gap', () => {
      let p = play(PBNPlay.make(threeNT), 'S5')
      p = PBNPlay.makingCard(p, Card.fromPBN('S6'), 'first')
      p = PBNPlay.undoingLast(p)
      p = PBNPlay.makingCard(p, Card.fromPBN('S7'), 'second')
      const lines = PBNPlay.toPBNSection(p)
      expect(lines).toContain('[Note "1:second"]')
      expect(lines).toContain('S5 S7 =1= +')
    })

    it('writes an unknown card as "-"', () => {
      const p = play(PBNPlay.make(threeNT), undefined, 'S6')
      expect(PBNPlay.toPBNSection(p)).toEqual(['[Play "W"]', '- S6 +'])
    })
  })

  describe('fromPBNSection', () => {
    it('decodes the spec example, including the unknown cards and the "*"', () => {
      const p = PBNPlay.fromPBNSection(specExampleLines, fiveHeartsDoubled)!
      expect(p).toBeDefined()
      expect(p.cards).toHaveLength(28)
      expect(p.terminated).toBe(true)
      expect(p.cards[0]).toMatchObject({ position: 'W', card: 'SK', note: 'highest of series' })
      expect(p.cards[24]).toEqual({ position: 'E', card: undefined })
      expect(p.cards[27]).toEqual({ position: 'N', card: 'H2' })
      expect(PBNPlay.tricks(p).map(t => t.winner)).toEqual(['N', 'W', 'N', 'E', 'S', 'E', undefined])
    })

    it('re-encodes the spec example as it was written (modulo padding whitespace)', () => {
      const p = PBNPlay.fromPBNSection(specExampleLines, fiveHeartsDoubled)!
      expect(PBNPlay.toPBNSection(p)).toEqual([
        '[Play "W"]',
        'SK =1= H3 S4 S3',
        'C5 C2 C6 CK',
        'S2 H6 S5 S7',
        'C8 CA CT C4',
        'D2 DA DT D3',
        'D4 DK H5 H7',
        '- - - H2',
        '*',
        '[Note "1:highest of series"]',
      ])
    })

    it('decodes an empty section as an empty play', () => {
      const p = PBNPlay.fromPBNSection(['[Play "W"]'], threeNT)!
      expect(PBNPlay.isEmpty(p)).toBe(true)
      expect(p.terminated).toBe(false)
    })

    it('treats "+" and any "-" padding after it as "not played yet"', () => {
      const p = PBNPlay.fromPBNSection(['[Play "W"]', 'H2 H3 H4 HA', '+ - - -'], threeNT)!
      expect(p.cards).toHaveLength(4)
      expect(PBNPlay.isComplete(p)).toBe(false)
      expect(PBNPlay.nextToAct(p)).toBe('S') // South's heart ace won the first trick
    })

    it('accepts lowercase card tokens', () => {
      const p = PBNPlay.fromPBNSection(['[Play "W"]', 'sk h3'], threeNT)!
      expect(p.cards.map(c => c.card)).toEqual(['SK', 'H3'])
    })

    it('converts suffixes to the card NAGs 7-12, before or after a note, attached or spaced', () => {
      const lines = ['[Play "W"]', 'SK!! =1= $200 S3 ? H4 !?', '[Note "1:top of a sequence"]']
      const p = PBNPlay.fromPBNSection(lines, threeNT)!
      expect(p.cards.map(c => c.nags)).toEqual([[9, 200], [8], [11]])
      expect(p.cards[0]!.note).toBe('top of a sequence')
    })

    it('allows the same note reference on several cards', () => {
      const lines = ['[Play "W"]', 'S5 =1= S6 =1=', '[Note "1:signal"]']
      const p = PBNPlay.fromPBNSection(lines, threeNT)!
      expect(p.cards.map(c => c.note)).toEqual(['signal', 'signal'])
    })

    it('reads a case-insensitive tag name', () => {
      expect(PBNPlay.fromPBNSection(['[play "W"]', 'S5'], threeNT)).toBeDefined()
    })

    it('ignores comments', () => {
      const lines = ['[Play "W"]', '{ the opening lead }', 'S5', '; a spade', 'S6']
      expect(PBNPlay.fromPBNSection(lines, threeNT)!.cards).toHaveLength(2)
    })

    it('round-trips a play with annotations', () => {
      let p = PBNPlay.make(fourHearts)
      p = PBNPlay.makingCard(p, Card.fromPBN('SA'), 'ace from AK', [9])
      p = play(p, 'H2', 'SK', 'H3')
      p = PBNPlay.terminating(p)
      expect(PBNPlay.fromPBNSection(PBNPlay.toPBNSection(p), fourHearts)).toEqual(p)
    })

    describe('rejects (returns undefined for)', () => {
      const bad = (label: string, lines: string[], dc: DeclaredContract = threeNT): void => {
        it(label, () => {
          expect(PBNPlay.fromPBNSection(lines, dc)).toBeUndefined()
        })
      }
      bad('a tag value that is not the declarer\'s left-hand opponent', ['[Play "N"]', 'S5'])
      bad('a tag value that is not a direction', ['[Play "X"]', 'S5'])
      bad('a different tag', ['[Auction "W"]', 'S5'])
      bad('a missing tag line', ['S5 S6'])
      bad('an unrecognized token', ['[Play "W"]', 'S5 Z9'])
      bad('an irregularity token', ['[Play "W"]', 'S5 ^R'])
      bad('a duplicate card', ['[Play "W"]', 'S5 S5'])
      bad('a revoke', ['[Play "W"]', 'SA C2 S2 S3 SK S4'])
      bad('a card after "*"', ['[Play "W"]', 'S5 * S6'])
      bad('a card after "+"', ['[Play "W"]', 'S5 + S6'])
      bad('a second "+"', ['[Play "W"]', 'S5 + +'])
      bad('a note reference with no [Note] line', ['[Play "W"]', 'S5 =1='])
      bad('a note reference with nothing to attach to', ['[Play "W"]', '=1= S5', '[Note "1:x"]'])
      bad('an annotation after "+"', ['[Play "W"]', 'S5 + $9'])
      bad('a NAG reserved for calls', ['[Play "W"]', 'S5 $1'])
      bad('a NAG out of range', ['[Play "W"]', 'S5 $256'])
      bad('cards after a trick whose winner is unknown', ['[Play "W"]', '- S6 S7 S8 S9'])
    })
  })

  describe('rotated', () => {
    it('rotates the contract and every position, leaving the cards alone', () => {
      const p = play(PBNPlay.make(threeNT), 'S5', 'S6')
      const r = PBNPlay.rotated(p, 1)
      expect(r.declaredContract.declarer).toBe('W')
      expect(r.cards.map((c: PBNPlayCard) => c.position)).toEqual(['N', 'E'])
      expect(r.cards.map((c: PBNPlayCard) => c.card)).toEqual(['S5', 'S6'])
      expect(PBNPlay.openingLeader(r.declaredContract)).toBe('N')
      expect(PBNPlay.toPBNSection(r)[0]).toBe('[Play "N"]')
    })
  })

  describe('contract', () => {
    it('uses the contract\'s strain for trump, not its risk or level', () => {
      const doubled = DeclaredContract.make(Contract.fromPBN('4HX')!, 'S')
      const p = play(PBNPlay.make(doubled), 'SA', 'H2', 'SK', 'H3')
      expect(PBNPlay.tricks(p)[0]!.winner).toBe('S')
    })
  })
})
