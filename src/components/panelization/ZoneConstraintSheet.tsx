'use client'

import { useState, useCallback, useTransition, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Loader2, ArrowRightLeft } from 'lucide-react'
import { updateLayoutConstraints } from '@/lib/panelization/actions'
import { computeZoneBBox } from '@/lib/building-geometry/types'
import type { FloorZone } from '@/lib/building-geometry/types'
import type { Database } from '@/types/database'

type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']

interface ZoneConstraintSheetProps {
  zone: FloorZone
  linkedLayout?: {
    zoneId: string
    layout: LayoutRow
    panels: PanelRow[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecalculated: () => void
}

/**
 * Slide-out sheet for adjusting filigran constraints per zone.
 * Shows zone dimensions, strip direction toggle, key constraints,
 * and live panel stats.
 */
export function ZoneConstraintSheet({
  zone,
  linkedLayout,
  open,
  onOpenChange,
  onRecalculated,
}: ZoneConstraintSheetProps) {
  const [isPending, startTransition] = useTransition()

  const bbox = useMemo(() => computeZoneBBox(zone.points), [zone.points])
  const widthM = ((bbox.maxX - bbox.minX) / 1000).toFixed(1)
  const heightM = ((bbox.maxY - bbox.minY) / 1000).toFixed(1)

  const layout = linkedLayout?.layout
  const panels = linkedLayout?.panels ?? []

  // Local form state
  const [stripDirection, setStripDirection] = useState<'length' | 'width'>(
    (layout?.strip_direction as 'length' | 'width') ?? 'length'
  )
  const [preferredWidth, setPreferredWidth] = useState(
    String(layout?.preferred_panel_width_mm ?? 2000)
  )
  const [maxWidth, setMaxWidth] = useState(
    String(layout?.max_panel_width_mm ?? 2500)
  )
  const [thickness, setThickness] = useState(
    String(layout?.thickness_mm ?? 60)
  )

  // Computed stats from current panels
  const totalWeight = useMemo(
    () => Math.round(panels.reduce((s, p) => s + p.weight_kg, 0) * 10) / 10,
    [panels]
  )
  const totalArea = useMemo(
    () => Math.round(panels.reduce((s, p) => s + p.area_m2, 0) * 100) / 100,
    [panels]
  )
  const warningCount = useMemo(
    () =>
      panels.filter(
        (p) => p.exceeds_weight || p.exceeds_transport || p.exceeds_table
      ).length,
    [panels]
  )

  const handleRecalculate = useCallback(() => {
    if (!layout) return

    const updates: Record<string, number | string> = {
      strip_direction: stripDirection,
    }

    const pw = Number(preferredWidth)
    if (!isNaN(pw) && pw >= 100 && pw <= 50000) {
      updates.preferred_panel_width_mm = pw
    }
    const mw = Number(maxWidth)
    if (!isNaN(mw) && mw >= 100 && mw <= 50000) {
      updates.max_panel_width_mm = mw
    }
    const th = Number(thickness)
    if (!isNaN(th) && th >= 10 && th <= 500) {
      updates.thickness_mm = th
    }

    startTransition(async () => {
      await updateLayoutConstraints(layout.id, updates)
      onRecalculated()
    })
  }, [layout, stripDirection, preferredWidth, maxWidth, thickness, onRecalculated])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {zone.name}
          </SheetTitle>
          <SheetDescription>
            {widthM} × {heightM} m gólfflötur
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Strip direction */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-600 font-semibold uppercase tracking-wider">
              Stefna remsna
            </Label>
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
              <button
                onClick={() => setStripDirection('length')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  stripDirection === 'length'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Meðfram lengd
              </button>
              <button
                onClick={() => setStripDirection('width')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  stripDirection === 'width'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5 rotate-90" />
                Meðfram breidd
              </button>
            </div>
            <p className="text-[10px] text-zinc-400">
              Ákvarðar í hvaða átt remsur liggja. Veldu áttina meðfram
              lengri hlið herbergisins.
            </p>
          </div>

          {/* Preferred panel width */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">
              Æskileg breidd remsna{' '}
              <span className="text-zinc-400">(mm)</span>
            </Label>
            <Input
              type="number"
              value={preferredWidth}
              onChange={(e) => setPreferredWidth(e.target.value)}
              min={100}
              max={50000}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-zinc-400">
              Markbreidd — remsur verða sem næst þessari breidd.
            </p>
          </div>

          {/* Max panel width */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">
              Hámarksbreidd{' '}
              <span className="text-zinc-400">(mm)</span>
            </Label>
            <Input
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(e.target.value)}
              min={100}
              max={50000}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-zinc-400">
              Remsur breiðari en þetta klippast sjálfkrafa.
            </p>
          </div>

          {/* Thickness */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600">
              Þykkt{' '}
              <span className="text-zinc-400">(mm)</span>
            </Label>
            <Input
              type="number"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              min={10}
              max={500}
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-zinc-400">
              Filigranplötur eru yfirleitt 60 mm þykkar.
            </p>
          </div>

          {/* Live stats */}
          {panels.length > 0 && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Núverandi niðurstaða
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {panels.length} plötur
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalArea} m²
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalWeight.toLocaleString('is-IS')} kg
                </Badge>
              </div>
              {warningCount > 0 && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
                  {warningCount} viðvaranir
                </Badge>
              )}
            </div>
          )}

          {/* Recalculate button */}
          {layout && (
            <Button
              onClick={handleRecalculate}
              disabled={isPending}
              className="w-full"
              size="sm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Endurreikna
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
