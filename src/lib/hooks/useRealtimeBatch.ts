'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithRetry } from '@/lib/supabase/subscribeWithRetry'

interface UseRealtimeBatchOptions {
  /** Subscribe only when enabled (default: true) */
  enabled?: boolean
}

/**
 * Subscribe to realtime changes on a single production batch.
 *
 * Used in the batch detail page so the status badge updates
 * without a manual browser refresh (e.g. preparing → checklist → completed).
 *
 * Follows the same pattern as useRealtimeRebarBatches but for a single row.
 */
export function useRealtimeBatch<T extends { id: string }>(
  initialBatch: T,
  options: UseRealtimeBatchOptions = {}
) {
  const { enabled = true } = options
  const [batch, setBatch] = useState<T>(initialBatch)
  const [isConnected, setIsConnected] = useState(false)

  // No sync effect needed: useState captures the initial server value,
  // and the realtime subscription below handles all subsequent updates.

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    const channel = supabase
      .channel(`batch:${initialBatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'production_batches',
          filter: `id=eq.${initialBatch.id}`,
        },
        (payload) => {
          const updated = payload.new as Partial<T> & { id: string }
          setBatch((current) => ({ ...current, ...updated }))
        }
      )

    const cleanup = subscribeWithRetry(channel, (status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      cleanup()
      setIsConnected(false)
    }
  }, [initialBatch.id, enabled])

  return { batch, isConnected }
}
