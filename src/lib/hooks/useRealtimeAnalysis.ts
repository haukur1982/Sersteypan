'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AnalysisData = {
  id: string
  status: string
  document_name: string
  page_count: number | null
  pages_analyzed: number | null
  extracted_elements: unknown
  ai_summary: string | null
  ai_confidence_notes: string | null
  elements_created: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

interface UseRealtimeAnalysesOptions {
  projectId: string
  enabled?: boolean
}

/**
 * Subscribe to realtime changes on drawing_analyses for a project.
 * Replaces polling-based status checking. On UPDATE, merges
 * changed fields into the local state. On INSERT, appends.
 * On completion/failure, calls router.refresh() to get full server data.
 */
export function useRealtimeAnalyses(
  initialAnalyses: AnalysisData[],
  options: UseRealtimeAnalysesOptions
) {
  const { projectId, enabled = true } = options
  const [analyses, setAnalyses] = useState<AnalysisData[]>(initialAnalyses)
  const [isConnected, setIsConnected] = useState(false)
  const router = useRouter()

  // Keep analyses in sync if server re-fetches (e.g. after router.refresh())
  useEffect(() => {
    setAnalyses(initialAnalyses)
  }, [initialAnalyses])

  const handleUpdate = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const updated = payload.new as unknown as AnalysisData
      setAnalyses((current) =>
        current.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      )

      // When an analysis finishes (completed/failed/committed), refresh
      // to get full server data (extracted_elements, etc.)
      if (
        updated.status === 'completed' ||
        updated.status === 'failed' ||
        updated.status === 'committed'
      ) {
        router.refresh()
      }
    },
    [router]
  )

  const handleInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const inserted = payload.new as unknown as AnalysisData
      setAnalyses((current) => {
        // Avoid duplicates
        if (current.some((a) => a.id === inserted.id)) return current
        return [inserted, ...current]
      })
    },
    []
  )

  const handleDelete = useCallback(
    (payload: { old: Record<string, unknown> }) => {
      const deleted = payload.old as { id: string }
      setAnalyses((current) => current.filter((a) => a.id !== deleted.id))
    },
    []
  )

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `analyses:project:${projectId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drawing_analyses',
          filter: `project_id=eq.${projectId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawing_analyses',
          filter: `project_id=eq.${projectId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'drawing_analyses',
          filter: `project_id=eq.${projectId}`,
        },
        handleDelete
      )
      .subscribe((status) => {
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
  }, [projectId, enabled, handleUpdate, handleInsert, handleDelete])

  return { analyses, isConnected }
}
