import {
  getContract,
  getContractLines,
  getPeriod,
  getPeriodLines,
  getCumulativeBeforePeriod,
  getProjectForFramvinda,
} from '@/lib/framvinda/queries'
import {
  formatISK,
  formatNumber,
  formatPercent,
  calculateVisitala,
} from '@/lib/framvinda/calculations'
import {
  FRAMVINDA_CATEGORIES,
  CATEGORY_LABELS,
  type FramvindaCategory,
} from '@/lib/framvinda/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BuyerPdfButton } from './BuyerPdfButton'

interface PageProps {
  params: Promise<{ projectId: string; periodId: string }>
}

export default async function BuyerPeriodDetailPage({ params }: PageProps) {
  const { projectId, periodId } = await params
  const project = await getProjectForFramvinda(projectId)
  if (!project) redirect('/buyer/framvinda')

  const contract = await getContract(projectId)
  if (!contract) redirect('/buyer/framvinda')

  const period = await getPeriod(periodId)
  if (!period || period.status !== 'finalized') redirect(`/buyer/framvinda/${projectId}`)

  const [contractLines, periodLines, cumulativeMap] = await Promise.all([
    getContractLines(contract.id),
    getPeriodLines(periodId),
    getCumulativeBeforePeriod(contract.id, period.period_number),
  ])

  const cumulativeBefore: Record<string, number> = {}
  for (const [key, value] of cumulativeMap) {
    cumulativeBefore[key] = value
  }

  const companyName =
    (project.companies as { name: string; kennitala: string } | null)?.name ?? ''

  // Index period lines
  const plMap = new Map(periodLines.map((pl) => [pl.contract_line_id, pl]))

  // Use period's own grunnvisitala
  const periodGrunnvisitala = period.grunnvisitala ?? contract.grunnvisitala
  // Use snapshot VAT rate for finalized periods, else live contract rate
  const vatRate = period.snapshot_vat_rate ?? contract.vat_rate
  const retainagePercentage = period.snapshot_retainage_percentage ?? contract.retainage_percentage ?? 0

  // Compute line data — prefer snapshot values for finalized periods
  const lineData = contractLines.map((cl) => {
    const pl = plMap.get(cl.id)
    // Use snapshot values when available (finalized periods have these)
    const effectiveUnitPrice = pl?.snapshot_unit_price ?? cl.unit_price
    const effectiveLabel = pl?.snapshot_label ?? cl.label
    const effectivePricingUnit = pl?.snapshot_pricing_unit ?? cl.pricing_unit
    const effectiveTotalQuantity = pl?.snapshot_total_quantity ?? cl.total_quantity
    const effectiveTotalPrice = effectiveTotalQuantity * effectiveUnitPrice

    const qtyThisPeriod = pl?.quantity_this_period ?? 0
    const cumBefore = cumulativeBefore[cl.id] ?? 0
    const cumTotal = cumBefore + qtyThisPeriod
    const pct = effectiveTotalQuantity > 0 ? cumTotal / effectiveTotalQuantity : 0
    const cumAmount = cumTotal * effectiveUnitPrice
    const amtThisPeriod = qtyThisPeriod * effectiveUnitPrice
    return {
      cl, pl, qtyThisPeriod, cumBefore, cumTotal, pct, cumAmount, amtThisPeriod,
      effectiveUnitPrice, effectiveLabel, effectivePricingUnit,
      effectiveTotalQuantity, effectiveTotalPrice,
    }
  })

  const periodSubtotal = lineData.reduce((sum, d) => sum + d.amtThisPeriod, 0)
  const summary = calculateVisitala(
    periodSubtotal,
    periodGrunnvisitala,
    period.visitala,
    vatRate,
    retainagePercentage
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/buyer/framvinda/${projectId}`}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">
            Framvinda {period.period_number}
          </h1>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700"
          >
            <Lock className="mr-1 h-3 w-3" />
            Lokið
          </Badge>
        </div>
        <p className="text-zinc-600">
          {project.name} — {companyName} ·{' '}
          {new Date(period.period_start).toLocaleDateString('is-IS')} —{' '}
          {new Date(period.period_end).toLocaleDateString('is-IS')}
        </p>
      </div>

      {/* Description */}
      {period.description && (
        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-zinc-700 mb-2">
              Lýsing á framvindu
            </h3>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">
              {period.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main billing table (read-only) */}
      <Card className="border-zinc-200 shadow-sm overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-1 px-4 py-3 bg-zinc-100 text-xs font-medium text-zinc-500 uppercase tracking-wider border-b">
            <div className="col-span-2">Verkþáttur</div>
            <div className="col-span-1 text-right">Magn</div>
            <div className="col-span-1 text-right">Verð</div>
            <div className="col-span-1 text-right">Samtals</div>
            <div className="col-span-1 text-right">Uppsafn.</div>
            <div className="col-span-1 text-right">%</div>
            <div className="col-span-1 text-right">Rukkað</div>
            <div className="col-span-1 text-right">Þetta tímab.</div>
            <div className="col-span-1 text-right">Upphæð</div>
            <div className="col-span-2">Athugasemd</div>
          </div>

          {/* Lines grouped by category */}
          {FRAMVINDA_CATEGORIES.map((cat) => {
            const catData = lineData.filter((d) => d.cl.category === cat)
            if (catData.length === 0) return null

            const catPeriodTotal = catData.reduce((s, d) => s + d.amtThisPeriod, 0)

            return (
              <div key={cat}>
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold text-zinc-800">
                    {CATEGORY_LABELS[cat as FramvindaCategory]}
                  </span>
                </div>

                {catData.map((d) => (
                  <div
                    key={d.cl.id}
                    className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-zinc-100 hover:bg-zinc-50 items-center text-sm"
                  >
                    <div className="col-span-2 text-zinc-900 font-medium truncate" title={d.effectiveLabel}>
                      {d.cl.is_extra && (
                        <Badge variant="secondary" className="mr-1 text-[10px] bg-purple-100 text-purple-700">
                          Auka
                        </Badge>
                      )}
                      {d.effectiveLabel}
                    </div>
                    <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                      {formatNumber(d.effectiveTotalQuantity, d.effectivePricingUnit === 'm2' ? 2 : 0)}
                    </div>
                    <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                      {d.effectiveUnitPrice.toLocaleString('is-IS')}
                    </div>
                    <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                      {formatISK(d.effectiveTotalPrice)}
                    </div>
                    <div className="col-span-1 text-right text-zinc-700 tabular-nums font-medium">
                      {formatNumber(d.cumTotal, d.effectivePricingUnit === 'm2' ? 2 : 0)}
                    </div>
                    <div className="col-span-1 text-right tabular-nums">
                      <span className={
                        d.pct >= 1 ? 'text-green-600 font-medium'
                          : d.pct > 0 ? 'text-blue-600'
                            : 'text-zinc-400'
                      }>
                        {formatPercent(d.pct)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-zinc-700 tabular-nums">
                      {d.cumAmount > 0 ? formatISK(d.cumAmount) : '—'}
                    </div>
                    <div className="col-span-1 text-right tabular-nums text-zinc-900">
                      {formatNumber(d.qtyThisPeriod, d.effectivePricingUnit === 'm2' ? 2 : 0)}
                    </div>
                    <div className="col-span-1 text-right tabular-nums font-medium text-zinc-900">
                      {d.amtThisPeriod > 0 ? formatISK(d.amtThisPeriod) : '—'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-zinc-500">{d.pl?.notes || ''}</span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-sm font-semibold">
                  <div className="col-span-2 text-zinc-700">
                    {CATEGORY_LABELS[cat as FramvindaCategory]} samtals
                  </div>
                  <div className="col-span-7"></div>
                  <div className="col-span-1 text-right text-zinc-900 tabular-nums">
                    {catPeriodTotal > 0 ? formatISK(catPeriodTotal) : '—'}
                  </div>
                  <div className="col-span-2"></div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Totals */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-zinc-700">Samtals</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatISK(summary.subtotal)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-zinc-100 pt-4">
            <span className="text-sm text-zinc-500">
              Vísitala (Grunnvísitala {periodGrunnvisitala} → {period.visitala})
            </span>
            <span className="text-zinc-700 tabular-nums">
              {formatISK(summary.visitalaAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-zinc-100 pt-4">
            <span className="font-medium text-zinc-700">Samtals m/vísitölu</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatISK(summary.totalWithVisitala)}
            </span>
          </div>
          {summary.retainagePercentage > 0 && (
            <div className="flex justify-between items-center border-t border-zinc-100 pt-4">
              <span className="text-sm text-zinc-500">
                Tryggingarfé ({summary.retainagePercentage}%)
              </span>
              <span className="text-red-600 tabular-nums">
                -{formatISK(summary.retainageAmount)}
              </span>
            </div>
          )}
          {summary.vatRate > 0 && (
            <div className="flex justify-between items-center border-t border-zinc-100 pt-4">
              <span className="text-sm text-zinc-500">
                VSK ({summary.vatRate}%)
              </span>
              <span className="text-zinc-700 tabular-nums">
                {formatISK(summary.vatAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-zinc-200 pt-4 text-xl">
            <span className="font-bold text-zinc-900">Heildarupphæð m/vsk</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatISK(summary.grandTotalWithVat)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href={`/buyer/framvinda/${projectId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Til baka
          </Link>
        </Button>
        <BuyerPdfButton periodId={periodId} />
      </div>
    </div>
  )
}
