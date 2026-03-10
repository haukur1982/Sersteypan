'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
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
import { createNotificationsFiltered } from '@/lib/notifications/queries'

type ElementRow = Database['public']['Tables']['elements']['Row']

export interface ChecklistItem {
  key: string
  label: string
  checked: boolean
  checked_by: string | null
  checked_at: string | null
}

const DEFAULT_ELEMENT_CHECKLIST: ChecklistItem[] = [
  { key: 'dimensions', label: 'Mál staðfest', checked: false, checked_by: null, checked_at: null },
  { key: 'mold_oiled', label: 'Mót olíuborið', checked: false, checked_by: null, checked_at: null },
  { key: 'rebar', label: 'Járnabinding staðfest', checked: false, checked_by: null, checked_at: null },
  { key: 'plumbing', label: 'Raflagnir/pípulagnir staðsettar', checked: false, checked_by: null, checked_at: null },
  { key: 'photos', label: 'Myndir hlaðnar upp', checked: false, checked_by: null, checked_at: null },
  { key: 'concrete_cover', label: 'Steypuhula yfir stáli', checked: false, checked_by: null, checked_at: null },
  { key: 'concrete_truck', label: 'Steypubíll C35 / ½ flot 70-75 á mæli', checked: false, checked_by: null, checked_at: null },
]

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
    rebar_spec: formData.get('rebar_spec') as string || undefined,
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
    rebar_spec: validatedData.rebar_spec || null,
    floor: validatedData.floor || null,
    position_description: validatedData.position_description || null,
    length_mm: validatedData.length_mm || null,
    width_mm: validatedData.width_mm || null,
    height_mm: validatedData.height_mm || null,
    weight_kg: validatedData.weight_kg || null,
    status: validatedData.status,
    priority: validatedData.priority,
    production_notes: validatedData.production_notes || null,
    batch_number: validatedData.batch_number || null,
    delivery_notes: (formData.get('delivery_notes') as string)?.trim() || null,
    created_by: user.id
  }

  // Insert into database
  const { data: newElement, error } = await supabase
    .from('elements')
    .insert(elementData)
    .select('id')
    .single()

  if (error) {
    console.error('Error creating element:', error)
    return { error: 'Villa við að búa til einingu. Reyndu aftur.' }
  }

  // Auto-generate QR code after response is sent (serverless-safe via after())
  if (newElement?.id) {
    const elementId = newElement.id
    after(async () => {
      try {
        await generateQRCodesForElements([elementId])
      } catch (err) {
        console.error('Auto QR generation failed for element:', elementId, err)
      }
    })
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
    .order('name_sort_key', { ascending: true })

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
    .order('name_sort_key', { ascending: true })
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
    rebar_spec: (formData.get('rebar_spec') as string)?.trim() || null,
    floor: formData.get('floor') ? parseInt(formData.get('floor') as string) : null,
    position_description: (formData.get('position_description') as string)?.trim() || null,
    length_mm: formData.get('length_mm') ? parseInt(formData.get('length_mm') as string) : null,
    width_mm: formData.get('width_mm') ? parseInt(formData.get('width_mm') as string) : null,
    height_mm: formData.get('height_mm') ? parseInt(formData.get('height_mm') as string) : null,
    weight_kg: formData.get('weight_kg') ? parseFloat(formData.get('weight_kg') as string) : null,
    status: (formData.get('status') as string) || 'planned',
    priority: formData.get('priority') ? parseInt(formData.get('priority') as string) : 0,
    production_notes: (formData.get('production_notes') as string)?.trim() || null,
    batch_number: (formData.get('batch_number') as string)?.trim() || null,
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

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
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

  if (elementIds.length > 50) {
    return { error: 'Maximum 50 elements per request' }
  }

  // Use service role client for storage uploads (bypasses RLS)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase configuration' }
  }
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // Verify all elements exist
  const { data: existingElements, error: fetchError } = await adminClient
    .from('elements')
    .select('id')
    .in('id', elementIds)

  if (fetchError) {
    return { error: `Failed to verify elements: ${fetchError.message}` }
  }

  const existingIds = new Set((existingElements ?? []).map((e: { id: string }) => e.id))
  const missingIds = elementIds.filter((id) => !existingIds.has(id))
  if (missingIds.length > 0) {
    return { error: `Elements not found: ${missingIds.slice(0, 3).join(', ')}` }
  }

  // Generate QR codes directly in Node.js (no Edge Function needed)
  const QRCode = await import('qrcode')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sersteypan.is'
  const bucket = 'qr-codes'

  for (const elementId of elementIds) {
    try {
      const qrContent = `${appUrl}/qr/${elementId}`
      const svgString = await QRCode.toString(qrContent, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 512,
      })

      const filePath = `${elementId}.svg`
      const { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, svgString, {
          contentType: 'image/svg+xml',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Upload failed for ${elementId}:`, uploadError.message)
        return { error: `Upload failed for element ${elementId}` }
      }

      const { data: publicUrlData } = adminClient.storage
        .from(bucket)
        .getPublicUrl(filePath)

      await adminClient
        .from('elements')
        .update({ qr_code_url: publicUrlData.publicUrl })
        .eq('id', elementId)
    } catch (err) {
      console.error(`QR generation failed for ${elementId}:`, err)
      return { error: `QR generation failed for element ${elementId}` }
    }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}

// =====================================================
// Element Photo Actions
// =====================================================

/**
 * Create a photo record for an element.
 *
 * The browser client can upload files to Supabase Storage (the bucket
 * has permissive policies), but the `element_photos` table requires a
 * server-side insert to satisfy RLS. This action bridges that gap.
 */
export async function createElementPhoto(
  elementId: string,
  stage: string,
  photoUrl: string
) {
  console.log(`[photo-upload] createElementPhoto: element=${elementId}, stage=${stage}`)
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('[photo-upload] Server action auth error:', authError.message)
  }
  if (!user) {
    console.error('[photo-upload] No user in server action')
    return { error: 'Not authenticated' }
  }

  // Validate user has appropriate role (admin, factory, driver can upload photos)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    console.error(`[photo-upload] Account not active: role=${profile?.role}, is_active=${profile?.is_active}`)
    return { error: 'Account not active' }
  }

  if (!['admin', 'factory_manager', 'driver'].includes(profile.role)) {
    console.error(`[photo-upload] Insufficient permissions: role=${profile.role}`)
    return { error: 'Insufficient permissions' }
  }

  // Validate element exists
  const { data: element } = await supabase
    .from('elements')
    .select('id, project_id')
    .eq('id', elementId)
    .single()

  if (!element) {
    console.error(`[photo-upload] Element not found: ${elementId}`)
    return { error: 'Element not found' }
  }

  // Insert photo record
  const { error: dbError } = await supabase.from('element_photos').insert({
    element_id: elementId,
    stage,
    photo_url: photoUrl,
    taken_by: user.id,
  })

  if (dbError) {
    console.error('[photo-upload] DB insert error:', dbError.message, dbError.code, dbError.details)
    return { error: dbError.message }
  }

  console.log('[photo-upload] Photo record created successfully')
  revalidatePath(`/factory/production/${elementId}`)
  return { success: true }
}

/**
 * Server action: Upload a photo file and create the DB record.
 * Handles both storage upload and element_photos insert server-side,
 * bypassing client-side auth issues with @supabase/ssr.
 */
export async function uploadElementPhoto(formData: FormData) {
  const elementId = formData.get('elementId') as string
  const stage = formData.get('stage') as string
  const file = formData.get('file') as File
  const advanceStatus = formData.get('advanceStatus') as string | null

  console.log(`[photo-upload] uploadElementPhoto: element=${elementId}, stage=${stage}, file=${file?.name}, size=${file?.size}`)

  if (!elementId || !stage || !file) {
    console.error('[photo-upload] Missing required fields')
    return { error: 'Missing required fields' }
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('[photo-upload] uploadElementPhoto auth error:', authError.message)
  }
  if (!user) {
    console.error('[photo-upload] uploadElementPhoto: no user')
    return { error: 'Not authenticated' }
  }

  // Validate role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    console.error(`[photo-upload] Account not active: role=${profile?.role}`)
    return { error: 'Account not active' }
  }

  if (!['admin', 'factory_manager', 'driver'].includes(profile.role)) {
    console.error(`[photo-upload] Insufficient permissions: role=${profile.role}`)
    return { error: 'Insufficient permissions' }
  }

  // Upload to storage
  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'jpg'
  const filePath = `${user.id}/${elementId}/${timestamp}_${stage}.${ext}`

  console.log(`[photo-upload] Uploading to storage: ${filePath}`)
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('element-photos')
    .upload(filePath, arrayBuffer, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('[photo-upload] Storage upload failed:', uploadError.message)
    return { error: `Upload failed: ${uploadError.message}` }
  }
  console.log('[photo-upload] Storage upload OK')

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('element-photos')
    .getPublicUrl(filePath)

  // Insert photo record
  const { error: dbError } = await supabase.from('element_photos').insert({
    element_id: elementId,
    stage,
    photo_url: publicUrl,
    taken_by: user.id,
  })

  if (dbError) {
    console.error('[photo-upload] DB insert error:', dbError.message, dbError.code, dbError.details)
    // Clean up uploaded file
    await supabase.storage.from('element-photos').remove([filePath])
    return { error: dbError.message }
  }

  console.log('[photo-upload] Photo record created successfully')

  // Optionally advance element status
  if (advanceStatus) {
    const statusResult = await updateElementStatus(elementId, advanceStatus)
    if (statusResult.error) {
      console.warn('[photo-upload] Status advance failed (photo saved):', statusResult.error)
    }
  }

  revalidatePath(`/factory/production/${elementId}`)
  return { success: true, photoUrl: publicUrl }
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
      await createNotificationsFiltered(notifyTargets)
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
  revalidatePath('/factory/projects')
  revalidatePath(`/factory/projects/${element.project_id}`)

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

// Bulk update elements
export async function bulkUpdateElements(ids: string[], updates: Partial<Database['public']['Tables']['elements']['Update']>) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user is admin or factory_manager (for some statuses)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Unauthorized - Admin or Factory Manager only' }
  }

  if (!ids || ids.length === 0) {
    return { error: 'EKKI var valið neinar einingar' }
  }

  // Find project_id for revalidation (assume all from same project)
  const { data: sampleElement } = await supabase
    .from('elements')
    .select('project_id')
    .eq('id', ids[0])
    .single()

  const safeUpdates = { ...updates, updated_at: new Date().toISOString() }

  const { error } = await supabase
    .from('elements')
    .update(safeUpdates)
    .in('id', ids)

  if (error) {
    console.error('Error bulk updating elements:', error)
    return { error: 'Villa við að uppfæra einingar.' }
  }

  revalidatePath('/admin/projects')
  if (sampleElement) {
    revalidatePath(`/admin/projects/${sampleElement.project_id}`)
  }

  return { success: true }
}

// =====================================================
// Element Checklist Actions
// =====================================================

/**
 * Initialize the checklist on an element that has an empty one.
 */
export async function initializeElementChecklist(elementId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) return { error: 'Account not active' }
  if (!['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('elements')
    .update({ checklist: JSON.parse(JSON.stringify(DEFAULT_ELEMENT_CHECKLIST)) })
    .eq('id', elementId)

  if (error) {
    console.error('Error initializing element checklist:', error)
    return { error: error.message }
  }

  revalidatePath(`/factory/production/${elementId}`)
  return { success: true }
}

/**
 * Update a single checklist item on an element.
 */
export async function updateElementChecklistItem(
  elementId: string,
  key: string,
  checked: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) return { error: 'Account not active' }
  if (!['admin', 'factory_manager'].includes(profile.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Fetch current element
  const { data: element, error: fetchError } = await supabase
    .from('elements')
    .select('checklist, status')
    .eq('id', elementId)
    .single()

  if (fetchError || !element) {
    return { error: 'Eining finnst ekki' }
  }

  if (element.status === 'delivered' || element.status === 'loaded') {
    return { error: 'Ekki er hægt að breyta gátlista á afhentu einingu' }
  }

  const checklist = (element.checklist as unknown as ChecklistItem[]) || []

  // If checklist is empty, initialize it first
  if (checklist.length === 0) {
    const initialized = DEFAULT_ELEMENT_CHECKLIST.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          checked,
          checked_by: checked ? user.id : null,
          checked_at: checked ? new Date().toISOString() : null,
        }
      }
      return item
    })

    const { error: updateError } = await supabase
      .from('elements')
      .update({ checklist: JSON.parse(JSON.stringify(initialized)) })
      .eq('id', elementId)

    if (updateError) {
      console.error('Error updating element checklist:', updateError)
      return { error: updateError.message }
    }

    revalidatePath(`/factory/production/${elementId}`)
    return { success: true }
  }

  // Update the specific item
  const updatedChecklist = checklist.map((item) => {
    if (item.key === key) {
      return {
        ...item,
        checked,
        checked_by: checked ? user.id : null,
        checked_at: checked ? new Date().toISOString() : null,
      }
    }
    return item
  })

  const { error: updateError } = await supabase
    .from('elements')
    .update({ checklist: JSON.parse(JSON.stringify(updatedChecklist)) })
    .eq('id', elementId)

  if (updateError) {
    console.error('Error updating element checklist:', updateError)
    return { error: updateError.message }
  }

  revalidatePath(`/factory/production/${elementId}`)
  return { success: true }
}

