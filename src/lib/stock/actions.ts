'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TransactionType } from './queries'

interface CreateStockItemData {
    name: string
    sku: string
    category: string
    reorder_level?: number
    supplier_item_id?: string
    location?: string
}

/**
 * Create a new stock item
 */
export async function createStockItem(data: CreateStockItemData) {
    const supabase = await createClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('stock_items')
        .insert(data)

    if (error) {
        console.error('Error creating stock item:', error)
        return { error: error.message }
    }

    revalidatePath('/factory/stock')
    return { success: true }
}

/**
 * Update stock quantity (creates a transaction)
 */
export async function updateStockQuantity(
    itemId: string,
    change: number,
    type: TransactionType,
    notes?: string,
    referenceId?: string
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Start a transaction (Supabase RPC would be better for atomicity, but doing separate calls for simplicity first)
    // 1. Get current quantity
    const { data: item, error: fetchError } = await supabase
        .from('stock_items')
        .select('quantity_on_hand')
        .eq('id', itemId)
        .single()

    if (fetchError || !item) return { error: 'Item not found' }

    // 2. Update item quantity
    const newQuantity = item.quantity_on_hand + change
    const { error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity_on_hand: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', itemId)

    if (updateError) return { error: updateError.message }

    // 3. Log transaction
    const { error: logError } = await supabase
        .from('stock_transactions')
        .insert({
            stock_item_id: itemId,
            quantity_change: change,
            transaction_type: type,
            reference_id: referenceId,
            notes: notes,
            created_by: user.id
        })

    if (logError) console.error('Error logging transaction:', logError)

    revalidatePath('/factory/stock')
    return { success: true }
}

/**
 * Allocate stock to a project
 */
export async function allocateStockToProject(
    projectId: string,
    itemId: string,
    quantity: number
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 1. Create allocation record
    const { error: allocError } = await supabase
        .from('project_allocations')
        .insert({
            project_id: projectId,
            stock_item_id: itemId,
            quantity: quantity,
            status: 'reserved'
        })

    if (allocError) return { error: allocError.message }

    // 2. Deduct from stock (as an allocation transaction)
    const result = await updateStockQuantity(
        itemId,
        -quantity,
        'allocation',
        `Allocated to project ${projectId}`,
        projectId
    )

    if (result.error) return result

    revalidatePath(`/factory/projects/${projectId}`)
    return { success: true }
}
