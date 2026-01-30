'use client'

import { useState, useTransition } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Box, MapPin, Building2 } from 'lucide-react'
import { updateStockQuantity, createStockItem } from '@/lib/stock/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SupplierItemSelect } from './SupplierItemSelect'

type StockItem = {
    id: string
    name: string
    sku: string
    category: string | null
    quantity_on_hand: number
    reorder_level: number | null
    location: string | null
    supplier_item_id: string | null
    supplier_item: {
        id: string
        name: string
        supplier: { id: string; name: string } | null
    } | null
}

interface StockListProps {
    items: StockItem[]
}

export function StockList({ items }: StockListProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // Create Item State
    const [isCreating, setIsCreating] = useState(false)
    const [newItemName, setNewItemName] = useState('')
    const [newItemSku, setNewItemSku] = useState('')
    const [newItemCategory, setNewItemCategory] = useState('')
    const [newItemLocation, setNewItemLocation] = useState('')
    const [newSupplierItemId, setNewSupplierItemId] = useState<string | undefined>()

    const handleAdjustQuantity = (item: StockItem, change: number) => {
        if (confirm(`Ertu viss um að þú viljir ${change > 0 ? 'bæta við' : 'fjarlægja'} ${Math.abs(change)} einingar?`)) {
            startTransition(async () => {
                await updateStockQuantity(item.id, change, 'adjustment', 'Handvirk leiðrétting')
            })
        }
    }

    const handleCreateItem = async () => {
        if (!newItemName || !newItemSku) return
        setError(null)

        startTransition(async () => {
            const result = await createStockItem({
                name: newItemName,
                sku: newItemSku,
                category: newItemCategory,
                location: newItemLocation || undefined,
                supplier_item_id: newSupplierItemId
            })

            if (result.error) {
                setError(result.error)
                return
            }

            setIsCreating(false)
            setNewItemName('')
            setNewItemSku('')
            setNewItemCategory('')
            setNewItemLocation('')
            setNewSupplierItemId(undefined)
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Lagerstaða</h2>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Skrá nýja vöru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Skrá nýja vöru á lager</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Vöruheiti (Name) *</Label>
                                <Input
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    placeholder="t.d. Veggeining A"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vörunúmer (SKU) *</Label>
                                <Input
                                    value={newItemSku}
                                    onChange={e => setNewItemSku(e.target.value)}
                                    placeholder="t.d. VEGG-001"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Flokkur</Label>
                                    <Input
                                        value={newItemCategory}
                                        onChange={e => setNewItemCategory(e.target.value)}
                                        placeholder="t.d. Steypa"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Staðsetning</Label>
                                    <Input
                                        value={newItemLocation}
                                        onChange={e => setNewItemLocation(e.target.value)}
                                        placeholder="t.d. Hillubil A"
                                    />
                                </div>
                            </div>

                            <SupplierItemSelect
                                value={newSupplierItemId}
                                onChange={setNewSupplierItemId}
                            />

                            <Button
                                onClick={handleCreateItem}
                                className="w-full"
                                disabled={isPending || !newItemName || !newItemSku}
                            >
                                {isPending ? 'Skráir...' : 'Skrá vöru'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Vörunúmer</TableHead>
                            <TableHead>Heiti</TableHead>
                            <TableHead>Flokkur</TableHead>
                            <TableHead>Staðsetning</TableHead>
                            <TableHead>Birgir</TableHead>
                            <TableHead className="text-right">Magn</TableHead>
                            <TableHead className="text-right">Aðgerðir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.category || '-'}</TableCell>
                                <TableCell>
                                    {item.location ? (
                                        <span className="inline-flex items-center gap-1 text-sm">
                                            <MapPin className="w-3 h-3 text-muted-foreground" />
                                            {item.location}
                                        </span>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>
                                    {item.supplier_item?.supplier ? (
                                        <span className="inline-flex items-center gap-1 text-sm">
                                            <Building2 className="w-3 h-3 text-muted-foreground" />
                                            {item.supplier_item.supplier.name}
                                        </span>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity_on_hand <= (item.reorder_level || 0)
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {item.quantity_on_hand}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAdjustQuantity(item, 1)}
                                        disabled={isPending}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAdjustQuantity(item, -1)}
                                        disabled={isPending || item.quantity_on_hand <= 0}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    <Box className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    Engar vörur fundust. Skráðu nýja vöru til að byrja.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
