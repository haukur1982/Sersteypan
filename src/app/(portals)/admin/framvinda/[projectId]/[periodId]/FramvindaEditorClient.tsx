'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  savePeriodLines,
  finalizePeriod,
  reopenPeriod,
  deletePeriod,
} from '@/lib/framvinda/actions'
import {
  suggestQuantityForLine,
  calculateVisitala,
  formatISK,
  formatNumber,
  formatPercent,
} from '@/lib/framvinda/calculations'
import {
  FRAMVINDA_CATEGORIES,
  CATEGORY_LABELS,
  type FramvindaCategory,
  type FramvindaContract,
  type FramvindaContractLine,
  type FramvindaPeriod,
  type FramvindaPeriodLine,
} from '@/lib/framvinda/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Save,
  Lock,
  Unlock,
  Trash2,
  Wand2,
  Loader2,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface PeriodLineState {
  id: string
  contractLineId: string
  quantityThisPeriod: number
  notes: string
  isManuallyAdjusted: boolean
}

interface Props {
  projectId: string
  projectName: string
  companyName: string
  contract: FramvindaContract
  contractLines: FramvindaContractLine[]
  period: FramvindaPeriod
  periodLines: FramvindaPeriodLine[]
  cumulativeBefore: Record<string, number>
  elements: Array<{
    id: string
    name: string | null
    element_type: string | null
    building_id: string | null
    floor: number | null
    length_mm: number | null
    width_mm: number | null
    drawing_reference: string | null
    status: string | null
    cast_at: string | null
    ready_at: string | null
    delivered_at: string | null
  }>
  deliveries: Array<{
    id: string
    status: string | null
    completed_at: string | null
  }>
}

export function FramvindaEditorClient({
  projectId,
  projectName,
  companyName,
  contract,
  contractLines,
  period,
  periodLines,
  cumulativeBefore,
  elements,
  deliveries,
}: Props) {
  const router = useRouter()
  const isDraft = period.status === 'draft'

  // Build period line state indexed by contract_line_id
  const [lineStates, setLineStates] = useState<Record<string, PeriodLineState>>(
    () => {
      const map: Record<string, PeriodLineState> = {}
      for (const pl of periodLines) {
        map[pl.contract_line_id] = {
          id: pl.id,
          contractLineId: pl.contract_line_id,
          quantityThisPeriod: pl.quantity_this_period,
          notes: pl.notes ?? '',
          isManuallyAdjusted: pl.is_manually_adjusted,
        }
      }
      return map
    }
  )

  const [visitala, setVisitala] = useState(period.visitala)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const updateLineQuantity = useCallback(
    (contractLineId: string, quantity: number) => {
      setLineStates((prev) => ({
        ...prev,
        [contractLineId]: {
          ...prev[contractLineId],
          quantityThisPeriod: quantity,
          isManuallyAdjusted: true,
        },
      }))
    },
    []
  )

  const updateLineNotes = useCallback(
    (contractLineId: string, notes: string) => {
      setLineStates((prev) => ({
        ...prev,
        [contractLineId]: {
          ...prev[contractLineId],
          notes,
        },
      }))
    },
    []
  )

  // Auto-suggest: fill in quantities from element data
  const handleAutoSuggest = useCallback(() => {
    const updates: Record<string, PeriodLineState> = { ...lineStates }
    for (const cl of contractLines) {
      const suggested = suggestQuantityForLine(
        cl,
        elements,
        deliveries,
        period.period_start,
        period.period_end
      )
      if (updates[cl.id]) {
        updates[cl.id] = {
          ...updates[cl.id],
          quantityThisPeriod: Math.round(suggested * 10000) / 10000,
          isManuallyAdjusted: false,
        }
      }
    }
    setLineStates(updates)
  }, [contractLines, elements, deliveries, period, lineStates])

  // Compute derived values
  const computedData = useMemo(() => {
    const result: Record<
      string,
      {
        cumulativeBefore: number
        quantityThisPeriod: number
        cumulativeTotal: number
        percentComplete: number
        cumulativeAmount: number
        amountThisPeriod: number
      }
    > = {}

    let periodSubtotal = 0

    for (const cl of contractLines) {
      const state = lineStates[cl.id]
      const qtyThisPeriod = state?.quantityThisPeriod ?? 0
      const cumBefore = cumulativeBefore[cl.id] ?? 0
      const cumTotal = cumBefore + qtyThisPeriod
      const percent =
        cl.total_quantity > 0 ? cumTotal / cl.total_quantity : 0
      const cumAmount = cumTotal * cl.unit_price
      const amtThisPeriod = qtyThisPeriod * cl.unit_price

      periodSubtotal += amtThisPeriod

      result[cl.id] = {
        cumulativeBefore: cumBefore,
        quantityThisPeriod: qtyThisPeriod,
        cumulativeTotal: cumTotal,
        percentComplete: percent,
        cumulativeAmount: cumAmount,
        amountThisPeriod: amtThisPeriod,
      }
    }

    const summary = calculateVisitala(
      periodSubtotal,
      contract.grunnvisitala,
      visitala
    )

    return { lines: result, summary }
  }, [contractLines, lineStates, cumulativeBefore, contract.grunnvisitala, visitala])

  async function handleSave() {
    setError('')
    setSuccessMsg('')
    setSaving(true)

    const linesToSave = contractLines
      .map((cl) => {
        const state = lineStates[cl.id]
        if (!state) return null
        const computed = computedData.lines[cl.id]
        return {
          id: state.id,
          quantity_this_period: state.quantityThisPeriod,
          amount_this_period: Math.round(computed.amountThisPeriod),
          is_manually_adjusted: state.isManuallyAdjusted,
          notes: state.notes || null,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      quantity_this_period: number
      amount_this_period: number
      is_manually_adjusted: boolean
      notes: string | null
    }>

    const result = await savePeriodLines(period.id, visitala, linesToSave)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg('Vistað!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
    setSaving(false)
  }

  async function handleFinalize() {
    if (
      !confirm(
        'Ertu viss? Þegar framvinda er lokuð er hún notuð til að reikna uppsafnað magn í næsta tímabili.'
      )
    ) {
      return
    }
    // Save first, then finalize
    await handleSave()
    const result = await finalizePeriod(period.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleReopen() {
    const result = await reopenPeriod(period.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Ertu viss um að þú viljir eyða þessu tímabili?')) return
    const result = await deletePeriod(period.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/admin/framvinda/${projectId}`)
    }
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    setError('')
    try {
      const res = await fetch('/api/framvinda/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: period.id }),
      })
      const data = await res.json()
      if (data.error) {
        setError('Villa við PDF: ' + data.error)
      } else if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }
    } catch {
      setError('Villa við að búa til PDF')
    }
    setGeneratingPdf(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/admin/framvinda/${projectId}`}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">
              Framvinda {period.period_number}
            </h1>
            {isDraft ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                Drög
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                <Lock className="mr-1 h-3 w-3" />
                Lokið
              </Badge>
            )}
          </div>
          <p className="text-zinc-600">
            {projectName} — {companyName} ·{' '}
            {new Date(period.period_start).toLocaleDateString('is-IS')} —{' '}
            {new Date(period.period_end).toLocaleDateString('is-IS')}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSuggest}
                disabled={elements.length === 0}
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" />
                Stinga upp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Eyða
              </Button>
            </>
          )}
          {!isDraft && (
            <Button variant="outline" size="sm" onClick={handleReopen}>
              <Unlock className="mr-1 h-3.5 w-3.5" />
              Opna aftur
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm">
          {successMsg}
        </div>
      )}

      {/* Main billing table */}
      <Card className="border-zinc-200 shadow-sm overflow-x-auto">
        <div className="min-w-[1100px]">
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
            const catLines = contractLines.filter(
              (cl) => cl.category === cat
            )
            if (catLines.length === 0) return null

            const catAmountThisPeriod = catLines.reduce(
              (s, cl) => s + (computedData.lines[cl.id]?.amountThisPeriod ?? 0),
              0
            )

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold text-zinc-800">
                    {CATEGORY_LABELS[cat as FramvindaCategory]}
                  </span>
                </div>

                {/* Category lines */}
                {catLines.map((cl) => {
                  const computed = computedData.lines[cl.id]
                  const state = lineStates[cl.id]
                  if (!computed) return null

                  return (
                    <div
                      key={cl.id}
                      className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-zinc-100 hover:bg-zinc-50 items-center text-sm"
                    >
                      {/* Contract data (read-only) */}
                      <div className="col-span-2 text-zinc-900 font-medium truncate" title={cl.label}>
                        {cl.is_extra && (
                          <Badge
                            variant="secondary"
                            className="mr-1 text-[10px] bg-purple-100 text-purple-700"
                          >
                            Auka
                          </Badge>
                        )}
                        {cl.label}
                      </div>
                      <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                        {formatNumber(cl.total_quantity, cl.pricing_unit === 'm2' ? 2 : 0)}
                      </div>
                      <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                        {cl.unit_price.toLocaleString('is-IS')}
                      </div>
                      <div className="col-span-1 text-right text-zinc-600 tabular-nums">
                        {formatISK(cl.total_price)}
                      </div>

                      {/* Cumulative (auto-calculated) */}
                      <div className="col-span-1 text-right text-zinc-700 tabular-nums font-medium">
                        {formatNumber(computed.cumulativeTotal, cl.pricing_unit === 'm2' ? 2 : 0)}
                      </div>
                      <div className="col-span-1 text-right tabular-nums">
                        <span
                          className={
                            computed.percentComplete >= 1
                              ? 'text-green-600 font-medium'
                              : computed.percentComplete > 0
                              ? 'text-blue-600'
                              : 'text-zinc-400'
                          }
                        >
                          {formatPercent(computed.percentComplete)}
                        </span>
                      </div>
                      <div className="col-span-1 text-right text-zinc-700 tabular-nums">
                        {computed.cumulativeAmount > 0
                          ? formatISK(computed.cumulativeAmount)
                          : '—'}
                      </div>

                      {/* This period (editable) */}
                      <div className="col-span-1">
                        {isDraft ? (
                          <Input
                            type="number"
                            step={cl.pricing_unit === 'm2' ? '0.01' : '1'}
                            value={state?.quantityThisPeriod ?? 0}
                            onChange={(e) =>
                              updateLineQuantity(
                                cl.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 text-sm text-right tabular-nums"
                          />
                        ) : (
                          <div className="text-right tabular-nums text-zinc-900">
                            {formatNumber(
                              computed.quantityThisPeriod,
                              cl.pricing_unit === 'm2' ? 2 : 0
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 text-right tabular-nums font-medium text-zinc-900">
                        {computed.amountThisPeriod > 0
                          ? formatISK(computed.amountThisPeriod)
                          : '—'}
                      </div>
                      <div className="col-span-2">
                        {isDraft ? (
                          <Input
                            value={state?.notes ?? ''}
                            onChange={(e) =>
                              updateLineNotes(cl.id, e.target.value)
                            }
                            placeholder="Athugasemd"
                            className="h-7 text-sm"
                          />
                        ) : (
                          <span className="text-sm text-zinc-500">
                            {state?.notes || ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Category subtotal */}
                <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-sm font-semibold">
                  <div className="col-span-2 text-zinc-700">
                    {CATEGORY_LABELS[cat as FramvindaCategory]} samtals
                  </div>
                  <div className="col-span-7"></div>
                  <div className="col-span-1 text-right text-zinc-900 tabular-nums">
                    {catAmountThisPeriod > 0
                      ? formatISK(catAmountThisPeriod)
                      : '—'}
                  </div>
                  <div className="col-span-2"></div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Totals + Vísitala */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-zinc-700">Samtals m/vsk</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatISK(computedData.summary.subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-zinc-100 pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500">
                Grunnvísitala: {contract.grunnvisitala}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Vísitala:</span>
                {isDraft ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={visitala}
                    onChange={(e) =>
                      setVisitala(parseFloat(e.target.value) || 0)
                    }
                    className="w-24 h-8 text-sm"
                  />
                ) : (
                  <span className="font-medium">{visitala}</span>
                )}
              </div>
            </div>
            <span className="text-zinc-700 tabular-nums">
              {formatISK(computedData.summary.visitalaAmount)}
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-zinc-200 pt-4 text-xl">
            <span className="font-bold text-zinc-900">Samtals m/vsk</span>
            <span className="font-bold text-zinc-900 tabular-nums">
              {formatISK(computedData.summary.totalWithVisitala)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href={`/admin/framvinda/${projectId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Til baka
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            variant="outline"
          >
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1 h-4 w-4" />
            )}
            Sækja PDF
          </Button>
          {isDraft && (
            <>
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="outline"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Vista drög
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Lock className="mr-1 h-4 w-4" />
                Loka framvindu
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
