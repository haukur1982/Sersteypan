'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { AuthUser } from '@/lib/hooks/useAuth'
import { NotificationBell, type NotificationItem } from '@/components/notifications/NotificationBell'

/**
 * Map URL paths to Icelandic page titles.
 * Longer paths are checked first so /factory/projects/[id] matches before /factory/projects.
 */
const pageTitles: Record<string, Record<string, string>> = {
    factory_manager: {
        '/factory': 'Stjórnborð',
        '/factory/projects': 'Verkefni',
        '/factory/manage': 'Framleiðslustjórn',
        '/factory/production': 'Framleiðsla',
        '/factory/batches': 'Steypulotur',
        '/factory/schedule': 'Áætlun',
        '/factory/deliveries': 'Afhendingar',
        '/factory/drawings': 'Teikningar',
        '/factory/diary': 'Dagbók',
        '/factory/todos': 'Verkefnalisti',
        '/factory/stock': 'Lager',
        '/factory/fix-in-factory': 'Viðgerðir',
        '/factory/messages': 'Skilaboð',
        '/factory/help': 'Hjálp',
    },
    admin: {
        '/admin': 'Stjórnborð',
        '/admin/companies': 'Fyrirtæki',
        '/admin/projects': 'Verkefni',
        '/admin/users': 'Notendur',
        '/admin/messages': 'Skilaboð',
        '/admin/reports': 'Skýrslur',
        '/admin/settings': 'Stillingar',
        '/admin/help': 'Hjálp',
    },
    buyer: {
        '/buyer': 'Yfirlit',
        '/buyer/projects': 'Verkefni',
        '/buyer/deliveries': 'Afhendingar',
        '/buyer/messages': 'Skilaboð',
        '/buyer/profile': 'Prófíll',
        '/buyer/help': 'Hjálp',
    },
    driver: {
        '/driver': 'Stjórnborð',
        '/driver/deliveries': 'Afhendingar',
        '/driver/scan': 'Skanna QR',
        '/driver/help': 'Hjálp',
    },
}

function getPageTitle(pathname: string, role: string | undefined): string {
    if (!role) return 'Sérsteypan'
    const titles = pageTitles[role]
    if (!titles) return 'Sérsteypan'

    // Exact match first
    if (titles[pathname]) return titles[pathname]

    // Walk up the path: /factory/projects/abc → /factory/projects → /factory
    const segments = pathname.split('/')
    while (segments.length > 1) {
        segments.pop()
        const parent = segments.join('/')
        if (titles[parent]) return titles[parent]
    }

    return 'Sérsteypan'
}

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
    const pathname = usePathname()
    const notifications = useNotifications(user?.id)
    const title = getPageTitle(pathname, user?.role)

    return (
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
            <h1 className="font-semibold text-zinc-900 truncate">
                {title}
            </h1>
            {user && (
                <NotificationBell notifications={notifications} />
            )}
        </header>
    )
}
