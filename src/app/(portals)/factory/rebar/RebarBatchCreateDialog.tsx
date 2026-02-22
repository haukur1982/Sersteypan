'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Layers, Loader2, AlertCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { createRebarBatch, getRebarUnbatchedElements } from '@/lib/factory/rebar-batch-actions'

interface UnbatchedElement {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  weight_kg: number | null
}

interface Project {
  id: string
  name: string
}

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

interface RebarBatchCreateDialogProps {
  projects: Project[]
}

export function RebarBatchCreateDialog({ projects }: RebarBatchCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingElements, setFetchingElements] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [elements, setElements] = useState<UnbatchedElement[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set())

  // Auto-select first project if only one
  useEffect(() => {
    if (projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Fetch unbatched elements when project changes
  useEffect(() => {
    if (!open || !selectedProjectId) {
      setElements([])
      return
    }

    let cancelled = false
    const fetchElements = async () => {
      setFetchingElements(true)
      try {
        const { data, error: fetchError } = await getRebarUnbatchedElements(selectedProjectId)
        if (cancelled) return
        setElements(data)
        setSelectedIds(new Set())
        if (fetchError) setError(fetchError)
      } catch {
        if (!cancelled) setError('Villa við að sækja einingar')
      } finally {
        if (!cancelled) setFetchingElements(false)
      }
    }

    fetchElements()
    return () => { cancelled = true }
  }, [open, selectedProjectId])

  // Group elements by type
  const groupedByType = useMemo(() => {
    const groups: Record<string, UnbatchedElement[]> = {}
    for (const el of elements) {
      const type = el.element_type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(el)
    }
    return groups
  }, [elements])

  // Available tabs
  const availableTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number }[] = []
    for (const tab of typeTabOrder) {
      if (groupedByType[tab.key]) {
        tabs.push({ ...tab, count: groupedByType[tab.key].length })
      }
    }
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

  function getFloorGroups(typeElements: UnbatchedElement[]) {
    const floors: Record<string, UnbatchedElement[]> = {}
    for (const el of typeElements) {
      const floorKey = el.floor != null ? `${el.floor}` : 'null'
      if (!floors[floorKey]) floors[floorKey] = []
      floors[floorKey].push(el)
    }
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

  function toggleElement(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
      } else {
        typeElements.forEach((e) => next.add(e.id))
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
      } else {
        floorElements.forEach((e) => next.add(e.id))
      }
      return next
    })
  }

  function toggleFloorCollapse(typeKey: string, floorKey: string) {
    const compositeKey = `${typeKey}:${floorKey}`
    setCollapsedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(compositeKey)) next.delete(compositeKey)
      else next.add(compositeKey)
      return next
    })
  }

  async function handleCreate() {
    if (!selectedProjectId) {
      setError('Veldu verkefni')
      return
    }
    if (selectedIds.size === 0) {
      setError('Veldu a.m.k. eina einingu')
      return
    }

    setLoading(true)
    setError(null)

    const result = await createRebarBatch({
      project_id: selectedProjectId,
      element_ids: Array.from(selectedIds),
      notes: notes || undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      setSelectedIds(new Set())
      setNotes('')
      setCollapsedFloors(new Set())
      if ('batchId' in result && result.batchId) {
        router.push(`/factory/rebar/${result.batchId}`)
      } else {
        router.refresh()
      }
    }
  }

  const totalWeight = elements
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + (e.weight_kg || 0), 0)

  function selectedCountForType(typeKey: string) {
    const typeElements = groupedByType[typeKey] || []
    return typeElements.filter((e) => selectedIds.has(e.id)).length
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        setError(null)
        if (selectedProjectId) setFetchingElements(true)
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Ný járnalota
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-600" />
            Stofna járnalotu
          </DialogTitle>
          <DialogDescription>
            Veldu einingar til að undirbúa járnagrindur. Lotunúmer er sjálfvirkt.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Project selector */}
        <div className="space-y-2">
          <Label htmlFor="project_id">Verkefni</Label>
          <select
            id="project_id"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Veldu verkefni...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="rebar_notes">Athugasemdir</Label>
          <Textarea
            id="rebar_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Athugasemdir um þessa járnalotu..."
            rows={2}
            disabled={loading}
          />
        </div>

        {/* Element picker */}
        {selectedProjectId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Einingar ({selectedIds.size} / {elements.length} valdar)
              </Label>
            </div>

            {fetchingElements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                <span className="ml-2 text-sm text-zinc-500">Sæki einingar...</span>
              </div>
            ) : elements.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Engar ótengdar einingar fundust (aðeins &quot;Skipulögð&quot; einingar án járnalotu)
              </div>
            ) : availableTabs.length === 1 ? (
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
                          className={`ml-1.5 text-[10px] px-1.5 py-0 ${
                            selCount > 0
                              ? 'bg-orange-100 text-orange-700'
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
              <p className="text-sm text-zinc-600">
                Heildarþyngd: <span className="font-medium">{totalWeight.toLocaleString('is-IS')} kg</span>
              </p>
            )}
          </div>
        )}

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
            disabled={loading || selectedIds.size === 0 || !selectedProjectId}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stofna...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 mr-2" />
                Stofna lotu ({selectedIds.size} einingar)
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
                  className="ml-auto text-[11px] text-orange-600 hover:underline disabled:opacity-50"
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
    return (
      <label
        key={element.id}
        className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 cursor-pointer"
      >
        <Checkbox
          checked={selectedIds.has(element.id)}
          onCheckedChange={() => toggleElement(element.id)}
          disabled={loading}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-900">{element.name}</span>
        </div>
        {element.weight_kg != null && element.weight_kg > 0 && (
          <span className="text-xs text-zinc-500 tabular-nums">
            {element.weight_kg.toLocaleString('is-IS')} kg
          </span>
        )}
      </label>
    )
  }
}
