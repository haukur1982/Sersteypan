'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from 'react-zoom-pan-pinch'
import { ArrowLeft, Download, ChevronLeft, ChevronRight, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up pdfjs worker — import.meta.url lets webpack resolve the path at build time
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
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

// ── High-resolution PDF rendering ────────────────────────────

const NATIVE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio : 2
// Start at 2× native DPI — gives sharp baseline + zoom headroom up to 2×
const INITIAL_DPR = Math.min(NATIVE_DPR * 2, 6)
// iOS Safari hard limits for canvas
const MAX_CANVAS_DIMENSION = 16384
const MAX_CANVAS_PIXELS = 16777216 // ~16M pixels (safe for 256MB budget)
// Debounce re-renders while user is actively zooming
const DEBOUNCE_MS = 400
const DEBOUNCE_DOWNSCALE_MS = 1000
// Skip re-render if DPR change is smaller than this
const DPR_CHANGE_THRESHOLD = 0.3

/**
 * Calculate a safe devicePixelRatio for the PDF canvas that stays within
 * iOS Safari memory limits while being as sharp as possible at the current zoom.
 */
function calculateSafeDpr(
    zoomScale: number,
    nativeDpr: number,
    containerWidth: number,
    pageAspectRatio: number
): number {
    // Desired: render at enough pixels to look sharp at this zoom level
    const desiredDpr = zoomScale * nativeDpr

    // Cap #1: No single canvas dimension exceeds iOS limit
    const largestDimension = Math.max(containerWidth, containerWidth * pageAspectRatio)
    const maxByDimension = MAX_CANVAS_DIMENSION / largestDimension

    // Cap #2: Total pixel count stays within memory budget
    const pageArea = containerWidth * containerWidth * pageAspectRatio
    const maxByPixels = Math.sqrt(MAX_CANVAS_PIXELS / pageArea)

    // Cap #3: Absolute maximum (beyond 8× native there's no perceptual benefit)
    const absoluteMax = nativeDpr * 8

    const safeDpr = Math.min(desiredDpr, maxByDimension, maxByPixels, absoluteMax)

    // Round to 0.5 increments to reduce unnecessary re-renders
    return Math.max(1, Math.round(safeDpr * 2) / 2)
}

/** Subtle indicator shown while the PDF re-renders at higher resolution */
function SharpeningIndicator() {
    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white/80 text-xs flex items-center gap-1.5 animate-pulse pointer-events-none">
            <Loader2 className="h-3 w-3 animate-spin" />
            Betrumbæti...
        </div>
    )
}

/**
 * Zoom-aware PDF page renderer.
 * Must be a child of TransformWrapper to access useTransformEffect.
 * Listens to zoom scale changes and re-renders the canvas at higher DPI
 * so pinch-zoomed drawings stay sharp.
 */
function ZoomAwarePdfPage({
    proxyUrl,
    currentPage,
    containerWidth,
    onDocumentLoadSuccess,
    onDocumentLoadError,
}: {
    proxyUrl: string
    currentPage: number
    containerWidth: number
    onDocumentLoadSuccess: (result: { numPages: number }) => void
    onDocumentLoadError: (err: Error) => void
}) {
    const [renderDpr, setRenderDpr] = useState(INITIAL_DPR)
    const [isSharpening, setIsSharpening] = useState(false)
    const [pageAspectRatio, setPageAspectRatio] = useState(1.414) // A4 default
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRenderDprRef = useRef(INITIAL_DPR)

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    // Listen to zoom/pan transform changes
    useTransformEffect(({ state }) => {
        const zoomScale = state.scale
        const neededDpr = calculateSafeDpr(
            zoomScale,
            NATIVE_DPR,
            containerWidth,
            pageAspectRatio
        )

        const currentDpr = lastRenderDprRef.current
        const dprDelta = Math.abs(neededDpr - currentDpr)

        // Skip if change is too small to matter
        if (dprDelta < DPR_CHANGE_THRESHOLD) {
            return
        }

        // Clear any pending debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        // Zooming IN: increase DPR (needs more pixels)
        if (neededDpr > currentDpr) {
            setIsSharpening(true)
            debounceRef.current = setTimeout(() => {
                setRenderDpr(neededDpr)
                lastRenderDprRef.current = neededDpr
                setIsSharpening(false)
            }, DEBOUNCE_MS)
            return
        }

        // Zooming OUT below 0.8×: decrease DPR to reclaim memory (longer delay)
        if (neededDpr < currentDpr && zoomScale <= 0.8) {
            debounceRef.current = setTimeout(() => {
                setRenderDpr(neededDpr)
                lastRenderDprRef.current = neededDpr
                setIsSharpening(false)
            }, DEBOUNCE_DOWNSCALE_MS)
        }
        // Zooming out but still above 0.8×: keep current high DPR (it still looks good)
    })

    // Capture page aspect ratio on first render for safe DPR calculation
    const onPageLoadSuccess = useCallback((page: { getViewport: (params: { scale: number }) => { width: number; height: number } }) => {
        const viewport = page.getViewport({ scale: 1 })
        setPageAspectRatio(viewport.height / viewport.width)
    }, [])

    return (
        <>
            <Document
                file={proxyUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
            >
                <Page
                    pageNumber={currentPage}
                    width={containerWidth > 0 ? containerWidth : undefined}
                    devicePixelRatio={renderDpr}
                    loading=""
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onLoadSuccess={onPageLoadSuccess}
                />
            </Document>
            {isSharpening && <SharpeningIndicator />}
        </>
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
    const [pageCount, setPageCount] = useState(1)
    const [currentPage, setCurrentPage] = useState(1)

    // UI visibility — auto-hide after 3s
    const [uiVisible, setUiVisible] = useState(true)
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const showUi = useCallback(() => {
        setUiVisible(true)
        if (hideTimer.current) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
    }, [])

    // Start auto-hide on mount
    useEffect(() => {
        hideTimer.current = setTimeout(() => setUiVisible(false), 3000)
        return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
    }, [])

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

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setPageCount(numPages)
        setLoading(false)
    }, [])

    const onDocumentLoadError = useCallback((err: Error) => {
        console.error('[DocumentViewer] PDF load error:', err)
        setError('Villa kom upp við að opna PDF')
        setLoading(false)
    }, [])

    const onImageLoad = useCallback(() => {
        setLoading(false)
    }, [])

    const onImageError = useCallback(() => {
        console.error('[DocumentViewer] Image load error for:', proxyUrl)
        setError('Villa kom upp við að hlaða mynd')
        setLoading(false)
    }, [proxyUrl])

    const goToPage = useCallback((page: number) => {
        if (page < 1 || page > pageCount) return
        setCurrentPage(page)
    }, [pageCount])

    const retry = useCallback(() => {
        setError(null)
        setLoading(true)
        setRetryKey(k => k + 1)
    }, [])

    const isPdf = category === 'pdf'
    const isImage = category === 'image'
    const showPageNav = isPdf && pageCount > 1

    // Calculate page width to fit screen
    const [containerWidth, setContainerWidth] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth)
            }
        }
        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col select-none"
            onClick={() => showUi()}
        >
            {/* Header */}
            <div
                className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-2 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
            <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden">
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

                {/* PDF viewer — zoom-aware high-resolution rendering */}
                {!error && isPdf && (
                    <TransformWrapper
                        key={`pdf-${retryKey}-${currentPage}`}
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
                            contentStyle={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                        >
                            <ZoomAwarePdfPage
                                proxyUrl={proxyUrl}
                                currentPage={currentPage}
                                containerWidth={containerWidth}
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                onDocumentLoadError={onDocumentLoadError}
                            />
                        </TransformComponent>
                    </TransformWrapper>
                )}

                {/* Image viewer */}
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

            {/* Bottom toolbar — PDF page navigation */}
            {showPageNav && (
                <div
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm rounded-full transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
                </div>
            )}
        </div>
    )
}
