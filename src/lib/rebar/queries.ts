import { createClient } from '@/lib/supabase/server'

/**
 * Get all projects with rebar-relevant element counts.
 * Shows projects that have elements in 'planned' or 'rebar' status.
 */
export async function getRebarProjects() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      address,
      status,
      elements(
        id,
        status
      )
    `)
    .in('status', ['active', 'in_progress'])
    .order('name')

  if (error) {
    console.error('Error fetching rebar projects:', error)
    return []
  }

  // Compute rebar-relevant counts per project
  return (data || []).map((project) => {
    const elements = Array.isArray(project.elements) ? project.elements : []
    const needsRebar = elements.filter((e) => e.status === 'planned').length
    const rebarInProgress = elements.filter((e) => e.status === 'rebar').length
    const total = elements.length

    return {
      id: project.id,
      name: project.name,
      address: project.address,
      status: project.status,
      needsRebar,
      rebarInProgress,
      total,
    }
  }).filter((p) => p.needsRebar > 0 || p.rebarInProgress > 0)
}

/**
 * Get elements for a project, filtered to rebar-relevant statuses.
 * Returns elements in 'planned' or 'rebar' status for the rebar checklist.
 */
export async function getRebarElements(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('elements')
    .select(`
      id,
      name,
      element_type,
      status,
      floor,
      weight_kg,
      length_mm,
      width_mm,
      height_mm,
      rebar_spec,
      rebar_completed_at,
      position_description,
      drawing_reference,
      qr_code_url,
      piece_count,
      rebar_done_count,
      created_at,
      updated_at
    `)
    .eq('project_id', projectId)
    .in('status', ['planned', 'rebar'])
    .order('name_sort_key')

  if (error) {
    console.error('Error fetching rebar elements:', error)
    return []
  }

  return data || []
}

/**
 * Get a single element with full details for the rebar detail page.
 */
export async function getRebarElement(elementId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('elements')
    .select(`
      id,
      name,
      element_type,
      status,
      floor,
      weight_kg,
      length_mm,
      width_mm,
      height_mm,
      rebar_spec,
      rebar_completed_at,
      position_description,
      drawing_reference,
      qr_code_url,
      production_notes,
      project_id,
      piece_count,
      rebar_done_count,
      created_at,
      updated_at,
      project:projects(
        id,
        name,
        address
      )
    `)
    .eq('id', elementId)
    .single()

  if (error) {
    console.error('Error fetching rebar element:', error)
    return null
  }

  return data
}

/**
 * Get rebar-related documents for a project (drawings, rebar specs).
 */
export async function getRebarDocuments(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_documents')
    .select(`
      id,
      name,
      file_url,
      category,
      created_at
    `)
    .eq('project_id', projectId)
    .in('category', ['drawing', 'rebar'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching rebar documents:', error)
    return []
  }

  return data || []
}

/**
 * Dashboard summary: count of elements across all projects
 * that need rebar work or are in progress.
 */
export async function getRebarDashboardSummary() {
  const supabase = await createClient()

  const { count: plannedCount, error: e1 } = await supabase
    .from('elements')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'planned')

  const { count: inProgressCount, error: e2 } = await supabase
    .from('elements')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'rebar')

  if (e1 || e2) {
    console.error('Error fetching rebar summary:', e1 || e2)
  }

  return {
    needsRebar: plannedCount ?? 0,
    rebarInProgress: inProgressCount ?? 0,
  }
}
