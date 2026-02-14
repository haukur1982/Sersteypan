import { createClient } from '@/lib/supabase/server'

/**
 * Get all project messages for factory managers
 * Factory managers can see messages from all projects
 */
export async function getFactoryMessages() {
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
    .limit(100)

  if (error) {
    console.error('Error fetching factory messages:', error)
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
 * Get element counts grouped by project and status
 * Returns { [projectId]: { planned: 3, cast: 2, ready: 1, ... } }
 */
export async function getElementCountsByProject(): Promise<Record<string, Record<string, number>>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('elements')
    .select('project_id, status')

  if (error) {
    console.error('Error fetching element counts:', error)
    return {}
  }

  const counts: Record<string, Record<string, number>> = {}
  for (const el of data || []) {
    const pid = el.project_id
    const status = el.status || 'planned'
    if (!counts[pid]) counts[pid] = {}
    counts[pid][status] = (counts[pid][status] || 0) + 1
  }

  return counts
}

/**
 * Get priority elements (priority > 0, not yet delivered/loaded)
 * Used for the factory dashboard "Forgangur" section
 */
export async function getPriorityElements() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('elements')
    .select(`
      id,
      name,
      element_type,
      status,
      priority,
      floor,
      project_id,
      projects (
        id,
        name,
        companies (
          name
        )
      )
    `)
    .gt('priority', 0)
    .not('status', 'in', '("delivered","loaded")')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('Error fetching priority elements:', error)
    return []
  }

  return data || []
}

/**
 * Get all active elements for the production schedule view
 * Groups elements by project with status, priority, and dates
 */
export async function getScheduleElements() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('elements')
    .select(`
      id, name, element_type, status, priority, floor,
      created_at, updated_at,
      rebar_completed_at, cast_at, curing_completed_at, ready_at,
      project_id,
      projects (
        id, name,
        companies ( name )
      )
    `)
    .not('status', 'in', '("delivered","verified")')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching schedule elements:', error)
    return []
  }

  return data || []
}

/**
 * Get deliveries for the factory delivery calendar
 * Returns all deliveries with project, driver, and item count
 */
export async function getFactoryDeliveries() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      id, status, planned_date, truck_registration,
      departed_at, arrived_at, completed_at, created_at,
      project:projects ( id, name, company:companies ( name ) ),
      driver:profiles!deliveries_driver_id_fkey ( id, full_name ),
      delivery_items ( id )
    `)
    .order('planned_date', { ascending: true })

  if (error) {
    console.error('Error fetching factory deliveries:', error)
    return []
  }

  return data || []
}

/**
 * Get unread message count for factory managers
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
