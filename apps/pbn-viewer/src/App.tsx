import type { JSX } from 'react'
import { Deal } from 'ts-contractbridge'
import type { Hand } from 'ts-contractbridge'
import { HandDiagram } from 'contractbridge-react'

// A sample North hand, just to have something real to render.
const sampleDeal = Deal.fromPBN(
  'N:AKQ.JT9.876.5432 JT9.AKQ.5432.876 876.5432.AKQ.JT9 5432.876.JT9.AKQ'
)
const sampleHand: Hand = 'hands' in sampleDeal ? sampleDeal.hands['N'] : new Set()

export function App(): JSX.Element {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>PBN Viewer</h1>
      <p>North's hand:</p>
      <HandDiagram hand={sampleHand} />
    </main>
  )
}
