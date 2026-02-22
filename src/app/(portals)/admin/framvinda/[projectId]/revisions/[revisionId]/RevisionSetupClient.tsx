'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    saveContractLines,
    approveRevision,
    deleteRevision,
} from '@/lib/framvinda/actions'
import { formatISK } from '@/lib/framvinda/calculations'
import {
    FRAMVINDA_CATEGORIES,
    CATEGORY_LABELS,
    PRICING_UNIT_LABELS,
    type FramvindaCategory,
    type PricingUnit,
    type FramvindaContractLine,
} from '@/lib/framvinda/types'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Save, Check, AlertTriangle } from 'lucide-react'

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
        is_extra: true, // Revisions are typically all extra lines
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

function calcLineTotal(line: EditableLine): number {
    const qty = parseFloat(line.total_quantity) || 0
    const price = parseFloat(line.unit_price) || 0
    return qty * price
}

interface Props {
    projectId: string
    contractId: string
    revision: { id: string; status: string }
    existingLines: FramvindaContractLine[]
}

export function RevisionSetupClient({
    projectId,
    contractId,
    revision,
    existingLines,
}: Props) {
    const router = useRouter()
    const isApproved = revision.status === 'approved'

    const [lines, setLines] = useState<EditableLine[]>(
        existingLines.length > 0
            ? existingLines.map(existingToEditable)
            : []
    )
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    const updateLine = useCallback(
        (tempId: string, field: keyof EditableLine, value: string | boolean | number | null) => {
            setLines((prev) =>
                prev.map((l) => {
                    if (l.tempId !== tempId) return l
                    const updated = { ...l, [field]: value }
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

    async function handleSave() {
        setSaveError('')
        if (lines.length === 0) {
            setSaveError('Bættu við að minnsta kosti einni línu')
            return
        }

        const invalidLines = lines.filter(
            (l) => !l.label || !l.unit_price || parseFloat(l.unit_price) <= 0
        )
        if (invalidLines.length > 0) {
            setSaveError('Allar línur verða að hafa heiti og verð')
            return
        }

        setSaving(true)
        const existingLineIds = new Set(existingLines.map((l) => l.id))

        const lineData = lines.map((l, idx) => ({
            id: existingLineIds.has(l.tempId) ? l.tempId : undefined,
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

        const result = await saveContractLines(contractId, revision.id, lineData)
        if (result.error) {
            setSaveError(result.error)
            setSaving(false)
            return
        }

        router.push(`/admin/framvinda/${projectId}`)
    }

    async function handleApprove() {
        if (!confirm('Ertu viss um að þú viljir samþykkja þessa viðbót? Eftir samþykkt verður ekki hægt að breyta henni.')) return

        setSaving(true)
        // Save first just in case there are unsaved changes
        await handleSave()

        try {
            const result = await approveRevision(revision.id)
            if (result.error) {
                setSaveError(result.error)
                setSaving(false)
                toast.error(result.error)
                return
            }
            router.refresh()
            toast.success('Viðbót samþykkt!')
        } catch (e) {
            if (e instanceof Error) {
                toast.error(e.message)
            } else {
                toast.error('Gat ekki samþykkt viðbót')
            }
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!confirm('Ertu viss um að þú viljir eyða þessari viðbót alveg?')) return
        setSaving(true)
        const result = await deleteRevision(revision.id)
        if (result.error) {
            setSaveError(result.error)
            setSaving(false)
            return
        }
        router.push(`/admin/framvinda/${projectId}`)
    }

    const grandTotal = lines.reduce((sum, l) => sum + calcLineTotal(l), 0)

    return (
        <div className="space-y-6">
            {isApproved && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Þessi viðbót hefur verið samþykkt og er nú hluti af virka samningnum.
                </div>
            )}

            <Card className="border-zinc-200 shadow-sm">
                <CardContent className="pt-6">
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
                                    {!isApproved && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addLine(cat)}
                                            className="text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                            Lína
                                        </Button>
                                    )}
                                </div>

                                {catLines.length > 0 ? (
                                    <div className="space-y-2">
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
                                                        onChange={(e) => updateLine(line.tempId, 'label', e.target.value)}
                                                        placeholder="Heiti línu"
                                                        className="h-8 text-sm"
                                                        disabled={isApproved}
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <Input
                                                        value={line.contract_count}
                                                        onChange={(e) => updateLine(line.tempId, 'contract_count', e.target.value)}
                                                        placeholder="Stk"
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        disabled={isApproved}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        value={line.unit_area_m2}
                                                        onChange={(e) => updateLine(line.tempId, 'unit_area_m2', e.target.value)}
                                                        placeholder={PRICING_UNIT_LABELS[line.pricing_unit] + '/stk'}
                                                        type="number"
                                                        step="0.0001"
                                                        className="h-8 text-sm"
                                                        disabled={isApproved}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        value={line.total_quantity}
                                                        onChange={(e) => updateLine(line.tempId, 'total_quantity', e.target.value)}
                                                        placeholder="Heildarmagn"
                                                        type="number"
                                                        step="0.01"
                                                        className="h-8 text-sm"
                                                        disabled={isApproved}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        value={line.unit_price}
                                                        onChange={(e) => updateLine(line.tempId, 'unit_price', e.target.value)}
                                                        placeholder="Einingaverð"
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        disabled={isApproved}
                                                    />
                                                </div>
                                                <div className="col-span-1 text-right text-sm font-medium text-zinc-700">
                                                    {calcLineTotal(line) > 0 ? formatISK(calcLineTotal(line)) : '—'}
                                                </div>
                                                <div className="col-span-1 text-right">
                                                    {!isApproved && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-zinc-400 hover:text-red-600"
                                                            onClick={() => removeLine(line.tempId)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-400 px-2">Engar línur.</p>
                                )}
                            </div>
                        )
                    })}

                    <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-between items-center">
                        <span className="text-lg font-semibold text-zinc-900">
                            Heildarupphæð viðbótar
                        </span>
                        <span className="text-2xl font-bold text-zinc-900">
                            {formatISK(grandTotal)}
                        </span>
                    </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-100 bg-zinc-50/50 p-6 flex justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/admin/framvinda/${projectId}`)}
                            disabled={saving}
                        >
                            Til baka
                        </Button>
                        {!isApproved && (
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                disabled={saving}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Eyða viðbót
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2 items-center">
                        {saveError && (
                            <p className="text-sm text-red-600 mr-2">{saveError}</p>
                        )}

                        {!isApproved && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSave}
                                    disabled={saving || lines.length === 0}
                                >
                                    <Save className="mr-1 h-4 w-4" />
                                    Vista
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    disabled={saving || lines.length === 0}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="mr-1 h-4 w-4" />
                                    Samþykkja
                                </Button>
                            </>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
