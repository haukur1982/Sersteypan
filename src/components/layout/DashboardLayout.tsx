import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { AuthUser } from '@/lib/providers/AuthProvider'

interface DashboardLayoutProps {
    children: React.ReactNode
    user: AuthUser | null
}

/**
 * DashboardLayout - Shared layout for all portal pages
 *
 * User is passed from parent layout (buyer/driver/admin/factory layout.tsx)
 * to avoid duplicate getUser() calls.
 *
 * Notifications are fetched client-side in the Sidebar/Header components
 * to avoid blocking server rendering.
 */
export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar (Left) */}
            <Sidebar user={user} />

            {/* Main Content Wrapper */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Mobile Header (Top) */}
                <Header user={user} />

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="mx-auto max-w-7xl w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
