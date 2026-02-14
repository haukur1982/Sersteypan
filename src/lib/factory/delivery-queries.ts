import { createClient } from '@/lib/supabase/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DeliveryItemElement = {
  id: string
  name: string
  element_type: string | null
  status: string | null
  weight_kg: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
}

export type DeliveryItem = {
  id: string
  element_id: string
  loaded_at: string | null
  delivered_at: string | null
  load_position: string | null
  notes: string | null
  received_photo_url: string | null
  element: DeliveryItemElement | null
}

export type OpenDefect = {
  id: string
  issue_description: string
  priority: string | null
  status: string | null
  category: string | null
  created_at: string | null
}

export type FactoryDeliveryDetail = {
  id: string
  status: string | null
  planned_date: string | null
  truck_registration: string | null
  truck_description: string | null
  notes: string | null
  loading_started_at: string | null
  departed_at: string | null
  arrived_at: string | null
  completed_at: string | null
  delivery_photo_url: string | null
  received_by_name: string | null
  received_by_signature_url: string | null
  created_at: string | null
  project: {
    id: string
    name: string
    address: string | null
    company: { name: string } | null
  } | null
  driver: {
    id: string
    full_name: string | null
    phone: string | null
  } | null
  delivery_items: DeliveryItem[]
  element_defects: Record<string, OpenDefect[]>
}

/**
 * Get detailed delivery information for the factory delivery detail page.
 * Includes delivery items with element data, driver/project info, and
 * open defects (fix_in_factory) for each loaded element.
 */
export async function getFactoryDeliveryDetail(
  deliveryId: string
): Promise<FactoryDeliveryDetail | null> {
  if (!UUID_REGEX.test(deliveryId)) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      id, status, planned_date, truck_registration, truck_description,
      notes, loading_started_at, departed_at, arrived_at, completed_at,
      delivery_photo_url, received_by_name, received_by_signature_url, created_at,
      project:projects (
        id, name, address,
        company:companies ( name )
      ),
      driver:profiles!deliveries_driver_id_fkey (
        id, full_name, phone
      ),
      delivery_items (
        id, element_id, loaded_at, delivered_at, load_position, notes, received_photo_url,
        element:elements (
          id, name, element_type, status, weight_kg, length_mm, width_mm, height_mm
        )
      )
    `)
    .eq('id', deliveryId)
    .single()

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "The result contains 0 rows" (not found, not an error to log)
      console.error('Error fetching factory delivery detail:', error)
    }
    return null
  }

  // Collect element IDs from delivery items to query open defects
  const elementIds = data.delivery_items
    .map((item: { element_id: string }) => item.element_id)
    .filter(Boolean)

  const elementDefects: Record<string, OpenDefect[]> = {}

  if (elementIds.length > 0) {
    const { data: defects, error: defectsError } = await supabase
      .from('fix_in_factory')
      .select('id, element_id, issue_description, priority, status, category, created_at')
      .in('element_id', elementIds)
      .in('status', ['pending', 'in_progress'])

    if (defectsError) {
      console.error('Error fetching element defects:', defectsError)
    } else if (defects) {
      for (const defect of defects) {
        const eid = defect.element_id
        if (!eid) continue
        if (!elementDefects[eid]) {
          elementDefects[eid] = []
        }
        elementDefects[eid].push({
          id: defect.id,
          issue_description: defect.issue_description,
          priority: defect.priority,
          status: defect.status,
          category: defect.category,
          created_at: defect.created_at,
        })
      }
    }
  }

  return {
    ...data,
    project: data.project as FactoryDeliveryDetail['project'],
    driver: data.driver as FactoryDeliveryDetail['driver'],
    delivery_items: data.delivery_items as DeliveryItem[],
    element_defects: elementDefects,
  }
}
