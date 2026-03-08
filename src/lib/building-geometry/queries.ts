import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type GeometryRow =
  Database['public']['Tables']['building_floor_geometries']['Row']

/**
 * Get all building geometries for a project.
 */
export async function getGeometriesForProject(projectId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('building_floor_geometries')
      .select('*')
      .eq('project_id', projectId)
      .order('floor', { ascending: true })

    if (error) {
      console.error('getGeometriesForProject error:', error)
      return {
        data: [] as GeometryRow[],
        error: error.message,
      }
    }

    return { data: (data ?? []) as GeometryRow[], error: null }
  } catch (err) {
    console.error('getGeometriesForProject unexpected error:', err)
    return {
      data: [] as GeometryRow[],
      error: 'Unexpected error',
    }
  }
}

/**
 * Get a single geometry with linked panelization layouts and panels.
 */
export async function getGeometryWithLayouts(geometryId: string) {
  try {
    const supabase = await createClient()

    // Fetch geometry
    const { data: geometry, error: geoError } = await supabase
      .from('building_floor_geometries')
      .select('*')
      .eq('id', geometryId)
      .single()

    if (geoError || !geometry) {
      console.error('getGeometryWithLayouts error:', geoError)
      return {
        geometry: null,
        layouts: [],
        error: geoError?.message ?? 'Byggingarmynd fannst ekki',
      }
    }

    // Fetch linked layouts (those that have geometry_zone_id matching zones in this geometry)
    const { data: layouts } = await supabase
      .from('panelization_layouts')
      .select('*, panelization_panels(*)')
      .eq('project_id', geometry.project_id)
      .not('geometry_zone_id', 'is', null)

    return {
      geometry: geometry as GeometryRow,
      layouts: layouts ?? [],
      error: null,
    }
  } catch (err) {
    console.error('getGeometryWithLayouts unexpected error:', err)
    return { geometry: null, layouts: [], error: 'Unexpected error' }
  }
}
