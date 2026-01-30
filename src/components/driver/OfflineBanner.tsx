'use client'

import { useEffect, useState } from 'react'
import { useOfflineQueue } from '@/lib/hooks/useOfflineQueue'
import { WifiOff, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export function OfflineBanner() {
  const { pendingCount, isSyncing, lastSyncResult, sync } = useOfflineQueue()
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showSuccess, setShowSuccess] = useState(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Show success message briefly after sync completes
  useEffect(() => {
    if (lastSyncResult && lastSyncResult.success.length > 0 && pendingCount === 0) {
      const showTimer = setTimeout(() => setShowSuccess(true), 0)
      const hideTimer = setTimeout(() => setShowSuccess(false), 3000)
      return () => {
        clearTimeout(showTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [lastSyncResult, pendingCount])

  // Don't show banner if online and no pending items and no recent sync
  if (isOnline && pendingCount === 0 && !showSuccess && !isSyncing) {
    return null
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">
              Samstilli {pendingCount} aðgerðir...
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Success state (briefly)
  if (showSuccess && pendingCount === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              Allt samstillt! ✓
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Error/conflict state
  if (lastSyncResult && (lastSyncResult.conflicts.length > 0 || lastSyncResult.failed.length > 0)) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Villa við samstillingu</p>
                <p className="text-sm text-red-100">
                  {lastSyncResult.conflicts.length > 0 && `${lastSyncResult.conflicts.length} árekstrar`}
                  {lastSyncResult.conflicts.length > 0 && lastSyncResult.failed.length > 0 && ', '}
                  {lastSyncResult.failed.length > 0 && `${lastSyncResult.failed.length} mistókst`}
                </p>
              </div>
            </div>
            <button
              onClick={sync}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              Reyna aftur
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Offline state with pending actions
  if (!isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5" />
              <div>
                <p className="font-medium">Ónettengdur - Aðgerðir í biðröð</p>
                <p className="text-sm text-amber-100">
                  {pendingCount} {pendingCount === 1 ? 'aðgerð' : 'aðgerðir'} bíða samstillingar
                </p>
              </div>
            </div>
            <button
              onClick={sync}
              disabled
              className="px-4 py-2 bg-amber-700 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              <WifiOff className="w-4 h-4 inline mr-2" />
              Samstilla
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Online but has pending items (edge case - should auto-sync but showing status)
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Ósamstilltar aðgerðir</p>
                <p className="text-sm text-blue-100">
                  {pendingCount} {pendingCount === 1 ? 'aðgerð' : 'aðgerðir'} bíða samstillingar
                </p>
              </div>
            </div>
            <button
              onClick={sync}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Samstilla núna
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
