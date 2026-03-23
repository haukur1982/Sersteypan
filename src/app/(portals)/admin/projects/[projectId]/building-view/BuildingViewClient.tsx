'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, X, Layers, Building2 } from 'lucide-react'
import { ElementBuildingView } from '@/components/building-view/ElementBuildingView'
import { StackedBuildingView } from '@/components/building-view/StackedBuildingView'
import type { PositionedElement, FloorGeometry } from '@/lib/building-view/queries'

interface FloorData {
  floor: number
  buildingId: string | null
  geometry: FloorGeometry | null
  elements: PositionedElement[]
  boundingWidth: number
  boundingHeight: number
}

interface BuildingViewClientProps {
  floors: FloorData[]
  buildingNames: Record<string, string>
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Skipulagt',
  rebar: 'Járnabinding',
  cast: 'Steypt',
  curing: 'Þornar',
  ready: 'Tilbúið',
  loaded: 'Hlaðið',
  delivered: 'Afhent',
  verified: 'Staðfest',
}

export function BuildingViewClient({
  floors,
  buildingNames,
}: BuildingViewClientProps) {
  const [viewMode, setViewMode] = useState<'single' | 'stacked'>(
    floors.length > 1 ? 'stacked' : 'single'
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<PositionedElement | null>(null)

  const currentFloor = floors[currentIndex]

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : floors.length - 1))
    setSelectedElement(null)
  }, [floors.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < floors.length - 1 ? prev + 1 : 0))
    setSelectedElement(null)
  }, [floors.length])

  const handleElementClick = useCallback((element: PositionedElement) => {
    setSelectedElement(element)
  }, [])

  // Total status breakdown across all floors (for stacked view)
  const totalStatusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of floors) {
      for (const el of f.elements) {
        const s = el.status ?? 'planned'
        counts[s] = (counts[s] ?? 0) + 1
      }
    }
    return counts
  }, [floors])

  const totalElements = useMemo(
    () => floors.reduce((sum, f) => sum + f.elements.length, 0),
    [floors]
  )

  if (!currentFloor) return null

  const buildingName = currentFloor.buildingId
    ? buildingNames[currentFloor.buildingId]
    : null

  // Status breakdown for current floor (single view)
  const statusBreakdown: Record<string, number> = {}
  for (const el of currentFloor.elements) {
    const s = el.status ?? 'planned'
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle + navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          {floors.length > 1 && (
            <div className="flex items-center rounded-lg border border-zinc-200 p-0.5">
              <Button
                variant={viewMode === 'stacked' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setViewMode('stacked')}
              >
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Allar hæðir
              </Button>
              <Button
                variant={viewMode === 'single' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setViewMode('single')}
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Ein hæð
              </Button>
            </div>
          )}

          {/* Floor navigation (single view only) */}
          {viewMode === 'single' && (
            <>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevious} disabled={floors.length <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-2">
                <span className="text-sm font-medium">
                  {currentFloor.floor}. hæð
                  {buildingName && <span className="text-muted-foreground"> — {buildingName}</span>}
                </span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext} disabled={floors.length <= 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'stacked' ? (
            <>
              <span className="text-sm text-muted-foreground">{floors.length} hæðir</span>
              <span className="text-sm text-muted-foreground">{totalElements} einingar</span>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">{currentIndex + 1} / {floors.length} hæðir</span>
              <span className="text-sm text-muted-foreground">{currentFloor.elements.length} einingar</span>
            </>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(viewMode === 'stacked' ? totalStatusBreakdown : statusBreakdown).map(([status, count]) => (
          <Badge key={status} variant="secondary" className="text-xs">
            {STATUS_LABELS[status] ?? status}: {count}
          </Badge>
        ))}
      </div>

      {/* Building view */}
      {viewMode === 'stacked' ? (
        <StackedBuildingView
          floors={floors}
          onElementClick={handleElementClick}
        />
      ) : (
        <>
          <ElementBuildingView
            elements={currentFloor.elements}
            boundingWidth={currentFloor.boundingWidth}
            boundingHeight={currentFloor.boundingHeight}
            geometry={currentFloor.geometry}
            onElementClick={handleElementClick}
          />

          {/* Quick floor selector */}
          {floors.length > 2 && (
            <div className="flex items-center gap-1 justify-center">
              {floors.map((f, i) => (
                <Button
                  key={`floor-${f.floor}-${i}`}
                  variant={i === currentIndex ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => { setCurrentIndex(i); setSelectedElement(null) }}
                >
                  {f.floor}
                </Button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Element detail popup */}
      {selectedElement && (
        <Card className="fixed bottom-4 right-4 p-4 shadow-xl z-50 w-80 animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{selectedElement.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedElement.element_type}</p>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <Badge variant="secondary">
              {STATUS_LABELS[selectedElement.status ?? 'planned'] ?? 'Skipulagt'}
            </Badge>
            {selectedElement.length_mm && selectedElement.width_mm && (
              <p className="text-sm text-muted-foreground">
                {selectedElement.length_mm} × {selectedElement.width_mm}
                {selectedElement.height_mm ? ` × ${selectedElement.height_mm}` : ''} mm
              </p>
            )}
            {selectedElement.weight_kg && (
              <p className="text-sm text-muted-foreground">
                {selectedElement.weight_kg.toLocaleString('is-IS')} kg
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
