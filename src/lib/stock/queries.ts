'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TransactionType = 'adjustment' | 'production' | 'allocation' | 'return'

/**
 * Get all stock items with current quantity and supplier info
 */
export async function getStockItems() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('stock_items')
        .select(`
            *,
            supplier_item:supplier_items (
                id,
                name,
                supplier:suppliers (id, name)
            )
        `)
        .order('name')

    if (error) {
        console.error('Error fetching stock items:', error)
        return []
    }

    return data
}

/**
 * Get transactions for a specific item
 */
export async function getStockTransactions(itemId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('stock_transactions')
        .select(`
      *,
      created_by:profiles(full_name)
    `)
        .eq('stock_item_id', itemId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching transactions:', error)
        return []
    }

    return data
}

/**
 * Get allocations for a specific project
 */
export async function getProjectAllocations(projectId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('project_allocations')
        .select(`
      *,
      stock_item:stock_items(name, sku, category)
    `)
        .eq('project_id', projectId)

    if (error) {
        console.error('Error fetching project allocations:', error)
        return []
    }

    return data
}
