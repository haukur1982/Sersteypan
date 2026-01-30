'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Delivery = Database['public']['Tables']['deliveries']['Row']

interface UseRealtimeDeliveriesOptions {
  projectId?: string
  enabled?: boolean
}

export function useRealtimeDeliveries(
  initialDeliveries: Delivery[],
  options: UseRealtimeDeliveriesOptions = {}
) {
  const { projectId, enabled = true } = options
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()

    // Build channel name
    const channelName = projectId
      ? `deliveries:project:${projectId}`
      : 'deliveries:all'

    // Subscribe to delivery changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Delivery updated:', payload.new.id)
          setDeliveries((current) =>
            current.map((d) =>
              d.id === payload.new.id ? (payload.new as Delivery) : d
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliveries',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Delivery created:', payload.new.id)
          setDeliveries((current) => [payload.new as Delivery, ...current])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'deliveries',
          ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
        },
        (payload) => {
          console.log('Delivery deleted:', payload.old.id)
          setDeliveries((current) =>
            current.filter((d) => d.id !== payload.old.id)
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          console.log(`Subscribed to ${channelName}`)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
          console.log(`Unsubscribed from ${channelName}`)
        }
      })

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [projectId, enabled])

  return { deliveries, isConnected }
}
