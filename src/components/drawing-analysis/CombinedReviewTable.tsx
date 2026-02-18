'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import { ConfidenceBadge, type DisplayConfidenceLevel } from './ConfidenceBadge'
import { typeLabels } from './ElementReviewTable'
import type { ExtractedElement } from '@/lib/schemas/drawing-analysis'
import { mapElementType } from '@/lib/schemas/drawing-analysis'
import { estimateWeight, getWeightConfidenceOverride } from '@/lib/drawing-analysis/weight'

type CombinedElement = ExtractedElement & {
  sourceDocument: string
  analysisId: string
  originalIndex: number
}

function getWorstConfidence(
  confidence: ExtractedElement['confidence'],
  weightOverride?: DisplayConfidenceLevel
): DisplayConfidenceLevel {
  const weightLevel = weightOverride ?? confidence.weight
  const levels: DisplayConfidenceLevel[] = [
    confidence.name,
    confidence.dimensions,
    weightLevel,
  ]
  if (levels.includes('low')) return 'low'
  if (levels.includes('medium')) return 'medium'
  if (levels.includes('calculated')) return 'calculated'
  return 'high'
}

export function CombinedReviewTable({
  analyses,
}: {
  analyses: {
    id: string
    document_name: string
    extracted_elements: unknown
    status: string
  }[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [buildingFilter, setBuildingFilter] = useState<string>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')
  const [drawingFilter, setDrawingFilter] = useState<string>('all')

  // Flatten all elements from all analyses, tagging with source
  const allElements = useMemo<CombinedElement[]>(() => {
    const result: CombinedElement[] = []
    for (const analysis of analyses) {
      const elements = Array.isArray(analysis.extracted_elements)
        ? (analysis.extracted_elements as ExtractedElement[])
        : []
      for (let i = 0; i < elements.length; i++) {
        result.push({
          ...elements[i],
          sourceDocument: analysis.document_name,
          analysisId: analysis.id,
          originalIndex: i,
        })
      }
    }
    return result
  }, [analyses])

  // Extract unique values for filter dropdowns
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>()
    for (const el of allElements) {
      types.add(mapElementType(el.element_type))
    }
    return Array.from(types).sort()
  }, [allElements])

  const uniqueBuildings = useMemo(() => {
    const buildings = new Set<string>()
    for (const el of allElements) {
      if (el.building) buildings.add(el.building)
    }
    return Array.from(buildings).sort()
  }, [allElements])

  const uniqueDrawings = useMemo(() => {
    const drawings = new Set<string>()
    for (const el of allElements) {
      drawings.add(el.sourceDocument)
    }
    return Array.from(drawings)
  }, [allElements])

  // Apply filters
  const filteredElements = useMemo(() => {
    return allElements.filter((el) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !el.name.toLowerCase().includes(q) &&
          !el.sourceDocument.toLowerCase().includes(q) &&
          !(el.building?.toLowerCase().includes(q))
        ) {
          return false
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (mapElementType(el.element_type) !== typeFilter) return false
      }

      // Building filter
      if (buildingFilter !== 'all') {
        if ((el.building || '') !== buildingFilter) return false
      }

      // Drawing filter
      if (drawingFilter !== 'all') {
        if (el.sourceDocument !== drawingFilter) return false
      }

      // Confidence filter
      if (confidenceFilter !== 'all') {
        const systemType = mapElementType(el.element_type)
        const weightConf = getWeightConfidenceOverride(
          systemType,
          el.length_mm,
          el.width_mm,
          el.height_mm,
          el.confidence.weight
        )
        const worst = getWorstConfidence(el.confidence, weightConf)
        if (worst !== confidenceFilter) return false
      }

      return true
    })
  }, [allElements, searchQuery, typeFilter, buildingFilter, confidenceFilter, drawingFilter])

  // Summary stats
  const totalQuantity = filteredElements.reduce(
    (sum, el) => sum + (el.quantity || 1),
    0
  )

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 bg-zinc-50 rounded-lg p-4">
        <span className="text-sm text-zinc-600">
          <strong>{analyses.length}</strong> teikningar
        </span>
        <span className="text-sm text-zinc-600">
          <strong>{allElements.length}</strong> teikningaeiningar
        </span>
        {filteredElements.length !== allElements.length && (
          <span className="text-sm text-purple-600">
            <strong>{filteredElements.length}</strong> sýndar
          </span>
        )}
        <span className="text-sm text-zinc-600">
          <strong>{totalQuantity}</strong> einingar samtals (eftir magn)
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Leita eftir nafni, teikningu eða byggingu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={drawingFilter} onValueChange={setDrawingFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Teikning" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Allar teikningar</SelectItem>
            {uniqueDrawings.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Tegund" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Allar tegundir</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {typeLabels[t] || t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueBuildings.length > 0 && (
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Bygging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Allar byggingar</SelectItem>
              {uniqueBuildings.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Öryggi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Allt öryggi</SelectItem>
            <SelectItem value="high">Hátt</SelectItem>
            <SelectItem value="calculated">Reiknað</SelectItem>
            <SelectItem value="medium">Miðlungs</SelectItem>
            <SelectItem value="low">Lágt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-zinc-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Teikning
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Nafn
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Tegund
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Bygging
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Hæð
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                L × B × H (mm)
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Þyngd (kg)
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Magn
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase">
                Öryggi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredElements.map((element, idx) => {
              const systemType = mapElementType(element.element_type)
              const typeLabel = typeLabels[systemType] || element.element_type

              // Estimate weight if not provided
              let displayWeight = element.weight_kg
              if (!displayWeight && element.length_mm && element.width_mm) {
                const est = estimateWeight(
                  element.length_mm,
                  element.width_mm,
                  element.height_mm,
                  systemType
                )
                if (est) {
                  displayWeight = est.weightKg
                }
              }

              const weightConfidence = getWeightConfidenceOverride(
                systemType,
                element.length_mm,
                element.width_mm,
                element.height_mm,
                element.confidence.weight
              )
              const worstConfidence = getWorstConfidence(
                element.confidence,
                weightConfidence
              )

              return (
                <TableRow
                  key={`${element.analysisId}-${element.originalIndex}-${idx}`}
                  className={
                    worstConfidence === 'low'
                      ? 'bg-red-50/50'
                      : worstConfidence === 'medium'
                        ? 'bg-yellow-50/30'
                        : ''
                  }
                >
                  <TableCell className="py-2">
                    <Badge
                      variant="secondary"
                      className="bg-zinc-100 text-zinc-700 border-0 font-normal text-xs truncate max-w-[150px]"
                    >
                      {element.sourceDocument}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600 font-mono">
                      {element.name}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600">
                      {typeLabel}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600">
                      {element.building || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600">
                      {element.floor != null ? element.floor : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600 font-mono">
                      {element.length_mm || '—'} × {element.width_mm || '—'}
                      {element.height_mm != null && ` × ${element.height_mm}`}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600 font-mono">
                      {displayWeight
                        ? displayWeight.toLocaleString('is-IS')
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-zinc-600">
                      {element.quantity > 1 ? element.quantity : '1'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <ConfidenceBadge level={worstConfidence} />
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredElements.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-zinc-500">
                  Engar einingar passa við síu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
