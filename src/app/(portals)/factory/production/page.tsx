import { getProductionQueuePaginated } from '@/lib/factory/actions'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { ProductionQueueTable } from '@/components/factory/ProductionQueueTable'
import Link from 'next/link'
import {
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    ArrowLeft,
} from 'lucide-react'
import { ProductionSearch } from './ProductionSearch'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' }
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

    const validStatus = statusFilter && Object.keys(statusConfig).includes(statusFilter)
        ? statusFilter
        : undefined

    const { data: elements, pagination: paginationMeta, error } = await getProductionQueuePaginated(
        pagination,
        { status: validStatus, search }
    )

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        {/* @ts-ignore */}
                        <Link href="/factory">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
                            {validStatus ? 'Sía einingar' : 'Vinnuröð'}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {validStatus && (
                                <Badge variant="secondary" className={statusConfig[validStatus as keyof typeof statusConfig]?.color}>
                                    {statusConfig[validStatus as keyof typeof statusConfig]?.label}
                                </Badge>
                            )}
                            {paginationMeta.total > 0 && (
                                <span className="text-sm text-zinc-600">
                                    {paginationMeta.total} einingar
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <ProductionSearch initialSearch={search || ''} />
                        <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                            <Link href="/factory/batches">
                                <Layers className="w-4 h-4 mr-2" />
                                Steypulotur
                            </Link>
                        </Button>
                        {validStatus && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/factory/production">
                                    Sjá allt
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {!validStatus && (
                <Card className="p-3 md:p-4 border-zinc-200">
                    <p className="text-sm font-medium text-zinc-700 mb-2 md:mb-3">Sía eftir stöðu:</p>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(statusConfig).map(([status, config]) => {
                            const Icon = config.icon
                            return (
                                <Button
                                    key={status}
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="gap-1.5 min-h-[40px] md:min-h-0"
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

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">Villa við að sækja einingar:</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
            )}

            <Card className="border-zinc-200 shadow-sm overflow-hidden">
                <ProductionQueueTable elements={elements} />
            </Card>

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
