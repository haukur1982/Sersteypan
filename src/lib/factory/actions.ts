'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { createNotifications } from '@/lib/notifications/queries'
import {
  type PaginationParams,
  type PaginatedResult,
  calculateRange,
  buildPaginationMeta,
} from '@/lib/utils/pagination'

type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type CompanyRow = Database['public']['Tables']['companies']['Row']
type ProductionElement = Pick<
  ElementRow,
  'id' | 'name' | 'element_type' | 'status' | 'priority' | 'floor' | 'created_at' | 'rebar_batch_id'
> & {
  projects?: (Pick<ProjectRow, 'id' | 'name'> & { companies?: Pick<CompanyRow, 'name'> | null }) | null
  production_batches?: { id: string; batch_number: string } | null
}

/**
 * Get production queue with pagination
 */
export async function getProductionQueuePaginated(
  pagination: PaginationParams,
  filters?: {
    status?: string
    elementType?: string
    search?: string
  }
): Promise<PaginatedResult<ProductionElement>> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Not authenticated' }
  }

  // Check role - only factory_manager or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['factory_manager', 'admin'].includes(profile.role)) {
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Unauthorized' }
  }

  // Build count query
  let countQuery = supabase.from('elements').select('*', { count: 'exact', head: true })

  // Apply filters
  if (filters?.status) {
    countQuery = countQuery.eq('status', filters.status)
  }
  if (filters?.elementType) {
    countQuery = countQuery.eq('element_type', filters.elementType)
  }
  if (filters?.search) {
    countQuery = countQuery.ilike('name', `%${filters.search}%`)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error counting elements:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Fetch paginated data with project info
  let dataQuery = supabase
    .from('elements')
    .select(
      `
      id,
      name,
      element_type,
      status,
      priority,
      floor,
      created_at,
      rebar_batch_id,
      projects (
        id,
        name,
        companies (
          name
        )
      ),
      production_batches!elements_batch_id_fkey (
        id,
        batch_number
      )
    `
    )
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .range(from, to)

  // Apply same filters
  if (filters?.status) {
    dataQuery = dataQuery.eq('status', filters.status)
  }
  if (filters?.elementType) {
    dataQuery = dataQuery.eq('element_type', filters.elementType)
  }
  if (filters?.search) {
    dataQuery = dataQuery.ilike('name', `%${filters.search}%`)
  }

  const { data, error } = await dataQuery

  if (error) {
    console.error('Error fetching elements:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  return {
    data: (data || []) as ProductionElement[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

/**
 * Send a message on a project (for factory managers)
 */
export async function sendFactoryMessage(formData: FormData) {
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
    revalidatePath('/factory/messages')
    revalidatePath(`/factory/projects/${projectId}`)

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

    revalidatePath('/factory/messages')
    return { success: true }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Bulk update element statuses
 * Updates multiple elements to the same status in one operation
 */
export async function bulkUpdateElementStatus(
  elementIds: string[],
  newStatus: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, count: 0, error: 'Unauthorized' }
  }

  if (!elementIds || elementIds.length === 0) {
    return { success: false, count: 0, error: 'Engar einingar valdar' }
  }

  const validStatuses = ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded']
  if (!validStatuses.includes(newStatus)) {
    return { success: false, count: 0, error: `Ógild staða: ${newStatus}` }
  }

  try {
    // Fetch elements to get current status and project info for notifications
    const { data: elements, error: fetchError } = await supabase
      .from('elements')
      .select('id, name, status, project_id, project:projects(name, company_id)')
      .in('id', elementIds)

    if (fetchError || !elements) {
      return { success: false, count: 0, error: 'Villa við að sækja einingar' }
    }

    // Update all elements
    const { error: updateError } = await supabase
      .from('elements')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .in('id', elementIds)

    if (updateError) {
      console.error('Error bulk updating elements:', updateError)
      return { success: false, count: 0, error: 'Villa við að uppfæra stöðu' }
    }

    // Send notifications (non-blocking)
    try {
      const notifyTargets: Array<{ userId: string; type: string; title: string; body?: string; link?: string }> = []

      // Get buyers for all affected projects
      for (const el of elements) {
        const project = el.project as { name: string; company_id: string | null } | null
        if (project?.company_id) {
          const { data: buyers } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', project.company_id)
            .eq('role', 'buyer')
            .eq('is_active', true)

          if (buyers) {
            for (const buyer of buyers) {
              // Avoid duplicate notifications per buyer
              if (!notifyTargets.some(t => t.userId === buyer.id && t.link === `/buyer/projects/${el.project_id}`)) {
                notifyTargets.push({
                  userId: buyer.id,
                  type: 'element_status',
                  title: `${elements.length} einingar uppfærðar`,
                  body: `${project.name}: staða → ${newStatus}`,
                  link: `/buyer/projects/${el.project_id}`,
                })
              }
            }
          }
        }
      }

      if (notifyTargets.length > 0) {
        await createNotifications(notifyTargets)
      }
    } catch (notifyErr) {
      console.error('Failed to create bulk notifications:', notifyErr)
    }

    // Revalidate
    revalidatePath('/factory/production')
    revalidatePath('/factory/schedule')
    revalidatePath('/factory')
    for (const pid of [...new Set(elements.map(e => e.project_id))]) {
      revalidatePath(`/admin/projects/${pid}`)
    }

    return { success: true, count: elements.length }
  } catch (err) {
    console.error('Unexpected error in bulk update:', err)
    return { success: false, count: 0, error: 'Óvænt villa kom upp' }
  }
}
