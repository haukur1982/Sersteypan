'use client'

import {
  FRAMVINDA_CATEGORIES,
  CATEGORY_LABELS,
  type FramvindaCategory,
  type FramvindaContractLine,
} from '@/lib/framvinda/types'
import { formatISK, formatNumber, formatPercent } from '@/lib/framvinda/calculations'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  contractLines: FramvindaContractLine[]
  cumulative: Record<string, number> // contract_line_id → total produced quantity
}

export function ProgressSummary({ contractLines, cumulative }: Props) {
  if (contractLines.length === 0) return null

  // Compute per-line progress
  const lineProgress = contractLines.map((cl) => {
    const produced = cumulative[cl.id] ?? 0
    // Allow negative remaining to surface over-billing
    const remaining = cl.total_quantity - produced
    const percent = cl.total_quantity > 0 ? produced / cl.total_quantity : 0
    const producedAmount = produced * cl.unit_price
    const remainingAmount = remaining * cl.unit_price
    const isOverBilled = remaining < 0

    return {
      cl,
      produced,
      remaining,
      percent,
      producedAmount,
      remainingAmount,
      isOverBilled,
    }
  })

  // Category totals
  const categoryData = FRAMVINDA_CATEGORIES.map((cat) => {
    const catLines = lineProgress.filter((l) => l.cl.category === cat)
    if (catLines.length === 0) return null

    const contractTotal = catLines.reduce((s, l) => s + l.cl.total_price, 0)
    const producedTotal = catLines.reduce((s, l) => s + l.producedAmount, 0)
    const remainingTotal = catLines.reduce((s, l) => s + l.remainingAmount, 0)
    const percentTotal = contractTotal > 0 ? producedTotal / contractTotal : 0

    return {
      category: cat,
      lines: catLines,
      contractTotal,
      producedTotal,
      remainingTotal,
      percentTotal,
    }
  }).filter(Boolean) as Array<{
    category: string
    lines: typeof lineProgress
    contractTotal: number
    producedTotal: number
    remainingTotal: number
    percentTotal: number
  }>

  // Grand totals
  const grandContractTotal = lineProgress.reduce((s, l) => s + l.cl.total_price, 0)
  const grandProducedTotal = lineProgress.reduce((s, l) => s + l.producedAmount, 0)
  const grandRemainingTotal = lineProgress.reduce((s, l) => s + l.remainingAmount, 0)
  const grandPercent = grandContractTotal > 0 ? grandProducedTotal / grandContractTotal : 0

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Framvindayfirlit
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left py-2 pr-4">Verkþáttur</th>
                <th className="text-right py-2 px-2">Samn. magn</th>
                <th className="text-right py-2 px-2">Framleitt</th>
                <th className="text-right py-2 px-2">Eftirstöðvar</th>
                <th className="text-right py-2 px-2 w-24">%</th>
                <th className="text-right py-2 px-2">Samn. upph.</th>
                <th className="text-right py-2 px-2">Rukkað</th>
                <th className="text-right py-2 pl-2">Eftir</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((catData) => (
                <CategorySection key={catData.category} data={catData} />
              ))}

              {/* Grand total */}
              <tr className="border-t-2 border-zinc-300 font-bold">
                <td className="py-3 pr-4 text-zinc-900">Samtals</td>
                <td className="text-right py-3 px-2"></td>
                <td className="text-right py-3 px-2"></td>
                <td className="text-right py-3 px-2"></td>
                <td className="text-right py-3 px-2">
                  <ProgressBar percent={grandPercent} />
                </td>
                <td className="text-right py-3 px-2 tabular-nums text-zinc-900">
                  {formatISK(grandContractTotal)}
                </td>
                <td className="text-right py-3 px-2 tabular-nums text-green-700">
                  {formatISK(grandProducedTotal)}
                </td>
                <td className="text-right py-3 pl-2 tabular-nums text-amber-700">
                  {formatISK(grandRemainingTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function CategorySection({ data }: {
  data: {
    category: string
    lines: Array<{
      cl: FramvindaContractLine
      produced: number
      remaining: number
      percent: number
      producedAmount: number
      remainingAmount: number
      isOverBilled: boolean
    }>
    contractTotal: number
    producedTotal: number
    remainingTotal: number
    percentTotal: number
  }
}) {
  return (
    <>
      {/* Category header */}
      <tr className="bg-zinc-50">
        <td colSpan={8} className="py-2 pr-4 font-semibold text-zinc-800">
          {CATEGORY_LABELS[data.category as FramvindaCategory]}
        </td>
      </tr>

      {/* Lines */}
      {data.lines.map((line) => (
        <tr key={line.cl.id} className="border-b border-zinc-100 hover:bg-zinc-50">
          <td className="py-2 pr-4 text-zinc-700 pl-4">
            {line.cl.label}
          </td>
          <td className="text-right py-2 px-2 tabular-nums text-zinc-600">
            {formatNumber(line.cl.total_quantity, line.cl.pricing_unit === 'm2' ? 2 : 0)}
          </td>
          <td className="text-right py-2 px-2 tabular-nums text-zinc-900">
            {formatNumber(line.produced, line.cl.pricing_unit === 'm2' ? 2 : 0)}
          </td>
          <td className={`text-right py-2 px-2 tabular-nums ${line.isOverBilled ? 'text-red-600 font-medium' : 'text-zinc-600'}`}>
            {formatNumber(line.remaining, line.cl.pricing_unit === 'm2' ? 2 : 0)}
            {line.isOverBilled && ' !'}
          </td>
          <td className="text-right py-2 px-2">
            <ProgressBar percent={line.percent} />
          </td>
          <td className="text-right py-2 px-2 tabular-nums text-zinc-600">
            {formatISK(line.cl.total_price)}
          </td>
          <td className="text-right py-2 px-2 tabular-nums text-green-700">
            {line.producedAmount > 0 ? formatISK(line.producedAmount) : '—'}
          </td>
          <td className={`text-right py-2 pl-2 tabular-nums ${line.isOverBilled ? 'text-red-600 font-medium' : 'text-amber-700'}`}>
            {line.remainingAmount !== 0 ? formatISK(line.remainingAmount) : '—'}
          </td>
        </tr>
      ))}

      {/* Category subtotal */}
      <tr className="bg-zinc-50 border-b border-zinc-200 font-medium">
        <td className="py-2 pr-4 text-zinc-700">
          {CATEGORY_LABELS[data.category as FramvindaCategory]} samtals
        </td>
        <td className="text-right py-2 px-2"></td>
        <td className="text-right py-2 px-2"></td>
        <td className="text-right py-2 px-2"></td>
        <td className="text-right py-2 px-2">
          <ProgressBar percent={data.percentTotal} />
        </td>
        <td className="text-right py-2 px-2 tabular-nums">
          {formatISK(data.contractTotal)}
        </td>
        <td className="text-right py-2 px-2 tabular-nums text-green-700">
          {formatISK(data.producedTotal)}
        </td>
        <td className="text-right py-2 pl-2 tabular-nums text-amber-700">
          {formatISK(data.remainingTotal)}
        </td>
      </tr>
    </>
  )
}

function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.round(percent * 100)
  const color =
    pct >= 100
      ? 'bg-green-500'
      : pct > 50
      ? 'bg-blue-500'
      : pct > 0
      ? 'bg-amber-500'
      : 'bg-zinc-200'

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span
        className={`text-xs tabular-nums ${
          pct >= 100
            ? 'text-green-600 font-medium'
            : pct > 0
            ? 'text-zinc-600'
            : 'text-zinc-400'
        }`}
      >
        {formatPercent(percent)}
      </span>
    </div>
  )
}
