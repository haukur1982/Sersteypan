'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import {
    LayoutDashboard,
    FolderKanban,
    Factory,
    Layers,
    Truck,
    QrCode,
    Building,
    type LucideIcon,
} from 'lucide-react'

interface TabItem {
    name: string
    href: string
    icon: LucideIcon
}

const factoryTabs: TabItem[] = [
    { name: 'Heim', href: '/factory', icon: LayoutDashboard },
    { name: 'Verkefni', href: '/factory/projects', icon: FolderKanban },
    { name: 'Framleiðsla', href: '/factory/production', icon: Factory },
    { name: 'Lotur', href: '/factory/batches', icon: Layers },
    { name: 'Afhending', href: '/factory/deliveries', icon: Truck },
]

const driverTabs: TabItem[] = [
    { name: 'Heim', href: '/driver', icon: LayoutDashboard },
    { name: 'Afhendingar', href: '/driver/deliveries', icon: Truck },
    { name: 'Skanna', href: '/driver/scan', icon: QrCode },
]

const buyerTabs: TabItem[] = [
    { name: 'Yfirlit', href: '/buyer', icon: LayoutDashboard },
    { name: 'Verkefni', href: '/buyer/projects', icon: FolderKanban },
    { name: 'Afhendingar', href: '/buyer/deliveries', icon: Truck },
]

const adminTabs: TabItem[] = [
    { name: 'Heim', href: '/admin', icon: LayoutDashboard },
    { name: 'Fyrirtæki', href: '/admin/companies', icon: Building },
    { name: 'Verkefni', href: '/admin/projects', icon: FolderKanban },
]

const tabsByRole: Record<string, TabItem[]> = {
    factory_manager: factoryTabs,
    driver: driverTabs,
    buyer: buyerTabs,
    admin: adminTabs,
}

export function MobileBottomNav() {
    const pathname = usePathname()
    const { user } = useAuth()

    const role = user?.role
    if (!role) return null

    const tabs = tabsByRole[role]
    if (!tabs) return null

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-14">
                {tabs.map((tab) => {
                    const isDashboard = tab.href === '/factory' || tab.href === '/admin' || tab.href === '/buyer' || tab.href === '/driver'
                    const isActive = isDashboard
                        ? pathname === tab.href
                        : pathname === tab.href || pathname?.startsWith(`${tab.href}/`)

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 px-1',
                                'transition-colors active:bg-zinc-100',
                                isActive ? 'text-primary' : 'text-zinc-400'
                            )}
                        >
                            <tab.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                            <span className={cn('text-[10px] leading-tight truncate', isActive ? 'font-semibold' : 'font-medium')}>
                                {tab.name}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
