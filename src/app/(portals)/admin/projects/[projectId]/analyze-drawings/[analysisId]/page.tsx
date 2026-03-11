import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import {
  getAnalysis,
  getProjectBuildings,
  getExistingElementNames,
} from '@/lib/drawing-analysis/queries'
import { getGeometriesForProject } from '@/lib/building-geometry/queries'
import { parseGeometryRow } from '@/lib/building-geometry/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertTriangle, Sparkles, CheckCheck } from 'lucide-react'
import { ElementReviewTable } from '@/components/drawing-analysis/ElementReviewTable'
import { SurfaceReviewTable } from '@/components/drawing-analysis/SurfaceReviewTable'
import { SplitReviewLayout } from '@/components/drawing-analysis/SplitReviewLayout'
import { FiligranReviewSection } from '@/components/drawing-analysis/FiligranReviewSection'
import { extractElementsFromStored } from '@/lib/schemas/drawing-analysis'
import type { SlabArea } from '@/lib/schemas/drawing-analysis'
import type { ExtractedSurface } from '@/lib/schemas/surface-analysis'

export default async function ReviewAnalysisPage({
  params,
}: {
  params: Promise<{ projectId: string; analysisId: string }>
}) {
  const { projectId, analysisId } = await params

  // Fetch data in parallel
  const [projectResult, analysisResult, buildings, existingNames] =
    await Promise.all([
      getProject(projectId),
      getAnalysis(analysisId),
      getProjectBuildings(projectId),
      getExistingElementNames(projectId),
    ])

  if (projectResult.error || !projectResult.data) {
    notFound()
  }
  if (analysisResult.error || !analysisResult.data) {
    notFound()
  }

  const project = projectResult.data
  const analysis = analysisResult.data
  const isSurfaceMode = analysis.analysis_mode === 'surfaces'

  // Extract elements + slab_area from stored format (handles both legacy array and wrapped object)
  const { elements, slabArea } = isSurfaceMode
    ? { elements: [], slabArea: null as SlabArea | null }
    : extractElementsFromStored(analysis.extracted_elements)

  const surfaces = isSurfaceMode
    ? (analysis.extracted_elements as unknown as ExtractedSurface[]) || []
    : []
  const isCommitted = analysis.status === 'committed'

  // Detect if floor plan view is available
  const hasPositions = elements.some(
    el => el.position_x_mm != null && el.position_y_mm != null
  )
  const canShowFloorPlan = hasPositions && slabArea != null

  // Optionally fetch building geometry for wall overlay
  let matchedGeometry: import('@/lib/building-geometry/types').BuildingFloorGeometry | undefined
  if (canShowFloorPlan) {
    // Get building/floor from the stored response wrapper (if present)
    const rawStored = analysis.extracted_elements as Record<string, unknown> | null
    const analysisBuilding = !Array.isArray(rawStored) ? (rawStored?.building as string | null) : null
    const analysisFloor = !Array.isArray(rawStored) ? (rawStored?.floor as number | null) : null
    if (analysisBuilding != null || analysisFloor != null) {
      const { data: geometries } = await getGeometriesForProject(projectId)
      // Find geometry matching floor (building matching is approximate for now)
      const match = geometries.find(g => {
        const gRow = g as Record<string, unknown>
        const gFloor = gRow.floor as number | null
        return (analysisFloor == null || gFloor === analysisFloor)
      })
      if (match) {
        matchedGeometry = parseGeometryRow(match as unknown as Record<string, unknown>)
      }
    }
  }

  // Parse warnings from confidence notes
  const warnings = analysis.ai_confidence_notes
    ? analysis.ai_confidence_notes.split('\n').filter(Boolean)
    : []

  // Document info for split-screen PDF view
  const documentId = analysis.document_id

  // Summary cards + table content (rendered inside or outside split layout)
  const reviewContent = (
    <div className="space-y-6">
      {/* AI Summary */}
      {analysis.ai_summary && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-900 font-medium mb-1">
                  AI greining
                </p>
                <p className="text-sm text-purple-800">
                  {analysis.ai_summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900 font-medium mb-1">
                  Athugasemdir ({warnings.length})
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Committed info */}
      {isCommitted && analysis.elements_created != null && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-green-900 font-medium">
                  {analysis.elements_created} einingar voru stofnaðar úr þessari greiningu
                </p>
                {analysis.reviewed_at && (
                  <p className="text-xs text-green-700 mt-0.5">
                    Staðfest{' '}
                    {new Date(analysis.reviewed_at).toLocaleString('is-IS')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Table — surface or element mode */}
      {isSurfaceMode ? (
        surfaces.length > 0 ? (
          <SurfaceReviewTable
            analysisId={analysisId}
            projectId={projectId}
            surfaces={surfaces}
            isCommitted={isCommitted}
          />
        ) : (
          <Card className="border-zinc-200">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-zinc-500">
                Engir fletir fundust í þessari teikningu.
              </p>
            </CardContent>
          </Card>
        )
      ) : elements.length > 0 ? (
        <ElementReviewTable
          analysisId={analysisId}
          projectId={projectId}
          elements={elements}
          buildings={buildings}
          existingNames={existingNames}
          isCommitted={isCommitted}
        />
      ) : (
        <Card className="border-zinc-200">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-zinc-500">
              Engar einingar fundust í þessari teikningu.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // ── Filigran Floor Plan layout (when position data available) ──
  // This wraps the summary cards + floor plan + table with linked interactions.
  // Falls back to the standard SplitReviewLayout when no positions.
  const filigranReviewContent = canShowFloorPlan && slabArea ? (
    <div className="space-y-6">
      {/* Summary cards (same as reviewContent but without the table) */}
      {analysis.ai_summary && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-900 font-medium mb-1">
                  AI greining
                </p>
                <p className="text-sm text-purple-800">
                  {analysis.ai_summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900 font-medium mb-1">
                  Athugasemdir ({warnings.length})
                </p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {isCommitted && analysis.elements_created != null && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-green-900 font-medium">
                  {analysis.elements_created} einingar voru stofnaðar úr þessari greiningu
                </p>
                {analysis.reviewed_at && (
                  <p className="text-xs text-green-700 mt-0.5">
                    Staðfest{' '}
                    {new Date(analysis.reviewed_at).toLocaleString('is-IS')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floor plan + table with linked interactions */}
      <FiligranReviewSection
        elements={elements}
        slabArea={slabArea}
        geometry={matchedGeometry}
        documentId={documentId!}
        analysisId={analysisId}
        projectId={projectId}
        buildings={buildings}
        existingNames={existingNames}
        isCommitted={isCommitted}
      />
    </div>
  ) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link
                href={`/admin/projects/${projectId}/analyze-drawings`}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {isSurfaceMode ? 'Plötugreining' : 'Yfirferð greiningar'}
            </h1>
            {isCommitted ? (
              <Badge className="bg-purple-100 text-purple-800 border-0">
                <CheckCheck className="h-3 w-3 mr-1" />
                Staðfest
              </Badge>
            ) : (
              <Sparkles className="h-5 w-5 text-purple-500" />
            )}
          </div>
          <p className="text-zinc-600 ml-10">
            {project.name} — {analysis.document_name}
          </p>
        </div>
      </div>

      {/* Content layout depends on available data:
          1. Floor plan available → FiligranReviewSection with floor plan + table
          2. Document available → SplitReviewLayout with PDF + table
          3. Neither → just the review content */}
      {canShowFloorPlan && filigranReviewContent ? (
        filigranReviewContent
      ) : documentId ? (
        <SplitReviewLayout documentId={documentId}>
          {reviewContent}
        </SplitReviewLayout>
      ) : (
        reviewContent
      )}
    </div>
  )
}
