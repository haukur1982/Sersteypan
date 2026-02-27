'use client'

import { useState, useEffect, useMemo } from 'react'
import { naturalCompare } from '@/lib/utils/naturalSort'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers, Loader2, AlertCircle, Plus, ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { createBatch, getUnbatchedElements } from '@/lib/factory/batch-actions'
import { calculateVolumeM3 } from '@/lib/drawing-analysis/weight'

interface UnbatchedElement {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  weight_kg: number | null
  piece_count: number
  cast_done_count: number
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
}

// Tab order matching owner's mockup: Filigran → Balcony → Stairs → Columns → Other
const typeTabOrder = [
  { key: 'filigran', label: 'Filigran' },
  { key: 'balcony', label: 'Svalir' },
  { key: 'svalagangur', label: 'Svalagangur' },
  { key: 'staircase', label: 'Stigi' },
  { key: 'wall', label: 'Veggur' },
  { key: 'column', label: 'Súla' },
  { key: 'beam', label: 'Bita' },
  { key: 'ceiling', label: 'Þak' },
  { key: 'other', label: 'Annað' },
]

const typeLabels: Record<string, string> = {
  wall: 'Veggur',
  filigran: 'Filigran',
  balcony: 'Svalir',
  svalagangur: 'Svalagangur',
  staircase: 'Stigi',
  column: 'Súla',
  beam: 'Bita',
  ceiling: 'Þak',
  other: 'Annað',
}

interface BatchCreateDialogProps {
  projectId: string
  trigger?: React.ReactNode
}

export function BatchCreateDialog({ projectId, trigger }: BatchCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingElements, setFetchingElements] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [elements, setElements] = useState<UnbatchedElement[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map())
  const [concreteSupplier, setConcreteSupplier] = useState('')
  const [concreteGrade, setConcreteGrade] = useState('C35 ½ flot 70-75 á mæli')
  const [airTemperature, setAirTemperature] = useState('')
  const [notes, setNotes] = useState('')
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set())

  // Fetch unbatched elements when dialog opens
  useEffect(() => {
    if (!open) return

    let cancelled = false
    const fetchElements = async () => {
      try {
        const { data, error: fetchError } = await getUnbatchedElements(projectId)
        if (cancelled) return

        // Natural alphanumeric sort by name (e.g. F(A)-1-2 after F(A)-1-1)
        const sortedData = (data || []).sort((a, b) =>
          naturalCompare(a.name, b.name)
        )

        setElements(sortedData)
        if (fetchError) setError(fetchError)
      } catch {
        if (!cancelled) setError('Villa við að sækja einingar')
      } finally {
        if (!cancelled) setFetchingElements(false)
      }
    }

    fetchElements()
    return () => { cancelled = true }
  }, [open, projectId])

  // Group elements by type, then by floor
  const groupedByType = useMemo(() => {
    const groups: Record<string, UnbatchedElement[]> = {}
    for (const el of elements) {
      const type = el.element_type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(el)
    }
    return groups
  }, [elements])

  // Available tabs (only types that have elements)
  const availableTabs = useMemo(() => {
    // First, add tabs that are in our defined order
    const tabs: { key: string; label: string; count: number }[] = []
    for (const tab of typeTabOrder) {
      if (groupedByType[tab.key]) {
        tabs.push({ ...tab, count: groupedByType[tab.key].length })
      }
    }
    // Then add any types not in our predefined order
    for (const type of Object.keys(groupedByType)) {
      if (!typeTabOrder.some((t) => t.key === type)) {
        tabs.push({
          key: type,
          label: typeLabels[type] || type,
          count: groupedByType[type].length,
        })
      }
    }
    return tabs
  }, [groupedByType])

  // Group elements within a type by floor
  function getFloorGroups(typeElements: UnbatchedElement[]) {
    const floors: Record<string, UnbatchedElement[]> = {}
    for (const el of typeElements) {
      const floorKey = el.floor != null ? `${el.floor}` : 'null'
      if (!floors[floorKey]) floors[floorKey] = []
      floors[floorKey].push(el)
    }
    // Sort floor keys numerically
    const sortedKeys = Object.keys(floors).sort((a, b) => {
      if (a === 'null') return 1
      if (b === 'null') return -1
      return Number(a) - Number(b)
    })
    return sortedKeys.map((key) => ({
      floorKey: key,
      floorLabel: key === 'null' ? 'Án hæðar' : `Hæð ${key}`,
      elements: floors[key],
    }))
  }

  function remainingPieces(el: UnbatchedElement) {
    return (el.piece_count || 1) - (el.cast_done_count || 0)
  }

  function toggleElement(id: string) {
    const el = elements.find(e => e.id === id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setQuantities(prev => { const m = new Map(prev); m.delete(id); return m })
      } else {
        next.add(id)
        if (el && (el.piece_count || 1) > 1) {
          setQuantities(prev => new Map(prev).set(id, remainingPieces(el)))
        }
      }
      return next
    })
  }

  function selectAllInTab(typeKey: string) {
    const typeElements = groupedByType[typeKey] || []
    const allSelected = typeElements.every((e) => selectedIds.has(e.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        typeElements.forEach((e) => next.delete(e.id))
        setQuantities(prev => {
          const m = new Map(prev)
          typeElements.forEach(e => m.delete(e.id))
          return m
        })
      } else {
        typeElements.forEach((e) => next.add(e.id))
        setQuantities(prev => {
          const m = new Map(prev)
          typeElements.forEach(e => {
            if ((e.piece_count || 1) > 1) m.set(e.id, remainingPieces(e))
          })
          return m
        })
      }
      return next
    })
  }

  function selectAllInFloor(typeKey: string, floorKey: string) {
    const typeElements = groupedByType[typeKey] || []
    const floorElements = typeElements.filter(
      (e) => (e.floor != null ? `${e.floor}` : 'null') === floorKey
    )
    const allSelected = floorElements.every((e) => selectedIds.has(e.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        floorElements.forEach((e) => next.delete(e.id))
        setQuantities(prev => {
          const m = new Map(prev)
          floorElements.forEach(e => m.delete(e.id))
          return m
        })
      } else {
        floorElements.forEach((e) => next.add(e.id))
        setQuantities(prev => {
          const m = new Map(prev)
          floorElements.forEach(e => {
            if ((e.piece_count || 1) > 1) m.set(e.id, remainingPieces(e))
          })
          return m
        })
      }
      return next
    })
  }

  function toggleFloorCollapse(typeKey: string, floorKey: string) {
    const compositeKey = `${typeKey}:${floorKey}`
    setCollapsedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(compositeKey)) {
        next.delete(compositeKey)
      } else {
        next.add(compositeKey)
      }
      return next
    })
  }

  async function handleCreate() {
    if (selectedIds.size === 0) {
      setError('Veldu a.m.k. eina einingu')
      return
    }

    setLoading(true)
    setError(null)

    // Build element_quantities for multi-piece elements
    const elementQuantities: Record<string, number> = {}
    for (const id of selectedIds) {
      const qty = quantities.get(id)
      if (qty != null) elementQuantities[id] = qty
    }

    const result = await createBatch({
      project_id: projectId,
      element_ids: Array.from(selectedIds),
      concrete_supplier: concreteSupplier || undefined,
      concrete_grade: concreteGrade || undefined,
      air_temperature_c: airTemperature ? parseFloat(airTemperature) : undefined,
      notes: notes || undefined,
      element_quantities: Object.keys(elementQuantities).length > 0 ? elementQuantities : undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      // Reset
      setSelectedIds(new Set())
      setQuantities(new Map())
      setConcreteSupplier('')
      setConcreteGrade('')
      setAirTemperature('')
      setNotes('')
      setCollapsedFloors(new Set())
      // Navigate to the new batch
      if ('batchId' in result && result.batchId) {
        router.push(`/factory/batches/${result.batchId}`)
      } else {
        router.refresh()
      }
    }
  }

  const selectedElements = elements.filter((e) => selectedIds.has(e.id))
  const totalWeight = selectedElements.reduce((sum, e) => sum + (e.weight_kg || 0), 0)
  const totalVolumeM3 = selectedElements.reduce((sum, e) => {
    if (e.length_mm && e.width_mm && e.height_mm) {
      const qty = quantities.get(e.id) ?? remainingPieces(e)
      return sum + calculateVolumeM3(e.length_mm, e.width_mm, e.height_mm) * qty
    }
    return sum
  }, 0)
  const totalPieces = selectedElements.reduce((sum, e) => {
    const qty = quantities.get(e.id)
    return sum + (qty ?? remainingPieces(e))
  }, 0)

  // Count selected per type
  function selectedCountForType(typeKey: string) {
    const typeElements = groupedByType[typeKey] || []
    return typeElements.filter((e) => selectedIds.has(e.id)).length
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        setFetchingElements(true)
        setError(null)
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Stofna steypulotu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Stofna steypulotu
          </DialogTitle>
          <DialogDescription>
            Veldu einingar til að steypa saman. Lotunúmer er sjálfvirkt.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Concrete info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="concrete_supplier">Steypuverksmiðja</Label>
            <Input
              id="concrete_supplier"
              value={concreteSupplier}
              onChange={(e) => setConcreteSupplier(e.target.value)}
              placeholder="t.d. BM Vallá"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concrete_grade">Steypustyrkur</Label>
            <Input
              id="concrete_grade"
              value={concreteGrade}
              onChange={(e) => setConcreteGrade(e.target.value)}
              placeholder="t.d. C30/37"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="air_temperature">Hitastig (°C)</Label>
            <Input
              id="air_temperature"
              type="number"
              step="0.5"
              value={airTemperature}
              onChange={(e) => setAirTemperature(e.target.value)}
              placeholder="t.d. 12.5"
              disabled={loading}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="batch_notes">Athugasemdir</Label>
          <Textarea
            id="batch_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Athugasemdir um þessa lotu..."
            rows={2}
            disabled={loading}
          />
        </div>

        {/* Element picker with tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Einingar ({selectedIds.size} valdar{totalPieces !== selectedIds.size ? ` · ${totalPieces} stk` : ''})
            </Label>
          </div>

          {fetchingElements ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              <span className="ml-2 text-sm text-zinc-500">Sæki einingar...</span>
            </div>
          ) : elements.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Engar ótengdar einingar fundust (aðeins &quot;Skipulögð&quot; og &quot;Járnabundin&quot; einingar)
            </div>
          ) : availableTabs.length === 1 ? (
            // Single type — no tabs needed, just show floor groups
            <div className="border border-zinc-200 rounded-lg max-h-72 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-medium">{availableTabs[0].label} ({availableTabs[0].count})</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAllInTab(availableTabs[0].key)}
                  disabled={loading}
                  className="h-7 text-xs"
                >
                  {selectedCountForType(availableTabs[0].key) === availableTabs[0].count ? 'Afvelja allar' : 'Velja allar'}
                </Button>
              </div>
              {renderFloorGroups(availableTabs[0].key)}
            </div>
          ) : (
            // Multiple types — show tabs
            <Tabs defaultValue={availableTabs[0]?.key} className="w-full">
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-zinc-100 p-1">
                {availableTabs.map((tab) => {
                  const selCount = selectedCountForType(tab.key)
                  return (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="text-xs px-3 py-1.5 data-[state=active]:bg-white"
                    >
                      {tab.label}
                      <Badge
                        variant="secondary"
                        className={`ml-1.5 text-[10px] px-1.5 py-0 ${selCount > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-zinc-200 text-zinc-600'
                          }`}
                      >
                        {selCount > 0 ? `${selCount}/${tab.count}` : tab.count}
                      </Badge>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {availableTabs.map((tab) => (
                <TabsContent key={tab.key} value={tab.key} className="mt-2">
                  <div className="border border-zinc-200 rounded-lg max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                      <span className="text-sm font-medium">
                        {tab.label} ({selectedCountForType(tab.key)} / {tab.count} valdar)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => selectAllInTab(tab.key)}
                        disabled={loading}
                        className="h-7 text-xs"
                      >
                        {selectedCountForType(tab.key) === tab.count ? 'Afvelja allar' : 'Velja allar'}
                      </Button>
                    </div>
                    {renderFloorGroups(tab.key)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {selectedIds.size > 0 && (
            <div className="space-y-0.5">
              <p className="text-sm text-zinc-600">
                Heildarþyngd: <span className="font-medium">{totalWeight.toLocaleString('is-IS')} kg</span>
              </p>
              {totalVolumeM3 > 0 && (
                <p className="text-sm text-zinc-600">
                  Heildar-m³: <span className="font-medium">{totalVolumeM3.toFixed(2)} m³</span>
                  <span className="text-zinc-400 ml-1">({Math.ceil(totalVolumeM3 / 9)} ferðir)</span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Hætta við
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || selectedIds.size === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stofna...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Stofna lotu ({totalPieces} stk)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  function renderFloorGroups(typeKey: string) {
    const typeElements = groupedByType[typeKey] || []
    const floorGroups = getFloorGroups(typeElements)

    if (floorGroups.length === 1) {
      // Single floor — no grouping headers needed
      return (
        <div className="divide-y divide-zinc-100">
          {floorGroups[0].elements.map((element) => renderElementRow(element))}
        </div>
      )
    }

    return (
      <div>
        {floorGroups.map((group) => {
          const compositeKey = `${typeKey}:${group.floorKey}`
          const isCollapsed = collapsedFloors.has(compositeKey)
          const floorSelectedCount = group.elements.filter((e) => selectedIds.has(e.id)).length
          const allFloorSelected = floorSelectedCount === group.elements.length

          return (
            <div key={group.floorKey}>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50/80 border-b border-zinc-100 sticky top-10 z-[5]">
                <button
                  type="button"
                  onClick={() => toggleFloorCollapse(typeKey, group.floorKey)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {group.floorLabel}
                </button>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {group.elements.length}
                </Badge>
                <button
                  type="button"
                  onClick={() => selectAllInFloor(typeKey, group.floorKey)}
                  disabled={loading}
                  className="ml-auto text-[11px] text-blue-600 hover:underline disabled:opacity-50"
                >
                  {allFloorSelected ? 'Afvelja' : 'Velja allar'}
                </button>
              </div>
              {!isCollapsed && (
                <div className="divide-y divide-zinc-100">
                  {group.elements.map((element) => renderElementRow(element))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderElementRow(element: UnbatchedElement) {
    const isSelected = selectedIds.has(element.id)
    const pc = element.piece_count || 1
    const remaining = remainingPieces(element)
    const isMulti = pc > 1
    const qty = quantities.get(element.id) ?? remaining

    return (
      <label
        key={element.id}
        className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 cursor-pointer"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleElement(element.id)}
          disabled={loading}
        />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">{element.name}</span>
          {isMulti && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-zinc-500">
              {remaining < pc ? `${remaining} af ${pc} eftir` : `×${pc}`}
            </Badge>
          )}
        </div>
        {isSelected && isMulti && (
          <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              disabled={loading || qty <= 1}
              onClick={(e) => {
                e.preventDefault()
                setQuantities(prev => new Map(prev).set(element.id, Math.max(1, qty - 1)))
              }}
            >
              <Minus className="h-3 w-3" />
            </button>
            <Input
              type="number"
              min={1}
              max={remaining}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= remaining) {
                  setQuantities(prev => new Map(prev).set(element.id, v))
                }
              }}
              disabled={loading}
              className="h-6 w-10 text-center text-xs px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onClick={(e) => e.preventDefault()}
            />
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              disabled={loading || qty >= remaining}
              onClick={(e) => {
                e.preventDefault()
                setQuantities(prev => new Map(prev).set(element.id, Math.min(remaining, qty + 1)))
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-zinc-400 ml-0.5">stk</span>
          </div>
        )}
        {element.weight_kg != null && element.weight_kg > 0 && !(isSelected && isMulti) && (
          <span className="text-xs text-zinc-500 tabular-nums">
            {element.weight_kg.toLocaleString('is-IS')} kg
          </span>
        )}
      </label>
    )
  }
}
