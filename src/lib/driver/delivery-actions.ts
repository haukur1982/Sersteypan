'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import {
  validateDeliveryCreate,
  validateDeliveryComplete,
  formatZodError
} from '@/lib/schemas'

// UUID validation regex (kept for simple ID validation in other functions)
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

  // 3. EXTRACT & VALIDATE FORM DATA WITH ZOD
  const rawData = {
    projectId: formData.get('projectId') as string,
    truckRegistration: formData.get('truckRegistration') as string,
    truckDescription: formData.get('truckDescription') as string,
    plannedDate: formData.get('plannedDate') as string
  }

  const validation = validateDeliveryCreate(rawData)
  if (!validation.success) {
    const { error } = formatZodError(validation.error)
    return { deliveryId: null, error }
  }

  const { projectId, truckRegistration, truckDescription, plannedDate } = validation.data

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
        truck_registration: truckRegistration, // Already uppercased by Zod
        truck_description: truckDescription || null,
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
  void gpsLat
  void gpsLng

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

  // 2. INPUT VALIDATION WITH ZOD
  const validation = validateDeliveryComplete({
    deliveryId,
    receivedByName,
    signatureUrl,
    photoUrl,
    notes
  })

  if (!validation.success) {
    const { error } = formatZodError(validation.error)
    return { success: false, error }
  }

  const validatedData = validation.data

  try {
    // 3. VALIDATE DELIVERY
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', validatedData.deliveryId)
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
      .eq('delivery_id', validatedData.deliveryId)

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
        received_by_name: validatedData.receivedByName,
        received_by_signature_url: validatedData.signatureUrl || null,
        delivery_photo_url: validatedData.photoUrl || null,
        notes: validatedData.notes || null,
        updated_at: new Date().toISOString()
      } as Database['public']['Tables']['deliveries']['Update'])
      .eq('id', validatedData.deliveryId)

    if (updateError) {
      console.error('Error completing delivery:', updateError)
      return { success: false, error: 'Failed to complete delivery' }
    }

    // 6. REVALIDATE PATHS
    revalidatePath('/driver')
    revalidatePath('/driver/deliveries')
    revalidatePath(`/driver/deliveries/${validatedData.deliveryId}`)
    revalidatePath('/buyer/deliveries') // Buyer can now see completed delivery

    return { success: true }

  } catch (err) {
    console.error('Unexpected error completing delivery:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
