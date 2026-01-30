import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export interface Notification {
  id: string
  type: 'element_status' | 'delivery' | 'message'
  title: string
  message: string
  timestamp: string
  read: boolean
  elementId?: string
  deliveryId?: string
  projectId?: string
}

type ElementEventRow = Database['public']['Tables']['element_events']['Row']
type ElementRow = Database['public']['Tables']['elements']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type DeliveryRow = Database['public']['Tables']['deliveries']['Row']

type BuyerEvent = Pick<ElementEventRow, 'id' | 'status' | 'previous_status' | 'created_at'> & {
  element: (Pick<ElementRow, 'id' | 'name'> & {
    project: Pick<ProjectRow, 'id' | 'name' | 'company_id'> | null
  }) | null
}

type AdminEvent = Pick<ElementEventRow, 'id' | 'status' | 'previous_status' | 'created_at'> & {
  element: (Pick<ElementRow, 'id' | 'name'> & {
    project: Pick<ProjectRow, 'id' | 'name'> | null
  }) | null
}

type DriverDelivery = Pick<DeliveryRow, 'id' | 'status' | 'created_at'> & {
  project: Pick<ProjectRow, 'id' | 'name'> | null
}

/**
 * Get unread notifications for a user
 * For now, we generate notifications from element_events table
 * In the future, we can create a dedicated notifications table
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient()

  // Get user's profile to determine role and company
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return []
  }

  const notifications: Notification[] = []

  try {
    // For buyers: get element status changes for their company's projects
    if (profile.role === 'buyer' && profile.company_id) {
      const { data: events } = await supabase
        .from('element_events')
        .select(`
          id,
          status,
          previous_status,
          created_at,
          element:elements!inner (
            id,
            name,
            project:projects!inner (
              id,
              name,
              company_id
            )
          )
        `)
        .eq('element.project.company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (events) {
        events.forEach((event: BuyerEvent) => {
          const element = event.element
          const project = element?.project

          if (element && project) {
            notifications.push({
              id: event.id,
              type: 'element_status',
              title: `${element.name} status updated`,
              message: `Status changed from ${event.previous_status || 'none'} to ${event.status}`,
              timestamp: event.created_at || new Date().toISOString(),
              read: false,
              elementId: element.id,
              projectId: project.id
            })
          }
        })
      }
    }

    // For factory managers and admins: get recent element events
    if (profile.role === 'factory_manager' || profile.role === 'admin') {
      const { data: events } = await supabase
        .from('element_events')
        .select(`
          id,
          status,
          previous_status,
          created_at,
          element:elements!inner (
            id,
            name,
            project:projects (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (events) {
        events.forEach((event: AdminEvent) => {
          const element = event.element
          const project = element?.project

          if (element) {
            notifications.push({
              id: event.id,
              type: 'element_status',
              title: `${element.name} status updated`,
              message: `${project?.name || 'Project'}: ${event.previous_status || 'new'} → ${event.status}`,
              timestamp: event.created_at || new Date().toISOString(),
              read: false,
              elementId: element.id,
              projectId: project?.id
            })
          }
        })
      }
    }

    // For drivers: get delivery updates
    if (profile.role === 'driver') {
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select(`
          id,
          status,
          created_at,
          project:projects (
            id,
            name
          )
        `)
        .eq('driver_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (deliveries) {
        deliveries.forEach((delivery: DriverDelivery) => {
          const project = delivery.project

          notifications.push({
            id: delivery.id,
            type: 'delivery',
            title: `Delivery ${delivery.status}`,
            message: `${project?.name || 'Project'} delivery status: ${delivery.status}`,
            timestamp: delivery.created_at || new Date().toISOString(),
            read: false,
            deliveryId: delivery.id,
            projectId: project?.id
          })
        })
      }
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
  }

  // Sort by timestamp (most recent first)
  return notifications.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

/**
 * Get notification count for a user
 */
export async function getNotificationCount(userId: string): Promise<number> {
  const notifications = await getUnreadNotifications(userId)
  return notifications.length
}
