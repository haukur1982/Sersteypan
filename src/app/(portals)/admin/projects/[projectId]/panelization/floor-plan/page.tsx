import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getGeometriesForProject } from '@/lib/building-geometry/queries'
import { getGeometryWithLayouts } from '@/lib/building-geometry/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Building, Sparkles } from 'lucide-react'
import { FloorPlanClient } from './FloorPlanClient'
import { parseGeometryRow } from '@/lib/building-geometry/types'

export default async function FloorPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ geometry?: string; floor?: string }>
}) {
  const { projectId } = await params
  const { geometry: geometryId, floor: floorParam } = await searchParams

  const { data: project, error } = await getProject(projectId)
  if (error || !project) notFound()

  // Fetch all geometries for this project
  const { data: geometries, error: geoError } =
    await getGeometriesForProject(projectId)

  // If a specific geometry is requested, fetch it with layouts
  let selectedGeometry = null
  const linkedLayouts: Array<{
    zoneId: string
    layout: Record<string, unknown>
    panels: Array<Record<string, unknown>>
  }> = []

  if (geometryId) {
    const result = await getGeometryWithLayouts(geometryId)
    if (result.geometry) {
      selectedGeometry = result.geometry

      // Parse geometry_zone_id to extract zone linkages
      for (const layout of result.layouts) {
        const gzId = layout.geometry_zone_id
        if (!gzId) continue

        // Format: "geometryId:zoneId"
        const parts = gzId.split(':')
        if (parts.length === 2 && parts[0] === geometryId) {
          linkedLayouts.push({
            zoneId: parts[1],
            layout: layout as unknown as Record<string, unknown>,
            panels: (layout as unknown as Record<string, { panelization_panels: unknown[] }>).panelization_panels as unknown as Array<Record<string, unknown>> || [],
          })
        }
      }
    }
  } else if (geometries.length > 0) {
    // Auto-select first geometry (or filter by floor param)
    const targetFloor = floorParam ? parseInt(floorParam) : undefined
    const match = targetFloor !== undefined
      ? geometries.find((g) => g.floor === targetFloor)
      : geometries[0]

    if (match) {
      const result = await getGeometryWithLayouts(match.id)
      if (result.geometry) {
        selectedGeometry = result.geometry

        for (const layout of result.layouts) {
          const gzId = layout.geometry_zone_id
          if (!gzId) continue

          const parts = gzId.split(':')
          if (parts.length === 2 && parts[0] === match.id) {
            linkedLayouts.push({
              zoneId: parts[1],
              layout: layout as unknown as Record<string, unknown>,
              panels: (layout as unknown as Record<string, { panelization_panels: unknown[] }>).panelization_panels as unknown as Array<Record<string, unknown>> || [],
            })
          }
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
              Hæðarmynd
            </h1>
            <Building className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600 ml-10">
            {project.name} — Yfirlit yfir plötusnið á hæðarmynd
          </p>
        </div>
      </div>

      {/* Empty state */}
      {geometries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-1">
              Engin byggingarmynd enn
            </h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
              Hlaðið upp aðaluppdrætti og veljið &quot;Plötugreining&quot; til að
              greina veggi, svæði og hæðarmynd úr teikningu.
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

      {/* Floor plan view */}
      {selectedGeometry && (
        <FloorPlanClient
          geometry={parseGeometryRow(selectedGeometry)}
          layouts={linkedLayouts}
          geometries={geometries}
          projectId={projectId}
        />
      )}
    </div>
  )
}
