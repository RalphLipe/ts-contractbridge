import { describe, it, expect } from 'vitest'
import { PBNGame } from '../../src/pbn/pbnGame.js'
import { PBNSection } from '../../src/pbn/pbnSection.js'
import { Deal } from '../../src/deal.js'
import { Contract } from '../../src/contract.js'
import { DeclaredContract } from '../../src/declaredContract.js'
import { DealOutcome } from '../../src/dealOutcome.js'
import { DoubleDummyTricks } from '../../src/doubleDummyTricks.js'

describe('PBNGame', () => {
  it('defaults to no sections', () => {
    const game = new PBNGame()
    expect(game.sections).toEqual([])
  })

  it('can be constructed with initial sections', () => {
    const section = new PBNSection(['[Declarer "N"]'])
    const game = new PBNGame([section])
    expect(game.sections).toEqual([section])
  })

  it('sections are read-only (compile-time check)', () => {
    const game = new PBNGame()
    // @ts-expect-error - sections is a read-only view; setSection is the only way to add/replace one
    game.sections.push(new PBNSection(['[Board "1"]']))
  })

  describe('getTagValue', () => {
    it('finds the value of a matching tag', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('matches tag names case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      expect(game.getTagValue('declarer')).toBe('N')
      expect(game.getTagValue('DECLARER')).toBe('N')
      expect(game.getTagValue('DeClArEr')).toBe('N')
    })

    it('ignores sections with no tag pair (comments, malformed lines)', () => {
      const game = new PBNGame([
        new PBNSection(['; a comment about the whole game']),
        new PBNSection(['[Declarer "N"]']),
      ])
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('is undefined when no section has that tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      expect(game.getTagValue('Declarer')).toBeUndefined()
    })

    it('is undefined for an empty game', () => {
      const game = new PBNGame()
      expect(game.getTagValue('Declarer')).toBeUndefined()
    })

    it('reflects setSection changes immediately (no stale caching)', () => {
      const game = new PBNGame()
      expect(game.getTagValue('Declarer')).toBeUndefined()
      game.setSection(['[Declarer "N"]'])
      expect(game.getTagValue('Declarer')).toBe('N')
    })
  })

  describe('setSection', () => {
    it('adds a new section when no existing section has a matching tag', () => {
      const game = new PBNGame()
      game.setSection(['[Declarer "N"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('replaces an existing section with the same tag name', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.setSection(['[Declarer "S"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('matches the existing section case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[declarer "N"]'])])
      game.setSection(['[DECLARER "S"]'])
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('leaves other sections untouched', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      game.setSection(['[Declarer "S"]'])
      expect(game.sections).toHaveLength(2)
      expect(game.getTagValue('Board')).toBe('1')
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('replaces the whole section, including any body lines', () => {
      const game = new PBNGame([new PBNSection(['[Auction "N"]', 'P P P P'])])
      game.setSection(['[Auction "N"]', '1NT P P P'])
      expect(game.sections).toHaveLength(1)
      expect(game.sections[0]!.lines).toEqual(['[Auction "N"]', '1NT P P P'])
    })

    it('replaces the "global" untagged section when the new lines also have no tag', () => {
      const game = new PBNGame([new PBNSection(['; an old comment'])])
      game.setSection(['; a new comment'])
      expect(game.sections).toHaveLength(1)
      expect(game.sections[0]!.lines).toEqual(['; a new comment'])
    })

    it('adds a global untagged section alongside tagged ones rather than merging with them', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      game.setSection(['; a comment'])
      expect(game.sections).toHaveLength(2)
    })
  })

  describe('setTag', () => {
    it('adds a new section formatted from the TagPair', () => {
      const game = new PBNGame()
      game.setTag({ name: 'Declarer', value: 'N' })
      expect(game.sections).toHaveLength(1)
      expect(game.sections[0]!.lines).toEqual(['[Declarer "N"]'])
      expect(game.getTagValue('Declarer')).toBe('N')
    })

    it('replaces an existing section with the same tag name', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.setTag({ name: 'Declarer', value: 'S' })
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('formats a value containing spaces correctly', () => {
      const game = new PBNGame()
      game.setTag({ name: 'Event', value: 'World Championship' })
      expect(game.sections[0]!.lines).toEqual(['[Event "World Championship"]'])
      expect(game.getTagValue('Event')).toBe('World Championship')
    })
  })

  describe('deleteSection', () => {
    it('removes the section with a matching tag name', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Declarer "N"]']),
      ])
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Declarer')).toBeUndefined()
      expect(game.getTagValue('Board')).toBe('1')
    })

    it('matches case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.deleteSection('declarer')
      expect(game.sections).toHaveLength(0)
    })

    it('is a no-op when no section has that tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('Board')).toBe('1')
    })

    it('is a no-op on an empty game', () => {
      const game = new PBNGame()
      game.deleteSection('Declarer')
      expect(game.sections).toHaveLength(0)
    })
  })

  describe('getBoard / setBoard', () => {
    it('setBoard followed by getBoard round-trips', () => {
      const game = new PBNGame()
      game.setBoard(7)
      expect(game.getBoard()).toBe(7)
      expect(game.getTagValue('Board')).toBe('7')
    })

    it('getBoard parses the Board tag as an integer', () => {
      const game = new PBNGame([new PBNSection(['[Board "12"]'])])
      expect(game.getBoard()).toBe(12)
    })

    it('getBoard allows 0', () => {
      const game = new PBNGame([new PBNSection(['[Board "0"]'])])
      expect(game.getBoard()).toBe(0)
    })

    it('getBoard is undefined when there is no Board tag', () => {
      const game = new PBNGame()
      expect(game.getBoard()).toBeUndefined()
    })

    it('getBoard is undefined for a non-integer or negative value', () => {
      expect(new PBNGame([new PBNSection(['[Board "-1"]'])]).getBoard()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Board "1.5"]'])]).getBoard()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Board "abc"]'])]).getBoard()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Board ""]'])]).getBoard()).toBeUndefined()
    })

    it('setBoard replaces an existing Board tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      game.setBoard(2)
      expect(game.sections).toHaveLength(1)
      expect(game.getBoard()).toBe(2)
    })
  })

  describe('getDealer / setDealer', () => {
    it('setDealer followed by getDealer round-trips', () => {
      const game = new PBNGame()
      game.setDealer('S')
      expect(game.getDealer()).toBe('S')
      expect(game.getTagValue('Dealer')).toBe('S')
    })

    it('getDealer parses the Dealer tag case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Dealer "w"]'])])
      expect(game.getDealer()).toBe('W')
    })

    it('getDealer is undefined when there is no Dealer tag', () => {
      const game = new PBNGame()
      expect(game.getDealer()).toBeUndefined()
    })

    it('getDealer is undefined for an invalid direction', () => {
      const game = new PBNGame([new PBNSection(['[Dealer "X"]'])])
      expect(game.getDealer()).toBeUndefined()
    })

    it('setDealer replaces an existing Dealer tag', () => {
      const game = new PBNGame([new PBNSection(['[Dealer "N"]'])])
      game.setDealer('E')
      expect(game.sections).toHaveLength(1)
      expect(game.getDealer()).toBe('E')
    })
  })

  describe('getVulnerable / setVulnerable', () => {
    it('setVulnerable followed by getVulnerable round-trips', () => {
      const game = new PBNGame()
      game.setVulnerable('NS')
      expect(game.getVulnerable()).toBe('NS')
      expect(game.getTagValue('Vulnerable')).toBe('NS')
    })

    it('getVulnerable accepts PBN synonyms case-insensitively', () => {
      expect(new PBNGame([new PBNSection(['[Vulnerable "love"]'])]).getVulnerable()).toBe('None')
      expect(new PBNGame([new PBNSection(['[Vulnerable "both"]'])]).getVulnerable()).toBe('All')
      expect(new PBNGame([new PBNSection(['[Vulnerable "ew"]'])]).getVulnerable()).toBe('EW')
    })

    it('getVulnerable is undefined when there is no Vulnerable tag', () => {
      const game = new PBNGame()
      expect(game.getVulnerable()).toBeUndefined()
    })

    it('getVulnerable is undefined for an invalid value', () => {
      const game = new PBNGame([new PBNSection(['[Vulnerable "X"]'])])
      expect(game.getVulnerable()).toBeUndefined()
    })

    it('setVulnerable replaces an existing Vulnerable tag', () => {
      const game = new PBNGame([new PBNSection(['[Vulnerable "None"]'])])
      game.setVulnerable('All')
      expect(game.sections).toHaveLength(1)
      expect(game.getVulnerable()).toBe('All')
    })
  })

  describe('getDeal / setDeal', () => {
    const SAMPLE_PBN = 'N:AKQ.JT9.876.5432 JT9.AKQ.5432.876 876.5432.AKQ.JT9 5432.876.JT9.AKQ'

    it('setDeal followed by getDeal round-trips', () => {
      const deal = Deal.fromPBN(SAMPLE_PBN) as Deal
      const game = new PBNGame()
      game.setDeal(deal)
      expect(game.getDeal()).toEqual(deal)
      expect(game.getTagValue('Deal')).toBe(SAMPLE_PBN)
    })

    it('getDeal parses the Deal tag', () => {
      const game = new PBNGame([new PBNSection([`[Deal "${SAMPLE_PBN}"]`])])
      const deal = game.getDeal()
      expect(deal).toBeDefined()
      expect(deal!.dealer).toBe('N')
      expect(deal!.hands['N'].size).toBe(13)
    })

    it('getDeal is undefined when there is no Deal tag', () => {
      const game = new PBNGame()
      expect(game.getDeal()).toBeUndefined()
    })

    it('getDeal is undefined for an invalid deal string (DealError, not thrown)', () => {
      const game = new PBNGame([new PBNSection(['[Deal "garbage"]'])])
      expect(game.getDeal()).toBeUndefined()
    })

    it('setDeal replaces an existing Deal tag', () => {
      const original = Deal.fromPBN(SAMPLE_PBN) as Deal
      const rotated = Deal.rotated(original, 1)
      const game = new PBNGame([new PBNSection([`[Deal "${SAMPLE_PBN}"]`])])
      game.setDeal(rotated)
      expect(game.sections).toHaveLength(1)
      expect(game.getDeal()).toEqual(rotated)
    })
  })

  describe('getDeclarer / setDeclarer', () => {
    it('setDeclarer followed by getDeclarer round-trips', () => {
      const game = new PBNGame()
      game.setDeclarer('S')
      expect(game.getDeclarer()).toBe('S')
      expect(game.getTagValue('Declarer')).toBe('S')
    })

    it('getDeclarer parses the Declarer tag case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "w"]'])])
      expect(game.getDeclarer()).toBe('W')
    })

    it('getDeclarer is undefined when there is no Declarer tag', () => {
      const game = new PBNGame()
      expect(game.getDeclarer()).toBeUndefined()
    })

    it('getDeclarer is undefined for an invalid direction', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "X"]'])])
      expect(game.getDeclarer()).toBeUndefined()
    })

    it('setDeclarer replaces an existing Declarer tag', () => {
      const game = new PBNGame([new PBNSection(['[Declarer "N"]'])])
      game.setDeclarer('E')
      expect(game.sections).toHaveLength(1)
      expect(game.getDeclarer()).toBe('E')
    })

    it('Dealer and Declarer are independent tags', () => {
      const game = new PBNGame()
      game.setDealer('N')
      game.setDeclarer('E')
      expect(game.getDealer()).toBe('N')
      expect(game.getDeclarer()).toBe('E')
      expect(game.sections).toHaveLength(2)
    })
  })

  describe('getContract / setContract', () => {
    it('setContract followed by getContract round-trips', () => {
      const game = new PBNGame()
      const contract = Contract.make('3NT')
      game.setContract(contract)
      expect(game.getContract()).toEqual(contract)
      expect(game.getTagValue('Contract')).toBe('3NT')
    })

    it('getContract parses risk (doubled/redoubled)', () => {
      const game = new PBNGame([new PBNSection(['[Contract "4HX"]'])])
      expect(game.getContract()).toEqual(Contract.make('4H', 'X'))
    })

    it('getContract is undefined when there is no Contract tag', () => {
      const game = new PBNGame()
      expect(game.getContract()).toBeUndefined()
    })

    it('getContract is undefined for an invalid contract string', () => {
      const game = new PBNGame([new PBNSection(['[Contract "garbage"]'])])
      expect(game.getContract()).toBeUndefined()
    })

    it('getContract is undefined for "Pass" (no distinct passed-out representation yet)', () => {
      const game = new PBNGame([new PBNSection(['[Contract "Pass"]'])])
      expect(game.getContract()).toBeUndefined()
    })

    it('setContract replaces an existing Contract tag', () => {
      const game = new PBNGame([new PBNSection(['[Contract "3NT"]'])])
      game.setContract(Contract.make('6C', 'XX'))
      expect(game.sections).toHaveLength(1)
      expect(game.getContract()).toEqual(Contract.make('6C', 'XX'))
    })
  })

  describe('getResult / setResult', () => {
    it('setResult followed by getResult round-trips', () => {
      const game = new PBNGame()
      game.setResult(9)
      expect(game.getResult()).toBe(9)
      expect(game.getTagValue('Result')).toBe('9')
    })

    it('getResult allows the full 0-13 trick range', () => {
      expect(new PBNGame([new PBNSection(['[Result "0"]'])]).getResult()).toBe(0)
      expect(new PBNGame([new PBNSection(['[Result "13"]'])]).getResult()).toBe(13)
    })

    it('getResult is undefined when there is no Result tag', () => {
      const game = new PBNGame()
      expect(game.getResult()).toBeUndefined()
    })

    it('getResult is undefined for values outside 0-13', () => {
      expect(new PBNGame([new PBNSection(['[Result "14"]'])]).getResult()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Result "-1"]'])]).getResult()).toBeUndefined()
    })

    it('getResult is undefined for a non-integer value', () => {
      expect(new PBNGame([new PBNSection(['[Result "1.5"]'])]).getResult()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Result "abc"]'])]).getResult()).toBeUndefined()
    })

    it('setResult replaces an existing Result tag', () => {
      const game = new PBNGame([new PBNSection(['[Result "5"]'])])
      game.setResult(10)
      expect(game.sections).toHaveLength(1)
      expect(game.getResult()).toBe(10)
    })
  })

  describe('getDealOutcome / setDealOutcome', () => {
    it('recognizes "Pass" as passedOut, case-insensitively', () => {
      expect(new PBNGame([new PBNSection(['[Contract "Pass"]'])]).getDealOutcome()).toEqual(DealOutcome.passedOut)
      expect(new PBNGame([new PBNSection(['[Contract "PASS"]'])]).getDealOutcome()).toEqual(DealOutcome.passedOut)
      expect(new PBNGame([new PBNSection(['[Contract "pass"]'])]).getDealOutcome()).toEqual(DealOutcome.passedOut)
    })

    it('combines Declarer/Contract/Result into a played outcome', () => {
      const game = new PBNGame([
        new PBNSection(['[Declarer "N"]']),
        new PBNSection(['[Contract "3NT"]']),
        new PBNSection(['[Result "9"]']),
      ])
      const expected = DealOutcome.played(DeclaredContract.make(Contract.make('3NT'), 'N'), 9)
      expect(game.getDealOutcome()).toEqual(expected)
    })

    it('is undefined when the auction has not produced a full outcome yet', () => {
      expect(new PBNGame().getDealOutcome()).toBeUndefined()
      expect(new PBNGame([new PBNSection(['[Contract "3NT"]'])]).getDealOutcome()).toBeUndefined()
      expect(new PBNGame([
        new PBNSection(['[Contract "3NT"]']),
        new PBNSection(['[Declarer "N"]']),
      ]).getDealOutcome()).toBeUndefined()
    })

    it('setDealOutcome(passedOut) sets Contract to "Pass" and clears Declarer/Result', () => {
      const game = new PBNGame([
        new PBNSection(['[Declarer "N"]']),
        new PBNSection(['[Contract "3NT"]']),
        new PBNSection(['[Result "9"]']),
      ])
      game.setDealOutcome(DealOutcome.passedOut)
      expect(game.getTagValue('Contract')).toBe('Pass')
      expect(game.getTagValue('Declarer')).toBeUndefined()
      expect(game.getTagValue('Result')).toBeUndefined()
      expect(game.getDealOutcome()).toEqual(DealOutcome.passedOut)
    })

    it('setDealOutcome(played) sets Declarer/Contract/Result and round-trips', () => {
      const game = new PBNGame()
      const outcome = DealOutcome.played(DeclaredContract.make(Contract.make('4H', 'X'), 'E'), 10)
      game.setDealOutcome(outcome)
      expect(game.getTagValue('Declarer')).toBe('E')
      expect(game.getTagValue('Contract')).toBe('4HX')
      expect(game.getTagValue('Result')).toBe('10')
      expect(game.getDealOutcome()).toEqual(outcome)
    })

    it('setDealOutcome throws for kinds with no Declarer/Contract/Result representation', () => {
      const game = new PBNGame()
      expect(() => game.setDealOutcome(DealOutcome.scoreOnly(100))).toThrow()
      expect(() => game.setDealOutcome(DealOutcome.average)).toThrow()
      expect(() => game.setDealOutcome(DealOutcome.averagePlus)).toThrow()
      expect(() => game.setDealOutcome(DealOutcome.averageMinus)).toThrow()
      expect(() => game.setDealOutcome(DealOutcome.noScore)).toThrow()
    })
  })

  describe('getDoubleDummyTricks / setDoubleDummyTricks', () => {
    // Real-world example from a PBN hand record: N=S=[NT7,S9,H6,D6,C8], E=W=[NT6,S4,H6,D7,C4]
    const SAMPLE_PBN = '79668796686467464674'

    it('setDoubleDummyTricks followed by getDoubleDummyTricks round-trips', () => {
      const tricks = DoubleDummyTricks.fromPBN(SAMPLE_PBN)!
      const game = new PBNGame()
      game.setDoubleDummyTricks(tricks)
      expect(game.getDoubleDummyTricks()).toEqual(tricks)
      expect(game.getTagValue('DoubleDummyTricks')).toBe(SAMPLE_PBN)
    })

    it('getDoubleDummyTricks parses the DoubleDummyTricks tag', () => {
      const game = new PBNGame([new PBNSection([`[DoubleDummyTricks "${SAMPLE_PBN}"]`])])
      const tricks = game.getDoubleDummyTricks()
      expect(tricks?.N).toEqual({ NT: 7, S: 9, H: 6, D: 6, C: 8 })
      expect(tricks?.E).toEqual({ NT: 6, S: 4, H: 6, D: 7, C: 4 })
    })

    it('getDoubleDummyTricks is undefined when there is no DoubleDummyTricks tag', () => {
      const game = new PBNGame()
      expect(game.getDoubleDummyTricks()).toBeUndefined()
    })

    it('getDoubleDummyTricks is undefined for a malformed (wrong-length) value', () => {
      const game = new PBNGame([new PBNSection(['[DoubleDummyTricks "1234"]'])])
      expect(game.getDoubleDummyTricks()).toBeUndefined()
    })

    it('setDoubleDummyTricks replaces an existing DoubleDummyTricks tag', () => {
      const game = new PBNGame([new PBNSection([`[DoubleDummyTricks "${SAMPLE_PBN}"]`])])
      const empty = DoubleDummyTricks.make()
      game.setDoubleDummyTricks(empty)
      expect(game.sections).toHaveLength(1)
      expect(game.getTagValue('DoubleDummyTricks')).toBe('F'.repeat(20))
    })
  })

  describe('getParsedSection', () => {
    it('finds the section by tag name and splits it into tagPair/bodyLines/notes/comments', () => {
      const game = new PBNGame([
        new PBNSection(['[Board "1"]']),
        new PBNSection(['[Auction "N"]', '1C Pass 1S Pass', '; a remark', '[Note "1:natural"]']),
      ])
      const parsed = game.getParsedSection('Auction')
      expect(parsed?.tagPair).toEqual({ name: 'Auction', value: 'N' })
      expect(parsed?.bodyLines).toEqual(['1C Pass 1S Pass'])
      expect(parsed?.notes.get('=1=')).toBe('natural')
      expect(parsed?.comments).toEqual(['a remark'])
    })

    it('matches the tag name case-insensitively', () => {
      const game = new PBNGame([new PBNSection(['[Auction "N"]'])])
      expect(game.getParsedSection('auction')?.tagPair).toEqual({ name: 'Auction', value: 'N' })
    })

    it('is undefined when no section has that tag', () => {
      const game = new PBNGame([new PBNSection(['[Board "1"]'])])
      expect(game.getParsedSection('Auction')).toBeUndefined()
    })
  })
})
