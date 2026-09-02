import type { CSSProperties, JSX, ReactNode } from 'react'
import { PairDirection, Strain } from 'ts-contractbridge'
import type { DoubleDummyTricks } from 'ts-contractbridge'
import { StrainSymbol } from './StrainSymbol.js'
import './theme.css'

export type DoubleDummyTricksViewProps = {
  readonly tricks: DoubleDummyTricks
}

// A background chip behind a result that makes fewer than 7 tricks — the strain symbol and trick
// count on top stay the normal foreground color/theming, only the fill changes (Ralph's explicit
// choice; the ContractBridgeUI Swift reference this was ported from colors the text itself blue
// instead — flagged and confirmed with Ralph before diverging from it).
const underTricksChipStyle: CSSProperties = {
  backgroundColor: 'var(--cb-under-tricks-bg, #bbdefb)',
  borderRadius: '3px',
  padding: '0 0.2em',
}

// One strain's combined double-dummy result for a pair, mirroring ContractBridgeUI's
// DoubleDummyTricksView (Sources/ContractBridgeUI/DoubleDummuyTricksView.swift) exactly except
// for the under-7-tricks styling noted above:
// - both partners make (>6 tricks): a single shared strain symbol, with the contract level(s) to
//   its left — one level if the partners agree, "level/level" if they don't (e.g. one partner
//   makes 1NT, the other makes 2NT).
// - both fail to make 7 tricks: a single shared strain symbol (in the blue chip), with the raw
//   trick count(s) — not a level — to its right.
// - split (one partner makes, the other doesn't): two independent sub-results, each with its own
//   strain symbol, in seat order, joined by "/" — e.g. North makes 1NT, South only takes 6 tricks
//   in NT, renders as "1NT/NT6".
function strainCell(a: number | undefined, b: number | undefined, strain: Strain): ReactNode {
  if (a === undefined || b === undefined) return null

  const makingNode = (level: number): ReactNode => (
    <>{level}<StrainSymbol strain={strain} /></>
  )
  const underNode = (tricks: number): ReactNode => (
    <span style={underTricksChipStyle}><StrainSymbol strain={strain} />{tricks}</span>
  )

  if (a > 6) {
    if (b > 6) {
      const levels = a === b ? `${a - 6}` : `${a - 6}/${b - 6}`
      return <>{levels}<StrainSymbol strain={strain} /></>
    }
    return <>{makingNode(a - 6)}/{underNode(b)}</>
  }
  if (b <= 6) {
    const tricks = a === b ? `${a}` : `${a}/${b}`
    return <span style={underTricksChipStyle}><StrainSymbol strain={strain} />{tricks}</span>
  }
  return <>{underNode(a)}/{makingNode(b - 6)}</>
}

// Both pairs' double-dummy results (NS, EW), one row each, one cell per strain — just a display
// of a DoubleDummyTricks, no editing, matching the established component boundary.
export function DoubleDummyTricksView({ tricks }: DoubleDummyTricksViewProps): JSX.Element {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {PairDirection.all.map(pair => {
          const [d0, d1] = PairDirection.directions(pair)
          return (
            <tr key={pair}>
              <td style={{ padding: '0.15em 0.5em', fontWeight: 'bold' }}>{pair}</td>
              {Strain.all.map(strain => (
                <td key={strain} style={{ padding: '0.15em 0.5em' }}>
                  {strainCell(tricks[d0][strain], tricks[d1][strain], strain)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
