'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Get all users (admin only)
export async function getUsers() {
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

  // Fetch all profiles with company info for buyers
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      companies (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return { error: 'Failed to fetch users' }
  }

  return { success: true, data }
}

// Get a single user by ID
export async function getUser(userId: string) {
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

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      companies (
        id,
        name
      )
    `)
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return { error: 'User not found' }
  }

  return { success: true, data }
}

// Create a new user (admin only)
export async function createUser(formData: FormData) {
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

  // Extract form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as string
  const company_id = formData.get('company_id') as string

  if (!email || !password || !full_name || !role) {
    return { error: 'Email, password, full name, and role are required' }
  }

  // Validate role
  const validRoles = ['admin', 'factory_manager', 'buyer', 'driver']
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role' }
  }

  // For buyers, company_id is required
  if (role === 'buyer' && !company_id) {
    return { error: 'Company is required for buyers' }
  }

  // Create auth user using admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: full_name.trim()
    }
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    return { error: `Failed to create user: ${authError.message}` }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Create profile record
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: email.trim(),
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      role,
      company_id: role === 'buyer' ? company_id : null,
      is_active: true
    })

  if (profileError) {
    console.error('Error creating profile:', profileError)
    // Try to delete the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create user profile' }
  }

  // Revalidate users list
  revalidatePath('/admin/users')

  // Redirect to users list
  redirect('/admin/users')
}

// Update user (admin only)
export async function updateUser(userId: string, formData: FormData) {
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

  // Extract form data
  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as string
  const company_id = formData.get('company_id') as string
  const is_active = formData.get('is_active') === 'true'

  if (!full_name || !role) {
    return { error: 'Full name and role are required' }
  }

  // Validate role
  const validRoles = ['admin', 'factory_manager', 'buyer', 'driver']
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role' }
  }

  // For buyers, company_id is required
  if (role === 'buyer' && !company_id) {
    return { error: 'Company is required for buyers' }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      role,
      company_id: role === 'buyer' ? company_id : null,
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating user:', updateError)
    return { error: 'Failed to update user' }
  }

  // Revalidate pages
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}/edit`)

  // Redirect to users list
  redirect('/admin/users')
}

// Deactivate user (soft delete)
export async function deactivateUser(userId: string) {
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

  // Don't allow deactivating yourself
  if (userId === user.id) {
    return { error: 'Cannot deactivate your own account' }
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    console.error('Error deactivating user:', error)
    return { error: 'Failed to deactivate user' }
  }

  // Revalidate users list
  revalidatePath('/admin/users')

  return { success: true }
}
