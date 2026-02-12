import Link from 'next/link'
import { getProjects } from '@/lib/projects/actions'
import { getElementCountsByProject } from '@/lib/factory/queries'
import { getServerUser } from '@/lib/auth/getServerUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Building, MapPin } from 'lucide-react'

const statusConfig: Record<string, { color: string; label: string }> = {
    planning: { color: 'bg-blue-100 text-blue-800', label: 'Skipulagt' },
    active: { color: 'bg-green-100 text-green-800', label: 'Virkt' },
    completed: { color: 'bg-zinc-100 text-zinc-600', label: 'Lokið' },
    on_hold: { color: 'bg-yellow-100 text-yellow-800', label: 'Í bið' }
}

const elementStatusConfig: Record<string, { color: string; label: string }> = {
    planned: { color: 'bg-zinc-100 text-zinc-600', label: 'Skipul.' },
    rebar: { color: 'bg-yellow-100 text-yellow-800', label: 'Járnab.' },
    cast: { color: 'bg-orange-100 text-orange-800', label: 'Steypt' },
    curing: { color: 'bg-amber-100 text-amber-800', label: 'Þornar' },
    ready: { color: 'bg-green-100 text-green-800', label: 'Tilb.' },
    loaded: { color: 'bg-blue-100 text-blue-800', label: 'Á bíl' },
    delivered: { color: 'bg-purple-100 text-purple-800', label: 'Afhent' },
}

export const metadata = {
    title: 'Verkefni | Framleiðslustjóri',
    description: 'Yfirlit yfir verkefni'
}

export default async function FactoryProjectsPage() {
    await getServerUser()

    const [{ data: projects, error }, elementCounts] = await Promise.all([
        getProjects(),
        getElementCountsByProject(),
    ])
    const projectList = projects ?? []

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Verkefni</h1>
                <p className="text-muted-foreground mt-2">
                    Yfirlit yfir öll verkefni — veldu verkefni til að sjá einingar, teikningar og skilaboð
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    Villa við að sækja verkefni: {error}
                </div>
            )}

            {projectList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectList.map((project) => {
                        const statusInfo = statusConfig[project.status as string] || statusConfig.planning
                        const counts = elementCounts[project.id] || {}
                        const totalElements = Object.values(counts).reduce((sum, c) => sum + c, 0)

                        return (
                            <Link key={project.id} href={`/factory/projects/${project.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border h-full">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-foreground text-lg leading-tight">
                                                {project.name}
                                            </h3>
                                            <Badge variant="secondary" className={`${statusInfo.color} border-0 font-medium ml-2 flex-shrink-0`}>
                                                {statusInfo.label}
                                            </Badge>
                                        </div>

                                        {project.companies?.name && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                <Building className="h-4 w-4 flex-shrink-0" />
                                                <span>{project.companies.name}</span>
                                            </div>
                                        )}

                                        {project.address && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                                <span className="truncate">{project.address}</span>
                                            </div>
                                        )}

                                        {/* Element status breakdown */}
                                        {totalElements > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {Object.entries(elementStatusConfig).map(([status, config]) => {
                                                    const count = counts[status]
                                                    if (!count) return null
                                                    return (
                                                        <Badge key={status} variant="secondary" className={`${config.color} border-0 text-[11px] px-1.5 py-0`}>
                                                            {count} {config.label}
                                                        </Badge>
                                                    )
                                                })}
                                                <span className="text-xs text-muted-foreground self-center ml-1">
                                                    ({totalElements} samtals)
                                                </span>
                                            </div>
                                        )}

                                        {project.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                {project.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-end pt-2 border-t border-border">
                                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" asChild>
                                                <span>
                                                    <Eye className="mr-1 h-4 w-4" />
                                                    Skoða verkefni
                                                </span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <p className="text-muted-foreground">Engin verkefni fundust.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
