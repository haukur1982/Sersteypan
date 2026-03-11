'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Layers,
  AlertTriangle,
} from 'lucide-react'
import { BuildingFloorPlan } from '@/components/panelization/BuildingFloorPlan'
import { ZoneConstraintSheet } from '@/components/panelization/ZoneConstraintSheet'
import {
  autoPanelizeGeometry,
  batchCommitAutoPanelization,
  deleteAutoLayouts,
} from '@/lib/panelization/actions'
import { computeZoneBBox } from '@/lib/building-geometry/types'
import type { BuildingFloorGeometry } from '@/lib/building-geometry/types'
import type { Database } from '@/types/database'

type GeometryRow =
  Database['public']['Tables']['building_floor_geometries']['Row']
type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']

interface AutoPanelizationClientProps {
  geometry: BuildingFloorGeometry
  linkedLayouts: Array<{
    zoneId: string
    layout: Record<string, unknown>
    panels: Array<Record<string, unknown>>
  }>
  geometries: GeometryRow[]
  projectId: string
}

export function AutoPanelizationClient({
  geometry,
  linkedLayouts: rawLayouts,
  geometries,
  projectId,
}: AutoPanelizationClientProps) {
  const router = useRouter()
  const [isPanelizing, startPanelizeTransition] = useTransition()
  const [isCommitting, startCommitTransition] = useTransition()
  const [isResetting, startResetTransition] = useTransition()
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Cast raw layouts to proper types
  const linkedLayouts = useMemo(
    () =>
      rawLayouts.map((ll) => ({
        zoneId: ll.zoneId,
        layout: ll.layout as unknown as LayoutRow,
        panels: ll.panels as unknown as PanelRow[],
      })),
    [rawLayouts]
  )

  // Derived state
  const interiorZones = useMemo(
    () => geometry.floorZones.filter((z) => z.zoneType === 'interior'),
    [geometry.floorZones]
  )
  const hasPanels = linkedLayouts.length > 0
  const totalPanels = useMemo(
    () => linkedLayouts.reduce((sum, ll) => sum + ll.panels.length, 0),
    [linkedLayouts]
  )
  const totalWeight = useMemo(
    () =>
      Math.round(
        linkedLayouts.reduce(
          (sum, ll) =>
            sum + ll.panels.reduce((s, p) => s + p.weight_kg, 0),
          0
        ) * 10
      ) / 10,
    [linkedLayouts]
  )
  const totalArea = useMemo(
    () =>
      Math.round(
        linkedLayouts.reduce(
          (sum, ll) =>
            sum + ll.panels.reduce((s, p) => s + p.area_m2, 0),
          0
        ) * 100
      ) / 100,
    [linkedLayouts]
  )
  const warningCount = useMemo(
    () =>
      linkedLayouts
        .flatMap((ll) => ll.panels)
        .filter(
          (p) => p.exceeds_weight || p.exceeds_transport || p.exceeds_table
        ).length,
    [linkedLayouts]
  )
  const allCommitted = useMemo(
    () =>
      linkedLayouts.length > 0 &&
      linkedLayouts.every((ll) => ll.layout.status === 'committed'),
    [linkedLayouts]
  )

  // Selected zone data for constraint sheet
  const selectedZone = useMemo(
    () => interiorZones.find((z) => z.id === selectedZoneId),
    [interiorZones, selectedZoneId]
  )
  const selectedLinkedLayout = useMemo(
    () => linkedLayouts.find((ll) => ll.zoneId === selectedZoneId),
    [linkedLayouts, selectedZoneId]
  )

  // ── Handlers ────────────────────────────────────────────

  const handlePanelize = () => {
    setError(null)
    setSuccessMessage(null)
    startPanelizeTransition(async () => {
      const result = await autoPanelizeGeometry(geometry.id, projectId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMessage(
          `${result.zonesProcessed} svæði greinuð, ${result.totalPanels} plötur reiknaðar`
        )
      }
      router.refresh()
    })
  }

  const handleCommit = () => {
    setError(null)
    setSuccessMessage(null)
    startCommitTransition(async () => {
      const result = await batchCommitAutoPanelization(
        geometry.id,
        projectId
      )
      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMessage(
          `${result.totalElementsCreated} einingar stofnaðar úr ${result.layoutsCommitted} svæðum`
        )
      }
      router.refresh()
    })
  }

  const handleReset = () => {
    setError(null)
    setSuccessMessage(null)
    startResetTransition(async () => {
      const result = await deleteAutoLayouts(geometry.id, projectId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccessMessage('Plötusnið eytt — tilbúið til að byrja upp á nýtt')
      }
      router.refresh()
    })
  }

  const isAnyPending = isPanelizing || isCommitting || isResetting

  return (
    <div className="space-y-4">
      {/* Floor selector (if multiple geometries) */}
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
                href={`/admin/projects/${projectId}/panelization/auto?geometry=${g.id}`}
              >
                Hæð {g.floor}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* Stats bar + action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stats */}
        <Badge variant="outline" className="font-normal">
          {interiorZones.length} svæði
        </Badge>
        {hasPanels && (
          <>
            <Badge
              variant="outline"
              className="font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              {totalPanels} plötur
            </Badge>
            <Badge variant="outline" className="font-normal">
              {totalArea} m²
            </Badge>
            <Badge variant="outline" className="font-normal">
              {totalWeight.toLocaleString('is-IS')} kg
            </Badge>
            {warningCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 font-normal">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {warningCount} viðvaranir
              </Badge>
            )}
          </>
        )}

        {/* Action buttons — pushed to the right */}
        <div className="ml-auto flex items-center gap-2">
          {!hasPanels && (
            <Button
              onClick={handlePanelize}
              disabled={isAnyPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPanelizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Reikna plötusnið
            </Button>
          )}

          {hasPanels && !allCommitted && (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isAnyPending}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Byrja upp á nýtt
                  </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Eyða öllum plötuniðum?</DialogTitle>
                    <DialogDescription>
                      Þetta eyðir öllum sjálfvirku plötuniðum fyrir þessa hæð.
                      Þú getur reiknað aftur eftir á.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Hætta við</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        variant="destructive"
                        onClick={handleReset}
                      >
                        Eyða og byrja aftur
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    disabled={isAnyPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isCommitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Staðfesta allt
                  </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Stofna einingar?</DialogTitle>
                    <DialogDescription>
                      Þetta stofnar {totalPanels} framleiðslueiningar úr{' '}
                      {linkedLayouts.length} svæðum. Heildarþyngd:{' '}
                      {totalWeight.toLocaleString('is-IS')} kg.
                      {warningCount > 0 && (
                        <>
                          {' '}
                          <span className="text-red-600 font-medium">
                            {warningCount} plötur fara yfir hömlur.
                          </span>
                        </>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Hætta við</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleCommit}
                      >
                        Staðfesta og stofna
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {allCommitted && (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-sm py-1 px-3">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Staðfest
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-3 pb-3">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
      {successMessage && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-3 pb-3">
            <p className="text-sm text-emerald-800">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Main content: floor plan + zone list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* SVG Floor Plan */}
        <div>
          <BuildingFloorPlan
            geometry={geometry}
            layouts={linkedLayouts}
            showLabels
            showDimensions
          />
        </div>

        {/* Zone list sidebar */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-zinc-400" />
            Svæði ({interiorZones.length})
          </h3>
          {interiorZones.map((zone) => {
            const linked = linkedLayouts.find(
              (ll) => ll.zoneId === zone.id
            )
            const bbox = computeZoneBBox(zone.points)
            const widthM = ((bbox.maxX - bbox.minX) / 1000).toFixed(1)
            const heightM = ((bbox.maxY - bbox.minY) / 1000).toFixed(1)
            const isSelected = selectedZoneId === zone.id
            const zoneWarnings = linked
              ? linked.panels.filter(
                  (p) =>
                    p.exceeds_weight ||
                    p.exceeds_transport ||
                    p.exceeds_table
                ).length
              : 0

            return (
              <button
                key={zone.id}
                onClick={() =>
                  setSelectedZoneId(isSelected ? null : zone.id)
                }
                disabled={!hasPanels}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50'
                    : hasPanels
                      ? 'border-zinc-200 hover:border-zinc-300 cursor-pointer'
                      : 'border-zinc-100 bg-zinc-50 cursor-default'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-zinc-900 truncate">
                    {zone.name}
                  </span>
                  {linked && (
                    <Badge
                      variant="outline"
                      className="text-[10px] ml-2 flex-shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {linked.panels.length}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {widthM} × {heightM} m
                </p>
                {linked && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-400">
                      {Math.round(
                        linked.panels.reduce(
                          (s, p) => s + p.weight_kg,
                          0
                        )
                      ).toLocaleString('is-IS')}{' '}
                      kg
                    </span>
                    {zoneWarnings > 0 && (
                      <span className="text-[10px] text-red-500">
                        {zoneWarnings} viðv.
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}

          {/* Balcony zones (informational) */}
          {geometry.floorZones.some((z) => z.zoneType === 'balcony') && (
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 mb-1">
                Svalir (ekki filigran)
              </p>
              {geometry.floorZones
                .filter((z) => z.zoneType === 'balcony')
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="p-2 rounded border border-zinc-100 bg-blue-50/30 mb-1"
                  >
                    <span className="text-xs text-zinc-500">
                      {zone.name}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone constraint sheet */}
      {selectedZone && (
        <ZoneConstraintSheet
          zone={selectedZone}
          linkedLayout={selectedLinkedLayout}
          open={selectedZoneId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedZoneId(null)
          }}
          onRecalculated={() => router.refresh()}
        />
      )}
    </div>
  )
}
