import type { Suit } from '../suit.js'

// A flat, ordered run of text or suit content, with whatever bold/italic/underline formatting is
// active at that point. There's no nested tree here — matches how PBN's <b>/<i>/<u> markup is
// used in practice (independent toggles, not a meaningfully nested document structure) — but
// unlike the Swift reference this was ported from, the parser below tracks a real stack of active
// tags, so genuinely nested/overlapping markup (e.g. "<b>foo<i>bar</b>baz</i>") still resolves
// each run's flags correctly rather than assuming markup is always well-nested.
export type PBNTextRun =
  | { readonly kind: 'text'; readonly text: string; readonly bold: boolean; readonly italic: boolean; readonly underline: boolean }
  | { readonly kind: 'suit'; readonly suit: Suit; readonly bold: boolean; readonly italic: boolean; readonly underline: boolean }

type FormatTag = 'b' | 'i' | 'u'

// Comments/notes are flowing prose, not fixed-width text — a line break in the raw PBN source is
// just where the author's text editor happened to wrap, not a meaningful break, so it collapses
// to a plain space. Two signals DO mean "the author wants a real break here", and both become
// exactly one "\n" (never two, however many blank lines in a row): a genuine blank line in the
// source, or the author's own literal "\n" escape typed as text. Rendering this "\n" later via
// CSS white-space: pre-line is what turns it back into an actual visual line break, while ordinary
// spaces between words still wrap normally to fit whatever container displays the text.
function normalizeNewlines(raw: string): string {
  const lines = raw.split('\n')
  let out = ''
  let hasContent = false
  let sawBlank = false
  for (const line of lines) {
    if (line.trim() === '') {
      sawBlank = true
      continue
    }
    if (hasContent) out += sawBlank ? '\n' : ' '
    out += line
    hasContent = true
    sawBlank = false
  }
  // The author's own literal "\n" (backslash then the letter n — two ordinary characters, not a
  // real newline) is always a forced break too. "\n " (with a trailing space) is matched first so
  // an explicit break doesn't leave a stray leading space at the start of the next visual line.
  return out.replace(/\\n /g, '\n').replace(/\\n/g, '\n')
}

const TAG_PATTERN = /^<(\/?)([biu])>/
const SUIT_PATTERN = /^\\([SHDC])/

const activeFlags = (stack: readonly FormatTag[]) => ({
  bold: stack.includes('b'),
  italic: stack.includes('i'),
  underline: stack.includes('u'),
})

// Parses PBN's free-text formatting conventions (used in both Auction notes and section
// comments — see PBNGame's ParsedSection) into a flat list of runs ready to render: <b>/<i>/<u>
// become bold/italic/underline (properly nested, via a real stack — see PBNTextRun above), and
// \S \H \D \C become suit runs carrying whatever formatting is active at that point (so a suit
// mentioned inside bold text stays bold). Newline handling (see normalizeNewlines) happens first,
// matching the Swift reference's own pipeline order.
export function parsePBNFormattedText(rawText: string): readonly PBNTextRun[] {
  const text = normalizeNewlines(rawText).trim()
  const runs: PBNTextRun[] = []
  const stack: FormatTag[] = []
  let current = ''

  const flush = (): void => {
    if (current.length > 0) {
      runs.push({ kind: 'text', text: current, ...activeFlags(stack) })
      current = ''
    }
  }

  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    const tagMatch = TAG_PATTERN.exec(rest)
    if (tagMatch !== null) {
      flush()
      const tag = tagMatch[2] as FormatTag
      if (tagMatch[1] === '/') {
        const index = stack.lastIndexOf(tag)
        if (index !== -1) stack.splice(index, 1)
      } else {
        stack.push(tag)
      }
      i += tagMatch[0].length
      continue
    }
    const suitMatch = SUIT_PATTERN.exec(rest)
    if (suitMatch !== null) {
      flush()
      runs.push({ kind: 'suit', suit: suitMatch[1] as Suit, ...activeFlags(stack) })
      i += suitMatch[0].length
      continue
    }
    current += text[i]
    i += 1
  }
  flush()

  return mergeAdjacentText(runs)
}

// A tag boundary always flushes, even a no-op one (an unmatched closing tag, or a tag that
// doesn't change any flag) — so two adjacent text runs can end up with identical formatting for
// reasons that have nothing to do with the rendered result. Merging them keeps the output stable
// and predictable (one run per actual formatting change), rather than leaking incidental parser
// bookkeeping into what callers see.
function mergeAdjacentText(runs: readonly PBNTextRun[]): readonly PBNTextRun[] {
  const merged: PBNTextRun[] = []
  for (const run of runs) {
    const last = merged[merged.length - 1]
    if (
      run.kind === 'text' && last?.kind === 'text' &&
      last.bold === run.bold && last.italic === run.italic && last.underline === run.underline
    ) {
      merged[merged.length - 1] = { ...last, text: last.text + run.text }
    } else {
      merged.push(run)
    }
  }
  return merged
}
