'use client'

import { useMemo, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExtractedElement, SlabArea } from '@/lib/schemas/drawing-analysis'
import type { BuildingFloorGeometry, WallSegment } from '@/lib/building-geometry/types'

interface FiligranFloorPlanProps {
  /** Elements with position_x_mm, position_y_mm extracted from BF drawing */
  elements: ExtractedElement[]
  /** Total slab area bounding box */
  slabArea: SlabArea
  /** Optional building geometry (walls) to overlay behind elements */
  geometry?: BuildingFloorGeometry
  /** Element name currently highlighted (linked from table) */
  highlightedElement?: string | null
  /** Callback when user clicks an element */
  onElementClick?: (name: string) => void
  /** Callback when user hovers an element */
  onElementHover?: (name: string | null) => void
  /** Show element name labels */
  showLabels?: boolean
  /** Show dimension text on elements */
  showDimensions?: boolean
}

// ── SVG rendering constants ────────────────────────────────
const PADDING = 80
const SLAB_OUTLINE_COLOR = '#d4d4d8' // zinc-300
const WALL_OUTER_COLOR = '#52525b'   // zinc-600
const WALL_INNER_COLOR = '#a1a1aa'   // zinc-400
const WALL_SANDWICH_COLOR = '#3f3f46' // zinc-700

// Confidence-based fill colors
const FILL_HIGH = '#bbf7d0'     // green-200
const FILL_MEDIUM = '#fef08a'   // yellow-200
const FILL_LOW = '#fecaca'      // red-200
const STROKE_HIGH = '#22c55e'   // green-500
const STROKE_MEDIUM = '#eab308' // yellow-500
const STROKE_LOW = '#ef4444'    // red-500

// Highlighted element
const FILL_HIGHLIGHT = '#bfdbfe'  // blue-200
const STROKE_HIGHLIGHT = '#3b82f6' // blue-500

/**
 * Interactive SVG floor plan viewer for filigran (BF) element layouts.
 *
 * Renders extracted filigran elements as positioned rectangles, with
 * optional building wall overlay. Supports zoom/pan, hover tooltips,
 * and click-to-select linked to the review table.
 *
 * Coordinate system: same as BuildingFloorPlan — architectural origin
 * at bottom-left (Y-up), transformed to SVG (Y-down).
 */
export function FiligranFloorPlan({
  elements,
  slabArea,
  geometry,
  highlightedElement,
  onElementClick,
  onElementHover,
  showLabels = true,
  showDimensions = true,
}: FiligranFloorPlanProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  // Filter to elements that have position data
  const positionedElements = useMemo(
    () => elements.filter(el => el.position_x_mm != null && el.position_y_mm != null),
    [elements]
  )

  // Use slab area or geometry bounding box
  const boundingWidth = geometry?.boundingWidthMm ?? slabArea.width_mm
  const boundingHeight = geometry?.boundingHeightMm ?? slabArea.height_mm

  // SVG viewBox with padding
  const viewBox = useMemo(() => {
    const w = boundingWidth + PADDING * 2
    const h = boundingHeight + PADDING * 2
    return `${-PADDING} ${-PADDING} ${w} ${h}`
  }, [boundingWidth, boundingHeight])

  // Transform architectural Y (bottom-up) to SVG Y (top-down)
  const toSvgY = useCallback(
    (archY: number) => boundingHeight - archY,
    [boundingHeight]
  )

  // Label font size scales with slab area size
  const labelSize = Math.max(60, Math.min(160, boundingWidth / 60))

  // Wall rendering helpers
  const wallStrokeWidth = (wall: WallSegment) => Math.max(2, wall.thicknessMm / 60)
  const wallColor = (wall: WallSegment) => {
    switch (wall.wallType) {
      case 'outer': return WALL_OUTER_COLOR
      case 'sandwich': return WALL_SANDWICH_COLOR
      case 'inner': return WALL_INNER_COLOR
      default: return WALL_OUTER_COLOR
    }
  }

  // Element color based on confidence + highlight state
  const elementColors = (el: ExtractedElement) => {
    const isHighlighted = el.name === highlightedElement
    const isHovered = el.name === hoveredElement

    if (isHighlighted) return { fill: FILL_HIGHLIGHT, stroke: STROKE_HIGHLIGHT }

    const confidence = el.confidence?.dimensions ?? 'medium'
    switch (confidence) {
      case 'high': return { fill: FILL_HIGH, stroke: STROKE_HIGH }
      case 'low': return { fill: FILL_LOW, stroke: STROKE_LOW }
      default: return { fill: FILL_MEDIUM, stroke: STROKE_MEDIUM }
    }
  }

  const handleHover = useCallback(
    (name: string | null) => {
      setHoveredElement(name)
      onElementHover?.(name)
    },
    [onElementHover]
  )

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
              {positionedElements.length} einingar
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
                {/* ── Layer 0: Floor zones (if geometry provided) ── */}
                {geometry?.floorZones.map((zone) => {
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

                {/* ── Layer 1: Slab area outline ── */}
                <rect
                  x={0}
                  y={toSvgY(slabArea.height_mm)}
                  width={slabArea.width_mm}
                  height={slabArea.height_mm}
                  fill="none"
                  stroke={SLAB_OUTLINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="12 6"
                />

                {/* ── Layer 2: Filigran element rectangles ── */}
                {positionedElements.map((el) => {
                  const { fill, stroke } = elementColors(el)
                  const isHovered = hoveredElement === el.name
                  const isHighlighted = highlightedElement === el.name

                  // Position from extracted data
                  const px = el.position_x_mm!
                  const py = el.position_y_mm!
                  const rot = el.rotation_deg ?? 0

                  // Element dimensions — if rotated 90°, swap visual width/height
                  const elLength = el.length_mm ?? 0
                  const elWidth = el.width_mm ?? 0
                  const isVertical = rot >= 45 && rot <= 135

                  // Visual rectangle: width = dimension along X, height = dimension along Y
                  const rectW = isVertical ? elWidth : elLength
                  const rectH = isVertical ? elLength : elWidth

                  // SVG position (top-left)
                  const svgX = px
                  const svgY = toSvgY(py + rectH)

                  return (
                    <g
                      key={`el-${el.name}`}
                      onMouseEnter={() => handleHover(el.name)}
                      onMouseLeave={() => handleHover(null)}
                      onClick={() => onElementClick?.(el.name)}
                      style={{ cursor: onElementClick ? 'pointer' : 'default' }}
                    >
                      {/* Element rectangle */}
                      <rect
                        x={svgX}
                        y={svgY}
                        width={rectW}
                        height={rectH}
                        fill={fill}
                        fillOpacity={isHovered || isHighlighted ? 0.85 : 0.5}
                        stroke={stroke}
                        strokeWidth={isHovered || isHighlighted ? 3 : 1.5}
                        rx={3}
                      />

                      {/* Element name label */}
                      {showLabels && rectW > labelSize * 1.5 && rectH > labelSize * 0.8 && (
                        <text
                          x={svgX + rectW / 2}
                          y={svgY + rectH / 2 - (showDimensions && rectH > labelSize * 2 ? labelSize * 0.3 : 0)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={labelSize * 0.6}
                          fontWeight="600"
                          fill="#1f2937"
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {el.name}
                        </text>
                      )}

                      {/* Dimension text below name */}
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

                {/* ── Layer 3: Building walls (if geometry provided) ── */}
                {geometry?.wallSegments.map((wall) => (
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
                    {/* Bottom: total width */}
                    <line
                      x1={0}
                      y1={boundingHeight + PADDING * 0.4}
                      x2={slabArea.width_mm}
                      y2={boundingHeight + PADDING * 0.4}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={0}
                      y1={boundingHeight + PADDING * 0.2}
                      x2={0}
                      y2={boundingHeight + PADDING * 0.6}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={slabArea.width_mm}
                      y1={boundingHeight + PADDING * 0.2}
                      x2={slabArea.width_mm}
                      y2={boundingHeight + PADDING * 0.6}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <text
                      x={slabArea.width_mm / 2}
                      y={boundingHeight + PADDING * 0.8}
                      textAnchor="middle"
                      fontSize={labelSize * 0.6}
                      fill="#71717a"
                      style={{ userSelect: 'none' }}
                    >
                      {(slabArea.width_mm / 1000).toFixed(1)} m
                    </text>

                    {/* Left: total height */}
                    <line
                      x1={-PADDING * 0.4}
                      y1={toSvgY(0)}
                      x2={-PADDING * 0.4}
                      y2={toSvgY(slabArea.height_mm)}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={-PADDING * 0.2}
                      y1={toSvgY(0)}
                      x2={-PADDING * 0.6}
                      y2={toSvgY(0)}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={-PADDING * 0.2}
                      y1={toSvgY(slabArea.height_mm)}
                      x2={-PADDING * 0.6}
                      y2={toSvgY(slabArea.height_mm)}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <text
                      x={-PADDING * 0.7}
                      y={toSvgY(slabArea.height_mm / 2)}
                      textAnchor="middle"
                      fontSize={labelSize * 0.6}
                      fill="#71717a"
                      transform={`rotate(-90, ${-PADDING * 0.7}, ${toSvgY(slabArea.height_mm / 2)})`}
                      style={{ userSelect: 'none' }}
                    >
                      {(slabArea.height_mm / 1000).toFixed(1)} m
                    </text>
                  </>
                )}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Hover tooltip */}
      {hoveredElement && (
        <ElementTooltip
          element={positionedElements.find(el => el.name === hoveredElement)}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/90 border border-zinc-200 rounded-md px-3 py-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: FILL_HIGH, border: `1.5px solid ${STROKE_HIGH}` }} />
          <span className="text-zinc-600">Hátt öryggi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: FILL_MEDIUM, border: `1.5px solid ${STROKE_MEDIUM}` }} />
          <span className="text-zinc-600">Miðlungs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: FILL_LOW, border: `1.5px solid ${STROKE_LOW}` }} />
          <span className="text-zinc-600">Lágt öryggi</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Floating tooltip showing element details on hover.
 */
function ElementTooltip({ element }: { element?: ExtractedElement }) {
  if (!element) return null

  const dims = [element.length_mm, element.width_mm, element.height_mm]
    .filter(Boolean)
    .map(d => `${d}`)
    .join(' × ')

  return (
    <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-zinc-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-zinc-900">{element.name}</p>
      <div className="mt-1 space-y-0.5 text-zinc-600">
        {dims && <p>{dims} mm</p>}
        {element.weight_kg && (
          <p>{element.weight_kg.toLocaleString('is-IS')} kg</p>
        )}
        {element.rebar_spec && (
          <p className="text-xs text-zinc-500">{element.rebar_spec}</p>
        )}
        {element.production_notes && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {element.production_notes}
          </p>
        )}
      </div>
    </div>
  )
}
