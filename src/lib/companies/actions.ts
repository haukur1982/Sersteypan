'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
  const name = formData.get('name') as string
  const contact_name = formData.get('contact_name') as string
  const contact_email = formData.get('contact_email') as string

  if (!name || !contact_name || !contact_email) {
    return { error: 'Name, contact name, and contact email are required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(contact_email)) {
    return { error: 'Invalid email format' }
  }

  // Prepare company data
  const companyData = {
    name: name.trim(),
    kennitala: (formData.get('kennitala') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || null,
    postal_code: (formData.get('postal_code') as string)?.trim() || null,
    contact_name: contact_name.trim(),
    contact_email: contact_email.trim(),
    contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
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
  const name = formData.get('name') as string
  const contact_name = formData.get('contact_name') as string
  const contact_email = formData.get('contact_email') as string

  if (!name || !contact_name || !contact_email) {
    return { error: 'Name, contact name, and contact email are required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(contact_email)) {
    return { error: 'Invalid email format' }
  }

  // Prepare update data
  const updateData = {
    name: name.trim(),
    kennitala: (formData.get('kennitala') as string)?.trim() || null,
    address: (formData.get('address') as string)?.trim() || null,
    city: (formData.get('city') as string)?.trim() || null,
    postal_code: (formData.get('postal_code') as string)?.trim() || null,
    contact_name: contact_name.trim(),
    contact_email: contact_email.trim(),
    contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
    notes: (formData.get('notes') as string)?.trim() || null,
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
