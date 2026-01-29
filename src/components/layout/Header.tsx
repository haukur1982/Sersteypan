'use client'

import { MobileSidebar } from './Sidebar'
import type { AuthUser } from '@/lib/hooks/useAuth'

export function Header({ user }: { user?: AuthUser | null }) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-zinc-200 bg-white px-4 md:px-6 md:hidden">
            <MobileSidebar user={user} />
            <div className="ml-4 font-semibold text-zinc-900">
                Sérsteypan
            </div>
            {/* Add Breadcrumbs or other header content here */}
        </header>
    )
}
