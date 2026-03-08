'use client'

import { useMemo, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  BuildingFloorGeometry,
  WallSegment,
  FloorZone,
} from '@/lib/building-geometry/types'
import type { Database } from '@/types/database'

type PanelRow = Database['public']['Tables']['panelization_panels']['Row']
type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']

interface LinkedLayout {
  zoneId: string
  layout: LayoutRow
  panels: PanelRow[]
}

interface BuildingFloorPlanProps {
  geometry: BuildingFloorGeometry
  layouts?: LinkedLayout[]
  onPanelClick?: (panel: PanelRow, layout: LayoutRow) => void
  showLabels?: boolean
  showDimensions?: boolean
}

// SVG rendering constants
const PADDING = 60
const WALL_OUTER_COLOR = '#52525b' // zinc-600
const WALL_INNER_COLOR = '#a1a1aa' // zinc-400
const WALL_SANDWICH_COLOR = '#3f3f46' // zinc-700
const ZONE_FILL = '#f4f4f5' // zinc-100
const ZONE_BALCONY_FILL = '#dbeafe' // blue-100
const PANEL_OK_FILL = '#bbf7d0' // green-200
const PANEL_WARN_FILL = '#fef08a' // yellow-200
const PANEL_ERROR_FILL = '#fecaca' // red-200
const PANEL_OK_STROKE = '#22c55e'
const PANEL_WARN_STROKE = '#eab308'
const PANEL_ERROR_STROKE = '#ef4444'

/**
 * Composite SVG floor plan showing building walls, floor zones,
 * and filigran panel layouts as a top-down overlay.
 *
 * Coordinate system:
 * - AI/architecture: origin at bottom-left, Y-up
 * - SVG: origin at top-left, Y-down
 * - Transform: svgY = boundingHeightMm - architecturalY
 */
export function BuildingFloorPlan({
  geometry,
  layouts = [],
  onPanelClick,
  showLabels = true,
  showDimensions = true,
}: BuildingFloorPlanProps) {
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null)
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  const { boundingWidthMm, boundingHeightMm, wallSegments, floorZones } =
    geometry

  // Calculate SVG viewBox to fit building with padding
  const viewBox = useMemo(() => {
    const w = boundingWidthMm + PADDING * 2
    const h = boundingHeightMm + PADDING * 2
    return `${-PADDING} ${-PADDING} ${w} ${h}`
  }, [boundingWidthMm, boundingHeightMm])

  // Transform architectural Y to SVG Y
  const toSvgY = (archY: number) => boundingHeightMm - archY

  // Build a map of zoneId → LinkedLayout
  const layoutsByZone = useMemo(() => {
    const map = new Map<string, LinkedLayout>()
    for (const ll of layouts) {
      map.set(ll.zoneId, ll)
    }
    return map
  }, [layouts])

  // Compute zone bounding boxes for panel positioning
  const zoneBBoxes = useMemo(() => {
    const map = new Map<
      string,
      { minX: number; minY: number; maxX: number; maxY: number }
    >()
    for (const zone of floorZones) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const pt of zone.points) {
        minX = Math.min(minX, pt.xMm)
        minY = Math.min(minY, pt.yMm)
        maxX = Math.max(maxX, pt.xMm)
        maxY = Math.max(maxY, pt.yMm)
      }
      map.set(zone.id, { minX, minY, maxX, maxY })
    }
    return map
  }, [floorZones])

  // Get wall stroke width based on thickness (scale to reasonable visual width)
  const wallStrokeWidth = (wall: WallSegment) => {
    // Scale: 200mm → ~3px visual, 320mm → ~5px visual at typical zoom
    return Math.max(2, wall.thicknessMm / 60)
  }

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

  // Panel color based on constraint status
  const panelColors = (panel: PanelRow) => {
    const hasError =
      panel.exceeds_weight || panel.exceeds_transport || panel.exceeds_table

    if (hasError) return { fill: PANEL_ERROR_FILL, stroke: PANEL_ERROR_STROKE }
    return { fill: PANEL_OK_FILL, stroke: PANEL_OK_STROKE }
  }

  // Label font size scales with building size
  const labelSize = Math.max(80, Math.min(200, boundingWidthMm / 50))

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={5}
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

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '600px' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <svg
                viewBox={viewBox}
                className="w-full h-full"
                style={{ minHeight: '600px' }}
              >
                {/* ── Layer 1: Floor zone fills ── */}
                {floorZones.map((zone) => {
                  const pointsStr = zone.points
                    .map((p) => `${p.xMm},${toSvgY(p.yMm)}`)
                    .join(' ')
                  const isBalcony = zone.zoneType === 'balcony'
                  const isHovered = hoveredZone === zone.id

                  return (
                    <polygon
                      key={`zone-${zone.id}`}
                      points={pointsStr}
                      fill={isBalcony ? ZONE_BALCONY_FILL : ZONE_FILL}
                      fillOpacity={isHovered ? 0.9 : 0.6}
                      stroke="#d4d4d8"
                      strokeWidth="1"
                      strokeDasharray={isBalcony ? '8 4' : 'none'}
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                    />
                  )
                })}

                {/* ── Layer 2: Panel rectangles inside zones ── */}
                {floorZones.map((zone) => {
                  const linkedLayout = layoutsByZone.get(zone.id)
                  if (!linkedLayout) return null

                  const bbox = zoneBBoxes.get(zone.id)
                  if (!bbox) return null

                  // Panels are positioned relative to zone origin (bottom-left of bbox)
                  return linkedLayout.panels.map((panel) => {
                    const { fill, stroke } = panelColors(panel)
                    const isHovered = hoveredPanel === panel.id

                    // Panel position: zone origin + panel offset
                    const px = bbox.minX + panel.offset_x_mm
                    const py = bbox.minY + panel.offset_y_mm
                    const pw = panel.width_mm
                    const ph = panel.height_mm

                    // Transform to SVG coordinates
                    const svgX = px
                    const svgY = toSvgY(py + ph) // top-left in SVG

                    return (
                      <g
                        key={`panel-${panel.id}`}
                        onMouseEnter={() => setHoveredPanel(panel.id)}
                        onMouseLeave={() => setHoveredPanel(null)}
                        onClick={() =>
                          onPanelClick?.(panel, linkedLayout.layout)
                        }
                        style={{ cursor: onPanelClick ? 'pointer' : 'default' }}
                      >
                        <rect
                          x={svgX}
                          y={svgY}
                          width={pw}
                          height={ph}
                          fill={fill}
                          fillOpacity={isHovered ? 0.9 : 0.5}
                          stroke={stroke}
                          strokeWidth={isHovered ? 3 : 1.5}
                          rx={4}
                        />
                        {/* Panel label */}
                        {showLabels && pw > labelSize * 2 && (
                          <text
                            x={svgX + pw / 2}
                            y={svgY + ph / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={labelSize * 0.7}
                            fontWeight="600"
                            fill="#374151"
                            style={{ userSelect: 'none' }}
                          >
                            {panel.name}
                          </text>
                        )}
                        {/* Panel dimensions */}
                        {showLabels && pw > labelSize * 3 && ph > labelSize * 2 && (
                          <text
                            x={svgX + pw / 2}
                            y={svgY + ph / 2 + labelSize * 0.8}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={labelSize * 0.5}
                            fill="#6b7280"
                            style={{ userSelect: 'none' }}
                          >
                            {(pw / 1000).toFixed(1)}×{(ph / 1000).toFixed(1)}m
                          </text>
                        )}
                      </g>
                    )
                  })
                })}

                {/* ── Layer 3: Wall segments ── */}
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

                {/* ── Layer 4: Zone name labels ── */}
                {showLabels &&
                  floorZones.map((zone) => {
                    const bbox = zoneBBoxes.get(zone.id)
                    if (!bbox) return null

                    const cx = (bbox.minX + bbox.maxX) / 2
                    const cy = (bbox.minY + bbox.maxY) / 2

                    // Only show zone label if no panels are linked (otherwise panels have labels)
                    const hasLinkedPanels = layoutsByZone.has(zone.id)
                    if (hasLinkedPanels) return null

                    return (
                      <text
                        key={`zone-label-${zone.id}`}
                        x={cx}
                        y={toSvgY(cy)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={labelSize}
                        fill="#71717a"
                        fontStyle="italic"
                        style={{ userSelect: 'none' }}
                      >
                        {zone.name}
                      </text>
                    )
                  })}

                {/* ── Layer 5: Dimension lines ── */}
                {showDimensions && (
                  <>
                    {/* Bottom: total width */}
                    <line
                      x1={0}
                      y1={boundingHeightMm + PADDING * 0.5}
                      x2={boundingWidthMm}
                      y2={boundingHeightMm + PADDING * 0.5}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={0}
                      y1={boundingHeightMm + PADDING * 0.3}
                      x2={0}
                      y2={boundingHeightMm + PADDING * 0.7}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={boundingWidthMm}
                      y1={boundingHeightMm + PADDING * 0.3}
                      x2={boundingWidthMm}
                      y2={boundingHeightMm + PADDING * 0.7}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <text
                      x={boundingWidthMm / 2}
                      y={boundingHeightMm + PADDING * 0.9}
                      textAnchor="middle"
                      fontSize={labelSize * 0.7}
                      fill="#71717a"
                      style={{ userSelect: 'none' }}
                    >
                      {(boundingWidthMm / 1000).toFixed(1)} m
                    </text>

                    {/* Left: total height */}
                    <line
                      x1={-PADDING * 0.5}
                      y1={0}
                      x2={-PADDING * 0.5}
                      y2={boundingHeightMm}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={-PADDING * 0.3}
                      y1={0}
                      x2={-PADDING * 0.7}
                      y2={0}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <line
                      x1={-PADDING * 0.3}
                      y1={boundingHeightMm}
                      x2={-PADDING * 0.7}
                      y2={boundingHeightMm}
                      stroke="#71717a"
                      strokeWidth={1}
                    />
                    <text
                      x={-PADDING * 0.8}
                      y={boundingHeightMm / 2}
                      textAnchor="middle"
                      fontSize={labelSize * 0.7}
                      fill="#71717a"
                      transform={`rotate(-90, ${-PADDING * 0.8}, ${boundingHeightMm / 2})`}
                      style={{ userSelect: 'none' }}
                    >
                      {(boundingHeightMm / 1000).toFixed(1)} m
                    </text>
                  </>
                )}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Hover tooltip */}
      {hoveredPanel && (
        <HoverTooltip
          panelId={hoveredPanel}
          layouts={layouts}
        />
      )}
    </div>
  )
}

/**
 * Floating tooltip showing panel details on hover.
 */
function HoverTooltip({
  panelId,
  layouts,
}: {
  panelId: string
  layouts: LinkedLayout[]
}) {
  const panel = layouts
    .flatMap((ll) => ll.panels)
    .find((p) => p.id === panelId)

  if (!panel) return null

  return (
    <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-zinc-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-zinc-900">{panel.name}</p>
      <div className="mt-1 space-y-0.5 text-zinc-600">
        <p>
          {(panel.width_mm / 1000).toFixed(2)} ×{' '}
          {(panel.height_mm / 1000).toFixed(2)} m
        </p>
        <p>{panel.weight_kg.toLocaleString('is-IS')} kg</p>
        {(panel.exceeds_weight ||
          panel.exceeds_transport ||
          panel.exceeds_table) && (
          <p className="text-red-600 font-medium">Fer yfir hömlur</p>
        )}
      </div>
    </div>
  )
}
