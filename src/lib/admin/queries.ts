import { createClient } from '@/lib/supabase/server'
import type { PaginationParams, PaginatedResult } from '@/lib/utils/pagination'
import { buildPaginationMeta, calculateRange } from '@/lib/utils/pagination'

// ── Element queries ──────────────────────────────────────────

export interface AdminElement {
  id: string
  name: string
  element_type: string
  status: string
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  project_id: string
  created_at: string
  project: { name: string; company: { name: string } | null } | null
}

/**
 * Paginated elements list for admin with search + status filter
 */
export async function getAdminElementsPaginated(
  pagination: PaginationParams,
  filters?: { status?: string; search?: string }
): Promise<PaginatedResult<AdminElement>> {
  const supabase = await createClient()

  // Count query
  let countQuery = supabase.from('elements').select('*', { count: 'exact', head: true })
  if (filters?.status) countQuery = countQuery.eq('status', filters.status)
  if (filters?.search) countQuery = countQuery.ilike('name', `%${filters.search}%`)

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Error counting elements:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Data query
  let dataQuery = supabase
    .from('elements')
    .select(`
      id, name, element_type, status, width_mm, height_mm, length_mm, project_id, created_at,
      project:projects(name, company:companies(name))
    `)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.status) dataQuery = dataQuery.eq('status', filters.status)
  if (filters?.search) dataQuery = dataQuery.ilike('name', `%${filters.search}%`)

  const { data, error } = await dataQuery
  if (error) {
    console.error('Error fetching elements:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch elements' }
  }

  return {
    data: (data || []) as AdminElement[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

// ── Delivery queries ─────────────────────────────────────────

export interface AdminDelivery {
  id: string
  planned_date: string | null
  status: string
  truck_registration: string | null
  created_at: string
  project: { name: string; company: { name: string } | null } | null
  driver: { full_name: string } | null
}

/**
 * Paginated deliveries list for admin with search + status filter
 */
export async function getAdminDeliveriesPaginated(
  pagination: PaginationParams,
  filters?: { status?: string; search?: string }
): Promise<PaginatedResult<AdminDelivery>> {
  const supabase = await createClient()

  // Count query — use a joined query for search across project name
  let countQuery = supabase.from('deliveries').select('*, project:projects!inner(name)', { count: 'exact', head: true })
  if (filters?.status) countQuery = countQuery.eq('status', filters.status)
  if (filters?.search) countQuery = countQuery.ilike('project.name', `%${filters.search}%`)

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Error counting deliveries:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch deliveries' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Data query
  let dataQuery = supabase
    .from('deliveries')
    .select(`
      id, planned_date, status, truck_registration, created_at,
      project:projects!inner(name, company:companies(name)),
      driver:profiles!deliveries_driver_id_fkey(full_name)
    `)
    .order('planned_date', { ascending: false })
    .range(from, to)

  if (filters?.status) dataQuery = dataQuery.eq('status', filters.status)
  if (filters?.search) dataQuery = dataQuery.ilike('project.name', `%${filters.search}%`)

  const { data, error } = await dataQuery
  if (error) {
    console.error('Error fetching deliveries:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch deliveries' }
  }

  return {
    data: (data || []) as AdminDelivery[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

// ── Message queries ──────────────────────────────────────────

/**
 * Get all project messages for admins
 * Admins can see all messages from all projects
 */
export async function getAdminMessages() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_messages')
    .select(`
      id,
      project_id,
      message,
      is_read,
      created_at,
      user:profiles(
        id,
        full_name,
        role
      ),
      project:projects(
        id,
        name,
        company:companies(
          id,
          name
        )
      ),
      element:elements(
        id,
        name,
        element_type
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching admin messages:', error)
    throw new Error('Failed to fetch messages')
  }

  return data || []
}

/**
 * Get messages for a specific project
 */
export async function getProjectMessages(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_messages')
    .select(`
      id,
      message,
      is_read,
      created_at,
      user:profiles(
        id,
        full_name,
        role
      ),
      element:elements(
        id,
        name,
        element_type
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching project messages:', error)
    throw new Error('Failed to fetch messages')
  }

  return data || []
}

/**
 * Get unread message count for admins
 */
export async function getUnreadMessageCount() {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('project_messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}
