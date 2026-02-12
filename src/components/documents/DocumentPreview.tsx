'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, FileSpreadsheet, FileText, Loader2, ExternalLink } from 'lucide-react'

function getFileCategory(fileType: string | null, fileName?: string): 'pdf' | 'image' | 'excel' | 'word' | 'other' {
    if (fileType === 'pdf') return 'pdf'
    if (fileType === 'image') return 'image'
    if (fileType === 'excel') return 'excel'
    if (fileType === 'word') return 'word'
    // Fallback: detect from filename extension when file_type is null/other
    if (fileName) {
        const ext = fileName.toLowerCase().split('.').pop()
        if (ext === 'pdf') return 'pdf'
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image'
        if (['xls', 'xlsx'].includes(ext || '')) return 'excel'
        if (['doc', 'docx'].includes(ext || '')) return 'word'
    }
    return 'other'
}

interface PreviewDocument {
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

/** Inner content component — remounted via key when document changes to reset loading state */
function PreviewContent({ document, onClose }: { document: PreviewDocument; onClose: () => void }) {
    const [isLoading, setIsLoading] = useState(true)

    const category = getFileCategory(document.file_type, document.name)
    const canPreview = category === 'pdf' || category === 'image'

    return (
        <>
            {/* Accessible title (hidden) */}
            <DialogTitle className="sr-only">{document.name}</DialogTitle>

            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-background flex-shrink-0">
                <p className="text-sm font-medium truncate flex-1 mr-2">
                    {document.name}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={document.file_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden relative bg-zinc-100">
                {/* Loading spinner for previewable files */}
                {isLoading && canPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                )}

                {category === 'pdf' && (
                    <iframe
                        src={document.file_url}
                        className="w-full h-full border-0"
                        title={document.name}
                        onLoad={() => setIsLoading(false)}
                    />
                )}

                {category === 'image' && (
                    <div className="w-full h-full relative">
                        <Image
                            src={document.file_url}
                            alt={document.name}
                            fill
                            className="object-contain"
                            sizes="100vw"
                            onLoad={() => setIsLoading(false)}
                            priority
                        />
                    </div>
                )}

                {!canPreview && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                        {category === 'excel' ? (
                            <FileSpreadsheet className="h-16 w-16 text-green-600" />
                        ) : (
                            <FileText className="h-16 w-16 text-blue-600" />
                        )}
                        <div>
                            <p className="font-medium text-foreground">{document.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ekki er hægt að forskoða þessa skráartegund.
                            </p>
                        </div>
                        <Button asChild>
                            <a href={document.file_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Niðurhala skjali
                            </a>
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export function DocumentPreview({ document, open, onOpenChange }: DocumentPreviewProps) {
    if (!document) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] w-full h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden flex flex-col"
                showCloseButton={false}
            >
                <PreviewContent
                    key={document.file_url}
                    document={document}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
