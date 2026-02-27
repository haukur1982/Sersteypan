import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBatch } from '@/lib/factory/batch-actions'
import { getServerUser } from '@/lib/auth/getServerUser'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Layers,
  Calendar,
  Truck,
  FileText,
  Thermometer,
  AlertTriangle,
} from 'lucide-react'
import { ConcreteSlipUpload } from '@/components/factory/ConcreteSlipUpload'
import { QuickPhotoAction } from '@/components/factory/QuickPhotoAction'
import { BatchCompletionButton } from './BatchCompletionButton'
import { BatchChecklistProvider, ConnectedChecklist } from './BatchChecklistSection'
import { BatchStatusBadge } from './BatchStatusBadge'
import { calculateVolumeM3 } from '@/lib/drawing-analysis/weight'

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

const elementStatusLabels: Record<string, { label: string; className: string }> = {
  planned: { label: 'Skipulagt', className: 'bg-gray-100 text-gray-700' },
  rebar: { label: 'Járnabundið', className: 'bg-yellow-100 text-yellow-700' },
  cast: { label: 'Steypt', className: 'bg-orange-100 text-orange-700' },
  curing: { label: 'Þornar', className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Tilbúið', className: 'bg-green-100 text-green-700' },
  loaded: { label: 'Á bíl', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Afhent', className: 'bg-purple-100 text-purple-700' },
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const [{ data: batch, error }, user] = await Promise.all([
    getBatch(batchId),
    getServerUser(),
  ])

  if (error || !batch) {
    notFound()
  }

  const isCompleted = batch.status === 'completed'
  const isCancelled = batch.status === 'cancelled'
  const isEditable = !isCompleted && !isCancelled
  const isAdmin = user?.role === 'admin'

  // Fetch profiles for checklist display
  const supabase = await createClient()
  const checkerIds = batch.checklist
    .filter((item) => item.checked_by)
    .map((item) => item.checked_by!)
  const uniqueCheckerIds = [...new Set(checkerIds)]

  let profiles: Record<string, { id: string; full_name: string }> = {}
  if (uniqueCheckerIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uniqueCheckerIds)

    if (profileData) {
      profiles = Object.fromEntries(profileData.map((p) => [p.id, p]))
    }
  }

  // Fetch photo counts for batch elements
  const elementIds = (batch.elements || []).map((el) => el.id)
  let photoCountMap: Record<string, number> = {}
  if (elementIds.length > 0) {
    const { data: photoCounts } = await supabase
      .from('element_photos')
      .select('element_id')
      .in('element_id', elementIds)
    if (photoCounts) {
      photoCountMap = photoCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.element_id] = (acc[row.element_id] || 0) + 1
        return acc
      }, {})
    }
  }

  // Total weight & volume (m³)
  const totalWeight = batch.elements?.reduce((sum, el) => sum + (el.weight_kg || 0), 0) || 0
  const totalVolumeM3 = batch.elements?.reduce((sum, el) => {
    const elAny = el as Record<string, unknown>
    const l = elAny.length_mm as number | null
    const w = elAny.width_mm as number | null
    const h = elAny.height_mm as number | null
    if (l && w && h) {
      const qty = (elAny.batch_quantity as number) || (elAny.piece_count as number) || 1
      return sum + calculateVolumeM3(l, w, h) * qty
    }
    return sum
  }, 0) || 0
  const TRUCK_CAPACITY_M3 = 9
  const truckLoads = totalVolumeM3 > 0 ? Math.ceil(totalVolumeM3 / TRUCK_CAPACITY_M3) : 0

  return (
    <BatchChecklistProvider initialChecklist={batch.checklist}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                <Link href="/factory/batches">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-mono">
                {batch.batch_number}
              </h1>
              <BatchStatusBadge batchId={batch.id} initialStatus={batch.status} />
            </div>
            <div className="flex items-center gap-4 ml-10 text-sm text-zinc-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(batch.batch_date).toLocaleDateString('is-IS')}
              </span>
              {batch.project && <span>{batch.project.name}</span>}
              {batch.creator && <span>Stofnað af {batch.creator.full_name}</span>}
            </div>
          </div>

          {/* Complete button — reads live checklist from context */}
          {isEditable && (
            <BatchCompletionButton
              batchId={batch.id}
              elementCount={batch.elements?.length || 0}
              allowSkip={isAdmin}
            />
          )}
        </div>

        {/* Checklist enforcement warning */}
        {isEditable && !batch.checklist.every((item) => item.checked) && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Framleiðslustjóri verður að staðfesta alla liði í gátlista áður en steypt er
              </p>
              <p className="text-xs text-red-700 mt-1">
                Farðu yfir gátlistann hér að neðan og hakaðu við alla liði til að geta lokið lotunni.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Production Checklist — wired to context so BatchCompletionButton stays in sync */}
            <ConnectedChecklist
              batchId={batch.id}
              disabled={!isEditable}
              profiles={profiles}
            />

            {/* Elements in batch */}
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Einingar í lotu ({(() => {
                      const total = batch.elements?.reduce((sum, el) => sum + ((el as Record<string, unknown>).piece_count as number || 1), 0) || 0
                      const rows = batch.elements?.length || 0
                      return total !== rows ? `${total} stk` : `${rows}`
                    })()})
                  </span>
                  <span className="flex items-center gap-3 text-sm font-normal text-zinc-500">
                    {totalVolumeM3 > 0 && (
                      <span className="tabular-nums">
                        {totalVolumeM3.toFixed(2)} m³
                        {truckLoads > 0 && (
                          <span className="text-zinc-400 ml-1">
                            ({truckLoads} {truckLoads === 1 ? 'ferð' : 'ferðir'})
                          </span>
                        )}
                      </span>
                    )}
                    {totalWeight > 0 && (
                      <span className="tabular-nums">
                        {totalWeight.toLocaleString('is-IS')} kg
                      </span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!batch.elements || batch.elements.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Engar einingar í þessari lotu
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {batch.elements.map((element) => {
                      const elStatus = elementStatusLabels[element.status || 'planned'] || elementStatusLabels.planned
                      const elAny = element as Record<string, unknown>
                      const volM3 = (elAny.length_mm && elAny.width_mm && elAny.height_mm)
                        ? calculateVolumeM3(
                            elAny.length_mm as number,
                            elAny.width_mm as number,
                            elAny.height_mm as number
                          )
                        : null
                      return (
                        <div
                          key={element.id}
                          className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md -mx-2 transition-colors"
                        >
                          <Link
                            href={`/factory/production/${element.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            <span className="font-medium text-sm text-zinc-900">
                              {element.name}
                              {((element as Record<string, unknown>).piece_count as number || 1) > 1 && (
                                <span className="text-zinc-500 font-normal ml-1">×{(element as Record<string, unknown>).piece_count as number}</span>
                              )}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[element.element_type] || element.element_type}
                            </Badge>
                            {element.floor != null && (
                              <span className="text-xs text-zinc-500">Hæð {element.floor}</span>
                            )}
                          </Link>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {volM3 != null && (
                              <span className="text-xs text-zinc-400 tabular-nums hidden sm:inline">
                                {volM3.toFixed(2)} m³
                              </span>
                            )}
                            {element.weight_kg && (
                              <span className="text-xs text-zinc-500 tabular-nums hidden sm:inline">
                                {element.weight_kg.toLocaleString('is-IS')} kg
                              </span>
                            )}
                            <Badge variant="outline" className={`text-xs ${elStatus.className}`}>
                              {elStatus.label}
                            </Badge>
                            <QuickPhotoAction
                              elementId={element.id}
                              elementName={element.name}
                              currentStatus={element.status || 'planned'}
                              photoCount={photoCountMap[element.id] || 0}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-6">
            {/* Concrete info */}
            <Card className="border-zinc-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4 text-zinc-600" />
                  Steypuupplýsingar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide">Steypuverksmiðja</p>
                    <p className="text-zinc-900 font-medium">
                      {batch.concrete_supplier || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide">Steypustyrkur</p>
                    <p className="text-zinc-900 font-medium">
                      {batch.concrete_grade || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wide flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      Hitastig
                    </p>
                    <p className="text-zinc-900 font-medium">
                      {batch.air_temperature_c != null ? `${batch.air_temperature_c}°C` : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Concrete slip */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-2 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-zinc-600" />
                Steypuskýrsla
              </h3>
              <ConcreteSlipUpload
                batchId={batch.id}
                existingUrl={batch.concrete_slip_url}
                existingName={batch.concrete_slip_name}
                disabled={isCancelled}
              />
            </div>

            {/* Notes */}
            {batch.notes && (
              <Card className="border-zinc-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Athugasemdir</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{batch.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Completion info */}
            {isCompleted && batch.completed_at && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="py-3">
                  <p className="text-sm text-green-900 font-medium">Lotu lokið</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {new Date(batch.completed_at).toLocaleString('is-IS')}
                    {batch.completer && ` — ${batch.completer.full_name}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BatchChecklistProvider>
  )
}
