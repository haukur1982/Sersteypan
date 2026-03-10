'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, CheckCircle, AlertCircle, ImageIcon, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import { uploadElementPhoto } from '@/lib/elements/actions'
import type { ElementPhoto } from '@/components/buyer/project/types'

type ElementStatus = 'planned' | 'rebar' | 'cast' | 'curing' | 'ready' | 'loaded' | 'delivered'
type PhotoStage = 'rebar' | 'cast' | 'curing' | 'ready' | 'loaded' | 'before_delivery' | 'after_delivery'

// Forward-only transitions for quick action
const nextStatusMap: Partial<Record<ElementStatus, ElementStatus>> = {
    planned: 'rebar',
    rebar: 'cast',
    cast: 'curing',
    curing: 'ready',
    ready: 'loaded',
}

const stageByStatus: Record<ElementStatus, PhotoStage | null> = {
    planned: null,
    rebar: 'rebar',
    cast: 'cast',
    curing: 'curing',
    ready: 'ready',
    loaded: 'loaded',
    delivered: 'after_delivery',
}

const statusLabels: Record<ElementStatus, string> = {
    planned: 'Skipulagt',
    rebar: 'J\u00e1rnabundi\u00f0',
    cast: 'Steypt',
    curing: '\u00deornar',
    ready: 'Tilb\u00fai\u00f0',
    loaded: '\u00c1 b\u00edl',
    delivered: 'Afhent',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']

interface QuickPhotoActionProps {
    elementId: string
    elementName: string
    currentStatus: string
    photoCount?: number
    photos?: ElementPhoto[]
}

export function QuickPhotoAction({ elementId, elementName, currentStatus, photoCount = 0, photos }: QuickPhotoActionProps) {
    const [state, setState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [localPhotoCount, setLocalPhotoCount] = useState(photoCount)
    const [showGallery, setShowGallery] = useState(false)
    const cameraRef = useRef<HTMLInputElement>(null)
    const uploadRef = useRef<HTMLInputElement>(null)

    const status = (currentStatus || 'planned') as ElementStatus
    const nextStatus = nextStatusMap[status]
    const isDisabled = !nextStatus // No forward transition (loaded, delivered)
    const hasPhotos = localPhotoCount > 0

    // The photo stage corresponds to the CURRENT status (documenting what was just done)
    const photoStage = stageByStatus[status]

    async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (!files || files.length === 0) return

        const file = files[0]
        e.target.value = '' // Reset input for re-trigger

        console.log(`[photo-upload] QuickPhoto: file=${file.name}, type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB, element=${elementId}`)

        // Validate
        if (!ACCEPTED_TYPES.includes(file.type)) {
            console.error(`[photo-upload] Invalid type: ${file.type}`)
            setErrorMsg('Aðeins JPEG, PNG og WebP myndir')
            setState('error')
            setTimeout(() => setState('idle'), 5000)
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            console.error(`[photo-upload] File too large: ${file.size}`)
            setErrorMsg('Mynd of stór (hám. 10MB)')
            setState('error')
            setTimeout(() => setState('idle'), 5000)
            return
        }

        const stage = photoStage || (nextStatus ? stageByStatus[nextStatus] : null)
        if (!stage) {
            console.error('[photo-upload] No valid stage for status:', status)
            return
        }

        setState('uploading')
        setErrorMsg(null)

        try {
            // Use server action — bypasses client-side auth issues
            const formData = new FormData()
            formData.append('elementId', elementId)
            formData.append('stage', stage)
            formData.append('file', file)
            if (nextStatus) {
                formData.append('advanceStatus', nextStatus)
            }

            console.log('[photo-upload] Calling uploadElementPhoto server action...')
            const result = await uploadElementPhoto(formData)

            if (result.error) {
                console.error('[photo-upload] Server action error:', result.error)
                throw new Error(result.error)
            }

            console.log('[photo-upload] Upload complete!')
            setLocalPhotoCount(prev => prev + 1)
            setState('success')
            setTimeout(() => setState('idle'), 2000)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[photo-upload] QuickPhoto error:', msg)
            setErrorMsg(msg || 'Villa kom upp')
            setState('error')
            setTimeout(() => setState('idle'), 5000)
        }
    }

    // Build tooltip text
    const tooltipText = isDisabled
        ? `${elementName} \u2014 lokasta\u00f0a`
        : state === 'error' && errorMsg
        ? errorMsg
        : state === 'success'
        ? 'Sta\u00f0a uppf\u00e6r\u00f0!'
        : hasPhotos
        ? `${localPhotoCount} ${localPhotoCount === 1 ? 'mynd' : 'myndir'} \u2014 taka a\u00f0ra`
        : nextStatus
        ? `Taka mynd og f\u00e6ra \u00ed ${statusLabels[nextStatus]}`
        : 'Taka mynd'

    if (isDisabled) {
        return (
            <>
                <div className="relative inline-flex items-center">
                    {hasPhotos && (
                        <button
                            onClick={() => setShowGallery(true)}
                            className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white hover:bg-green-600 transition-colors"
                        >
                            {localPhotoCount > 9 ? '9+' : localPhotoCount}
                        </button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 md:h-8 md:w-8 ${hasPhotos ? 'text-green-600 cursor-pointer' : 'text-muted-foreground/30 cursor-not-allowed'}`}
                        disabled={!hasPhotos}
                        onClick={hasPhotos ? () => setShowGallery(true) : undefined}
                        title={hasPhotos ? `${localPhotoCount} myndir — smelltu til að sjá` : tooltipText}
                    >
                        {hasPhotos ? <ImageIcon className="h-5 w-5 md:h-4 md:w-4" /> : <Camera className="h-5 w-5 md:h-4 md:w-4" />}
                    </Button>
                </div>
                {hasPhotos && photos && (
                    <Dialog open={showGallery} onOpenChange={setShowGallery}>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{elementName} — Myndir</DialogTitle>
                            </DialogHeader>
                            <PhotoGallery photos={photos} />
                        </DialogContent>
                    </Dialog>
                )}
            </>
        )
    }

    return (
        <>
            <div className="relative inline-flex items-center">
                {/* Green badge showing photo count — clickable to view gallery */}
                {hasPhotos && state === 'idle' && (
                    <button
                        onClick={() => setShowGallery(true)}
                        className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white hover:bg-green-600 transition-colors"
                    >
                        {localPhotoCount > 9 ? '9+' : localPhotoCount}
                    </button>
                )}

                {/* Camera input (mobile — opens rear camera directly) */}
                <input
                    ref={cameraRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    capture="environment"
                    onChange={handleCapture}
                    className="hidden"
                />

                {/* File upload input (no capture — opens file picker / gallery) */}
                <input
                    ref={uploadRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    onChange={handleCapture}
                    className="hidden"
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-11 w-11 md:h-8 md:w-8 ${
                        state === 'success'
                            ? 'text-green-600 hover:text-green-700 bg-green-50'
                            : state === 'error'
                            ? 'text-red-600 hover:text-red-700 bg-red-50'
                            : hasPhotos
                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'
                    }`}
                    disabled={state === 'uploading'}
                    onClick={() => {
                        // On mobile use camera capture, on desktop use file picker
                        // Simple heuristic: check for touch support
                        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
                        if (isMobile) {
                            cameraRef.current?.click()
                        } else {
                            uploadRef.current?.click()
                        }
                    }}
                    title={tooltipText}
                >
                    {state === 'uploading' && <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />}
                    {state === 'success' && <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />}
                    {state === 'error' && <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />}
                    {state === 'idle' && hasPhotos && <RefreshCw className="h-5 w-5 md:h-4 md:w-4" />}
                    {state === 'idle' && !hasPhotos && <Camera className="h-5 w-5 md:h-4 md:w-4" />}
                </Button>
            </div>

            {/* Photo gallery dialog */}
            {hasPhotos && photos && (
                <Dialog open={showGallery} onOpenChange={setShowGallery}>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{elementName} — Myndir</DialogTitle>
                        </DialogHeader>
                        <PhotoGallery photos={photos} />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}
