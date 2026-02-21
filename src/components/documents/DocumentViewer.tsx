'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ArrowLeft, Download, RotateCcw, Loader2, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// Configure PDF.js worker — must be in the same file as <Document>
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()

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

/** Zoom reset button — needs useControls from inside TransformWrapper */
function ZoomResetButton({ visible }: { visible: boolean }) {
    const { resetTransform } = useControls()
    return (
        <button
            onClick={(e) => { e.stopPropagation(); resetTransform() }}
            className={`flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-sm text-white rounded-full text-sm active:bg-white/20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Endurstilla"
        >
            <RotateCcw className="h-4 w-4" />
            Endurstilla
        </button>
    )
}

/** PDF zoom controls — inside TransformWrapper context */
function PdfZoomControls() {
    const { zoomIn, zoomOut, resetTransform } = useControls()
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={(e) => { e.stopPropagation(); zoomOut() }}
                className="p-2 text-white hover:bg-white/20 rounded-lg active:bg-white/30"
                aria-label="Minnka"
            >
                <ZoomOut className="h-5 w-5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); resetTransform() }}
                className="p-2 text-white hover:bg-white/20 rounded-lg active:bg-white/30"
                aria-label="Endurstilla"
            >
                <RotateCcw className="h-4 w-4" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); zoomIn() }}
                className="p-2 text-white hover:bg-white/20 rounded-lg active:bg-white/30"
                aria-label="Stækka"
            >
                <ZoomIn className="h-5 w-5" />
            </button>
        </div>
    )
}

// ── Main DocumentViewer ──────────────────────────────────────

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
    const category = getFileCategory(document.file_type, document.name)
    const proxyUrl = `/api/documents/${document.id}`

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [retryKey, setRetryKey] = useState(0)

    // PDF state
    const [numPages, setNumPages] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [pdfWidth, setPdfWidth] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // UI visibility — auto-hide after 3s (images only)
    const [uiVisible, setUiVisible] = useState(true)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isPdf = category === 'pdf'
    const isImage = category === 'image'

    const showUi = useCallback(() => {
        setUiVisible(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
    }, [])

    // Start auto-hide on mount (for images)
    useEffect(() => {
        if (!isPdf) {
            hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
        }
        return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
    }, [isPdf])

    // Close on Escape key
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    // Prevent body scroll
    useEffect(() => {
        const body = window.document.body
        const prev = body.style.overflow
        body.style.overflow = 'hidden'
        return () => { body.style.overflow = prev }
    }, [])

    // Measure container width for PDF fit-to-width
    useEffect(() => {
        if (!isPdf || !containerRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPdfWidth(entry.contentRect.width)
            }
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [isPdf])

    const onImageLoad = useCallback(() => {
        setLoading(false)
    }, [])

    const onImageError = useCallback(() => {
        console.error('[DocumentViewer] Image load error for:', proxyUrl)
        setError('Villa kom upp við að hlaða mynd')
        setLoading(false)
    }, [proxyUrl])

    const retry = useCallback(() => {
        setError(null)
        setLoading(true)
        setRetryKey(k => k + 1)
        setCurrentPage(1)
        setNumPages(0)
    }, [])

    // PDF callbacks
    const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
        setNumPages(n)
        setLoading(false)
    }, [])

    const onDocumentLoadError = useCallback(() => {
        setError('Villa kom upp við að hlaða PDF skjal')
        setLoading(false)
    }, [])

    const goToPrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), [])
    const goToNextPage = useCallback(() => setCurrentPage(p => Math.min(numPages, p + 1)), [numPages])

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col select-none"
            onClick={() => { if (!isPdf) showUi() }}
        >
            {/* Header */}
            <div
                className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isPdf || uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
            <div className="flex-1 flex items-center justify-center overflow-hidden" style={isPdf ? { paddingTop: 48 } : undefined}>
                {/* Loading spinner */}
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
                        <p className="text-white/50 text-sm mt-3">Hleð inn...</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4 px-8">
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

                {/* PDF viewer — react-pdf with pinch-to-zoom
                    Renders PDF pages to canvas via Mozilla's PDF.js engine.
                    Wrapped in react-zoom-pan-pinch for mobile pinch-to-zoom.
                    Works on all browsers including iOS Safari. */}
                {!error && isPdf && (
                    <TransformWrapper
                        key={`pdf-${retryKey}`}
                        initialScale={1}
                        minScale={0.5}
                        maxScale={4}
                        doubleClick={{ mode: 'zoomIn', step: 1 }}
                        pinch={{ step: 5 }}
                        wheel={{ step: 0.1 }}
                        centerOnInit
                        panning={{ velocityDisabled: true }}
                    >
                        <div ref={containerRef} className="w-full h-full flex flex-col">
                            <TransformComponent
                                wrapperStyle={{ width: '100%', flex: 1, overflow: 'hidden' }}
                                contentStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100%' }}
                            >
                                <Document
                                    file={proxyUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={onDocumentLoadError}
                                    loading={null}
                                >
                                    <Page
                                        pageNumber={currentPage}
                                        width={pdfWidth > 0 ? pdfWidth : undefined}
                                        loading={null}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                    />
                                </Document>
                            </TransformComponent>

                            {/* PDF controls bar */}
                            {numPages > 0 && (
                                <div
                                    className="flex items-center justify-center gap-2 py-2 px-4 bg-black/70 backdrop-blur-sm"
                                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goToPrevPage() }}
                                        disabled={currentPage <= 1}
                                        className="p-2 text-white disabled:text-white/30 hover:bg-white/20 rounded-lg active:bg-white/30"
                                        aria-label="Fyrri síða"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <span className="text-white text-sm font-medium min-w-[80px] text-center">
                                        {currentPage} / {numPages}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); goToNextPage() }}
                                        disabled={currentPage >= numPages}
                                        className="p-2 text-white disabled:text-white/30 hover:bg-white/20 rounded-lg active:bg-white/30"
                                        aria-label="Næsta síða"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                    <div className="w-px h-6 bg-white/20 mx-1" />
                                    <PdfZoomControls />
                                </div>
                            )}
                        </div>
                    </TransformWrapper>
                )}

                {/* Image viewer — pinch/zoom via react-zoom-pan-pinch */}
                {!error && isImage && (
                    <TransformWrapper
                        key={`img-${retryKey}`}
                        initialScale={1}
                        minScale={0.5}
                        maxScale={5}
                        doubleClick={{ mode: 'zoomIn', step: 1.5 }}
                        pinch={{ step: 5 }}
                        wheel={{ step: 0.1 }}
                        centerOnInit
                    >
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={proxyUrl}
                                alt={document.name}
                                className="max-w-full max-h-full object-contain"
                                onLoad={onImageLoad}
                                onError={onImageError}
                                draggable={false}
                            />
                        </TransformComponent>

                        {/* Zoom reset (absolute positioned) */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                            <ZoomResetButton visible={uiVisible} />
                        </div>
                    </TransformWrapper>
                )}

                {/* Non-previewable fallback */}
                {!error && category === 'other' && (
                    <div className="flex flex-col items-center justify-center gap-4 px-8 text-center">
                        <p className="text-white font-medium">{document.name}</p>
                        <p className="text-white/50 text-sm">Ekki er hægt að forskoða þessa skráartegund.</p>
                        <a
                            href={proxyUrl}
                            download
                            className="px-6 py-3 bg-white/20 text-white rounded-lg text-sm active:bg-white/30 flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Niðurhala skjali
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
