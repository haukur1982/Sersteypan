import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']
type OpeningRow = Database['public']['Tables']['panelization_openings']['Row']

// ── Queries ──────────────────────────────────────────────────

/**
 * Get all panelization layouts across all projects (admin hub page).
 * Joins project name for display.
 */
export async function getAllLayouts() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('panelization_layouts')
      .select('*, profiles:created_by(full_name), project:projects(name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAllLayouts error:', error)
      return { data: [] as (LayoutRow & { profiles: { full_name: string } | null; project: { name: string } | null })[], error: error.message }
    }

    return { data: data ?? [], error: null }
  } catch (err) {
    console.error('getAllLayouts unexpected error:', err)
    return { data: [] as (LayoutRow & { profiles: { full_name: string } | null; project: { name: string } | null })[], error: 'Unexpected error' }
  }
}

/**
 * Get all panelization layouts for a project.
 */
export async function getLayoutsForProject(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('panelization_layouts')
    .select('*, profiles:created_by(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getLayoutsForProject error:', error)
    return { data: [] as (LayoutRow & { profiles: { full_name: string } | null })[], error: error.message }
  }

  return { data: data ?? [], error: null }
}

/**
 * Get a single layout with all its panels and openings.
 */
export async function getLayoutWithDetails(layoutId: string) {
  const supabase = await createClient()

  // Fetch layout
  const { data: layout, error: layoutError } = await supabase
    .from('panelization_layouts')
    .select('*, profiles:created_by(full_name)')
    .eq('id', layoutId)
    .single()

  if (layoutError || !layout) {
    console.error('getLayoutWithDetails error:', layoutError)
    return { layout: null, panels: [], openings: [], error: layoutError?.message ?? 'Plötusnið fannst ekki' }
  }

  // Fetch panels and openings in parallel
  const [panelsResult, openingsResult] = await Promise.all([
    supabase
      .from('panelization_panels')
      .select('*')
      .eq('layout_id', layoutId)
      .order('panel_index', { ascending: true }),
    supabase
      .from('panelization_openings')
      .select('*')
      .eq('layout_id', layoutId)
      .order('offset_x_mm', { ascending: true }),
  ])

  return {
    layout: layout as LayoutRow & { profiles: { full_name: string } | null },
    panels: (panelsResult.data ?? []) as PanelRow[],
    openings: (openingsResult.data ?? []) as OpeningRow[],
    error: null,
  }
}
