/**
 * Structural contract for types with a PBN string representation, mirroring the Swift
 * library's `PBNCodable` protocol. `E` is the failure type `fromPBN` returns on invalid
 * input (plain `undefined` for most types; `Deal` uses `DealError` instead).
 *
 * Not implemented via `implements` — these types are plain const objects, not classes.
 * Each companion object is checked against this shape with `X satisfies PBNCodable<X>`
 * right after its declaration, which verifies conformance at compile time with no
 * runtime cost (referencing the already-declared const, not a fresh object literal,
 * so TypeScript's excess-property check doesn't reject the object's other members).
 */
export interface PBNCodable<T, E = undefined> {
  toPBN(value: T): string
  fromPBN(s: string): T | E
}
