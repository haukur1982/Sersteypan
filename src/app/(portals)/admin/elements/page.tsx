import { getAdminElementsPaginated } from '@/lib/admin/queries'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Search, X } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string }> = {
    planned: { label: 'Skipulögð', color: 'bg-zinc-100 text-zinc-700' },
    rebar: { label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-700' },
    loaded: { label: 'Á bíl', color: 'bg-blue-100 text-blue-700' },
    delivered: { label: 'Afhent', color: 'bg-emerald-100 text-emerald-700' },
}

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ElementsPage({ searchParams }: PageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') urlSearchParams.set(key, value)
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 30 })
    const statusFilter = typeof params.status === 'string' ? params.status : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    const validStatus = statusFilter && Object.keys(statusConfig).includes(statusFilter)
        ? statusFilter
        : undefined

    const { data: elements, pagination: paginationMeta } = await getAdminElementsPaginated(
        pagination,
        { status: validStatus, search }
    )

    // Build searchParams for pagination links
    const activeSearchParams: Record<string, string> = {}
    if (validStatus) activeSearchParams.status = validStatus
    if (search) activeSearchParams.search = search

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Einingar</h1>
                    <p className="text-muted-foreground">
                        {paginationMeta.total} einingar samtals
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 border-border">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <form className="flex-1 flex gap-2" action="/admin/elements" method="GET">
                        {validStatus && <input type="hidden" name="status" value={validStatus} />}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                name="search"
                                defaultValue={search || ''}
                                placeholder="Leita eftir nafni..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <Button type="submit" size="sm">Leita</Button>
                    </form>

                    {/* Status filter */}
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            variant={!validStatus ? 'default' : 'outline'}
                            size="sm"
                            asChild
                        >
                            <Link href={search ? `/admin/elements?search=${encodeURIComponent(search)}` : '/admin/elements'}>
                                Allt
                            </Link>
                        </Button>
                        {Object.entries(statusConfig).map(([status, config]) => (
                            <Button
                                key={status}
                                variant={validStatus === status ? 'default' : 'outline'}
                                size="sm"
                                asChild
                            >
                                <Link href={`/admin/elements?status=${status}${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                                    {config.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Active filters summary */}
                {(validStatus || search) && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <span>Sía:</span>
                        {validStatus && (
                            <Badge variant="secondary" className={statusConfig[validStatus].color}>
                                {statusConfig[validStatus].label}
                            </Badge>
                        )}
                        {search && (
                            <Badge variant="secondary">&ldquo;{search}&rdquo;</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                            <Link href="/admin/elements">
                                <X className="w-3 h-3 mr-1" />
                                Hreinsa
                            </Link>
                        </Button>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Heiti</TableHead>
                            <TableHead>Verkefni</TableHead>
                            <TableHead>Tegund</TableHead>
                            <TableHead>Staða</TableHead>
                            <TableHead className="text-right">Stærð</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {elements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    {search || validStatus
                                        ? 'Engar einingar fundust með þessum síum.'
                                        : 'Engar einingar fundust.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            elements.map((element) => {
                                const status = statusConfig[element.status || 'planned'] || statusConfig.planned
                                return (
                                    <TableRow key={element.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            <Link href={`/admin/projects/${element.project_id}`} className="hover:underline text-primary">
                                                {element.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{element.project?.name}</span>
                                                <span className="text-xs text-muted-foreground">{element.project?.company?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{element.element_type}</TableCell>
                                        <TableCell>
                                            <Badge className={status.color}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {element.width_mm}x{element.height_mm}x{element.length_mm}mm
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {paginationMeta.totalPages > 1 && (
                <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    baseUrl="/admin/elements"
                    searchParams={activeSearchParams}
                    className="mt-4"
                />
            )}
        </div>
    )
}
