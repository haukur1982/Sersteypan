import { getServerUser } from '@/lib/auth/getServerUser'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FloorPlanViewer } from './FloorPlanViewer'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
    params: Promise<{ projectId: string }>
}

export default async function FloorPlansPage({ params }: Props) {
    const { projectId } = await params
    // Layout handles auth, we just need user data for display
    const user = await getServerUser()
    const supabase = await createClient()

    // Fetch project
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single()

    if (projectError || !project) {
        return notFound()
    }

    // Fetch floor plans with element positions
    const { data: floorPlans } = await supabase
        .from('floor_plans')
        .select(`
            id,
            name,
            floor,
            plan_image_url,
            element_positions (
                id,
                element_id,
                x_percent,
                y_percent,
                rotation_degrees,
                label
            )
        `)
        .eq('project_id', projectId)
        .order('floor', { ascending: true })

    // Fetch elements for this project (to show status on pins)
    const { data: elements } = await supabase
        .from('elements')
        .select('id, name, status, element_type')
        .eq('project_id', projectId)

    const elementsMap = new Map(elements?.map(e => [e.id, e]) ?? [])

    // Enrich floor plans with element data
    const enrichedFloorPlans = (floorPlans ?? []).map(fp => ({
        ...fp,
        element_positions: (fp.element_positions ?? []).map(pos => ({
            ...pos,
            element: elementsMap.get(pos.element_id) ?? null
        }))
    }))

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

                {enrichedFloorPlans.length === 0 ? (
                    <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-muted-foreground mb-4">Engar hæðarteikningar hafa verið hlaðið upp</p>
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
                    <FloorPlanViewer floorPlans={enrichedFloorPlans} />
                )}
            </div>
    )
}
