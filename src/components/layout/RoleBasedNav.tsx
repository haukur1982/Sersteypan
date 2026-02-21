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
    UserCircle,
    Wrench,
    FlaskConical,
    Settings,
    CalendarDays,
    FileText,
    BarChart3,
    Layers,
    ClipboardList,
    HelpCircle,
    TrendingUp,
    type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import type { AuthUser } from '@/lib/hooks/useAuth'

interface NavItem {
    name: string
    href: string
    icon: LucideIcon
    englishName: string
}

// Role normalization map to handle localized or legacy role names
const roleMap: Record<string, AuthUser['role']> = {
    // Standard system roles
    'admin': 'admin',
    'factory_manager': 'factory_manager',
    'buyer': 'buyer',
    'driver': 'driver',

    // Icelandic / Human readable variants (seen in production data)
    'Admin': 'admin',
    'Kerfisstjóri': 'admin',
    'Factory Manager': 'factory_manager',
    'Verksmiðjustjóri': 'factory_manager',
    'Buyer': 'buyer',
    'Kaupamadur': 'buyer',
    'Driver': 'driver',
    'Bílstjóri': 'driver'
}

const navigation: Record<AuthUser['role'], NavItem[]> = {
    admin: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Fyrirtæki', englishName: 'Companies', href: '/admin/companies', icon: Building },
        { name: 'Verkefni', englishName: 'Projects', href: '/admin/projects', icon: FolderKanban },
        { name: 'Notendur', englishName: 'Users', href: '/admin/users', icon: Users },
        { name: 'Skilaboð', englishName: 'Messages', href: '/admin/messages', icon: MessageSquare },
        { name: 'Framvinda', englishName: 'Progress Billing', href: '/admin/framvinda', icon: TrendingUp },
        { name: 'Skýrslur', englishName: 'Reports', href: '/admin/reports', icon: BarChart3 },
        { name: 'Stillingar', englishName: 'Settings', href: '/admin/settings/element-types', icon: Settings },
        { name: '3D Lab (Exp)', englishName: '3D Research', href: '/admin/lab/3d', icon: FlaskConical },
        { name: 'Hjálp', englishName: 'Help', href: '/admin/help', icon: HelpCircle },
    ],
    factory_manager: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/factory', icon: LayoutDashboard },
        { name: 'Verkefni', englishName: 'Projects', href: '/factory/projects', icon: FolderKanban },
        { name: 'Framleiðslustjórn', englishName: 'Manage Production', href: '/factory/manage', icon: ClipboardList },
        { name: 'Framleiðsla', englishName: 'Production', href: '/factory/production', icon: Factory },
        { name: 'Vinnuskráning', englishName: 'Labor Logs', href: '/factory/labor', icon: Users },
        { name: 'Steypulotur', englishName: 'Batches', href: '/factory/batches', icon: Layers },
        { name: 'Áætlun', englishName: 'Schedule', href: '/factory/schedule', icon: CalendarDays },
        { name: 'Afhendingar', englishName: 'Deliveries', href: '/factory/deliveries', icon: Truck },
        { name: 'Teikningar', englishName: 'Drawings', href: '/factory/drawings', icon: FileText },
        { name: 'Dagbók', englishName: 'Diary', href: '/factory/diary', icon: BookOpen },
        { name: 'Verkefnalisti', englishName: 'Tasks', href: '/factory/todos', icon: CheckSquare },
        { name: 'Lager', englishName: 'Stock', href: '/factory/stock', icon: Package },
        { name: 'Viðgerðir', englishName: 'Fix in Factory', href: '/factory/fix-in-factory', icon: Wrench },
        { name: 'Skilaboð', englishName: 'Messages', href: '/factory/messages', icon: MessageSquare },
        { name: 'Hjálp', englishName: 'Help', href: '/factory/help', icon: HelpCircle },
    ],
    buyer: [
        { name: 'Yfirlit', englishName: 'Dashboard', href: '/buyer', icon: LayoutDashboard },
        { name: 'Verkefni', englishName: 'Projects', href: '/buyer/projects', icon: FolderKanban },
        { name: 'Afhendingar', englishName: 'Deliveries', href: '/buyer/deliveries', icon: Truck },
        { name: 'Framvinda', englishName: 'Progress Billing', href: '/buyer/framvinda', icon: TrendingUp },
        { name: 'Skilaboð', englishName: 'Messages', href: '/buyer/messages', icon: MessageSquare },
        { name: 'Prófíll', englishName: 'Profile', href: '/buyer/profile', icon: UserCircle },
        { name: 'Hjálp', englishName: 'Help', href: '/buyer/help', icon: HelpCircle },
    ],
    driver: [
        { name: 'Stjórnborð', englishName: 'Dashboard', href: '/driver', icon: LayoutDashboard },
        { name: 'Afhendingar', englishName: 'Deliveries', href: '/driver/deliveries', icon: Truck },
        { name: 'Skanna QR', englishName: 'Scan QR', href: '/driver/scan', icon: QrCode },
        { name: 'Hjálp', englishName: 'Help', href: '/driver/help', icon: HelpCircle },
    ]
}

export function RoleBasedNav({ role, onItemClick }: { role: AuthUser['role'] | undefined, onItemClick?: () => void }) {
    const pathname = usePathname()
    const { user } = useAuth()
    const { unreadCount } = useUnreadMessages(user?.id)

    if (!role) return null

    const normalizedInput = typeof role === 'string' ? role.trim() : role
    const normalizedRole = (roleMap[normalizedInput] || normalizedInput) as AuthUser['role']
    if (!normalizedRole || !navigation[normalizedRole]) {
        return (
            <div className="p-4 space-y-2">
                <div className="text-sm text-red-500 font-medium">Villa: Óþekkt hlutverk</div>
                <div className="text-xs text-muted-foreground font-mono bg-zinc-100 p-2 rounded">
                    Role: &quot;{role}&quot;<br />
                    Normalized: &quot;{normalizedRole || 'null'}&quot;
                </div>
            </div>
        )
    }

    const isMessagesRoute = (href: string) => href.includes('/messages')

    return (
        <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation[normalizedRole].map((item) => {
                // Dashboard routes should only match exactly
                // Other routes can match their children (e.g., /factory/diary matches /factory/diary/123)
                const isDashboard = item.href === '/factory' || item.href === '/admin' || item.href === '/buyer' || item.href === '/driver'
                const isActive = isDashboard
                    ? pathname === item.href
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`)

                const showBadge = isMessagesRoute(item.href) && unreadCount > 0

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onItemClick}
                        title={item.englishName}
                        className={cn(
                            'group flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all min-h-[44px]',
                            isActive
                                ? 'bg-sidebar-accent text-white border-l-[3px] border-sidebar-primary pl-2.5 shadow-sm'
                                : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border-l-[3px] border-transparent'
                        )}
                    >
                        <item.icon
                            className={cn(
                                'h-5 w-5 flex-shrink-0',
                                isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/85 group-hover:text-sidebar-accent-foreground'
                            )}
                            aria-hidden="true"
                        />
                        <span className="flex-1">{item.name}</span>
                        {showBadge && (
                            <Badge
                                variant="default"
                                className="ml-auto bg-red-600 text-white text-xs px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
