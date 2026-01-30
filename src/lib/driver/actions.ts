'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Update delivery status (e.g., departed, arrived, completed)
 */
export async function updateDeliveryStatus(
    deliveryId: string,
    status: 'planned' | 'loading' | 'in_transit' | 'arrived' | 'completed',
    notes?: string
) {
    const supabase = await createClient()

    const updateData: any = {
        status,
        updated_at: new Date().toISOString()
    }

    if (status === 'in_transit') updateData.departed_at = new Date().toISOString()
    if (status === 'arrived') updateData.arrived_at = new Date().toISOString()
    if (status === 'completed') updateData.completed_at = new Date().toISOString()
    if (notes) updateData.notes = notes

    const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)

    if (error) {
        console.error('Error updating delivery status:', error)
        return { error: error.message }
    }

    revalidatePath(`/driver/deliveries/${deliveryId}`)
    revalidatePath('/driver')
    return { success: true }
}

/**
 * Update the main delivery photo URL
 */
export async function updateDeliveryPhoto(deliveryId: string, photoUrl: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('deliveries')
        .update({
            delivery_photo_url: photoUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)

    if (error) {
        console.error('Error updating delivery photo:', error)
        return { error: error.message }
    }

    revalidatePath(`/driver/deliveries/${deliveryId}`)
    return { success: true }
}
