'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getPendingCount,
  getPendingActions,
  syncPendingActions,
  checkForDataLoss,
  type SyncResult,
  type OfflineAction,
} from '@/lib/offline/queue'

interface UseOfflineQueueReturn {
  pendingCount: number
  pendingActions: OfflineAction[]
  isSyncing: boolean
  lastSyncResult: SyncResult | null
  dataLost: boolean
  lostCount: number
  sync: () => Promise<SyncResult>
  refresh: () => Promise<void>
}

/**
 * React hook for offline queue management
 *
 * Features:
 * - Tracks pending action count
 * - Auto-syncs when network comes back online
 * - Detects IndexedDB data loss (iOS Safari issue)
 * - Provides manual sync function
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [dataLost, setDataLost] = useState(false)
  const [lostCount, setLostCount] = useState(0)

  /**
   * Refresh pending count and actions
   */
  const refresh = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)

      const actions = await getPendingActions()
      setPendingActions(actions)

      // Check for data loss
      const lossCheck = await checkForDataLoss()
      setDataLost(lossCheck.dataLost)
      setLostCount(lossCheck.lostCount)
    } catch (error) {
      console.error('[useOfflineQueue] Error refreshing:', error)
    }
  }, [])

  /**
   * Sync pending actions
   */
  const sync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true)
    try {
      const result = await syncPendingActions()
      setLastSyncResult(result)
      await refresh() // Refresh count after sync
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [refresh])

  /**
   * Initial load and event listeners
   */
  useEffect(() => {
    // Initial load
    refresh()

    // Listen for queue changes
    const handleQueueChange = () => {
      refresh()
    }

    window.addEventListener('offline-queue-change', handleQueueChange)

    return () => {
      window.removeEventListener('offline-queue-change', handleQueueChange)
    }
  }, [refresh])

  /**
   * Auto-sync when network comes back online
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useOfflineQueue] Network back online, checking for pending actions...')
      const count = await getPendingCount()
      if (count > 0) {
        console.log(`[useOfflineQueue] Auto-syncing ${count} pending actions...`)
        await sync()
      }
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [sync])

  /**
   * Periodic check for data loss (iOS Safari)
   * Check every 30 seconds
   */
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const lossCheck = await checkForDataLoss()
      if (lossCheck.dataLost) {
        setDataLost(true)
        setLostCount(lossCheck.lostCount)
        console.warn(`[useOfflineQueue] Data loss detected: ${lossCheck.lostCount} actions lost`)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(checkInterval)
  }, [])

  return {
    pendingCount,
    pendingActions,
    isSyncing,
    lastSyncResult,
    dataLost,
    lostCount,
    sync,
    refresh,
  }
}
