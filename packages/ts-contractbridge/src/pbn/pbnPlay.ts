import { Bid } from '../bid.js'
import { Card } from '../card.js'
import { DeclaredContract } from '../declaredContract.js'
import { Direction } from '../direction.js'
import { Strain } from '../strain.js'
import type { Suit } from '../suit.js'
import { formatTagLine } from './tagLine.js'
import { parseSectionLines } from './parsedSection.js'

export class PBNPlayError extends Error {
  constructor(
    readonly kind: 'playAlreadyComplete' | 'duplicateCard' | 'revoke' | 'invalidNag',
    message: string
  ) {
    super(message)
    this.name = 'PBNPlayError'
  }
}

export type PBNPlayCard = {
  // Who played it — worked out by PBNPlay itself (opening leader, then the winner of each trick),
  // never supplied by the caller, so it can't disagree with the play that came before.
  readonly position: Direction
  // undefined is the PBN "-" token: a card that was played but is not known.
  readonly card: Card | undefined
  readonly note?: string
  readonly noteNumber?: number
  // Numeric Annotation Glyphs (0-255), same idea as PBNAuctionCall.nags — but for a played card the
  // spec reserves $7-$12 (good/poor/very good/very poor/speculative/questionable card) and $14
  // (card corrected manually); $1-$6 and $13 belong to calls and are rejected here.
  readonly nags?: readonly number[]
}

// A trick as it stands so far. `winner` is defined only once all 4 cards are in and every one of
// them is known — an unknown ("-") card makes the winner unknowable, which in turn means nobody
// can be said to lead the next trick.
export type PBNPlayTrick = {
  readonly leader: Direction
  readonly cards: readonly PBNPlayCard[]
  readonly winner: Direction | undefined
}

export type PBNPlay = {
  // The declarer fixes the opening leader (declarer's left-hand opponent, always — the PBN Play
  // tag's value is never anything else here) and the strain fixes what is trump. Both are needed
  // to work out who wins each trick, and therefore who plays every card after the first.
  readonly declaredContract: DeclaredContract
  readonly cards: readonly PBNPlayCard[]
  // The PBN "*" marker: no further cards will or can be given (a claim, a concession, an
  // abandoned deal). Distinct from merely being short of 52 cards, which means "not played yet".
  readonly terminated: boolean
}

const make = (declaredContract: DeclaredContract): PBNPlay =>
  ({ declaredContract, cards: [], terminated: false })

const openingLeader = (dc: DeclaredContract): Direction => Direction.next(dc.declarer)

const trumpSuit = (a: PBNPlay): Suit | null =>
  Strain.toSuit(Bid.strain(a.declaredContract.contract.bid))

const isEmpty = (a: PBNPlay): boolean => a.cards.length === 0

// Beats `best`, given both are already-played cards in a trick whose current best is `best`. `best`
// is always either the led suit or trump (it starts as the led card and is only ever replaced by a
// higher card of its own suit, or by a trump), so a card of a different suit can only win by
// being trump — an off-suit discard never can.
const beats = (card: Card, best: Card, trump: Suit | null): boolean =>
  Card.suit(card) === Card.suit(best) ? Card.compareRank(card, best) > 0 : Card.suit(card) === trump

const trickWinner = (cards: readonly PBNPlayCard[], trump: Suit | null): Direction | undefined => {
  let best: PBNPlayCard | undefined
  for (const pc of cards) {
    if (pc.card === undefined) return undefined
    if (best === undefined || beats(pc.card, best.card!, trump)) best = pc
  }
  return best?.position
}

const tricks = (a: PBNPlay): readonly PBNPlayTrick[] => {
  const trump = trumpSuit(a)
  const result: PBNPlayTrick[] = []
  for (let i = 0; i < a.cards.length; i += 4) {
    const cards = a.cards.slice(i, i + 4)
    result.push({
      leader: cards[0]!.position,
      cards,
      winner: cards.length === 4 ? trickWinner(cards, trump) : undefined,
    })
  }
  return result
}

// True when the last trick is finished but contains a "-" card, so nobody can be said to lead
// next. The play can go no further even without an explicit "*".
const endsInUnresolvedTrick = (a: PBNPlay): boolean =>
  a.cards.length > 0 && a.cards.length % 4 === 0 &&
  trickWinner(a.cards.slice(-4), trumpSuit(a)) === undefined

// Nothing more can be added: all 13 tricks played, an explicit "*", or a finished trick whose
// winner is unknowable.
const isComplete = (a: PBNPlay): boolean =>
  a.terminated || a.cards.length === 52 || endsInUnresolvedTrick(a)

const nextToAct = (a: PBNPlay): Direction | undefined => {
  if (isComplete(a)) return undefined
  const last = a.cards[a.cards.length - 1]
  if (last === undefined) return openingLeader(a.declaredContract)
  if (a.cards.length % 4 !== 0) return Direction.next(last.position)
  // A trick just finished and isn't unresolved (isComplete would have caught that): its winner leads.
  return tricks(a)[a.cards.length / 4 - 1]!.winner
}

// Every suit a player is known to have none of, worked out from the play so far: a player who
// didn't follow to a led suit had none of it. This is the only revoke evidence available without
// the deal, and it is airtight — a card of that suit from that player, at any later point, is
// impossible in legitimate play.
const shownVoids = (a: PBNPlay): ReadonlyMap<Direction, ReadonlySet<Suit>> => {
  const voids = new Map<Direction, Set<Suit>>()
  for (const trick of tricks(a)) {
    const led = trick.cards[0]?.card
    if (led === undefined) continue
    const ledSuit = Card.suit(led)
    for (const pc of trick.cards) {
      if (pc.card === undefined || Card.suit(pc.card) === ledSuit) continue
      const suits = voids.get(pc.position) ?? new Set<Suit>()
      suits.add(ledSuit)
      voids.set(pc.position, suits)
    }
  }
  return voids
}

const isPlayNag = (nag: number): boolean =>
  Number.isInteger(nag) && nag >= 0 && nag <= 255 && !(nag >= 1 && nag <= 6) && nag !== 13

/**
 * Returns a new PBNPlay with the next card appended, or throws PBNPlayError if that would not be
 * legitimate play. `card` undefined records a card that was played but is unknown (PBN's "-").
 * Whose turn it is comes from the play so far, never from the caller.
 *
 * Without the deal, legitimacy means: the play isn't over, no card is played twice, and nobody
 * plays a suit they already showed out of (see shownVoids). It cannot check a card against the
 * hand it supposedly came from.
 */
const makingCard = (a: PBNPlay, card: Card | undefined, note?: string, nags?: readonly number[]): PBNPlay => {
  const position = nextToAct(a)
  if (position === undefined) throw new PBNPlayError('playAlreadyComplete', 'Play is already complete')

  if (card !== undefined) {
    if (a.cards.some(pc => pc.card === card)) {
      throw new PBNPlayError('duplicateCard', `${Card.name(card)} has already been played`)
    }
    if (shownVoids(a).get(position)?.has(Card.suit(card))) {
      throw new PBNPlayError('revoke', `${Direction.name(position)} has already shown out of that suit`)
    }
  }
  if (nags?.some(n => !isPlayNag(n))) {
    throw new PBNPlayError('invalidNag', 'NAG is out of range, or reserved for calls rather than cards')
  }

  const lastNoteNumber = Math.max(0, ...a.cards.map(pc => pc.noteNumber ?? 0))
  const noteNumber = note !== undefined ? lastNoteNumber + 1 : undefined
  const newCard: PBNPlayCard = {
    position,
    card,
    ...(note !== undefined && { note }),
    ...(noteNumber !== undefined && { noteNumber }),
    ...(nags !== undefined && nags.length > 0 && { nags }),
  }
  return { ...a, cards: [...a.cards, newCard] }
}

/** Returns a new PBNPlay with the last card removed. Also clears "*" — undoing resumes the play. */
const undoingLast = (a: PBNPlay): PBNPlay =>
  ({ ...a, cards: a.cards.slice(0, -1), terminated: false })

/** Returns a new PBNPlay marked "*" (no further cards). A no-op once all 13 tricks are played. */
const terminating = (a: PBNPlay): PBNPlay =>
  a.cards.length === 52 ? a : { ...a, terminated: true }

const rotated = (a: PBNPlay, seats: number): PBNPlay => ({
  declaredContract: DeclaredContract.rotated(a.declaredContract, seats),
  cards: a.cards.map(pc => ({ ...pc, position: Direction.rotated(pc.position, seats) })),
  terminated: a.terminated,
})

// Encodes the whole [Play "L"] section: the tag line (L is always the opening leader), then body
// lines of up to 4 cards each, then "*" on a line of its own if the play was terminated, then
// one [Note "N:text"] line per note. A play that isn't over gets a "+" in the next slot, per the
// spec's recommendation. Note numbers are computed fresh here, in the order notes are met, for the
// same reason PBNAuction.toPBNSection does — noteNumber can develop gaps after undoingLast.
const toPBNSection = (a: PBNPlay): string[] => {
  const lines: string[] = [formatTagLine({ name: 'Play', value: Direction.toPBN(openingLeader(a.declaredContract)) })]
  const notes: string[] = []
  const tokens = a.cards.map(pc => {
    let token = pc.card === undefined ? '-' : Card.toPBN(pc.card)
    // Export order per the spec: note reference, then NAGs in ascending order — never a suffix.
    if (pc.note !== undefined) {
      notes.push(pc.note)
      token += ` =${notes.length}=`
    }
    if (pc.nags !== undefined && pc.nags.length > 0) {
      token += [...pc.nags].sort((x, y) => x - y).map(nag => ` $${nag}`).join('')
    }
    return token
  })
  if (!isComplete(a)) tokens.push('+')
  for (let i = 0; i < tokens.length; i += 4) {
    lines.push(tokens.slice(i, i + 4).join(' '))
  }
  if (a.terminated) lines.push('*')
  notes.forEach((note, i) => {
    lines.push(formatTagLine({ name: 'Note', value: `${i + 1}:${note}` }))
  })
  return lines
}

// The six PBN suffix annotations, as they apply to a played card: NAGs 7-12 (auction calls get 1-6).
const suffixToNag: ReadonlyMap<string, number> = new Map([
  ['!', 7], ['?', 8], ['!!', 9], ['??', 10], ['!?', 11], ['?!', 12],
])

// One PBN token each, so annotations need no whitespace before them ("SK!!" is "SK" then "!!" per
// the spec's self-terminating token rules). Anything else falls through to \S+ and is rejected
// later as an unrecognized token, rather than being silently skipped.
const tokenPattern = /[SHDCshdc][AKQJTakqjt2-9]|=\d+=|\$\d+|[!?]{1,2}|[-+*]|\S+/g

type RawPlayEntry = { card: Card | undefined; note?: string; nags: number[] }

// Decodes a [Play "L"] section built by toPBNSection (or a real PBN file's equivalent). Unlike
// PBNAuction.fromPBNSection this needs the contract as well as the lines — the spec requires the
// Contract and Declarer tags to precede a Play section, and without them there's no strain to
// decide the winner of each trick with (see PBNGame.getPlay, which supplies them). For the same
// reason it doesn't conform to PBNSectionCodable.
//
// Returns undefined for anything that isn't legitimate play: the tag value isn't the declarer's
// left-hand opponent, an unrecognized token, a note marker with no matching [Note] line, an
// irregularity token (^I etc.), a "+" or "*" that isn't at the very end, or any card that
// makingCard rejects (a duplicate, a revoke, a NAG reserved for calls, a card after the play ended).
const fromPBNSection = (lines: readonly string[], declaredContract: DeclaredContract): PBNPlay | undefined => {
  const parsed = parseSectionLines(lines)
  if (parsed.tagPair === undefined || parsed.tagPair.name.toLowerCase() !== 'play') return undefined
  if (Direction.fromPBN(parsed.tagPair.value) !== openingLeader(declaredContract)) return undefined

  const entries: RawPlayEntry[] = []
  let last: RawPlayEntry | undefined
  let plusSeen = false
  let terminated = false
  for (const raw of parsed.bodyLines.join(' ').match(tokenPattern) ?? []) {
    if (terminated) return undefined // nothing may follow "*"
    if (raw === '*') {
      terminated = true
      last = undefined
    } else if (raw === '+') {
      // "+" takes the place of the next card to play, so it can only be followed by "-" padding.
      if (plusSeen) return undefined
      plusSeen = true
      last = undefined
    } else if (raw === '-') {
      last = undefined
      if (!plusSeen) {
        last = { card: undefined, nags: [] }
        entries.push(last)
      }
    } else if (/^=\d+=$/.test(raw)) {
      const note = parsed.notes.get(raw)
      if (note === undefined || last === undefined) return undefined
      last.note = note
    } else if (suffixToNag.has(raw)) {
      if (last === undefined) return undefined
      last.nags.push(suffixToNag.get(raw)!)
    } else if (/^\$\d+$/.test(raw)) {
      const nag = Number(raw.slice(1))
      if (nag > 255 || last === undefined) return undefined
      last.nags.push(nag)
    } else {
      const card = Card.fromPBN(raw)
      if (card === undefined || plusSeen) return undefined
      last = { card, nags: [] }
      entries.push(last)
    }
  }

  // A "-" with nothing after it is "not played yet", not "played but unknown" — the spec uses the
  // one token for both. Trailing bare dashes are dropped so they don't become phantom unknown cards.
  while (entries.length > 0) {
    const tail = entries[entries.length - 1]!
    if (tail.card !== undefined || tail.note !== undefined || tail.nags.length > 0) break
    entries.pop()
  }

  let play = make(declaredContract)
  try {
    for (const entry of entries) {
      play = makingCard(play, entry.card, entry.note, entry.nags)
    }
  } catch {
    return undefined
  }
  return terminated ? terminating(play) : play
}

export const PBNPlay = {
  make, isEmpty, isComplete, nextToAct, openingLeader, tricks,
  makingCard, undoingLast, terminating, rotated, toPBNSection, fromPBNSection,
}
