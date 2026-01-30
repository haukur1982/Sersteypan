'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react'

interface ElementPosition {
    id: string
    element_id: string
    x_percent: number
    y_percent: number
    rotation_degrees: number | null
    label: string | null
    element: {
        id: string
        name: string
        status: string | null
        element_type: string
    } | null
}

interface FloorPlan {
    id: string
    name: string | null
    floor: number
    plan_image_url: string
    element_positions: ElementPosition[]
}

interface FloorPlanViewerProps {
    floorPlans: FloorPlan[]
}

const statusColors: Record<string, string> = {
    planned: 'bg-zinc-400',
    rebar: 'bg-yellow-500',
    cast: 'bg-orange-500',
    curing: 'bg-amber-500',
    ready: 'bg-green-500',
    loaded: 'bg-blue-500',
    delivered: 'bg-emerald-600',
}

const statusLabels: Record<string, string> = {
    planned: 'Áætlað',
    rebar: 'Járnabinding',
    cast: 'Steypt',
    curing: 'Þornar',
    ready: 'Tilbúið',
    loaded: 'Hlaðið',
    delivered: 'Afhent',
}

export function FloorPlanViewer({ floorPlans }: FloorPlanViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedElement, setSelectedElement] = useState<ElementPosition | null>(null)

    const currentPlan = floorPlans[currentIndex]

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : floorPlans.length - 1))
        setSelectedElement(null)
    }

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < floorPlans.length - 1 ? prev + 1 : 0))
        setSelectedElement(null)
    }

    const handlePinClick = (position: ElementPosition) => {
        setSelectedElement(position)
    }

    if (!currentPlan) return null

    return (
        <div className="space-y-4">
            {/* Floor Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={goToPrevious}
                        disabled={floorPlans.length <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium px-4">
                        {currentPlan.name || `Hæð ${currentPlan.floor}`}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={goToNext}
                        disabled={floorPlans.length <= 1}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                    {currentIndex + 1} / {floorPlans.length}
                </div>
            </div>

            {/* Floor Plan with Pins */}
            <Card className="relative overflow-hidden bg-muted/30">
                <div className="relative aspect-[4/3] w-full">
                    <Image
                        src={currentPlan.plan_image_url}
                        alt={currentPlan.name || `Floor ${currentPlan.floor}`}
                        fill
                        className="object-contain"
                        priority
                    />

                    {/* Element Pins */}
                    {currentPlan.element_positions.map((pos) => {
                        const status = pos.element?.status || 'planned'
                        const pinColor = statusColors[status] || 'bg-zinc-400'

                        return (
                            <button
                                key={pos.id}
                                onClick={() => handlePinClick(pos)}
                                className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-125 z-10`}
                                style={{
                                    left: `${pos.x_percent}%`,
                                    top: `${pos.y_percent}%`,
                                }}
                                title={pos.element?.name || pos.label || 'Element'}
                            >
                                <div className={`${pinColor} rounded-full p-1 shadow-lg border-2 border-white`}>
                                    <MapPin className="h-4 w-4 text-white" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(statusLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${statusColors[key]}`} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                ))}
            </div>

            {/* Element Details Popup */}
            {selectedElement && selectedElement.element && (
                <Card className="fixed bottom-4 right-4 p-4 shadow-xl z-50 w-80 animate-in slide-in-from-bottom-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">
                                {selectedElement.element.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {selectedElement.element.element_type}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedElement(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-3">
                        <Badge
                            className={`${statusColors[selectedElement.element.status || 'planned']} text-white`}
                        >
                            {statusLabels[selectedElement.element.status || 'planned']}
                        </Badge>
                    </div>
                    {selectedElement.label && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Merking: {selectedElement.label}
                        </p>
                    )}
                </Card>
            )}
        </div>
    )
}
