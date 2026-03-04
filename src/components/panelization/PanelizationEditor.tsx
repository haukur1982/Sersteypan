'use client'

import { useState, useTransition, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { SurfaceCanvas } from './SurfaceCanvas'
import { PanelTable } from './PanelTable'
import { ConstraintsSidebar } from './ConstraintsSidebar'
import { OpeningDialog } from './OpeningDialog'
import { CommitDialog } from './CommitDialog'
import {
  updateLayoutConstraints,
  addOpening,
  removeOpening,
  deletePanelizationLayout,
} from '@/lib/panelization/actions'
import {
  calculateWallPanels,
  calculateFiligranPanels,
} from '@/lib/panelization/algorithm'
import type { Database } from '@/types/database'
import type { PanelizationConstraints, PanelResult, OpeningDefinition } from '@/lib/panelization/types'
import { useRouter } from 'next/navigation'

type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']
type OpeningRow = Database['public']['Tables']['panelization_openings']['Row']

interface PanelizationEditorProps {
  projectId: string
  projectName: string
  layout: LayoutRow & { profiles: { full_name: string } | null }
  panels: PanelRow[]
  openings: OpeningRow[]
}

/** Convert DB panel rows to algorithm PanelResult for the canvas */
function dbPanelsToPanelResults(panels: PanelRow[]): PanelResult[] {
  return panels.map((p) => ({
    index: p.panel_index,
    name: p.name,
    offsetXMm: p.offset_x_mm,
    offsetYMm: p.offset_y_mm,
    widthMm: p.width_mm,
    heightMm: p.height_mm,
    thicknessMm: p.thickness_mm,
    weightKg: p.weight_kg,
    areaM2: p.area_m2,
    volumeM3: p.volume_m3,
    exceedsWeight: p.exceeds_weight,
    exceedsTransport: p.exceeds_transport,
    exceedsTable: p.exceeds_table,
    isManuallyAdjusted: p.is_manually_adjusted,
  }))
}

/** Convert DB openings to algorithm openings */
function dbOpeningsToAlgorithm(openings: OpeningRow[]): OpeningDefinition[] {
  return openings.map((o) => ({
    type: o.opening_type as 'window' | 'door' | 'other',
    offsetXMm: o.offset_x_mm,
    offsetYMm: o.offset_y_mm,
    widthMm: o.width_mm,
    heightMm: o.height_mm,
    label: o.label ?? undefined,
  }))
}

export function PanelizationEditor({
  projectId,
  projectName,
  layout,
  panels: initialPanels,
  openings: initialOpenings,
}: PanelizationEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Client-side panel state for instant preview
  const [panelResults, setPanelResults] = useState<PanelResult[]>(
    dbPanelsToPanelResults(initialPanels)
  )
  const [openings, setOpenings] = useState<OpeningRow[]>(initialOpenings)

  const isCommitted = layout.status === 'committed'
  const isDraft = layout.status === 'draft'
  const modeLabel = layout.mode === 'wall' ? 'Veggur' : 'Filigran'

  // Current constraints from the layout
  const constraints: PanelizationConstraints = useMemo(
    () => ({
      maxPanelWidthMm: layout.max_panel_width_mm,
      preferredPanelWidthMm: layout.preferred_panel_width_mm,
      minPanelWidthMm: layout.min_panel_width_mm,
      maxPanelWeightKg: layout.max_panel_weight_kg,
      jointWidthMm: layout.joint_width_mm,
      concreteDensityKgM3: layout.concrete_density_kg_m3,
      maxTransportWidthMm: layout.max_transport_width_mm,
      maxTransportHeightMm: layout.max_transport_height_mm,
      maxTableLengthMm: layout.max_table_length_mm,
      maxTableWidthMm: layout.max_table_width_mm,
    }),
    [layout]
  )

  // Summary stats
  const totalWeight = useMemo(
    () =>
      Math.round(panelResults.reduce((s, p) => s + p.weightKg, 0) * 10) / 10,
    [panelResults]
  )
  const totalArea = useMemo(
    () =>
      Math.round(panelResults.reduce((s, p) => s + p.areaM2, 0) * 100) / 100,
    [panelResults]
  )
  const warningCount = useMemo(
    () =>
      panelResults.filter(
        (p) => p.exceedsWeight || p.exceedsTransport || p.exceedsTable
      ).length,
    [panelResults]
  )

  // ── Recalculate panels locally (instant preview) ────────────

  const recalculateLocally = useCallback(
    (newConstraints: PanelizationConstraints, currentOpenings: OpeningRow[]) => {
      const algoOpenings = dbOpeningsToAlgorithm(currentOpenings)
      const result =
        layout.mode === 'wall'
          ? calculateWallPanels({
              surface: {
                lengthMm: layout.surface_length_mm,
                heightMm: layout.surface_height_mm,
                thicknessMm: layout.thickness_mm,
              },
              openings: algoOpenings,
              constraints: newConstraints,
              namePrefix: layout.name_prefix,
              floor: layout.floor ?? 1,
            })
          : calculateFiligranPanels({
              surface: {
                lengthMm: layout.surface_length_mm,
                heightMm: layout.surface_height_mm,
                thicknessMm: layout.thickness_mm,
              },
              constraints: newConstraints,
              stripDirection:
                (layout.strip_direction as 'length' | 'width') ?? 'length',
              namePrefix: layout.name_prefix,
              floor: layout.floor ?? 1,
            })
      setPanelResults(result.panels)
    },
    [layout]
  )

  // ── Constraint update ──────────────────────────────────────

  const handleConstraintsUpdate = useCallback(
    (newConstraints: Record<string, number>) => {
      setError(null)
      setSuccess(null)

      // Instant local preview
      const merged = { ...constraints, ...camelCaseConstraints(newConstraints) }
      recalculateLocally(merged, openings)

      // Save to server
      startTransition(async () => {
        const result = await updateLayoutConstraints(layout.id, newConstraints)
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess('Skorður uppfærðar')
          setTimeout(() => setSuccess(null), 2000)
        }
      })
    },
    [constraints, layout.id, openings, recalculateLocally]
  )

  // ── Opening management ─────────────────────────────────────

  const handleAddOpening = useCallback(
    (openingData: Record<string, unknown>) => {
      setError(null)
      startTransition(async () => {
        const result = await addOpening(layout.id, openingData)
        if (result.error) {
          setError(result.error)
        } else {
          // Server recalculates — rely on revalidation
          router.refresh()
        }
      })
    },
    [layout.id, router]
  )

  const handleRemoveOpening = useCallback(
    (openingId: string) => {
      setError(null)
      // Optimistic: remove from local state
      const newOpenings = openings.filter((o) => o.id !== openingId)
      setOpenings(newOpenings)
      recalculateLocally(constraints, newOpenings)

      startTransition(async () => {
        const result = await removeOpening(layout.id, openingId)
        if (result.error) {
          setError(result.error)
          // Revert on error
          setOpenings(openings)
          recalculateLocally(constraints, openings)
        }
      })
    },
    [layout.id, openings, constraints, recalculateLocally]
  )

  // ── Delete layout ──────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!confirm('Ertu viss um að þú viljir eyða þessu plötuniði?')) return
    startTransition(async () => {
      const result = await deletePanelizationLayout(layout.id)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/admin/projects/${projectId}/panelization`)
      }
    })
  }, [layout.id, projectId, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={`/admin/projects/${projectId}/panelization`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {layout.name}
            </h1>
            <Badge variant="outline" className="text-xs">
              {modeLabel}
            </Badge>
            <Badge
              variant="outline"
              className={
                isCommitted
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }
            >
              {isCommitted ? 'Staðfest' : 'Drög'}
            </Badge>
          </div>
          <p className="text-sm text-zinc-600 ml-10">
            {projectName} — {(layout.surface_length_mm / 1000).toFixed(1)} ×{' '}
            {(layout.surface_height_mm / 1000).toFixed(1)} m,{' '}
            {layout.thickness_mm} mm þykkt
            {layout.floor != null && ` — Hæð ${layout.floor}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eyða
              </Button>
              <CommitDialog
                layoutId={layout.id}
                panelCount={panelResults.length}
                warningCount={warningCount}
                totalWeight={totalWeight}
              />
            </>
          )}
          {isCommitted && layout.elements_created != null && (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 border-green-200"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {layout.elements_created} einingar stofnaðar
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Main layout: SVG + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SVG Canvas — spans 3 columns */}
        <div className="lg:col-span-3">
          <SurfaceCanvas
            surfaceLengthMm={layout.surface_length_mm}
            surfaceHeightMm={layout.surface_height_mm}
            panels={panelResults}
            openings={dbOpeningsToAlgorithm(openings)}
            mode={layout.mode as 'wall' | 'filigran'}
            jointWidthMm={constraints.jointWidthMm}
          />
        </div>

        {/* Constraints sidebar */}
        <div className="lg:col-span-1">
          <ConstraintsSidebar
            constraints={constraints}
            mode={layout.mode as 'wall' | 'filigran'}
            isEditable={isDraft}
            isPending={isPending}
            onUpdate={handleConstraintsUpdate}
          />
        </div>
      </div>

      {/* Openings section (wall mode only) */}
      {layout.mode === 'wall' && isDraft && (
        <div className="flex items-center gap-2">
          <OpeningDialog
            surfaceLengthMm={layout.surface_length_mm}
            surfaceHeightMm={layout.surface_height_mm}
            onAdd={handleAddOpening}
            isPending={isPending}
          />
          {openings.length > 0 && (
            <span className="text-sm text-zinc-500">
              {openings.length} op skráð
            </span>
          )}
        </div>
      )}

      {/* Openings list */}
      {openings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {openings.map((o) => (
            <Badge
              key={o.id}
              variant="outline"
              className="gap-1 pr-1"
            >
              <span className="text-xs">
                {o.opening_type === 'window'
                  ? 'Gluggi'
                  : o.opening_type === 'door'
                    ? 'Hurð'
                    : 'Annað'}
                {o.label ? ` (${o.label})` : ''}: {o.width_mm}×{o.height_mm} mm
                @ {o.offset_x_mm},{o.offset_y_mm}
              </span>
              {isDraft && (
                <button
                  onClick={() => handleRemoveOpening(o.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700"
                  disabled={isPending}
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Panel table */}
      <PanelTable panels={panelResults} mode={layout.mode as 'wall' | 'filigran'} />

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-zinc-600 border-t pt-4">
        <div className="flex items-center gap-4">
          <span>
            <strong>{panelResults.length}</strong> plötur
          </span>
          <span>
            <strong>{totalWeight.toLocaleString('is-IS')}</strong> kg samtals
          </span>
          <span>
            <strong>{totalArea.toLocaleString('is-IS')}</strong> m² samtals
          </span>
        </div>
        {warningCount > 0 && (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {warningCount} viðvaranir
          </Badge>
        )}
      </div>

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 border">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          <span className="text-sm text-zinc-600">Vista...</span>
        </div>
      )}
    </div>
  )
}

/** Convert snake_case constraint keys to camelCase for the algorithm */
function camelCaseConstraints(
  snakeCase: Record<string, number>
): Partial<PanelizationConstraints> {
  const map: Record<string, keyof PanelizationConstraints> = {
    max_panel_width_mm: 'maxPanelWidthMm',
    preferred_panel_width_mm: 'preferredPanelWidthMm',
    min_panel_width_mm: 'minPanelWidthMm',
    max_panel_weight_kg: 'maxPanelWeightKg',
    joint_width_mm: 'jointWidthMm',
    concrete_density_kg_m3: 'concreteDensityKgM3',
    max_transport_width_mm: 'maxTransportWidthMm',
    max_transport_height_mm: 'maxTransportHeightMm',
    max_table_length_mm: 'maxTableLengthMm',
    max_table_width_mm: 'maxTableWidthMm',
  }
  const result: Partial<PanelizationConstraints> = {}
  for (const [key, val] of Object.entries(snakeCase)) {
    const camel = map[key]
    if (camel) (result as Record<string, number>)[camel] = val
  }
  return result
}
