'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { globalSearch, type SearchResults } from '@/lib/search/actions'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Building, FolderKanban, Box, Loader2 } from 'lucide-react'
import Link from 'next/link'

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

const statusConfig = {
    planned: { label: 'Skipulagt', color: 'bg-zinc-100 text-zinc-600' },
    rebar: { label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { label: 'Á bíl', color: 'bg-blue-100 text-blue-800' },
    delivered: { label: 'Afhent', color: 'bg-purple-100 text-purple-800' }
}

export function SearchInterface() {
    const searchParams = useSearchParams()
    const [query, setQuery] = useState(searchParams.get('q') || '')
    const [isSearching, setIsSearching] = useState(false)
    const [results, setResults] = useState<SearchResults>({
        companies: [],
        projects: [],
        elements: []
    })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true)
                setError(null)

                try {
                    const response = await globalSearch(query)

                    if (response.error) {
                        setError(response.error)
                        setResults({ companies: [], projects: [], elements: [] })
                    } else if (response.data) {
                        setResults(response.data)
                    }
                } catch (err) {
                    setError('Leitarvilla kom upp')
                    console.error(err)
                } finally {
                    setIsSearching(false)
                }
            } else {
                setResults({ companies: [], projects: [], elements: [] })
            }
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [query])

    const totalResults = results.companies.length + results.projects.length + results.elements.length

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Leita</h1>
                <p className="text-zinc-600 mt-2">Leita að verkefnum, fyrirtækjum og einingum (Search)</p>
            </div>

            {/* Search Input */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                        <Input
                            type="search"
                            placeholder="Leita..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 text-lg h-12"
                            autoFocus
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 top-3 h-5 w-5 text-zinc-400 animate-spin" />
                        )}
                    </div>
                    {query.length > 0 && query.length < 2 && (
                        <p className="text-sm text-zinc-500 mt-2">
                            Sláðu inn að minnsta kosti 2 stafi
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Results */}
            {query.length >= 2 && !isSearching && (
                <div className="space-y-6">
                    {/* Summary */}
                    <p className="text-sm text-zinc-600">
                        Fundust {totalResults} niðurstöður fyrir &quot;{query}&quot;
                    </p>

                    {/* Companies */}
                    {results.companies.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Fyrirtæki ({results.companies.length})
                            </h2>
                            <div className="space-y-2">
                                {results.companies.map((company) => (
                                    <Link
                                        key={company.id}
                                        href={`/admin/companies/${company.id}/edit`}
                                        className="block p-4 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                                    >
                                        <p className="font-medium text-zinc-900">{company.name}</p>
                                        {company.contact_name && (
                                            <p className="text-sm text-zinc-600">{company.contact_name}</p>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {results.projects.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                <FolderKanban className="h-5 w-5" />
                                Verkefni ({results.projects.length})
                            </h2>
                            <div className="space-y-2">
                                {results.projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/admin/projects/${project.id}`}
                                        className="block p-4 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-zinc-900">{project.name}</p>
                                                <p className="text-sm text-zinc-600">{project.companies?.name}</p>
                                                {project.address && (
                                                    <p className="text-sm text-zinc-500">{project.address}</p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="capitalize">
                                                {project.status}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Elements */}
                    {results.elements.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                                <Box className="h-5 w-5" />
                                Einingar ({results.elements.length})
                            </h2>
                            <div className="space-y-2">
                                {results.elements.map((element) => {
                                    const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other
                                    const statusInfo = statusConfig[element.status as keyof typeof statusConfig] || statusConfig.planned

                                    return (
                                        <Link
                                            key={element.id}
                                            href={`/admin/elements/${element.id}/edit`}
                                            className="block p-4 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <p className="font-medium text-zinc-900">{element.name}</p>
                                                    <p className="text-sm text-zinc-600">
                                                        {element.projects?.name} • {element.projects?.companies?.name}
                                                    </p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {typeInfo.label}
                                                        </Badge>
                                                        {element.floor && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Hæð {element.floor}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className={`${statusInfo.color} whitespace-nowrap`}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* No Results */}
                    {totalResults === 0 && (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                            <p className="text-zinc-600">Engar niðurstöður fundust fyrir &quot;{query}&quot;</p>
                            <p className="text-sm text-zinc-500 mt-1">
                                Reyndu aðra leitarskilmála
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Initial State */}
            {query.length === 0 && (
                <div className="text-center py-12">
                    <Search className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                    <p className="text-zinc-600">Byrjaðu að skrifa til að leita</p>
                </div>
            )}
        </div>
    )
}
