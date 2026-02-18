'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { ConfidenceBadge, type DisplayConfidenceLevel } from './ConfidenceBadge'
import { EditableCell } from './EditableCell'
import type { ExtractedElement } from '@/lib/schemas/drawing-analysis'
import { mapElementType } from '@/lib/schemas/drawing-analysis'
import { estimateWeight, getWeightConfidenceOverride } from '@/lib/drawing-analysis/weight'
import { commitAnalysisElements, updateExtractedElement } from '@/lib/drawing-analysis/actions'

type Building = { id: string; name: string; floors: number | null }

export const typeLabels: Record<string, string> = {
  filigran: 'Filigran',
  balcony: 'Svalir',
  svalagangur: 'Svalagangur',
  staircase: 'Stigi',
  wall: 'Veggur',
  column: 'Súla',
  beam: 'Bita',
  ceiling: 'Þak',
  other: 'Annað',
}

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({
  value,
  label,
}))

function getWorstConfidence(
  confidence: ExtractedElement['confidence'],
  weightOverride?: DisplayConfidenceLevel
): DisplayConfidenceLevel {
  const weightLevel = weightOverride ?? confidence.weight
  const levels: (DisplayConfidenceLevel)[] = [
    confidence.name,
    confidence.dimensions,
    weightLevel,
  ]
  if (levels.includes('low')) return 'low'
  if (levels.includes('medium')) return 'medium'
  if (levels.includes('calculated')) return 'calculated'
  return 'high'
}

export function ElementReviewTable({
  analysisId,
  projectId,
  elements: initialElements,
  buildings,
  existingNames,
  isCommitted,
}: {
  analysisId: string
  projectId: string
  elements: ExtractedElement[]
  buildings: Building[]
  existingNames: string[]
  isCommitted: boolean
}) {
  const router = useRouter()
  // Local elements for optimistic updates during inline editing
  const [elements, setElements] = useState<ExtractedElement[]>(initialElements)
  const [selected, setSelected] = useState<Set<number>>(
    new Set(initialElements.map((_, i) => i))
  )
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect unique building names from AI extraction
  const detectedBuildings = useMemo(() => {
    const names = new Set<string>()
    for (const el of elements) {
      if (el.building) names.add(el.building)
    }
    return Array.from(names)
  }, [elements])

  // Check which buildings need to be created
  const existingBuildingNames = new Set(
    buildings.map((b) => b.name.toLowerCase())
  )
  const newBuildings = detectedBuildings.filter((name) => {
    const lower = name.toLowerCase()
    return (
      !existingBuildingNames.has(lower) &&
      !existingBuildingNames.has(`hús ${lower}`) &&
      !existingBuildingNames.has(lower.replace(/^hús\s+/i, ''))
    )
  })

  const existingNameSet = new Set(existingNames.map((n) => n.toLowerCase()))

  const toggleAll = () => {
    if (selected.size === elements.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(elements.map((_, i) => i)))
    }
  }

  const toggleOne = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelected(next)
  }

  // Count total elements including expanded quantities
  const totalElements = useMemo(() => {
    let count = 0
    for (const idx of selected) {
      const el = elements[idx]
      if (el) count += el.quantity || 1
    }
    return count
  }, [selected, elements])

  // Inline edit handler — optimistic update + server persist
  const handleCellSave = useCallback(
    async (index: number, field: string, value: string | number | null) => {
      // Optimistic update
      setElements((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })

      // Persist via server action
      const result = await updateExtractedElement(analysisId, index, {
        [field]: value,
      } as Partial<ExtractedElement>)

      if (result.error) {
        // Rollback on error
        setElements(initialElements)
        setError(result.error)
      }
    },
    [analysisId, initialElements]
  )

  async function handleCommit() {
    if (selected.size === 0) {
      setError('Veldu að minnsta kosti eina einingu.')
      return
    }

    const confirmMsg = `Ertu viss?\n\n${selected.size} teikningaeiningar valdar → ${totalElements} einingar verða stofnaðar í kerfinu.${
      newBuildings.length > 0
        ? `\n\nNýjar byggingar verða stofnaðar: ${newBuildings.join(', ')}`
        : ''
    }`

    if (!confirm(confirmMsg)) return

    setIsCommitting(true)
    setError(null)

    try {
      const buildingsToCreate = newBuildings.map((name) => ({
        name: name.match(/^[A-Za-z]$/) ? `Hús ${name}` : name,
        tempId: name.toLowerCase(),
      }))

      const result = await commitAnalysisElements(
        analysisId,
        Array.from(selected),
        buildingsToCreate.length > 0 ? buildingsToCreate : undefined
      )

      if (result.error) {
        setError(result.error)
        setIsCommitting(false)
        return
      }

      // Success — redirect to project page
      router.push(`/admin/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      console.error('Commit error:', err)
      setError('Óvænt villa. Reyndu aftur.')
      setIsCommitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-zinc-50 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            <strong>{elements.length}</strong> einingar greindar
          </span>
          <span className="text-sm text-zinc-600">
            <strong>{selected.size}</strong> valdar
          </span>
          {totalElements !== selected.size && (
            <span className="text-sm text-purple-600">
              → <strong>{totalElements}</strong> eftir magn-útvíkkun
            </span>
          )}
          {newBuildings.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 border-0"
            >
              {newBuildings.length} nýjar byggingar
            </Badge>
          )}
        </div>

        {!isCommitted && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size === elements.length
                ? 'Afvelja allt'
                : 'Velja allt'}
            </Button>
            <Button
              onClick={handleCommit}
              disabled={isCommitting || selected.size === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stofna einingar...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Stofna valdar einingar ({totalElements})
                </>
              )}
            </Button>
          </div>
        )}

        {isCommitted && (
          <Badge className="bg-purple-100 text-purple-800 border-0">
            Einingar stofnaðar
          </Badge>
        )}
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Elements Table */}
      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-zinc-50 sticky top-0 z-10">
            <TableRow>
              {!isCommitted && (
                <TableHead className="w-[40px] py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === elements.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[100px]">
                Nafn
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[80px]">
                Tegund
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[70px]">
                Bygging
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase w-[50px]">
                Hæð
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[180px]">
                L × B × H (mm)
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[90px]">
                Þyngd (kg)
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase w-[50px]">
                Magn
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase min-w-[200px]">
                Járn
              </TableHead>
              <TableHead className="py-3 text-xs font-medium text-zinc-500 uppercase w-[70px]">
                Öryggi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elements.map((element, index) => {
              const isDuplicate = existingNameSet.has(
                element.name.toLowerCase()
              )
              const systemType = mapElementType(element.element_type)
              const typeLabel = typeLabels[systemType] || element.element_type

              // Estimate weight if not provided
              let displayWeight = element.weight_kg
              let weightSource: 'drawing' | 'calculated' | 'estimated' | null =
                element.weight_kg ? 'drawing' : null
              if (!displayWeight && element.length_mm && element.width_mm) {
                const est = estimateWeight(
                  element.length_mm,
                  element.width_mm,
                  element.height_mm,
                  systemType
                )
                if (est) {
                  displayWeight = est.weightKg
                  weightSource = est.source
                }
              }

              // Smarter weight confidence: override AI's "low" for calculable types
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

              const editable = !isCommitted
              const saveFn = (field: string, value: string | number | null) =>
                handleCellSave(index, field, value)

              return (
                <TableRow
                  key={index}
                  className={`${
                    worstConfidence === 'low'
                      ? 'bg-red-50/50'
                      : worstConfidence === 'medium'
                        ? 'bg-yellow-50/30'
                        : ''
                  } ${isDuplicate ? 'bg-orange-50/50' : ''}`}
                >
                  {!isCommitted && (
                    <TableCell className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(index)}
                        onChange={() => toggleOne(index)}
                        className="rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <EditableCell
                        value={element.name}
                        field="name"
                        type="text"
                        disabled={!editable}
                        onSave={saveFn}
                        mono
                      />
                      {isDuplicate && (
                        <span title="Eining með þessu nafni er þegar til">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <EditableCell
                      value={systemType}
                      field="element_type"
                      type="select"
                      options={typeOptions}
                      disabled={!editable}
                      onSave={saveFn}
                      displayValue={typeLabel}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <EditableCell
                      value={element.building}
                      field="building"
                      type="text"
                      disabled={!editable}
                      onSave={saveFn}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <EditableCell
                      value={element.floor}
                      field="floor"
                      type="number"
                      disabled={!editable}
                      onSave={saveFn}
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-0.5 text-sm text-zinc-600 font-mono">
                      <EditableCell
                        value={element.length_mm}
                        field="length_mm"
                        type="number"
                        disabled={!editable}
                        onSave={saveFn}
                        mono
                      />
                      <span className="text-zinc-400">×</span>
                      <EditableCell
                        value={element.width_mm}
                        field="width_mm"
                        type="number"
                        disabled={!editable}
                        onSave={saveFn}
                        mono
                      />
                      {element.height_mm != null && (
                        <>
                          <span className="text-zinc-400">×</span>
                          <EditableCell
                            value={element.height_mm}
                            field="height_mm"
                            type="number"
                            disabled={!editable}
                            onSave={saveFn}
                            mono
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {displayWeight ? (
                      <div className="flex items-center gap-1">
                        <EditableCell
                          value={element.weight_kg}
                          field="weight_kg"
                          type="number"
                          disabled={!editable}
                          onSave={saveFn}
                          displayValue={displayWeight.toLocaleString('is-IS')}
                          mono
                        />
                        {weightSource === 'calculated' && (
                          <span className="text-xs text-zinc-400">(reikn.)</span>
                        )}
                        {weightSource === 'estimated' && (
                          <span className="text-xs text-amber-500">(áætl.)</span>
                        )}
                      </div>
                    ) : (
                      <EditableCell
                        value={element.weight_kg}
                        field="weight_kg"
                        type="number"
                        disabled={!editable}
                        onSave={saveFn}
                        mono
                      />
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <EditableCell
                      value={element.quantity}
                      field="quantity"
                      type="number"
                      disabled={!editable}
                      onSave={saveFn}
                      displayValue={
                        element.quantity > 1
                          ? String(element.quantity)
                          : '1'
                      }
                    />
                    {element.quantity > 1 &&
                      element.production_notes?.match(/\d+H:/) && (
                        <ChevronDown className="inline h-3 w-3 text-purple-400 ml-0.5" />
                      )}
                  </TableCell>
                  <TableCell className="py-2">
                    <EditableCell
                      value={element.rebar_spec}
                      field="rebar_spec"
                      type="text"
                      disabled={!editable}
                      onSave={saveFn}
                      mono
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <ConfidenceBadge level={worstConfidence} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
