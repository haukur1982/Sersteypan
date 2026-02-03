'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Camera,
    CheckCircle,
    Circle,
    Package,
    Loader2,
    XCircle,
    Trash2,
    MapPin,
    Truck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { arriveAtSite, completeDelivery } from '@/lib/driver/delivery-actions'
import { confirmElementDelivered } from '@/lib/driver/qr-actions'
import { SignatureCanvas, type SignatureCanvasRef } from '@/components/shared/SignatureCanvas'
import { OpenInMapsButton } from '@/components/shared/OpenInMapsButton'
import type { Coordinates } from '@/lib/maps/types'
import Image from 'next/image'

interface DeliveryElement {
    id: string
    name: string
    status: string
    confirmedAt: string | null
}

interface DeliverPageClientProps {
    deliveryId: string
    deliveryStatus: string
    projectName: string
    elements: DeliveryElement[]
    companyName?: string
    deliveryAddress?: string
    projectCoordinates?: Coordinates | null
}

export function DeliverPageClient({
    deliveryId,
    deliveryStatus: initialStatus,
    projectName,
    elements: initialElements,
    companyName,
    deliveryAddress,
    projectCoordinates,
}: DeliverPageClientProps) {
    const router = useRouter()
    const supabase = createClient()
    const signatureRef = useRef<SignatureCanvasRef>(null)
    const [isPending, startTransition] = useTransition()

    // Track current delivery status locally for optimistic updates
    const [deliveryStatus, setDeliveryStatus] = useState(initialStatus)
    const [elements, setElements] = useState(initialElements)

    const [receivedByName, setReceivedByName] = useState('')
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasSignature, setHasSignature] = useState(false)
    const [confirmingElementId, setConfirmingElementId] = useState<string | null>(null)

    // Computed values
    const confirmedCount = elements.filter(e => e.confirmedAt !== null).length
    const allElementsConfirmed = confirmedCount === elements.length && elements.length > 0
    const canComplete = deliveryStatus === 'arrived' && allElementsConfirmed

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

    const handleMarkArrived = async () => {
        setError(null)
        startTransition(async () => {
            const result = await arriveAtSite(deliveryId)
            if (result.success) {
                setDeliveryStatus('arrived')
                router.refresh()
            } else {
                setError(result.error || 'Gat ekki merkt komu')
            }
        })
    }

    const handleConfirmElement = async (elementId: string) => {
        if (deliveryStatus !== 'arrived') {
            setError('Verður að merkja komu fyrst')
            return
        }

        setConfirmingElementId(elementId)
        setError(null)

        startTransition(async () => {
            const result = await confirmElementDelivered(deliveryId, elementId)
            if (result.success) {
                // Update local state optimistically
                setElements(prev => prev.map(e =>
                    e.id === elementId
                        ? { ...e, confirmedAt: new Date().toISOString() }
                        : e
                ))
            } else {
                setError(result.error || 'Gat ekki staðfest einingu')
            }
            setConfirmingElementId(null)
        })
    }

    const handleSubmit = async () => {
        if (!canComplete) {
            if (deliveryStatus !== 'arrived') {
                setError('Verður að merkja komu fyrst')
            } else if (!allElementsConfirmed) {
                setError('Vinsamlegast staðfestu allar einingar')
            }
            return
        }

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
            let photoUrl: string | undefined
            let signatureUrl: string | undefined

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
            const signatureBlob = await signatureRef.current?.toBlob()
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

            // Call proper server action to complete delivery
            const result = await completeDelivery(
                deliveryId,
                receivedByName.trim(),
                signatureUrl,
                photoUrl
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

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            planned: { label: 'Áætluð', className: 'bg-zinc-100 text-zinc-700' },
            loading: { label: 'Hleðsla', className: 'bg-blue-100 text-blue-700' },
            in_transit: { label: 'Á leið', className: 'bg-yellow-100 text-yellow-700' },
            arrived: { label: 'Komin', className: 'bg-green-100 text-green-700' },
            completed: { label: 'Lokið', className: 'bg-green-100 text-green-700' },
        }
        const config = statusConfig[status] || statusConfig.planned
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            {/* Delivery Info */}
            <Card className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="font-semibold text-zinc-900">{projectName}</h2>
                        {companyName && (
                            <p className="text-sm text-zinc-600">{companyName}</p>
                        )}
                        {deliveryAddress && (
                            <p className="text-sm text-zinc-500 mt-1">{deliveryAddress}</p>
                        )}
                    </div>
                    <StatusBadge status={deliveryStatus} />
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-zinc-600">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>{elements.length} einingar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{confirmedCount} staðfestar</span>
                    </div>
                </div>

                {/* Navigation Button */}
                <div className="mt-4 pt-3 border-t border-zinc-200">
                    <OpenInMapsButton
                        coordinates={projectCoordinates}
                        address={deliveryAddress}
                        variant="outline"
                        className="w-full"
                        label="Opna leiðsögn"
                    />
                </div>
            </Card>

            {/* Step 1: Mark Arrival (only show if in_transit) */}
            {deliveryStatus === 'in_transit' && (
                <Card className="p-4 border-yellow-200 bg-yellow-50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-yellow-700" />
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900">Skref 1: Merkja komu</h3>
                            <p className="text-sm text-zinc-600">Smelltu þegar þú ert komin/n á staðinn</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleMarkArrived}
                        disabled={isPending}
                        className="w-full"
                        variant="default"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Merkir komu...
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4 mr-2" />
                                Merkja komu á staðinn
                            </>
                        )}
                    </Button>
                </Card>
            )}

            {/* Step 2: Confirm Elements (show if arrived or later) */}
            {(deliveryStatus === 'arrived' || deliveryStatus === 'in_transit') && (
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            deliveryStatus === 'arrived' ? 'bg-green-200' : 'bg-zinc-200'
                        }`}>
                            <span className={`text-sm font-medium ${
                                deliveryStatus === 'arrived' ? 'text-green-700' : 'text-zinc-500'
                            }`}>2</span>
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900">Staðfesta einingar</h3>
                            <p className="text-sm text-zinc-600">
                                {deliveryStatus === 'in_transit'
                                    ? 'Merktu komu fyrst'
                                    : `${confirmedCount} af ${elements.length} staðfestar`
                                }
                            </p>
                        </div>
                    </div>
                    {elements.map((element) => {
                        const isConfirmed = element.confirmedAt !== null
                        const isConfirming = confirmingElementId === element.id
                        const canConfirm = deliveryStatus === 'arrived' && !isConfirmed

                        return (
                            <button
                                key={element.id}
                                onClick={() => canConfirm && handleConfirmElement(element.id)}
                                disabled={!canConfirm || isConfirming}
                                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    isConfirmed
                                        ? 'bg-green-50 border-green-200'
                                        : canConfirm
                                            ? 'bg-white border-zinc-200 hover:bg-zinc-50 cursor-pointer'
                                            : 'bg-zinc-50 border-zinc-200 opacity-60'
                                }`}
                            >
                                {isConfirming ? (
                                    <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                                ) : isConfirmed ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <Circle className="w-5 h-5 text-zinc-400" />
                                )}
                                <span className={`font-medium ${isConfirmed ? 'text-green-900' : 'text-zinc-900'}`}>
                                    {element.name}
                                </span>
                                {isConfirmed && (
                                    <span className="ml-auto text-xs text-green-600">Staðfest</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Step 3: Completion Form (only show if arrived and all elements confirmed) */}
            {deliveryStatus === 'arrived' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            allElementsConfirmed ? 'bg-green-200' : 'bg-zinc-200'
                        }`}>
                            <span className={`text-sm font-medium ${
                                allElementsConfirmed ? 'text-green-700' : 'text-zinc-500'
                            }`}>3</span>
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900">Ljúka afhendingu</h3>
                            <p className="text-sm text-zinc-600">
                                {allElementsConfirmed
                                    ? 'Fáðu undirskrift og ljúktu við'
                                    : 'Staðfestu allar einingar fyrst'
                                }
                            </p>
                        </div>
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
                            disabled={!allElementsConfirmed}
                        />
                    </div>

                    {/* Signature Canvas */}
                    <div className={!allElementsConfirmed ? 'opacity-50 pointer-events-none' : ''}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onSignatureChange={setHasSignature}
                        />
                    </div>

                    {/* Photo Upload */}
                    <div className={!allElementsConfirmed ? 'opacity-50 pointer-events-none' : ''}>
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
                                    disabled={!allElementsConfirmed}
                                />
                            </label>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Submit Button */}
            {deliveryStatus === 'arrived' && (
                <Button
                    size="lg"
                    className="w-full h-14"
                    disabled={isSubmitting || !canComplete}
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
            )}
        </div>
    )
}
