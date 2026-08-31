import { useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import { Direction, PBNDocument } from 'ts-contractbridge'
import type { PBNGame } from 'ts-contractbridge'
import { DealDiagram } from 'contractbridge-react'

const gameLabel = (game: PBNGame, index: number): string => {
  const board = game.getBoard()
  const dealer = game.getDealer()
  const label = `Board ${board ?? index + 1}`
  return dealer === undefined ? label : `${label} — Dealer ${Direction.name(dealer)}`
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

  const selectedGame = doc?.games[selectedIndex]
  const selectedDeal = selectedGame?.getDeal()

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
            <label>
              Game:{' '}
              <select
                value={selectedIndex}
                onChange={e => setSelectedIndex(Number(e.target.value))}
              >
                {doc.games.map((game, i) => (
                  <option key={i} value={i}>{gameLabel(game, i)}</option>
                ))}
              </select>
            </label>
          </p>

          {selectedDeal !== undefined
            ? <DealDiagram deal={selectedDeal} />
            : <p>This game has no Deal tag to display.</p>}
        </>
      )}
    </main>
  )
}
