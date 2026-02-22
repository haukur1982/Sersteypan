'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type RebarBatch = Database['public']['Tables']['rebar_batches']['Row']

interface UseRealtimeRebarBatchesOptions {
    projectId?: string
    enabled?: boolean
}

// Ensure we require at least id for mapping
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeRebarBatches<T extends { id: string;[key: string]: any }>(
    initialBatches: T[],
    options: UseRealtimeRebarBatchesOptions = {}
) {
    const { projectId, enabled = true } = options
    const [batches, setBatches] = useState<T[]>(initialBatches)
    const [isConnected, setIsConnected] = useState(false)

    // Update effect if initialBatches changes
    useEffect(() => {
        setBatches(initialBatches)
    }, [initialBatches])

    useEffect(() => {
        if (!enabled) return

        const supabase = createClient()

        const channelName = projectId
            ? `rebar_batches:project:${projectId}`
            : 'rebar_batches:all'

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rebar_batches',
                    ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    console.log('RebarBatch updated:', payload.new.id)
                    setBatches((current) =>
                        current.map((batch) => {
                            if (batch.id === payload.new.id) {
                                return { ...batch, ...payload.new }
                            }
                            return batch
                        })
                    )
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'rebar_batches',
                    ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    console.log('RebarBatch created:', payload.new.id)
                    // We might not have all joined data here, but for basic updates it helps
                    setBatches((current) => [...current, payload.new as unknown as T])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'rebar_batches',
                    ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    console.log('RebarBatch deleted:', payload.old.id)
                    setBatches((current) =>
                        current.filter((batch) => batch.id !== payload.old.id)
                    )
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true)
                } else if (status === 'CLOSED') {
                    setIsConnected(false)
                }
            })

        return () => {
            channel.unsubscribe()
            setIsConnected(false)
        }
    }, [projectId, enabled])

    return { batches, isConnected }
}
