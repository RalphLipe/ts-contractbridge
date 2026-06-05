import { Contract } from './contract.js'
import { Direction } from './direction.js'

export type DeclaredContract = { readonly contract: Contract; readonly declarer: Direction }

export namespace DeclaredContract {
  export const make = (contract: Contract, declarer: Direction): DeclaredContract =>
    ({ contract, declarer })

  /** String representation: contract PBN followed by declarer (e.g. "3NTW", "5DXE"). */
  export const pbn = (dc: DeclaredContract): string =>
    `${Contract.pbn(dc.contract)}${dc.declarer}`

  export const symbol = (dc: DeclaredContract): string =>
    `${Contract.symbol(dc.contract)}${dc.declarer}`

  /** Parse a string of the form "3NTW", "4HXN", "5CXXE". */
  export const fromPBN = (s: string): DeclaredContract | undefined => {
    if (s.length < 3) return undefined
    const declarer = s[s.length - 1] as string
    if (!Direction.isDirection(declarer)) return undefined
    const contract = Contract.fromPBN(s.slice(0, -1))
    return contract === undefined ? undefined : { contract, declarer }
  }

  export const rotated = (dc: DeclaredContract, seats: number): DeclaredContract =>
    ({ contract: dc.contract, declarer: Direction.rotated(dc.declarer, seats) })

  /** Returns negative if a < b, positive if a > b, 0 if equal. */
  export const compare = (a: DeclaredContract, b: DeclaredContract): number => {
    const cmp = Contract.compare(a.contract, b.contract)
    if (cmp !== 0) return cmp
    return Direction.all.indexOf(a.declarer) - Direction.all.indexOf(b.declarer)
  }
}
