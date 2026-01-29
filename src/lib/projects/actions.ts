'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Types for form data
export interface ProjectFormData {
  name: string
  company_id: string
  description?: string
  address?: string
  status: 'planning' | 'active' | 'completed' | 'on_hold'
  start_date?: string
  expected_end_date?: string
  notes?: string
}

// Create a new project
export async function createProject(formData: FormData) {
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
  const company_id = formData.get('company_id') as string

  if (!name || !company_id) {
    return { error: 'Name and company are required' }
  }

  // Validate company exists
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .single()

  if (!company) {
    return { error: 'Invalid company selected' }
  }

  // Prepare project data
  const projectData = {
    name: name.trim(),
    company_id,
    description: (formData.get('description') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    status: (formData.get('status') as string) || 'planning',
    start_date: (formData.get('start_date') as string) || null,
    expected_end_date: (formData.get('expected_end_date') as string) || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    created_by: user.id
  }

  // Insert into database
  const { error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return { error: 'Failed to create project. Please try again.' }
  }

  // Revalidate the projects list page
  revalidatePath('/admin/projects')

  // Redirect to projects list
  redirect('/admin/projects')
}

// Get all projects
export async function getProjects() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch projects with company information, ordered by name
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies (
        id,
        name
      )
    `)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching projects:', error)
    return { error: 'Failed to fetch projects' }
  }

  return { success: true, data }
}

// Get a single project by ID
export async function getProject(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies (
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return { error: 'Project not found' }
  }

  return { success: true, data }
}

// Update a project
export async function updateProject(id: string, formData: FormData) {
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
  const company_id = formData.get('company_id') as string

  if (!name || !company_id) {
    return { error: 'Name and company are required' }
  }

  // Validate company exists
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('id', company_id)
    .single()

  if (!company) {
    return { error: 'Invalid company selected' }
  }

  // Prepare update data
  const updateData = {
    name: name.trim(),
    company_id,
    description: (formData.get('description') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    status: (formData.get('status') as string) || 'planning',
    start_date: (formData.get('start_date') as string) || null,
    expected_end_date: (formData.get('expected_end_date') as string) || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    updated_at: new Date().toISOString()
  }

  // Update in database
  const { error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error)
    return { error: 'Failed to update project. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${id}/edit`)

  // Redirect to projects list
  redirect('/admin/projects')
}

// Delete a project
export async function deleteProject(id: string) {
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

  // Check if project has any elements
  const { data: elements } = await supabase
    .from('elements')
    .select('id')
    .eq('project_id', id)
    .limit(1)

  if (elements && elements.length > 0) {
    return {
      error: 'Cannot delete project with existing elements. Delete elements first or mark project as completed.'
    }
  }

  // Delete the project
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: 'Failed to delete project. Please try again.' }
  }

  // Revalidate the projects list page
  revalidatePath('/admin/projects')

  return { success: true }
}

// Mark project as completed (soft delete alternative)
export async function completeProject(id: string) {
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

  // Update project to completed
  const { error } = await supabase
    .from('projects')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error completing project:', error)
    return { error: 'Failed to complete project. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/projects')

  return { success: true }
}
