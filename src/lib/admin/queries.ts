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

// ── User queries ─────────────────────────────────────────────

export interface AdminUser {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  preferences: Record<string, unknown> | null
  companies: { id: string; name: string } | null
}

/**
 * Paginated users list for admin with search + role filter
 */
export async function getUsersPaginated(
  pagination: PaginationParams,
  filters?: { role?: string; search?: string }
): Promise<PaginatedResult<AdminUser>> {
  const supabase = await createClient()

  // Count query
  let countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true })
  if (filters?.role) countQuery = countQuery.eq('role', filters.role)
  if (filters?.search) {
    countQuery = countQuery.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Error counting users:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch users' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Data query
  let dataQuery = supabase
    .from('profiles')
    .select(`
      id, full_name, email, role, is_active, created_at, preferences,
      companies(id, name)
    `)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.role) dataQuery = dataQuery.eq('role', filters.role)
  if (filters?.search) {
    dataQuery = dataQuery.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await dataQuery
  if (error) {
    console.error('Error fetching users:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch users' }
  }

  return {
    data: (data || []) as AdminUser[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

// ── Company queries ──────────────────────────────────────────

export interface AdminCompany {
  id: string
  name: string
  kennitala: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

/**
 * Paginated companies list for admin with search filter
 */
export async function getCompaniesPaginated(
  pagination: PaginationParams,
  filters?: { search?: string }
): Promise<PaginatedResult<AdminCompany>> {
  const supabase = await createClient()

  // Count query
  let countQuery = supabase.from('companies').select('*', { count: 'exact', head: true })
  if (filters?.search) {
    countQuery = countQuery.or(`name.ilike.%${filters.search}%,kennitala.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`)
  }

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Error counting companies:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch companies' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Data query
  let dataQuery = supabase
    .from('companies')
    .select('id, name, kennitala, contact_name, contact_email, contact_phone, is_active, created_at')
    .order('name', { ascending: true })
    .range(from, to)

  if (filters?.search) {
    dataQuery = dataQuery.or(`name.ilike.%${filters.search}%,kennitala.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await dataQuery
  if (error) {
    console.error('Error fetching companies:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch companies' }
  }

  return {
    data: (data || []) as AdminCompany[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

// ── Message queries ──────────────────────────────────────────

export interface AdminMessage {
  id: string
  project_id: string
  message: string
  is_read: boolean | null
  created_at: string | null
  user: { id: string; full_name: string; role: string } | null
  project: { id: string; name: string; company: { id: string; name: string } | null } | null
  element: { id: string; name: string; element_type: string } | null
}

const MESSAGE_SELECT = `
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
`

/**
 * Paginated messages list for admin with search + project filter
 */
export async function getAdminMessagesPaginated(
  pagination: PaginationParams,
  filters?: { search?: string; projectId?: string }
): Promise<PaginatedResult<AdminMessage>> {
  const supabase = await createClient()

  // Count query
  let countQuery = supabase.from('project_messages').select('*', { count: 'exact', head: true })
  if (filters?.projectId) countQuery = countQuery.eq('project_id', filters.projectId)
  if (filters?.search) countQuery = countQuery.ilike('message', `%${filters.search}%`)

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('Error counting messages:', countError)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch messages' }
  }

  const total = count || 0
  const [from, to] = calculateRange(pagination.page, pagination.limit)

  // Data query
  let dataQuery = supabase
    .from('project_messages')
    .select(MESSAGE_SELECT)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.projectId) dataQuery = dataQuery.eq('project_id', filters.projectId)
  if (filters?.search) dataQuery = dataQuery.ilike('message', `%${filters.search}%`)

  const { data, error } = await dataQuery
  if (error) {
    console.error('Error fetching messages:', error)
    return { data: [], pagination: buildPaginationMeta(0, 1, pagination.limit), error: 'Failed to fetch messages' }
  }

  return {
    data: (data || []) as AdminMessage[],
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  }
}

/**
 * Get all project messages for admins (legacy, kept for compatibility)
 * @deprecated Use getAdminMessagesPaginated instead
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
