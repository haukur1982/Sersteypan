import { getAllDrawings } from '@/lib/documents/actions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    ArrowLeft,
    FileText,
    Search,
    FolderOpen,
} from 'lucide-react'
import { DrawingsClient } from './DrawingsClient'

const categoryConfig: Record<string, { label: string; color: string }> = {
    drawing: { label: 'Teikning', color: 'bg-blue-100 text-blue-800' },
    rebar: { label: 'Armering', color: 'bg-orange-100 text-orange-800' },
    concrete_spec: { label: 'Steypuskýrsla', color: 'bg-green-100 text-green-800' },
    other: { label: 'Annað', color: 'bg-zinc-100 text-zinc-600' },
}

interface DrawingsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FactoryDrawingsPage({ searchParams }: DrawingsPageProps) {
    const params = await searchParams
    const category = typeof params.category === 'string' ? params.category : undefined
    const projectId = typeof params.project === 'string' ? params.project : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    // Fetch drawings and projects in parallel
    const supabase = await createClient()
    const [drawingsResult, projectsResult] = await Promise.all([
        getAllDrawings({ category, projectId, search }),
        supabase
            .from('projects')
            .select('id, name')
            .order('name')
    ])

    const documents = drawingsResult.data || []
    const projects = projectsResult.data || []

    // Category counts
    const categoryCounts: Record<string, number> = {}
    for (const doc of documents) {
        const cat = doc.category || 'other'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    // Stats
    const totalDrawings = documents.filter(d => d.category === 'drawing').length
    const totalRebar = documents.filter(d => d.category === 'rebar').length
    const totalSpecs = documents.filter(d => d.category === 'concrete_spec').length
    const linkedToElement = documents.filter(d => d.element_id).length

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
                            Teikningar og skjöl (Drawings & Documents)
                        </h1>
                    </div>
                    <p className="ml-12 text-sm text-zinc-600">
                        {documents.length} skjöl samtals
                    </p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{totalDrawings}</p>
                                <p className="text-xs text-zinc-500">Teikningar</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-orange-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{totalRebar}</p>
                                <p className="text-xs text-zinc-500">Armeringsmyndir</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{totalSpecs}</p>
                                <p className="text-xs text-zinc-500">Steypuskýrslur</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-200">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <FolderOpen className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-2xl font-bold text-zinc-900 tabular-nums">{linkedToElement}</p>
                                <p className="text-xs text-zinc-500">Tengd einingum</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 border-zinc-200">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-700">Sía skjöl</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={!category ? 'default' : 'outline'}
                            size="sm"
                            asChild
                        >
                            <Link href={`/factory/drawings${projectId ? `?project=${projectId}` : ''}${search ? `${projectId ? '&' : '?'}search=${search}` : ''}`}>
                                Allt ({documents.length})
                            </Link>
                        </Button>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                            <Button
                                key={key}
                                variant={category === key ? 'default' : 'outline'}
                                size="sm"
                                asChild
                            >
                                <Link href={`/factory/drawings?category=${key}${projectId ? `&project=${projectId}` : ''}${search ? `&search=${search}` : ''}`}>
                                    <Badge variant="secondary" className={`${config.color} border-0 text-[10px] mr-1`}>
                                        {config.label}
                                    </Badge>
                                    {categoryCounts[key] || 0}
                                </Link>
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={!projectId ? 'default' : 'outline'}
                            size="sm"
                            asChild
                        >
                            <Link href={`/factory/drawings${category ? `?category=${category}` : ''}${search ? `${category ? '&' : '?'}search=${search}` : ''}`}>
                                Öll verkefni
                            </Link>
                        </Button>
                        {projects.map((p) => (
                            <Button
                                key={p.id}
                                variant={projectId === p.id ? 'default' : 'outline'}
                                size="sm"
                                asChild
                            >
                                <Link href={`/factory/drawings?project=${p.id}${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`}>
                                    {p.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Document list (client component for preview) */}
            {documents.length > 0 ? (
                <DrawingsClient documents={documents} />
            ) : (
                <Card className="border-zinc-200">
                    <CardContent className="py-16 text-center text-zinc-500">
                        <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="font-medium">Engin skjöl fundust</p>
                        <p className="text-sm mt-1">Breyttu síunni eða hladdu upp nýju skjali í verkefni</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
