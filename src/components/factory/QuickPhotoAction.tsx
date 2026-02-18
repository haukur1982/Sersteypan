'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, CheckCircle, AlertCircle, ImageIcon, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateElementStatus } from '@/lib/elements/actions'

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
}

export function QuickPhotoAction({ elementId, elementName, currentStatus, photoCount = 0 }: QuickPhotoActionProps) {
    const [state, setState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [localPhotoCount, setLocalPhotoCount] = useState(photoCount)
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

        // Validate
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setErrorMsg('A\u00f0eins JPEG, PNG og WebP myndir')
            setState('error')
            setTimeout(() => setState('idle'), 3000)
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setErrorMsg('Mynd of st\u00f3r (h\u00e1m. 10MB)')
            setState('error')
            setTimeout(() => setState('idle'), 3000)
            return
        }

        const stage = photoStage || (nextStatus ? stageByStatus[nextStatus] : null)
        if (!stage) return

        setState('uploading')
        setErrorMsg(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                throw new Error('Ekki innskr\u00e1\u00f0ur')
            }

            // Upload photo to storage
            const timestamp = Date.now()
            const ext = file.name.split('.').pop() || 'jpg'
            const filePath = `${user.id}/${elementId}/${timestamp}_${stage}.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('element-photos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('element-photos')
                .getPublicUrl(filePath)

            // Create DB record
            const { error: dbError } = await supabase.from('element_photos').insert({
                element_id: elementId,
                stage: stage,
                photo_url: publicUrl,
                taken_by: user.id,
            })

            if (dbError) {
                // Clean up uploaded file
                await supabase.storage.from('element-photos').remove([filePath])
                throw dbError
            }

            // Update local photo count
            setLocalPhotoCount(prev => prev + 1)

            // Only advance status if there's a next status and we haven't already advanced
            if (nextStatus) {
                const result = await updateElementStatus(elementId, nextStatus)
                if (result.error) {
                    // Photo was saved successfully, just couldn't advance status — that's OK
                    console.warn('Status advance failed (photo saved):', result.error)
                }
            }

            setState('success')
            setTimeout(() => setState('idle'), 2000)
        } catch (err) {
            console.error('QuickPhotoAction error:', err)
            setErrorMsg(err instanceof Error ? err.message : 'Villa kom upp')
            setState('error')
            setTimeout(() => setState('idle'), 3000)
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
            <div className="relative inline-flex items-center">
                {hasPhotos && (
                    <span className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                        {localPhotoCount > 9 ? '9+' : localPhotoCount}
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground/30 cursor-not-allowed"
                    disabled
                    title={tooltipText}
                >
                    {hasPhotos ? <ImageIcon className="h-5 w-5 md:h-4 md:w-4" /> : <Camera className="h-5 w-5 md:h-4 md:w-4" />}
                </Button>
            </div>
        )
    }

    return (
        <div className="relative inline-flex items-center">
            {/* Green badge showing photo count */}
            {hasPhotos && state === 'idle' && (
                <span className="absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                    {localPhotoCount > 9 ? '9+' : localPhotoCount}
                </span>
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
    )
}
