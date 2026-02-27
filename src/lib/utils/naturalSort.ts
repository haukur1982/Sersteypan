/**
 * Natural sort comparator for strings containing numbers.
 *
 * Uses `localeCompare` with `{ numeric: true }` which makes
 * "SG-2" sort before "SG-10" (instead of the default lexicographic
 * order where "SG-10" < "SG-2").
 *
 * @example
 *   ['SG-10', 'SG-1', 'SG-2'].sort(naturalCompare)
 *   // → ['SG-1', 'SG-2', 'SG-10']
 */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
}

/**
 * Sort an array of objects by a string field using natural ordering.
 *
 * @example
 *   naturalSortBy(elements, 'name')
 *   // SG-1, SG-2, SG-3, ..., SG-10, SG-11
 */
export function naturalSortBy<T>(arr: T[], key: keyof T): T[] {
  return [...arr].sort((a, b) =>
    naturalCompare(String(a[key] ?? ''), String(b[key] ?? ''))
  )
}
