'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatZodError, validateUserCreate, validateUserUpdate } from '@/lib/schemas'

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

  // Extract and validate form data
  const rawData = {
    ...Object.fromEntries(formData),
    company_id: (formData.get('company_id') as string) || undefined
  }

  const validation = validateUserCreate(rawData)

  if (!validation.success) {
    const { error, errors } = formatZodError(validation.error)
    return { error, errors }
  }

  const validatedData = validation.data

  // Create auth user using admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: validatedData.email.trim(),
    password: validatedData.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: validatedData.full_name
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
      email: validatedData.email.trim(),
      full_name: validatedData.full_name,
      phone: validatedData.phone || null,
      role: validatedData.role,
      company_id: validatedData.role === 'buyer' ? validatedData.company_id : null,
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

  // Extract and validate form data
  const rawData = {
    ...Object.fromEntries(formData),
    id: userId,
    company_id: (formData.get('company_id') as string) || undefined
  }

  const validation = validateUserUpdate(rawData)

  if (!validation.success) {
    const { error, errors } = formatZodError(validation.error)
    return { error, errors }
  }

  const validatedData = validation.data
  const is_active = formData.get('is_active') === 'true'

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: validatedData.full_name,
      phone: validatedData.phone || null,
      role: validatedData.role,
      company_id: validatedData.role === 'buyer' ? validatedData.company_id : null,
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

// Toggle a feature flag for a user
export async function toggleFeatureFlag(userId: string, key: string, value: boolean) {
  const supabase = await createClient()

  // Get current user (must be admin)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // Fetch target user's current preferences
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single()

  if (fetchError || !targetProfile) {
    return { error: 'User not found' }
  }

  const currentPrefs = (targetProfile.preferences || {}) as Record<string, unknown>
  const newPrefs = { ...currentPrefs, [key]: value }

  // Update
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      preferences: newPrefs as unknown as Record<string, boolean | string | number | null>,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (updateError) {
    return { error: 'Update failed' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
