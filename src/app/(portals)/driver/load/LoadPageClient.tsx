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
import { createClient } from '@/lib/supabase/client'

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

interface LoadPageClientProps {
    initialDeliveryId?: string
}

export function LoadPageClient({ initialDeliveryId }: LoadPageClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const elementIdFromScan = searchParams.get('element')

    const [elements, setElements] = useState<LoadedElement[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [truckRegistration, setTruckRegistration] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const supabase = createClient()

    // Add element from QR scan
    const addElementById = useCallback(async (elementId: string) => {
        // Check if already added
        if (elements.some((e) => e.id === elementId)) {
            setError('Þessi eining er þegar á listanum')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('elements')
                .select(`
          id,
          name,
          status,
          weight_kg,
          project:projects(id, name)
        `)
                .eq('id', elementId)
                .single()

            if (fetchError || !data) {
                setError('Eining fannst ekki')
                setIsLoading(false)
                return
            }

            if (data.status !== 'ready') {
                setError(`Eining "${data.name}" er ekki tilbúin (staða: ${data.status})`)
                setIsLoading(false)
                return
            }

            setElements((prev) => [
                ...prev,
                {
                    id: data.id,
                    name: data.name,
                    status: data.status || 'planned',
                    weight_kg: data.weight_kg,
                    project: data.project as { id: string; name: string } | null,
                },
            ])
        } catch (err) {
            console.error('Error adding element:', err)
            setError('Villa við að bæta við einingu')
        } finally {
            setIsLoading(false)
        }
    }, [elements, supabase])

    // Check for element from URL (after QR scan)
    useEffect(() => {
        if (elementIdFromScan) {
            addElementById(elementIdFromScan)
            // Clear the URL param
            router.replace('/driver/load', { scroll: false })
        }
    }, [elementIdFromScan, addElementById, router])

    const removeElement = (elementId: string) => {
        setElements((prev) => prev.filter((e) => e.id !== elementId))
    }

    const totalWeight = elements.reduce((sum, e) => sum + (e.weight_kg || 0), 0)

    const createDelivery = async () => {
        if (elements.length === 0) {
            setError('Þú verður að bæta við að minnsta kosti einni einingu')
            return
        }

        if (!truckRegistration.trim()) {
            setError('Vinsamlegast sláðu inn bílnúmer')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            // Get project from first element (assume all same project for now)
            const projectId = elements[0]?.project?.id
            if (!projectId) {
                setError('Gat ekki fundið verkefni')
                setIsSubmitting(false)
                return
            }

            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                setError('Notandi ekki skráður inn')
                setIsSubmitting(false)
                return
            }

            // Create delivery
            const { data: delivery, error: deliveryError } = await supabase
                .from('deliveries')
                .insert({
                    project_id: projectId,
                    driver_id: user.id,
                    truck_registration: truckRegistration.trim().toUpperCase(),
                    status: 'loading',
                    planned_date: new Date().toISOString().split('T')[0],
                })
                .select()
                .single()

            if (deliveryError || !delivery) {
                console.error('Delivery creation error:', deliveryError)
                setError('Gat ekki búið til afhendingu')
                setIsSubmitting(false)
                return
            }

            // Add delivery items
            const deliveryItems = elements.map((e) => ({
                delivery_id: delivery.id,
                element_id: e.id,
            }))

            const { error: itemsError } = await supabase
                .from('delivery_items')
                .insert(deliveryItems)

            if (itemsError) {
                console.error('Delivery items error:', itemsError)
                setError('Gat ekki bætt við einingum')
                setIsSubmitting(false)
                return
            }

            // Update elements to "loaded" status
            const { error: updateError } = await supabase
                .from('elements')
                .update({ status: 'loaded' })
                .in(
                    'id',
                    elements.map((e) => e.id)
                )

            if (updateError) {
                console.error('Element update error:', updateError)
                // Don't fail entirely, delivery was created
            }

            // Navigate to delivery detail
            router.push(`/driver/deliveries/${delivery.id}`)
        } catch (err) {
            console.error('Create delivery error:', err)
            setError('Villa við að búa til afhendingu')
        } finally {
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
                />
            </Card>

            {/* Add Element Button */}
            <Button
                variant="outline"
                className="w-full h-14"
                onClick={() => router.push('/driver/scan')}
            >
                <QrCode className="w-5 h-5 mr-2" />
                Skanna einingu til að bæta við
                <Plus className="w-5 h-5 ml-2" />
            </Button>

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
                                    onClick={() => removeElement(element.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                onClick={createDelivery}
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
