import type { CSSProperties, JSX } from 'react'
import { Bid, Strain } from 'ts-contractbridge'
import type { Call } from 'ts-contractbridge'
import { StrainSymbol } from './StrainSymbol.js'
import { PickerGrid } from './PickerGrid.js'
import './theme.css'

// The three calls a bidding box offers outside the 35 bids. A plain `Call` isn't used here
// because a bidding box tracks these independently of the bid grid (see BiddingBoxState below) —
// mirrors the Swift reference's separate `bid`/`call` bindings.
export type BiddingBoxCall = 'Pass' | 'X' | 'XX'

export type BiddingBoxState = {
  readonly bid: Bid | undefined
  readonly call: BiddingBoxCall | undefined
}

const make = (): BiddingBoxState => ({ bid: undefined, call: undefined })

// The Call the box currently represents — a bid takes priority only in the sense that Pass and a
// bid are never both set; X/XX and a bid may be, in which case the box represents the bid alone
// (X/XX there means "this bid is doubled/redoubled", read by whoever composes BiddingBox, e.g.
// ContractPicker's risk).
const toCall = (state: BiddingBoxState): Call | undefined => state.bid ?? state.call

export const BiddingBoxState = { make, toCall }

export type BiddingBoxProps = {
  readonly state: BiddingBoxState
  readonly onChange: (state: BiddingBoxState) => void
  // Text shown on the Pass cell. The Swift reference declares this same parameter but never
  // actually applies it to the cell's text; here it does.
  readonly passText?: string
}

// One row per level (1–7), strains right to left starting from clubs, so the higher/more common
// strains (NT, S, H) read left to right — matches a physical bidding box and the Swift
// reference's `Bid.allBids(reverseStrains: true)`.
const allBids: readonly Bid[] = [1, 2, 3, 4, 5, 6, 7].flatMap(level =>
  [...Strain.all].reverse().map(strain => Bid.make(level, strain))
)

// Left to right: Redouble, Pass, Double — the Swift reference's exact order.
const specialCalls: readonly BiddingBoxCall[] = ['XX', 'Pass', 'X']

const identity = (x: string): string => x

// Traditional bidding-box coloring: clubs green, diamonds gold, hearts red, spades blue, NT plain.
const bidColors: Partial<Record<Strain, string>> = {
  C: 'var(--cb-bidbox-clubs)',
  D: 'var(--cb-bidbox-diamonds)',
  H: 'var(--cb-bidbox-hearts)',
  S: 'var(--cb-bidbox-spades)',
}

const bidColor = (bid: Bid): string | undefined => bidColors[Bid.strain(bid)]

const bidStyle = (bid: Bid): CSSProperties => {
  const color = bidColor(bid)
  return color === undefined ? {} : { color }
}

const specialCallStyle = (call: BiddingBoxCall): CSSProperties => ({
  color:
    call === 'Pass' ? 'var(--cb-bidbox-pass)'
      : call === 'X' ? 'var(--cb-bidbox-double)'
        : 'var(--cb-bidbox-redouble)',
})

// A bidding box: the 35 bids plus Pass/Double/Redouble, as two grids — mirroring the Swift
// reference's two `PickerGrid`s and the rules linking them: choosing Pass clears any selected
// bid; choosing a bid clears a selected Pass (a selected Double/Redouble carries over to the new
// bid, same as the reference).
export function BiddingBox({ state, onChange, passText = 'Pass' }: BiddingBoxProps): JSX.Element {
  const selectBid = (bid: Bid | undefined): void => {
    onChange({ bid, call: state.call === 'Pass' ? undefined : state.call })
  }
  const selectCall = (call: BiddingBoxCall | undefined): void => {
    onChange({ bid: call === 'Pass' ? undefined : state.bid, call })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <PickerGrid
        items={allBids}
        selected={state.bid}
        columns={5}
        aspectRatio={1.25}
        allowNilSelection={false}
        itemKey={identity}
        onSelect={selectBid}
        itemStyle={bidStyle}
        renderItem={bid => {
          const color = bidColor(bid)
          return (
            <>
              {Bid.level(bid)}
              <StrainSymbol strain={Bid.strain(bid)} {...(color !== undefined && { color })} />
            </>
          )
        }}
      />
      <PickerGrid
        items={specialCalls}
        selected={state.call}
        columns={3}
        aspectRatio={1}
        allowNilSelection={true}
        itemKey={identity}
        onSelect={selectCall}
        itemStyle={specialCallStyle}
        renderItem={call => (call === 'Pass' ? passText : call)}
      />
    </div>
  )
}
