import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getGeometriesForProject } from '@/lib/building-geometry/queries'
import { getGeometryWithLayouts } from '@/lib/building-geometry/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Building, Sparkles, Layers } from 'lucide-react'
import { AutoPanelizationClient } from './AutoPanelizationClient'
import { parseGeometryRow } from '@/lib/building-geometry/types'

export default async function AutoPanelizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ geometry?: string }>
}) {
  const { projectId } = await params
  const { geometry: geometryId } = await searchParams

  const { data: project, error } = await getProject(projectId)
  if (error || !project) notFound()

  // Fetch all geometries for this project
  const { data: geometries } = await getGeometriesForProject(projectId)

  // Select the active geometry
  let selectedGeometry = null
  const linkedLayouts: Array<{
    zoneId: string
    layout: Record<string, unknown>
    panels: Array<Record<string, unknown>>
  }> = []

  const targetGeoId = geometryId ?? geometries[0]?.id

  if (targetGeoId) {
    const result = await getGeometryWithLayouts(targetGeoId)
    if (result.geometry) {
      selectedGeometry = result.geometry

      // Parse geometry_zone_id to extract zone linkages
      for (const layout of result.layouts) {
        const gzId = layout.geometry_zone_id
        if (!gzId) continue

        const parts = gzId.split(':')
        if (parts.length === 2 && parts[0] === targetGeoId) {
          linkedLayouts.push({
            zoneId: parts[1],
            layout: layout as unknown as Record<string, unknown>,
            panels:
              (
                layout as unknown as Record<
                  string,
                  { panelization_panels: unknown[] }
                >
              ).panelization_panels as unknown as Array<
                Record<string, unknown>
              > || [],
          })
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={`/admin/projects/${projectId}/panelization`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Sjálfvirkt filigransnið
            </h1>
            <Layers className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm text-zinc-600 ml-10">
            {project.name} — Sjálfvirk skipting gólfflata í filigranplötur
          </p>
        </div>
      </div>

      {/* Empty state: no geometries */}
      {geometries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">
              Engin byggingarmynd enn
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
              Hlaðið upp aðaluppdrætti og veljið &quot;Plötugreining&quot; til að
              greina veggi og svæði úr teikningu. Þegar svæði hafa verið greind
              getur kerfið sjálfkrafa reiknað filigransnið.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/admin/projects/${projectId}/analyze-drawings`}>
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                Greina teikningu
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main content: auto-panelization */}
      {selectedGeometry && (
        <AutoPanelizationClient
          geometry={parseGeometryRow(selectedGeometry)}
          linkedLayouts={linkedLayouts}
          geometries={geometries}
          projectId={projectId}
        />
      )}
    </div>
  )
}
