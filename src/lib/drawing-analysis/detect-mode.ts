/**
 * Detects the analysis mode from a drawing filename.
 *
 * Conventions:
 *  - BF prefix → 'elements' (filigran layout drawings)
 *  - BS prefix → 'elements' (balcony/stair detail drawings)
 *  - BP prefix → 'surfaces' (architectural structural plans)
 *  - A. prefix → 'surfaces' (architectural drawings like A.1.1)
 *  - Default   → 'elements'
 */
export function detectAnalysisMode(
  filename: string
): 'elements' | 'surfaces' {
  // Strip any path — only look at the basename
  const basename = filename.replace(/^.*[/\\]/, '')

  // Normalise: uppercase, collapse common separators to a single space
  const normalised = basename.toUpperCase().replace(/[-_ ]+/g, ' ').trimStart()

  // Check prefixes — startsWith is sufficient since we already uppercased
  if (normalised.startsWith('BF')) {
    return 'elements'
  }
  if (normalised.startsWith('BS')) {
    return 'elements'
  }
  if (normalised.startsWith('BP')) {
    return 'surfaces'
  }
  // A. or "A " prefix — e.g. "A.1.1 - Ground floor.pdf"
  if (/^A[.\s]/.test(normalised)) {
    return 'surfaces'
  }

  return 'elements'
}
