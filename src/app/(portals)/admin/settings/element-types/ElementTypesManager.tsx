'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { clearElementTypesCache } from '@/components/elements/ElementTypeSelect'
import type { ElementType } from '@/lib/element-types/queries'

interface ElementTypesManagerProps {
    initialTypes: ElementType[]
}

export function ElementTypesManager({ initialTypes }: ElementTypesManagerProps) {
    const router = useRouter()
    const [types, setTypes] = useState<ElementType[]>(initialTypes)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingType, setEditingType] = useState<ElementType | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        key: '',
        label_is: '',
        label_en: '',
        sort_order: 50,
        is_active: true,
    })

    const resetForm = () => {
        setFormData({
            key: '',
            label_is: '',
            label_en: '',
            sort_order: 50,
            is_active: true,
        })
        setEditingType(null)
        setError(null)
    }

    const openCreateDialog = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const openEditDialog = (type: ElementType) => {
        setEditingType(type)
        setFormData({
            key: type.key,
            label_is: type.label_is,
            label_en: type.label_en,
            sort_order: type.sort_order ?? 50,
            is_active: type.is_active ?? true,
        })
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (editingType) {
                // Update existing
                const response = await fetch('/api/element-types', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingType.id,
                        ...formData,
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to update')
                }

                const updated = await response.json()
                setTypes(types.map(t => t.id === updated.id ? updated : t))
            } else {
                // Create new
                const response = await fetch('/api/element-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to create')
                }

                const created = await response.json()
                setTypes([...types, created])
            }

            // Clear client-side cache so other components get fresh data
            clearElementTypesCache()
            setIsDialogOpen(false)
            resetForm()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeactivate = async (type: ElementType) => {
        if (!confirm(`Ertu viss um að þú viljir slökkva á "${type.label_is}"?`)) {
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(`/api/element-types?id=${type.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to deactivate')
            }

            setTypes(types.map(t => t.id === type.id ? { ...t, is_active: false } : t))
            clearElementTypesCache()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleReactivate = async (type: ElementType) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/element-types', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: type.id,
                    is_active: true,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to reactivate')
            }

            const updated = await response.json()
            setTypes(types.map(t => t.id === updated.id ? updated : t))
            clearElementTypesCache()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Error message */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                    {error}
                </div>
            )}

            {/* Action bar */}
            <div className="flex justify-end">
                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Ný tegund
                </Button>
            </div>

            {/* Table */}
            <Card className="border-zinc-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50">
                        <TableRow>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Lykill (Key)
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Nafn (Icelandic)
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Name (English)
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Röð (Order)
                            </TableHead>
                            <TableHead className="font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Staða (Status)
                            </TableHead>
                            <TableHead className="w-[100px] text-right font-medium text-xs text-zinc-500 uppercase tracking-wider py-4">
                                Aðgerðir
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {types
                            .sort((a, b) => (a.sort_order ?? 50) - (b.sort_order ?? 50))
                            .map((type) => (
                                <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                                    <TableCell className="font-mono text-sm">
                                        {type.key}
                                    </TableCell>
                                    <TableCell>{type.label_is}</TableCell>
                                    <TableCell>{type.label_en}</TableCell>
                                    <TableCell>{type.sort_order}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={type.is_active ? 'default' : 'secondary'}
                                            className={type.is_active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}
                                        >
                                            {type.is_active ? 'Virk' : 'Óvirk'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditDialog(type)}
                                                disabled={isLoading}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {type.is_active ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeactivate(type)}
                                                    disabled={isLoading}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReactivate(type)}
                                                    disabled={isLoading}
                                                    className="text-green-600 hover:text-green-700"
                                                >
                                                    Virkja
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? 'Breyta tegund' : 'Ný tegund'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="key">Lykill (Key) *</Label>
                            <Input
                                id="key"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                placeholder="t.d. foundation"
                                disabled={!!editingType || isLoading}
                            />
                            <p className="text-xs text-zinc-500">
                                Lágstafir og undirstrik. Ekki hægt að breyta eftir að tegund er búin til.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="label_is">Nafn (Icelandic) *</Label>
                            <Input
                                id="label_is"
                                value={formData.label_is}
                                onChange={(e) => setFormData({ ...formData, label_is: e.target.value })}
                                placeholder="t.d. Undirstaða"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="label_en">Name (English) *</Label>
                            <Input
                                id="label_en"
                                value={formData.label_en}
                                onChange={(e) => setFormData({ ...formData, label_en: e.target.value })}
                                placeholder="e.g. Foundation"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sort_order">Röð (Sort Order)</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-zinc-500">
                                Lægri tala birtist fyrst í fellilista.
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                disabled={isLoading}
                            />
                            <Label htmlFor="is_active">Virk (Active)</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={isLoading}
                        >
                            Hætta við
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !formData.key || !formData.label_is || !formData.label_en}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingType ? 'Vista breytingar' : 'Búa til'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
