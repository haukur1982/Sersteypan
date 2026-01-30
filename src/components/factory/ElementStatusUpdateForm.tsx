'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    Loader2,
    CheckCheck
} from 'lucide-react'
import { updateElementStatus } from '@/lib/elements/actions'
import { PhotoUploadForm } from '@/components/shared/PhotoUploadForm'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' },
    delivered: { icon: CheckCheck, label: 'Afhent', color: 'bg-purple-100 text-purple-800' }
}

type ElementStatus = keyof typeof statusConfig
type PhotoStage =
    | 'rebar'
    | 'cast'
    | 'curing'
    | 'ready'
    | 'loaded'
    | 'before_delivery'
    | 'after_delivery'

const stageByStatus: Record<ElementStatus, PhotoStage | null> = {
    planned: null,
    rebar: 'rebar',
    cast: 'cast',
    curing: 'curing',
    ready: 'ready',
    loaded: 'loaded',
    delivered: 'after_delivery',
}

// Define valid transitions
const validTransitions: Record<string, string[]> = {
    planned: ['rebar'],
    rebar: ['cast'],
    cast: ['curing'],
    curing: ['ready'],
    ready: ['loaded'],
    loaded: ['delivered', 'ready'], // Can unload back to ready
    delivered: [] // Final state
}

interface ElementStatusUpdateFormProps {
    element: {
        id: string
        name: string
        status: string | null
    }
}

export function ElementStatusUpdateForm({ element }: ElementStatusUpdateFormProps) {
    const router = useRouter()
    const [selectedStatus, setSelectedStatus] = useState<ElementStatus>((element.status as ElementStatus) || 'planned')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const currentStatus = (element.status || 'planned') as ElementStatus
    const allowedNextStatuses = validTransitions[currentStatus] || []
    const uploadStage = stageByStatus[selectedStatus]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (selectedStatus === currentStatus) {
            setError('Veldu nýja stöðu til að uppfæra')
            return
        }

        setIsSubmitting(true)
        setError(null)
        setSuccess(false)

        try {
            const result = await updateElementStatus(element.id, selectedStatus, notes.trim() || undefined)

            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setNotes('')
                // Refresh the page to show updated data
                router.refresh()

                // Reset success message after 3 seconds
                setTimeout(() => setSuccess(false), 3000)
            }
        } catch (err) {
            setError('Villa kom upp við uppfærslu')
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="status">Ný staða (New Status)</Label>
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ElementStatus)}>
                    <SelectTrigger id="status" className="w-full mt-1.5">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Current status */}
                        <SelectItem value={currentStatus} disabled>
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const config = statusConfig[currentStatus as keyof typeof statusConfig]
                                    const Icon = config.icon
                                    return (
                                        <>
                                            <Icon className="w-4 h-4" />
                                            <span>{config.label}</span>
                                            <Badge variant="secondary" className="ml-2 text-xs">Núverandi</Badge>
                                        </>
                                    )
                                })()}
                            </div>
                        </SelectItem>

                        {/* Allowed next statuses */}
                        {allowedNextStatuses.map((status) => {
                            const config = statusConfig[status as keyof typeof statusConfig]
                            const Icon = config.icon
                            return (
                                <SelectItem key={status} value={status}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span>{config.label}</span>
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                {allowedNextStatuses.length === 0 && (
                    <p className="text-sm text-zinc-500 mt-2">
                        {currentStatus === 'delivered'
                            ? 'Eining er í lokastöðu (Element is in final state)'
                            : 'Engar gildar færslur (No valid transitions)'}
                    </p>
                )}
            </div>

            {selectedStatus !== currentStatus && (
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="notes">Athugasemdir (Notes) - Valfrjálst</Label>
                        <Textarea
                            id="notes"
                            placeholder="T.d. gæðaathugun lokið, smávægilegir gallar..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1.5"
                            rows={3}
                        />
                    </div>

                    {uploadStage && (
                        <div className="pt-2">
                            <Label className="mb-2 block">Myndir fyrir {statusConfig[selectedStatus]?.label}</Label>
                            <PhotoUploadForm
                                elementId={element.id}
                                stage={uploadStage}
                                onUploadError={(err: string) => setError(err)}
                            />
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Staða uppfærð!
                    </p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <Button
                    type="submit"
                    disabled={isSubmitting || selectedStatus === currentStatus || allowedNextStatuses.length === 0}
                    className="flex-1"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uppfærir...
                        </>
                    ) : (
                        'Uppfæra stöðu'
                    )}
                </Button>
            </div>
        </form>
    )
}
