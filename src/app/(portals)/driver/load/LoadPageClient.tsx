'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Package,
    Trash2,
    QrCode,
    Truck,
    CheckCircle,
    Loader2,
    Plus,
    AlertCircle,
} from 'lucide-react'
import { createDelivery } from '@/lib/driver/delivery-actions'
import { lookupElementByQR, addElementToDelivery, removeElementFromDelivery } from '@/lib/driver/qr-actions'

interface LoadedElement {
    id: string
    name: string
    status: string
    weight_kg: number | null
    project: {
        id: string
        name: string
    } | null
}

export function LoadPageClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const elementIdFromScan = searchParams.get('element')

    const [elements, setElements] = useState<LoadedElement[]>([])
    const [deliveryId, setDeliveryId] = useState<string | null>(null)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [truckRegistration, setTruckRegistration] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Add element from QR scan
    const addElementById = useCallback(async (elementId: string) => {
        // Check if already added
        if (elements.some((e) => e.id === elementId)) {
            setError('Þessi eining er þegar á listanum')
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            // Use server action to lookup and validate element
            const lookupResult = await lookupElementByQR(elementId)

            if (lookupResult.error || !lookupResult.element) {
                setError(lookupResult.error || 'Eining fannst ekki')
                setIsLoading(false)
                return
            }

            const element = lookupResult.element

            // Check project consistency (all elements must be from same project)
            if (projectId && element.project?.id !== projectId) {
                setError(`Þessi eining er frá öðru verkefni. Allar einingar verða að vera frá sama verkefni.`)
                setIsLoading(false)
                return
            }

            // If we have an active delivery, add element to it
            if (deliveryId) {
                const addResult = await addElementToDelivery(deliveryId, element.id)

                if (addResult.error) {
                    setError(addResult.error)
                    setIsLoading(false)
                    return
                }

                setSuccess(`${addResult.elementName || element.name} bætt við!`)
            }

            // Add to local state
            setElements((prev) => [
                ...prev,
                {
                    id: element.id,
                    name: element.name,
                    status: element.status || 'planned',
                    weight_kg: element.weight_kg || null,
                    project: element.project as { id: string; name: string } | null,
                },
            ])

            // Set project ID from first element
            if (!projectId && element.project?.id) {
                setProjectId(element.project.id)
            }
        } catch (err) {
            console.error('Error adding element:', err)
            setError('Villa við að bæta við einingu')
        } finally {
            setIsLoading(false)
        }
    }, [elements, deliveryId, projectId])

    // Check for element from URL (after QR scan)
    useEffect(() => {
        if (elementIdFromScan) {
            addElementById(elementIdFromScan)
            // Clear the URL param
            router.replace('/driver/load', { scroll: false })
        }
    }, [elementIdFromScan, addElementById, router])

    const handleRemoveElement = async (element: LoadedElement) => {
        // If delivery exists, use server action to remove
        if (deliveryId) {
            const result = await removeElementFromDelivery(deliveryId, element.id)
            if (result.error) {
                setError(result.error)
                return
            }
            setSuccess(`${element.name} fjarlægt`)
        }

        // Remove from local state
        setElements((prev) => prev.filter((e) => e.id !== element.id))

        // If no elements left, clear project and delivery
        if (elements.length === 1) {
            setProjectId(null)
            setDeliveryId(null)
        }
    }

    const totalWeight = elements.reduce((sum, e) => sum + (e.weight_kg || 0), 0)

    const handleCreateDelivery = async () => {
        if (elements.length === 0) {
            setError('Þú verður að bæta við að minnsta kosti einni einingu')
            return
        }

        if (!truckRegistration.trim()) {
            setError('Vinsamlegast sláðu inn bílnúmer')
            return
        }

        if (!projectId) {
            setError('Gat ekki fundið verkefni')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        try {
            // Create delivery using server action
            const formData = new FormData()
            formData.append('projectId', projectId)
            formData.append('truckRegistration', truckRegistration.trim())
            formData.append('plannedDate', new Date().toISOString().split('T')[0])

            const result = await createDelivery(formData)

            if (result.error || !result.deliveryId) {
                setError(result.error || 'Gat ekki búið til afhendingu')
                setIsSubmitting(false)
                return
            }

            const newDeliveryId = result.deliveryId
            setDeliveryId(newDeliveryId)

            // Add all elements to the delivery using server actions
            let successCount = 0
            for (const element of elements) {
                const addResult = await addElementToDelivery(newDeliveryId, element.id)
                if (addResult.success) {
                    successCount++
                } else {
                    console.error(`Failed to add element ${element.name}:`, addResult.error)
                    setError(`Villa við að bæta við ${element.name}: ${addResult.error}`)
                    // Continue with others
                }
            }

            if (successCount === elements.length) {
                // All elements added successfully - navigate to delivery detail
                router.push(`/driver/deliveries/${newDeliveryId}`)
            } else {
                setError(`Aðeins ${successCount} af ${elements.length} einingar bættust við`)
                setIsSubmitting(false)
            }
        } catch (err) {
            console.error('Create delivery error:', err)
            setError('Villa við að búa til afhendingu')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Truck Registration */}
            <Card className="p-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Bílnúmer
                </label>
                <Input
                    placeholder="ABC123"
                    value={truckRegistration}
                    onChange={(e) => setTruckRegistration(e.target.value.toUpperCase())}
                    className="text-lg font-mono"
                    maxLength={10}
                    disabled={!!deliveryId}
                />
            </Card>

            {/* Add Element Button */}
            <Button
                variant="outline"
                className="w-full h-14"
                onClick={() => router.push('/driver/scan')}
                disabled={isSubmitting}
            >
                <QrCode className="w-5 h-5 mr-2" />
                Skanna einingu til að bæta við
                <Plus className="w-5 h-5 ml-2" />
            </Button>

            {/* Success Message */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Loaded Elements List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Einingar á bíl ({elements.length})
                    </h2>
                    {totalWeight > 0 && (
                        <span className="text-sm text-zinc-600">
                            {totalWeight.toLocaleString()} kg
                        </span>
                    )}
                </div>

                {elements.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Package className="w-12 h-12 mx-auto text-zinc-300" />
                        <p className="text-zinc-500 mt-3">Engar einingar á bíl</p>
                        <p className="text-sm text-zinc-400">
                            Skannaðu QR kóða til að bæta við einingu
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {elements.map((element) => (
                            <Card
                                key={element.id}
                                className="p-4 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-900">{element.name}</p>
                                        <p className="text-sm text-zinc-500">
                                            {element.project?.name}
                                            {element.weight_kg && ` • ${element.weight_kg} kg`}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveElement(element)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={isSubmitting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Delivery Button */}
            <Button
                size="lg"
                className="w-full h-14"
                disabled={elements.length === 0 || !truckRegistration.trim() || isSubmitting}
                onClick={handleCreateDelivery}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Býr til afhendingu...
                    </>
                ) : (
                    <>
                        <Truck className="w-5 h-5 mr-2" />
                        Hefja afhendingu ({elements.length} einingar)
                    </>
                )}
            </Button>
        </div>
    )
}
