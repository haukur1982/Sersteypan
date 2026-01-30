'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getSuppliers, getSupplierItems } from '@/lib/suppliers/queries'

interface SupplierItemSelectProps {
    value?: string
    onChange: (supplierItemId: string | undefined) => void
}

type Supplier = Awaited<ReturnType<typeof getSuppliers>>[number]
type SupplierItem = Awaited<ReturnType<typeof getSupplierItems>>[number]

export function SupplierItemSelect({ value, onChange }: SupplierItemSelectProps) {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSuppliers() {
            const data = await getSuppliers()
            setSuppliers(data)
            setLoading(false)
        }
        loadSuppliers()
    }, [])

    useEffect(() => {
        async function loadItems() {
            if (selectedSupplierId) {
                const data = await getSupplierItems(selectedSupplierId)
                setSupplierItems(data)
            } else {
                setSupplierItems([])
            }
        }
        loadItems()
    }, [selectedSupplierId])

    const handleSupplierChange = (supplierId: string) => {
        setSelectedSupplierId(supplierId === 'none' ? undefined : supplierId)
        onChange(undefined) // Reset item selection when supplier changes
    }

    const handleItemChange = (itemId: string) => {
        onChange(itemId === 'none' ? undefined : itemId)
    }

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading suppliers...</div>
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Supplier (Optional)</Label>
                <Select
                    value={selectedSupplierId || 'none'}
                    onValueChange={handleSupplierChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No supplier</SelectItem>
                        {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedSupplierId && (
                <div className="space-y-2">
                    <Label>Supplier Item</Label>
                    <Select
                        value={value || 'none'}
                        onValueChange={handleItemChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No specific item</SelectItem>
                            {supplierItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                    {item.unit_price && ` - ${item.unit_price} ${item.currency || 'ISK'}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )
}
