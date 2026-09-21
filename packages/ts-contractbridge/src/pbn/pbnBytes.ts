// Converting between the bytes of a PBN file and the strings the rest of this library works with.
//
// PBNDocument itself only deals in strings — PBNDocument.fromPBN(text) and doc.toPBN() — and knows
// nothing about files or character encodings. These two functions are the optional bridge between
// a file's raw bytes and those strings, for callers (a browser reading a File, a Node script
// reading a path) that have bytes rather than text. They are independent of PBNDocument: use one,
// both, or neither.
//
//   reading:  const doc = PBNDocument.fromPBN(decodePBNBytes(bytes))
//   writing:  const bytes = encodePBNBytes(doc.toPBN())
//
// Why not just use TextDecoder('utf-8') / TextEncoder? The PBN spec (section 2.2) says files are
// ISO 8859-1 ("Latin 1"), one byte per character, and real files often declare it —
// BridgeComposer writes "%Content-type: text/x-pbn; charset=ISO-8859-1". But many tools write UTF-8
// regardless. Reading a Latin 1 file as UTF-8 replaces every accented character with U+FFFD, and
// that loss is permanent once the file is saved. These functions handle both without the caller
// having to know which kind of file it has.

/**
 * Decodes the bytes of a PBN file into a string, ready for `PBNDocument.fromPBN`.
 *
 * The bytes are read as UTF-8 if they are valid UTF-8 (a leading byte-order mark is dropped), and
 * as ISO 8859-1 (Latin 1) otherwise. Real Latin 1 text that contains any accented character is
 * essentially never also valid UTF-8, so this guess is reliable in practice; and plain ASCII, the
 * common case, is identical in both. Latin 1 is decoded byte-for-byte (every byte becomes the
 * character with the same code, 0x00–0xFF), NOT with `TextDecoder('latin1')` — in browsers and
 * Node that label actually means windows-1252, which maps 0x80–0x9F to other characters and would
 * not round-trip through `encodePBNBytes`.
 *
 * Nothing is lost by decoding: a Latin 1 file decoded here and encoded with `encodePBNBytes` comes
 * back byte-for-byte identical.
 *
 * @example
 * // Browser
 * const bytes = new Uint8Array(await file.arrayBuffer())
 * const doc = PBNDocument.fromPBN(decodePBNBytes(bytes))
 * @example
 * // Node
 * const doc = PBNDocument.fromPBN(decodePBNBytes(readFileSync('games.pbn')))
 */
export function decodePBNBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Not valid UTF-8, so treat it as Latin 1, where each byte is simply the code point of the same value.
    return Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  }
}

/**
 * Encodes PBN text (typically `doc.toPBN()`) as the bytes of a file, in ISO 8859-1 (Latin 1) — the
 * character set the PBN spec requires — one byte per character.
 *
 * **This can lose data.** Latin 1 only covers characters up to U+00FF: Western European accents
 * (é, ü, ñ) are fine, but anything beyond — €, Greek, Cyrillic, CJK, emoji — has no PBN encoding at
 * all. Each such character is written as a single `?`, the spec's own stand-in for a character that
 * can't be shown (an emoji counts as one character, so one `?`, not two). Text that came from
 * `decodePBNBytes` of a Latin 1 file is always fully representable. If you would rather keep every
 * character, skip this function and encode the string yourself, e.g. with `TextEncoder` (UTF-8) —
 * but then a file that declares `charset=ISO-8859-1` in its header will be misread by programs that
 * believe the header.
 *
 * The line breaks are whatever `toPBN` put in the string; this function does not touch them.
 *
 * @example
 * // Browser: offer the file for download
 * const blob = new Blob([encodePBNBytes(doc.toPBN())], { type: 'text/plain' })
 * @example
 * // Node
 * writeFileSync('games.pbn', encodePBNBytes(doc.toPBN()))
 */
export function encodePBNBytes(text: string): Uint8Array {
  const bytes: number[] = []
  for (const character of text) {
    const codePoint = character.codePointAt(0)!
    bytes.push(codePoint <= 0xff ? codePoint : 0x3f)
  }
  return Uint8Array.from(bytes)
}
