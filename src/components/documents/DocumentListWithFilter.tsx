'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download } from 'lucide-react'

const categoryConfig: Record<string, { label: string; color: string }> = {
    drawing: { label: 'Teikning', color: 'bg-blue-100 text-blue-800' },
    rebar: { label: 'Armering', color: 'bg-orange-100 text-orange-800' },
    concrete_spec: { label: 'Steypuskýrsla', color: 'bg-green-100 text-green-800' },
    other: { label: 'Annað', color: 'bg-zinc-100 text-zinc-600' },
}

interface Document {
    id: string
    name: string
    description: string | null
    file_url: string
    category: string
    created_at: string | null
    profiles?: { full_name: string } | null
}

interface DocumentListWithFilterProps {
    documents: Document[]
}

export function DocumentListWithFilter({ documents }: DocumentListWithFilterProps) {
    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    const filtered = activeFilter
        ? documents.filter(d => d.category === activeFilter)
        : documents

    const categoryCounts: Record<string, number> = {}
    for (const doc of documents) {
        const cat = doc.category || 'other'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    return (
        <div>
            {/* Filter tabs */}
            {documents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    <Button
                        variant={activeFilter === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter(null)}
                        className="h-7 text-xs"
                    >
                        Allt ({documents.length})
                    </Button>
                    {Object.entries(categoryConfig).map(([key, config]) => {
                        const count = categoryCounts[key]
                        if (!count) return null
                        return (
                            <Button
                                key={key}
                                variant={activeFilter === key ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveFilter(key)}
                                className="h-7 text-xs"
                            >
                                {config.label} ({count})
                            </Button>
                        )
                    })}
                </div>
            )}

            {/* Document list */}
            {filtered.length > 0 ? (
                <div className="space-y-3">
                    {filtered.map((doc) => {
                        const catInfo = categoryConfig[doc.category] || categoryConfig.other
                        return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {doc.name}
                                            </p>
                                            <Badge variant="secondary" className={`${catInfo.color} border-0 text-[10px] px-1.5 py-0 flex-shrink-0`}>
                                                {catInfo.label}
                                            </Badge>
                                        </div>
                                        {doc.description && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {doc.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground/70">
                                            {doc.profiles?.full_name} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('is-IS') : 'Óþekkt'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600 flex-shrink-0"
                                >
                                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                    {activeFilter ? 'Engin skjöl í þessum flokki.' : 'Engin skjöl hafa verið hlaðið upp ennþá.'}
                </p>
            )}
        </div>
    )
}
