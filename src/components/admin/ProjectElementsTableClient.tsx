'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Pencil,
    Layers,
    Square,
    GalleryVerticalEnd,
    Box,
    Minus,
    CircleDot,
    HelpCircle,
    CheckSquare,
    Trash2,
    Check,
    X,
    Loader2
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import { updateExtractedElement } from '@/lib/drawing-analysis/actions' // We need a generic element update action or create one
import { useRouter } from 'next/navigation'
import { bulkUpdateElements, deleteElement } from '@/lib/elements/actions'

type ElementRow = Database['public']['Tables']['elements']['Row']

const typeConfig = {
    wall: { color: 'bg-blue-100 text-blue-800', label: 'Veggur', icon: Square },
    filigran: { color: 'bg-purple-100 text-purple-800', label: 'Filigran', icon: Layers },
    staircase: { color: 'bg-orange-100 text-orange-800', label: 'Stigi', icon: GalleryVerticalEnd },
    balcony: { color: 'bg-green-100 text-green-800', label: 'Svalir', icon: Box },
    svalagangur: { color: 'bg-teal-100 text-teal-800', label: 'Svalagangur', icon: Box },
    ceiling: { color: 'bg-zinc-100 text-zinc-800', label: 'Þak', icon: Minus },
    column: { color: 'bg-yellow-100 text-yellow-800', label: 'Súla', icon: CircleDot },
    beam: { color: 'bg-red-100 text-red-800', label: 'Bita', icon: Minus },
    other: { color: 'bg-zinc-100 text-zinc-600', label: 'Annað', icon: HelpCircle }
}

const statusConfig = {
    planned: { color: 'bg-zinc-100 text-zinc-600', label: 'Skipulagt' },
    rebar: { color: 'bg-yellow-100 text-yellow-800', label: 'Járnabundið' },
    cast: { color: 'bg-orange-100 text-orange-800', label: 'Steypt' },
    curing: { color: 'bg-amber-100 text-amber-800', label: 'Þornar' },
    ready: { color: 'bg-green-100 text-green-800', label: 'Tilbúið' },
    loaded: { color: 'bg-blue-100 text-blue-800', label: 'Á bíl' },
    delivered: { color: 'bg-purple-100 text-purple-800', label: 'Afhent' }
}

export function ProjectElementsTableClient({ elements, projectId }: { elements: ElementRow[], projectId: string }) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isUpdating, setIsUpdating] = useState(false)
    const [bulkType, setBulkType] = useState<string>('')
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const toggleAll = () => {
        if (selectedIds.size === elements.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(elements.map(e => e.id)))
        }
    }

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const handleBulkUpdateType = async () => {
        if (!bulkType || selectedIds.size === 0) return

        setIsUpdating(true)
        try {
            const result = await bulkUpdateElements(Array.from(selectedIds), { element_type: bulkType })
            if (result.error) throw new Error(result.error)

            toast.success(`Tegund uppfærð fyrir ${selectedIds.size} einingar`)
            setSelectedIds(new Set())
            setBulkType('')
            router.refresh()
        } catch (error: unknown) {
            const err = error as Error;
            toast.error(err.message || 'Villa við að uppfæra einingar')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteElement = async (id: string) => {
        setDeletingId(id)
        try {
            const result = await deleteElement(id)
            if (result.error) throw new Error(result.error)

            toast.success('Einingu var eytt (Element deleted)')
            setConfirmingDeleteId(null)
            router.refresh()
        } catch (error: unknown) {
            const err = error as Error;
            toast.error(err.message || 'Ekki tókst að eyða einingu')
        } finally {
            setDeletingId(null)
        }
    }

    const hasSelection = selectedIds.size > 0

    return (
        <div className="space-y-3">
            {hasSelection && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                        {selectedIds.size} einingar valdar
                    </span>
                    <div className="flex items-center gap-2">
                        <Select value={bulkType} onValueChange={setBulkType}>
                            <SelectTrigger className="w-[180px] h-8 bg-white text-xs">
                                <SelectValue placeholder="Breyta tegund í..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(typeConfig).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            size="sm"
                            onClick={handleBulkUpdateType}
                            disabled={!bulkType || isUpdating}
                            className="h-8"
                        >
                            Vista ({selectedIds.size})
                        </Button>
                    </div>
                </div>
            )}

            <div className="border border-zinc-200 rounded-md overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead className="w-[40px] px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={elements.length > 0 && selectedIds.size === elements.length}
                                    onChange={toggleAll}
                                    className="rounded border-zinc-300"
                                />
                            </TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">Nafn (Name)</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">Tegund (Type)</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider">Staða (Status)</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[100px]">Forgangur</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[100px]">Hæð</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider w-[140px]">QR</TableHead>
                            <TableHead className="py-3 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">Aðgerðir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {elements.length > 0 ? (
                            elements.map((element) => {
                                const typeInfo = typeConfig[element.element_type as keyof typeof typeConfig] || typeConfig.other
                                const statusInfo = statusConfig[element.status as keyof typeof statusConfig] || statusConfig.planned
                                const TypeIcon = typeInfo.icon

                                return (
                                    <TableRow key={element.id} className="hover:bg-zinc-50">
                                        <TableCell className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(element.id)}
                                                onChange={() => toggleOne(element.id)}
                                                className="rounded border-zinc-300"
                                            />
                                        </TableCell>
                                        <TableCell className="font-semibold text-zinc-900 py-3">
                                            {element.name}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant="secondary" className={`${typeInfo.color} gap-1 border-0 font-normal`}>
                                                <TypeIcon className="h-3 w-3" />
                                                {typeInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant="secondary" className={`${statusInfo.color} border-0 font-medium`}>
                                                {statusInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 text-zinc-600">
                                            {(element.priority ?? 0) > 0 ? (
                                                <span className="font-medium text-orange-600">{element.priority}</span>
                                            ) : (
                                                <span className="text-zinc-400">0</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 text-zinc-600">
                                            {element.floor || '-'}
                                        </TableCell>
                                        <TableCell className="py-3 text-zinc-600">
                                            {element.qr_code_url ? (
                                                <a
                                                    href={element.qr_code_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-sm"
                                                >
                                                    View QR
                                                </a>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 text-right">
                                            {confirmingDeleteId === element.id ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-xs text-muted-foreground mr-1">Eyða?</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteElement(element.id)}
                                                        disabled={deletingId === element.id}
                                                    >
                                                        {deletingId === element.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setConfirmingDeleteId(null)}
                                                        disabled={deletingId === element.id}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-600" onClick={() => setConfirmingDeleteId(element.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                                        <Link href={`/admin/elements/${element.id}/edit`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                                    Engar einingar skráðar (No elements found).
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
