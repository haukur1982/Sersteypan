'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Camera,
    CheckCircle,
    Package,
    Loader2,
    XCircle,
    Pen,
    Upload,
    Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { quickCompleteDelivery } from '@/lib/driver/complete-delivery-action'
import Image from 'next/image'

interface DeliveryElement {
    id: string
    name: string
    status: string
}

interface DeliverPageClientProps {
    deliveryId: string
    projectName: string
    elements: DeliveryElement[]
    companyName?: string
    deliveryAddress?: string
}

export function DeliverPageClient({
    deliveryId,
    projectName,
    elements,
    companyName,
    deliveryAddress,
}: DeliverPageClientProps) {
    const router = useRouter()
    const supabase = createClient()

    const [receivedByName, setReceivedByName] = useState('')
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Signature canvas
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    // Initialize signature canvas
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        canvas.width = canvas.offsetWidth
        canvas.height = 150

        // Set drawing style
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }, [])

    const getCanvasCoords = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            }
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        }
    }

    const startDrawing = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) return

        e.preventDefault()
        setIsDrawing(true)
        setHasSignature(true)

        const { x, y } = getCanvasCoords(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) return

        e.preventDefault()
        const { x, y } = getCanvasCoords(e)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setHasSignature(false)
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Vinsamlegast veldu mynd')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Mynd má ekki vera stærri en 10MB')
            return
        }

        setPhotoFile(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    const removePhoto = () => {
        setPhotoFile(null)
        if (photoPreview) {
            URL.revokeObjectURL(photoPreview)
            setPhotoPreview(null)
        }
    }

    const handleSubmit = async () => {
        if (!receivedByName.trim()) {
            setError('Vinsamlegast sláðu inn nafn móttakanda')
            return
        }

        if (!hasSignature) {
            setError('Vinsamlegast fáðu undirskrift móttakanda')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            let photoUrl: string | null = null
            let signatureUrl: string | null = null

            // Upload photo if provided
            if (photoFile) {
                const photoPath = `deliveries/${deliveryId}/photo-${Date.now()}.jpg`
                const { error: photoError } = await supabase.storage
                    .from('delivery-photos')
                    .upload(photoPath, photoFile)

                if (!photoError) {
                    const { data: urlData } = supabase.storage
                        .from('delivery-photos')
                        .getPublicUrl(photoPath)
                    photoUrl = urlData.publicUrl
                }
            }

            // Upload signature
            const canvas = canvasRef.current
            if (canvas) {
                const signatureBlob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob(resolve, 'image/png')
                })

                if (signatureBlob) {
                    const signaturePath = `deliveries/${deliveryId}/signature-${Date.now()}.png`
                    const { error: sigError } = await supabase.storage
                        .from('signatures')
                        .upload(signaturePath, signatureBlob)

                    if (!sigError) {
                        const { data: urlData } = supabase.storage
                            .from('signatures')
                            .getPublicUrl(signaturePath)
                        signatureUrl = urlData.publicUrl
                    }
                }
            }

            // Call server action to complete delivery
            const result = await quickCompleteDelivery(
                deliveryId,
                receivedByName.trim(),
                signatureUrl || undefined,
                photoUrl || undefined
            )

            if (!result.success) {
                setError(result.error || 'Villa við að staðfesta afhendingu')
                setIsSubmitting(false)
                return
            }

            // Success - navigate back
            router.push('/driver')
        } catch (err) {
            console.error('Submit error:', err)
            setError('Villa við að staðfesta afhendingu')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Delivery Info */}
            <Card className="p-4">
                <h2 className="font-semibold text-zinc-900">{projectName}</h2>
                {companyName && (
                    <p className="text-sm text-zinc-600">{companyName}</p>
                )}
                {deliveryAddress && (
                    <p className="text-sm text-zinc-500 mt-1">{deliveryAddress}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
                    <Package className="w-4 h-4" />
                    <span>{elements.length} einingar</span>
                </div>
            </Card>

            {/* Elements List */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-700">Einingar til afhendingar</h3>
                {elements.map((element) => (
                    <div
                        key={element.id}
                        className="flex items-center gap-3 bg-white rounded-lg border border-zinc-200 p-3"
                    >
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-zinc-900">{element.name}</span>
                    </div>
                ))}
            </div>

            {/* Receiver Name */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Nafn móttakanda *
                </label>
                <Input
                    placeholder="Fullt nafn"
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    className="text-lg"
                />
            </div>

            {/* Signature Canvas */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-700">
                        Undirskrift móttakanda *
                    </label>
                    {hasSignature && (
                        <button
                            onClick={clearSignature}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            Hreinsa
                        </button>
                    )}
                </div>
                <div className="border-2 border-dashed border-zinc-300 rounded-lg p-1 bg-white">
                    <canvas
                        ref={canvasRef}
                        className="w-full cursor-crosshair touch-none"
                        style={{ height: 150 }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Pen className="w-3 h-3" />
                    Teiknaðu undirskrift með fingri eða mús
                </p>
            </div>

            {/* Photo Upload */}
            <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Mynd af afhendingu (valfrjálst)
                </label>

                {photoPreview ? (
                    <div className="relative">
                        <Image
                            src={photoPreview}
                            alt="Delivery photo"
                            width={400}
                            height={300}
                            className="rounded-lg object-cover w-full"
                        />
                        <button
                            onClick={removePhoto}
                            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50">
                        <Camera className="w-8 h-8 text-zinc-400" />
                        <span className="text-sm text-zinc-500 mt-2">Smelltu til að taka mynd</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Submit Button */}
            <Button
                size="lg"
                className="w-full h-14"
                disabled={isSubmitting}
                onClick={handleSubmit}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Staðfesti afhendingu...
                    </>
                ) : (
                    <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Staðfesta afhendingu
                    </>
                )}
            </Button>
        </div>
    )
}
