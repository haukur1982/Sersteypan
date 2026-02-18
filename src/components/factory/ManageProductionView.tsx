'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Layers,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  AlertTriangle,
  Thermometer,
  Loader2,
  Clock,
  Wrench,
  Timer,
  CheckCircle,
  Truck,
  Package,
} from 'lucide-react'
import { updateChecklistItem } from '@/lib/factory/batch-actions'
import type { ChecklistItem } from '@/lib/factory/batch-actions'

interface ManageElement {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  weight_kg: number | null
  batch_id: string | null
  batch_number: string | null
  production_batches: {
    id: string
    batch_number: string
    batch_date: string
    status: string
    checklist: unknown
    air_temperature_c: number | null
    concrete_grade: string | null
  } | null
}

interface ActiveBatch {
  id: string
  batch_number: string
  batch_date: string
  status: string
  checklist: unknown
  air_temperature_c: number | null
  concrete_grade: string | null
  concrete_supplier: string | null
}

interface ManageProductionViewProps {
  projects: Array<{ id: string; name: string }>
  defaultProjectId: string | null
  elements: ManageElement[]
  activeBatches: ActiveBatch[]
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  planned: { label: 'Skipulagt', color: 'bg-gray-100 text-gray-700', icon: Clock },
  rebar: { label: 'Járnab.', color: 'bg-yellow-100 text-yellow-700', icon: Wrench },
  cast: { label: 'Steypt', color: 'bg-orange-100 text-orange-700', icon: Layers },
  curing: { label: 'Þornar', color: 'bg-amber-100 text-amber-700', icon: Timer },
  ready: { label: 'Tilbúið', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  loaded: { label: 'Á bíl', color: 'bg-blue-100 text-blue-700', icon: Truck },
  delivered: { label: 'Afhent', color: 'bg-purple-100 text-purple-700', icon: Package },
}

export function ManageProductionView({
  projects,
  defaultProjectId,
  elements: initialElements,
  activeBatches,
}: ManageProductionViewProps) {
  const router = useRouter()
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '')
  const [collapsedFloors, setCollapsedFloors] = useState<Set<string>>(new Set())
  const [loadingChecklistKey, setLoadingChecklistKey] = useState<string | null>(null)

  // Group elements by type
  const groupedByType = useMemo(() => {
    const groups: Record<string, ManageElement[]> = {}
    for (const el of initialElements) {
      const type = el.element_type || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(el)
    }
    return groups
  }, [initialElements])

  // Available tabs (only types with elements)
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
          label: type,
          count: groupedByType[type].length,
        })
      }
    }
    return tabs
  }, [groupedByType])

  // Get floor groups for a type
  function getFloorGroups(typeElements: ManageElement[]) {
    const floors: Record<string, ManageElement[]> = {}
    for (const el of typeElements) {
      const key = el.floor != null ? `${el.floor}` : 'null'
      if (!floors[key]) floors[key] = []
      floors[key].push(el)
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

  function toggleFloor(typeKey: string, floorKey: string) {
    const key = `${typeKey}:${floorKey}`
    setCollapsedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Checklist handling for active batches
  async function handleChecklistToggle(batchId: string, itemKey: string, checked: boolean) {
    const loadKey = `${batchId}:${itemKey}`
    setLoadingChecklistKey(loadKey)
    await updateChecklistItem(batchId, itemKey, checked)
    setLoadingChecklistKey(null)
    router.refresh()
  }

  // Stats
  const totalElements = initialElements.length
  const inBatch = initialElements.filter((e) => e.batch_id).length
  const castOrBeyond = initialElements.filter((e) =>
    ['cast', 'curing', 'ready', 'loaded', 'delivered'].includes(e.status || '')
  ).length

  return (
    <div className="space-y-6">
      {/* Project selector */}
      {projects.length > 1 && (
        <Select
          value={selectedProjectId}
          onValueChange={(val) => {
            setSelectedProjectId(val)
            // Navigate with project param to re-fetch server data
            router.push(`/factory/manage?project=${val}`)
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Veldu verkefni..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-zinc-200">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-zinc-900">{totalElements}</p>
            <p className="text-xs text-zinc-500">Einingar samtals</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-blue-800">{inBatch}</p>
            <p className="text-xs text-blue-600">Í steypulotu</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-green-800">{castOrBeyond}</p>
            <p className="text-xs text-green-600">Steypt eða lengra</p>
          </CardContent>
        </Card>
      </div>

      {/* Active batch checklists */}
      {activeBatches.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Virkir gátlistar ({activeBatches.length} lotur)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeBatches.map((batch) => {
              const checklist = (batch.checklist as unknown as ChecklistItem[]) || []
              const checkedCount = checklist.filter((i) => i.checked).length
              const allChecked = checkedCount === checklist.length
              const isIncomplete = batch.status === 'preparing' && !allChecked

              return (
                <div
                  key={batch.id}
                  className={`border rounded-lg p-3 ${
                    isIncomplete ? 'border-red-200 bg-red-50/30' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{batch.batch_number}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          allChecked
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : isIncomplete
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-zinc-100'
                        }`}
                      >
                        {checkedCount}/{checklist.length}
                      </Badge>
                      {batch.concrete_grade && (
                        <span className="text-xs text-zinc-500">{batch.concrete_grade}</span>
                      )}
                      {batch.air_temperature_c != null && (
                        <span className="text-xs text-zinc-500 flex items-center gap-0.5">
                          <Thermometer className="h-3 w-3" />
                          {batch.air_temperature_c}°C
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/factory/batches/${batch.id}`}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Opna <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {isIncomplete && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Staðfesta verður alla liði áður en steypt er
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {checklist.map((item) => {
                      const loadKey = `${batch.id}:${item.key}`
                      const isLoading = loadingChecklistKey === loadKey
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${
                            item.checked ? 'bg-green-50 text-green-800' : 'hover:bg-zinc-50'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                          ) : (
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={(checked) =>
                                handleChecklistToggle(batch.id, item.key, checked === true)
                              }
                              disabled={isLoading || loadingChecklistKey !== null}
                            />
                          )}
                          <span className={item.checked ? 'line-through' : ''}>
                            {item.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Elements by type and floor */}
      {initialElements.length === 0 ? (
        <Card className="border-zinc-200">
          <CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Engar einingar í þessu verkefni</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-blue-600" />
              Einingar eftir tegund
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableTabs.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">Engar einingar</p>
            ) : (
              <Tabs defaultValue={availableTabs[0]?.key} className="w-full">
                <TabsList className="w-full flex-wrap h-auto gap-1 bg-zinc-100 p-1 mb-4">
                  {availableTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="text-xs px-3 py-1.5 data-[state=active]:bg-white"
                    >
                      {tab.label}
                      <Badge
                        variant="secondary"
                        className="ml-1.5 text-[10px] px-1.5 py-0 bg-zinc-200 text-zinc-600"
                      >
                        {tab.count}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {availableTabs.map((tab) => {
                  const typeElements = groupedByType[tab.key] || []
                  const floorGroups = getFloorGroups(typeElements)

                  return (
                    <TabsContent key={tab.key} value={tab.key}>
                      <div className="space-y-1">
                        {floorGroups.map((group) => {
                          const compositeKey = `${tab.key}:${group.floorKey}`
                          const isCollapsed = collapsedFloors.has(compositeKey)

                          return (
                            <div key={group.floorKey} className="border border-zinc-200 rounded-lg overflow-hidden">
                              {/* Floor header */}
                              <button
                                type="button"
                                onClick={() => toggleFloor(tab.key, group.floorKey)}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                                  )}
                                  <span className="font-semibold text-sm text-zinc-800">
                                    {group.floorLabel}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {group.elements.length}
                                  </Badge>
                                </div>
                              </button>

                              {/* Element rows */}
                              {!isCollapsed && (
                                <div className="divide-y divide-zinc-100">
                                  {group.elements.map((el) => {
                                    const sInfo = statusConfig[el.status || 'planned'] || statusConfig.planned
                                    const StatusIcon = sInfo.icon
                                    return (
                                      <div
                                        key={el.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/50"
                                      >
                                        {/* Status icon */}
                                        <Badge
                                          variant="secondary"
                                          className={`${sInfo.color} gap-1 text-[11px] min-w-[70px] justify-center border-0`}
                                        >
                                          <StatusIcon className="w-3 h-3" />
                                          {sInfo.label}
                                        </Badge>

                                        {/* Element name */}
                                        <span className="font-medium text-sm text-zinc-900 min-w-[120px]">
                                          {el.name}
                                        </span>

                                        {/* Batch info */}
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-1">
                                          {el.production_batches ? (
                                            <>
                                              <span>Batch: {el.production_batches.batch_date}</span>
                                              <Link
                                                href={`/factory/batches/${el.production_batches.id}`}
                                                className="font-mono text-blue-600 hover:underline"
                                              >
                                                {el.production_batches.batch_number}
                                              </Link>
                                            </>
                                          ) : (
                                            <span className="text-zinc-400">Engin lota</span>
                                          )}

                                        </div>

                                        {/* Link to detail */}
                                        <Link
                                          href={`/factory/production/${el.id}`}
                                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0"
                                        >
                                          Upplýsingar
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
