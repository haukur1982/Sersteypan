'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateCompanyCreate, validateCompanyUpdate, formatZodError } from '@/lib/schemas'

// Types for form data
export interface CompanyFormData {
  name: string
  kennitala?: string
  address?: string
  city?: string
  postal_code?: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  notes?: string
  is_active: boolean
}

// Create a new company
export async function createCompany(formData: FormData) {
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
  const rawData = Object.fromEntries(formData)
  const validation = validateCompanyCreate(rawData)

  if (!validation.success) {
    const { error, errors } = formatZodError(validation.error)
    return { error, errors }
  }

  const validatedData = validation.data

  // Prepare company data
  const companyData = {
    name: validatedData.name,
    kennitala: validatedData.kennitala ?? null,
    address: validatedData.address || null,
    city: validatedData.city || null,
    postal_code: validatedData.postal_code || null,
    contact_name: validatedData.contact_name || null,
    contact_email: validatedData.contact_email || null,
    contact_phone: validatedData.contact_phone || null,
    notes: validatedData.notes || null,
    is_active: formData.get('is_active') === 'true'
  }

  // Insert into database
  const { error } = await supabase
    .from('companies')
    .insert(companyData)
    .select()
    .single()

  if (error) {
    console.error('Error creating company:', error)
    return { error: 'Failed to create company. Please try again.' }
  }

  // Revalidate the companies list page
  revalidatePath('/admin/companies')

  // Redirect to companies list
  redirect('/admin/companies')
}

// Get all companies
export async function getCompanies() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch companies ordered by name
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching companies:', error)
    return { error: 'Failed to fetch companies' }
  }

  return { success: true, data }
}

// Get a single company by ID
export async function getCompany(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching company:', error)
    return { error: 'Company not found' }
  }

  return { success: true, data }
}

// Update a company
export async function updateCompany(id: string, formData: FormData) {
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
  const rawData = {
    ...Object.fromEntries(formData),
    id
  }

  const validation = validateCompanyUpdate(rawData)

  if (!validation.success) {
    const { error, errors } = formatZodError(validation.error)
    return { error, errors }
  }

  const validatedData = validation.data

  // Prepare update data
  const updateData = {
    name: validatedData.name,
    kennitala: validatedData.kennitala ?? null,
    address: validatedData.address || null,
    city: validatedData.city || null,
    postal_code: validatedData.postal_code || null,
    contact_name: validatedData.contact_name || null,
    contact_email: validatedData.contact_email || null,
    contact_phone: validatedData.contact_phone || null,
    notes: validatedData.notes || null,
    is_active: formData.get('is_active') === 'true',
    updated_at: new Date().toISOString()
  }

  // Update in database
  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating company:', error)
    return { error: 'Failed to update company. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/companies')
  revalidatePath(`/admin/companies/${id}/edit`)

  // Redirect to companies list
  redirect('/admin/companies')
}

// Delete a company
export async function deleteCompany(id: string) {
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

  // Check if company has any projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', id)
    .limit(1)

  if (projects && projects.length > 0) {
    return {
      error: 'Cannot delete company with existing projects. Delete projects first or mark company as inactive.'
    }
  }

  // Delete the company
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting company:', error)
    return { error: 'Failed to delete company. Please try again.' }
  }

  // Revalidate the companies list page
  revalidatePath('/admin/companies')

  return { success: true }
}

// Soft delete - mark as inactive instead of deleting
export async function deactivateCompany(id: string) {
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

  // Update company to inactive
  const { error } = await supabase
    .from('companies')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deactivating company:', error)
    return { error: 'Failed to deactivate company. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/admin/companies')

  return { success: true }
}
