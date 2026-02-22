import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithRetry } from '@/lib/supabase/subscribeWithRetry'

/**
 * Hook to track unread message count with real-time updates
 */
export function useUnreadMessages(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      return
    }

    const supabase = createClient()

    // Fetch initial count - only messages from OTHER users that are unread
    const fetchCount = async () => {
      setIsLoading(true)
      const { count, error } = await supabase
        .from('project_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('user_id', userId) // CRITICAL: Don't count own messages as unread

      if (!error && count !== null) {
        setUnreadCount(count)
      } else if (error) {
        console.error('Error fetching unread count:', error)
        setUnreadCount(0)
      }
      setIsLoading(false)
    }

    fetchCount()

    // Subscribe to changes - refetch on any message change
    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_messages'
        },
        () => {
          fetchCount() // Refetch on any message change
        }
      )

    const cleanup = subscribeWithRetry(channel)

    return cleanup
  }, [userId])

  return {
    unreadCount: userId ? unreadCount : 0,
    isLoading: userId ? isLoading : false
  }
}
