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
