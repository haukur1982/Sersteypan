'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Request priority change for an element
 * Creates a priority_request record that Factory Manager can review
 */
export async function requestPriority(formData: FormData) {
  const elementId = formData.get('elementId') as string
  const requestedPriority = parseInt(formData.get('priority') as string)
  const reason = formData.get('reason') as string

  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 2. Validation
  if (!elementId) {
    return { error: 'Element ID is required' }
  }

  if (isNaN(requestedPriority) || requestedPriority < 1 || requestedPriority > 10) {
    return { error: 'Priority must be between 1 and 10' }
  }

  if (!reason || reason.trim().length === 0) {
    return { error: 'Reason is required' }
  }

  try {
    // 3. Database operation (RLS enforced)
    const { error } = await supabase
      .from('priority_requests')
      .insert({
        element_id: elementId,
        requested_by: user.id,
        requested_priority: requestedPriority,
        reason: reason.trim(),
        status: 'pending'
      })

    if (error) {
      console.error('Error creating priority request:', error)
      return { error: 'Failed to create priority request' }
    }

    // 4. Get the project ID for this element to revalidate detail page
    const { data: element } = await supabase
      .from('elements')
      .select('project_id')
      .eq('id', elementId)
      .single()

    // 5. Revalidate both list and detail pages
    revalidatePath('/buyer/projects')  // List page
    if (element?.project_id) {
      revalidatePath(`/buyer/projects/${element.project_id}`)  // Detail page
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Send a message on a project
 * Messages are visible to all users associated with the project
 */
export async function sendMessage(formData: FormData) {
  const projectId = formData.get('projectId') as string
  const message = formData.get('message') as string

  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 2. Validation
  if (!projectId) {
    return { error: 'Project ID is required' }
  }

  if (!message || message.trim().length === 0) {
    return { error: 'Message cannot be empty' }
  }

  if (message.trim().length > 5000) {
    return { error: 'Message too long (max 5000 characters)' }
  }

  try {
    // 3. Database operation (RLS enforced)
    const { error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        user_id: user.id,
        message: message.trim()
      })

    if (error) {
      console.error('Error sending message:', error)
      return { error: 'Failed to send message' }
    }

    // 4. Revalidate
    revalidatePath(`/buyer/projects/${projectId}`)

    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}
