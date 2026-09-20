import type { JSX } from 'react'
import { PBNFormattedText } from './PBNFormattedText.js'

export type DealResultViewProps = {
  // The Result tag's section comments (PBNGame.getParsedSection('Result')?.comments ?? []).
  // May be empty — the tricks/score line below can still show on its own.
  readonly comments: readonly string[]
  // Present only when the app found a valid DealOutcome of kind 'played' (and could compute a
  // score for it) — shown above the comments. Omitted for any other outcome (passedOut, no
  // DealOutcome at all, etc.), in which case only the comments render.
  readonly playedResult?: {
    readonly tricksTaken: number
    readonly score: number
  }
}

// The tricks taken and score (when there's a valid played result to report), then the Result tag's
// own free-text comments. Either part can appear without the other, and nothing renders at all if
// there's neither. Just a display; the app decides what counts as "valid" and computes the score
// (see apps/pbn-viewer/src/App.tsx).
export function DealResultView({ comments, playedResult }: DealResultViewProps): JSX.Element | null {
  if (comments.length === 0 && playedResult === undefined) return null
  return (
    <div>
      {playedResult !== undefined && (
        <p>
          {playedResult.tricksTaken} tricks, {playedResult.score >= 0 ? '+' : ''}
          {playedResult.score}
        </p>
      )}
      {comments.map((comment, i) => (
        <p key={i}><PBNFormattedText text={comment} /></p>
      ))}
    </div>
  )
}
