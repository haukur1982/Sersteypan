'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { is } from 'date-fns/locale'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

interface NotificationBellProps {
  notifications: NotificationItem[]
}

export function NotificationBell({ notifications: initialNotifications }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Sync when parent passes new notifications
  if (initialNotifications !== notifications && initialNotifications.length > 0) {
    // Only update if the data actually changed (new fetch)
    const initialIds = initialNotifications.map(n => n.id).join(',')
    const currentIds = notifications.map(n => n.id).join(',')
    if (initialIds !== currentIds) {
      setNotifications(initialNotifications)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
    } catch (error) {
      console.error('Failed to mark notification read:', error)
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    )

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch (error) {
      console.error('Failed to mark all notifications read:', error)
    }
  }

  const handleClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      setIsOpen(false)
      router.push(notification.link)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'element_status':
        return '📦'
      case 'delivery_status':
        return '🚛'
      case 'new_message':
        return '💬'
      case 'priority_request':
        return '⚡'
      case 'fix_in_factory':
        return '🔧'
      default:
        return '🔔'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Tilkynningar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Tilkynningar</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Merkja allt lesið
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Engar tilkynningar
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                      <p className={`text-sm font-medium truncate ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </p>
                    </div>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: is,
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
