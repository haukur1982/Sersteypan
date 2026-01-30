'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
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

interface NotificationBellProps {
  userId: string
  notifications: Notification[]
}

export function NotificationBell({ userId, notifications: initialNotifications }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)

  // Auto-refresh notifications every minute
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        }
      } catch (error) {
        console.error('Error refreshing notifications:', error)
      }
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (notificationId: string) => {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )

    // In the future, call API to persist read state
    // await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
  }

  const markAllAsRead = async () => {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )

    // In the future, call API to persist
    // await fetch('/api/notifications/mark-all-read', { method: 'POST' })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'element_status':
        return '📦'
      case 'delivery':
        return '🚛'
      case 'message':
        return '💬'
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
          <span className="sr-only">Notifications</span>
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
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getNotificationIcon(notification.type)}</span>
                      <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                        locale: is
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <div className="py-2 text-center">
              <Button variant="ghost" size="sm" className="text-xs">
                Sjá allar tilkynningar
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
