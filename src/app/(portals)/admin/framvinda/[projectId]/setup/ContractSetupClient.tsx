'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  createContractWithLines,
  saveContractLines,
} from '@/lib/framvinda/actions'
import {
  suggestContractLines,
  formatISK,
  type SuggestedContractLine,
} from '@/lib/framvinda/calculations'
import {
  FRAMVINDA_CATEGORIES,
  CATEGORY_LABELS,
  PRICING_UNIT_LABELS,
  type FramvindaCategory,
  type PricingUnit,
  type FramvindaContract,
  type FramvindaContractLine,
} from '@/lib/framvinda/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Trash2,
  Wand2,
  Loader2,
  Save,
} from 'lucide-react'

interface EditableLine {
  tempId: string
  category: FramvindaCategory
  label: string
  is_extra: boolean
  extra_description: string
  pricing_unit: PricingUnit
  contract_count: string
  unit_area_m2: string
  total_quantity: string
  unit_price: string
  building_id: string | null
  floor: number | null
  element_type_key: string | null
  drawing_reference_pattern: string | null
}

function newLine(category: FramvindaCategory = 'filigran'): EditableLine {
  return {
    tempId: crypto.randomUUID(),
    category,
    label: '',
    is_extra: false,
    extra_description: '',
    pricing_unit: category === 'flutningur' ? 'ferdir' : category === 'stigar' ? 'stk' : 'm2',
    contract_count: '',
    unit_area_m2: '',
    total_quantity: '',
    unit_price: '',
    building_id: null,
    floor: null,
    element_type_key: null,
    drawing_reference_pattern: null,
  }
}

function existingToEditable(line: FramvindaContractLine): EditableLine {
  return {
    tempId: line.id,
    category: line.category as FramvindaCategory,
    label: line.label,
    is_extra: line.is_extra,
    extra_description: line.extra_description ?? '',
    pricing_unit: line.pricing_unit as PricingUnit,
    contract_count: line.contract_count?.toString() ?? '',
    unit_area_m2: line.unit_area_m2?.toString() ?? '',
    total_quantity: line.total_quantity.toString(),
    unit_price: line.unit_price.toString(),
    building_id: line.building_id,
    floor: line.floor,
    element_type_key: line.element_type_key,
    drawing_reference_pattern: line.drawing_reference_pattern,
  }
}

function suggestedToEditable(s: SuggestedContractLine): EditableLine {
  return {
    tempId: crypto.randomUUID(),
    category: s.category,
    label: s.label,
    is_extra: s.is_extra,
    extra_description: '',
    pricing_unit: s.pricing_unit,
    contract_count: s.contract_count?.toString() ?? '',
    unit_area_m2: s.unit_area_m2?.toString() ?? '',
    total_quantity: s.total_quantity.toString(),
    unit_price: '',
    building_id: s.building_id,
    floor: s.floor,
    element_type_key: s.element_type_key,
    drawing_reference_pattern: s.drawing_reference_pattern,
  }
}

function calcLineTotal(line: EditableLine): number {
  const qty = parseFloat(line.total_quantity) || 0
  const price = parseFloat(line.unit_price) || 0
  return qty * price
}

interface Props {
  projectId: string
  contract: FramvindaContract | null
  existingLines: FramvindaContractLine[]
  buildings: Array<{ id: string; name: string; floors: number | null }>
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

export function ContractSetupClient({
  projectId,
  contract,
  existingLines,
  buildings,
  elements,
  deliveries,
}: Props) {
  const router = useRouter()
  const [lines, setLines] = useState<EditableLine[]>(
    existingLines.length > 0
      ? existingLines.map(existingToEditable)
      : []
  )
  const [grunnvisitala, setGrunnvisitala] = useState(
    contract?.grunnvisitala?.toString() ?? ''
  )
  const [vatRate, setVatRate] = useState(
    contract?.vat_rate?.toString() ?? '11'
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const updateLine = useCallback(
    (tempId: string, field: keyof EditableLine, value: string | boolean | number | null) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.tempId !== tempId) return l
          const updated = { ...l, [field]: value }
          // Auto-calculate total_quantity when count or area changes
          if (
            (field === 'contract_count' || field === 'unit_area_m2') &&
            updated.pricing_unit === 'm2'
          ) {
            const count = parseFloat(updated.contract_count) || 0
            const area = parseFloat(updated.unit_area_m2) || 0
            if (count && area) {
              updated.total_quantity = (count * area).toFixed(4)
            }
          }
          return updated
        })
      )
    },
    []
  )

  const removeLine = useCallback((tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId))
  }, [])

  const addLine = useCallback((category: FramvindaCategory) => {
    setLines((prev) => [...prev, newLine(category)])
  }, [])

  const handleAutoSuggest = useCallback(() => {
    const completedDeliveries = deliveries.filter(
      (d) => d.status === 'completed'
    ).length
    const suggested = suggestContractLines(elements, buildings, completedDeliveries)
    setLines(suggested.map((s) => suggestedToEditable(s)))
  }, [elements, buildings, deliveries])

  async function handleSave() {
    setSaveError('')

    if (!grunnvisitala || parseFloat(grunnvisitala) <= 0) {
      setSaveError('Grunnvísitala verður að vera stærri en 0')
      return
    }

    if (lines.length === 0) {
      setSaveError('Bættu við að minnsta kosti einni línu')
      return
    }

    // Validate lines
    const invalidLines = lines.filter(
      (l) => !l.label || !l.unit_price || parseFloat(l.unit_price) <= 0
    )
    if (invalidLines.length > 0) {
      setSaveError('Allar línur verða að hafa heiti og verð')
      return
    }

    setSaving(true)

    const lineData = lines.map((l, idx) => ({
      category: l.category,
      sort_order: idx,
      label: l.label,
      is_extra: l.is_extra,
      extra_description: l.extra_description || null,
      pricing_unit: l.pricing_unit,
      contract_count: l.contract_count ? parseInt(l.contract_count) : null,
      unit_area_m2: l.unit_area_m2 ? parseFloat(l.unit_area_m2) : null,
      total_quantity: parseFloat(l.total_quantity) || 0,
      unit_price: parseFloat(l.unit_price) || 0,
      total_price: calcLineTotal(l),
      building_id: l.building_id,
      floor: l.floor,
      element_type_key: l.element_type_key,
      drawing_reference_pattern: l.drawing_reference_pattern,
    }))

    if (contract) {
      // Update existing contract lines
      const result = await saveContractLines(contract.id, lineData)
      if (result.error) {
        setSaveError(result.error)
        setSaving(false)
        return
      }
    } else {
      // Create new contract + lines in one shot
      const result = await createContractWithLines(
        projectId,
        parseFloat(grunnvisitala),
        parseFloat(vatRate) || 11,
        lineData
      )
      if (result.error) {
        setSaveError(result.error)
        setSaving(false)
        return
      }
    }

    router.push(`/admin/framvinda/${projectId}`)
  }

  // Grand total
  const grandTotal = lines.reduce((sum, l) => sum + calcLineTotal(l), 0)

  // Group lines by category for display
  const linesByCategory = new Map<FramvindaCategory, EditableLine[]>()
  for (const cat of FRAMVINDA_CATEGORIES) {
    const catLines = lines.filter((l) => l.category === cat)
    if (catLines.length > 0) linesByCategory.set(cat, catLines)
  }

  return (
    <div className="space-y-6">
      {/* Contract Settings + Lines */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="pt-6">
          {/* Grunnvisitala row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-4 border-b border-zinc-200">
            <div className="space-y-2">
              <Label htmlFor="grunnvisitala">Grunnvísitala *</Label>
              <Input
                id="grunnvisitala"
                type="number"
                step="0.1"
                value={grunnvisitala}
                onChange={(e) => setGrunnvisitala(e.target.value)}
                placeholder="t.d. 117.6"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">VSK hlutfall (%)</Label>
              <Input
                id="vatRate"
                type="number"
                step="0.5"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Lines header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">
              Samningslínur
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSuggest}
                disabled={elements.length === 0}
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" />
                Sækja úr einingum ({elements.length})
              </Button>
            </div>
          </div>

          {/* Lines grouped by category */}
          {FRAMVINDA_CATEGORIES.map((cat) => {
            const catLines = lines.filter((l) => l.category === cat)
            const catTotal = catLines.reduce((s, l) => s + calcLineTotal(l), 0)

            return (
              <div key={cat} className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
                    {CATEGORY_LABELS[cat]}
                    {catLines.length > 0 && (
                      <span className="ml-2 text-zinc-400 font-normal normal-case">
                        ({catLines.length} línur · {formatISK(catTotal)})
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addLine(cat)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Lína
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const extra = newLine(cat)
                        extra.is_extra = true
                        extra.label = 'Auka '
                        setLines((prev) => [...prev, extra])
                      }}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Auka
                    </Button>
                  </div>
                </div>

                {catLines.length > 0 ? (
                  <div className="space-y-2">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-2 text-xs text-zinc-500 font-medium">
                      <div className="col-span-3">Heiti</div>
                      <div className="col-span-1">Stk</div>
                      <div className="col-span-2">m²/stk</div>
                      <div className="col-span-2">Magn</div>
                      <div className="col-span-2">Verð</div>
                      <div className="col-span-1 text-right">Samtals</div>
                      <div className="col-span-1"></div>
                    </div>

                    {catLines.map((line) => (
                      <div
                        key={line.tempId}
                        className="grid grid-cols-12 gap-2 items-center bg-zinc-50 rounded-md px-2 py-1.5"
                      >
                        <div className="col-span-3">
                          <Input
                            value={line.label}
                            onChange={(e) =>
                              updateLine(line.tempId, 'label', e.target.value)
                            }
                            placeholder="Heiti línu"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            value={line.contract_count}
                            onChange={(e) =>
                              updateLine(
                                line.tempId,
                                'contract_count',
                                e.target.value
                              )
                            }
                            placeholder="Stk"
                            type="number"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={line.unit_area_m2}
                            onChange={(e) =>
                              updateLine(
                                line.tempId,
                                'unit_area_m2',
                                e.target.value
                              )
                            }
                            placeholder={
                              PRICING_UNIT_LABELS[line.pricing_unit] + '/stk'
                            }
                            type="number"
                            step="0.0001"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={line.total_quantity}
                            onChange={(e) =>
                              updateLine(
                                line.tempId,
                                'total_quantity',
                                e.target.value
                              )
                            }
                            placeholder="Heildarmagn"
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(
                                line.tempId,
                                'unit_price',
                                e.target.value
                              )
                            }
                            placeholder="Einingaverð"
                            type="number"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium text-zinc-700">
                          {calcLineTotal(line) > 0
                            ? formatISK(calcLineTotal(line))
                            : '—'}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-red-600"
                            onClick={() => removeLine(line.tempId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 px-2">
                    Engar línur. Smelltu á &quot;Bæta við&quot; eða &quot;Sækja úr
                    einingum&quot;.
                  </p>
                )}
              </div>
            )
          })}

          {/* Grand total */}
          <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-zinc-900">
              Heildarsamningur
            </span>
            <span className="text-2xl font-bold text-zinc-900">
              {formatISK(grandTotal)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="border-t border-zinc-100 bg-zinc-50/50 p-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/framvinda')}
            disabled={saving}
          >
            Hætta við
          </Button>
          <div className="flex gap-2 items-center">
            {saveError && (
              <p className="text-sm text-red-600 mr-2">{saveError}</p>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || lines.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vista...
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  Vista samningslínur
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
