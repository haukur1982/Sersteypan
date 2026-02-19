'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { logout } from '@/lib/auth/actions'
import {
    LayoutDashboard,
    FolderKanban,
    Factory,
    Truck,
    QrCode,
    Building,
    MoreHorizontal,
    Layers,
    ClipboardList,
    CalendarDays,
    FileText,
    BookOpen,
    CheckSquare,
    Package,
    Wrench,
    MessageSquare,
    HelpCircle,
    LogOut,
    type LucideIcon,
} from 'lucide-react'

interface TabItem {
    name: string
    href: string
    icon: LucideIcon
}

interface MoreItem {
    name: string
    href: string
    icon: LucideIcon
}

// Factory: 4 tabs + More
const factoryTabs: TabItem[] = [
    { name: 'Heim', href: '/factory', icon: LayoutDashboard },
    { name: 'Verkefni', href: '/factory/projects', icon: FolderKanban },
    { name: 'Framleiðsla', href: '/factory/production', icon: Factory },
    { name: 'Afhending', href: '/factory/deliveries', icon: Truck },
]

const factoryMore: MoreItem[] = [
    { name: 'Framleiðslustjórn', href: '/factory/manage', icon: ClipboardList },
    { name: 'Steypulotur', href: '/factory/batches', icon: Layers },
    { name: 'Áætlun', href: '/factory/schedule', icon: CalendarDays },
    { name: 'Teikningar', href: '/factory/drawings', icon: FileText },
    { name: 'Dagbók', href: '/factory/diary', icon: BookOpen },
    { name: 'Verkefnalisti', href: '/factory/todos', icon: CheckSquare },
    { name: 'Lager', href: '/factory/stock', icon: Package },
    { name: 'Viðgerðir', href: '/factory/fix-in-factory', icon: Wrench },
    { name: 'Skilaboð', href: '/factory/messages', icon: MessageSquare },
    { name: 'Hjálp', href: '/factory/help', icon: HelpCircle },
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

const driverMore: MoreItem[] = [
    { name: 'Hjálp', href: '/driver/help', icon: HelpCircle },
]

const buyerMore: MoreItem[] = [
    { name: 'Skilaboð', href: '/buyer/messages', icon: MessageSquare },
    { name: 'Prófíll', href: '/buyer/profile', icon: LayoutDashboard },
    { name: 'Hjálp', href: '/buyer/help', icon: HelpCircle },
]

const adminMore: MoreItem[] = [
    { name: 'Notendur', href: '/admin/users', icon: LayoutDashboard },
    { name: 'Skilaboð', href: '/admin/messages', icon: MessageSquare },
    { name: 'Skýrslur', href: '/admin/reports', icon: LayoutDashboard },
    { name: 'Stillingar', href: '/admin/settings/element-types', icon: LayoutDashboard },
    { name: 'Hjálp', href: '/admin/help', icon: HelpCircle },
]

const tabsByRole: Record<string, { tabs: TabItem[]; more: MoreItem[] }> = {
    factory_manager: { tabs: factoryTabs, more: factoryMore },
    driver: { tabs: driverTabs, more: driverMore },
    buyer: { tabs: buyerTabs, more: buyerMore },
    admin: { tabs: adminTabs, more: adminMore },
}

function isTabActive(pathname: string, href: string): boolean {
    const isDashboard = href === '/factory' || href === '/admin' || href === '/buyer' || href === '/driver'
    return isDashboard
        ? pathname === href
        : pathname === href || pathname?.startsWith(`${href}/`)
}

export function MobileBottomNav({ user: serverUser }: { user?: { role: string } | null }) {
    const pathname = usePathname()
    const { user: clientUser } = useAuth()
    const [moreOpen, setMoreOpen] = useState(false)

    // Use server-provided user first, fall back to client auth hook
    const role = serverUser?.role || clientUser?.role
    if (!role) return null

    const config = tabsByRole[role]
    if (!config) return null

    const { tabs, more } = config
    const hasMore = more.length > 0

    // Check if current page is in the "more" section
    const isMoreActive = more.some(item => isTabActive(pathname, item.href))

    return (
        <>
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-14">
                    {tabs.map((tab) => {
                        const isActive = isTabActive(pathname, tab.href)

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

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            className={cn(
                                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 px-1',
                                'transition-colors active:bg-zinc-100',
                                isMoreActive ? 'text-primary' : 'text-zinc-400'
                            )}
                        >
                            <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'text-primary')} />
                            <span className={cn('text-[10px] leading-tight', isMoreActive ? 'font-semibold' : 'font-medium')}>
                                Meira
                            </span>
                        </button>
                    )}
                </div>
            </nav>

            {/* More sheet */}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
                    <SheetHeader className="pb-2">
                        <SheetTitle className="text-left">Meira</SheetTitle>
                    </SheetHeader>
                    <nav className="grid grid-cols-3 gap-2 py-2">
                        {more.map((item) => {
                            const isActive = isTabActive(pathname, item.href)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMoreOpen(false)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-zinc-600 active:bg-zinc-100'
                                    )}
                                >
                                    <item.icon className="h-6 w-6" />
                                    <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="pt-2 border-t border-zinc-200 mt-2">
                        <form action={logout}>
                            <button
                                type="submit"
                                className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 active:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="text-sm font-medium">Útskrá</span>
                            </button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}
