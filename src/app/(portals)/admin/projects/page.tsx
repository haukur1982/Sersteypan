import { getProjectsPaginated } from '@/lib/projects/actions'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Plus, Pencil, Eye } from 'lucide-react'
import Link from 'next/link'

const statusConfig = {
    planning: { color: 'bg-blue-100 text-blue-800 hover:bg-blue-100', label: 'Skipulagt' },
    active: { color: 'bg-green-100 text-green-800 hover:bg-green-100', label: 'Virkt' },
    completed: { color: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100', label: 'Lokið' },
    on_hold: { color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', label: 'Í bið' }
}

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('is-IS', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

interface ProjectsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') {
            urlSearchParams.set(key, value)
        }
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 20 })
    const status = typeof params.status === 'string' ? params.status : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    const { data: projects, pagination: paginationMeta, error } = await getProjectsPaginated(
        pagination,
        { status, search }
    )

    return (
        <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Verkefni</h1>
                        <p className="text-zinc-600 mt-2">
                            Yfirlit yfir verkefni (Projects Overview)
                            {paginationMeta.total > 0 && (
                                <span className="ml-2 text-sm">
                                    — {paginationMeta.total} samtals
                                </span>
                            )}
                        </p>
                    </div>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <Link href="/admin/projects/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Nýtt verkefni
                        </Link>
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                        Villa við að sækja verkefni: {error}
                    </div>
                )}

                {/* Table */}
                <Card className="border-zinc-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-50">
                            <TableRow>
                                <TableHead className="w-[250px] font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Nafn (Name)
                                </TableHead>
                                <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Fyrirtæki (Company)
                                </TableHead>
                                <TableHead className="w-[120px] font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Staða (Status)
                                </TableHead>
                                <TableHead className="w-[150px] font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Byrjað (Started)
                                </TableHead>
                                <TableHead className="w-[100px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                    Aðgerðir
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.length > 0 ? (
                                projects.map((project) => {
                                    const statusKey = project.status as keyof typeof statusConfig
                                    const statusInfo = statusConfig[statusKey] || statusConfig.planning

                                    return (
                                        <TableRow key={project.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                                            <TableCell className="font-medium py-4 text-zinc-900">
                                                <Link href={`/admin/projects/${project.id}`} className="hover:text-blue-600 hover:underline">
                                                    {project.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="py-4 text-zinc-600">
                                                {project.companies?.name || '-'}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="secondary" className={`${statusInfo.color} font-medium border-0`}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 text-zinc-600 font-mono text-sm">
                                                {formatDate(project.start_date)}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                        <Link href={`/admin/projects/${project.id}`} title="Skoða (View)">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                        <Link href={`/admin/projects/${project.id}/edit`} title="Breyta (Edit)">
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                                        Engin verkefni fundust.
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
                        baseUrl="/admin/projects"
                        searchParams={status ? { status } : undefined}
                        className="mt-4"
                    />
                )}
        </div>
    )
}
