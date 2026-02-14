import { getCompaniesPaginated } from '@/lib/admin/queries'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Pagination } from '@/components/ui/pagination'
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
import { Plus, Pencil, Search, X } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CompaniesPage({ searchParams }: PageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') urlSearchParams.set(key, value)
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 20 })
    const search = typeof params.search === 'string' ? params.search : undefined

    const { data: companies, pagination: paginationMeta, error } = await getCompaniesPaginated(
        pagination,
        { search }
    )

    // Build searchParams for pagination links
    const activeSearchParams: Record<string, string> = {}
    if (search) activeSearchParams.search = search

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Fyrirtæki</h1>
                    <p className="text-muted-foreground mt-2">
                        {paginationMeta.total} fyrirtæki samtals
                    </p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/admin/companies/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nýtt fyrirtæki
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <Card className="p-4 border-border">
                <form className="flex gap-2" action="/admin/companies" method="GET">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            name="search"
                            defaultValue={search || ''}
                            placeholder="Leita eftir nafni, kennitölu eða tengilið..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                    <Button type="submit" size="sm">Leita</Button>
                </form>

                {search && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <span>Sía:</span>
                        <Badge variant="secondary">&ldquo;{search}&rdquo;</Badge>
                        <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                            <Link href="/admin/companies">
                                <X className="w-3 h-3 mr-1" />
                                Hreinsa
                            </Link>
                        </Button>
                    </div>
                )}
            </Card>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    Villa við að sækja fyrirtæki: {error}
                </div>
            )}

            {/* Table */}
            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[250px] font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Nafn
                            </TableHead>
                            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Kennitala
                            </TableHead>
                            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Tengiliður
                            </TableHead>
                            <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Netfang
                            </TableHead>
                            <TableHead className="w-[100px] font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Staða
                            </TableHead>
                            <TableHead className="w-[100px] text-right font-medium text-xs text-muted-foreground uppercase tracking-wider py-4">
                                Aðgerðir
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companies.length > 0 ? (
                            companies.map((company) => (
                                <TableRow key={company.id} className="hover:bg-muted/50 border-b border-border last:border-0">
                                    <TableCell className="font-medium py-4 text-foreground">
                                        {company.name}
                                    </TableCell>
                                    <TableCell className="py-4 text-muted-foreground font-mono text-sm">
                                        {company.kennitala || '-'}
                                    </TableCell>
                                    <TableCell className="py-4 text-muted-foreground">
                                        {company.contact_name}
                                    </TableCell>
                                    <TableCell className="py-4 text-muted-foreground">
                                        {company.contact_email}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge
                                            variant="secondary"
                                            className={company.is_active
                                                ? "bg-green-100 text-green-800 hover:bg-green-100 font-medium"
                                                : "bg-muted text-muted-foreground hover:bg-muted font-medium"}
                                        >
                                            {company.is_active ? 'Virkt' : 'Óvirkt'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="contact-actions text-right py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-blue-600">
                                                <Link href={`/admin/companies/${company.id}/edit`} title="Breyta">
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    {search
                                        ? 'Engin fyrirtæki fundust með þessum síum.'
                                        : 'Engin fyrirtæki fundust.'}
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
                    baseUrl="/admin/companies"
                    searchParams={activeSearchParams}
                    className="mt-4"
                />
            )}
        </div>
    )
}
