'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Send a message on a project (for admins)
 */
export async function sendAdminMessage(formData: FormData) {
  const projectId = formData.get('projectId') as string
  const message = formData.get('message') as string
  const elementId = formData.get('elementId') as string | null

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
        message: message.trim(),
        element_id: elementId || null
      })

    if (error) {
      console.error('Error sending message:', error)
      return { error: 'Failed to send message' }
    }

    // 4. Revalidate
    revalidatePath('/admin/messages')
    revalidatePath(`/admin/projects/${projectId}`)

    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(messageIds: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  if (!messageIds || messageIds.length === 0) {
    return { error: 'No messages to mark as read' }
  }

  try {
    const { error } = await supabase
      .from('project_messages')
      .update({ is_read: true })
      .in('id', messageIds)

    if (error) {
      console.error('Error marking messages as read:', error)
      return { error: 'Failed to mark messages as read' }
    }

    revalidatePath('/admin/messages')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}
