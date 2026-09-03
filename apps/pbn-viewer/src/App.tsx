import { useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import { Contract, Direction, PBNDocument, Vulnerable } from 'ts-contractbridge'
import type { PBNGame } from 'ts-contractbridge'
import { AuctionTable, DealDiagram, DealResultView, DoubleDummyTricksView } from 'contractbridge-react'

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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (file === undefined) return
    try {
      const text = await file.text()
      const parsed = PBNDocument.fromPBN(text)
      setDoc(parsed)
      setSelectedIndex(0)
      setError(parsed.games.length === 0 ? 'No games found in this file.' : undefined)
    } catch (err) {
      setDoc(undefined)
      setError(`Failed to read file: ${String(err)}`)
    }
  }

  const labels = doc !== undefined ? gameLabels(doc.games) : []
  const selectedGame = doc?.games[selectedIndex]
  const selectedDeal = selectedGame?.getDeal()
  const selectedAuction = selectedGame?.getAuction()
  const selectedDoubleDummyTricks = selectedGame?.getDoubleDummyTricks()
  const selectedPlayerNames = selectedGame?.getPlayerNames()

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

          {selectedAuction !== undefined && <AuctionTable auction={selectedAuction} />}

          <DealResultView
            comments={resultComments}
            {...(playedResult !== undefined && { playedResult })}
          />
        </>
      )}
    </main>
  )
}
