import { PBNSection } from './pbnSection.js'
import { formatTagLine } from './tagLine.js'
import type { TagPair } from './tagLine.js'
import { Direction } from '../direction.js'
import { Vulnerable } from '../vulnerable.js'
import { Deal } from '../deal.js'
import { Contract } from '../contract.js'
import { DeclaredContract } from '../declaredContract.js'
import { DealOutcome } from '../dealOutcome.js'
import { PBNAuction } from './pbnAuction.js'
import { parseSectionLines } from './parsedSection.js'
import type { ParsedSection } from './parsedSection.js'
import { DoubleDummyTricks } from '../doubleDummyTricks.js'
import type { PlayerNames } from '../playerNames.js'

// A game's sections are read-only from the outside — the only way to add or replace one is
// setSection, which keeps "one section per tag name" as an invariant rather than something
// callers have to maintain by hand.
export class PBNGame {
  private readonly _sections: PBNSection[]

  constructor(sections: PBNSection[] = []) {
    this._sections = sections
  }

  get sections(): readonly PBNSection[] {
    return this._sections
  }

  // Always re-derived from sections — no cached state to go stale. Tag names are matched
  // case-insensitively (PBN tag names are conventionally capitalized, e.g. "Declarer", but
  // nothing enforces that on read).
  getTagValue(tagName: string): string | undefined {
    const lowerTagName = tagName.toLowerCase()
    for (const section of this._sections) {
      const tagPair = section.tagPair
      if (tagPair !== undefined && tagPair.name.toLowerCase() === lowerTagName) {
        return tagPair.value
      }
    }
    return undefined
  }

  // Completely replaces the section whose tag name matches the new lines' tag name
  // (case-insensitive) — or the "global"/untagged section, if the new lines have no tag pair
  // either — with a fresh PBNSection built from `lines`. Adds a new section if none matches.
  setSection(lines: string[]): void {
    const newSection = new PBNSection(lines)
    const newTagName = newSection.tagPair?.name.toLowerCase()
    const index = this._sections.findIndex(section => section.tagPair?.name.toLowerCase() === newTagName)
    if (index === -1) {
      this._sections.push(newSection)
    } else {
      this._sections[index] = newSection
    }
  }

  // Convenience for the common case of a single-line (simple-tag) section: formats the pair as a
  // tag line and replaces/adds that section via setSection.
  setTag(tag: TagPair): void {
    this.setSection([formatTagLine(tag)])
  }

  // Removes the section with a matching tag name (case-insensitive), if one exists. A no-op
  // otherwise. Only targets named sections — there's no tagName to pass for the "global"/untagged
  // section, so it can't be deleted through this method.
  deleteSection(tagName: string): void {
    const lowerTagName = tagName.toLowerCase()
    const index = this._sections.findIndex(section => section.tagPair?.name.toLowerCase() === lowerTagName)
    if (index !== -1) {
      this._sections.splice(index, 1)
    }
  }

  // The Board tag's PBN value is a non-negative integer (matches Swift's UInt); anything else
  // (negative, decimal, non-numeric) is treated as absent rather than thrown.
  getBoard(): number | undefined {
    const value = this.getTagValue('Board')
    return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined
  }

  setBoard(board: number): void {
    this.setTag({ name: 'Board', value: `${board}` })
  }

  // Thin wrapper over Direction's existing PBNCodable conformance.
  getDealer(): Direction | undefined {
    const value = this.getTagValue('Dealer')
    return value === undefined ? undefined : Direction.fromPBN(value)
  }

  setDealer(dealer: Direction): void {
    this.setTag({ name: 'Dealer', value: Direction.toPBN(dealer) })
  }

  // Thin wrapper over Vulnerable's existing PBNCodable conformance (includes its PBN synonyms —
  // "Love"/"-" for None, "Both" for All — for free).
  getVulnerable(): Vulnerable | undefined {
    const value = this.getTagValue('Vulnerable')
    return value === undefined ? undefined : Vulnerable.fromPBN(value)
  }

  setVulnerable(vulnerable: Vulnerable): void {
    this.setTag({ name: 'Vulnerable', value: Vulnerable.toPBN(vulnerable) })
  }

  // Deal.fromPBN returns Deal | DealError (not Deal | undefined, unlike every other PBNCodable
  // type here) — a DealError result is treated as "no deal" rather than surfaced, matching this
  // accessor's undefined-on-failure convention.
  getDeal(): Deal | undefined {
    const value = this.getTagValue('Deal')
    if (value === undefined) return undefined
    const result = Deal.fromPBN(value)
    return 'type' in result ? undefined : result
  }

  setDeal(deal: Deal): void {
    this.setTag({ name: 'Deal', value: Deal.toPBN(deal) })
  }

  // Thin wrapper over Direction's existing PBNCodable conformance. A distinct tag from Dealer —
  // Dealer is who dealt the hand, Declarer is who won the auction (absent until the auction ends).
  getDeclarer(): Direction | undefined {
    const value = this.getTagValue('Declarer')
    return value === undefined ? undefined : Direction.fromPBN(value)
  }

  setDeclarer(declarer: Direction): void {
    this.setTag({ name: 'Declarer', value: Direction.toPBN(declarer) })
  }

  // Thin wrapper over Contract's existing PBNCodable conformance. Note: Swift's actual Contract
  // tag can also hold the literal value "Pass" (auction ended with no contract), modeled there as
  // a separate ContractTagValue (.pass | .contract(Contract)) rather than a bare Contract. Using
  // plain Contract here means "Pass" fails to parse just like any other invalid/missing value —
  // both collapse to undefined, rather than being distinguished.
  getContract(): Contract | undefined {
    const value = this.getTagValue('Contract')
    return value === undefined ? undefined : Contract.fromPBN(value)
  }

  setContract(contract: Contract): void {
    this.setTag({ name: 'Contract', value: Contract.toPBN(contract) })
  }

  // The Result tag's PBN value is a non-negative integer (like Board) further constrained to
  // 0-13 tricks taken; out-of-range or malformed values are treated as absent rather than thrown.
  getResult(): number | undefined {
    const value = this.getTagValue('Result')
    if (value === undefined || !/^\d+$/.test(value)) return undefined
    const result = Number(value)
    return result <= 13 ? result : undefined
  }

  setResult(result: number): void {
    this.setTag({ name: 'Result', value: `${result}` })
  }

  // Combines Declarer, Contract, and Result. Reads the raw Contract tag directly for the "Pass"
  // check (case-insensitive, matching Swift) rather than through getContract() — getContract()
  // already collapses "Pass" into undefined, which would make it indistinguishable from a
  // missing/invalid tag here. Only ever returns passedOut or played (matching Swift's dealOutcome
  // getter); other DealOutcome kinds (scoreOnly, average, etc.) have no Contract/Declarer/Result
  // representation and can't be produced by this accessor.
  getDealOutcome(): DealOutcome | undefined {
    const contractValue = this.getTagValue('Contract')
    if (contractValue !== undefined && contractValue.toUpperCase() === 'PASS') {
      return DealOutcome.passedOut
    }
    const contract = this.getContract()
    const declarer = this.getDeclarer()
    const result = this.getResult()
    if (contract === undefined || declarer === undefined || result === undefined) return undefined
    return DealOutcome.played(DeclaredContract.make(contract, declarer), result)
  }

  // Only passedOut and played can be represented via Declarer/Contract/Result — anything else
  // (scoreOnly, average, averagePlus, averageMinus, noScore) throws rather than silently doing
  // nothing or discarding data, since the caller asked to store something this trio of tags
  // genuinely cannot express.
  setDealOutcome(outcome: DealOutcome): void {
    switch (outcome.kind) {
      case 'passedOut':
        this.setTag({ name: 'Contract', value: 'Pass' })
        // Stale Declarer/Result from a previous contract would otherwise linger alongside "Pass".
        this.deleteSection('Declarer')
        this.deleteSection('Result')
        return
      case 'played':
        this.setContract(outcome.declaredContract.contract)
        this.setDeclarer(outcome.declaredContract.declarer)
        this.setResult(outcome.tricksTaken)
        return
      default:
        throw new Error(`DealOutcome kind '${outcome.kind}' cannot be represented by Declarer/Contract/Result tags`)
    }
  }

  getAuction(): PBNAuction | undefined {
    const section = this._sections.find(s => s.tagPair?.name.toLowerCase() === 'auction')
    if (section === undefined) return undefined
    return PBNAuction.fromPBNSection(section.lines)
  }

  // Thin wrapper over DoubleDummyTricks's existing PBNCodable conformance. The wire tag is
  // "[DoubleDummyTricks "...hex..."]" — real PBN files' actual convention (confirmed against
  // test-data/hand-record-1.pbn and hand-record-2.pbn). This type/accessor pair was originally
  // named "DoubleDummyTable" here, which caused a real bug — the accessor looked for a tag name
  // that never matched real data — fixed by renaming everything to match both the wire tag and
  // Swift's own type name for this concept.
  getDoubleDummyTricks(): DoubleDummyTricks | undefined {
    const value = this.getTagValue('DoubleDummyTricks')
    return value === undefined ? undefined : DoubleDummyTricks.fromPBN(value)
  }

  setDoubleDummyTricks(tricks: DoubleDummyTricks): void {
    this.setTag({ name: 'DoubleDummyTricks', value: DoubleDummyTricks.toPBN(tricks) })
  }

  // Reads the West/North/East/South simple tags into a single PlayerNames value. Unlike most
  // accessors here, this never returns undefined — PlayerNames already represents "no names
  // known" as {} (every direction absent), so there's no need for an extra undefined wrapper on
  // top of that.
  getPlayerNames(): PlayerNames {
    const names: Partial<Record<Direction, string>> = {}
    for (const direction of Direction.all) {
      const value = this.getTagValue(Direction.name(direction))
      if (value !== undefined) names[direction] = value
    }
    return names
  }

  // Wholesale replace, matching setDealOutcome's "no stale leftover data" discipline: a direction
  // missing from `names` has its tag deleted rather than left behind from a previous call.
  setPlayerNames(names: PlayerNames): void {
    for (const direction of Direction.all) {
      const tagName = Direction.name(direction)
      const name = names[direction]
      if (name === undefined) {
        this.deleteSection(tagName)
      } else {
        this.setTag({ name: tagName, value: name })
      }
    }
  }

  // Splits a section's raw lines into tagPair/bodyLines/notes/comments — see ParsedSection. Any
  // future complex-tag section (Play, etc.) can build on this instead of re-deriving note/comment
  // separation itself, the way PBNAuction.fromPBNSection now does.
  getParsedSection(tagName: string): ParsedSection | undefined {
    const lowerTagName = tagName.toLowerCase()
    const section = this._sections.find(s => s.tagPair?.name.toLowerCase() === lowerTagName)
    if (section === undefined) return undefined
    return parseSectionLines(section.lines)
  }
}
