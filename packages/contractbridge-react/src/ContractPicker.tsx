import type { JSX } from 'react'
import { Contract, DeclaredContract, Direction } from 'ts-contractbridge'
import type { Risk } from 'ts-contractbridge'
import { BiddingBox, BiddingBoxState } from './BiddingBox.js'
import { PickerGrid } from './PickerGrid.js'
import './theme.css'

export type ContractPickerState = {
  readonly biddingBoxState: BiddingBoxState
  readonly declarer: Direction | undefined
  readonly passConfirmed: boolean
  readonly showingPassConfirmation: boolean
}

const make = (): ContractPickerState =>
  ({ biddingBoxState: BiddingBoxState.make(), declarer: undefined, passConfirmed: false, showingPassConfirmation: false })

const makePassedOut = (): ContractPickerState =>
  ({ biddingBoxState: { bid: undefined, call: 'Pass' }, declarer: undefined, passConfirmed: true, showingPassConfirmation: false })

const fromDeclaredContract = (declaredContract: DeclaredContract): ContractPickerState => {
  const { contract, declarer } = declaredContract
  return {
    biddingBoxState: { bid: contract.bid, call: contract.risk === '' ? undefined : contract.risk },
    declarer,
    passConfirmed: false,
    showingPassConfirmation: false,
  }
}

const risk = (state: ContractPickerState): Risk =>
  state.biddingBoxState.call === 'X' || state.biddingBoxState.call === 'XX' ? state.biddingBoxState.call : ''

const isPassedOut = (state: ContractPickerState): boolean =>
  state.biddingBoxState.call === 'Pass' && state.passConfirmed

const contract = (state: ContractPickerState): Contract | undefined =>
  state.biddingBoxState.bid === undefined ? undefined : Contract.make(state.biddingBoxState.bid, risk(state))

const isValid = (state: ContractPickerState): boolean =>
  (!state.showingPassConfirmation && isPassedOut(state)) ||
  (contract(state) !== undefined && state.declarer !== undefined)

const declaredContract = (state: ContractPickerState): DeclaredContract | undefined => {
  const c = contract(state)
  return c !== undefined && state.declarer !== undefined ? DeclaredContract.make(c, state.declarer) : undefined
}

export const ContractPickerState = {
  make, makePassedOut, fromDeclaredContract,
  risk, isPassedOut, contract, isValid, declaredContract,
}

export type ContractPickerProps = {
  readonly state: ContractPickerState
  readonly onChange: (state: ContractPickerState) => void
  readonly names?: Partial<Record<Direction, string>>
}

// Left to right: West, North, South, East — the Swift reference's exact order.
const declarerDirections: readonly Direction[] = ['W', 'N', 'S', 'E']

const identity = (x: string): string => x

// A BiddingBox plus a declarer picker, for entering a final declared contract (not a full
// auction) — mirrors the Swift reference. Picking Pass clears any declarer and, unless the hand
// was already confirmed passed out, asks for confirmation before treating it as one
// (`state.showingPassConfirmation`); picking a bid or a declarer while that confirmation is
// showing cancels it.
export function ContractPicker({ state, onChange, names }: ContractPickerProps): JSX.Element {
  const handleBiddingBoxChange = (newBiddingBoxState: BiddingBoxState): void => {
    const becamePass = newBiddingBoxState.call === 'Pass' && state.biddingBoxState.call !== 'Pass'
    const gotNewBid = newBiddingBoxState.bid !== undefined && newBiddingBoxState.bid !== state.biddingBoxState.bid

    onChange({
      ...state,
      biddingBoxState: newBiddingBoxState,
      declarer: becamePass ? undefined : state.declarer,
      passConfirmed: gotNewBid ? false : state.passConfirmed,
      showingPassConfirmation: becamePass ? !state.passConfirmed : state.showingPassConfirmation,
    })
  }

  const handleDeclarerChange = (declarer: Direction | undefined): void => {
    const clearsPass = declarer !== undefined && state.biddingBoxState.call === 'Pass'
    onChange({
      ...state,
      declarer,
      passConfirmed: declarer !== undefined ? false : state.passConfirmed,
      biddingBoxState: clearsPass ? { ...state.biddingBoxState, call: undefined } : state.biddingBoxState,
    })
  }

  const confirmPassedOut = (): void =>
    onChange({ ...state, passConfirmed: true, showingPassConfirmation: false })

  const cancelPassedOut = (): void =>
    onChange({ ...state, biddingBoxState: { ...state.biddingBoxState, call: undefined }, showingPassConfirmation: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <BiddingBox state={state.biddingBoxState} onChange={handleBiddingBoxChange} />
      <PickerGrid
        items={declarerDirections}
        selected={state.declarer}
        columns={4}
        aspectRatio={1}
        allowNilSelection={true}
        itemKey={identity}
        onSelect={handleDeclarerChange}
        renderItem={direction => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '1.3em' }}>{Direction.toPBN(direction)}</span>
            {names?.[direction] !== undefined && (
              <span style={{ fontSize: '0.7em', opacity: 0.7 }}>{names[direction]}</span>
            )}
          </div>
        )}
      />
      {state.showingPassConfirmation && (
        <div
          role="alertdialog"
          aria-label="Pass out hand?"
          style={{
            border: '1px solid var(--cb-bidbox-border, #999)',
            borderRadius: 8,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span>Pass out hand?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={confirmPassedOut}>Yes</button>
            <button type="button" onClick={cancelPassedOut}>No</button>
          </div>
        </div>
      )}
    </div>
  )
}
