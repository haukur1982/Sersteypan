'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download, Trash2, Loader2, Check, X } from 'lucide-react'
import { DocumentPreview } from './DocumentPreview'
import { deleteDocument } from '@/lib/documents/actions'

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
    file_type: string | null
    category: string
    created_at: string | null
    element_id?: string | null
    element?: { id: string; name: string } | null
    profiles?: { full_name: string } | null
}

interface DocumentListWithFilterProps {
    documents: Document[]
    projectId?: string
    canDelete?: boolean
}

export function DocumentListWithFilter({ documents, projectId, canDelete = false }: DocumentListWithFilterProps) {
    const router = useRouter()
    const [activeFilter, setActiveFilter] = useState<string | null>(null)
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
    const [confirmingId, setConfirmingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const filtered = activeFilter
        ? documents.filter(d => d.category === activeFilter)
        : documents

    const categoryCounts: Record<string, number> = {}
    for (const doc of documents) {
        const cat = doc.category || 'other'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    async function handleDelete(docId: string) {
        if (!projectId) return
        setDeletingId(docId)
        setError(null)
        const result = await deleteDocument(docId, projectId)
        if (result.error) {
            setError(result.error)
            setDeletingId(null)
            setConfirmingId(null)
        } else {
            setDeletingId(null)
            setConfirmingId(null)
            router.refresh()
        }
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

            {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Document list */}
            {filtered.length > 0 ? (
                <div className="space-y-3">
                    {filtered.map((doc) => {
                        const catInfo = categoryConfig[doc.category] || categoryConfig.other
                        const isConfirming = confirmingId === doc.id
                        const isDeleting = deletingId === doc.id
                        return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50"
                            >
                                <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                >
                                    <Eye className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {doc.name}
                                            </p>
                                            <Badge variant="secondary" className={`${catInfo.color} border-0 text-[10px] px-1.5 py-0 flex-shrink-0`}>
                                                {catInfo.label}
                                            </Badge>
                                            {doc.element?.name && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 border-purple-200 text-purple-700">
                                                    {doc.element.name}
                                                </Badge>
                                            )}
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
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {isConfirming ? (
                                        <>
                                            <span className="text-xs text-muted-foreground mr-1">Eyða?</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(doc.id)}
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setConfirmingId(null)}
                                                disabled={isDeleting}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                            >
                                                <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                    onClick={() => setConfirmingId(doc.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                    {activeFilter ? 'Engin skjöl í þessum flokki.' : 'Engin skjöl hafa verið hlaðið upp ennþá.'}
                </p>
            )}

            {/* Document preview dialog */}
            <DocumentPreview
                document={previewDoc}
                open={!!previewDoc}
                onOpenChange={(open) => { if (!open) setPreviewDoc(null) }}
            />
        </div>
    )
}
