import type { CSSProperties, JSX, ReactNode } from 'react'
import { PairDirection, Strain } from 'ts-contractbridge'
import type { DoubleDummyTricks, Tricks } from 'ts-contractbridge'
import { StrainSymbol } from './StrainSymbol.js'
import './theme.css'

export type DoubleDummyTricksViewProps = {
  readonly tricks: DoubleDummyTricks
}

// A translucent background wash behind a result where both sides fail to make 7 tricks — the
// strain symbol and trick count on top stay the normal foreground color/theming, only the fill
// changes. Matches the reference in Sources/ContractBridgeUI/DoubleDummuyTricksView.swift
// (swift-contract-bridge — the authoritative reference from now on) almost exactly: it uses
// `Color.blue.opacity(0.45)` as a plain background with no padding/rounding of its own
// (`HStack(spacing: 0)`), so this uses the same rgba(0, 122, 255, 0.45) — iOS's system blue at the
// same opacity — with no border-radius/padding added on our side either. Being translucent, it
// blends over whatever's underneath, so (like the Swift version) no separate dark-mode value is
// needed — it isn't a `--cb-*` token like the other colors in this module.
const underTricksBackground: CSSProperties = {
  backgroundColor: 'rgba(0, 122, 255, 0.45)',
}

const makingNode = (level: number, strain: Strain): ReactNode => (
  <>{level}<StrainSymbol strain={strain} /></>
)
// tricks is a single count (from atLeastOneMakesNode's split case) or an already-formatted
// "a/b" string (from pairCells' both-fail case, when the two sides differ).
const underNode = (tricks: number | string, strain: Strain): ReactNode => (
  <span style={underTricksBackground}><StrainSymbol strain={strain} />{tricks}</span>
)

// A strain where at least one side makes (>6 tricks) — mirrors atLeastOneMakes in the Swift
// reference: both make → one shared strain symbol, contract level(s) to its left (a single level
// if the partners agree, "level/level" if they don't); split (only one side makes) → two full
// independent sub-results, each with its own strain symbol, in seat order, joined by "/" — e.g.
// North makes 1NT, South only takes 6 tricks in NT, renders as "1NT/NT6".
function atLeastOneMakesNode(a: number, b: number, strain: Strain): ReactNode {
  if (a > 6 && b > 6) {
    const levels = a === b ? `${a - 6}` : `${a - 6}/${b - 6}`
    return <>{levels}<StrainSymbol strain={strain} /></>
  }
  return a > 6
    ? <>{makingNode(a - 6, strain)}/{underNode(b, strain)}</>
    : <>{underNode(a, strain)}/{makingNode(b - 6, strain)}</>
}

// One pair's full row of results. Ralph pointed at swift-contract-bridge's
// DoubleDummuyTricksView.swift as the reference to match, and its `body` does NOT lay results out
// in strain order — it makes two full passes over every strain (each in Strain.allCases/Strain.all
// order): first every strain where at least one side makes, THEN every strain where both sides
// fail, each pass's results kept in strain order among themselves but the two groups never
// interleaved. E.g. a real hand-record-2.pbn board where N=S have NT7,S9,H6,D6,C8 renders as
// "2♣ 3♠ 1NT ♦6 ♥6" (both make-strains C,S,NT together, THEN both fail-strains D,H) — NOT
// "2♣ ♦6 ♥6 3♠ 1NT" (strict per-strain order), which is what an earlier version of this component
// produced before being checked against the actual reference file.
function pairCells(tricks0: Tricks, tricks1: Tricks): ReactNode[] {
  const cells: ReactNode[] = []
  for (const strain of Strain.all) {
    const a = tricks0[strain]
    const b = tricks1[strain]
    if (a !== undefined && b !== undefined && (a > 6 || b > 6)) {
      cells.push(atLeastOneMakesNode(a, b, strain))
    }
  }
  for (const strain of Strain.all) {
    const a = tricks0[strain]
    const b = tricks1[strain]
    if (a !== undefined && b !== undefined && a <= 6 && b <= 6) {
      cells.push(underNode(a === b ? a : `${a}/${b}`, strain))
    }
  }
  return cells
}

// Both pairs' double-dummy results (NS, EW), one row each — a plain horizontal flow per row
// (matching the Swift reference's HStack — no fixed per-strain columns, since the two pairs can
// have a different number of "makes"/"fails" results and Swift never tries to align them across
// rows). Just a display of a DoubleDummyTricks, no editing, matching the established component
// boundary.
export function DoubleDummyTricksView({ tricks }: DoubleDummyTricksViewProps): JSX.Element {
  return (
    <div>
      {PairDirection.all.map(pair => {
        const [d0, d1] = PairDirection.directions(pair)
        return (
          <div key={pair} style={{ display: 'flex', gap: '0.5em', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 'bold' }}>{pair}</span>
            {pairCells(tricks[d0], tricks[d1]).map((cell, i) => <span key={i}>{cell}</span>)}
          </div>
        )
      })}
    </div>
  )
}
