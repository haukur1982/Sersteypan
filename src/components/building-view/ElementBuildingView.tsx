'use client'

import { useMemo, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PositionedElement, FloorGeometry } from '@/lib/building-view/queries'

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

interface ElementBuildingViewProps {
  elements: PositionedElement[]
  boundingWidth: number
  boundingHeight: number
  geometry?: FloorGeometry | null
  onElementClick?: (element: PositionedElement) => void
  showLabels?: boolean
  showDimensions?: boolean
}

// ── SVG rendering constants ────────────────────────────────
const PADDING = 80
const SLAB_OUTLINE_COLOR = '#d4d4d8'
const WALL_OUTER_COLOR = '#52525b'
const WALL_INNER_COLOR = '#a1a1aa'
const WALL_SANDWICH_COLOR = '#3f3f46'

// Production status colors — matching the system's element lifecycle
const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  planned: { fill: '#e4e4e7', stroke: '#71717a', label: 'Skipulagt' },
  rebar: { fill: '#fef08a', stroke: '#ca8a04', label: 'Járnabinding' },
  cast: { fill: '#fed7aa', stroke: '#ea580c', label: 'Steypt' },
  curing: { fill: '#fde68a', stroke: '#d97706', label: 'Þornar' },
  ready: { fill: '#bbf7d0', stroke: '#16a34a', label: 'Tilbúið' },
  loaded: { fill: '#bfdbfe', stroke: '#2563eb', label: 'Hlaðið' },
  delivered: { fill: '#a7f3d0', stroke: '#059669', label: 'Afhent' },
  verified: { fill: '#c4b5fd', stroke: '#7c3aed', label: 'Staðfest' },
}

const HIGHLIGHT_FILL = '#dbeafe'
const HIGHLIGHT_STROKE = '#3b82f6'

/**
 * Interactive SVG building view showing precast elements at their
 * physical positions in the floor plan, color-coded by production status.
 *
 * Coordinate system: architectural origin at bottom-left (Y-up),
 * transformed to SVG (Y-down).
 */
export function ElementBuildingView({
  elements,
  boundingWidth,
  boundingHeight,
  geometry,
  onElementClick,
  showLabels = true,
  showDimensions = true,
}: ElementBuildingViewProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  const viewBox = useMemo(() => {
    const w = boundingWidth + PADDING * 2
    const h = boundingHeight + PADDING * 2
    return `${-PADDING} ${-PADDING} ${w} ${h}`
  }, [boundingWidth, boundingHeight])

  const toSvgY = useCallback(
    (archY: number) => boundingHeight - archY,
    [boundingHeight]
  )

  const labelSize = Math.max(60, Math.min(160, boundingWidth / 60))

  const wallStrokeWidth = (wall: WallSegment) => Math.max(2, wall.thicknessMm / 60)
  const wallColor = (wall: WallSegment) => {
    switch (wall.wallType) {
      case 'outer': return WALL_OUTER_COLOR
      case 'sandwich': return WALL_SANDWICH_COLOR
      case 'inner': return WALL_INNER_COLOR
      default: return WALL_OUTER_COLOR
    }
  }

  const getStatusColors = (status: string | null) => {
    return STATUS_COLORS[status ?? 'planned'] ?? STATUS_COLORS.planned
  }

  // Parse geometry wall segments and floor zones
  const wallSegments = useMemo<WallSegment[]>(() => {
    if (!geometry?.wall_segments) return []
    return (geometry.wall_segments as unknown as WallSegment[]) ?? []
  }, [geometry])

  const floorZones = useMemo<FloorZone[]>(() => {
    if (!geometry?.floor_zones) return []
    return (geometry.floor_zones as unknown as FloorZone[]) ?? []
  }, [geometry])

  const handleHover = useCallback((id: string | null) => {
    setHoveredElement(id)
  }, [])

  // Count elements by status for the legend
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const el of elements) {
      const status = el.status ?? 'planned'
      counts[status] = (counts[status] ?? 0) + 1
    }
    return counts
  }, [elements])

  const hoveredEl = elements.find(el => el.id === hoveredElement)

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={8}
        centerOnInit
        wheel={{ step: 0.08 }}
      >
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
              {elements.length} einingar
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%', minHeight: '500px' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <svg
                viewBox={viewBox}
                className="w-full h-full"
                style={{ minHeight: '500px' }}
              >
                {/* ── Layer 0: Floor zones ── */}
                {floorZones.map((zone) => {
                  const pointsStr = zone.points
                    .map((p) => `${p.xMm},${toSvgY(p.yMm)}`)
                    .join(' ')
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

                {/* ── Layer 1: Bounding box outline ── */}
                <rect
                  x={0}
                  y={toSvgY(boundingHeight)}
                  width={boundingWidth}
                  height={boundingHeight}
                  fill="none"
                  stroke={SLAB_OUTLINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="12 6"
                />

                {/* ── Layer 2: Element rectangles with status colors ── */}
                {elements.map((el) => {
                  const isHovered = hoveredElement === el.id
                  const { fill, stroke } = isHovered
                    ? { fill: HIGHLIGHT_FILL, stroke: HIGHLIGHT_STROKE }
                    : getStatusColors(el.status)

                  const rot = el.rotation_deg ?? 0
                  const elLength = el.length_mm ?? 0
                  const elWidth = el.width_mm ?? 0
                  const isVertical = rot >= 45 && rot <= 135

                  const rectW = isVertical ? elWidth : elLength
                  const rectH = isVertical ? elLength : elWidth

                  const svgX = el.position_x_mm
                  const svgY = toSvgY(el.position_y_mm + rectH)

                  return (
                    <g
                      key={`el-${el.id}`}
                      onMouseEnter={() => handleHover(el.id)}
                      onMouseLeave={() => handleHover(null)}
                      onClick={() => onElementClick?.(el)}
                      style={{ cursor: onElementClick ? 'pointer' : 'default' }}
                    >
                      <rect
                        x={svgX}
                        y={svgY}
                        width={rectW}
                        height={rectH}
                        fill={fill}
                        fillOpacity={isHovered ? 0.9 : 0.65}
                        stroke={stroke}
                        strokeWidth={isHovered ? 3 : 1.5}
                        rx={3}
                      />
                      {showLabels && rectW > labelSize * 1.5 && rectH > labelSize * 0.8 && (
                        <text
                          x={svgX + rectW / 2}
                          y={svgY + rectH / 2 - (showDimensions && rectH > labelSize * 2 ? labelSize * 0.3 : 0)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={labelSize * 0.55}
                          fontWeight="600"
                          fill="#1f2937"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {el.name}
                        </text>
                      )}
                      {showDimensions && showLabels && rectW > labelSize * 2 && rectH > labelSize * 2 && (
                        <text
                          x={svgX + rectW / 2}
                          y={svgY + rectH / 2 + labelSize * 0.6}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={labelSize * 0.4}
                          fill="#6b7280"
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

                {/* ── Layer 3: Building walls ── */}
                {wallSegments.map((wall) => (
                  <line
                    key={`wall-${wall.id}`}
                    x1={wall.x1Mm}
                    y1={toSvgY(wall.y1Mm)}
                    x2={wall.x2Mm}
                    y2={toSvgY(wall.y2Mm)}
                    stroke={wallColor(wall)}
                    strokeWidth={wallStrokeWidth(wall)}
                    strokeLinecap="round"
                  />
                ))}

                {/* ── Layer 4: Dimension lines ── */}
                {showDimensions && (
                  <>
                    <line
                      x1={0} y1={boundingHeight + PADDING * 0.4}
                      x2={boundingWidth} y2={boundingHeight + PADDING * 0.4}
                      stroke="#71717a" strokeWidth={1}
                    />
                    <line x1={0} y1={boundingHeight + PADDING * 0.2} x2={0} y2={boundingHeight + PADDING * 0.6} stroke="#71717a" strokeWidth={1} />
                    <line x1={boundingWidth} y1={boundingHeight + PADDING * 0.2} x2={boundingWidth} y2={boundingHeight + PADDING * 0.6} stroke="#71717a" strokeWidth={1} />
                    <text
                      x={boundingWidth / 2} y={boundingHeight + PADDING * 0.8}
                      textAnchor="middle" fontSize={labelSize * 0.6} fill="#71717a"
                      style={{ userSelect: 'none' }}
                    >
                      {(boundingWidth / 1000).toFixed(1)} m
                    </text>
                    <line
                      x1={-PADDING * 0.4} y1={toSvgY(0)}
                      x2={-PADDING * 0.4} y2={toSvgY(boundingHeight)}
                      stroke="#71717a" strokeWidth={1}
                    />
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
                  </>
                )}
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
                {STATUS_COLORS[hoveredEl.status ?? 'planned']?.label ?? 'Skipulagt'}
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

      {/* Status legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/90 border border-zinc-200 rounded-md px-3 py-2 text-xs space-y-1">
        {Object.entries(STATUS_COLORS).map(([key, { fill, stroke, label }]) => {
          const count = statusCounts[key]
          if (!count) return null
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: fill, border: `1.5px solid ${stroke}` }}
              />
              <span className="text-zinc-600">
                {label} ({count})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
