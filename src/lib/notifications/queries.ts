import { createClient } from '@/lib/supabase/server'
import { isNotificationTypeEnabled } from '@/lib/notifications/preferences'

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
 * Create notifications respecting user preferences.
 *
 * Fetches each target user's profile to check their notification
 * preferences. Users who have disabled a notification type won't
 * receive it. Falls back to sending all if profiles can't be fetched.
 */
export async function createNotificationsFiltered(
  notifications: Array<{
    userId: string
    type: string
    title: string
    body?: string
    link?: string
  }>
): Promise<void> {
  if (notifications.length === 0) return

  try {
    const supabase = await createClient()

    // Fetch preferences for all target users in one query
    const userIds = [...new Set(notifications.map((n) => n.userId))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, preferences')
      .in('id', userIds)

    if (!profiles || profiles.length === 0) {
      // Fallback: send all if profiles can't be fetched
      await createNotifications(notifications)
      return
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    // Filter out notifications where the user has disabled the type
    const filtered = notifications.filter((n) => {
      const profile = profileMap.get(n.userId)
      if (!profile) return true // send if profile not found (safety net)
      const storedPrefs = (
        (profile.preferences as Record<string, unknown>)?.notifications ?? undefined
      ) as Record<string, boolean> | undefined
      type Role = 'admin' | 'factory_manager' | 'buyer' | 'driver' | 'rebar_worker'
      return isNotificationTypeEnabled(profile.role as Role, storedPrefs, n.type)
    })

    if (filtered.length > 0) {
      await createNotifications(filtered)
    }
  } catch (error) {
    // On any error, fall back to sending all (don't lose notifications)
    console.error('Error filtering notifications by preference, sending all:', error)
    await createNotifications(notifications)
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
