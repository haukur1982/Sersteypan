'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BuildingFloorPlan } from '@/components/panelization/BuildingFloorPlan'
import type { BuildingFloorGeometry } from '@/lib/building-geometry/types'
import type { Database } from '@/types/database'

type GeometryRow =
  Database['public']['Tables']['building_floor_geometries']['Row']
type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']

interface FloorPlanClientProps {
  geometry: BuildingFloorGeometry
  layouts: Array<{
    zoneId: string
    layout: Record<string, unknown>
    panels: Array<Record<string, unknown>>
  }>
  geometries: GeometryRow[]
  projectId: string
}

export function FloorPlanClient({
  geometry,
  layouts,
  geometries,
  projectId,
}: FloorPlanClientProps) {
  // Cast layouts to proper types
  const typedLayouts = layouts.map((ll) => ({
    zoneId: ll.zoneId,
    layout: ll.layout as unknown as LayoutRow,
    panels: ll.panels as unknown as PanelRow[],
  }))

  return (
    <div className="space-y-4">
      {/* Floor selector (if multiple geometries exist) */}
      {geometries.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">Hæð:</span>
          {geometries.map((g) => (
            <Button
              key={g.id}
              variant={g.id === geometry.id ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link
                href={`/admin/projects/${projectId}/panelization/floor-plan?geometry=${g.id}`}
              >
                Hæð {g.floor}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="outline" className="font-normal">
          {geometry.wallSegments.length} vegghlutir
        </Badge>
        <Badge variant="outline" className="font-normal">
          {geometry.floorZones.length} svæði
        </Badge>
        <Badge variant="outline" className="font-normal">
          {(geometry.boundingWidthMm / 1000).toFixed(1)} ×{' '}
          {(geometry.boundingHeightMm / 1000).toFixed(1)} m
        </Badge>
        {typedLayouts.length > 0 && (
          <Badge
            variant="outline"
            className="font-normal bg-green-50 text-green-700 border-green-200"
          >
            {typedLayouts.reduce((sum, ll) => sum + ll.panels.length, 0)} plötur
            tengdar
          </Badge>
        )}
      </div>

      {/* The SVG floor plan */}
      <BuildingFloorPlan
        geometry={geometry}
        layouts={typedLayouts}
        showLabels
        showDimensions
      />

      {/* Zone legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {geometry.floorZones.map((zone) => {
          const linked = typedLayouts.find((ll) => ll.zoneId === zone.id)
          return (
            <div
              key={zone.id}
              className="flex items-center gap-2 p-2 rounded border border-zinc-100 bg-zinc-50 text-sm"
            >
              <div
                className={`w-3 h-3 rounded-sm ${
                  zone.zoneType === 'balcony' ? 'bg-blue-200' : 'bg-zinc-200'
                }`}
              />
              <span className="text-zinc-700 truncate">{zone.name}</span>
              {linked && (
                <Badge className="ml-auto text-[10px] bg-green-100 text-green-700 border-green-200">
                  {linked.panels.length}
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
