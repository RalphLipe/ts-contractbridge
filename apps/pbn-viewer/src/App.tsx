import { useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import { Contract, Direction, PBNDocument, Vulnerable, decodePBNBytes } from 'ts-contractbridge'
import type { PBNGame } from 'ts-contractbridge'
import { DealDiagram, DealResultView, DeclaredContractView, DoubleDummyTricksView, OpeningLeadView } from 'contractbridge-react'
import { ContractEditor } from './ContractEditor.js'

// Spreadsheet-column-style letters (A, B, ... Z, AA, AB, ...) for a game with no real Board tag —
// deliberately NOT a number, so it can never be mistaken for an actual board number.
const letterLabel = (n: number): string => {
  let result = ''
  let x = n
  do {
    result = String.fromCharCode(65 + (x % 26)) + result
    x = Math.floor(x / 26) - 1
  } while (x >= 0)
  return result
}

// One label per game, computed for the whole document at once (not per-game in isolation) so
// duplicate real board numbers can be told apart and missing ones get sequential letters. The
// underlying <select>'s value is always the array index regardless of what these say, so a
// duplicate or synthetic label is a display nicety, never a selection-correctness issue.
const gameLabels = (games: readonly PBNGame[]): readonly string[] => {
  const seenCounts = new Map<number, number>()
  let letterIndex = 0
  return games.map(game => {
    const board = game.getBoard()
    if (board === undefined) {
      const label = `Board ${letterLabel(letterIndex)}`
      letterIndex += 1
      return label
    }
    const count = (seenCounts.get(board) ?? 0) + 1
    seenCounts.set(board, count)
    return count === 1 ? `Board ${board}` : `Board ${board} (${count})`
  })
}

export function App(): JSX.Element {
  const [doc, setDoc] = useState<PBNDocument | undefined>(undefined)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [error, setError] = useState<string | undefined>(undefined)
  // Bumped by ContractEditor after it mutates the selected game in place, so this component
  // re-renders and re-reads the parts of its own display (Result, opening lead, ...) that read
  // straight off that PBNGame. Bumped on every new file too, so ContractEditor's `key` below
  // (which pairs this with selectedIndex) always changes for a genuinely different game, even one
  // that happens to land back on index 0.
  const [docVersion, setDocVersion] = useState(0)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (file === undefined) return
    try {
      // Read raw bytes rather than file.text(), which assumes UTF-8: real PBN files are often Latin-1
      // (BridgeComposer declares charset=ISO-8859-1), and reading one as UTF-8 turns every accented
      // character into a permanent U+FFFD.
      const parsed = PBNDocument.fromPBN(decodePBNBytes(new Uint8Array(await file.arrayBuffer())))
      setDoc(parsed)
      setSelectedIndex(0)
      setDocVersion(v => v + 1)
      setError(parsed.games.length === 0 ? 'No games found in this file.' : undefined)
    } catch (err) {
      setDoc(undefined)
      setError(`Failed to read file: ${String(err)}`)
    }
  }

  const labels = doc !== undefined ? gameLabels(doc.games) : []
  const selectedGame = doc?.games[selectedIndex]
  const selectedDeal = selectedGame?.getDeal()
  const selectedDoubleDummyTricks = selectedGame?.getDoubleDummyTricks()
  const selectedPlayerNames = selectedGame?.getPlayerNames()
  const openingLead = selectedGame?.getOpeningLead()
  const declaredContract = selectedGame?.getDeclaredContract()

  const selectedDealer = selectedGame?.getDealer()

  const resultComments = selectedGame?.getParsedSection('Result')?.comments ?? []
  const dealOutcome = selectedGame?.getDealOutcome()
  const vulnerable = selectedGame?.getVulnerable()
  const dealerVulnerableText = [
    selectedDealer !== undefined ? `Dealer: ${Direction.name(selectedDealer)}` : undefined,
    vulnerable !== undefined ? `Vulnerable: ${vulnerable}` : undefined,
  ].filter((s): s is string => s !== undefined).join('   ')
  // Only a genuine "played" outcome with a known vulnerability (needed to compute the score) gets
  // the tricks-taken/score line; anything else (passedOut, no DealOutcome at all, vulnerability
  // unknown) falls back to showing just the comments.
  const playedResult =
    dealOutcome?.kind === 'played' && vulnerable !== undefined
      ? {
          tricksTaken: dealOutcome.tricksTaken,
          score: Contract.declarerScore(
            dealOutcome.declaredContract.contract,
            Vulnerable.isVulDirection(vulnerable, dealOutcome.declaredContract.declarer),
            dealOutcome.tricksTaken
          ),
        }
      : undefined

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>PBN Viewer</h1>
      <input type="file" accept=".pbn,text/plain" onChange={handleFileChange} />

      {error !== undefined && (
        <p style={{ color: 'var(--cb-suit-red, #c62828)' }}>{error}</p>
      )}

      {doc !== undefined && doc.games.length > 0 && (
        <>
          <p>
            <select
              value={selectedIndex}
              onChange={e => setSelectedIndex(Number(e.target.value))}
            >
              {labels.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </p>

          {dealerVulnerableText !== '' && <p>{dealerVulnerableText}</p>}

          {selectedDeal !== undefined
            ? <DealDiagram
                deal={selectedDeal}
                {...(selectedPlayerNames !== undefined && { playerNames: selectedPlayerNames })}
              />
            : <p>This game has no Deal tag to display.</p>}

          {selectedDoubleDummyTricks !== undefined &&
            <DoubleDummyTricksView tricks={selectedDoubleDummyTricks} />}

          {declaredContract !== undefined && <DeclaredContractView declaredContract={declaredContract} />}

          {selectedGame !== undefined && (
            <ContractEditor
              key={`${docVersion}-${selectedIndex}`}
              game={selectedGame}
              onChange={() => setDocVersion(v => v + 1)}
              {...(selectedPlayerNames !== undefined && { names: selectedPlayerNames })}
            />
          )}

          {openingLead !== undefined && <OpeningLeadView {...openingLead} />}

          <DealResultView
            comments={resultComments}
            {...(playedResult !== undefined && { playedResult })}
          />
        </>
      )}
    </main>
  )
}
