import { createClient } from '@/lib/supabase/server'

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

/**
 * Get recent notifications for a user (up to 20, newest first)
 */
export async function getUserNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, link, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return (data || []) as NotificationRow[]
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error counting unread notifications:', error)
    return 0
  }

  return count || 0
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking notification read:', error)
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications read:', error)
  }
}

/**
 * Create a notification for a specific user.
 * Called from server actions when notable events happen (status changes, messages, etc.)
 */
export async function createNotification(params: {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
    })

  if (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Create notifications for multiple users at once.
 * Useful for broadcasting (e.g., new message in project → notify all project members).
 */
export async function createNotifications(
  notifications: Array<{
    userId: string
    type: string
    title: string
    body?: string
    link?: string
  }>
): Promise<void> {
  if (notifications.length === 0) return

  const supabase = await createClient()

  const rows = notifications.map((n) => ({
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body || null,
    link: n.link || null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)

  if (error) {
    console.error('Error creating notifications:', error)
  }
}

/**
 * Delete old notifications (cleanup job). Keeps last 30 days.
 */
export async function cleanupOldNotifications(): Promise<void> {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { error } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString())

  if (error) {
    console.error('Error cleaning up old notifications:', error)
  }
}
