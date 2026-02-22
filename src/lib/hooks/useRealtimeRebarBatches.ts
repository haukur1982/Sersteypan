'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeWithRetry } from '@/lib/supabase/subscribeWithRetry'

interface UseRealtimeRebarBatchesOptions {
    projectId?: string
    enabled?: boolean
}

// Ensure we require at least id for mapping
export function useRealtimeRebarBatches<T extends { id: string }>(
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
                (payload) => {
                    const updatedBatch = payload.new as Partial<T> & { id: string }
                    console.log('RebarBatch updated:', updatedBatch.id)
                    setBatches((current) =>
                        current.map((batch) => {
                            if (batch.id === updatedBatch.id) {
                                return { ...batch, ...updatedBatch }
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
                (payload) => {
                    const createdBatch = payload.new as T
                    console.log('RebarBatch created:', createdBatch.id)
                    // We might not have all joined data here, but for basic updates it helps
                    setBatches((current) => [...current, createdBatch])
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
                (payload) => {
                    const deletedBatch = payload.old as { id: string }
                    console.log('RebarBatch deleted:', deletedBatch.id)
                    setBatches((current) =>
                        current.filter((batch) => batch.id !== deletedBatch.id)
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

    return { batches, isConnected }
}
