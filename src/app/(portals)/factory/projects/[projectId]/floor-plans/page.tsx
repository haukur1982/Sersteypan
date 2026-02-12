import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProject } from '@/lib/projects/actions'
import { getFloorPlansForProject } from '@/lib/floor-plans/actions'
import { getServerUser } from '@/lib/auth/getServerUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

const statusColors: Record<string, string> = {
    planned: 'bg-zinc-400',
    rebar: 'bg-yellow-500',
    cast: 'bg-orange-500',
    curing: 'bg-amber-500',
    ready: 'bg-green-500',
    loaded: 'bg-blue-500',
    delivered: 'bg-purple-500',
}

interface FloorPlansPageProps {
    params: Promise<{
        projectId: string
    }>
}

export default async function FactoryFloorPlansPage({ params }: FloorPlansPageProps) {
    const { projectId } = await params
    await getServerUser()

    const [projectResult, floorPlans] = await Promise.all([
        getProject(projectId),
        getFloorPlansForProject(projectId),
    ])

    if (projectResult.error || !projectResult.data) {
        return notFound()
    }

    const project = projectResult.data

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
            {floorPlans && floorPlans.length > 0 ? (
                <div className="space-y-8">
                    {floorPlans.map((plan) => (
                        <Card key={plan.id} className="border-border overflow-hidden">
                            <CardContent className="pt-6">
                                <h2 className="text-lg font-semibold text-foreground mb-4">
                                    {plan.name || `Hæð ${plan.floor}`}
                                </h2>

                                {plan.plan_image_url ? (
                                    <div className="relative w-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={plan.plan_image_url}
                                            alt={plan.name || `Hæð ${plan.floor}`}
                                            className="w-full h-auto rounded-md border border-border"
                                        />

                                        {/* Element positions overlay */}
                                        {plan.element_positions && plan.element_positions.length > 0 && (
                                            <div className="absolute inset-0">
                                                {plan.element_positions.map((pos) => (
                                                    <div
                                                        key={pos.id}
                                                        className="absolute group"
                                                        style={{
                                                            left: `${pos.x_percent}%`,
                                                            top: `${pos.y_percent}%`,
                                                            transform: `translate(-50%, -50%) rotate(${pos.rotation_degrees || 0}deg)`,
                                                        }}
                                                    >
                                                        <div
                                                            className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${
                                                                statusColors[pos.elements?.status || ''] || 'bg-zinc-400'
                                                            }`}
                                                        />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                                            <div className="bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                                                {pos.elements?.name || 'Eining'}
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="ml-1 text-[10px] px-1 py-0"
                                                                >
                                                                    {pos.elements?.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-48 bg-muted/50 rounded-md border border-border">
                                        <p className="text-muted-foreground text-sm">Engin teikning hlaðið upp</p>
                                    </div>
                                )}

                                {/* Element count for this floor plan */}
                                {plan.element_positions && plan.element_positions.length > 0 && (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {plan.element_positions.length} einingar á teikningu
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <p className="text-muted-foreground">Engar hæðarteikningar hafa verið hlaðnar upp fyrir þetta verkefni.</p>
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
