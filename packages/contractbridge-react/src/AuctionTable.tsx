import type { JSX, ReactNode } from 'react'
import { Bid, Direction, Strain } from 'ts-contractbridge'
import type { Call, PBNAuction, PBNAuctionCall } from 'ts-contractbridge'
import { SuitSymbol } from './SuitSymbol.js'

// Standard hand-record column order — West first (leftmost), then North, East, South — NOT
// Direction.all's clockwise-from-North order. This is the conventional layout Ralph asked for,
// matching how the compass diagram places West on the left, so West's calls read left-to-right
// first too.
const auctionColumns: readonly Direction[] = ['W', 'N', 'E', 'S']

export type AuctionTableProps = {
  readonly auction: PBNAuction
}

// "Pass"/"X"/"XX" render as-is; a bid renders as its level plus a colored suit glyph (via
// SuitSymbol, matching HandDiagram's suit coloring) or the literal "NT" for no-trump.
const callNode = (call: Call): ReactNode => {
  if (call === 'Pass' || call === 'X' || call === 'XX') return call
  const suit = Strain.toSuit(Bid.strain(call))
  return (
    <>
      {Bid.level(call)}
      {suit === null ? 'NT' : <SuitSymbol suit={suit} />}
    </>
  )
}

// A standard 4-column auction table (W/N/E/S), one call per cell, wrapping to a new row every 4
// cells starting from the dealer's column. Notes are shown as a numbered list below, referenced
// from each call via a superscript matching PBN's own "=N=" marker. Just a display of a
// PBNAuction — no bidding-box/editing here; that's a later step.
export function AuctionTable({ auction }: AuctionTableProps): JSX.Element {
  // auctionColumns (W, N, E, S) is the fixed column order regardless of dealer — the dealer's
  // calls just start partway into the first row, leaving the earlier columns of that row blank.
  const leadingBlanks = auctionColumns.indexOf(auction.dealer)
  const cells: (PBNAuctionCall | undefined)[] = [
    ...(Array(leadingBlanks).fill(undefined) as undefined[]),
    ...auction.calls,
  ]
  const rows: (PBNAuctionCall | undefined)[][] = []
  for (let i = 0; i < cells.length; i += 4) {
    rows.push(cells.slice(i, i + 4))
  }

  // Notes, in the order they were assigned (PBNAuctionCall.noteNumber), shown as a numbered list
  // below the table — matches the "=N=" reference shown as a superscript in each call's cell.
  const notes = auction.calls
    .filter((ac): ac is PBNAuctionCall & { note: string; noteNumber: number } => ac.note !== undefined)
    .sort((a, b) => a.noteNumber - b.noteNumber)

  return (
    <div>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {auctionColumns.map(dir => (
              <th key={dir} style={{ padding: '0.15em 0.75em', textAlign: 'left' }}>
                {Direction.name(dir)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {auctionColumns.map((_, colIndex) => {
                const ac = row[colIndex]
                return (
                  <td key={colIndex} style={{ padding: '0.15em 0.75em' }}>
                    {ac !== undefined && (
                      <>
                        {callNode(ac.call)}
                        {ac.noteNumber !== undefined && <sup>{ac.noteNumber}</sup>}
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.length > 0 && (
        <ol>
          {notes.map(n => (
            <li key={n.noteNumber} value={n.noteNumber}>{n.note}</li>
          ))}
        </ol>
      )}
    </div>
  )
}
