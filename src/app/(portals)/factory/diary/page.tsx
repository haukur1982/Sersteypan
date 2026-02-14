import { getDiaryEntriesPaginated } from '@/lib/diary/actions'
import { parsePaginationParams } from '@/lib/utils/pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import { Plus, BookOpen, Calendar, ArrowLeft, Pencil, Search, X } from 'lucide-react'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DiaryPage({ searchParams }: PageProps) {
    const params = await searchParams
    const urlSearchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') urlSearchParams.set(key, value)
    })

    const pagination = parsePaginationParams(urlSearchParams, { limit: 20 })
    const search = typeof params.search === 'string' ? params.search : undefined

    const { data: entries, pagination: paginationMeta, error } = await getDiaryEntriesPaginated(
        pagination,
        { search }
    )

    const activeSearchParams: Record<string, string> = {}
    if (search) activeSearchParams.search = search

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/factory">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Dagbók
                        </h1>
                        <p className="text-zinc-600 mt-1">
                            {paginationMeta.total} færslur samtals
                        </p>
                    </div>
                </div>
                <Button asChild className="gap-2">
                    <Link href="/factory/diary/new">
                        <Plus className="w-4 h-4" />
                        Ný færsla
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <Card className="p-4 border-zinc-200">
                <form className="flex gap-2" action="/factory/diary" method="GET">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                            type="text"
                            name="search"
                            defaultValue={search || ''}
                            placeholder="Leita í dagbók..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        />
                    </div>
                    <Button type="submit" size="sm">Leita</Button>
                    {search && (
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/factory/diary">
                                <X className="w-4 h-4" />
                            </Link>
                        </Button>
                    )}
                </form>
            </Card>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">Villa:</p>
                    <p className="text-xs text-red-600 mt-1 font-mono">{error}</p>
                </div>
            )}

            {/* Entries List */}
            {entries.length > 0 ? (
                <div className="space-y-4">
                    {entries.map((entry) => (
                        <Card key={entry.id} className="border-zinc-200 hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Date and Title */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="secondary" className="gap-1 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(entry.entry_date).toLocaleDateString('is-IS', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Badge>
                                            {entry.projects && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {entry.projects.name}
                                                </Badge>
                                            )}
                                        </div>

                                        {entry.title && (
                                            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                                                {entry.title}
                                            </h3>
                                        )}

                                        {/* Content preview */}
                                        <p className="text-zinc-700 whitespace-pre-wrap line-clamp-3">
                                            {entry.content}
                                        </p>

                                        {/* Author and timestamp */}
                                        <div className="flex items-center gap-3 mt-3 text-sm text-zinc-500">
                                            <span>{entry.profiles?.full_name}</span>
                                            <span>&middot;</span>
                                            <span>
                                                {entry.created_at ? new Date(entry.created_at).toLocaleString('is-IS') : '-'}
                                            </span>
                                            {entry.updated_at && entry.updated_at !== entry.created_at && (
                                                <>
                                                    <span>&middot;</span>
                                                    <span className="text-xs">
                                                        Uppfært: {new Date(entry.updated_at).toLocaleDateString('is-IS')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit button */}
                                    <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
                                        <Link href={`/factory/diary/${entry.id}/edit`}>
                                            <Pencil className="w-4 h-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !error && (
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="text-center py-12">
                            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                            <p className="text-zinc-600 font-medium">
                                {search ? 'Engar færslur fundust' : 'Engar dagbókarfærslur'}
                            </p>
                            <p className="text-sm text-zinc-500 mt-1">
                                {search
                                    ? 'Reyndu aðra leit'
                                    : 'Byrjaðu að skrá daglegar athugasemdir frá framleiðslu'}
                            </p>
                            {!search && (
                                <Button asChild className="mt-4 gap-2">
                                    <Link href="/factory/diary/new">
                                        <Plus className="w-4 h-4" />
                                        Ný færsla
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {paginationMeta.totalPages > 1 && (
                <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    baseUrl="/factory/diary"
                    searchParams={activeSearchParams}
                    className="mt-4"
                />
            )}
        </div>
    )
}
