'use client'

import { useState, useTransition } from 'react'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { allocateStockToProject } from '@/lib/stock/actions'
import { Loader2 } from 'lucide-react'

type StockItem = Database['public']['Tables']['stock_items']['Row']

interface StockAllocationFormProps {
    projectId: string
    stockItems: StockItem[]
    onSuccess?: () => void
}

export function StockAllocationForm({ projectId, stockItems, onSuccess }: StockAllocationFormProps) {
    const [isPending, startTransition] = useTransition()
    const [selectedItemId, setSelectedItemId] = useState('')
    const [quantity, setQuantity] = useState(1)

    const selectedItem = stockItems.find(i => i.id === selectedItemId)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedItemId || quantity <= 0) return

        startTransition(async () => {
            const result = await allocateStockToProject(projectId, selectedItemId, quantity)
            if (result && 'error' in result && result.error) {
                alert(result.error)
            } else {
                setQuantity(1)
                onSuccess?.()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Select Item</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select stock item to allocate" />
                    </SelectTrigger>
                    <SelectContent>
                        {stockItems.map(item => (
                            <SelectItem key={item.id} value={item.id} disabled={item.quantity_on_hand <= 0}>
                                {item.name} ({item.quantity_on_hand} available)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                    type="number"
                    min="1"
                    max={selectedItem?.quantity_on_hand || 9999}
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                />
                {selectedItem && (
                    <p className="text-xs text-zinc-500">
                        Max available: {selectedItem.quantity_on_hand}
                    </p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !selectedItemId}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Allocate Stock'}
            </Button>
        </form>
    )
}
