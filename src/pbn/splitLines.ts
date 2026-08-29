// PBN files come from many different eras/platforms and can use any of the three common line
// terminators — "\r\n" (Windows), "\n" (Unix/modern Mac), or a bare "\r" (classic Mac OS, pre-OS X)
// — sometimes even mixed within the same file. Splits on any of them uniformly.
//
// Matches the behavior of Swift's String.enumerateLines (used by the reference parser): a text
// that ends with a line terminator does NOT produce a trailing empty line — "a\n" is one line
// ("a"), not two ("a" and ""). A genuine blank line still counts, though: "a\n\n" is two lines
// ("a" and "").
export function splitLines(text: string): string[] {
  const lines = text.split(/\r\n|\r|\n/)
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}
