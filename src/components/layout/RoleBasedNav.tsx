'use client'

import {
    LayoutDashboard,
    Building,
    FolderKanban,
    Users,
    MessageSquare,
    Factory,
    BookOpen,
    CheckSquare,
    Package,
    Truck,
    QrCode,
    UserCircle
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/lib/hooks/useAuth'

interface NavItem {
    name: string
    href: string
    icon: React.ElementType
    englishName: string
}

const navigation: Record<AuthUser['role'], NavItem[]> = {
    admin: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Fyrirtæki', englishName: 'Companies', href: '/admin/companies', icon: Building },
        { name: 'Verkefni', englishName: 'Projects', href: '/admin/projects', icon: FolderKanban },
        { name: 'Notendur', englishName: 'Users', href: '/admin/users', icon: Users },
        { name: 'Skilaboð', englishName: 'Messages', href: '/admin/messages', icon: MessageSquare }
    ],
    factory_manager: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/factory', icon: LayoutDashboard },
        { name: 'Framleiðsla', englishName: 'Production', href: '/factory/production', icon: Factory },
        { name: 'Dagbók', englishName: 'Diary', href: '/factory/diary', icon: BookOpen },
        { name: 'Verkefnalisti', englishName: 'Tasks', href: '/factory/todos', icon: CheckSquare },
        { name: 'Lager', englishName: 'Stock', href: '/factory/stock', icon: Package }
    ],
    buyer: [
        { name: 'Yfirlit', englishName: 'Dashboard', href: '/buyer', icon: LayoutDashboard },
        { name: 'Verkefni', englishName: 'Projects', href: '/buyer/projects', icon: FolderKanban },
        { name: 'Afhendingar', englishName: 'Deliveries', href: '/buyer/deliveries', icon: Truck },
        { name: 'Skilaboð', englishName: 'Messages', href: '/buyer/messages', icon: MessageSquare },
        { name: 'Prófíll', englishName: 'Profile', href: '/buyer/profile', icon: UserCircle }
    ],
    driver: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/driver', icon: LayoutDashboard },
        { name: 'Afhendingar', englishName: 'Deliveries', href: '/driver/deliveries', icon: Truck },
        { name: 'Skanna QR', englishName: 'Scan QR', href: '/driver/scan', icon: QrCode }
    ]
}

export function RoleBasedNav({ role, onItemClick }: { role: AuthUser['role'] | undefined, onItemClick?: () => void }) {
    const pathname = usePathname()

    if (!role || !navigation[role]) return null

    return (
        <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation[role].map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onItemClick}
                        title={item.englishName}
                        className={cn(
                            'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                    >
                        <item.icon
                            className={cn(
                                'h-5 w-5 flex-shrink-0',
                                isActive ? 'text-sidebar-accent-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
                            )}
                            aria-hidden="true"
                        />
                        {item.name}
                    </Link>
                )
            })}
        </nav>
    )
}
