/**
 * Structural contract for types whose PBN representation spans multiple lines (a "complex tag"
 * per the PBN spec — Auction and Play, currently) rather than a single string value. The TS
 * analog of Swift's PBN.ComplexTag.
 *
 * Both directions operate on a section's raw lines: element 0 is always the tag pair line itself
 * (e.g. `[Auction "N"]`), and any remaining elements are the section's body — and, for types that
 * own their own note-numbering like Auction, trailing `[Note "N:text"]` lines. That's the same
 * shape `PBNSection.lines`/`PBNGame.setSection` already use, so `game.setSection(X.toPBNSection(v))`
 * and `X.fromPBNSection(section.lines)` both just work with no extra plumbing.
 */
export interface PBNSectionCodable<T, E = undefined> {
  toPBNSection(value: T): string[]
  fromPBNSection(lines: readonly string[]): T | E
}
