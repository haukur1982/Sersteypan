import { notFound } from 'next/navigation'
import { getServerUser } from '@/lib/auth/getServerUser'
import { createClient } from '@/lib/supabase/server'
import { getBuildingViewData } from '@/lib/building-view/queries'
import { BuildingViewClient } from '@/app/(portals)/admin/projects/[projectId]/building-view/BuildingViewClient'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BuyerBuildingViewPage({ params }: Props) {
  const { id: projectId } = await params
  await getServerUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) return notFound()

  const { data: buildingView } = await getBuildingViewData(projectId)

  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('project_id', projectId)

  const buildingNames = Object.fromEntries(
    buildings?.map(b => [b.id, b.name]) ?? []
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/buyer/projects/${projectId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Byggingaryfirlit</h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
        </div>
      </div>

      {!buildingView || buildingView.floors.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Engar einingar hafa verið staðsettar á byggingarteikningum
          </p>
        </div>
      ) : (
        <BuildingViewClient
          floors={buildingView.floors}
          buildingNames={buildingNames}
        />
      )}
    </div>
  )
}
