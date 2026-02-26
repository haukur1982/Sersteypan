'use client'

import { usePathname } from 'next/navigation'
import { MobileSidebar } from './Sidebar'
import { useNotifications } from '@/lib/providers/NotificationProvider'
import type { AuthUser } from '@/lib/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'

/**
 * Map URL paths to Icelandic page titles.
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
        '/factory/settings': 'Stillingar',
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
        '/buyer/settings': 'Stillingar',
        '/buyer/profile': 'Prófíll',
        '/buyer/help': 'Hjálp',
    },
    driver: {
        '/driver': 'Stjórnborð',
        '/driver/deliveries': 'Afhendingar',
        '/driver/scan': 'Skanna QR',
        '/driver/settings': 'Stillingar',
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

export function Header({ user }: { user?: AuthUser | null }) {
    const pathname = usePathname()
    // Realtime notifications from shared provider (replaces 30s polling)
    const { notifications } = useNotifications()
    const title = getPageTitle(pathname, user?.role)

    return (
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
            <div className="flex items-center gap-2">
                <MobileSidebar user={user} />
                <h1 className="font-semibold text-zinc-900 truncate text-sm">
                    {title}
                </h1>
            </div>
            {user && (
                <NotificationBell notifications={notifications} />
            )}
        </header>
    )
}
