import type { CSSProperties, JSX } from 'react'
import { Deal, Direction } from 'ts-contractbridge'
import type { Hand, PlayerNames } from 'ts-contractbridge'
import { HandDiagram } from './HandDiagram.js'

export type DealDiagramProps = {
  readonly deal: Deal
  // Optional — a direction with no name (or this prop omitted entirely) just shows no label
  // above that hand, same as before this prop existed.
  readonly playerNames?: PlayerNames
}

// Compass layout: North top-center, West/East either side, South bottom-center, center cell holds
// the HCP box (see below) — the standard hand-record arrangement. Direction.all is already
// clockwise (N, E, S, W), but the grid position (not iteration order) is what actually places each
// hand, so that's just convenient, not load-bearing.
const cellStyle: Readonly<Record<Direction, CSSProperties>> = {
  N: { gridColumn: 2, gridRow: 1, justifySelf: 'center' },
  W: { gridColumn: 1, gridRow: 2, justifySelf: 'start' },
  E: { gridColumn: 3, gridRow: 2, justifySelf: 'end' },
  S: { gridColumn: 2, gridRow: 3, justifySelf: 'center' },
}

// Each HCP number's position within the center box's own 3x3 grid, mirroring the compass position
// of the hand it belongs to (North's count sits toward the top, West's toward the left, etc).
const hcpCellStyle: Readonly<Record<Direction, CSSProperties>> = {
  N: { gridColumn: 2, gridRow: 1, justifySelf: 'center', alignSelf: 'start' },
  W: { gridColumn: 1, gridRow: 2, justifySelf: 'start', alignSelf: 'center' },
  E: { gridColumn: 3, gridRow: 2, justifySelf: 'end', alignSelf: 'center' },
  S: { gridColumn: 2, gridRow: 3, justifySelf: 'center', alignSelf: 'end' },
}

// A hand's HCP, or "" for a genuinely empty (not-yet-dealt/unknown) hand — deliberately not "0",
// which would be indistinguishable from a real hand that just happens to hold no honors.
const hcpText = (hand: Hand): string => (hand.size === 0 ? '' : String(Deal.hcp(hand)))

// All four hands from a Deal, arranged in the standard compass layout, with a rounded square box
// in the center — sized to match the height of the West/East hands it sits between — showing all
// four hands' HCP, each positioned toward its own compass direction within the box. The box is
// purely a visual divider between the hands plus a place to see every hand's point count at a
// glance; it holds no other state. If playerNames is given and has a name for a direction, that
// name is shown above the hand — a direction with no name (or the whole prop omitted) shows no
// label, same as before this prop existed. No dealer/vulnerability decoration yet, no
// selection/editing; those are later steps.
export function DealDiagram({ deal, playerNames }: DealDiagramProps): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, auto)',
        gridTemplateRows: 'repeat(3, auto)',
        gap: '0.5rem',
        // Left-justified rather than centered — the diagram should sit at the start of whatever
        // container it's in, not float in the middle of the page.
        justifyContent: 'start',
      }}
    >
      {Direction.all.map(dir => {
        // An empty-string name (a real PBN convention — files routinely have e.g. [West ""] when
        // no name was recorded) counts as "no name" here, same as the tag being absent entirely —
        // there's nothing useful to display either way.
        const name = playerNames?.[dir]
        return (
          <div key={dir} style={cellStyle[dir]}>
            {name !== undefined && name !== '' && (
              <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '0.25rem' }}>
                {name}
              </div>
            )}
            <HandDiagram hand={deal.hands[dir]} />
          </div>
        )
      })}
      <div
        style={{
          gridColumn: 2,
          gridRow: 2,
          justifySelf: 'center',
          // Stretches to the row's height (set by the taller of West/East's HandDiagram), then
          // aspect-ratio keeps it square by matching its width to whatever that height turns out
          // to be — so it tracks the hands' actual rendered height rather than a guessed constant.
          alignSelf: 'stretch',
          aspectRatio: '1 / 1',
          boxSizing: 'border-box',
          border: '1px solid currentColor',
          borderRadius: '12%',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          padding: '0.2em 0.35em',
          fontFamily: 'monospace',
          // Deliberately smaller than the surrounding 1rem hand text — these are a secondary,
          // supporting detail, not something that should compete visually with the cards.
          fontSize: '0.75rem',
        }}
      >
        {Direction.all.map(dir => (
          <span key={dir} style={hcpCellStyle[dir]}>{hcpText(deal.hands[dir])}</span>
        ))}
      </div>
    </div>
  )
}
