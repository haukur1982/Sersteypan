'use client'

import { MobileSidebar } from './Sidebar'
import type { AuthUser } from '@/lib/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface Notification {
    id: string
    type: 'element_status' | 'delivery' | 'message'
    title: string
    message: string
    timestamp: string
    read: boolean
    elementId?: string
    deliveryId?: string
    projectId?: string
}

export function Header({ user, notifications = [] }: { user?: AuthUser | null, notifications?: Notification[] }) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-6 md:hidden">
            <div className="flex items-center">
                <MobileSidebar user={user} />
                <div className="ml-4 font-semibold text-zinc-900">
                    Sérsteypan
                </div>
            </div>
            {user && (
                <NotificationBell userId={user.id} notifications={notifications} />
            )}
        </header>
    )
}
