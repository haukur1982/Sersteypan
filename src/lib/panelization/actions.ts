'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { panelizationCreateSchema, panelizationOpeningSchema } from '@/lib/schemas/panelization'
import { calculateWallPanels, calculateFiligranPanels } from './algorithm'
import type { PanelizationConstraints, OpeningDefinition } from './types'
import type { Database } from '@/types/database'

type LayoutRow = Database['public']['Tables']['panelization_layouts']['Row']
type PanelRow = Database['public']['Tables']['panelization_panels']['Row']
type OpeningRow = Database['public']['Tables']['panelization_openings']['Row']

// ── Helpers ──────────────────────────────────────────────────

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

/** Convert layout row to algorithm constraints */
function layoutToConstraints(layout: LayoutRow): PanelizationConstraints {
  return {
    maxPanelWidthMm: layout.max_panel_width_mm,
    preferredPanelWidthMm: layout.preferred_panel_width_mm,
    minPanelWidthMm: layout.min_panel_width_mm,
    maxPanelWeightKg: layout.max_panel_weight_kg,
    jointWidthMm: layout.joint_width_mm,
    concreteDensityKgM3: layout.concrete_density_kg_m3,
    maxTransportWidthMm: layout.max_transport_width_mm,
    maxTransportHeightMm: layout.max_transport_height_mm,
    maxTableLengthMm: layout.max_table_length_mm,
    maxTableWidthMm: layout.max_table_width_mm,
  }
}

/** Convert DB openings to algorithm openings */
function dbOpeningsToAlgorithm(openings: OpeningRow[]): OpeningDefinition[] {
  return openings.map(o => ({
    type: o.opening_type as 'window' | 'door' | 'other',
    offsetXMm: o.offset_x_mm,
    offsetYMm: o.offset_y_mm,
    widthMm: o.width_mm,
    heightMm: o.height_mm,
    label: o.label ?? undefined,
  }))
}

/** Run the algorithm and save panels to DB */
async function recalculateAndSavePanels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  layout: LayoutRow,
  openings: OpeningRow[]
) {
  const constraints = layoutToConstraints(layout)

  // Run algorithm
  const result = layout.mode === 'wall'
    ? calculateWallPanels({
        surface: {
          lengthMm: layout.surface_length_mm,
          heightMm: layout.surface_height_mm,
          thicknessMm: layout.thickness_mm,
        },
        openings: dbOpeningsToAlgorithm(openings),
        constraints,
        namePrefix: layout.name_prefix,
        floor: layout.floor ?? 1,
      })
    : calculateFiligranPanels({
        surface: {
          lengthMm: layout.surface_length_mm,
          heightMm: layout.surface_height_mm,
          thicknessMm: layout.thickness_mm,
        },
        constraints,
        stripDirection: (layout.strip_direction as 'length' | 'width') ?? 'length',
        namePrefix: layout.name_prefix,
        floor: layout.floor ?? 1,
      })

  // Delete old panels
  await supabase
    .from('panelization_panels')
    .delete()
    .eq('layout_id', layout.id)

  // Insert new panels
  if (result.panels.length > 0) {
    const panelInserts = result.panels.map(p => ({
      layout_id: layout.id,
      panel_index: p.index,
      name: p.name,
      offset_x_mm: p.offsetXMm,
      offset_y_mm: p.offsetYMm,
      width_mm: p.widthMm,
      height_mm: p.heightMm,
      thickness_mm: p.thicknessMm,
      weight_kg: p.weightKg,
      area_m2: p.areaM2,
      volume_m3: p.volumeM3,
      exceeds_weight: p.exceedsWeight,
      exceeds_transport: p.exceedsTransport,
      exceeds_table: p.exceedsTable,
      is_manually_adjusted: p.isManuallyAdjusted,
    }))

    const { error: insertError } = await supabase
      .from('panelization_panels')
      .insert(panelInserts)

    if (insertError) {
      console.error('Error inserting panels:', insertError)
      return { error: 'Villa við að vista plötur' }
    }
  }

  return { error: null, panelCount: result.panels.length }
}

// ── Actions ──────────────────────────────────────────────────

/**
 * Create a new panelization layout with auto-generated initial panels.
 */
export async function createPanelizationLayout(
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  // Parse form data
  const raw = {
    project_id: formData.get('project_id') as string,
    building_id: formData.get('building_id') as string,
    mode: formData.get('mode') as string,
    name: formData.get('name') as string,
    floor: Number(formData.get('floor') || 1),
    surface_length_mm: Number(formData.get('surface_length_mm')),
    surface_height_mm: Number(formData.get('surface_height_mm')),
    thickness_mm: Number(formData.get('thickness_mm')),
    name_prefix: (formData.get('name_prefix') as string) || (formData.get('mode') === 'wall' ? 'V' : 'F'),
    strip_direction: formData.get('strip_direction') as string | undefined,
  }

  const parsed = panelizationCreateSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { error: firstError?.message ?? 'Ógild gögn' }
  }

  const data = parsed.data

  // Insert layout
  const { data: layout, error: insertError } = await supabase
    .from('panelization_layouts')
    .insert({
      project_id: data.project_id,
      building_id: data.building_id ?? null,
      mode: data.mode,
      name: data.name,
      floor: data.floor,
      surface_length_mm: data.surface_length_mm,
      surface_height_mm: data.surface_height_mm,
      thickness_mm: data.thickness_mm,
      name_prefix: data.name_prefix,
      strip_direction: data.strip_direction ?? null,
      // Use provided constraints or keep DB defaults
      ...(data.max_panel_width_mm && { max_panel_width_mm: data.max_panel_width_mm }),
      ...(data.preferred_panel_width_mm && { preferred_panel_width_mm: data.preferred_panel_width_mm }),
      ...(data.min_panel_width_mm && { min_panel_width_mm: data.min_panel_width_mm }),
      ...(data.max_panel_weight_kg && { max_panel_weight_kg: data.max_panel_weight_kg }),
      ...(data.joint_width_mm !== undefined && { joint_width_mm: data.joint_width_mm }),
      ...(data.concrete_density_kg_m3 && { concrete_density_kg_m3: data.concrete_density_kg_m3 }),
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError || !layout) {
    console.error('Error creating layout:', insertError)
    return { error: 'Villa við að stofna plötusnið' }
  }

  // Auto-calculate initial panels
  await recalculateAndSavePanels(supabase, layout, [])

  // Redirect to editor
  revalidatePath(`/admin/projects/${data.project_id}/panelization`)
  redirect(`/admin/projects/${data.project_id}/panelization/${layout.id}`)
}

/**
 * Update layout constraints and recalculate panels.
 */
export async function updateLayoutConstraints(
  layoutId: string,
  constraints: Record<string, number>
) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  // Fetch layout
  const { data: layout, error: fetchError } = await supabase
    .from('panelization_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (fetchError || !layout) return { error: 'Plötusnið fannst ekki' }
  if (layout.status !== 'draft') return { error: 'Ekki hægt að breyta staðfestu plötuniði' }

  // Update constraints on the layout
  const { error: updateError } = await supabase
    .from('panelization_layouts')
    .update(constraints)
    .eq('id', layoutId)

  if (updateError) return { error: 'Villa við að uppfæra skorður' }

  // Re-fetch updated layout
  const { data: updatedLayout } = await supabase
    .from('panelization_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (!updatedLayout) return { error: 'Villa við að sækja uppfært plötusnið' }

  // Fetch openings
  const { data: openings } = await supabase
    .from('panelization_openings')
    .select('*')
    .eq('layout_id', layoutId)

  // Recalculate
  const result = await recalculateAndSavePanels(supabase, updatedLayout, openings ?? [])
  if (result.error) return { error: result.error }

  revalidatePath(`/admin/projects/${layout.project_id}/panelization/${layoutId}`)
  return { error: null, panelCount: result.panelCount }
}

/**
 * Add an opening to a wall layout and recalculate.
 */
export async function addOpening(layoutId: string, openingData: Record<string, unknown>) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  const parsed = panelizationOpeningSchema.safeParse(openingData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ógild gögn' }
  }

  // Fetch layout
  const { data: layout } = await supabase
    .from('panelization_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (!layout) return { error: 'Plötusnið fannst ekki' }
  if (layout.status !== 'draft') return { error: 'Ekki hægt að breyta staðfestu plötuniði' }
  if (layout.mode !== 'wall') return { error: 'Op er aðeins hægt að bæta við veggi' }

  // Validate opening fits within surface
  const opening = parsed.data
  if (opening.offset_x_mm + opening.width_mm > layout.surface_length_mm) {
    return { error: 'Op fer út fyrir veggflöt' }
  }
  if (opening.offset_y_mm + opening.height_mm > layout.surface_height_mm) {
    return { error: 'Op fer út fyrir veggflöt' }
  }

  // Insert opening
  const { error: insertError } = await supabase
    .from('panelization_openings')
    .insert({
      layout_id: layoutId,
      opening_type: opening.opening_type,
      offset_x_mm: opening.offset_x_mm,
      offset_y_mm: opening.offset_y_mm,
      width_mm: opening.width_mm,
      height_mm: opening.height_mm,
      label: opening.label ?? null,
    })

  if (insertError) return { error: 'Villa við að bæta við opi' }

  // Fetch all openings and recalculate
  const { data: allOpenings } = await supabase
    .from('panelization_openings')
    .select('*')
    .eq('layout_id', layoutId)

  await recalculateAndSavePanels(supabase, layout, allOpenings ?? [])

  revalidatePath(`/admin/projects/${layout.project_id}/panelization/${layoutId}`)
  return { error: null }
}

/**
 * Remove an opening and recalculate.
 */
export async function removeOpening(layoutId: string, openingId: string) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  const { data: layout } = await supabase
    .from('panelization_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (!layout) return { error: 'Plötusnið fannst ekki' }
  if (layout.status !== 'draft') return { error: 'Ekki hægt að breyta staðfestu plötuniði' }

  await supabase
    .from('panelization_openings')
    .delete()
    .eq('id', openingId)

  const { data: remainingOpenings } = await supabase
    .from('panelization_openings')
    .select('*')
    .eq('layout_id', layoutId)

  await recalculateAndSavePanels(supabase, layout, remainingOpenings ?? [])

  revalidatePath(`/admin/projects/${layout.project_id}/panelization/${layoutId}`)
  return { error: null }
}

/**
 * Commit panelization to real elements.
 * Follows the pattern from commitAnalysisElements in drawing-analysis/actions.ts.
 */
export async function commitPanelizationToElements(layoutId: string) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  // Fetch layout + panels
  const { data: layout } = await supabase
    .from('panelization_layouts')
    .select('*')
    .eq('id', layoutId)
    .single()

  if (!layout) return { error: 'Plötusnið fannst ekki' }
  if (layout.status === 'committed') return { error: 'Plötusnið hefur þegar verið staðfest' }

  const { data: panels } = await supabase
    .from('panelization_panels')
    .select('*')
    .eq('layout_id', layoutId)
    .order('panel_index', { ascending: true })

  if (!panels || panels.length === 0) {
    return { error: 'Engar plötur til að stofna einingar úr' }
  }

  // Map panels to element inserts
  // Dimension mapping depends on mode:
  // Wall: panel width → element length_mm, panel height → element width_mm, thickness → height_mm
  // Filigran: strip width → element width_mm, strip length → element length_mm, thickness → height_mm
  const elementsToInsert = panels.map(panel => ({
    project_id: layout.project_id,
    building_id: layout.building_id,
    name: panel.name,
    element_type: layout.mode === 'wall' ? 'wall' : 'filigran',
    status: 'planned' as const,
    floor: layout.floor,
    length_mm: layout.mode === 'wall' ? panel.width_mm : panel.height_mm,
    width_mm: layout.mode === 'wall' ? panel.height_mm : panel.width_mm,
    height_mm: panel.thickness_mm,
    weight_kg: panel.weight_kg,
    drawing_reference: layout.name,
    production_notes: `Frá plötuniði: ${layout.name}`,
    priority: 0,
    created_by: user.id,
  }))

  // Batch insert elements
  const { data: insertedElements, error: insertError } = await supabase
    .from('elements')
    .insert(elementsToInsert)
    .select('id')

  if (insertError) {
    console.error('Error inserting elements from panelization:', insertError)
    return { error: 'Villa við að stofna einingar' }
  }

  // Link panels to created elements
  if (insertedElements) {
    for (let i = 0; i < insertedElements.length && i < panels.length; i++) {
      await supabase
        .from('panelization_panels')
        .update({ element_id: insertedElements[i].id })
        .eq('id', panels[i].id)
    }
  }

  // Update layout status
  await supabase
    .from('panelization_layouts')
    .update({
      status: 'committed',
      elements_created: elementsToInsert.length,
    })
    .eq('id', layoutId)

  // Revalidate
  revalidatePath(`/admin/projects/${layout.project_id}`)
  revalidatePath(`/admin/projects/${layout.project_id}/panelization`)
  revalidatePath(`/admin/projects/${layout.project_id}/panelization/${layoutId}`)

  return { error: null, elementsCreated: elementsToInsert.length }
}

/**
 * Delete a draft panelization layout.
 */
export async function deletePanelizationLayout(layoutId: string) {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  const { data: layout } = await supabase
    .from('panelization_layouts')
    .select('project_id, status')
    .eq('id', layoutId)
    .single()

  if (!layout) return { error: 'Plötusnið fannst ekki' }
  if (layout.status === 'committed') return { error: 'Ekki hægt að eyða staðfestu plötuniði' }

  // CASCADE delete handles panels and openings
  const { error: deleteError } = await supabase
    .from('panelization_layouts')
    .delete()
    .eq('id', layoutId)

  if (deleteError) return { error: 'Villa við að eyða plötuniði' }

  revalidatePath(`/admin/projects/${layout.project_id}/panelization`)
  return { error: null }
}
