'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle } from 'lucide-react'
import type { PanelResult } from '@/lib/panelization/types'

interface PanelTableProps {
  panels: PanelResult[]
  mode: 'wall' | 'filigran'
}

/**
 * Table showing all panels with dimensions, weight, and constraint warnings.
 * Includes a summary row at the bottom.
 */
export function PanelTable({ panels, mode }: PanelTableProps) {
  if (panels.length === 0) {
    return (
      <Card className="border-zinc-200">
        <CardContent className="py-8 text-center text-sm text-zinc-500">
          Engar plötur reiknaðar
        </CardContent>
      </Card>
    )
  }

  const totalWeight = Math.round(
    panels.reduce((s, p) => s + p.weightKg, 0) * 10
  ) / 10
  const totalArea = Math.round(
    panels.reduce((s, p) => s + p.areaM2, 0) * 100
  ) / 100
  const totalVolume = Math.round(
    panels.reduce((s, p) => s + p.volumeM3, 0) * 1000
  ) / 1000

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Plötur ({panels.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Nafn</TableHead>
                <TableHead className="text-right">
                  {mode === 'wall' ? 'Breidd' : 'Breidd'}
                </TableHead>
                <TableHead className="text-right">
                  {mode === 'wall' ? 'Hæð' : 'Lengd'}
                </TableHead>
                <TableHead className="text-right">Flatarmál</TableHead>
                <TableHead className="text-right">Rúmmál</TableHead>
                <TableHead className="text-right">Þyngd</TableHead>
                <TableHead className="text-center">Staða</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => {
                const warnings = getWarnings(panel)
                const hasWarning = warnings.length > 0

                return (
                  <TableRow
                    key={panel.index}
                    className={hasWarning ? 'bg-red-50/50' : undefined}
                  >
                    <TableCell className="font-mono font-medium text-sm">
                      {panel.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {panel.widthMm.toLocaleString('is-IS')} mm
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {panel.heightMm.toLocaleString('is-IS')} mm
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {panel.areaM2.toLocaleString('is-IS')} m²
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {panel.volumeM3.toLocaleString('is-IS')} m³
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {panel.weightKg.toLocaleString('is-IS')} kg
                    </TableCell>
                    <TableCell className="text-center">
                      {hasWarning ? (
                        <div className="flex items-center justify-center gap-1">
                          {warnings.map((w) => (
                            <Badge
                              key={w}
                              variant="outline"
                              className="text-[10px] bg-red-100 text-red-800 border-red-200 gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {w}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-100 text-green-800 border-green-200"
                        >
                          Í lagi
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Summary row */}
              <TableRow className="border-t-2 font-medium bg-zinc-50">
                <TableCell className="text-sm">Samtals</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right tabular-nums text-sm">
                  {totalArea.toLocaleString('is-IS')} m²
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {totalVolume.toLocaleString('is-IS')} m³
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {totalWeight.toLocaleString('is-IS')} kg
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function getWarnings(panel: PanelResult): string[] {
  const warnings: string[] = []
  if (panel.exceedsWeight) warnings.push('Þyngd')
  if (panel.exceedsTransport) warnings.push('Flutningur')
  if (panel.exceedsTable) warnings.push('Borð')
  return warnings
}
