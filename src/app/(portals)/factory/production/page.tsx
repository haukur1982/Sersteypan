import { getProductionQueuePaginated } from '@/lib/factory/actions'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    Pencil,
    ArrowLeft
} from 'lucide-react'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' }
}

const typeConfig = {
    wall: { label: 'Veggur' },
    filigran: { label: 'Filigran' },
    staircase: { label: 'Stigi' },
    balcony: { label: 'Svalir' },
    ceiling: { label: 'Þak' },
    column: { label: 'Súla' },
    beam: { label: 'Bita' },
    other: { label: 'Annað' }
}

interface ProductionQueuePageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductionQueuePage({ searchParams }: ProductionQueuePageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') {
            urlSearchParams.set(key, value)
        }
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 25 })
    const statusFilter = typeof params.status === 'string' ? params.status : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    // Validate status filter
    const validStatus = statusFilter && Object.keys(statusConfig).includes(statusFilter)
        ? statusFilter
        : undefined

    const { data: elements, pagination: paginationMeta, error } = await getProductionQueuePaginated(
        pagination,
        { status: validStatus, search }
    )

    return (
        <div className="space-y-6">
            {/* Header with back button */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/factory">
                                    <ArrowLeft className="w-4 h-4" />
                                </Link>
                            </Button>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                                {validStatus ? 'Sía einingar' : 'Vinnuröð'} (Production Queue)
                            </h1>
                        </div>
                        <div className="ml-12 flex items-center gap-2">
                            {validStatus && (
                                <Badge variant="secondary" className={statusConfig[validStatus as keyof typeof statusConfig]?.color}>
                                    {statusConfig[validStatus as keyof typeof statusConfig]?.label}
                                </Badge>
                            )}
                            {paginationMeta.total > 0 && (
                                <span className="text-sm text-zinc-600">
                                    — {paginationMeta.total} einingar samtals
                                </span>
                            )}
                        </div>
                    </div>
                    {validStatus && (
                        <Button variant="outline" asChild>
                            <Link href="/factory/production">
                                Sjá allt
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Status filter buttons */}
                {!validStatus && (
                    <Card className="p-4 border-zinc-200">
                        <p className="text-sm font-medium text-zinc-700 mb-3">Sía eftir stöðu:</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(statusConfig).map(([status, config]) => {
                                const Icon = config.icon
                                return (
                                    <Button
                                        key={status}
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="gap-2"
                                    >
                                        <Link href={`/factory/production?status=${status}`}>
                                            <Icon className="w-4 h-4" />
                                            {config.label}
                                        </Link>
                                    </Button>
                                )
                            })}
                        </div>
                    </Card>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">Villa við að sækja einingar:</p>
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                )}

                {/* Elements Table */}
                <Card className="border-zinc-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-50">
                            <TableRow>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Forgangur
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Nafn (Name)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Verkefni (Project)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Tegund (Type)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Staða (Status)
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                                    Hæð
                                </TableHead>
                                <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                                    Aðgerðir
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {elements.length > 0 ? (
                                elements.map((element) => {
                                    const statusInfo = statusConfig[element.status as keyof typeof statusConfig] || statusConfig.planned
                                    const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other
                                    const StatusIcon = statusInfo.icon

                                    return (
                                        <TableRow key={element.id} className="hover:bg-zinc-50">
                                            <TableCell className="py-4">
                                                {(element.priority ?? 0) > 0 ? (
                                                    <span className="font-bold text-orange-600">
                                                        {element.priority}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">0</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-zinc-900 py-4">
                                                {element.name}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-900">
                                                        {element.projects?.name}
                                                    </p>
                                                    <p className="text-xs text-zinc-600">
                                                        {element.projects?.companies?.name}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="secondary" className="text-xs font-normal">
                                                    {typeInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="secondary" className={`${statusInfo.color} gap-1 border-0 font-medium`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-zinc-600">
                                                {element.floor || '-'}
                                            </TableCell>
                                            <TableCell className="py-4 text-right">
                                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                    <Link href={`/factory/production/${element.id}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                                        {validStatus
                                            ? `Engar einingar með stöðu "${statusConfig[validStatus as keyof typeof statusConfig]?.label}"`
                                            : 'Engar einingar fundust'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Pagination */}
                {paginationMeta.totalPages > 1 && (
                    <Pagination
                        currentPage={paginationMeta.page}
                        totalPages={paginationMeta.totalPages}
                        baseUrl="/factory/production"
                        searchParams={validStatus ? { status: validStatus } : undefined}
                        className="mt-4"
                    />
                )}
            </div>
    )
}
