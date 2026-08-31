import type { JSX } from 'react'
import { Deal } from 'ts-contractbridge'
import { DealDiagram } from 'contractbridge-react'

// A sample deal, just to have something real to render.
const sampleDeal = Deal.fromPBN(
  'N:AKQ.JT9.876.5432 JT9.AKQ.5432.876 876.5432.AKQ.JT9 5432.876.JT9.AKQ'
)

export function App(): JSX.Element {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>PBN Viewer</h1>
      {'hands' in sampleDeal
        ? <DealDiagram deal={sampleDeal} />
        : <p>Failed to parse sample deal.</p>}
    </main>
  )
}
