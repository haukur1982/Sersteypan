'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  type PaginationParams,
  type PaginatedResult,
  calculateRange,
  buildPaginationMeta,
} from '@/lib/utils/pagination'
import {
  validateElementCreate,
  validateElementStatusUpdate,
  isValidStatusTransition,
  formatZodError,
  parseNumber
} from '@/lib/schemas'
import { createNotifications } from '@/lib/notifications/queries'

type ElementRow = Database['public']['Tables']['elements']['Row']

// Parse FormData into an object for validation
function parseElementFormData(formData: FormData) {
  const floorValue = formData.get('floor')
  return {
    name: formData.get('name') as string || '',
    project_id: formData.get('project_id') as string || '',
    element_type: formData.get('element_type') as string || 'other',
    status: formData.get('status') as string || 'planned',
    priority: parseNumber(formData.get('priority')) ?? 0,
    floor: floorValue ? String(floorValue) : undefined,
    position_description: formData.get('position_description') as string || undefined,
    length_mm: parseNumber(formData.get('length_mm')),
    width_mm: parseNumber(formData.get('width_mm')),
    height_mm: parseNumber(formData.get('height_mm')),
    weight_kg: parseNumber(formData.get('weight_kg')),
    drawing_reference: formData.get('drawing_reference') as string || undefined,
    batch_number: formData.get('batch_number') as string || undefined,
    production_notes: formData.get('production_notes') as string || undefined,
  }
}

// Create a new element
export async function createElement(formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized - Admin only' }
  }

  // Parse and validate form data with Zod
  const rawData = parseElementFormData(formData)
  const validation = validateElementCreate(rawData)

  if (!validation.success) {
    const { error, errors } = formatZodError(validation.error)
    return { error, errors }
  }

  const validatedData = validation.data

  // Validate project exists
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', validatedData.project_id)
    .single()

  if (!project) {
    return { error: 'Ógilt verkefni valið' }
  }

  // Prepare element data
  const elementData = {
    project_id: validatedData.project_id,
    building_id: (formData.get('building_id') as string) || null,
    name: validatedData.name,
    element_type: validatedData.element_type,
    drawing_reference: validatedData.drawing_reference || null,
    floor: validatedData.floor || null,
    position_description: validatedData.position_description || null,
    length_mm: validatedData.length_mm || null,
    width_mm: validatedData.width_mm || null,
    height_mm: validatedData.height_mm || null,
    weight_kg: validatedData.weight_kg || null,
    status: validatedData.status,
    priority: validatedData.priority,
    production_notes: validatedData.production_notes || null,
    delivery_notes: (formData.get('delivery_notes') as string)?.trim() || null,
    created_by: user.id
  }

  // Insert into database
  const { error } = await supabase
    .from('elements')
    .insert(elementData)
    .select()
    .single()

  if (error) {
    console.error('Error creating element:', error)
    return { error: 'Villa við að búa til einingu. Reyndu aftur.' }
  }

  // Revalidate the elements list page
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${validatedData.project_id}`)

  // Redirect to project detail page
  redirect(`/admin/projects/${validatedData.project_id}`)
}

// Get all elements for a project
export async function getElementsForProject(projectId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch elements ordered by priority (desc) then name
  const { data, error } = await supabase
    .from('elements')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching elements:', error)
    return { error: 'Failed to fetch elements' }
  }

  return { success: true, data }
}

// Get elements for a project with pagination
export async function getElementsForProjectPaginated(
  projectId: string,
  pagination: PaginationParams,
  filters?: {
    status?: string
    elementType?: string
    search?: string
  }
): Promise<PaginatedResult<ElementRow>> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Not authenticated' }
  }

  // Build base query
  let query = supabase
    .from('elements')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.elementType) {
    query = query.eq('element_type', filters.elementType)
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  // Get total count first
  const { count, error: countError } = await query

  if (countError) {
    console.error('Error counting elements:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Fetch paginated data
  let dataQuery = supabase
    .from('elements')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  // Apply same filters
  if (filters?.status) {
    dataQuery = dataQuery.eq('status', filters.status)
  }
  if (filters?.elementType) {
    dataQuery = dataQuery.eq('element_type', filters.elementType)
  }
  if (filters?.search) {
    dataQuery = dataQuery.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await dataQuery

  if (error) {
    console.error('Error fetching elements:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  return {
    data: data || [],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

// Get a single element by ID
export async function getElement(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('elements')
    .select(`
      *,
      projects (
        id,
        name,
        company_id
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching element:', error)
    return { error: 'Element not found' }
  }

  return { success: true, data }
}

// Update an element
export async function updateElement(id: string, formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized - Admin only' }
  }

  // Get existing element to find project_id
  const { data: existingElement } = await supabase
    .from('elements')
    .select('project_id')
    .eq('id', id)
    .single()

  if (!existingElement) {
    return { error: 'Element not found' }
  }

  // Extract and validate form data
  const name = formData.get('name') as string
  const project_id = formData.get('project_id') as string
  const element_type = formData.get('element_type') as string

  if (!name || !project_id || !element_type) {
    return { error: 'Name, project, and element type are required' }
  }

  // Prepare update data
  const updateData = {
    project_id,
    building_id: (formData.get('building_id') as string) || null,
    name: name.trim(),
    element_type,
    drawing_reference: (formData.get('drawing_reference') as string)?.trim() || null,
    floor: formData.get('floor') ? parseInt(formData.get('floor') as string) : null,
    position_description: (formData.get('position_description') as string)?.trim() || null,
    length_mm: formData.get('length_mm') ? parseInt(formData.get('length_mm') as string) : null,
    width_mm: formData.get('width_mm') ? parseInt(formData.get('width_mm') as string) : null,
    height_mm: formData.get('height_mm') ? parseInt(formData.get('height_mm') as string) : null,
    weight_kg: formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null,
    status: (formData.get('status') as string) || 'planned',
    priority: formData.get('priority') ? parseInt(formData.get('priority') as string) : 0,
    production_notes: (formData.get('production_notes') as string)?.trim() || null,
    delivery_notes: (formData.get('delivery_notes') as string)?.trim() || null,
    updated_at: new Date().toISOString()
  }

  // Update in database
  const { error } = await supabase
    .from('elements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating element:', error)
    return { error: 'Failed to update element. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${existingElement.project_id}`)
  revalidatePath(`/admin/projects/${project_id}`)
  revalidatePath(`/admin/elements/${id}/edit`)

  // Redirect to project detail page
  redirect(`/admin/projects/${project_id}`)
}

// Delete an element
export async function deleteElement(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized - Admin only' }
  }

  // Get element to find project_id for revalidation
  const { data: element } = await supabase
    .from('elements')
    .select('project_id')
    .eq('id', id)
    .single()

  if (!element) {
    return { error: 'Element not found' }
  }

  // Delete the element
  const { error } = await supabase
    .from('elements')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting element:', error)
    return { error: 'Failed to delete element. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${element.project_id}`)

  return { success: true }
}

export async function generateQRCodesForElements(elementIds: string[]) {
  const supabase = await createClient()

  // Get current user and session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { error: 'No valid session' }
  }

  // Check role - admin or factory_manager can generate QR codes
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Unauthorized - Admin or Factory Manager only' }
  }

  if (!elementIds || elementIds.length === 0) {
    return { error: 'No elements provided' }
  }

  // Validate batch size (matches Edge Function limit)
  if (elementIds.length > 50) {
    return { error: 'Maximum 50 elements per request' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { error: 'Missing Supabase configuration' }
  }

  // Use user's access token for authentication (not service role key)
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-qr-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ element_ids: elementIds }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error('QR generation failed:', errorData)
    return { error: errorData.error || 'Failed to generate QR codes' }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}

// Update element status (used by factory managers)
export async function updateElementStatus(id: string, newStatus: string, notes?: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin or factory_manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Unauthorized - Admin or Factory Manager only' }
  }

  // Validate input with Zod
  const validation = validateElementStatusUpdate({
    element_id: id,
    new_status: newStatus,
    notes: notes
  })

  if (!validation.success) {
    const { error } = formatZodError(validation.error)
    return { error }
  }

  // Get element to find project_id, current status, and project info for notifications
  const { data: element } = await supabase
    .from('elements')
    .select('project_id, status, name, project:projects(name, company_id)')
    .eq('id', id)
    .single()

  if (!element) {
    return { error: 'Eining fannst ekki' }
  }

  const currentStatus = element.status || 'planned'

  // Validate status transition (state machine)
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return {
      error: `Ekki er hægt að breyta stöðu úr "${currentStatus}" í "${newStatus}"`
    }
  }

  // Prepare update data
  const updateData: Database['public']['Tables']['elements']['Update'] = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...(notes ? { production_notes: notes } : {})
  }

  // Update status (trigger will handle status timestamp updates and event logging)
  const { error } = await supabase
    .from('elements')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating element status:', error)
    return { error: 'Villa við að uppfæra stöðu. Reyndu aftur.' }
  }

  // Send notifications to relevant users (non-blocking)
  const project = element.project as { name: string; company_id: string | null } | null
  try {
    const notifyTargets: Array<{ userId: string; type: string; title: string; body?: string; link?: string }> = []

    // Notify buyers in the project's company
    if (project?.company_id) {
      const { data: buyers } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', project.company_id)
        .eq('role', 'buyer')
        .eq('is_active', true)

      if (buyers) {
        for (const buyer of buyers) {
          notifyTargets.push({
            userId: buyer.id,
            type: 'element_status',
            title: `${element.name} — staða uppfærð`,
            body: `${project.name}: ${currentStatus} → ${newStatus}`,
            link: `/buyer/projects/${element.project_id}`,
          })
        }
      }
    }

    // Notify admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (admins) {
      for (const admin of admins) {
        notifyTargets.push({
          userId: admin.id,
          type: 'element_status',
          title: `${element.name} — staða uppfærð`,
          body: `${project?.name || 'Verkefni'}: ${currentStatus} → ${newStatus}`,
          link: `/admin/projects/${element.project_id}`,
        })
      }
    }

    if (notifyTargets.length > 0) {
      await createNotifications(notifyTargets)
    }
  } catch (notifyErr) {
    // Don't fail the status update if notifications fail
    console.error('Failed to create notifications:', notifyErr)
  }

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${element.project_id}`)
  revalidatePath('/factory')
  revalidatePath('/factory/production')
  revalidatePath(`/factory/production/${id}`)

  return { success: true }
}

// Get active element types
export async function getElementTypes() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('element_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching element types:', error)
    return { error: 'Failed to fetch element types' }
  }

  return { success: true, data }
}

