'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Create new delivery (driver initiates)
 * Creates empty delivery - elements are added later via QR scanning
 */
export async function createDelivery(formData: FormData): Promise<{
  deliveryId: string | null
  error?: string
}> {
  const supabase = await createClient()

  // 1. AUTH CHECK
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { deliveryId: null, error: 'Unauthorized' }
  }

  // 2. ROLE CHECK
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['driver', 'admin'].includes(profile.role)) {
    return { deliveryId: null, error: 'Unauthorized - Driver access required' }
  }

  // 3. EXTRACT & VALIDATE FORM DATA
  const projectId = formData.get('projectId') as string
  const truckRegistration = formData.get('truckRegistration') as string
  const truckDescription = formData.get('truckDescription') as string
  const plannedDate = formData.get('plannedDate') as string

  if (!projectId) {
    return { deliveryId: null, error: 'Project is required' }
  }
  if (!UUID_REGEX.test(projectId)) {
    return { deliveryId: null, error: 'Invalid project ID' }
  }
  if (!truckRegistration || truckRegistration.trim().length === 0) {
    return { deliveryId: null, error: 'Truck registration is required' }
  }
  if (truckRegistration.trim().length > 20) {
    return { deliveryId: null, error: 'Truck registration too long (max 20 characters)' }
  }

  try {
    // 4. VALIDATE PROJECT EXISTS
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Project not found:', projectError)
      return { deliveryId: null, error: 'Invalid project selected' }
    }

    // 5. CREATE DELIVERY
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        project_id: projectId,
        driver_id: user.id,
        truck_registration: truckRegistration.trim().toUpperCase(),
        truck_description: truckDescription?.trim() || null,
        planned_date: plannedDate || new Date().toISOString().split('T')[0],
        status: 'planned',
        created_by: user.id
      } as Database['public']['Tables']['deliveries']['Insert'])
      .select('id')
      .single()

    if (error || !delivery) {
      console.error('Error creating delivery:', error)
      return { deliveryId: null, error: 'Failed to create delivery. Please try again.' }
    }

    // 6. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')

    return { deliveryId: delivery.id }

  } catch (err) {
    console.error('Unexpected error creating delivery:', err)
    return { deliveryId: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Start delivery (truck departs factory)
 * Changes status from 'loading' to 'in_transit'
 */
export async function startDelivery(deliveryId: string): Promise<{
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

    // Check delivery status (must be 'loading')
    if (delivery.status !== 'loading') {
      if (delivery.status === 'planned') {
        return {
          success: false,
          error: 'Cannot depart. No elements loaded yet.'
        }
      }
      if (delivery.status === 'in_transit') {
        return {
          success: false,
          error: 'Delivery already in transit'
        }
      }
      return {
        success: false,
        error: `Cannot start delivery with status: ${delivery.status}`
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

    // 4. CHECK HAS AT LEAST ONE ITEM
    const { count, error: countError } = await supabase
      .from('delivery_items')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_id', deliveryId)

    if (countError) {
      console.error('Error counting delivery items:', countError)
      return { success: false, error: 'Failed to verify delivery items' }
    }

    if (!count || count === 0) {
      return {
        success: false,
        error: 'Cannot depart with empty delivery. Scan at least one element.'
      }
    }

    // 5. UPDATE DELIVERY STATUS
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        status: 'in_transit',
        departed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['deliveries']['Update'])
      .eq('id', deliveryId)

    if (updateError) {
      console.error('Error updating delivery status:', updateError)
      return { success: false, error: 'Failed to start delivery' }
    }

    // 6. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)

    return { success: true }

  } catch (err) {
    console.error('Unexpected error starting delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Mark arrival at site
 * Changes status from 'in_transit' to 'arrived'
 */
export async function arriveAtSite(
  deliveryId: string,
  gpsLat?: number,
  gpsLng?: number
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

    // Check delivery status (must be 'in_transit')
    if (delivery.status !== 'in_transit') {
      if (delivery.status === 'arrived') {
        return {
          success: false,
          error: 'Delivery already marked as arrived'
        }
      }
      return {
        success: false,
        error: `Cannot mark arrival. Current status: ${delivery.status}`
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

    // 4. UPDATE DELIVERY STATUS
    const updateData: Database['public']['Tables']['deliveries']['Update'] = {
      status: 'arrived',
      arrived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Future: Add GPS coordinates if provided
    // if (gpsLat && gpsLng) {
    //   updateData.current_lat = gpsLat
    //   updateData.current_lng = gpsLng
    // }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)

    if (updateError) {
      console.error('Error updating delivery status:', updateError)
      return { success: false, error: 'Failed to mark arrival' }
    }

    // 5. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)

    return { success: true }

  } catch (err) {
    console.error('Unexpected error marking arrival:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Complete delivery with signature and photo
 * Changes status from 'arrived' to 'completed'
 * Requires all elements to be individually confirmed first
 */
export async function completeDelivery(
  deliveryId: string,
  receivedByName: string,
  signatureUrl?: string,
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
  if (!receivedByName || receivedByName.trim().length === 0) {
    return { success: false, error: 'Receiver name is required' }
  }
  if (receivedByName.trim().length > 100) {
    return { success: false, error: 'Receiver name too long (max 100 characters)' }
  }
  if (notes && notes.length > 2000) {
    return { success: false, error: 'Notes too long (max 2000 characters)' }
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

    // Check delivery status (must be 'arrived')
    if (delivery.status !== 'arrived') {
      if (delivery.status === 'completed') {
        return {
          success: false,
          error: 'Delivery already completed'
        }
      }
      if (delivery.status === 'in_transit') {
        return {
          success: false,
          error: 'Must mark arrival at site before completing delivery'
        }
      }
      return {
        success: false,
        error: `Cannot complete delivery. Current status: ${delivery.status}`
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

    // 4. CHECK ALL ITEMS DELIVERED
    const { data: items, error: itemsError } = await supabase
      .from('delivery_items')
      .select('delivered_at')
      .eq('delivery_id', deliveryId)

    if (itemsError) {
      console.error('Error fetching delivery items:', itemsError)
      return { success: false, error: 'Failed to verify delivery items' }
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'Cannot complete empty delivery'
      }
    }

    const totalItems = items.length
    const deliveredItems = items.filter(item => item.delivered_at !== null).length
    const unconfirmedCount = totalItems - deliveredItems

    if (unconfirmedCount > 0) {
      return {
        success: false,
        error: `Please confirm all ${unconfirmedCount} remaining elements before completing delivery`
      }
    }

    // 5. UPDATE DELIVERY
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        received_by_name: receivedByName.trim(),
        received_by_signature_url: signatureUrl || null,
        delivery_photo_url: photoUrl || null,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['deliveries']['Update'])
      .eq('id', deliveryId)

    if (updateError) {
      console.error('Error completing delivery:', updateError)
      return { success: false, error: 'Failed to complete delivery' }
    }

    // 6. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${deliveryId}`)
    revalidatePath('/buyer/deliveries') // Buyer can now see completed delivery

    return { success: true }

  } catch (err) {
    console.error('Unexpected error completing delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
