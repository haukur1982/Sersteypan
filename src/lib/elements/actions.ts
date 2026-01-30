'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Types for form data
export interface ElementFormData {
  project_id: string
  building_id?: string
  name: string
  element_type: 'wall' | 'filigran' | 'staircase' | 'balcony' | 'ceiling' | 'column' | 'beam' | 'other'
  drawing_reference?: string
  floor?: number
  position_description?: string
  length_mm?: number
  width_mm?: number
  height_mm?: number
  weight_kg?: number
  status: string
  priority: number
  production_notes?: string
  delivery_notes?: string
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

  // Extract and validate form data
  const name = formData.get('name') as string
  const project_id = formData.get('project_id') as string
  const element_type = formData.get('element_type') as string

  if (!name || !project_id || !element_type) {
    return { error: 'Name, project, and element type are required' }
  }

  // Validate project exists
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .single()

  if (!project) {
    return { error: 'Invalid project selected' }
  }

  // Prepare element data
  const elementData = {
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
    return { error: 'Failed to create element. Please try again.' }
  }

  // Revalidate the elements list page
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${project_id}`)

  // Redirect to project detail page
  redirect(`/admin/projects/${project_id}`)
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized - Admin only' }
  }

  if (!elementIds || elementIds.length === 0) {
    return { error: 'No elements provided' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase configuration' }
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-qr-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey
    },
    body: JSON.stringify({ element_ids: elementIds })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('QR generation failed:', errorText)
    return { error: 'Failed to generate QR codes' }
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

  // Get element to find project_id
  const { data: element } = await supabase
    .from('elements')
    .select('project_id, status')
    .eq('id', id)
    .single()

  if (!element) {
    return { error: 'Element not found' }
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
    return { error: 'Failed to update status. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${element.project_id}`)
  revalidatePath('/factory')
  revalidatePath('/factory/production')
  revalidatePath(`/factory/production/${id}`)

  return { success: true }
}
