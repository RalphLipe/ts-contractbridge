import type { CSSProperties, JSX } from 'react'
import { Direction } from 'ts-contractbridge'
import type { Deal } from 'ts-contractbridge'
import { HandDiagram } from './HandDiagram.js'

export type DealDiagramProps = {
  readonly deal: Deal
}

// Compass layout: North top-center, West/East either side, South bottom-center, center cell left
// empty — the standard hand-record arrangement. Direction.all is already clockwise (N, E, S, W),
// but the grid position (not iteration order) is what actually places each hand, so that's just
// convenient, not load-bearing.
const cellStyle: Readonly<Record<Direction, CSSProperties>> = {
  N: { gridColumn: 2, gridRow: 1, justifySelf: 'center' },
  W: { gridColumn: 1, gridRow: 2, justifySelf: 'start' },
  E: { gridColumn: 3, gridRow: 2, justifySelf: 'end' },
  S: { gridColumn: 2, gridRow: 3, justifySelf: 'center' },
}

// All four hands from a Deal, arranged in the standard compass layout. Just a display of a Deal —
// no dealer/vulnerability decoration yet, no selection/editing; those are later steps.
export function DealDiagram({ deal }: DealDiagramProps): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, auto)',
        gridTemplateRows: 'repeat(3, auto)',
        gap: '1rem',
        justifyContent: 'center',
      }}
    >
      {Direction.all.map(dir => (
        <div key={dir} style={cellStyle[dir]}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '0.25rem' }}>
            {Direction.name(dir)}
          </div>
          <HandDiagram hand={deal.hands[dir]} />
        </div>
      ))}
    </div>
  )
}
