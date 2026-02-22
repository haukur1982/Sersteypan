import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRebarBatch } from '@/lib/factory/rebar-batch-actions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Layers,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { RebarQcChecklist } from './RebarQcChecklist'
import { RebarBatchApprovalButton } from './RebarBatchApprovalButton'
import { FileText, Printer } from 'lucide-react'
import { CancelRebarBatchButton } from './CancelRebarBatchButton'
import { RemoveElementFromRebarBatchButton } from './RemoveElementFromRebarBatchButton'
// Note: We'll implement RebarBatchPdfButton in a subsequent step if needed

const statusLabels: Record<string, { label: string; className: string }> = {
  preparing: { label: 'Í vinnslu', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  qc_ready: { label: 'Gátlisti tilbúinn', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Samþykkt', className: 'bg-green-100 text-green-800 border-green-200' },
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
  rebar: { label: 'Járnagrind', className: 'bg-yellow-100 text-yellow-700' },
  cast: { label: 'Steypt', className: 'bg-orange-100 text-orange-700' },
  curing: { label: 'Þornar', className: 'bg-amber-100 text-amber-700' },
  ready: { label: 'Tilbúið', className: 'bg-green-100 text-green-700' },
  loaded: { label: 'Á bíl', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Afhent', className: 'bg-purple-100 text-purple-700' },
}

export default async function RebarBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { data: batch, error } = await getRebarBatch(batchId)

  if (error || !batch) {
    notFound()
  }

  const isApproved = batch.status === 'approved'
  const isCancelled = batch.status === 'cancelled'
  const isEditable = !isApproved && !isCancelled
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

  // Fetch all drawing documents for the project
  let projectDrawings: Array<{ id: string; name: string; file_url: string }> = []
  if (batch.project_id) {
    const { data: drawingsData } = await supabase
      .from('project_documents')
      .select('id, name, file_url')
      .eq('project_id', batch.project_id)
      .eq('category', 'drawing')
    if (drawingsData) projectDrawings = drawingsData
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
              <Link href="/factory/rebar">
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Print Button placeholder */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/factory/rebar/${batch.id}/pdf`} target="_blank">
              <Printer className="h-4 w-4 mr-2" />
              Prenta
            </Link>
          </Button>

          {isEditable && (
            <>
              <CancelRebarBatchButton batchId={batch.id} />
              <RebarBatchApprovalButton
                batchId={batch.id}
                checklist={batch.checklist}
                elementCount={batch.elements?.length || 0}
              />
            </>
          )}
        </div>
      </div>

      {/* Checklist enforcement warning */}
      {isEditable && !batch.checklist.every((item) => item.checked) && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Framleiðslustjóri verður að staðfesta alla liði í gátlista áður en samþykkt er
            </p>
            <p className="text-xs text-red-700 mt-1">
              Farðu yfir gátlistann hér að neðan og hakaðu við alla liði til að geta samþykkt lotuna.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* QC Checklist */}
          <RebarQcChecklist
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
                  <Layers className="h-4 w-4 text-orange-600" />
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
                    // Find drawings where the name matches or element name is inside the drawing name
                    const matchingDrawings = projectDrawings.filter(d =>
                      element.name.toLowerCase().includes(d.name.toLowerCase()) ||
                      d.name.toLowerCase().includes(element.name.toLowerCase().split('-')[0])
                    ).slice(0, 1) // Just take the best match

                    return (
                      <div key={element.id} className="block py-3 hover:bg-zinc-50/50 rounded-md -mx-2 px-2 transition-colors">
                        <div className="flex items-center justify-between">
                          <Link href={`/factory/production/${element.id}`} className="flex items-center gap-3 hover:underline">
                            <span className="font-medium text-sm text-zinc-900">{element.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[element.element_type] || element.element_type}
                            </Badge>
                            {element.floor != null && (
                              <span className="text-xs text-zinc-500">Hæð {element.floor}</span>
                            )}
                          </Link>
                          <div className="flex items-center gap-3">
                            {element.weight_kg && (
                              <span className="text-xs text-zinc-500 tabular-nums">
                                {element.weight_kg.toLocaleString('is-IS')} kg
                              </span>
                            )}
                            <Badge variant="outline" className={`text-xs ${elStatus.className}`}>
                              {elStatus.label}
                            </Badge>
                            {isEditable && (
                              <RemoveElementFromRebarBatchButton
                                batchId={batch.id}
                                elementId={element.id}
                                elementName={element.name}
                              />
                            )}
                          </div>
                        </div>

                        {/* Rebar Details (Spec & Drawing) */}
                        <div className="mt-2 flex items-center justify-between text-xs px-2 py-1 bg-white rounded border border-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-700">Járn:</span>
                            <span className="font-mono text-zinc-600">{element.rebar_spec || 'Óskilgreint'}</span>
                          </div>
                          {matchingDrawings.length > 0 && (
                            <div className="flex items-center gap-2">
                              {matchingDrawings.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="h-3 w-3" />
                                  {doc.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div >

        {/* Right column — sidebar */}
        < div className="space-y-6" >
          {/* Notes */}
          {
            batch.notes && (
              <Card className="border-zinc-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Athugasemdir</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{batch.notes}</p>
                </CardContent>
              </Card>
            )
          }

          {/* Approval info */}
          {
            isApproved && batch.approved_at && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="py-3">
                  <p className="text-sm text-green-900 font-medium">Lota samþykkt</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {new Date(batch.approved_at).toLocaleString('is-IS')}
                    {batch.approver && ` — ${batch.approver.full_name}`}
                  </p>
                </CardContent>
              </Card>
            )
          }
        </div >
      </div >
    </div >
  )
}
