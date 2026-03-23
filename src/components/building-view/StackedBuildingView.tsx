'use client'

import { useMemo, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  PositionedElement,
  FloorGeometry,
} from '@/lib/building-view/queries'

// ── Geometry types (snake_case JSONB → camelCase) ──────────
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

// ── SVG rendering constants ────────────────────────────────
const PADDING = 120
const LABEL_AREA_WIDTH = 200
const SLAB_OUTLINE_COLOR = '#d4d4d8'
const WALL_OUTER_COLOR = '#52525b'
const WALL_INNER_COLOR = '#a1a1aa'
const WALL_SANDWICH_COLOR = '#3f3f46'
const HIGHLIGHT_FILL = '#dbeafe'
const HIGHLIGHT_STROKE = '#3b82f6'
const FLOOR_GAP_RATIO = 0.15 // 15% of bounding height as gap

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

// ── JSONB parsing helpers ──────────────────────────────────

function parseWallSegments(geometry: FloorGeometry | null): WallSegment[] {
  if (!geometry?.wall_segments) return []
  const raw = geometry.wall_segments as unknown as Record<string, unknown>[]
  if (!Array.isArray(raw)) return []
  return raw.map((w) => ({
    id: String(w.id || ''),
    x1Mm: Number(w.x1_mm ?? w.x1Mm ?? 0),
    y1Mm: Number(w.y1_mm ?? w.y1Mm ?? 0),
    x2Mm: Number(w.x2_mm ?? w.x2Mm ?? 0),
    y2Mm: Number(w.y2_mm ?? w.y2Mm ?? 0),
    thicknessMm: Number(w.thickness_mm ?? w.thicknessMm ?? 200),
    wallType: (w.wall_type ?? w.wallType ?? 'inner') as WallSegment['wallType'],
  }))
}

function parseFloorZones(geometry: FloorGeometry | null): FloorZone[] {
  if (!geometry?.floor_zones) return []
  const raw = geometry.floor_zones as unknown as Record<string, unknown>[]
  if (!Array.isArray(raw)) return []
  return raw.map((z) => {
    const rawPoints = Array.isArray(z.points) ? z.points : []
    return {
      id: String(z.id || ''),
      name: z.name as string | undefined,
      points: rawPoints.map((p: Record<string, unknown>) => ({
        xMm: Number(p.x_mm ?? p.xMm ?? 0),
        yMm: Number(p.y_mm ?? p.yMm ?? 0),
      })),
      zoneType: (z.zone_type ?? z.zoneType ?? 'interior') as FloorZone['zoneType'],
    }
  })
}

// ── Props ──────────────────────────────────────────────────

interface FloorInput {
  floor: number
  buildingId: string | null
  geometry: FloorGeometry | null
  elements: PositionedElement[]
  boundingWidth: number
  boundingHeight: number
}

interface StackedBuildingViewProps {
  floors: FloorInput[]
  onElementClick?: (element: PositionedElement) => void
  showLabels?: boolean
  showDimensions?: boolean
}

// ── Computed floor layout ──────────────────────────────────

interface FloorLayout {
  floor: number
  yOffset: number
  boundingWidth: number
  boundingHeight: number
  geometry: FloorGeometry | null
  elements: PositionedElement[]
  wallSegments: WallSegment[]
  floorZones: FloorZone[]
}

/**
 * Stacked building view showing ALL floors in one pannable/zoomable SVG.
 *
 * Floors are arranged vertically with the highest floor at top and lowest
 * at bottom. Each floor shows walls, zones, and elements color-coded by
 * production status.
 *
 * Coordinate system per floor: architectural origin at bottom-left (Y-up),
 * transformed to SVG (Y-down). Floors are stacked with a configurable gap.
 */
export function StackedBuildingView({
  floors: inputFloors,
  onElementClick,
  showLabels = true,
  showDimensions = true,
}: StackedBuildingViewProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  const handleHover = useCallback((id: string | null) => {
    setHoveredElement(id)
  }, [])

  // Sort floors highest-first (top of SVG) and compute vertical layout
  const floorLayouts = useMemo<FloorLayout[]>(() => {
    const sorted = [...inputFloors].sort((a, b) => b.floor - a.floor)
    const layouts: FloorLayout[] = []
    let cumulativeY = 0

    for (const floorData of sorted) {
      const gap =
        layouts.length > 0
          ? Math.max(400, floorData.boundingHeight * FLOOR_GAP_RATIO)
          : 0

      cumulativeY += gap

      layouts.push({
        floor: floorData.floor,
        yOffset: cumulativeY,
        boundingWidth: floorData.boundingWidth,
        boundingHeight: floorData.boundingHeight,
        geometry: floorData.geometry,
        elements: floorData.elements,
        wallSegments: parseWallSegments(floorData.geometry),
        floorZones: parseFloorZones(floorData.geometry),
      })

      cumulativeY += floorData.boundingHeight
    }

    return layouts
  }, [inputFloors])

  // Compute the total SVG dimensions
  const { totalWidth, totalHeight } = useMemo(() => {
    let maxW = 0
    let maxH = 0
    for (const layout of floorLayouts) {
      maxW = Math.max(maxW, layout.boundingWidth)
      maxH = Math.max(maxH, layout.yOffset + layout.boundingHeight)
    }
    return { totalWidth: maxW, totalHeight: maxH }
  }, [floorLayouts])

  const viewBox = useMemo(() => {
    const w = totalWidth + PADDING * 2 + LABEL_AREA_WIDTH
    const h = totalHeight + PADDING * 2
    return `${-PADDING - LABEL_AREA_WIDTH} ${-PADDING} ${w} ${h}`
  }, [totalWidth, totalHeight])

  const labelSize = useMemo(
    () => Math.max(60, Math.min(160, totalWidth / 60)),
    [totalWidth]
  )

  // Status helpers
  const getStatusColors = useCallback((status: string | null) => {
    return STATUS_COLORS[status ?? 'planned'] ?? STATUS_COLORS.planned
  }, [])

  // Count all elements across all floors by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const floorData of inputFloors) {
      for (const el of floorData.elements) {
        const status = el.status ?? 'planned'
        counts[status] = (counts[status] ?? 0) + 1
      }
    }
    return counts
  }, [inputFloors])

  const allElements = useMemo(
    () => inputFloors.flatMap((f) => f.elements),
    [inputFloors]
  )

  const hoveredEl = allElements.find((el) => el.id === hoveredElement)

  // Wall rendering helpers
  const wallStrokeWidth = (wall: WallSegment) =>
    Math.max(2, wall.thicknessMm / 60)

  const wallColor = (wall: WallSegment) => {
    switch (wall.wallType) {
      case 'outer':
        return WALL_OUTER_COLOR
      case 'sandwich':
        return WALL_SANDWICH_COLOR
      case 'inner':
        return WALL_INNER_COLOR
      default:
        return WALL_OUTER_COLOR
    }
  }

  // No data state
  if (floorLayouts.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-500">
        Engar hæðir með staðsettar einingar.
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={8}
        centerOnInit
        wheel={{ step: 0.08 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white/90"
                onClick={() => zoomIn()}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white/90"
                onClick={() => zoomOut()}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-white/90"
                onClick={() => resetTransform()}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>

            {/* Element count badge */}
            <div className="absolute top-3 left-3 z-10 bg-white/90 border border-zinc-200 rounded-md px-2 py-1 text-xs text-zinc-600">
              {allElements.length} einingar &middot; {floorLayouts.length}{' '}
              {floorLayouts.length === 1 ? 'hæð' : 'hæðir'}
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%', minHeight: '600px' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <svg
                viewBox={viewBox}
                className="w-full h-full"
                style={{ minHeight: '600px' }}
              >
                {floorLayouts.map((layout) => {
                  const {
                    floor,
                    yOffset,
                    boundingWidth,
                    boundingHeight,
                    elements,
                    wallSegments,
                    floorZones,
                  } = layout

                  // Per-floor Y transform: architectural Y-up → SVG Y-down,
                  // offset by this floor's vertical position in the stack.
                  const toSvgY = (archY: number) =>
                    yOffset + boundingHeight - archY

                  const floorLabel =
                    floor === 0
                      ? 'Jarðhæð'
                      : floor < 0
                        ? `K${Math.abs(floor)}`
                        : `${floor}. hæð`

                  return (
                    <g key={`floor-${floor}`}>
                      {/* ── Floor label ── */}
                      <text
                        x={-LABEL_AREA_WIDTH * 0.15}
                        y={yOffset + boundingHeight / 2}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize={labelSize * 0.8}
                        fontWeight="700"
                        fill="#3f3f46"
                        style={{ userSelect: 'none' }}
                      >
                        {floorLabel}
                      </text>

                      {/* Floor element count */}
                      <text
                        x={-LABEL_AREA_WIDTH * 0.15}
                        y={yOffset + boundingHeight / 2 + labelSize * 0.9}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize={labelSize * 0.45}
                        fill="#a1a1aa"
                        style={{ userSelect: 'none' }}
                      >
                        {elements.length}{' '}
                        {elements.length === 1 ? 'eining' : 'einingar'}
                      </text>

                      {/* ── Layer 0: Floor zones ── */}
                      {floorZones.map((zone) => {
                        const pointsStr = zone.points
                          .map((p) => `${p.xMm},${toSvgY(p.yMm)}`)
                          .join(' ')
                        const isBalcony = zone.zoneType === 'balcony'
                        return (
                          <polygon
                            key={`zone-${floor}-${zone.id}`}
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
                        y={yOffset}
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
                            style={{
                              cursor: onElementClick ? 'pointer' : 'default',
                            }}
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
                            {showLabels &&
                              rectW > labelSize * 1.5 &&
                              rectH > labelSize * 0.8 && (
                                <text
                                  x={svgX + rectW / 2}
                                  y={
                                    svgY +
                                    rectH / 2 -
                                    (showDimensions && rectH > labelSize * 2
                                      ? labelSize * 0.3
                                      : 0)
                                  }
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize={labelSize * 0.55}
                                  fontWeight="600"
                                  fill="#1f2937"
                                  style={{
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                  }}
                                >
                                  {el.name}
                                </text>
                              )}
                            {showDimensions &&
                              showLabels &&
                              rectW > labelSize * 2 &&
                              rectH > labelSize * 2 && (
                                <text
                                  x={svgX + rectW / 2}
                                  y={svgY + rectH / 2 + labelSize * 0.6}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize={labelSize * 0.4}
                                  fill="#6b7280"
                                  style={{
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                  }}
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
                          key={`wall-${floor}-${wall.id}`}
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
                          {/* Horizontal dimension (bottom of floor) */}
                          <line
                            x1={0}
                            y1={yOffset + boundingHeight + PADDING * 0.3}
                            x2={boundingWidth}
                            y2={yOffset + boundingHeight + PADDING * 0.3}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <line
                            x1={0}
                            y1={yOffset + boundingHeight + PADDING * 0.15}
                            x2={0}
                            y2={yOffset + boundingHeight + PADDING * 0.45}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <line
                            x1={boundingWidth}
                            y1={yOffset + boundingHeight + PADDING * 0.15}
                            x2={boundingWidth}
                            y2={yOffset + boundingHeight + PADDING * 0.45}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <text
                            x={boundingWidth / 2}
                            y={yOffset + boundingHeight + PADDING * 0.65}
                            textAnchor="middle"
                            fontSize={labelSize * 0.5}
                            fill="#71717a"
                            style={{ userSelect: 'none' }}
                          >
                            {(boundingWidth / 1000).toFixed(1)} m
                          </text>

                          {/* Vertical dimension (left of floor) */}
                          <line
                            x1={-PADDING * 0.3}
                            y1={yOffset}
                            x2={-PADDING * 0.3}
                            y2={yOffset + boundingHeight}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <line
                            x1={-PADDING * 0.15}
                            y1={yOffset}
                            x2={-PADDING * 0.45}
                            y2={yOffset}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <line
                            x1={-PADDING * 0.15}
                            y1={yOffset + boundingHeight}
                            x2={-PADDING * 0.45}
                            y2={yOffset + boundingHeight}
                            stroke="#71717a"
                            strokeWidth={1}
                          />
                          <text
                            x={-PADDING * 0.6}
                            y={yOffset + boundingHeight / 2}
                            textAnchor="middle"
                            fontSize={labelSize * 0.5}
                            fill="#71717a"
                            transform={`rotate(-90, ${-PADDING * 0.6}, ${yOffset + boundingHeight / 2})`}
                            style={{ userSelect: 'none' }}
                          >
                            {(boundingHeight / 1000).toFixed(1)} m
                          </text>
                        </>
                      )}
                    </g>
                  )
                })}
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
                {STATUS_COLORS[hoveredEl.status ?? 'planned']?.label ??
                  'Skipulagt'}
              </Badge>
              <span className="text-xs text-zinc-400">
                {hoveredEl.element_type}
              </span>
            </div>
            {hoveredEl.length_mm && hoveredEl.width_mm && (
              <p className="text-xs">
                {hoveredEl.length_mm} &times; {hoveredEl.width_mm}
                {hoveredEl.height_mm ? ` × ${hoveredEl.height_mm}` : ''} mm
              </p>
            )}
            {hoveredEl.weight_kg && (
              <p className="text-xs">
                {hoveredEl.weight_kg.toLocaleString('is-IS')} kg
              </p>
            )}
            {hoveredEl.floor != null && (
              <p className="text-xs text-zinc-400">
                {hoveredEl.floor === 0
                  ? 'Jarðhæð'
                  : hoveredEl.floor < 0
                    ? `Kjallari ${Math.abs(hoveredEl.floor)}`
                    : `${hoveredEl.floor}. hæð`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status legend with counts */}
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
