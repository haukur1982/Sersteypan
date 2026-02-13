import type { PDFDocumentProxy } from 'pdfjs-dist'

// Cache loaded PDF documents by URL to avoid re-downloading when changing pages
const pdfCache = new Map<string, PDFDocumentProxy>()

async function getPdfLib() {
    const pdfjs = await import('pdfjs-dist')
    // Disable worker — runs on main thread. Fine for 1-10 page construction drawings.
    if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = ''
    }
    return pdfjs
}

async function loadPdf(url: string): Promise<PDFDocumentProxy> {
    const cached = pdfCache.get(url)
    if (cached) return cached

    const pdfjs = await getPdfLib()
    const doc = await pdfjs.getDocument(url).promise
    pdfCache.set(url, doc)
    return doc
}

export async function getPdfInfo(url: string): Promise<{ pageCount: number }> {
    const doc = await loadPdf(url)
    return { pageCount: doc.numPages }
}

export async function renderPdfPage(url: string, pageNum: number): Promise<string> {
    const doc = await loadPdf(url)
    const page = await doc.getPage(pageNum)

    // Render at device pixel ratio for sharp display, capped at 2x to save memory
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const baseScale = 1.5 // base scale for readability
    const viewport = page.getViewport({ scale: dpr * baseScale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // Convert to JPEG data URL (good balance of quality and memory)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    // Clean up canvas memory
    canvas.width = 0
    canvas.height = 0

    return dataUrl
}
