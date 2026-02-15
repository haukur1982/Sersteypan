'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import with ssr: false — react-zoom-pan-pinch requires browser APIs
const DocumentViewer = dynamic(
    () => import('./DocumentViewer').then(m => ({ default: m.DocumentViewer })),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-white/70" />
            </div>
        ),
    }
)

interface PreviewDocument {
    id: string
    name: string
    file_url: string
    file_type: string | null
    description?: string | null
}

interface DocumentPreviewProps {
    document: PreviewDocument | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DocumentPreview({ document, open, onOpenChange }: DocumentPreviewProps) {
    if (!open || !document) return null

    return (
        <DocumentViewer
            document={document}
            onClose={() => onOpenChange(false)}
        />
    )
}
