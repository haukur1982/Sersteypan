'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithRetry } from '@/lib/supabase/subscribeWithRetry'
import type { Database } from '@/types/database'

type Element = Database['public']['Tables']['elements']['Row']

interface UseRealtimeElementsOptions {
  projectId?: string
  enabled?: boolean
}

export function useRealtimeElements(
  initialElements: Element[],
  options: UseRealtimeElementsOptions = {}
) {
  const { projectId, enabled = true } = options
  const [elements, setElements] = useState<Element[]>(initialElements)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    // Build channel name
    const channelName = projectId
      ? `elements:project:${projectId}`
      : 'elements:all'

    // Subscribe to element changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elements',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Element updated:', payload.new.id)
          setElements((current) =>
            current.map((el) =>
              el.id === payload.new.id ? (payload.new as Element) : el
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'elements',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Element created:', payload.new.id)
          setElements((current) => [...current, payload.new as Element])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'elements',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Element deleted:', payload.old.id)
          setElements((current) =>
            current.filter((el) => el.id !== payload.old.id)
          )
        }
      )


    const cleanup = subscribeWithRetry(channel, (status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      cleanup()
      setIsConnected(false)
    }
  }, [projectId, enabled])

  return { elements, isConnected }
}
