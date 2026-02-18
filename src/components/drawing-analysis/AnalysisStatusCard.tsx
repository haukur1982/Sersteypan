'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import { deleteAnalysis } from '@/lib/drawing-analysis/actions'

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

const statusConfig: Record<
  string,
  { color: string; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { color: 'bg-zinc-100 text-zinc-600', label: 'Í biðröð', icon: Clock },
  processing: {
    color: 'bg-blue-100 text-blue-800',
    label: 'Greining stendur yfir...',
    icon: Loader2,
  },
  completed: {
    color: 'bg-green-100 text-green-800',
    label: 'Greining lokið',
    icon: CheckCircle,
  },
  failed: { color: 'bg-red-100 text-red-800', label: 'Greining mistókst', icon: XCircle },
  reviewed: {
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Yfirfarið',
    icon: Eye,
  },
  committed: {
    color: 'bg-purple-100 text-purple-800',
    label: 'Staðfest',
    icon: CheckCheck,
  },
}

/**
 * Pure display component for a single analysis card.
 * Status updates come from the parent via Supabase Realtime
 * (through AnalysisListClient / useRealtimeAnalyses).
 * No more polling.
 */
export function AnalysisStatusCard({
  analysis,
  projectId,
}: {
  analysis: AnalysisData
  projectId: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const status = analysis.status
  const statusInfo = statusConfig[status] || statusConfig.pending
  const StatusIcon = statusInfo.icon
  const elements = Array.isArray(analysis.extracted_elements)
    ? analysis.extracted_elements
    : []
  const elementCount = elements.length

  async function handleDelete() {
    if (!confirm('Ertu viss um að þú viljir eyða þessari greiningu?')) return
    setIsDeleting(true)
    const result = await deleteAnalysis(analysis.id)
    if (result.error) {
      alert(result.error)
      setIsDeleting(false)
    }
    // Page will revalidate after deletion
  }

  return (
    <Card className="border-zinc-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon
                className={`h-5 w-5 ${
                  status === 'processing' ? 'animate-spin text-blue-600' : ''
                }`}
              />
              <h3 className="font-semibold text-zinc-900 truncate max-w-[300px]">
                {analysis.document_name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant="secondary"
                className={`${statusInfo.color} border-0 font-normal`}
              >
                {statusInfo.label}
              </Badge>
              {(status === 'completed' || status === 'reviewed') && (
                <span className="text-sm text-zinc-600">
                  {elementCount} einingar fundust
                </span>
              )}
              {status === 'committed' &&
                analysis.elements_created != null && (
                  <span className="text-sm text-purple-600 font-medium">
                    {analysis.elements_created} einingar stofnaðar
                  </span>
                )}
              {status === 'processing' &&
                analysis.pages_analyzed != null &&
                analysis.page_count != null && (
                  <span className="text-xs text-blue-600">
                    {analysis.pages_analyzed}/{analysis.page_count} síður
                  </span>
                )}
            </div>

            {analysis.ai_summary && (
              <p className="text-sm text-zinc-600 mb-2 line-clamp-2">
                {analysis.ai_summary}
              </p>
            )}

            {analysis.error_message && (
              <p className="text-sm text-red-600 mb-2">
                {analysis.error_message}
              </p>
            )}

            {status === 'pending' && (
              <p className="text-sm text-zinc-500 mb-2">
                Greining hefst sjálfkrafa — bíðið augnablik...
              </p>
            )}

            {status === 'processing' && (
              <p className="text-sm text-blue-600 mb-2">
                AI les teikninguna og dregur út einingar. Þetta getur tekið 30–60 sekúndur.
              </p>
            )}

            <p className="text-xs text-zinc-400">
              {new Date(analysis.created_at).toLocaleString('is-IS')}
            </p>
          </div>

          <div className="flex gap-2 ml-4">
            {(status === 'completed' || status === 'reviewed') && (
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link
                  href={`/admin/projects/${projectId}/analyze-drawings/${analysis.id}`}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  Yfirfara
                </Link>
              </Button>
            )}
            {status === 'committed' && (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/admin/projects/${projectId}/analyze-drawings/${analysis.id}`}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  Skoða
                </Link>
              </Button>
            )}
            {status !== 'committed' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
