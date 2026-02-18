import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBatch } from '@/lib/factory/batch-actions'
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
import { ProductionChecklist } from '@/components/factory/ProductionChecklist'
import { ConcreteSlipUpload } from '@/components/factory/ConcreteSlipUpload'
import { BatchCompletionButton } from './BatchCompletionButton'

const statusLabels: Record<string, { label: string; className: string }> = {
  preparing: { label: 'Undirbúningur', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  checklist: { label: 'Gátlisti tilbúinn', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Lokið', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Afturkallað', className: 'bg-red-100 text-red-800 border-red-200' },
}

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
  const { data: batch, error } = await getBatch(batchId)

  if (error || !batch) {
    notFound()
  }

  const isCompleted = batch.status === 'completed'
  const isCancelled = batch.status === 'cancelled'
  const isEditable = !isCompleted && !isCancelled
  const statusInfo = statusLabels[batch.status] || statusLabels.preparing

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

  // Total weight
  const totalWeight = batch.elements?.reduce((sum, el) => sum + (el.weight_kg || 0), 0) || 0

  return (
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
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
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

        {/* Complete button */}
        {isEditable && (
          <BatchCompletionButton
            batchId={batch.id}
            checklist={batch.checklist}
            elementCount={batch.elements?.length || 0}
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
          {/* Production Checklist */}
          <ProductionChecklist
            batchId={batch.id}
            checklist={batch.checklist}
            disabled={!isEditable}
            profiles={profiles}
          />

          {/* Elements in batch */}
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Einingar í lotu ({batch.elements?.length || 0})
                </span>
                {totalWeight > 0 && (
                  <span className="text-sm font-normal text-zinc-500">
                    Heildarþyngd: {totalWeight.toLocaleString('is-IS')} kg
                  </span>
                )}
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
                    return (
                      <Link
                        key={element.id}
                        href={`/factory/production/${element.id}`}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-md -mx-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm text-zinc-900">{element.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[element.element_type] || element.element_type}
                          </Badge>
                          {element.floor != null && (
                            <span className="text-xs text-zinc-500">Hæð {element.floor}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {element.weight_kg && (
                            <span className="text-xs text-zinc-500 tabular-nums">
                              {element.weight_kg.toLocaleString('is-IS')} kg
                            </span>
                          )}
                          <Badge variant="outline" className={`text-xs ${elStatus.className}`}>
                            {elStatus.label}
                          </Badge>
                        </div>
                      </Link>
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
              disabled={!isEditable}
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
  )
}
