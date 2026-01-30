'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get all active suppliers
 */
export async function getSuppliers() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, contact_name, contact_email, contact_phone')
        .eq('is_active', true)
        .order('name')

    if (error) {
        console.error('Error fetching suppliers:', error)
        return []
    }

    return data
}

/**
 * Get supplier items for a specific supplier
 */
export async function getSupplierItems(supplierId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('supplier_items')
        .select(`
            id, 
            name, 
            description, 
            unit, 
            unit_price, 
            currency,
            supplier_id,
            suppliers (name)
        `)
        .eq('is_active', true)
        .order('name')

    if (supplierId) {
        query = query.eq('supplier_id', supplierId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching supplier items:', error)
        return []
    }

    return data
}
