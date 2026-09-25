import { useState } from 'react'
import type { JSX } from 'react'
import { BiddingBox, BiddingBoxState, ContractPicker, ContractPickerState, AuctionTable } from 'contractbridge-react'
import { DealOutcome, Direction, PBNAuction, PBNAuctionError } from 'ts-contractbridge'
import type { PBNGame, PlayerNames } from 'ts-contractbridge'

// The three ways a game's contract can be recorded, and the only three this editor lets you
// switch between: erase it entirely, enter it directly (ContractPicker), or build it up call by
// call (an auction, which then derives the contract itself). Switching modes commits right away —
// there's no separate "cancel"; picking a different mode is itself the undo.
type Mode = 'none' | 'contract' | 'auction'

const deriveMode = (game: PBNGame): Mode => {
  if (game.getAuction() !== undefined) return 'auction'
  if (game.getDeclaredContract() !== undefined) return 'contract'
  if (game.getTagValue('Contract')?.toUpperCase() === 'PASS') return 'contract'
  return 'none'
}

const deriveContractPickerState = (game: PBNGame): ContractPickerState => {
  const declaredContract = game.getDeclaredContract()
  if (declaredContract !== undefined) return ContractPickerState.fromDeclaredContract(declaredContract)
  if (game.getTagValue('Contract')?.toUpperCase() === 'PASS') return ContractPickerState.makePassedOut()
  return ContractPickerState.make()
}

export type ContractEditorProps = {
  readonly game: PBNGame
  // Called after every mutation of `game`, so the app can re-render the parts of its own display
  // (Result, opening lead, and so on) that read straight off `game` rather than through this
  // component's own state.
  readonly onChange: () => void
  readonly names?: PlayerNames
}

// Give this a `key` that changes whenever `game` itself changes (a different board, or a newly
// loaded file) — its mode and in-progress edits are only ever seeded from `game` once, on mount.
export function ContractEditor({ game, onChange, names }: ContractEditorProps): JSX.Element {
  const [mode, setMode] = useState<Mode>(() => deriveMode(game))
  const [contractPickerState, setContractPickerState] = useState<ContractPickerState>(() => deriveContractPickerState(game))
  const [biddingBoxState, setBiddingBoxState] = useState<BiddingBoxState>(BiddingBoxState.make())
  const [pendingNote, setPendingNote] = useState('')
  const [auctionError, setAuctionError] = useState<string | undefined>(undefined)

  const auction = game.getAuction()

  const handleModeChange = (newMode: Mode): void => {
    setMode(newMode)
    setAuctionError(undefined)
    if (newMode === 'none') {
      game.deleteSection('Auction')
      game.setTag({ name: 'Contract', value: '' })
      game.setTag({ name: 'Declarer', value: '' })
      onChange()
    } else if (newMode === 'contract') {
      game.deleteSection('Auction')
      setContractPickerState(deriveContractPickerState(game))
      onChange()
    } else if (game.getAuction() === undefined) {
      // Entering auction mode fresh (no auction recorded yet): start one right away if the
      // game's Dealer is already known; otherwise the render below asks for it first.
      const dealer = game.getDealer()
      if (dealer !== undefined) {
        game.setAuction(PBNAuction.make(dealer))
        onChange()
      }
    }
  }

  const handleContractPickerChange = (newState: ContractPickerState): void => {
    setContractPickerState(newState)
    if (!ContractPickerState.isValid(newState)) return
    if (ContractPickerState.isPassedOut(newState)) {
      game.setDealOutcome(DealOutcome.passedOut)
    } else {
      const declaredContract = ContractPickerState.declaredContract(newState)
      if (declaredContract === undefined) return
      game.setDeclaredContract(declaredContract)
    }
    onChange()
  }

  const handleChooseDealer = (dealer: Direction): void => {
    game.setAuction(PBNAuction.make(dealer))
    onChange()
  }

  const handleAddCall = (): void => {
    const call = BiddingBoxState.toCall(biddingBoxState)
    if (call === undefined || auction === undefined) return
    try {
      const note = pendingNote.trim() === '' ? undefined : pendingNote.trim()
      game.setAuction(PBNAuction.makingCall(auction, call, note))
      setBiddingBoxState(BiddingBoxState.make())
      setPendingNote('')
      setAuctionError(undefined)
      onChange()
    } catch (err) {
      setAuctionError(err instanceof PBNAuctionError ? err.message : String(err))
    }
  }

  const handleUndoCall = (): void => {
    if (auction === undefined || auction.calls.length === 0) return
    game.setAuction(PBNAuction.undoingLast(auction))
    setAuctionError(undefined)
    onChange()
  }

  return (
    <div style={{ margin: '0.75rem 0' }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {(['none', 'contract', 'auction'] as const).map(m => (
          <label key={m}>
            <input type="radio" name="contract-mode" checked={mode === m} onChange={() => handleModeChange(m)} />
            {' '}{m === 'none' ? 'No contract' : m === 'contract' ? 'Contract' : 'Auction'}
          </label>
        ))}
      </div>

      {mode === 'contract' && (
        <ContractPicker
          state={contractPickerState}
          onChange={handleContractPickerChange}
          {...(names !== undefined && { names })}
        />
      )}

      {mode === 'auction' && (
        auction === undefined
          ? <DealerPrompt onChoose={handleChooseDealer} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <AuctionTable auction={auction} />
              <p>
                {PBNAuction.isComplete(auction)
                  ? 'Auction complete.'
                  : `Next to call: ${Direction.name(PBNAuction.nextToAct(auction))}`}
              </p>
              {!PBNAuction.isComplete(auction) && (
                <>
                  <BiddingBox state={biddingBoxState} onChange={setBiddingBoxState} />
                  <input
                    type="text"
                    placeholder="Note for this call (optional)"
                    value={pendingNote}
                    onChange={e => setPendingNote(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddCall}
                    disabled={BiddingBoxState.toCall(biddingBoxState) === undefined}
                  >
                    Add call
                  </button>
                  {auctionError !== undefined && (
                    <p style={{ color: 'var(--cb-suit-red, #c62828)' }}>{auctionError}</p>
                  )}
                </>
              )}
              <button type="button" onClick={handleUndoCall} disabled={auction.calls.length === 0}>
                Undo last call
              </button>
            </div>
          )
      )}
    </div>
  )
}

type DealerPromptProps = {
  readonly onChoose: (dealer: Direction) => void
}

function DealerPrompt({ onChoose }: DealerPromptProps): JSX.Element {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <p>Who dealt?</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {Direction.all.map(direction => (
          <button key={direction} type="button" onClick={() => onChoose(direction)}>
            {Direction.name(direction)}
          </button>
        ))}
      </div>
    </div>
  )
}
