'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PanelResult, OpeningDefinition } from '@/lib/panelization/types'

interface SurfaceCanvasProps {
  surfaceLengthMm: number
  surfaceHeightMm: number
  panels: PanelResult[]
  openings: OpeningDefinition[]
  mode: 'wall' | 'filigran'
  jointWidthMm: number
}

// SVG viewport padding
const PADDING = 40
const LABEL_HEIGHT = 24
const MAX_CANVAS_WIDTH = 900
const MIN_CANVAS_HEIGHT = 200

/**
 * SVG-based 2D visualization of the panelization surface.
 *
 * Color coding:
 * - Green: panel within all constraints
 * - Yellow: panel at 90%+ of a constraint
 * - Red: panel exceeds a constraint
 * - Blue hatching: openings (windows/doors)
 */
export function SurfaceCanvas({
  surfaceLengthMm,
  surfaceHeightMm,
  panels,
  openings,
  mode,
  jointWidthMm,
}: SurfaceCanvasProps) {
  // Calculate scale to fit SVG viewport
  const { svgWidth, svgHeight, scale } = useMemo(() => {
    const availableWidth = MAX_CANVAS_WIDTH - PADDING * 2
    const availableHeight = 400 - PADDING * 2 - LABEL_HEIGHT

    const scaleX = availableWidth / surfaceLengthMm
    const scaleY = availableHeight / surfaceHeightMm
    const s = Math.min(scaleX, scaleY)

    const w = surfaceLengthMm * s + PADDING * 2
    const h = Math.max(surfaceHeightMm * s + PADDING * 2 + LABEL_HEIGHT, MIN_CANVAS_HEIGHT)

    return { svgWidth: w, svgHeight: h, scale: s }
  }, [surfaceLengthMm, surfaceHeightMm])

  // Origin: bottom-left in construction coordinates, top-left in SVG
  const ox = PADDING
  const oy = PADDING

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{mode === 'wall' ? 'Veggflötur' : 'Gólfflötur'}</span>
          <span className="text-xs font-normal text-zinc-500">
            {(surfaceLengthMm / 1000).toFixed(1)} × {(surfaceHeightMm / 1000).toFixed(1)} m
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full border rounded-md bg-zinc-50"
          style={{ maxHeight: '450px' }}
        >
          {/* Defs for hatching patterns */}
          <defs>
            <pattern
              id="opening-hatch"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke="#93c5fd" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Surface outline */}
          <rect
            x={ox}
            y={oy}
            width={surfaceLengthMm * scale}
            height={surfaceHeightMm * scale}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Panels */}
          {panels.map((panel) => {
            const hasWarning =
              panel.exceedsWeight || panel.exceedsTransport || panel.exceedsTable
            const fill = hasWarning ? '#fecaca' : '#bbf7d0'
            const stroke = hasWarning ? '#ef4444' : '#22c55e'

            return (
              <g key={panel.index}>
                {/* Panel rectangle */}
                <rect
                  x={ox + panel.offsetXMm * scale}
                  y={oy + panel.offsetYMm * scale}
                  width={panel.widthMm * scale}
                  height={panel.heightMm * scale}
                  fill={fill}
                  fillOpacity={0.5}
                  stroke={stroke}
                  strokeWidth="1"
                  rx="1"
                />
                {/* Panel name label */}
                {panel.widthMm * scale > 30 && panel.heightMm * scale > 20 && (
                  <text
                    x={ox + (panel.offsetXMm + panel.widthMm / 2) * scale}
                    y={oy + (panel.offsetYMm + panel.heightMm / 2) * scale - 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-semibold fill-zinc-700"
                    style={{ userSelect: 'none' }}
                  >
                    {panel.name}
                  </text>
                )}
                {/* Width dimension */}
                {panel.widthMm * scale > 40 && (
                  <text
                    x={ox + (panel.offsetXMm + panel.widthMm / 2) * scale}
                    y={oy + (panel.offsetYMm + panel.heightMm / 2) * scale + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[8px] fill-zinc-500"
                    style={{ userSelect: 'none' }}
                  >
                    {(panel.widthMm / 1000).toFixed(2)} m
                  </text>
                )}
                {/* Weight */}
                {panel.widthMm * scale > 50 && panel.heightMm * scale > 40 && (
                  <text
                    x={ox + (panel.offsetXMm + panel.widthMm / 2) * scale}
                    y={oy + (panel.offsetYMm + panel.heightMm / 2) * scale + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[7px] fill-zinc-400"
                    style={{ userSelect: 'none' }}
                  >
                    {panel.weightKg.toLocaleString('is-IS')} kg
                  </text>
                )}
              </g>
            )
          })}

          {/* Openings (hatched blue rectangles) */}
          {openings.map((opening, i) => (
            <g key={`opening-${i}`}>
              <rect
                x={ox + opening.offsetXMm * scale}
                y={
                  oy +
                  (surfaceHeightMm - opening.offsetYMm - opening.heightMm) *
                    scale
                }
                width={opening.widthMm * scale}
                height={opening.heightMm * scale}
                fill="url(#opening-hatch)"
                stroke="#3b82f6"
                strokeWidth="1"
              />
              {/* Opening label */}
              {opening.widthMm * scale > 30 && (
                <text
                  x={
                    ox +
                    (opening.offsetXMm + opening.widthMm / 2) * scale
                  }
                  y={
                    oy +
                    (surfaceHeightMm -
                      opening.offsetYMm -
                      opening.heightMm / 2) *
                      scale
                  }
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[8px] font-medium fill-blue-700"
                  style={{ userSelect: 'none' }}
                >
                  {opening.type === 'window'
                    ? 'G'
                    : opening.type === 'door'
                      ? 'H'
                      : 'A'}
                  {opening.label ? ` ${opening.label}` : ''}
                </text>
              )}
            </g>
          ))}

          {/* Joint lines between panels */}
          {panels.slice(0, -1).map((panel, i) => {
            const jointX = ox + (panel.offsetXMm + panel.widthMm) * scale
            return (
              <line
                key={`joint-${i}`}
                x1={jointX}
                y1={oy}
                x2={jointX}
                y2={oy + surfaceHeightMm * scale}
                stroke="#a1a1aa"
                strokeWidth="0.5"
                strokeDasharray="3 2"
              />
            )
          })}

          {/* Dimension line at bottom */}
          <g>
            <line
              x1={ox}
              y1={oy + surfaceHeightMm * scale + 16}
              x2={ox + surfaceLengthMm * scale}
              y2={oy + surfaceHeightMm * scale + 16}
              stroke="#71717a"
              strokeWidth="0.5"
              markerStart="url(#dim-start)"
              markerEnd="url(#dim-end)"
            />
            {/* Ticks */}
            <line
              x1={ox}
              y1={oy + surfaceHeightMm * scale + 12}
              x2={ox}
              y2={oy + surfaceHeightMm * scale + 20}
              stroke="#71717a"
              strokeWidth="0.5"
            />
            <line
              x1={ox + surfaceLengthMm * scale}
              y1={oy + surfaceHeightMm * scale + 12}
              x2={ox + surfaceLengthMm * scale}
              y2={oy + surfaceHeightMm * scale + 20}
              stroke="#71717a"
              strokeWidth="0.5"
            />
            <text
              x={ox + (surfaceLengthMm * scale) / 2}
              y={oy + surfaceHeightMm * scale + 28}
              textAnchor="middle"
              className="text-[9px] fill-zinc-600"
              style={{ userSelect: 'none' }}
            >
              {(surfaceLengthMm / 1000).toFixed(1)} m
            </text>
          </g>

          {/* Dimension line at left */}
          <g>
            <line
              x1={ox - 16}
              y1={oy}
              x2={ox - 16}
              y2={oy + surfaceHeightMm * scale}
              stroke="#71717a"
              strokeWidth="0.5"
            />
            <line
              x1={ox - 20}
              y1={oy}
              x2={ox - 12}
              y2={oy}
              stroke="#71717a"
              strokeWidth="0.5"
            />
            <line
              x1={ox - 20}
              y1={oy + surfaceHeightMm * scale}
              x2={ox - 12}
              y2={oy + surfaceHeightMm * scale}
              stroke="#71717a"
              strokeWidth="0.5"
            />
            <text
              x={ox - 20}
              y={oy + (surfaceHeightMm * scale) / 2}
              textAnchor="middle"
              className="text-[9px] fill-zinc-600"
              style={{ userSelect: 'none' }}
              transform={`rotate(-90, ${ox - 20}, ${oy + (surfaceHeightMm * scale) / 2})`}
            >
              {(surfaceHeightMm / 1000).toFixed(1)} m
            </text>
          </g>
        </svg>
      </CardContent>
    </Card>
  )
}
