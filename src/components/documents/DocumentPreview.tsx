'use client'

import { DocumentViewer } from './DocumentViewer'

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
