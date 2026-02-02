'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateDeliveryQuickComplete, formatZodError } from '@/lib/schemas'

/**
 * Simplified delivery completion for driver portal
 * Handles the case where we need to complete a delivery that may not have
 * gone through all workflow steps (arrived, individual element confirmations)
 * 
 * This is a pragmatic function that:
 * 1. Updates delivery to completed
 * 2. Updates all elements to delivered
 * 3. Works regardless of current delivery status
 */
export async function quickCompleteDelivery(
    deliveryId: string,
    receivedByName: string,
    signatureUrl?: string,
    photoUrl?: string
): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Óheimilt' }
    }

    // Validate input with Zod
    const validation = validateDeliveryQuickComplete({
        deliveryId,
        receivedByName,
        signatureUrl,
        photoUrl
    })

    if (!validation.success) {
        const { error } = formatZodError(validation.error)
        return { success: false, error }
    }

    const validatedData = validation.data

    try {
        // Get delivery and verify ownership
        const { data: delivery, error: deliveryError } = await supabase
            .from('deliveries')
            .select('id, driver_id, status')
            .eq('id', validatedData.deliveryId)
            .single()

        if (deliveryError || !delivery) {
            return { success: false, error: 'Afhending fannst ekki' }
        }

        // Check driver or admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin' && delivery.driver_id !== user.id) {
            return { success: false, error: 'Óheimilt - Ekki þín afhending' }
        }

        if (delivery.status === 'completed') {
            return { success: false, error: 'Afhending þegar staðfest' }
        }

        // Update delivery to completed
        const { error: updateError } = await supabase
            .from('deliveries')
            .update({
                status: 'completed',
                received_by_name: validatedData.receivedByName,
                received_by_signature_url: validatedData.signatureUrl || null,
                delivery_photo_url: validatedData.photoUrl || null,
                completed_at: new Date().toISOString(),
                delivered_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', validatedData.deliveryId)

        if (updateError) {
            console.error('Error completing delivery:', updateError)
            return { success: false, error: 'Gat ekki staðfest afhendingu' }
        }

        // Get all delivery items
        const { data: items } = await supabase
            .from('delivery_items')
            .select('element_id')
            .eq('delivery_id', validatedData.deliveryId)

        if (items && items.length > 0) {
            const elementIds = items.map(i => i.element_id).filter(Boolean)

            // Update all elements to delivered
            if (elementIds.length > 0) {
                const { error: elementsError } = await supabase
                    .from('elements')
                    .update({
                        status: 'delivered',
                        delivered_at: new Date().toISOString()
                    })
                    .in('id', elementIds)

                if (elementsError) {
                    console.error('Error updating elements:', elementsError)
                    // Don't fail - delivery was completed
                }

                // Update delivery_items with delivered_at
                await supabase
                    .from('delivery_items')
                    .update({ delivered_at: new Date().toISOString() })
                    .eq('delivery_id', validatedData.deliveryId)
            }
        }

        // Revalidate paths
        revalidatePath('/driver')
        revalidatePath('/driver/deliveries')
        revalidatePath(`/driver/deliver/${validatedData.deliveryId}`)
        revalidatePath('/buyer/deliveries')

        return { success: true }

    } catch (err) {
        console.error('Unexpected error:', err)
        return { success: false, error: 'Óvænt villa kom upp' }
    }
}
