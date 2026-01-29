'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Get diary entries for current user or all (admin/factory_manager)
export async function getDiaryEntries(limit: number = 50) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Fetch diary entries
  let query = supabase
    .from('diary_entries')
    .select(`
      id,
      entry_date,
      title,
      content,
      created_at,
      updated_at,
      user_id,
      project_id,
      profiles (
        full_name
      ),
      projects (
        name
      )
    `)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  // Factory managers see all entries, others see only their own
  if (profile.role !== 'admin' && profile.role !== 'factory_manager') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching diary entries:', error)
    return { error: 'Failed to fetch diary entries' }
  }

  return { success: true, data }
}

// Get a single diary entry
export async function getDiaryEntry(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('diary_entries')
    .select(`
      *,
      profiles (
        full_name
      ),
      projects (
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching diary entry:', error)
    return { error: 'Diary entry not found' }
  }

  // Check access - user can only view their own entries unless admin/factory_manager
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (data.user_id !== user.id && profile?.role !== 'admin' && profile?.role !== 'factory_manager') {
    return { error: 'Unauthorized' }
  }

  return { success: true, data }
}

// Create a new diary entry
export async function createDiaryEntry(formData: FormData) {
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

  // Extract and validate form data
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const entry_date = formData.get('entry_date') as string
  const project_id = (formData.get('project_id') as string) || null

  if (!content || !entry_date) {
    return { error: 'Content and date are required' }
  }

  // Prepare diary entry data
  const entryData = {
    user_id: user.id,
    entry_date,
    title: title?.trim() || null,
    content: content.trim(),
    project_id
  }

  // Insert into database
  const { error } = await supabase
    .from('diary_entries')
    .insert(entryData)
    .select()
    .single()

  if (error) {
    console.error('Error creating diary entry:', error)
    return { error: 'Failed to create diary entry. Please try again.' }
  }

  // Revalidate the diary pages
  revalidatePath('/factory/diary')

  // Redirect to diary list
  redirect('/factory/diary')
}

// Update a diary entry
export async function updateDiaryEntry(id: string, formData: FormData) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get existing entry to check ownership
  const { data: existingEntry } = await supabase
    .from('diary_entries')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existingEntry) {
    return { error: 'Diary entry not found' }
  }

  // Check user can edit (must be owner or admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (existingEntry.user_id !== user.id && profile?.role !== 'admin') {
    return { error: 'Unauthorized - You can only edit your own entries' }
  }

  // Extract and validate form data
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const entry_date = formData.get('entry_date') as string
  const project_id = (formData.get('project_id') as string) || null

  if (!content || !entry_date) {
    return { error: 'Content and date are required' }
  }

  // Prepare update data
  const updateData = {
    entry_date,
    title: title?.trim() || null,
    content: content.trim(),
    project_id,
    updated_at: new Date().toISOString()
  }

  // Update in database
  const { error } = await supabase
    .from('diary_entries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating diary entry:', error)
    return { error: 'Failed to update diary entry. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/factory/diary')
  revalidatePath(`/factory/diary/${id}/edit`)

  // Redirect to diary list
  redirect('/factory/diary')
}

// Delete a diary entry
export async function deleteDiaryEntry(id: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get entry to check ownership
  const { data: entry } = await supabase
    .from('diary_entries')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!entry) {
    return { error: 'Diary entry not found' }
  }

  // Check user can delete (must be owner or admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (entry.user_id !== user.id && profile?.role !== 'admin') {
    return { error: 'Unauthorized - You can only delete your own entries' }
  }

  // Delete the entry
  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting diary entry:', error)
    return { error: 'Failed to delete diary entry. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/factory/diary')

  return { success: true }
}
