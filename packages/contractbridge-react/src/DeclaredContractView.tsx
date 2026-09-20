import type { JSX } from 'react'
import { Bid, Direction } from 'ts-contractbridge'
import type { DeclaredContract } from 'ts-contractbridge'
import { StrainSymbol } from './StrainSymbol.js'

export type DeclaredContractViewProps = {
  readonly declaredContract: DeclaredContract
}

// One line: "Contract: 4♥X by South". Uses StrainSymbol for the strain (so the suit gets the usual
// red/black theming, and NT stays plain text), with risk (X / XX) directly after it, and the
// declarer's full name after "by" — mirroring the Swift reference's contract line. Shown whether
// or not the deal has a result yet; a Contract/Declarer with no Result is common in real files.
export function DeclaredContractView({ declaredContract }: DeclaredContractViewProps): JSX.Element {
  const { contract, declarer } = declaredContract
  return (
    <p>
      Contract: {Bid.level(contract.bid)}<StrainSymbol strain={Bid.strain(contract.bid)} />
      {contract.risk} by {Direction.name(declarer)}
    </p>
  )
}
