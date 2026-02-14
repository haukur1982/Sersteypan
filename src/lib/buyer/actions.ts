'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotifications } from '@/lib/notifications/queries'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, 'Nafn má ekki vera tómt').max(200, 'Nafn má ekki vera lengra en 200 stafir'),
  phone: z.string().trim()
    .transform((val) => val.replace(/[\s-]/g, ''))
    .refine(
      (val) => val === '' || /^(\+354)?\d{7}$/.test(val),
      { message: 'Símanúmer verður að vera 7 tölustafir' }
    )
    .transform((val) => val || null),
})

/**
 * Update buyer profile (name and phone)
 * Uses (prevState, formData) signature for useActionState
 */
export async function updateBuyerProfile(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized', success: false }
  }

  // 2. Parse and validate
  const rawData = {
    full_name: formData.get('full_name') as string || '',
    phone: formData.get('phone') as string || '',
  }

  const parsed = profileUpdateSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Staðfestingarvilla'
    return { error: firstError, success: false }
  }

  try {
    // 3. Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating buyer profile:', error)
      return { error: 'Ekki tókst að uppfæra upplýsingar', success: false }
    }

    // 4. Revalidate
    revalidatePath('/buyer/profile')
    revalidatePath('/buyer')

    return { error: '', success: true }
  } catch (err) {
    console.error('Unexpected error updating profile:', err)
    return { error: 'Óvænt villa kom upp', success: false }
  }
}

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

    // 4. Notify factory managers and admins about the new message
    try {
      const [{ data: project }, { data: profile }, { data: staff }] = await Promise.all([
        supabase.from('projects').select('name').eq('id', projectId).single(),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('profiles').select('id').in('role', ['admin', 'factory_manager']).eq('is_active', true),
      ])

      if (staff && staff.length > 0) {
        const senderName = profile?.full_name || 'Kaupandi'
        const projectName = project?.name || 'Verkefni'
        const preview = message.trim().length > 60 ? message.trim().slice(0, 60) + '...' : message.trim()

        await createNotifications(
          staff.map((s) => ({
            userId: s.id,
            type: 'new_message',
            title: `Ný skilaboð — ${projectName}`,
            body: `${senderName}: ${preview}`,
            link: `/admin/messages?project=${projectId}`,
          }))
        )
      }
    } catch (notifyErr) {
      console.error('Failed to create message notifications:', notifyErr)
    }

    // 5. Revalidate
    revalidatePath(`/buyer/projects/${projectId}`)
    revalidatePath('/buyer/messages')

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

    revalidatePath('/buyer/messages')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}
