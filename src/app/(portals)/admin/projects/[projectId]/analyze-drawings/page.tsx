import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getAnalysesForProject } from '@/lib/drawing-analysis/queries'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles, Layers } from 'lucide-react'
import { DrawingUploadZone } from '@/components/drawing-analysis/DrawingUploadZone'
import { AnalysisListClient } from '@/components/drawing-analysis/AnalysisListClient'

export default async function AnalyzeDrawingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  // Fetch project
  const { data: project, error: projectError } = await getProject(projectId)
  if (projectError || !project) {
    notFound()
  }

  // Fetch existing analyses
  const { data: analyses, error: analysesError } =
    await getAnalysesForProject(projectId)

  // Check if there are completed analyses for the combined view link
  const hasCompletedAnalyses = analyses?.some(
    (a) =>
      a.status === 'completed' ||
      a.status === 'reviewed' ||
      a.status === 'committed'
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={`/admin/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Greina teikningar
            </h1>
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-zinc-600 ml-10">
            {project.name} — {project.companies?.name}
          </p>
        </div>

        {/* Combined view link */}
        {hasCompletedAnalyses && (
          <Button variant="outline" asChild>
            <Link
              href={`/admin/projects/${projectId}/analyze-drawings/combined`}
            >
              <Layers className="mr-2 h-4 w-4" />
              Sameinað yfirlit
            </Link>
          </Button>
        )}
      </div>

      {/* Info box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-900 font-medium mb-1">
              AI-greining á burðarþolsteikningum
            </p>
            <p className="text-sm text-purple-700">
              Hlaðið upp PDF teikningum og kerfið greinir þær sjálfkrafa.
              Steypueiningar, mál, járnauppsetning og þyngd eru dregin út.
              Eftir yfirferð er hægt að stofna allar einingar í einu.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">
          Hlaða upp teikningum
        </h2>
        <DrawingUploadZone projectId={projectId} />
      </div>

      {/* Existing Analyses — Realtime-enabled client component */}
      {analysesError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{analysesError}</p>
        </div>
      )}

      {analyses && analyses.length > 0 && (
        <AnalysisListClient analyses={analyses} projectId={projectId} />
      )}
    </div>
  )
}
