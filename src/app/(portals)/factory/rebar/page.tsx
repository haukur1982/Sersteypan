import Link from 'next/link'
import { getAllRebarBatches } from '@/lib/factory/rebar-batch-actions'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Layers,
  Calendar,
  ArrowRight,
  CheckCircle,
  Clock,
  ClipboardCheck,
  XCircle,
  AlertTriangle,
  Warehouse,
} from 'lucide-react'
import { RebarBatchCreateDialog } from './RebarBatchCreateDialog'

const statusConfig: Record<
  string,
  { icon: typeof Clock; label: string; className: string }
> = {
  preparing: {
    icon: Clock,
    label: 'Í vinnslu',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  qc_ready: {
    icon: ClipboardCheck,
    label: 'Gátlisti',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  approved: {
    icon: CheckCircle,
    label: 'Samþykkt',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    icon: XCircle,
    label: 'Afturkallað',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

const typeLabels: Record<string, string> = {
  wall: 'Vegg.',
  filigran: 'Fil.',
  balcony: 'Sval.',
  svalagangur: 'Svalag.',
  staircase: 'Stiga',
  column: 'Súla',
  beam: 'Bita',
  ceiling: 'Þak',
  other: 'Annað',
}

export default async function RebarBatchesPage() {
  const { data: batches, error } = await getAllRebarBatches()

  // Fetch projects for create dialog
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('status', ['active', 'in_progress'])
    .order('name')

  // Stats
  const preparing = batches.filter((b) => b.status === 'preparing').length
  const qcReady = batches.filter((b) => b.status === 'qc_ready').length
  const approved = batches.filter((b) => b.status === 'approved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-orange-600" />
            Járnalotur
          </h1>
          <p className="text-zinc-600 mt-1">
            Undirbúa járnagrindur í lotum, gátlisti og samþykkt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/factory/rebar/stockpile"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <Warehouse className="h-4 w-4" />
            Birgðir
          </Link>
          <RebarBatchCreateDialog projects={projects || []} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-800">{preparing}</p>
              <p className="text-xs text-yellow-700">Í vinnslu</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{qcReady}</p>
              <p className="text-xs text-blue-700">Gátlisti tilbúinn</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">{approved}</p>
              <p className="text-xs text-green-700">Samþykkt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Batch list */}
      {batches.length === 0 ? (
        <Card className="border-zinc-200">
          <CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Engar járnalotur hafa verið stofnaðar</p>
            <p className="text-sm text-zinc-400 mt-1">
              Smelltu á &quot;Ný járnalota&quot; til að hefja undirbúning járnagrinda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const config = statusConfig[batch.status] || statusConfig.preparing
            const StatusIcon = config.icon
            const elementCount = batch.elements?.length || 0
            const checklist = batch.checklist || []
            const checkedCount = checklist.filter(
              (item) => item.checked
            ).length

            // Summarize element types
            const typeCounts: Record<string, number> = {}
            batch.elements?.forEach((el) => {
              typeCounts[el.element_type] =
                (typeCounts[el.element_type] || 0) + 1
            })
            const typeSummary = Object.entries(typeCounts)
              .map(
                ([type, count]) =>
                  `${count} ${typeLabels[type] || type}`
              )
              .join(' · ')

            return (
              <Link
                key={batch.id}
                href={`/factory/rebar/${batch.id}`}
                className="block"
              >
                <Card className="border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            batch.status === 'approved'
                              ? 'bg-green-100'
                              : batch.status === 'qc_ready'
                              ? 'bg-blue-100'
                              : 'bg-yellow-100'
                          }`}
                        >
                          <StatusIcon
                            className={`h-5 w-5 ${
                              batch.status === 'approved'
                                ? 'text-green-600'
                                : batch.status === 'qc_ready'
                                ? 'text-blue-600'
                                : 'text-yellow-600'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-zinc-900">
                              {batch.batch_number}
                            </span>
                            <Badge
                              variant="outline"
                              className={config.className}
                            >
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(batch.batch_date).toLocaleDateString(
                                'is-IS'
                              )}
                            </span>
                            {batch.project && (
                              <span>{batch.project.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Element summary */}
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-medium text-zinc-700">
                            {elementCount} einingar
                          </p>
                          {typeSummary && (
                            <p className="text-xs text-zinc-500">
                              {typeSummary}
                            </p>
                          )}
                        </div>

                        {/* Checklist progress */}
                        {batch.status !== 'approved' &&
                          batch.status !== 'cancelled' && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                batch.status === 'preparing' && checkedCount < checklist.length
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : ''
                              }`}
                            >
                              {batch.status === 'preparing' && checkedCount < checklist.length && (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {checkedCount}/{checklist.length} gátlisti
                            </Badge>
                          )}

                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
