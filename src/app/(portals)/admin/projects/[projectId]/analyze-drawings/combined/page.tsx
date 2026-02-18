import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getCompletedAnalyses } from '@/lib/drawing-analysis/queries'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Layers } from 'lucide-react'
import { CombinedReviewTable } from '@/components/drawing-analysis/CombinedReviewTable'

export default async function CombinedAnalysisPage({
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

  // Fetch completed analyses
  const { data: analyses, error: analysesError } =
    await getCompletedAnalyses(projectId)

  if (analysesError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">{analysesError}</p>
      </div>
    )
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href={`/admin/projects/${projectId}/analyze-drawings`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Sameinað yfirlit
          </h1>
        </div>
        <div className="p-8 text-center text-zinc-500">
          Engar greiningar hafa verið kláraðar enn.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href={`/admin/projects/${projectId}/analyze-drawings`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Sameinað yfirlit
          </h1>
          <Layers className="h-5 w-5 text-purple-500" />
        </div>
        <p className="text-zinc-600 ml-10">
          {project.name} — Allar greindar einingar
        </p>
      </div>

      {/* Combined table */}
      <CombinedReviewTable analyses={analyses} />
    </div>
  )
}
