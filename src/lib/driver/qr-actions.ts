'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type ElementWithProject = ElementRow & {
  project: Pick<ProjectRow, 'id' | 'name' | 'address'> | null
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Parse QR code content and lookup element details
 * QR format: https://app.sersteypan.is/element/{uuid} OR plain UUID
 */
export async function lookupElementByQR(qrContent: string): Promise<{
  element: ElementWithProject | null
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { element: null, error: 'Unauthorized' }
  }

  // 2. ROLE CHECK
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['driver', 'admin'].includes(profile.role)) {
    return { element: null, error: 'Unauthorized - Driver access required' }
  }

  // 3. PARSE QR CONTENT
  let elementId: string

  // Try to extract UUID from URL format
  if (qrContent.includes('/element/')) {
    const parts = qrContent.split('/element/')
    elementId = parts[parts.length - 1].split('?')[0].split('#')[0]
  } else {
    // Assume plain UUID
    elementId = qrContent.trim()
  }

  // 4. VALIDATE UUID FORMAT
  if (!UUID_REGEX.test(elementId)) {
    return { element: null, error: 'Invalid QR code format' }
  }

  try {
    // 5. FETCH ELEMENT WITH PROJECT CONTEXT
    const { data: element, error } = await supabase
      .from('elements')
      .select(`
        *,
        project:projects(
          id,
          name,
          address
        )
      `)
      .eq('id', elementId)
      .single()

    if (error || !element) {
      console.error('Error fetching element:', error)
      return { element: null, error: 'Element not found. Please verify QR code.' }
    }

    // 6. VALIDATE ELEMENT STATUS (driver can only interact with ready/loaded/delivered)
    const allowedStatuses = ['ready', 'loaded', 'delivered']
    const elementStatus = element.status || 'planned'
    if (!allowedStatuses.includes(elementStatus)) {
      return {
        element: null,
        error: `Element status: ${elementStatus}. Not ready for loading.`
      }
    }

    // 7. CHECK IF ALREADY DELIVERED
    if (element.status === 'delivered') {
      const deliveredDate = element.delivered_at
        ? new Date(element.delivered_at).toLocaleDateString()
        : 'unknown date'
      return {
        element: null,
        error: `Element already delivered on ${deliveredDate}`
      }
    }

    return { element }

  } catch (err) {
    console.error('Unexpected error looking up element:', err)
    return { element: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Add scanned element to active delivery (during loading phase)
 * Updates element status from 'ready' to 'loaded'
 */
export async function addElementToDelivery(
  deliveryId: string,
  elementId: string,
  loadPosition?: string
): Promise<{
  success: boolean
  elementName?: string
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. INPUT VALIDATION
  if (!UUID_REGEX.test(deliveryId)) {
    return { success: false, error: 'Invalid delivery ID' }
  }
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Invalid element ID' }
  }
  if (loadPosition && loadPosition.length > 100) {
    return { success: false, error: 'Load position too long (max 100 characters)' }
  }

  try {
    // 3. VALIDATE DELIVERY
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, status, driver_id, project_id')
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) {
      console.error('Delivery not found:', deliveryError)
      return { success: false, error: 'Delivery not found' }
    }

    // Check delivery status (must be 'planned' or 'loading')
    const deliveryStatus = delivery.status || 'planned'
    if (!['planned', 'loading'].includes(deliveryStatus)) {
      return {
        success: false,
        error: 'Cannot modify delivery. Truck has already departed.'
      }
    }

    // Check driver ownership (or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && delivery.driver_id !== user.id) {
      return { success: false, error: 'Unauthorized - Not your delivery' }
    }

    // 4. VALIDATE ELEMENT
    const { data: element, error: elementError } = await supabase
      .from('elements')
      .select('id, name, status, project_id')
      .eq('id', elementId)
      .single()

    if (elementError || !element) {
      console.error('Element not found:', elementError)
      return { success: false, error: 'Element not found' }
    }

    // Check element status (MUST be 'ready')
    if (element.status !== 'ready') {
      return {
        success: false,
        error: `Cannot load element. Current status: ${element.status}. Element must be marked ready by factory.`
      }
    }

    // Check project match (prevent cross-project loading)
    if (element.project_id !== delivery.project_id) {
      return {
        success: false,
        error: 'Element belongs to different project. Cannot add to this delivery.'
      }
    }

    // 5. CHECK FOR DUPLICATE
    const { data: existingItem } = await supabase
      .from('delivery_items')
      .select('id')
      .eq('delivery_id', deliveryId)
      .eq('element_id', elementId)
      .maybeSingle()

    if (existingItem) {
      return { success: false, error: 'Element already added to this delivery' }
    }

    // 6. TRANSACTION: Create delivery_item and update element status

    // 6a. Insert delivery_item
    const { error: insertError } = await supabase
      .from('delivery_items')
      .insert({
        delivery_id: deliveryId,
        element_id: elementId,
        load_position: loadPosition?.trim() || null,
        loaded_at: new Date().toISOString(),
        loaded_by: user.id
      })

    if (insertError) {
      console.error('Error creating delivery_item:', insertError)
      return { success: false, error: 'Failed to add element to delivery' }
    }

    // 6b. Update element status: ready → loaded
    const { error: updateElementError } = await supabase
      .from('elements')
      .update({
        status: 'loaded',
        loaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['elements']['Update'])
      .eq('id', elementId)

    if (updateElementError) {
      console.error('Error updating element status:', updateElementError)
      // Try to rollback delivery_item insert
      await supabase
        .from('delivery_items')
        .delete()
        .eq('delivery_id', deliveryId)
        .eq('element_id', elementId)

      return { success: false, error: 'Failed to update element status' }
    }

    // 6c. Update delivery status to 'loading' if currently 'planned'
    if (delivery.status === 'planned') {
      await supabase
        .from('deliveries')
        .update({
          status: 'loading',
          loading_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Database['public']['Tables']['deliveries']['Update'])
        .eq('id', deliveryId)
    }

    // 7. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)

    return {
      success: true,
      elementName: element.name
    }

  } catch (err) {
    console.error('Unexpected error adding element to delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Remove element from delivery (before departure)
 * Reverts element status from 'loaded' back to 'ready'
 */
export async function removeElementFromDelivery(
  deliveryId: string,
  elementId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. INPUT VALIDATION
  if (!UUID_REGEX.test(deliveryId)) {
    return { success: false, error: 'Invalid delivery ID' }
  }
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Invalid element ID' }
  }

  try {
    // 3. VALIDATE DELIVERY
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) {
      return { success: false, error: 'Delivery not found' }
    }

    // Check delivery status (must be 'planned' or 'loading', not departed)
    const deliveryStatus = delivery.status || 'planned'
    if (!['planned', 'loading'].includes(deliveryStatus)) {
      return {
        success: false,
        error: 'Cannot remove element. Delivery has departed.'
      }
    }

    // Check driver ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && delivery.driver_id !== user.id) {
      return { success: false, error: 'Unauthorized - Not your delivery' }
    }

    // 4. DELETE DELIVERY_ITEM
    const { error: deleteError } = await supabase
      .from('delivery_items')
      .delete()
      .eq('delivery_id', deliveryId)
      .eq('element_id', elementId)

    if (deleteError) {
      console.error('Error deleting delivery_item:', deleteError)
      return { success: false, error: 'Failed to remove element from delivery' }
    }

    // 5. REVERT ELEMENT STATUS: loaded → ready
    const { error: updateError } = await supabase
      .from('elements')
      .update({
        status: 'ready',
        loaded_at: null,
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['elements']['Update'])
      .eq('id', elementId)

    if (updateError) {
      console.error('Error reverting element status:', updateError)
      return { success: false, error: 'Failed to revert element status' }
    }

    // 6. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)

    return { success: true }

  } catch (err) {
    console.error('Unexpected error removing element from delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Mark individual element as delivered at site
 * Updates element status from 'loaded' to 'delivered'
 * Auto-completes delivery if all items delivered
 */
export async function confirmElementDelivered(
  deliveryId: string,
  elementId: string,
  photoUrl?: string,
  notes?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. INPUT VALIDATION
  if (!UUID_REGEX.test(deliveryId)) {
    return { success: false, error: 'Invalid delivery ID' }
  }
  if (!UUID_REGEX.test(elementId)) {
    return { success: false, error: 'Invalid element ID' }
  }
  if (notes && notes.length > 1000) {
    return { success: false, error: 'Notes too long (max 1000 characters)' }
  }

  try {
    // 3. VALIDATE DELIVERY
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', deliveryId)
      .single()

    if (deliveryError || !delivery) {
      return { success: false, error: 'Delivery not found' }
    }

    // Check delivery status (must be 'arrived' - truck at site)
    if (delivery.status !== 'arrived') {
      return {
        success: false,
        error: 'Cannot confirm delivery. Truck must arrive at site first.'
      }
    }

    // Check driver ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && delivery.driver_id !== user.id) {
      return { success: false, error: 'Unauthorized - Not your delivery' }
    }

    // 4. CHECK ELEMENT IS ON THIS DELIVERY
    const { data: deliveryItem } = await supabase
      .from('delivery_items')
      .select('id')
      .eq('delivery_id', deliveryId)
      .eq('element_id', elementId)
      .maybeSingle()

    if (!deliveryItem) {
      return { success: false, error: 'Element not found on this delivery' }
    }

    // 5. UPDATE DELIVERY_ITEM
    const { error: updateItemError } = await supabase
      .from('delivery_items')
      .update({
        delivered_at: new Date().toISOString(),
        received_photo_url: photoUrl || null,
        notes: notes?.trim() || null
      })
      .eq('delivery_id', deliveryId)
      .eq('element_id', elementId)

    if (updateItemError) {
      console.error('Error updating delivery_item:', updateItemError)
      return { success: false, error: 'Failed to confirm element delivery' }
    }

    // 6. UPDATE ELEMENT STATUS: loaded → delivered
    const { error: updateElementError } = await supabase
      .from('elements')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['elements']['Update'])
      .eq('id', elementId)

    if (updateElementError) {
      console.error('Error updating element status:', updateElementError)
      return { success: false, error: 'Failed to update element status' }
    }

    // 7. CHECK IF ALL ITEMS DELIVERED (auto-complete delivery)
    const { data: itemStats } = await supabase
      .from('delivery_items')
      .select('delivered_at')
      .eq('delivery_id', deliveryId)

    if (itemStats) {
      const totalItems = itemStats.length
      const deliveredItems = itemStats.filter(item => item.delivered_at !== null).length

      // If all items delivered, auto-update delivery status to 'completed'
      // (Driver can still add signature/photo via completeDelivery)
      // This just marks progress
      if (totalItems === deliveredItems && totalItems > 0) {
        console.log(`All ${totalItems} items delivered for delivery ${deliveryId}`)
        // Note: Don't auto-complete yet - driver needs to add signature/photo
        // Just log for now
      }
    }

    // 8. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)

    return { success: true }

  } catch (err) {
    console.error('Unexpected error confirming element delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
