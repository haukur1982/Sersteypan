'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Clock,
    Wrench,
    Layers,
    Timer,
    CheckCircle,
    Truck,
    Pencil,
    Loader2,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { bulkUpdateElementStatus } from '@/lib/factory/actions'

const statusConfig = {
    planned: { icon: Clock, label: 'Skipulagt', color: 'bg-gray-100 text-gray-800' },
    rebar: { icon: Wrench, label: 'Járnabundið', color: 'bg-yellow-100 text-yellow-800' },
    cast: { icon: Layers, label: 'Steypt', color: 'bg-orange-100 text-orange-800' },
    curing: { icon: Timer, label: 'Þornar', color: 'bg-amber-100 text-amber-800' },
    ready: { icon: CheckCircle, label: 'Tilbúið', color: 'bg-green-100 text-green-800' },
    loaded: { icon: Truck, label: 'Á bíl', color: 'bg-blue-100 text-blue-800' },
}

const typeConfig: Record<string, { label: string }> = {
    wall: { label: 'Veggur' },
    filigran: { label: 'Filigran' },
    staircase: { label: 'Stigi' },
    balcony: { label: 'Svalir' },
    ceiling: { label: 'Þak' },
    column: { label: 'Súla' },
    beam: { label: 'Bita' },
    other: { label: 'Annað' },
}

interface ProductionElement {
    id: string
    name: string
    element_type: string
    status: string | null
    priority: number | null
    floor: number | string | null
    projects?: {
        id?: string
        name: string
        companies?: { name: string } | null
    } | null
    production_batches?: {
        id: string
        batch_number: string
    } | null
}

interface ProductionQueueTableProps {
    elements: ProductionElement[]
}

export function ProductionQueueTable({ elements }: ProductionQueueTableProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [showBulkDialog, setShowBulkDialog] = useState(false)
    const [bulkStatus, setBulkStatus] = useState<string>('')
    const [isPending, startTransition] = useTransition()
    const [bulkResult, setBulkResult] = useState<string | null>(null)

    const toggleAll = () => {
        if (selected.size === elements.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(elements.map(e => e.id)))
        }
    }

    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleBulkUpdate = () => {
        if (!bulkStatus || selected.size === 0) return

        startTransition(async () => {
            const result = await bulkUpdateElementStatus(Array.from(selected), bulkStatus)
            if (result.success) {
                setBulkResult(`${result.count} einingar uppfærðar`)
                setSelected(new Set())
                setShowBulkDialog(false)
                setBulkStatus('')
                // Clear success message after 3 seconds
                setTimeout(() => setBulkResult(null), 3000)
            } else {
                setBulkResult(result.error || 'Villa')
            }
        })
    }

    return (
        <>
            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">
                        {selected.size} {selected.size === 1 ? 'eining' : 'einingar'} valdar
                    </span>
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => setShowBulkDialog(true)}
                    >
                        Breyta stöðu
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(new Set())}
                    >
                        Hreinsa val
                    </Button>
                </div>
            )}

            {/* Success message */}
            {bulkResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    {bulkResult}
                </div>
            )}

            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-2 p-2">
                {elements.length > 0 ? (
                    elements.map((element) => {
                        const statusInfo = statusConfig[(element.status || 'planned') as keyof typeof statusConfig] || statusConfig.planned
                        const typeInfo = typeConfig[element.element_type] || typeConfig.other
                        const StatusIcon = statusInfo.icon
                        const isSelected = selected.has(element.id)

                        return (
                            <div
                                key={element.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border ${isSelected ? 'border-blue-300 bg-blue-50/50' : 'border-zinc-200 bg-white'}`}
                            >
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleOne(element.id)}
                                    aria-label={`Velja ${element.name}`}
                                    className="flex-shrink-0"
                                />
                                <Link href={`/factory/production/${element.id}`} className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-zinc-900 truncate">{element.name}</span>
                                        {(element.priority ?? 0) > 0 && (
                                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                P{element.priority}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className={`${statusInfo.color} gap-1 border-0 font-medium text-xs`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusInfo.label}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {typeInfo.label}
                                        </Badge>
                                    </div>
                                    {element.projects?.name && (
                                        <p className="text-xs text-zinc-500 mt-1 truncate">
                                            {element.projects.name}
                                            {element.projects.companies?.name ? ` — ${element.projects.companies.name}` : ''}
                                        </p>
                                    )}
                                </Link>
                                <Button variant="ghost" size="icon" asChild className="h-11 w-11 text-zinc-500 hover:text-blue-600 flex-shrink-0">
                                    <Link href={`/factory/production/${element.id}`}>
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        )
                    })
                ) : (
                    <div className="py-12 text-center text-zinc-500">
                        Engar einingar fundust
                    </div>
                )}
            </div>

            {/* Desktop: Table layout */}
            <Table className="hidden md:table">
                <TableHeader className="bg-zinc-50">
                    <TableRow>
                        <TableHead className="py-4 w-10">
                            <Checkbox
                                checked={elements.length > 0 && selected.size === elements.length}
                                onCheckedChange={toggleAll}
                                aria-label="Velja allt"
                            />
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Forgangur
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Nafn
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Verkefni
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Lota
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Tegund
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Staða
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider">
                            Hæð
                        </TableHead>
                        <TableHead className="py-4 font-medium text-xs text-zinc-500 uppercase tracking-wider text-right">
                            Aðgerðir
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {elements.length > 0 ? (
                        elements.map((element) => {
                            const statusInfo = statusConfig[(element.status || 'planned') as keyof typeof statusConfig] || statusConfig.planned
                            const typeInfo = typeConfig[element.element_type] || typeConfig.other
                            const StatusIcon = statusInfo.icon
                            const isSelected = selected.has(element.id)

                            return (
                                <TableRow key={element.id} className={`hover:bg-zinc-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                    <TableCell className="py-4">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleOne(element.id)}
                                            aria-label={`Velja ${element.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {(element.priority ?? 0) > 0 ? (
                                            <span className="font-bold text-orange-600">
                                                {element.priority}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400">0</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-semibold text-zinc-900 py-4">
                                        {element.name}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900">
                                                {element.projects?.name}
                                            </p>
                                            <p className="text-xs text-zinc-600">
                                                {element.projects?.companies?.name}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {element.production_batches ? (
                                            <Link
                                                href={`/factory/batches/${element.production_batches.id}`}
                                                className="text-sm font-mono text-blue-600 hover:underline"
                                            >
                                                {element.production_batches.batch_number}
                                            </Link>
                                        ) : (
                                            <span className="text-zinc-400 text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {typeInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Badge variant="secondary" className={`${statusInfo.color} gap-1 border-0 font-medium`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-zinc-600">
                                        {element.floor || '-'}
                                    </TableCell>
                                    <TableCell className="py-4 text-right">
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-500 hover:text-blue-600">
                                            <Link href={`/factory/production/${element.id}`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-32 text-center text-zinc-500">
                                Engar einingar fundust
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Bulk status update dialog */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Breyta stöðu ({selected.size} einingar)</DialogTitle>
                        <DialogDescription>
                            Veldu nýja stöðu fyrir valdar einingar. Þetta mun uppfæra allar valdar einingar í einu.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Veldu stöðu..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(statusConfig).map(([key, config]) => {
                                    const Icon = config.icon
                                    return (
                                        <SelectItem key={key} value={key}>
                                            <span className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                {config.label}
                                            </span>
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                            Hætta við
                        </Button>
                        <Button
                            onClick={handleBulkUpdate}
                            disabled={!bulkStatus || isPending}
                        >
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Uppfæra {selected.size} einingar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
