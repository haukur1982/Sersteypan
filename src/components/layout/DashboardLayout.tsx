import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { NotificationProvider } from '@/lib/providers/NotificationProvider'
import type { AuthUser } from '@/lib/providers/AuthProvider'

interface DashboardLayoutProps {
    children: React.ReactNode
    user?: AuthUser | null  // Optional - Sidebar/Header use client-side auth
}

/**
 * DashboardLayout - Shared layout for all portal pages
 *
 * User is passed from parent layout (buyer/driver/admin/factory layout.tsx)
 * to avoid duplicate getUser() calls.
 *
 * NotificationProvider creates a single realtime subscription shared
 * between Sidebar (desktop) and Header (mobile) — instant notifications
 * with toasts, replacing the old 30-second polling.
 */
export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
    return (
        <NotificationProvider>
            <div className="flex min-h-screen bg-background text-foreground">
                {/* Desktop Sidebar (Left) */}
                <Sidebar user={user} />

                {/* Main Content Wrapper */}
                <div className="flex flex-1 flex-col min-w-0">
                    {/* Mobile Header (Top) */}
                    <Header user={user} />

                    {/* Page Content — extra bottom padding on mobile for fixed bottom nav */}
                    <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
                        <div className="mx-auto max-w-7xl w-full">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Mobile Bottom Tab Bar */}
                <MobileBottomNav user={user} />
            </div>
        </NotificationProvider>
    )
}
