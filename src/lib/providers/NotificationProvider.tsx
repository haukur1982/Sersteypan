'use client'

import React, { createContext, useContext } from 'react'
import { useRealtimeNotifications } from '@/lib/hooks/useRealtimeNotifications'
import { useAuth } from '@/lib/hooks/useAuth'
import type { NotificationItem } from '@/components/notifications/NotificationBell'

interface NotificationContextType {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  isConnected: boolean
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  isConnected: false,
})

/**
 * Provides a single realtime notification subscription shared between
 * Sidebar (desktop) and Header (mobile). Without this, both components
 * would create their own subscriptions and fire duplicate toasts.
 *
 * Reads toast/sound preferences from the user's profile.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Read notification display preferences (toast, sound)
  const notifPrefs = (user?.preferences?.notifications ?? {}) as Record<string, boolean>

  const value = useRealtimeNotifications({
    userId: user?.id,
    toastEnabled: notifPrefs.toast_enabled !== false, // default true
    soundEnabled: notifPrefs.sound_enabled === true, // default false
  })

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

/**
 * Access notification state from any component under DashboardLayout.
 */
export function useNotifications() {
  return useContext(NotificationContext)
}
