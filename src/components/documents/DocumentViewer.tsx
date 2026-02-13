'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Download, ChevronLeft, ChevronRight, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import { usePinchZoom } from '@/lib/hooks/usePinchZoom'
import { getPdfInfo, renderPdfPage } from '@/lib/pdf/renderPage'

interface ViewerDocument {
    id: string
    name: string
    file_url: string
    file_type: string | null
}

interface DocumentViewerProps {
    document: ViewerDocument
    onClose: () => void
}

type FileCategory = 'pdf' | 'image' | 'other'

function getFileCategory(fileType: string | null, fileName?: string): FileCategory {
    if (fileType === 'pdf') return 'pdf'
    if (fileType === 'image') return 'image'
    if (fileName) {
        const ext = fileName.toLowerCase().split('.').pop()
        if (ext === 'pdf') return 'pdf'
        if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image'
    }
    return 'other'
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
    const category = getFileCategory(document.file_type, document.name)
    const proxyUrl = `/api/documents/${document.id}`

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // PDF state
    const [pageCount, setPageCount] = useState(1)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageDataUrl, setPageDataUrl] = useState<string | null>(null)
    const pageCache = useRef<Map<number, string>>(new Map())

    // UI visibility
    const [uiVisible, setUiVisible] = useState(true)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { scale, translateX, translateY, handlers, resetZoom, isZoomed } = usePinchZoom()

    // Auto-hide UI after 3 seconds of no interaction
    const showUi = useCallback(() => {
        setUiVisible(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
    }, [])

    // Start auto-hide timer on first render (uiVisible starts as true)
    useEffect(() => {
        hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current)
        }
    }, [])

    // Close on Escape key
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    // Prevent body scroll when viewer is open
    useEffect(() => {
        const body = window.document.body
        const prev = body.style.overflow
        body.style.overflow = 'hidden'
        return () => { body.style.overflow = prev }
    }, [])

    // Load PDF info
    useEffect(() => {
        if (category !== 'pdf') return
        let cancelled = false

        async function loadPdfInfo() {
            try {
                setLoading(true)
                setError(null)
                const info = await getPdfInfo(proxyUrl)
                if (!cancelled) {
                    setPageCount(info.pageCount)
                    await loadPage(1)
                }
            } catch {
                if (!cancelled) setError('Villa kom upp við að opna PDF')
            }
        }

        async function loadPage(page: number) {
            try {
                const cached = pageCache.current.get(page)
                if (cached) {
                    if (!cancelled) {
                        setPageDataUrl(cached)
                        setLoading(false)
                    }
                    return
                }
                const dataUrl = await renderPdfPage(proxyUrl, page)
                if (!cancelled) {
                    pageCache.current.set(page, dataUrl)
                    setPageDataUrl(dataUrl)
                    setLoading(false)
                }
            } catch {
                if (!cancelled) {
                    setError('Villa kom upp við að birta síðu')
                    setLoading(false)
                }
            }
        }

        loadPdfInfo()
        return () => { cancelled = true }
    }, [category, proxyUrl])

    // Load a specific PDF page
    const goToPage = useCallback(async (page: number) => {
        if (page < 1 || page > pageCount) return
        setCurrentPage(page)
        setLoading(true)
        resetZoom()

        const cached = pageCache.current.get(page)
        if (cached) {
            setPageDataUrl(cached)
            setLoading(false)
            return
        }

        try {
            const dataUrl = await renderPdfPage(proxyUrl, page)
            pageCache.current.set(page, dataUrl)
            setPageDataUrl(dataUrl)
            setLoading(false)
        } catch {
            setError('Villa kom upp við að birta síðu')
            setLoading(false)
        }
    }, [pageCount, proxyUrl, resetZoom])

    // Retry after error
    const retry = useCallback(() => {
        setError(null)
        setLoading(true)
        if (category === 'pdf') {
            pageCache.current.clear()
            goToPage(currentPage)
        } else {
            // Force image reload by re-rendering
            setLoading(true)
        }
    }, [category, goToPage, currentPage])

    const isPdf = category === 'pdf'
    const isImage = category === 'image'
    const showToolbar = isPdf && pageCount > 1
    const imgSrc = isPdf ? pageDataUrl : proxyUrl

    const transformStyle = {
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transition: isZoomed ? 'none' : 'transform 0.2s ease-out',
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col select-none"
            style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
            onClick={() => { showUi() }}
        >
            {/* Header */}
            <div
                className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ height: 48, paddingTop: 'env(safe-area-inset-top)' }}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onClose() }}
                    className="flex items-center justify-center h-12 w-12 text-white active:bg-white/20 rounded-lg"
                    aria-label="Loka"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <p className="text-white text-sm font-medium truncate flex-1 mx-2 text-center">
                    {document.name}
                </p>
                <a
                    href={proxyUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center h-12 w-12 text-white active:bg-white/20 rounded-lg"
                    aria-label="Niðurhala"
                >
                    <Download className="h-6 w-6" />
                </a>
            </div>

            {/* Main content area */}
            <div
                className="flex-1 flex items-center justify-center overflow-hidden"
                {...handlers}
            >
                {/* Loading spinner */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
                        <p className="text-white/50 text-sm mt-3">Hleð inn...</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4 px-8">
                        <AlertCircle className="h-12 w-12 text-red-400" />
                        <p className="text-white text-center">{error}</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); retry() }}
                            className="px-6 py-3 bg-white/20 text-white rounded-lg text-sm active:bg-white/30"
                        >
                            Reyna aftur
                        </button>
                    </div>
                )}

                {/* Image / PDF page — using <img> for CSS transform zoom (Next.js Image doesn't support data URLs or transform) */}
                {!error && imgSrc && (isImage || isPdf) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imgSrc}
                        alt={document.name}
                        className="max-w-full max-h-full object-contain"
                        style={transformStyle}
                        onLoad={() => setLoading(false)}
                        onError={() => {
                            setLoading(false)
                            setError('Villa kom upp við að hlaða mynd')
                        }}
                        draggable={false}
                    />
                )}

                {/* Non-previewable fallback */}
                {!error && category === 'other' && (
                    <div className="flex flex-col items-center justify-center gap-4 px-8 text-center">
                        <p className="text-white font-medium">{document.name}</p>
                        <p className="text-white/50 text-sm">Ekki er hægt að forskoða þessa skráartegund.</p>
                        <a
                            href={proxyUrl}
                            download
                            className="px-6 py-3 bg-white/20 text-white rounded-lg text-sm active:bg-white/30"
                        >
                            <Download className="h-4 w-4 inline mr-2" />
                            Niðurhala skjali
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom toolbar — PDF page navigation */}
            {showToolbar && (
                <div
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-full transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPage(currentPage - 1) }}
                        disabled={currentPage <= 1}
                        className="flex items-center justify-center h-12 w-12 text-white disabled:text-white/30 active:bg-white/20 rounded-full"
                        aria-label="Fyrri síða"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <span className="text-white text-sm min-w-[4rem] text-center font-medium">
                        Bls. {currentPage} / {pageCount}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPage(currentPage + 1) }}
                        disabled={currentPage >= pageCount}
                        className="flex items-center justify-center h-12 w-12 text-white disabled:text-white/30 active:bg-white/20 rounded-full"
                        aria-label="Næsta síða"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                    {isZoomed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); resetZoom() }}
                            className="flex items-center justify-center h-12 w-12 text-white active:bg-white/20 rounded-full"
                            aria-label="Endurstilla"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </button>
                    )}
                </div>
            )}

            {/* Zoom reset button (non-PDF, when zoomed) */}
            {!showToolbar && isZoomed && (
                <div
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); resetZoom() }}
                        className="flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-sm text-white rounded-full text-sm active:bg-white/20"
                        aria-label="Endurstilla"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Endurstilla
                    </button>
                </div>
            )}
        </div>
    )
}
