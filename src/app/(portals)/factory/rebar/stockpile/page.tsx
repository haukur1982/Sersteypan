import Link from 'next/link'
import { getRebarStockpile } from '@/lib/factory/rebar-batch-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Warehouse,
  Package,
} from 'lucide-react'
import { BatchCreateDialog } from '@/components/factory/BatchCreateDialog'

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

const typeColors: Record<string, string> = {
  wall: 'bg-blue-100 text-blue-800 border-blue-200',
  filigran: 'bg-purple-100 text-purple-800 border-purple-200',
  balcony: 'bg-teal-100 text-teal-800 border-teal-200',
  svalagangur: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  staircase: 'bg-amber-100 text-amber-800 border-amber-200',
  column: 'bg-rose-100 text-rose-800 border-rose-200',
  beam: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ceiling: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  other: 'bg-zinc-100 text-zinc-800 border-zinc-200',
}

interface StockpileElement {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  weight_kg: number | null
  rebar_batch_id: string | null
  rebar_batch_number: string | null
  batch_id: string | null
  project: { id: string; name: string } | null
}

export default async function RebarStockpilePage() {
  const { data: rawElements, error } = await getRebarStockpile()
  const elements = (rawElements || []) as unknown as StockpileElement[]

  // Group by project, then by element_type
  const byProject: Record<string, {
    project: { id: string; name: string }
    byType: Record<string, StockpileElement[]>
  }> = {}

  for (const el of elements) {
    const projectId = el.project?.id || 'unknown'
    if (!byProject[projectId]) {
      byProject[projectId] = {
        project: el.project || { id: 'unknown', name: 'Óþekkt verkefni' },
        byType: {},
      }
    }
    const type = el.element_type || 'other'
    if (!byProject[projectId].byType[type]) {
      byProject[projectId].byType[type] = []
    }
    byProject[projectId].byType[type].push(el)
  }

  const totalCount = elements.length
  const totalWeight = elements.reduce((sum, el) => sum + (el.weight_kg || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/factory/rebar">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-orange-600" />
              Birgðir járnagrinda
            </h1>
          </div>
          <p className="text-zinc-600 ml-10">
            Einingar sem hafa fengið járnagrind og bíða steypulotu
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <Package className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-800">{totalCount}</p>
              <p className="text-xs text-orange-700">Einingar tilbúnar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-zinc-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <Warehouse className="h-5 w-5 text-zinc-600" />
            <div>
              <p className="text-2xl font-bold text-zinc-800">{totalWeight.toLocaleString('is-IS')} kg</p>
              <p className="text-xs text-zinc-700">Heildarþyngd</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Stockpile content */}
      {elements.length === 0 ? (
        <Card className="border-zinc-200">
          <CardContent className="py-12 text-center">
            <Warehouse className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Engar járnagrindur í birgðum</p>
            <p className="text-sm text-zinc-400 mt-1">
              Þegar járnalotur eru samþykktar birtast einingarnar hér þar til þær fara í steypulotu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(byProject).map(({ project, byType }) => (
            <Card key={project.id} className="border-zinc-200">
              <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-3">
                  <span>{project.name}</span>
                  <Badge variant="outline" className="font-normal text-zinc-500">
                    {Object.values(byType).reduce((sum, arr) => sum + arr.length, 0)} einingar
                  </Badge>
                </CardTitle>
                <BatchCreateDialog projectId={project.id} />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(byType).map(([type, typeElements]) => {
                    const colorClass = typeColors[type] || typeColors.other
                    const typeWeight = typeElements.reduce((sum, el) => sum + (el.weight_kg || 0), 0)

                    return (
                      <div
                        key={type}
                        className={`rounded-lg border p-4 ${colorClass}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm">
                            {typeLabels[type] || type}
                          </h3>
                          <span className="text-2xl font-bold">
                            {typeElements.length}
                          </span>
                        </div>
                        <p className="text-xs opacity-80">
                          {typeWeight.toLocaleString('is-IS')} kg
                        </p>
                        {/* Show rebar batch numbers */}
                        {(() => {
                          const batchNumbers = [...new Set(typeElements.map(e => e.rebar_batch_number).filter(Boolean))]
                          if (batchNumbers.length === 0) return null
                          return (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {batchNumbers.map(bn => (
                                <span key={bn} className="text-[10px] font-mono opacity-70">
                                  {bn}
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
