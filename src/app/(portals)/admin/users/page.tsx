import { getUsersPaginated } from '@/lib/admin/queries'
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
import { FeatureToggler } from './FeatureToggler'

const roleConfig: Record<string, { color: string; label: string }> = {
    admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
    factory_manager: { color: 'bg-blue-100 text-blue-800', label: 'Verkstjóri' },
    buyer: { color: 'bg-green-100 text-green-800', label: 'Kaupandi' },
    driver: { color: 'bg-purple-100 text-purple-800', label: 'Bílstjóri' },
}

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function UsersPage({ searchParams }: PageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') urlSearchParams.set(key, value)
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 20 })
    const roleFilter = typeof params.role === 'string' ? params.role : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    const validRole = roleFilter && Object.keys(roleConfig).includes(roleFilter)
        ? roleFilter
        : undefined

    const { data: users, pagination: paginationMeta, error } = await getUsersPaginated(
        pagination,
        { role: validRole, search }
    )

    // Build searchParams for pagination links
    const activeSearchParams: Record<string, string> = {}
    if (validRole) activeSearchParams.role = validRole
    if (search) activeSearchParams.search = search

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Notendur</h1>
                    <p className="text-zinc-600 mt-2">
                        {paginationMeta.total} notendur samtals
                    </p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/admin/users/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nýr notandi
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4 border-zinc-200">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <form className="flex-1 flex gap-2" action="/admin/users" method="GET">
                        {validRole && <input type="hidden" name="role" value={validRole} />}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                name="search"
                                defaultValue={search || ''}
                                placeholder="Leita eftir nafni eða netfangi..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button type="submit" size="sm">Leita</Button>
                    </form>

                    {/* Role filter */}
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            variant={!validRole ? 'default' : 'outline'}
                            size="sm"
                            asChild
                        >
                            <Link href={search ? `/admin/users?search=${encodeURIComponent(search)}` : '/admin/users'}>
                                Allir
                            </Link>
                        </Button>
                        {Object.entries(roleConfig).map(([role, config]) => (
                            <Button
                                key={role}
                                variant={validRole === role ? 'default' : 'outline'}
                                size="sm"
                                asChild
                            >
                                <Link href={`/admin/users?role=${role}${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
                                    {config.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Active filters summary */}
                {(validRole || search) && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-zinc-500">
                        <span>Sía:</span>
                        {validRole && (
                            <Badge variant="secondary" className={roleConfig[validRole].color}>
                                {roleConfig[validRole].label}
                            </Badge>
                        )}
                        {search && (
                            <Badge variant="secondary">&ldquo;{search}&rdquo;</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                            <Link href="/admin/users">
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
                    Villa við að sækja notendur: {error}
                </div>
            )}

            {/* Table */}
            <Card className="border-zinc-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Nafn
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Netfang
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Hlutverk
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Fyrirtæki
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Aðgerðir
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Staða
                            </TableHead>
                            <TableHead className="w-[100px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Breyta
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? (
                            users.map((user) => {
                                const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.admin

                                return (
                                    <TableRow key={user.id} className="hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                                        <TableCell className="font-medium py-4 text-zinc-900">
                                            {user.full_name}
                                        </TableCell>
                                        <TableCell className="py-4 text-zinc-600">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="secondary" className={`${roleInfo.color} font-medium border-0`}>
                                                {roleInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-zinc-600">
                                            {user.companies?.name || '-'}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <FeatureToggler
                                                userId={user.id}
                                                featureKey="visual_pilot"
                                                initialValue={(user.preferences as Record<string, unknown>)?.visual_pilot === true}
                                                label="Visual Pilot"
                                            />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {user.is_active ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-0">
                                                    Virkur
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-0">
                                                    Óvirkur
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right py-4">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                <Link href={`/admin/users/${user.id}/edit`} title="Breyta">
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                                    {search || validRole
                                        ? 'Engir notendur fundust með þessum síum.'
                                        : 'Engir notendur fundust.'}
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
                    baseUrl="/admin/users"
                    searchParams={activeSearchParams}
                    className="mt-4"
                />
            )}
        </div>
    )
}
