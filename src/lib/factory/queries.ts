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
 * Get elements that have been stuck in a status beyond expected thresholds.
 * Uses element_events to determine entry time (falls back to updated_at).
 *
 * Thresholds:
 * - planned > 14 days
 * - rebar > 7 days
 * - cast > 3 days
 * - curing > 10 days
 * - ready > 14 days (not loaded)
 */
export async function getStuckElements() {
  const supabase = await createClient()

  const thresholds: Record<string, number> = {
    planned: 14,
    rebar: 7,
    cast: 3,
    curing: 10,
    ready: 14,
  }

  // Fetch elements in the relevant statuses (not loaded/delivered/verified)
  const { data: elements, error } = await supabase
    .from('elements')
    .select(`
      id, name, element_type, status, priority, floor,
      updated_at, project_id,
      projects (
        id, name,
        companies ( name )
      )
    `)
    .in('status', Object.keys(thresholds))
    .order('updated_at', { ascending: true })

  if (error) {
    console.error('Error fetching elements for stuck check:', error)
    return []
  }

  if (!elements || elements.length === 0) return []

  // Get the latest event for each element to determine when it entered current status
  const elementIds = elements.map(e => e.id)
  const { data: events } = await supabase
    .from('element_events')
    .select('element_id, status, created_at')
    .in('element_id', elementIds)
    .order('created_at', { ascending: false })

  // Build map: elementId → timestamp when current status was entered
  const statusEntryMap: Record<string, string> = {}
  if (events) {
    for (const event of events) {
      // Only take the first (most recent) event matching current status
      const el = elements.find(e => e.id === event.element_id)
      if (el && event.status === el.status && !statusEntryMap[event.element_id]) {
        statusEntryMap[event.element_id] = event.created_at || el.updated_at || ''
      }
    }
  }

  const now = new Date()
  const stuckElements: Array<{
    id: string
    name: string
    element_type: string
    status: string
    priority: number | null
    floor: number | null
    daysStuck: number
    threshold: number
    project: { id: string; name: string; companies: { name: string } | null } | null
  }> = []

  for (const el of elements) {
    const elStatus = el.status || 'planned'
    const threshold = thresholds[elStatus]
    if (!threshold) continue

    const entryTime = statusEntryMap[el.id] || el.updated_at
    if (!entryTime) continue

    const entryDate = new Date(entryTime)
    const daysInStatus = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysInStatus > threshold) {
      stuckElements.push({
        id: el.id,
        name: el.name,
        element_type: el.element_type,
        status: elStatus,
        priority: el.priority,
        floor: el.floor,
        daysStuck: daysInStatus,
        threshold,
        project: el.projects as { id: string; name: string; companies: { name: string } | null } | null,
      })
    }
  }

  // Sort by days stuck descending (most stuck first)
  stuckElements.sort((a, b) => b.daysStuck - a.daysStuck)

  return stuckElements
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
