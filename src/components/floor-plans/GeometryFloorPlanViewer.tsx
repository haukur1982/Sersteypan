'use client'

import { useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────

interface WallSegment {
  id: string
  x1Mm: number
  y1Mm: number
  x2Mm: number
  y2Mm: number
  thicknessMm: number
  wallType: 'outer' | 'inner' | 'sandwich'
}

interface FloorZone {
  id: string
  name?: string
  points: Array<{ xMm: number; yMm: number }>
  zoneType: 'interior' | 'balcony'
}

interface FloorGeometryData {
  boundingWidthMm: number
  boundingHeightMm: number
  wallSegments: WallSegment[]
  floorZones: FloorZone[]
}

interface FloorElement {
  id: string
  name: string
  status: string | null
  element_type: string
  position_x_mm?: number | null
  position_y_mm?: number | null
  rotation_deg?: number | null
  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  weight_kg?: number | null
  x_percent?: number | null
  y_percent?: number | null
}

export interface FloorPlanData {
  id: string
  name: string | null
  floor: number
  plan_image_url: string | null
  geometry?: FloorGeometryData | null
  elements: FloorElement[]
}

interface GeometryFloorPlanViewerProps {
  floorPlans: FloorPlanData[]
}

// ── Status colors ──────────────────────────────────────────

const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string; tw: string }> = {
  planned: { fill: '#e4e4e7', stroke: '#71717a', label: 'Skipulagt', tw: 'bg-zinc-400' },
  rebar: { fill: '#fef08a', stroke: '#ca8a04', label: 'Járnabinding', tw: 'bg-yellow-500' },
  cast: { fill: '#fed7aa', stroke: '#ea580c', label: 'Steypt', tw: 'bg-orange-500' },
  curing: { fill: '#fde68a', stroke: '#d97706', label: 'Þornar', tw: 'bg-amber-500' },
  ready: { fill: '#bbf7d0', stroke: '#16a34a', label: 'Tilbúið', tw: 'bg-green-500' },
  loaded: { fill: '#bfdbfe', stroke: '#2563eb', label: 'Hlaðið', tw: 'bg-blue-500' },
  delivered: { fill: '#a7f3d0', stroke: '#059669', label: 'Afhent', tw: 'bg-emerald-600' },
  verified: { fill: '#c4b5fd', stroke: '#7c3aed', label: 'Staðfest', tw: 'bg-violet-500' },
}

const HIGHLIGHT_FILL = '#dbeafe'
const HIGHLIGHT_STROKE = '#3b82f6'

// SVG constants
const PADDING = 80
const SLAB_OUTLINE_COLOR = '#d4d4d8'
const WALL_OUTER_COLOR = '#52525b'
const WALL_INNER_COLOR = '#a1a1aa'
const WALL_SANDWICH_COLOR = '#3f3f46'

function getWallColor(wall: WallSegment) {
  switch (wall.wallType) {
    case 'outer': return WALL_OUTER_COLOR
    case 'sandwich': return WALL_SANDWICH_COLOR
    case 'inner': return WALL_INNER_COLOR
    default: return WALL_OUTER_COLOR
  }
}

function getWallStrokeWidth(wall: WallSegment) {
  return Math.max(2, wall.thicknessMm / 60)
}

function getStatusColors(status: string | null) {
  return STATUS_COLORS[status ?? 'planned'] ?? STATUS_COLORS.planned
}

// ── Main Component ─────────────────────────────────────────

export function GeometryFloorPlanViewer({ floorPlans }: GeometryFloorPlanViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedElement, setSelectedElement] = useState<FloorElement | null>(null)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)

  const currentPlan = floorPlans[currentIndex]

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : floorPlans.length - 1))
    setSelectedElement(null)
    setHoveredElementId(null)
  }, [floorPlans.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < floorPlans.length - 1 ? prev + 1 : 0))
    setSelectedElement(null)
    setHoveredElementId(null)
  }, [floorPlans.length])

  const handleElementClick = useCallback((el: FloorElement) => {
    setSelectedElement(el)
  }, [])

  const statusCounts = useMemo(() => {
    if (!currentPlan) return {}
    const counts: Record<string, number> = {}
    for (const el of currentPlan.elements) {
      const status = el.status ?? 'planned'
      counts[status] = (counts[status] ?? 0) + 1
    }
    return counts
  }, [currentPlan])

  const hasGeometry = !!(
    currentPlan?.geometry &&
    (currentPlan.geometry.wallSegments.length > 0 || currentPlan.geometry.floorZones.length > 0)
  )

  if (!currentPlan) return null

  return (
    <div className="space-y-4">
      {/* Floor Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious} disabled={floorPlans.length <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-4">
            {currentPlan.name || `Hæð ${currentPlan.floor}`}
          </span>
          <Button variant="outline" size="icon" onClick={goToNext} disabled={floorPlans.length <= 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {currentPlan.elements.length} einingar
          </span>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {floorPlans.length}
          </span>
        </div>
      </div>

      {/* Render geometry SVG or image-based plan */}
      {hasGeometry ? (
        <GeometrySvgView
          plan={currentPlan}
          hoveredElementId={hoveredElementId}
          onHover={setHoveredElementId}
          onElementClick={handleElementClick}
          statusCounts={statusCounts}
        />
      ) : currentPlan.plan_image_url ? (
        <ImagePlanView plan={currentPlan} onElementClick={handleElementClick} />
      ) : (
        <Card className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Engin hæðarteikning til staðar
        </Card>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([key, { fill, stroke, label }]) => {
          const count = statusCounts[key]
          if (!count) return null
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: fill, border: `1.5px solid ${stroke}` }} />
              <span className="text-xs text-muted-foreground">{label} ({count})</span>
            </div>
          )
        })}
      </div>

      {/* Quick floor selector */}
      {floorPlans.length > 2 && (
        <div className="flex items-center gap-1 justify-center">
          {floorPlans.map((f, i) => (
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

      {/* Element Detail Popup */}
      {selectedElement && (
        <Card className="fixed bottom-4 right-4 p-4 shadow-xl z-50 w-80 animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{selectedElement.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedElement.element_type}</p>
            </div>
            <button onClick={() => setSelectedElement(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant="outline"
              style={{
                backgroundColor: getStatusColors(selectedElement.status).fill,
                color: getStatusColors(selectedElement.status).stroke,
                borderColor: getStatusColors(selectedElement.status).stroke,
              }}
            >
              {getStatusColors(selectedElement.status).label}
            </Badge>
          </div>
          {selectedElement.length_mm && selectedElement.width_mm && (
            <p className="text-sm text-muted-foreground mt-2">
              {selectedElement.length_mm} × {selectedElement.width_mm}
              {selectedElement.height_mm ? ` × ${selectedElement.height_mm}` : ''} mm
            </p>
          )}
          {selectedElement.weight_kg && (
            <p className="text-sm text-muted-foreground">
              {selectedElement.weight_kg.toLocaleString('is-IS')} kg
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Geometry SVG Sub-Component ─────────────────────────────

function GeometrySvgView({
  plan,
  hoveredElementId,
  onHover,
  onElementClick,
  statusCounts,
}: {
  plan: FloorPlanData
  hoveredElementId: string | null
  onHover: (id: string | null) => void
  onElementClick: (el: FloorElement) => void
  statusCounts: Record<string, number>
}) {
  const geo = plan.geometry!
  const boundingWidth = geo.boundingWidthMm
  const boundingHeight = geo.boundingHeightMm

  const toSvgY = useCallback((archY: number) => boundingHeight - archY, [boundingHeight])

  const viewBox = useMemo(() => {
    const w = boundingWidth + PADDING * 2
    const h = boundingHeight + PADDING * 2
    return `${-PADDING} ${-PADDING} ${w} ${h}`
  }, [boundingWidth, boundingHeight])

  const labelSize = Math.max(60, Math.min(160, boundingWidth / 60))

  const positionedElements = useMemo(
    () => plan.elements.filter(el => el.position_x_mm != null && el.position_y_mm != null),
    [plan.elements]
  )

  const hoveredEl = plan.elements.find(el => el.id === hoveredElementId)

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <TransformWrapper initialScale={1} minScale={0.3} maxScale={8} centerOnInit wheel={{ step: 0.08 }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-white/90" onClick={() => zoomIn()}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-white/90" onClick={() => zoomOut()}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-white/90" onClick={() => resetTransform()}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>

            {/* Element count badge */}
            <div className="absolute top-3 left-3 z-10 bg-white/90 border border-zinc-200 rounded-md px-2 py-1 text-xs text-zinc-600">
              {positionedElements.length} einingar staðsettar
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%', minHeight: '500px' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <svg viewBox={viewBox} className="w-full h-full" style={{ minHeight: '500px' }}>
                {/* Layer 0: Floor zones */}
                {geo.floorZones.map((zone) => {
                  const pointsStr = zone.points.map(p => `${p.xMm},${toSvgY(p.yMm)}`).join(' ')
                  const isBalcony = zone.zoneType === 'balcony'
                  return (
                    <polygon
                      key={`zone-${zone.id}`}
                      points={pointsStr}
                      fill={isBalcony ? '#dbeafe' : '#fafafa'}
                      fillOpacity={0.4}
                      stroke="#e4e4e7"
                      strokeWidth="1"
                      strokeDasharray={isBalcony ? '8 4' : 'none'}
                    />
                  )
                })}

                {/* Layer 1: Bounding box */}
                <rect
                  x={0} y={toSvgY(boundingHeight)}
                  width={boundingWidth} height={boundingHeight}
                  fill="none" stroke={SLAB_OUTLINE_COLOR} strokeWidth={2} strokeDasharray="12 6"
                />

                {/* Layer 2: Positioned element rectangles */}
                {positionedElements.map((el) => {
                  const isHovered = hoveredElementId === el.id
                  const { fill, stroke } = isHovered
                    ? { fill: HIGHLIGHT_FILL, stroke: HIGHLIGHT_STROKE }
                    : getStatusColors(el.status)

                  const rot = el.rotation_deg ?? 0
                  const elLength = el.length_mm ?? 0
                  const elWidth = el.width_mm ?? 0
                  const isVertical = rot >= 45 && rot <= 135
                  const rectW = isVertical ? elWidth : elLength
                  const rectH = isVertical ? elLength : elWidth
                  const svgX = el.position_x_mm!
                  const svgY = toSvgY(el.position_y_mm! + rectH)

                  return (
                    <g
                      key={`el-${el.id}`}
                      onMouseEnter={() => onHover(el.id)}
                      onMouseLeave={() => onHover(null)}
                      onClick={() => onElementClick(el)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={svgX} y={svgY} width={rectW} height={rectH}
                        fill={fill} fillOpacity={isHovered ? 0.9 : 0.65}
                        stroke={stroke} strokeWidth={isHovered ? 3 : 1.5} rx={3}
                      />
                      {rectW > labelSize * 1.5 && rectH > labelSize * 0.8 && (
                        <text
                          x={svgX + rectW / 2}
                          y={svgY + rectH / 2 - (rectH > labelSize * 2 ? labelSize * 0.3 : 0)}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={labelSize * 0.55} fontWeight="600" fill="#1f2937"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {el.name}
                        </text>
                      )}
                      {rectW > labelSize * 2 && rectH > labelSize * 2 && (
                        <text
                          x={svgX + rectW / 2} y={svgY + rectH / 2 + labelSize * 0.6}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={labelSize * 0.4} fill="#6b7280"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {elLength > 0 && elWidth > 0
                            ? `${(elLength / 1000).toFixed(1)}×${(elWidth / 1000).toFixed(1)}m`
                            : ''}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Layer 3: Building walls */}
                {geo.wallSegments.map((wall) => (
                  <line
                    key={`wall-${wall.id}`}
                    x1={wall.x1Mm} y1={toSvgY(wall.y1Mm)}
                    x2={wall.x2Mm} y2={toSvgY(wall.y2Mm)}
                    stroke={getWallColor(wall)} strokeWidth={getWallStrokeWidth(wall)} strokeLinecap="round"
                  />
                ))}

                {/* Layer 4: Dimension lines */}
                <line x1={0} y1={boundingHeight + PADDING * 0.4} x2={boundingWidth} y2={boundingHeight + PADDING * 0.4} stroke="#71717a" strokeWidth={1} />
                <line x1={0} y1={boundingHeight + PADDING * 0.2} x2={0} y2={boundingHeight + PADDING * 0.6} stroke="#71717a" strokeWidth={1} />
                <line x1={boundingWidth} y1={boundingHeight + PADDING * 0.2} x2={boundingWidth} y2={boundingHeight + PADDING * 0.6} stroke="#71717a" strokeWidth={1} />
                <text x={boundingWidth / 2} y={boundingHeight + PADDING * 0.8} textAnchor="middle" fontSize={labelSize * 0.6} fill="#71717a" style={{ userSelect: 'none' }}>
                  {(boundingWidth / 1000).toFixed(1)} m
                </text>
                <line x1={-PADDING * 0.4} y1={toSvgY(0)} x2={-PADDING * 0.4} y2={toSvgY(boundingHeight)} stroke="#71717a" strokeWidth={1} />
                <line x1={-PADDING * 0.2} y1={toSvgY(0)} x2={-PADDING * 0.6} y2={toSvgY(0)} stroke="#71717a" strokeWidth={1} />
                <line x1={-PADDING * 0.2} y1={toSvgY(boundingHeight)} x2={-PADDING * 0.6} y2={toSvgY(boundingHeight)} stroke="#71717a" strokeWidth={1} />
                <text
                  x={-PADDING * 0.7} y={toSvgY(boundingHeight / 2)}
                  textAnchor="middle" fontSize={labelSize * 0.6} fill="#71717a"
                  transform={`rotate(-90, ${-PADDING * 0.7}, ${toSvgY(boundingHeight / 2)})`}
                  style={{ userSelect: 'none' }}
                >
                  {(boundingHeight / 1000).toFixed(1)} m
                </text>
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Hover tooltip */}
      {hoveredEl && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-zinc-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
          <p className="font-semibold text-zinc-900">{hoveredEl.name}</p>
          <div className="mt-1 space-y-0.5 text-zinc-600">
            <div className="flex items-center gap-2">
              <Badge
                className="text-[10px]"
                style={{
                  backgroundColor: getStatusColors(hoveredEl.status).fill,
                  color: getStatusColors(hoveredEl.status).stroke,
                  borderColor: getStatusColors(hoveredEl.status).stroke,
                }}
                variant="outline"
              >
                {getStatusColors(hoveredEl.status).label}
              </Badge>
              <span className="text-xs text-zinc-400">{hoveredEl.element_type}</span>
            </div>
            {hoveredEl.length_mm && hoveredEl.width_mm && (
              <p className="text-xs">
                {hoveredEl.length_mm} × {hoveredEl.width_mm}
                {hoveredEl.height_mm ? ` × ${hoveredEl.height_mm}` : ''} mm
              </p>
            )}
            {hoveredEl.weight_kg && (
              <p className="text-xs">{hoveredEl.weight_kg.toLocaleString('is-IS')} kg</p>
            )}
          </div>
        </div>
      )}

      {/* In-view status legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/90 border border-zinc-200 rounded-md px-3 py-2 text-xs space-y-1">
        {Object.entries(STATUS_COLORS).map(([key, { fill, stroke, label }]) => {
          const count = statusCounts[key]
          if (!count) return null
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: fill, border: `1.5px solid ${stroke}` }} />
              <span className="text-zinc-600">{label} ({count})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Image-based Plan Sub-Component ─────────────────────────

function ImagePlanView({
  plan,
  onElementClick,
}: {
  plan: FloorPlanData
  onElementClick: (el: FloorElement) => void
}) {
  return (
    <Card className="relative overflow-hidden bg-muted/30">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={plan.plan_image_url!}
          alt={plan.name || `Hæð ${plan.floor}`}
          fill
          className="object-contain"
          priority
        />
        {plan.elements.map((el) => {
          if (el.x_percent == null || el.y_percent == null) return null
          const status = el.status ?? 'planned'
          const pinTw = STATUS_COLORS[status]?.tw ?? 'bg-zinc-400'
          return (
            <button
              key={el.id}
              onClick={() => onElementClick(el)}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-125 z-10"
              style={{ left: `${el.x_percent}%`, top: `${el.y_percent}%` }}
              title={el.name}
            >
              <div className={`${pinTw} rounded-full p-1 shadow-lg border-2 border-white`}>
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
