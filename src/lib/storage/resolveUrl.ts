import { createClient } from '@/lib/supabase/server'

// Matches full Supabase storage URLs in any historical format:
//   .../storage/v1/object/public/<bucket>/<path>
//   .../storage/v1/object/sign/<bucket>/<path>?token=...
//   .../storage/v1/object/authenticated/<bucket>/<path>
const STORAGE_URL_PATTERN = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/

/**
 * Normalize a stored storage reference to { bucket, path }.
 * Historical rows store full public URLs; new rows store bare storage paths.
 * Both resolve correctly, so no data backfill is ever needed.
 */
export function parseStorageRef(
  stored: string,
  fallbackBucket: string
): { bucket: string; path: string } {
  if (stored.startsWith('http')) {
    const match = stored.match(STORAGE_URL_PATTERN)
    if (match) {
      return { bucket: match[1], path: decodeURIComponent(match[2]) }
    }
  }
  return { bucket: fallbackBucket, path: stored }
}

/**
 * Resolve a stored storage reference (full URL or bare path) to a signed URL.
 * Returns null for null/empty input or when signing fails (callers already
 * guard their <img> renders on null).
 */
export async function resolveStorageUrl(
  stored: string | null | undefined,
  fallbackBucket: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!stored) return null

  const { bucket, path } = parseStorageRef(stored, fallbackBucket)
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('resolveStorageUrl failed:', error?.message, { bucket, path })
    return null
  }
  return data.signedUrl
}

/**
 * Batch variant: resolve many stored references in one storage round-trip per bucket.
 * Output array is index-aligned with the input; null inputs and failures stay null.
 */
export async function resolveStorageUrls(
  stored: Array<string | null | undefined>,
  fallbackBucket: string,
  expiresIn = 3600
): Promise<Array<string | null>> {
  const refs = stored.map((s) => (s ? parseStorageRef(s, fallbackBucket) : null))
  const results: Array<string | null> = new Array(stored.length).fill(null)

  // Group indices by bucket so each bucket needs a single createSignedUrls call
  const byBucket = new Map<string, number[]>()
  refs.forEach((ref, i) => {
    if (!ref) return
    const indices = byBucket.get(ref.bucket) ?? []
    indices.push(i)
    byBucket.set(ref.bucket, indices)
  })

  const supabase = await createClient()
  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, indices]) => {
      const paths = indices.map((i) => refs[i]!.path)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn)
      if (error || !data) {
        console.error('resolveStorageUrls failed:', error?.message, { bucket, count: paths.length })
        return
      }
      data.forEach((entry, j) => {
        if (entry.signedUrl && !entry.error) {
          results[indices[j]] = entry.signedUrl
        }
      })
    })
  )

  return results
}
