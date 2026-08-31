import type { JSX } from 'react'
import { Suit } from 'ts-contractbridge'
import { SuitSymbol } from 'contractbridge-react'

// Workspace wiring proof-of-life: renders a real component from contractbridge-react, which
// itself imports a real type from ts-contractbridge — proving the whole chain resolves (types and
// bundling) before any actual PBN-loading/viewing feature is built.
export function App(): JSX.Element {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>PBN Viewer</h1>
      <p>Workspace wiring check — one glyph per suit, via contractbridge-react:</p>
      <p style={{ fontSize: '2rem' }}>
        {Suit.all.map(suit => (
          <SuitSymbol key={suit} suit={suit} />
        ))}
      </p>
    </main>
  )
}
