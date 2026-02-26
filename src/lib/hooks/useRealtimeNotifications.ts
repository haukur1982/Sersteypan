'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithRetry } from '@/lib/supabase/subscribeWithRetry'
import { toast } from 'sonner'
import type { NotificationItem } from '@/components/notifications/NotificationBell'

const NOTIFICATION_ICONS: Record<string, string> = {
  element_status: '📦',
  delivery_status: '🚛',
  new_message: '💬',
  priority_request: '⚡',
  fix_in_factory: '🔧',
}

interface UseRealtimeNotificationsOptions {
  userId: string | undefined
  toastEnabled?: boolean
  soundEnabled?: boolean
}

/**
 * Realtime notification hook.
 *
 * Subscribes to Supabase postgres_changes on the notifications table,
 * filtered by user_id. Shows Sonner toasts on new notifications.
 * Falls back to 30-second polling if realtime connection fails.
 *
 * Follows the same pattern as useRealtimeElements.ts.
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions) {
  const { userId, toastEnabled = true, soundEnabled = false } = options
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(true)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track if initial fetch is done so we don't toast on first load
  const initialFetchDoneRef = useRef(false)

  // Fetch notifications via API (used for initial load + polling fallback)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        if (isMountedRef.current) {
          setNotifications(data.notifications || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        initialFetchDoneRef.current = true
      }
    }
  }, [userId])

  // Start/stop fallback polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) return // already polling
    pollingRef.current = setInterval(fetchNotifications, 30000)
  }, [fetchNotifications])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    initialFetchDoneRef.current = false

    if (!userId) {
      setLoading(false)
      return
    }

    // Initial fetch
    fetchNotifications()

    const supabase = createClient()
    const channelName = `notifications:user:${userId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return
          const newNotif = payload.new as NotificationItem

          setNotifications((current) => [newNotif, ...current].slice(0, 50))

          // Show toast for new notifications (skip during initial load)
          if (initialFetchDoneRef.current && toastEnabled) {
            const icon = NOTIFICATION_ICONS[newNotif.type] || '🔔'
            toast(newNotif.title, {
              description: newNotif.body || undefined,
              icon,
              action: newNotif.link
                ? {
                    label: 'Skoða',
                    onClick: () => {
                      window.location.href = newNotif.link!
                    },
                  }
                : undefined,
            })
          }

          // Play notification sound
          if (initialFetchDoneRef.current && soundEnabled) {
            try {
              const audio = new Audio('/sounds/notification.mp3')
              audio.volume = 0.3
              audio.play().catch(() => {}) // Ignore autoplay restrictions
            } catch {
              // Sound file may not exist — that's fine
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return
          const updated = payload.new as NotificationItem
          setNotifications((current) =>
            current.map((n) => (n.id === updated.id ? updated : n))
          )
        }
      )

    const cleanup = subscribeWithRetry(channel, (status) => {
      const connected = status === 'SUBSCRIBED'
      setIsConnected(connected)

      if (connected) {
        // Realtime working — stop polling if it was running
        stopPolling()
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT'
      ) {
        // Realtime failed — start polling as fallback
        startPolling()
      }
    })

    return () => {
      isMountedRef.current = false
      cleanup()
      stopPolling()
    }
  }, [userId, toastEnabled, soundEnabled, fetchNotifications, startPolling, stopPolling])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return { notifications, unreadCount, loading, isConnected }
}
