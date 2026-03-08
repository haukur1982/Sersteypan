'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateBuildingGeometryResponse } from '@/lib/schemas/building-geometry'

// ── Helpers ──────────────────────────────────────────────────

async function getAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: 'Ekki innskráð/ur' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { supabase, user: null, error: 'Aðeins stjórnandi hefur aðgang' }
  }

  return { supabase, user, error: null }
}

// ── Actions ──────────────────────────────────────────────────

/**
 * Save geometry from a completed AI analysis into building_floor_geometries.
 * Called after the user reviews the AI extraction result.
 */
export async function saveGeometryFromAnalysis(
  analysisId: string,
  projectId: string,
  buildingId: string | null,
  floor: number
) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError || 'Unauthorized' }

  // Fetch the analysis to get extracted geometry
  const { data: analysis, error: fetchError } = await supabase
    .from('drawing_analyses')
    .select('extracted_elements, document_name, analysis_mode')
    .eq('id', analysisId)
    .single()

  if (fetchError || !analysis) {
    return { error: 'Greining fannst ekki' }
  }

  if (analysis.analysis_mode !== 'geometry') {
    return { error: 'Þetta er ekki byggingarmyndagreining' }
  }

  // Validate the extracted geometry data
  const validation = validateBuildingGeometryResponse(analysis.extracted_elements)
  if (!validation.success) {
    return {
      error: 'Gögn frá AI eru ógild. Reyndu aftur.',
    }
  }

  const geoData = validation.data

  // Insert into building_floor_geometries
  const { data: inserted, error: insertError } = await supabase
    .from('building_floor_geometries')
    .insert({
      project_id: projectId,
      building_id: buildingId,
      floor,
      drawing_analysis_id: analysisId,
      source_document_name: analysis.document_name,
      bounding_width_mm: geoData.bounding_width_mm,
      bounding_height_mm: geoData.bounding_height_mm,
      wall_segments: geoData.wall_segments as unknown as Record<string, unknown>[],
      floor_zones: geoData.floor_zones as unknown as Record<string, unknown>[],
      scale: geoData.scale ?? null,
      general_notes: geoData.general_notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('saveGeometryFromAnalysis insert error:', insertError)
    return { error: 'Ekki tókst að vista byggingarmynd' }
  }

  revalidatePath(`/admin/projects/${projectId}/panelization`)

  return { geometryId: inserted.id, error: null }
}

/**
 * Link a panelization layout to a geometry zone.
 */
export async function linkLayoutToZone(
  layoutId: string,
  geometryId: string,
  zoneId: string
) {
  const { supabase, error: authError } = await getAdminUser()
  if (authError) return { error: authError }

  // Verify the geometry exists and the zone is valid
  const { data: geometry, error: geoError } = await supabase
    .from('building_floor_geometries')
    .select('floor_zones, project_id')
    .eq('id', geometryId)
    .single()

  if (geoError || !geometry) {
    return { error: 'Byggingarmynd fannst ekki' }
  }

  const zones = geometry.floor_zones as Array<{ id: string }>
  if (!zones.some((z) => z.id === zoneId)) {
    return { error: 'Svæði fannst ekki í byggingarmynd' }
  }

  const { error: updateError } = await supabase
    .from('panelization_layouts')
    .update({ geometry_zone_id: `${geometryId}:${zoneId}` })
    .eq('id', layoutId)

  if (updateError) {
    console.error('linkLayoutToZone error:', updateError)
    return { error: 'Ekki tókst að tengja plötusnið við svæði' }
  }

  revalidatePath(`/admin/projects/${geometry.project_id}/panelization`)

  return { error: null }
}

/**
 * Auto-link panelization layouts to geometry zones by matching names.
 * Tries to match layout surface names to zone names.
 */
export async function autoLinkLayoutsToZones(
  geometryId: string,
  projectId: string
) {
  const { supabase, error: authError } = await getAdminUser()
  if (authError) return { error: authError, linked: 0 }

  // Get geometry zones
  const { data: geometry, error: geoError } = await supabase
    .from('building_floor_geometries')
    .select('floor_zones, floor')
    .eq('id', geometryId)
    .single()

  if (geoError || !geometry) {
    return { error: 'Byggingarmynd fannst ekki', linked: 0 }
  }

  const zones = geometry.floor_zones as Array<{
    id: string
    name: string
    zone_type: string
  }>

  // Get unlinked layouts for this project
  const { data: layouts, error: layoutError } = await supabase
    .from('panelization_layouts')
    .select('id, name, floor')
    .eq('project_id', projectId)
    .is('geometry_zone_id', null)

  if (layoutError || !layouts) {
    return { error: 'Ekki tókst að sækja plötusnið', linked: 0 }
  }

  let linked = 0

  for (const layout of layouts) {
    // Match by name similarity
    const matchingZone = zones.find((zone) => {
      const zoneName = zone.name.toLowerCase()
      const layoutName = (layout.name ?? '').toLowerCase()
      return (
        zoneName === layoutName ||
        zoneName.includes(layoutName) ||
        layoutName.includes(zoneName)
      )
    })

    if (matchingZone) {
      const { error: updateError } = await supabase
        .from('panelization_layouts')
        .update({
          geometry_zone_id: `${geometryId}:${matchingZone.id}`,
        })
        .eq('id', layout.id)

      if (!updateError) linked++
    }
  }

  if (linked > 0) {
    revalidatePath(`/admin/projects/${projectId}/panelization`)
  }

  return { error: null, linked }
}
