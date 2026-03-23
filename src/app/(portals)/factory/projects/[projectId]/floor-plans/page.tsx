import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getUnifiedFloorPlans } from '@/lib/floor-plans/queries'
import { getServerUser } from '@/lib/auth/getServerUser'
import { GeometryFloorPlanViewer } from '@/components/floor-plans/GeometryFloorPlanViewer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

interface FloorPlansPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function FactoryFloorPlansPage({ params }: FloorPlansPageProps) {
    const { projectId } = await params
    await getServerUser()

    const projectResult = await getProject(projectId)

    if (projectResult.error || !projectResult.data) {
        return notFound()
    }

    const project = projectResult.data

    // Unified query: merges image-based floor plans + AI-extracted geometries + positioned elements
    const unifiedFloorPlans = await getUnifiedFloorPlans(projectId)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/factory/projects/${projectId}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Hæðarteikningar
                    </h1>
                    <p className="text-muted-foreground mt-1">{project.name} — {project.companies?.name}</p>
                </div>
            </div>

            {/* Floor Plans */}
            {unifiedFloorPlans.length > 0 ? (
                <GeometryFloorPlanViewer floorPlans={unifiedFloorPlans} />
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <p className="text-muted-foreground">Engar hæðarteikningar hafa verið hlaðnar upp eða greinar fyrir þetta verkefni.</p>
                        <Button variant="outline" asChild className="mt-4">
                            <Link href={`/factory/projects/${projectId}`}>
                                Til baka í verkefni
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
