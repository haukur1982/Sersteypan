import { getServerUser } from '@/lib/auth/getServerUser'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUnifiedFloorPlans } from '@/lib/floor-plans/queries'
import { GeometryFloorPlanViewer } from '@/components/floor-plans/GeometryFloorPlanViewer'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
    params: Promise<{ projectId: string }>
}

export default async function FloorPlansPage({ params }: Props) {
    const { projectId } = await params
    const user = await getServerUser()
    const supabase = await createClient()

    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single()

    if (projectError || !project) {
        return notFound()
    }

    // Unified query: merges image-based floor plans + AI-extracted geometries + positioned elements
    const unifiedFloorPlans = await getUnifiedFloorPlans(projectId)

    const isAdmin = user?.role === 'admin'
    const backUrl = isAdmin ? `/admin/projects/${projectId}` : `/buyer/projects/${projectId}`

    return (
        <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={backUrl}
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Til baka
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Hæðarteikningar</h1>
                            <p className="text-muted-foreground">{project.name}</p>
                        </div>
                    </div>

                    {isAdmin && (
                        <Button asChild>
                            <Link href={`/admin/projects/${projectId}/floor-plans/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                Bæta við teikningu
                            </Link>
                        </Button>
                    )}
                </div>

                {unifiedFloorPlans.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-muted-foreground mb-4">Engar hæðarteikningar hafa verið hlaðið upp</p>
                        <p className="text-sm text-muted-foreground/70 mb-4">
                            Greindu teikningar til að sjá sjálfvirkar hæðarmyndir, eða hlaðið upp mynd handvirkt
                        </p>
                        {isAdmin && (
                            <Button asChild variant="outline">
                                <Link href={`/admin/projects/${projectId}/floor-plans/new`}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Hlaða upp fyrstu teikningu
                                </Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <GeometryFloorPlanViewer floorPlans={unifiedFloorPlans} />
                )}
            </div>
    )
}
