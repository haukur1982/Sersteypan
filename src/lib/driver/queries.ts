'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get deliveries assigned to the current driver
 */
export async function getDriverDeliveries() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('deliveries')
        .select(`
      id,
      truck_registration,
      truck_description,
      status,
      planned_date,
      loading_started_at,
      departed_at,
      arrived_at,
      completed_at,
      notes,
      created_at,
      project:projects(
        id,
        name,
        address
      ),
      items:delivery_items(
        id,
        element:elements(
          id,
          name
        )
      )
    `)
        .eq('driver_id', user.id)
        .order('planned_date', { ascending: false })

    if (error) {
        console.error('Error fetching driver deliveries:', error)
        return []
    }

    return data
}

/**
 * Get detailed info for a specific delivery
 */
export async function getDriverDeliveryDetail(deliveryId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('deliveries')
        .select(`
      id,
      truck_registration,
      truck_description,
      status,
      planned_date,
      loading_started_at,
      departed_at,
      arrived_at,
      completed_at,
      received_by_name,
      notes,
      project:projects(
        id,
        name,
        address
      ),
      items:delivery_items(
        id,
        load_position,
        element:elements(
          id,
          name,
          element_type,
          drawing_reference
        )
      )
    `)
        .eq('id', deliveryId)
        .single()

    if (error) {
        console.error('Error fetching delivery detail:', error)
        return null
    }

    return data
}
