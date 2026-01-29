import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { getUser } from '@/lib/auth/actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getUser()

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar (Left) */}
            <Sidebar user={user} />

            {/* Main Content Wrapper */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Mobile Header (Top) */}
                <Header />

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
