'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, CheckCircle, AlertCircle, ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import { uploadElementPhoto, deleteElementPhoto } from '@/lib/elements/actions'
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
    rebar: 'Járnabundið',
    cast: 'Steypt',
    curing: 'Þornar',
    ready: 'Tilbúið',
    loaded: 'Á bíl',
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

    async function handleDeletePhoto(photoId: string) {
        const result = await deleteElementPhoto(photoId)
        if (result.error) {
            throw new Error(result.error)
        }
        setLocalPhotoCount(prev => Math.max(0, prev - 1))
    }

    function triggerCamera() {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        if (isMobile) {
            cameraRef.current?.click()
        } else {
            uploadRef.current?.click()
        }
    }

    // Tooltips
    const galleryTooltip = `${localPhotoCount} ${localPhotoCount === 1 ? 'mynd' : 'myndir'} — smelltu til að skoða`
    const cameraTooltip = state === 'error' && errorMsg
        ? errorMsg
        : state === 'success'
        ? 'Staða uppfærð!'
        : state === 'uploading'
        ? 'Hleð upp...'
        : nextStatus
        ? `Taka mynd og færa í ${statusLabels[nextStatus]}`
        : 'Taka mynd'

    // Gallery button — shown when photos exist
    const galleryButton = (
        <Button
            variant="outline"
            onClick={() => setShowGallery(true)}
            className="h-11 md:h-8 px-2.5 md:px-2 gap-1.5 text-green-700 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 hover:text-green-800 transition-colors"
            title={galleryTooltip}
        >
            <ImageIcon className="w-4 h-4" />
            <span className="text-xs font-semibold tabular-nums">{localPhotoCount}</span>
        </Button>
    )

    // Camera button — shown when status can advance
    const cameraButton = (
        <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 md:h-8 md:w-8 ${
                state === 'success'
                    ? 'text-green-600 hover:text-green-700 bg-green-50'
                    : state === 'error'
                    ? 'text-red-600 hover:text-red-700 bg-red-50'
                    : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
            }`}
            disabled={state === 'uploading'}
            onClick={triggerCamera}
            title={cameraTooltip}
        >
            {state === 'uploading' && <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />}
            {state === 'success' && <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />}
            {state === 'error' && <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />}
            {state === 'idle' && <Camera className="h-5 w-5 md:h-4 md:w-4" />}
        </Button>
    )

    // Gallery dialog
    const galleryDialog = hasPhotos && photos && (
        <Dialog open={showGallery} onOpenChange={setShowGallery}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{elementName} — Myndir</DialogTitle>
                </DialogHeader>
                <PhotoGallery photos={photos} onDelete={handleDeletePhoto} />
            </DialogContent>
        </Dialog>
    )

    // Hidden file inputs
    const fileInputs = (
        <>
            <input
                ref={cameraRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
                onChange={handleCapture}
                className="hidden"
            />
            <input
                ref={uploadRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleCapture}
                className="hidden"
            />
        </>
    )

    // === DISABLED STATE (loaded/delivered) ===
    if (isDisabled) {
        if (hasPhotos) {
            // Gallery button only — can view but not upload
            return (
                <>
                    <div className="inline-flex items-center">
                        {galleryButton}
                    </div>
                    {galleryDialog}
                </>
            )
        }
        // No photos, no upload possible
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground/30 cursor-not-allowed"
                disabled
                title={`${elementName} — lokastaða`}
            >
                <Camera className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
        )
    }

    // === ACTIVE STATE ===
    return (
        <>
            <div className="inline-flex items-center gap-1.5 md:gap-1">
                {/* Gallery button — slides in when first photo is taken */}
                <div className={`overflow-hidden transition-all duration-300 ease-out ${
                    hasPhotos ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0'
                }`}>
                    {galleryButton}
                </div>

                {fileInputs}
                {cameraButton}
            </div>
            {galleryDialog}
        </>
    )
}
