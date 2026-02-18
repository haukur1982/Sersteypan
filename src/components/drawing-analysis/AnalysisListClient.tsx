'use client'

import { useRealtimeAnalyses } from '@/lib/hooks/useRealtimeAnalysis'
import { AnalysisStatusCard } from './AnalysisStatusCard'

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

/**
 * Client wrapper that subscribes to Supabase Realtime for
 * drawing_analyses updates. Renders AnalysisStatusCard for each.
 * Replaces the old server-rendered list + polling pattern.
 */
export function AnalysisListClient({
  analyses: initialAnalyses,
  projectId,
}: {
  analyses: AnalysisData[]
  projectId: string
}) {
  const { analyses } = useRealtimeAnalyses(initialAnalyses, { projectId })

  if (analyses.length === 0) return null

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 mb-4">
        Greiningar ({analyses.length})
      </h2>
      <div className="space-y-3">
        {analyses.map((analysis) => (
          <AnalysisStatusCard
            key={analysis.id}
            analysis={analysis}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  )
}
