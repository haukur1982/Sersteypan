'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Download } from 'lucide-react'
import { DocumentPreview } from '@/components/documents/DocumentPreview'

const categoryConfig: Record<string, { label: string; color: string }> = {
    drawing: { label: 'Teikning', color: 'bg-blue-100 text-blue-800' },
    rebar: { label: 'Armering', color: 'bg-orange-100 text-orange-800' },
    concrete_spec: { label: 'Steypuskýrsla', color: 'bg-green-100 text-green-800' },
    other: { label: 'Annað', color: 'bg-zinc-100 text-zinc-600' },
}

interface Drawing {
    id: string
    name: string
    file_url: string
    file_type: string | null
    category: string
    element_id: string | null
    created_at: string | null
}

interface ElementDrawingsProps {
    drawings: Drawing[]
    elementId: string
}

export function ElementDrawings({ drawings, elementId }: ElementDrawingsProps) {
    const [previewDoc, setPreviewDoc] = useState<Drawing | null>(null)

    // Sort: element-specific drawings first, then project-level
    const sorted = [...drawings].sort((a, b) => {
        if (a.element_id === elementId && b.element_id !== elementId) return -1
        if (a.element_id !== elementId && b.element_id === elementId) return 1
        return 0
    })

    return (
        <>
            <div className="space-y-2">
                {sorted.map((doc) => {
                    const catInfo = categoryConfig[doc.category] || categoryConfig.other
                    const isLinked = doc.element_id === elementId
                    return (
                        <div
                            key={doc.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer hover:bg-blue-50 ${
                                isLinked ? 'border-blue-200 bg-blue-50/50' : 'border-zinc-200'
                            }`}
                            onClick={() => setPreviewDoc(doc)}
                        >
                            <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">
                                    {doc.name}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Badge variant="secondary" className={`${catInfo.color} border-0 text-[10px] px-1 py-0`}>
                                        {catInfo.label}
                                    </Badge>
                                    {isLinked && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-0 text-[10px] px-1 py-0">
                                            Tengt
                                        </Badge>
                                    )}
                                    {!isLinked && (
                                        <span className="text-[10px] text-zinc-400">Verkefnisteikning</span>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                            >
                                <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        </div>
                    )
                })}
            </div>

            <DocumentPreview
                document={previewDoc}
                open={!!previewDoc}
                onOpenChange={(open) => { if (!open) setPreviewDoc(null) }}
            />
        </>
    )
}
