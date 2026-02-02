'use client'

import React, { useState, useEffect } from 'react'
import { RoleBasedNav } from './RoleBasedNav'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Menu, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { AuthUser } from '@/lib/hooks/useAuth'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

/**
 * Hook to fetch notifications client-side
 * This prevents blocking server-side rendering
 */
function useNotifications(userId: string | undefined) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) {
            setLoading(false)
            return
        }

        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/notifications')
                if (response.ok) {
                    const data = await response.json()
                    setNotifications(data)
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchNotifications()

        // Refresh notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [userId])

    return { notifications, loading }
}

// UserNav component for the bottom user menu
function UserNav({ user }: { user: AuthUser | null }) {
    if (!user) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-start gap-3 px-2 h-auto py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <Avatar className="h-9 w-9 border border-sidebar-border shadow-soft">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                            {user.fullName?.[0] || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start overflow-hidden text-left">
                        <span className="text-sm font-medium truncate w-[140px] text-sidebar-foreground">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground truncate w-[140px] capitalize">{user.role}</span>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 text-zinc-900" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.fullName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Útskrá (Log out)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export interface SidebarProps {
    className?: string;
    user?: AuthUser | null;
}

export function Sidebar({ className, user: initialUser }: SidebarProps) {
    const { user: authUser, loading: authLoading } = useAuth()

    // Prioritize passed user, fall back to auth hook
    const user = initialUser ?? authUser
    const loading = initialUser ? false : authLoading

    // Fetch notifications client-side (doesn't block server render)
    const { notifications } = useNotifications(user?.id)

    return (
        <aside className={cn("hidden md:flex flex-col sticky top-0 h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground", className)}>
            {/* Logo Area */}
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6 flex-shrink-0">
                <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground">
                    Sérsteypan
                </h2>
                {user && (
                    <NotificationBell userId={user.id} notifications={notifications} />
                )}
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto py-6">
                {/* DEBUG: Remove after fixing */}
                <div className="px-3 mb-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                    loading: {String(loading)} | role: {user?.role || 'none'} | id: {user?.id?.slice(0, 8) || 'none'}
                </div>
                {loading ? (
                    <div className="px-3 space-y-2">
                        {/* Loading skeleton */}
                        <div className="h-10 bg-zinc-100 rounded animate-pulse" />
                        <div className="h-10 bg-zinc-100 rounded animate-pulse" />
                        <div className="h-10 bg-zinc-100 rounded animate-pulse" />
                        <div className="h-10 bg-zinc-100 rounded animate-pulse" />
                    </div>
                ) : (
                    <RoleBasedNav role={user?.role} />
                )}
            </div>

            {/* User Footer */}
            <div className="border-t border-sidebar-border p-4 bg-sidebar flex-shrink-0">
                {loading ? (
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-zinc-100 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-zinc-100 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-zinc-100 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <UserNav user={user} />
                )}
            </div>
        </aside>
    )
}

export function MobileSidebar({ user: initialUser }: { user?: AuthUser | null }) {
    const { user: authUser } = useAuth()
    const [open, setOpen] = React.useState(false)

    const user = initialUser ?? authUser

    // Avoid hydration mismatch by not rendering until mounted (or assume button serves as placeholder)
    // For simplicity, we assume this is client-side

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-zinc-500">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar w-64 border-r border-sidebar-border text-sidebar-foreground">
                <SheetHeader className="px-6 h-16 flex justify-center border-b border-sidebar-border text-left">
                    <SheetTitle className="text-sidebar-foreground">Sérsteypan</SheetTitle>
                </SheetHeader>
                <div className="py-6">
                    {user?.role ? (
                        <RoleBasedNav role={user.role} onItemClick={() => setOpen(false)} />
                    ) : (
                        <div className="px-6 text-sm text-muted-foreground">
                            {user ? 'Enginn aðgangur (No role)' : 'Hleður... (Loading)'}
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 w-full p-4 border-t border-sidebar-border bg-sidebar">
                    <UserNav user={user} />
                    <div className="mt-2 text-xs text-center text-muted-foreground opacity-50">v1.0.2 (3D Lab)</div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
