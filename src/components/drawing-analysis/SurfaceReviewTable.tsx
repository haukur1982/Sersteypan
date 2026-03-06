'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Grid3X3,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { ConfidenceBadge } from './ConfidenceBadge'
import type { ExtractedSurface } from '@/lib/schemas/surface-analysis'
import { createPanelizationFromSurfaces } from '@/lib/panelization/actions'

const surfaceTypeLabels: Record<string, string> = {
  wall: 'Veggur',
  floor: 'Gólf',
}

const wallTypeLabels: Record<string, string> = {
  outer: 'Útveggur',
  sandwich: 'Samlokuveggur',
  inner: 'Stoðveggur',
}

interface SurfaceReviewTableProps {
  analysisId: string
  projectId: string
  surfaces: ExtractedSurface[]
  isCommitted: boolean
}

export function SurfaceReviewTable({
  analysisId,
  projectId,
  surfaces,
  isCommitted,
}: SurfaceReviewTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(surfaces.map((_, i) => i))
  )
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedCount = selected.size

  const toggleAll = () => {
    if (selected.size === surfaces.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(surfaces.map((_, i) => i)))
    }
  }

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Count walls and floors in selection
  const selectionSummary = useMemo(() => {
    let walls = 0
    let floors = 0
    for (const idx of selected) {
      const s = surfaces[idx]
      if (s?.surface_type === 'wall') walls++
      if (s?.surface_type === 'floor') floors++
    }
    return { walls, floors }
  }, [selected, surfaces])

  const handleCreatePanelization = async () => {
    if (selectedCount === 0) return

    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await createPanelizationFromSurfaces(
        analysisId,
        projectId,
        Array.from(selected)
      )

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(
          `${result.count} plötusnið stofnuð! Opna plötusnið til að skoða og staðfesta.`
        )
        router.push(`/admin/projects/${projectId}/panelization`)
      }
    } catch {
      setError('Óvænt villa kom upp')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      {!isCommitted && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            {selectedCount} af {surfaces.length} flötum valdar
            {selectionSummary.walls > 0 && ` (${selectionSummary.walls} veggir`}
            {selectionSummary.walls > 0 && selectionSummary.floors > 0 && ', '}
            {selectionSummary.walls > 0 && selectionSummary.floors === 0 && ')'}
            {selectionSummary.floors > 0 && `${selectionSummary.walls > 0 ? '' : ' ('}${selectionSummary.floors} gólf)`}
          </p>
          <Button
            onClick={handleCreatePanelization}
            disabled={isCreating || selectedCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Búa til...
              </>
            ) : (
              <>
                <Grid3X3 className="mr-2 h-4 w-4" />
                Búa til plötusnið ({selectedCount})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded bg-red-50 border border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 rounded bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              {!isCommitted && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === surfaces.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead>Heiti</TableHead>
              <TableHead>Tegund</TableHead>
              <TableHead>Vegggerð</TableHead>
              <TableHead className="text-right">Lengd (mm)</TableHead>
              <TableHead className="text-right">Hæð/Breidd (mm)</TableHead>
              <TableHead className="text-right">Þykkt (mm)</TableHead>
              <TableHead className="text-center">Hæð</TableHead>
              <TableHead className="text-center">Op</TableHead>
              <TableHead className="text-center">Traust</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surfaces.map((surface, index) => (
              <TableRow
                key={index}
                className={selected.has(index) ? 'bg-blue-50/50' : ''}
              >
                {!isCommitted && (
                  <TableCell>
                    <Checkbox
                      checked={selected.has(index)}
                      onCheckedChange={() => toggle(index)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium text-sm">
                  {surface.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      surface.surface_type === 'wall'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {surfaceTypeLabels[surface.surface_type] || surface.surface_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-zinc-600">
                  {surface.wall_type
                    ? wallTypeLabels[surface.wall_type] || surface.wall_type
                    : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {surface.length_mm.toLocaleString('is-IS')}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {surface.height_mm.toLocaleString('is-IS')}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {surface.thickness_mm}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {surface.floor != null ? `${surface.floor}H` : '—'}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {surface.openings.length > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {surface.openings.length}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <ConfidenceBadge level={surface.confidence.dimensions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
