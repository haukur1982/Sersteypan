'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
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
}

export function QuickPhotoAction({ elementId, elementName, currentStatus }: QuickPhotoActionProps) {
    const [state, setState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const status = (currentStatus || 'planned') as ElementStatus
    const nextStatus = nextStatusMap[status]
    const isDisabled = !nextStatus // No forward transition (loaded, delivered)

    // The photo stage corresponds to the NEXT status (the status we're advancing to)
    const photoStage = nextStatus ? stageByStatus[nextStatus] : null

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

        if (!nextStatus || !photoStage) return

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
            const filePath = `${user.id}/${elementId}/${timestamp}_${photoStage}.${ext}`

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
                stage: photoStage,
                photo_url: publicUrl,
                taken_by: user.id,
            })

            if (dbError) {
                // Clean up uploaded file
                await supabase.storage.from('element-photos').remove([filePath])
                throw dbError
            }

            // Advance status
            const result = await updateElementStatus(elementId, nextStatus)
            if (result.error) {
                throw new Error(result.error)
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
        : `Taka mynd og f\u00e6ra \u00ed ${statusLabels[nextStatus!]}`

    if (isDisabled) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground/30 cursor-not-allowed"
                disabled
                title={tooltipText}
            >
                <Camera className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
        )
    }

    return (
        <div className="relative inline-flex">
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                capture="environment"
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
                        : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'
                }`}
                disabled={state === 'uploading'}
                onClick={() => fileRef.current?.click()}
                title={tooltipText}
            >
                {state === 'uploading' && <Loader2 className="h-5 w-5 md:h-4 md:w-4 animate-spin" />}
                {state === 'success' && <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />}
                {state === 'error' && <AlertCircle className="h-5 w-5 md:h-4 md:w-4" />}
                {state === 'idle' && <Camera className="h-5 w-5 md:h-4 md:w-4" />}
            </Button>
        </div>
    )
}
