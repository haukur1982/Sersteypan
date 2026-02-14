'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download, FileText, Box } from 'lucide-react'
import { DocumentPreview } from '@/components/documents/DocumentPreview'
import Link from 'next/link'

const categoryConfig: Record<string, { label: string; color: string }> = {
    drawing: { label: 'Teikning', color: 'bg-blue-100 text-blue-800' },
    rebar: { label: 'Armering', color: 'bg-orange-100 text-orange-800' },
    concrete_spec: { label: 'Steypuskýrsla', color: 'bg-green-100 text-green-800' },
    other: { label: 'Annað', color: 'bg-zinc-100 text-zinc-600' },
}

interface DrawingDoc {
    id: string
    name: string
    description: string | null
    file_url: string
    file_type: string | null
    category: string
    element_id: string | null
    created_at: string | null
    project?: { id: string; name: string } | null
    element?: { id: string; name: string } | null
    profiles?: { full_name: string } | null
}

interface DrawingsClientProps {
    documents: DrawingDoc[]
}

export function DrawingsClient({ documents }: DrawingsClientProps) {
    const [previewDoc, setPreviewDoc] = useState<DrawingDoc | null>(null)

    return (
        <>
            <div className="rounded-lg border border-zinc-200 overflow-hidden divide-y divide-zinc-200 bg-white">
                {documents.map((doc) => {
                    const catInfo = categoryConfig[doc.category] || categoryConfig.other
                    return (
                        <div
                            key={doc.id}
                            className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors"
                        >
                            {/* Icon */}
                            <button
                                onClick={() => setPreviewDoc(doc)}
                                className="flex-shrink-0 p-2 rounded-lg bg-zinc-100 hover:bg-blue-50 transition-colors"
                            >
                                {doc.file_type === 'pdf' ? (
                                    <FileText className="w-6 h-6 text-red-600" />
                                ) : doc.file_type === 'image' ? (
                                    <Eye className="w-6 h-6 text-blue-600" />
                                ) : (
                                    <FileText className="w-6 h-6 text-zinc-500" />
                                )}
                            </button>

                            {/* Content */}
                            <button
                                onClick={() => setPreviewDoc(doc)}
                                className="flex-1 min-w-0 text-left"
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-zinc-900 truncate">
                                        {doc.name}
                                    </p>
                                    <Badge variant="secondary" className={`${catInfo.color} border-0 text-[10px] px-1.5 py-0`}>
                                        {catInfo.label}
                                    </Badge>
                                    {doc.element?.name && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-200 text-purple-700 gap-0.5">
                                            <Box className="w-2.5 h-2.5" />
                                            {doc.element.name}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                    {doc.project?.name && (
                                        <span className="font-medium text-zinc-600">{doc.project.name}</span>
                                    )}
                                    {doc.profiles?.full_name && (
                                        <span>{doc.profiles.full_name}</span>
                                    )}
                                    {doc.created_at && (
                                        <span>{new Date(doc.created_at).toLocaleDateString('is-IS')}</span>
                                    )}
                                </div>
                                {doc.description && (
                                    <p className="text-xs text-zinc-500 mt-1 truncate">{doc.description}</p>
                                )}
                            </button>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewDoc(doc)}
                                    className="gap-1 text-blue-600 hover:text-blue-700"
                                >
                                    <Eye className="w-4 h-4" />
                                    Skoða
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 text-zinc-500 hover:text-zinc-700"
                                >
                                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                                {doc.element?.id && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="gap-1 text-purple-600 hover:text-purple-700"
                                    >
                                        <Link href={`/factory/production/${doc.element.id}`}>
                                            <Box className="w-3.5 h-3.5" />
                                            Eining
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Document preview dialog */}
            <DocumentPreview
                document={previewDoc}
                open={!!previewDoc}
                onOpenChange={(open) => { if (!open) setPreviewDoc(null) }}
            />
        </>
    )
}
