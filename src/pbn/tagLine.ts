/** A PBN tag pair: the name and value halves of a tag line, [TagName "TagValue"]. */
export type TagPair = {
  readonly name: string
  readonly value: string
}

/** Parses a single line as a PBN tag pair: [TagName "TagValue"] (per the PBN spec, splitting on
 *  the first space only, so a quoted value may itself contain spaces, e.g. [Event "World
 *  Championship"]). Returns undefined if the line isn't a valid tag pair — not bracketed, no
 *  name/value split, or the value isn't double-quoted. */
export function parseTagLine(s: string): TagPair | undefined {
  const line = s.trim()
  if (!line.startsWith('[') || !line.endsWith(']')) return undefined
  const content = line.slice(1, -1)
  const spaceIndex = content.indexOf(' ')
  if (spaceIndex === -1) return undefined
  const name = content.slice(0, spaceIndex)
  const value = content.slice(spaceIndex + 1)
  if (!(value.startsWith('"') && value.endsWith('"'))) return undefined
  return { name, value: value.slice(1, -1) }
}

/** Formats a TagPair back into a PBN tag line: [TagName "TagValue"]. No trailing newline —
 *  joining lines together is left to the caller. Round-trips with parseTagLine. */
export function formatTagLine(tag: TagPair): string {
  return `[${tag.name} "${tag.value}"]`
}
