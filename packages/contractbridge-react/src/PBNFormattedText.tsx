import type { CSSProperties, JSX } from 'react'
import { parsePBNFormattedText } from 'ts-contractbridge'
import { SuitSymbol } from './SuitSymbol.js'

export type PBNFormattedTextProps = {
  readonly text: string
}

// white-space: pre-line is what turns parsePBNFormattedText's forced "\n"s back into real line
// breaks (from a blank line, or the author's own explicit "\n" escape), while ordinary spaces
// between words still wrap normally to fit whatever container this ends up inside — this is what
// makes a comment/note read as one flowing paragraph rather than a fixed-width block. It's set
// once here and inherits down to every run's own <span>, so those don't need it individually.
const containerStyle: CSSProperties = { whiteSpace: 'pre-line' }

const runStyle = (run: { bold: boolean; italic: boolean; underline: boolean }): CSSProperties => ({
  fontWeight: run.bold ? 'bold' : undefined,
  fontStyle: run.italic ? 'italic' : undefined,
  textDecoration: run.underline ? 'underline' : undefined,
})

// Renders PBN free-text (an Auction note, or a section comment) with its formatting conventions
// applied: <b>/<i>/<u> become real bold/italic/underline, \S \H \D \C become colored suit glyphs
// (via SuitSymbol, so they get the same red/black theming as everywhere else), and newlines are
// only where parsePBNFormattedText decided one belongs (see there) — not everywhere the raw PBN
// source happened to wrap. Just a display of a string — no editing.
export function PBNFormattedText({ text }: PBNFormattedTextProps): JSX.Element {
  const runs = parsePBNFormattedText(text)
  return (
    <span style={containerStyle}>
      {runs.map((run, i) =>
        run.kind === 'suit'
          ? <span key={i} style={runStyle(run)}><SuitSymbol suit={run.suit} /></span>
          : <span key={i} style={runStyle(run)}>{run.text}</span>
      )}
    </span>
  )
}
