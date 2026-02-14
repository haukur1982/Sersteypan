import { getScheduleElements } from '@/lib/factory/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    ArrowLeft,
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    AlertTriangle,
} from 'lucide-react'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800', chartColor: '#94a3b8' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800', chartColor: '#eab308' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800', chartColor: '#f97316' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800', chartColor: '#f59e0b' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800', chartColor: '#22c55e' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800', chartColor: '#3b82f6' },
}

type StatusKey = keyof typeof statusConfig

const statusOrder: StatusKey[] = ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded']

export default async function SchedulePage() {
    const elements = await getScheduleElements()

    // Group elements by project
    const projectGroups: Record<string, {
        projectId: string
        projectName: string
        companyName: string
        elements: typeof elements
    }> = {}

    for (const el of elements) {
        const pid = el.project_id
        if (!projectGroups[pid]) {
            const proj = el.projects as { id: string; name: string; companies: { name: string } | null } | null
            projectGroups[pid] = {
                projectId: pid,
                projectName: proj?.name || 'Óþekkt verkefni',
                companyName: proj?.companies?.name || '',
                elements: [],
            }
        }
        projectGroups[pid].elements.push(el)
    }

    const projects = Object.values(projectGroups).sort((a, b) => {
        // Sort by number of priority elements descending, then by name
        const aPriority = a.elements.filter(e => (e.priority ?? 0) > 0).length
        const bPriority = b.elements.filter(e => (e.priority ?? 0) > 0).length
        if (bPriority !== aPriority) return bPriority - aPriority
        return a.projectName.localeCompare(b.projectName)
    })

    // Summary stats
    const totalElements = elements.length
    const statusCounts: Record<string, number> = {}
    for (const el of elements) {
        const s = el.status || 'planned'
        statusCounts[s] = (statusCounts[s] || 0) + 1
    }
    const now = new Date()
    const overdueCount = elements.filter(e => {
        // Elements in planned/rebar/cast that have been there > 14 days
        if (!['planned', 'rebar', 'cast'].includes(e.status || '')) return false
        const age = (now.getTime() - new Date(e.created_at || '').getTime()) / (1000 * 60 * 60 * 24)
        return age > 14
    }).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/factory">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Framleiðsluáætlun (Schedule)
                        </h1>
                    </div>
                    <p className="ml-12 text-sm text-zinc-600">
                        {totalElements} einingar í framleiðslu á {projects.length} verkefnum
                    </p>
                </div>
            </div>

            {/* Status summary bar */}
            <Card className="border-zinc-200">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        {statusOrder.map((status) => {
                            const config = statusConfig[status]
                            const count = statusCounts[status] || 0
                            const Icon = config.icon
                            return (
                                <div key={status} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: config.chartColor }}
                                    />
                                    <Icon className="w-4 h-4 text-zinc-500" />
                                    <span className="text-sm text-zinc-700">{config.label}</span>
                                    <span className="text-sm font-semibold text-zinc-900 tabular-nums">{count}</span>
                                </div>
                            )
                        })}
                        {overdueCount > 0 && (
                            <div className="flex items-center gap-2 ml-auto">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium text-red-700">
                                    {overdueCount} seinar (overdue)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Visual pipeline bar */}
                    {totalElements > 0 && (
                        <div className="flex h-4 rounded-full overflow-hidden mt-4">
                            {statusOrder.map((status) => {
                                const count = statusCounts[status] || 0
                                if (count === 0) return null
                                const pct = (count / totalElements) * 100
                                return (
                                    <div
                                        key={status}
                                        className="h-full transition-all"
                                        style={{
                                            width: `${pct}%`,
                                            backgroundColor: statusConfig[status].chartColor,
                                        }}
                                        title={`${statusConfig[status].label}: ${count}`}
                                    />
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Projects with element pipeline */}
            {projects.map((project) => {
                const projectStatusCounts: Record<string, number> = {}
                for (const el of project.elements) {
                    const s = (el.status || 'planned') as string
                    projectStatusCounts[s] = (projectStatusCounts[s] || 0) + 1
                }
                const hasPriority = project.elements.some(e => (e.priority ?? 0) > 0)

                return (
                    <Card key={project.projectId} className={`border-zinc-200 ${hasPriority ? 'ring-1 ring-orange-200' : ''}`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Link
                                            href={`/factory/projects/${project.projectId}`}
                                            className="hover:text-blue-700 transition-colors"
                                        >
                                            {project.projectName}
                                        </Link>
                                        {hasPriority && (
                                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                                Forgangur
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    {project.companyName && (
                                        <p className="text-sm text-zinc-500 mt-0.5">{project.companyName}</p>
                                    )}
                                </div>
                                <span className="text-sm text-zinc-500 tabular-nums">
                                    {project.elements.length} einingar
                                </span>
                            </div>

                            {/* Mini pipeline bar per project */}
                            <div className="flex h-2.5 rounded-full overflow-hidden mt-2">
                                {statusOrder.map((status) => {
                                    const count = projectStatusCounts[status] || 0
                                    if (count === 0) return null
                                    const pct = (count / project.elements.length) * 100
                                    return (
                                        <div
                                            key={status}
                                            className="h-full"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: statusConfig[status].chartColor,
                                            }}
                                            title={`${statusConfig[status].label}: ${count}`}
                                        />
                                    )
                                })}
                            </div>
                        </CardHeader>

                        <CardContent>
                            {/* Element grid grouped by status */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                {statusOrder.map((status) => {
                                    const config = statusConfig[status]
                                    const Icon = config.icon
                                    const statusElements = project.elements.filter(e => (e.status || 'planned') === status)
                                    if (statusElements.length === 0) return (
                                        <div key={status} className="rounded-lg border border-dashed border-zinc-200 p-3 opacity-40">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">{config.label}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400">0</p>
                                        </div>
                                    )

                                    return (
                                        <div key={status} className={`rounded-lg border p-3 ${config.color} border-current/10`}>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">{config.label}</span>
                                                <span className="ml-auto text-xs font-bold tabular-nums">{statusElements.length}</span>
                                            </div>
                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                {statusElements.map((el) => (
                                                    <Link
                                                        key={el.id}
                                                        href={`/factory/production/${el.id}`}
                                                        className="block text-xs truncate hover:underline"
                                                        title={el.name}
                                                    >
                                                        {(el.priority ?? 0) > 0 && (
                                                            <span className="font-bold text-orange-700 mr-1">#{el.priority}</span>
                                                        )}
                                                        {el.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}

            {projects.length === 0 && (
                <Card className="border-zinc-200">
                    <CardContent className="py-16 text-center text-zinc-500">
                        Engar einingar í framleiðslu
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
