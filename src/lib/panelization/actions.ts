'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { panelizationCreateSchema, panelizationOpeningSchema } from '@/lib/schemas/panelization'
import { calculateWallPanels, calculateFiligranPanels } from './algorithm'
import {
  DEFAULT_WALL_THICKNESS_MM,
  DEFAULT_FILIGRAN_THICKNESS_MM,
  WALL_CONSTRAINT_OVERRIDES,
  FILIGRAN_CONSTRAINT_OVERRIDES,
  WALL_THICKNESSES,
} from './types'
import type { PanelizationConstraints, OpeningDefinition, WallType } from './types'
import type { Database } from '@/types/database'
import type { ExtractedElement } from '@/lib/schemas/drawing-analysis'
import { mapElementType } from '@/lib/schemas/drawing-analysis'
import type { ExtractedSurface } from '@/lib/schemas/surface-analysis'

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

// ── Field Labels (Icelandic) ────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  name: 'Heiti',
  mode: 'Tegund',
  surface_length_mm: 'Lengd',
  surface_height_mm: 'Hæð/Breidd',
  thickness_mm: 'Þykkt',
  floor: 'Hæð',
  project_id: 'Verkefni',
  building_id: 'Bygging',
  name_prefix: 'Forskeyti',
  strip_direction: 'Stefna remsna',
}

function formatZodError(issues: { path: PropertyKey[]; message: string }[]): string {
  const first = issues[0]
  if (!first) return 'Ógild gögn'
  const fieldKey = String(first.path[0] ?? '')
  const label = FIELD_LABELS[fieldKey] || fieldKey
  return `${label}: ${first.message}`
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

  const mode = formData.get('mode') as string
  const floor = Number(formData.get('floor') || 1)
  const wallType = formData.get('wall_type') as WallType | null

  // Auto-generate name if empty
  let name = (formData.get('name') as string)?.trim()
  if (!name) {
    const label = mode === 'wall' ? 'Veggur' : 'Gólfplata'
    name = `${label} ${floor}H`
  }

  // Auto-set thickness from wall type if applicable
  let thickness = Number(formData.get('thickness_mm'))
  if (mode === 'wall' && wallType && WALL_THICKNESSES[wallType]) {
    thickness = WALL_THICKNESSES[wallType]
  }

  // Parse form data
  const raw = {
    project_id: formData.get('project_id') as string,
    building_id: (formData.get('building_id') as string) ?? '',
    mode,
    name,
    floor,
    surface_length_mm: Number(formData.get('surface_length_mm')),
    surface_height_mm: Number(formData.get('surface_height_mm')),
    thickness_mm: thickness,
    name_prefix: (formData.get('name_prefix') as string) || (mode === 'wall' ? 'V' : 'F'),
    ...(formData.get('strip_direction') && { strip_direction: formData.get('strip_direction') as string }),
  }

  const parsed = panelizationCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error.issues) }
  }

  const data = parsed.data

  // Apply mode-specific constraint overrides
  const modeOverrides = data.mode === 'wall'
    ? WALL_CONSTRAINT_OVERRIDES
    : FILIGRAN_CONSTRAINT_OVERRIDES

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
      // Apply mode-specific defaults, then user overrides
      ...(modeOverrides.maxPanelWidthMm && { max_panel_width_mm: modeOverrides.maxPanelWidthMm }),
      ...(modeOverrides.maxTableLengthMm && { max_table_length_mm: modeOverrides.maxTableLengthMm }),
      ...(modeOverrides.maxTransportHeightMm && { max_transport_height_mm: modeOverrides.maxTransportHeightMm }),
      // User-provided constraints override mode defaults
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
 * Create panelization layouts from AI drawing analysis results.
 *
 * Takes selected wall/filigran elements from an analysis and creates
 * one panelization layout per element with auto-calculated panels.
 * This connects the AI drawing analysis pipeline to the panelization tool.
 */
export async function createPanelizationFromAnalysis(
  analysisId: string,
  projectId: string,
  selectedIndices: number[]
): Promise<{ error: string | null; layoutIds?: string[]; count?: number }> {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  // Fetch the analysis to get extracted elements
  const { data: analysis } = await supabase
    .from('drawing_analyses')
    .select('extracted_elements')
    .eq('id', analysisId)
    .single()

  if (!analysis) return { error: 'Greining fannst ekki' }

  // Handle both formats: flat array (legacy) or response object with { elements, slab_area }
  const rawPan = analysis.extracted_elements as unknown
  const allElements: ExtractedElement[] = Array.isArray(rawPan)
    ? rawPan as ExtractedElement[]
    : (rawPan && typeof rawPan === 'object' && 'elements' in (rawPan as Record<string, unknown>))
      ? ((rawPan as Record<string, unknown>).elements as ExtractedElement[]) ?? []
      : []

  // Fetch existing buildings for name → id matching
  const { data: existingBuildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('project_id', projectId)

  // Build a fuzzy lookup map: lowercase name → building_id
  const buildingMap = new Map<string, string>()
  for (const b of existingBuildings ?? []) {
    buildingMap.set(b.name.toLowerCase(), b.id)
    // Also index without "Hús " prefix for matching "A" → "Hús A"
    const stripped = b.name.toLowerCase().replace(/^hús\s+/i, '')
    if (stripped !== b.name.toLowerCase()) {
      buildingMap.set(stripped, b.id)
    }
  }

  const layoutIds: string[] = []

  for (const idx of selectedIndices) {
    const el = allElements[idx]
    if (!el) continue

    const systemType = mapElementType(el.element_type)
    if (systemType !== 'wall' && systemType !== 'filigran') continue

    const isWall = systemType === 'wall'

    // Map extracted dimensions to panelization surface
    // Drawing analysis: length_mm = longest span, width_mm = second span, height_mm = thickness
    const surfaceLengthMm = el.length_mm
    const surfaceHeightMm = el.width_mm
    const thicknessMm = el.height_mm ?? (isWall ? DEFAULT_WALL_THICKNESS_MM : DEFAULT_FILIGRAN_THICKNESS_MM)

    // Skip elements without sufficient dimensions
    if (!surfaceLengthMm || !surfaceHeightMm) continue

    // Match building name to existing building_id
    let buildingId: string | null = null
    if (el.building) {
      const lower = el.building.toLowerCase()
      buildingId = buildingMap.get(lower)
        ?? buildingMap.get(lower.replace(/^hús\s+/i, ''))
        ?? null
    }

    const namePrefix = isWall ? 'V' : 'F'
    const floor = el.floor ?? 1

    // Insert the panelization layout
    const { data: layout, error: insertError } = await supabase
      .from('panelization_layouts')
      .insert({
        project_id: projectId,
        building_id: buildingId,
        mode: isWall ? 'wall' : 'filigran',
        name: el.name || `${isWall ? 'Veggur' : 'Gólfplata'} ${idx + 1}`,
        floor,
        surface_length_mm: surfaceLengthMm,
        surface_height_mm: surfaceHeightMm,
        thickness_mm: thicknessMm,
        name_prefix: namePrefix,
        strip_direction: isWall ? null : 'length',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !layout) {
      console.error('Error creating layout from analysis:', insertError)
      continue
    }

    // Auto-calculate initial panels (no openings from drawing analysis yet)
    await recalculateAndSavePanels(supabase, layout, [])

    layoutIds.push(layout.id)
  }

  if (layoutIds.length === 0) {
    return { error: 'Engar einingar með nægileg mál fundust til að búa til plötusnið' }
  }

  revalidatePath(`/admin/projects/${projectId}/panelization`)

  return { error: null, layoutIds, count: layoutIds.length }
}

/**
 * Create panelization layouts from AI surface analysis results.
 *
 * Unlike createPanelizationFromAnalysis (which works with ExtractedElement),
 * this handles ExtractedSurface objects from architectural floor plan analysis.
 * Each surface already has the right structure: wall type, thickness, openings.
 */
export async function createPanelizationFromSurfaces(
  analysisId: string,
  projectId: string,
  selectedIndices: number[]
): Promise<{ error: string | null; layoutIds?: string[]; count?: number }> {
  const { supabase, user, error: authError } = await getAdminUser()
  if (authError || !user) return { error: authError ?? 'Óþekkt villa' }

  // Fetch the analysis to get extracted surfaces
  const { data: analysis } = await supabase
    .from('drawing_analyses')
    .select('extracted_elements, analysis_mode')
    .eq('id', analysisId)
    .single()

  if (!analysis) return { error: 'Greining fannst ekki' }
  if (analysis.analysis_mode !== 'surfaces') {
    return { error: 'Þessi greining er ekki plötugreining' }
  }

  const allSurfaces = (analysis.extracted_elements as unknown as ExtractedSurface[]) ?? []

  // Fetch existing buildings for name → id matching
  const { data: existingBuildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('project_id', projectId)

  const buildingMap = new Map<string, string>()
  for (const b of existingBuildings ?? []) {
    buildingMap.set(b.name.toLowerCase(), b.id)
    const stripped = b.name.toLowerCase().replace(/^hús\s+/i, '')
    if (stripped !== b.name.toLowerCase()) {
      buildingMap.set(stripped, b.id)
    }
  }

  const layoutIds: string[] = []

  for (const idx of selectedIndices) {
    const surface = allSurfaces[idx]
    if (!surface) continue

    const isWall = surface.surface_type === 'wall'
    const mode = isWall ? 'wall' : 'filigran'

    // Use wall_type thickness or surface thickness
    const thicknessMm = surface.thickness_mm
    const modeOverrides = isWall ? WALL_CONSTRAINT_OVERRIDES : FILIGRAN_CONSTRAINT_OVERRIDES

    // Match building name
    let buildingId: string | null = null
    if (surface.building) {
      const lower = surface.building.toLowerCase()
      buildingId = buildingMap.get(lower)
        ?? buildingMap.get(lower.replace(/^hús\s+/i, ''))
        ?? null
    }

    const namePrefix = isWall ? 'V' : 'F'
    const floor = surface.floor ?? 1

    // Insert the panelization layout with mode-specific constraints
    const { data: layout, error: insertError } = await supabase
      .from('panelization_layouts')
      .insert({
        project_id: projectId,
        building_id: buildingId,
        mode,
        name: surface.name,
        floor,
        surface_length_mm: surface.length_mm,
        surface_height_mm: surface.height_mm,
        thickness_mm: thicknessMm,
        name_prefix: namePrefix,
        strip_direction: isWall ? null : 'length',
        ...(modeOverrides.maxPanelWidthMm && { max_panel_width_mm: modeOverrides.maxPanelWidthMm }),
        ...(modeOverrides.maxTableLengthMm && { max_table_length_mm: modeOverrides.maxTableLengthMm }),
        ...(modeOverrides.maxTransportHeightMm && { max_transport_height_mm: modeOverrides.maxTransportHeightMm }),
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !layout) {
      console.error('Error creating layout from surface:', insertError)
      continue
    }

    // Insert openings from the surface (walls only)
    const openingRows: OpeningRow[] = []
    if (isWall && surface.openings?.length > 0) {
      const openingInserts = surface.openings.map((o) => ({
        layout_id: layout.id,
        opening_type: o.type,
        offset_x_mm: o.offset_x_mm,
        offset_y_mm: o.offset_y_mm,
        width_mm: o.width_mm,
        height_mm: o.height_mm,
        label: o.label ?? null,
      }))

      const { data: insertedOpenings } = await supabase
        .from('panelization_openings')
        .insert(openingInserts)
        .select()

      if (insertedOpenings) {
        openingRows.push(...insertedOpenings)
      }
    }

    // Auto-calculate panels with openings
    await recalculateAndSavePanels(supabase, layout, openingRows)

    layoutIds.push(layout.id)
  }

  if (layoutIds.length === 0) {
    return { error: 'Engir fletir með nægileg mál fundust til að búa til plötusnið' }
  }

  revalidatePath(`/admin/projects/${projectId}/panelization`)

  return { error: null, layoutIds, count: layoutIds.length }
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
