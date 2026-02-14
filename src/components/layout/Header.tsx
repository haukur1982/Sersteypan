'use client'

import { useState, useEffect } from 'react'
import { MobileSidebar } from './Sidebar'
import type { AuthUser } from '@/lib/hooks/useAuth'
import { NotificationBell, type NotificationItem } from '@/components/notifications/NotificationBell'

/**
 * Hook to fetch notifications client-side
 */
function useNotifications(userId: string | undefined) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])

    useEffect(() => {
        if (!userId) return

        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/notifications')
                if (response.ok) {
                    const data = await response.json()
                    setNotifications(data.notifications || [])
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error)
            }
        }

        fetchNotifications()

        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [userId])

    return notifications
}

export function Header({ user }: { user?: AuthUser | null }) {
    const notifications = useNotifications(user?.id)

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 md:hidden">
            <div className="flex items-center">
                <MobileSidebar user={user} />
                <div className="ml-4 font-semibold text-zinc-900">
                    Sérsteypan
                </div>
            </div>
            {user && (
                <NotificationBell notifications={notifications} />
            )}
        </header>
    )
}
