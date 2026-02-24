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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { redirect } from 'next/navigation'
import { BuyerPdfButton } from './BuyerPdfButton'
import { BuyerPeriodHeader } from '@/components/framvinda/BuyerPeriodHeader'

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
  if (!period || period.status !== 'finalized')
    redirect(`/buyer/framvinda/${projectId}`)

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
    (project.companies as { name: string; kennitala: string } | null)?.name ??
    ''
  const projectAddress = project.address ?? null

  // Index period lines
  const plMap = new Map(periodLines.map((pl) => [pl.contract_line_id, pl]))

  // Use period's own grunnvisitala
  const periodGrunnvisitala = period.grunnvisitala ?? contract.grunnvisitala
  const vatRate = period.snapshot_vat_rate ?? contract.vat_rate
  const retainagePercentage =
    period.snapshot_retainage_percentage ?? contract.retainage_percentage ?? 0

  // Compute line data — prefer snapshot values for finalized periods
  const lineData = contractLines.map((cl) => {
    const pl = plMap.get(cl.id)
    const effectiveUnitPrice = pl?.snapshot_unit_price ?? cl.unit_price
    const effectiveLabel = pl?.snapshot_label ?? cl.label
    const effectivePricingUnit = pl?.snapshot_pricing_unit ?? cl.pricing_unit
    const effectiveTotalQuantity = pl?.snapshot_total_quantity ?? cl.total_quantity
    const effectiveTotalPrice = effectiveTotalQuantity * effectiveUnitPrice

    const qtyThisPeriod = pl?.quantity_this_period ?? 0
    const cumBefore = cumulativeBefore[cl.id] ?? 0
    const cumTotal = cumBefore + qtyThisPeriod
    const pct =
      effectiveTotalQuantity > 0 ? cumTotal / effectiveTotalQuantity : 0
    const amtThisPeriod = qtyThisPeriod * effectiveUnitPrice
    return {
      cl,
      pl,
      qtyThisPeriod,
      cumTotal,
      pct,
      amtThisPeriod,
      effectiveUnitPrice,
      effectiveLabel,
      effectivePricingUnit,
      effectiveTotalQuantity,
      effectiveTotalPrice,
    }
  })

  const periodSubtotal = lineData.reduce(
    (sum, d) => sum + d.amtThisPeriod,
    0
  )
  const summary = calculateVisitala(
    periodSubtotal,
    periodGrunnvisitala,
    period.visitala,
    vatRate,
    retainagePercentage
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Professional Invoice Header */}
      <BuyerPeriodHeader
        companyName={companyName}
        projectName={project.name}
        projectAddress={projectAddress}
        periodNumber={period.period_number}
        periodStart={period.period_start}
        periodEnd={period.period_end}
        isFinalized={period.status === 'finalized'}
        description={period.description}
        backHref={`/buyer/framvinda/${projectId}`}
      />

      {/* Billing Table */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 border-b border-zinc-200">
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[200px]">
                Verkþáttur
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                Magn
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                Verð/eining
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                Samtals
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                Þetta tímab.
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                Upphæð
              </TableHead>
              <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-center">
                %
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FRAMVINDA_CATEGORIES.map((cat) => {
              const catData = lineData.filter((d) => d.cl.category === cat)
              if (catData.length === 0) return null

              const catPeriodTotal = catData.reduce(
                (s, d) => s + d.amtThisPeriod,
                0
              )

              return (
                <TableRow key={`section-${cat}`} className="contents">
                  {/* Category header row */}
                  <TableCell
                    colSpan={7}
                    className="py-2.5 px-4 bg-zinc-50 border-b border-zinc-200 border-l-3 border-l-blue-500"
                  >
                    <span className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">
                      {CATEGORY_LABELS[cat as FramvindaCategory]}
                    </span>
                  </TableCell>

                  {/* Data rows */}
                  {catData.map((d, idx) => (
                    <TableRow
                      key={d.cl.id}
                      className={`border-b border-zinc-100 ${
                        idx % 2 === 1 ? 'bg-zinc-50/50' : ''
                      }`}
                    >
                      <TableCell className="py-2.5 text-sm text-zinc-900 font-medium pl-6">
                        {d.effectiveLabel}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-zinc-600 text-right tabular-nums">
                        {formatNumber(
                          d.effectiveTotalQuantity,
                          d.effectivePricingUnit === 'm2' ? 2 : 0
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-zinc-600 text-right tabular-nums">
                        {d.effectiveUnitPrice.toLocaleString('is-IS')}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-zinc-600 text-right tabular-nums">
                        {formatISK(d.effectiveTotalPrice)}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-zinc-900 text-right tabular-nums font-medium">
                        {d.qtyThisPeriod > 0
                          ? formatNumber(
                              d.qtyThisPeriod,
                              d.effectivePricingUnit === 'm2' ? 2 : 0
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-zinc-900 text-right tabular-nums font-semibold">
                        {d.amtThisPeriod > 0
                          ? formatISK(d.amtThisPeriod)
                          : '—'}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-center tabular-nums">
                        <span
                          className={
                            d.pct >= 1
                              ? 'text-green-600 font-medium'
                              : d.pct > 0.5
                                ? 'text-blue-600'
                                : d.pct > 0
                                  ? 'text-amber-600'
                                  : 'text-zinc-300'
                          }
                        >
                          {formatPercent(d.pct)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Category subtotal row */}
                  <TableRow className="bg-zinc-100 border-b border-zinc-300">
                    <TableCell
                      colSpan={5}
                      className="py-2.5 text-sm font-semibold text-zinc-700 pl-6"
                    >
                      {CATEGORY_LABELS[cat as FramvindaCategory]} samtals
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-right tabular-nums font-bold text-zinc-900">
                      {catPeriodTotal > 0
                        ? formatISK(catPeriodTotal)
                        : '—'}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Professional Totals */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Subtotal */}
          <div className="flex justify-between items-center px-8 py-4 border-b border-zinc-100">
            <span className="text-base font-medium text-zinc-700">
              Samtals
            </span>
            <span className="text-lg font-bold text-zinc-900 tabular-nums">
              {formatISK(summary.subtotal)}
            </span>
          </div>

          {/* Vísitala adjustment */}
          <div className="flex justify-between items-center px-8 py-3 bg-zinc-50/50">
            <span className="text-sm text-zinc-500 pl-4">
              Vísitala (Grunnvísitala {periodGrunnvisitala} → {period.visitala})
            </span>
            <span className="text-sm text-zinc-600 tabular-nums">
              {formatISK(summary.visitalaAmount)}
            </span>
          </div>

          {/* Total with vísitala */}
          <div className="flex justify-between items-center px-8 py-4 border-b border-zinc-200">
            <span className="text-base font-medium text-zinc-700">
              Samtals m/vísitölu
            </span>
            <span className="text-lg font-bold text-zinc-900 tabular-nums">
              {formatISK(summary.totalWithVisitala)}
            </span>
          </div>

          {/* Retainage */}
          {summary.retainagePercentage > 0 && (
            <div className="flex justify-between items-center px-8 py-3 bg-zinc-50/50">
              <span className="text-sm text-zinc-500 pl-4">
                Tryggingarfé ({summary.retainagePercentage}%)
              </span>
              <span className="text-sm text-red-600 tabular-nums">
                −{formatISK(summary.retainageAmount)}
              </span>
            </div>
          )}

          {/* VAT */}
          {summary.vatRate > 0 && (
            <div className="flex justify-between items-center px-8 py-3 bg-zinc-50/50 border-b border-zinc-200">
              <span className="text-sm text-zinc-500 pl-4">
                VSK ({summary.vatRate}%)
              </span>
              <span className="text-sm text-zinc-600 tabular-nums">
                {formatISK(summary.vatAmount)}
              </span>
            </div>
          )}

          {/* Grand Total — dark, prominent */}
          <div className="flex justify-between items-center px-8 py-5 bg-zinc-900">
            <span className="text-lg font-bold text-white">
              Heildarupphæð m/vsk
            </span>
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatISK(summary.grandTotalWithVat)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <BuyerPdfButton periodId={periodId} />
      </div>
    </div>
  )
}
