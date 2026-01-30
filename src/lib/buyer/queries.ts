import { createClient } from '@/lib/supabase/server'

const DOCUMENTS_BUCKET = 'project-documents'

function parseStoragePath(fileUrl: string): { bucket: string; path: string } {
  if (fileUrl.startsWith('http')) {
    const match = fileUrl.match(/\/storage\/v1\/object\/(?:public\/)?([^/]+)\/(.+)$/)
    if (match) {
      return { bucket: match[1], path: match[2] }
    }
  }

  return { bucket: DOCUMENTS_BUCKET, path: fileUrl }
}

/**
 * Status breakdown type for project elements
 */
type StatusBreakdown = {
  planned: number
  rebar: number
  cast: number
  curing: number
  ready: number
  loaded: number
  delivered: number
  issue: number
}

/**
 * Get all projects for the current buyer's company
 * RLS automatically filters to buyer's company
 */
export async function getBuyerProjects() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      address,
      status,
      start_date,
      expected_end_date,
      created_at,
      company:companies(
        id,
        name
      ),
      elements:elements(
        id,
        status
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching buyer projects:', error)
    throw new Error('Failed to fetch projects')
  }

  // Calculate status breakdown for each project
  return data.map(project => {
    const elements = project.elements || []
    const statusBreakdown = calculateStatusBreakdown(
      elements.map(e => ({ status: e.status || 'planned' }))
    )

    return {
      ...project,
      elementCount: elements.length,
      statusBreakdown
    }
  })
}

/**
 * Get detailed information for a specific project
 * Includes all related data: elements, documents, messages
 */
export async function getProjectDetail(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      address,
      status,
      start_date,
      expected_end_date,
      notes,
      created_at,
      updated_at,
      company:companies(
        id,
        name,
        contact_name,
        contact_phone
      ),
      buildings:buildings(
        id,
        name,
        floors,
        notes
      ),
      elements:elements(
        id,
        name,
        element_type,
        drawing_reference,
        batch_number,
        floor,
        position_description,
        status,
        priority,
        rebar_completed_at,
        cast_at,
        curing_completed_at,
        ready_at,
        loaded_at,
        delivered_at,
        production_notes,
        delivery_notes,
        created_at,
        photos:element_photos(
          id,
          stage,
          photo_url,
          caption,
          taken_at
        ),
        events:element_events(
          id,
          status,
          previous_status,
          notes,
          created_at,
          created_by:profiles(
            id,
            full_name
          )
        ),
        priority_requests:priority_requests(
          id,
          requested_priority,
          reason,
          status,
          reviewed_by,
          reviewed_at,
          final_priority,
          review_notes,
          created_at,
          requested_by:profiles!priority_requests_requested_by_fkey(
            id,
            full_name
          )
        )
      ),
      documents:project_documents(
        id,
        name,
        description,
        file_url,
        file_type,
        file_size_bytes,
        created_at
      ),
      messages:project_messages(
        id,
        message,
        is_read,
        created_at,
        user:profiles(
          id,
          full_name,
          role
        )
      )
    `)
    .eq('id', projectId)
    .single()

  if (error || !data) {
    console.error('Error fetching project detail:', error)
    return null
  }

  if (data.documents && data.documents.length > 0) {
    const signedDocuments = await Promise.all(
      data.documents.map(async (doc) => {
        const { bucket, path } = parseStoragePath(doc.file_url)
        const { data: signed, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60)

        if (!signError && signed?.signedUrl) {
          return { ...doc, file_url: signed.signedUrl }
        }

        return doc
      })
    )

    return { ...data, documents: signedDocuments }
  }

  return data
}

/**
 * Get all deliveries for projects the buyer has access to
 * RLS automatically filters based on buyer's company
 */
export async function getBuyerDeliveries() {
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
      notes,
      created_at,
      project:projects(
        id,
        name,
        address
      ),
      driver:profiles!deliveries_driver_id_fkey(
        id,
        full_name,
        phone
      ),
      items:delivery_items(
        id,
        loaded_at,
        delivered_at,
        element:elements(
          id,
          name,
          element_type
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching deliveries:', error)
    throw new Error('Failed to fetch deliveries')
  }

  return data || []
}

/**
 * Get detailed information for a specific delivery
 */
export async function getDeliveryDetail(deliveryId: string) {
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
      received_by_signature_url,
      delivery_photo_url,
      notes,
      created_at,
      updated_at,
      project:projects(
        id,
        name,
        address
      ),
      driver:profiles!deliveries_driver_id_fkey(
        id,
        full_name,
        phone
      ),
      items:delivery_items(
        id,
        loaded_at,
        delivered_at,
        load_position,
        received_photo_url,
        notes,
        element:elements(
          id,
          name,
          element_type,
          drawing_reference,
          status,
          photos:element_photos(
            id,
            stage,
            photo_url,
            caption,
            taken_at
          )
        )
      )
    `)
    .eq('id', deliveryId)
    .single()

  if (error || !data) {
    console.error('Error fetching delivery detail:', error)
    return null
  }

  return data
}

/**
 * Get all messages for the buyer's projects
 */
export async function getBuyerMessages() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_messages')
    .select(`
      id,
      project_id,
      message,
      is_read,
      created_at,
      user:profiles(
        id,
        full_name,
        role
      ),
      project:projects(
        id,
        name,
        company:companies(
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching buyer messages:', error)
    throw new Error('Failed to fetch messages')
  }

  return data || []
}

/**
 * Calculate status breakdown from array of elements
 */
function calculateStatusBreakdown(elements: Array<{ status: string }>): StatusBreakdown {
  const breakdown: StatusBreakdown = {
    planned: 0,
    rebar: 0,
    cast: 0,
    curing: 0,
    ready: 0,
    loaded: 0,
    delivered: 0,
    issue: 0
  }

  elements.forEach(el => {
    const status = el.status as keyof StatusBreakdown
    if (status in breakdown) {
      breakdown[status]++
    }
  })

  return breakdown
}
