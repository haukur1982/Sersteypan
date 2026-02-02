import { getDiaryEntries } from '@/lib/diary/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, BookOpen, Calendar, ArrowLeft, Pencil } from 'lucide-react'
import type { Database } from '@/types/database'

type DiaryEntryRow = Database['public']['Tables']['diary_entries']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type DiaryEntryWithRelations = DiaryEntryRow & {
    profiles?: Pick<ProfileRow, 'full_name'> | null
    projects?: Pick<ProjectRow, 'name'> | null
}

export default async function DiaryPage() {
    const { data: entries, error } = await getDiaryEntries(100)
    const entryList = (entries ?? []) as DiaryEntryWithRelations[]

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
                                Dagbók (Diary)
                            </h1>
                            <p className="text-zinc-600 mt-1">
                                Dagsettar athugasemdir frá framleiðslu
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

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800 font-medium">⚠️ Villa við að sækja dagbók:</p>
                        <p className="text-xs text-red-600 mt-1 font-mono">{error}</p>
                    </div>
                )}

                {/* Entries List */}
                {entryList.length > 0 ? (
                    <div className="space-y-4">
                        {entryList.map((entry) => (
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
                                                <span>•</span>
                                                <span>
                                                    {entry.created_at ? new Date(entry.created_at).toLocaleString('is-IS') : 'Óþekkt'}
                                                </span>
                                                {entry.updated_at && entry.updated_at !== entry.created_at && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-xs">
                                                            Uppfært: {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('is-IS') : 'Óþekkt'}
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
                                <p className="text-zinc-600 font-medium">Engar dagbókarfærslur fundust</p>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Byrjaðu að skrá daglegar athugasemdir frá framleiðslu
                                </p>
                                <Button asChild className="mt-4 gap-2">
                                    <Link href="/factory/diary/new">
                                        <Plus className="w-4 h-4" />
                                        Ný færsla
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
        </div>
    )
}
