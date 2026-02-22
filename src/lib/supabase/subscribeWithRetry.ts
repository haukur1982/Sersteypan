import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Wraps a Supabase RealtimeChannel's `.subscribe()` with automatic
 * reconnection using exponential backoff.
 *
 * On CHANNEL_ERROR or TIMED_OUT the channel is unsubscribed and
 * re-subscribed after a delay that doubles each attempt
 * (1s → 2s → 4s → 8s → … capped at 30s). A successful SUBSCRIBED
 * status resets the backoff.
 *
 * Returns a cleanup function that stops retries and unsubscribes.
 *
 * @example
 * ```ts
 * const cleanup = subscribeWithRetry(channel, (status) => {
 *   setIsConnected(status === 'SUBSCRIBED')
 * })
 * // in useEffect cleanup:
 * return cleanup
 * ```
 */
export function subscribeWithRetry(
  channel: RealtimeChannel,
  onStatus?: (status: string) => void,
  { maxBackoffMs = 30_000, initialDelayMs = 1_000 } = {}
): () => void {
  let retryTimeout: ReturnType<typeof setTimeout> | null = null
  let backoff = initialDelayMs
  let stopped = false

  function doSubscribe() {
    if (stopped) return

    channel.subscribe((status: string, err?: Error) => {
      onStatus?.(status)

      if (status === 'SUBSCRIBED') {
        // Reset backoff on successful connection
        backoff = initialDelayMs
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(
          `Realtime channel error (${status}), retrying in ${backoff}ms`,
          err?.message
        )
        scheduleRetry()
      }
    })
  }

  function scheduleRetry() {
    if (stopped) return

    retryTimeout = setTimeout(() => {
      if (stopped) return
      // Unsubscribe first, then re-subscribe
      channel.unsubscribe().then(() => {
        if (!stopped) doSubscribe()
      })
    }, backoff)

    // Exponential backoff with cap
    backoff = Math.min(backoff * 2, maxBackoffMs)
  }

  // Initial subscribe
  doSubscribe()

  // Return cleanup
  return () => {
    stopped = true
    if (retryTimeout) clearTimeout(retryTimeout)
    channel.unsubscribe()
  }
}
