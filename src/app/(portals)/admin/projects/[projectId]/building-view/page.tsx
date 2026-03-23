import { getServerUser } from '@/lib/auth/getServerUser'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBuildingViewData } from '@/lib/building-view/queries'
import { BuildingViewClient } from './BuildingViewClient'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function BuildingViewPage({ params }: Props) {
  const { projectId } = await params
  const user = await getServerUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) {
    return notFound()
  }

  const { data: buildingView, error } = await getBuildingViewData(projectId)

  // Fetch building names for display
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('project_id', projectId)

  const buildingNames = new Map(buildings?.map(b => [b.id, b.name]) ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/projects/${projectId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Til baka
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Byggingaryfirlit</h1>
              <p className="text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </div>
        {buildingView && (
          <div className="text-sm text-muted-foreground">
            {buildingView.positionedElements} af {buildingView.totalElements} einingum staðsettar
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          Villa: {error}
        </div>
      )}

      {!buildingView || buildingView.floors.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            Engar einingar hafa verið staðsettar á byggingarteikningum
          </p>
          <p className="text-sm text-muted-foreground/70">
            Greindu BF-teikningar og staðfestu til að sjá einingar hér sjálfkrafa
          </p>
          <Link
            href={`/admin/projects/${projectId}/analyze-drawings`}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-4"
          >
            Greina teikningar
          </Link>
        </div>
      ) : (
        <BuildingViewClient
          floors={buildingView.floors}
          buildingNames={Object.fromEntries(buildingNames)}
        />
      )}
    </div>
  )
}
