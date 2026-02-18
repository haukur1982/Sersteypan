'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedElement } from '@/lib/schemas/drawing-analysis'
import { mapElementType } from '@/lib/schemas/drawing-analysis'
import { estimateWeight } from './weight'

/**
 * Start AI drawing analysis for one or more uploaded documents.
 *
 * Creates drawing_analyses records and triggers the API route for each document.
 * Documents should already be uploaded to Supabase Storage as project_documents.
 */
export async function startDrawingAnalysis(
  projectId: string,
  documentIds: string[]
) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ekki innskráð/ur' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Aðeins stjórnandi getur greint teikningar' }
  }

  if (!documentIds.length) {
    return { error: 'Engin skjöl valin' }
  }

  // Fetch document info
  const { data: documents, error: docError } = await supabase
    .from('project_documents')
    .select('id, name')
    .eq('project_id', projectId)
    .in('id', documentIds)

  if (docError || !documents?.length) {
    return { error: 'Skjöl fundust ekki' }
  }

  // Create analysis records for each document
  const analysisRecords = documents.map((doc) => ({
    project_id: projectId,
    document_id: doc.id,
    document_name: doc.name || 'Ónefnt skjal',
    status: 'pending' as const,
    created_by: user.id,
  }))

  const { data: analyses, error: insertError } = await supabase
    .from('drawing_analyses')
    .insert(analysisRecords)
    .select('id, document_id')

  if (insertError || !analyses) {
    console.error('Error creating drawing analyses:', insertError)
    return { error: 'Villa við að búa til greiningu' }
  }

  // Return analysis IDs — the client will trigger the API route for each
  return {
    success: true,
    analyses: analyses.map((a) => ({
      id: a.id,
      documentId: a.document_id,
    })),
  }
}

/**
 * Update a single extracted element in an analysis during review.
 * Updates the JSONB array at the specified index.
 */
export async function updateExtractedElement(
  analysisId: string,
  elementIndex: number,
  updates: Partial<ExtractedElement>
) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ekki innskráð/ur' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Aðeins stjórnandi' }
  }

  // Fetch current analysis
  const { data: analysis, error: fetchError } = await supabase
    .from('drawing_analyses')
    .select('extracted_elements, status')
    .eq('id', analysisId)
    .single()

  if (fetchError || !analysis) {
    return { error: 'Greining fannst ekki' }
  }

  if (analysis.status === 'committed') {
    return { error: 'Ekki hægt að breyta greiningu sem hefur verið staðfest' }
  }

  // Update the element at the specified index
  const elements = (analysis.extracted_elements as ExtractedElement[]) || []
  if (elementIndex < 0 || elementIndex >= elements.length) {
    return { error: 'Ógilt einingar númer' }
  }

  elements[elementIndex] = { ...elements[elementIndex], ...updates }

  // Save back
  const { error: updateError } = await supabase
    .from('drawing_analyses')
    .update({
      extracted_elements: JSON.parse(JSON.stringify(elements)),
      status: 'reviewed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', analysisId)

  if (updateError) {
    console.error('Error updating extracted element:', updateError)
    return { error: 'Villa við að uppfæra einingu' }
  }

  return { success: true }
}

/**
 * THE CRITICAL ACTION: Commit reviewed elements to the database.
 *
 * This creates actual element records from the AI-extracted data.
 * Human review is required before this step — the admin selects which
 * elements to create and can edit any field.
 *
 * Safety: This is the only path from AI extraction to real data.
 */
export async function commitAnalysisElements(
  analysisId: string,
  selectedIndices: number[],
  buildingsToCreate?: { name: string; tempId: string }[]
) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ekki innskráð/ur' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Aðeins stjórnandi getur stofnað einingar' }
  }

  if (!selectedIndices.length) {
    return { error: 'Engar einingar valdar' }
  }

  // Fetch analysis
  const { data: analysis, error: fetchError } = await supabase
    .from('drawing_analyses')
    .select('*')
    .eq('id', analysisId)
    .single()

  if (fetchError || !analysis) {
    return { error: 'Greining fannst ekki' }
  }

  if (analysis.status === 'committed') {
    return { error: 'Þessi greining hefur þegar verið staðfest' }
  }

  if (analysis.status !== 'completed' && analysis.status !== 'reviewed') {
    return { error: 'Greining er ekki tilbúin til staðfestingar' }
  }

  const projectId = analysis.project_id
  const extractedElements =
    (analysis.extracted_elements as ExtractedElement[]) || []

  // Validate selected indices
  const selectedElements = selectedIndices
    .filter((i) => i >= 0 && i < extractedElements.length)
    .map((i) => extractedElements[i])

  if (!selectedElements.length) {
    return { error: 'Engar gildar einingar valdar' }
  }

  // Auto-create buildings if needed
  const buildingMap: Record<string, string> = {} // building name → building ID

  // First, fetch existing buildings
  const { data: existingBuildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('project_id', projectId)

  if (existingBuildings) {
    for (const b of existingBuildings) {
      buildingMap[b.name.toLowerCase()] = b.id
      // Also map without "Hús " prefix
      const stripped = b.name.toLowerCase().replace(/^hús\s+/i, '')
      buildingMap[stripped] = b.id
    }
  }

  // Create new buildings if requested
  if (buildingsToCreate?.length) {
    for (const bld of buildingsToCreate) {
      const { data: newBuilding, error: buildError } = await supabase
        .from('buildings')
        .insert({
          project_id: projectId,
          name: bld.name,
          floors: 6, // Default — can be edited later
        })
        .select('id')
        .single()

      if (buildError || !newBuilding) {
        console.error('Error creating building:', buildError)
        continue
      }

      buildingMap[bld.name.toLowerCase()] = newBuilding.id
      buildingMap[bld.tempId] = newBuilding.id
      // Map without "Hús " prefix
      const stripped = bld.name.toLowerCase().replace(/^hús\s+/i, '')
      buildingMap[stripped] = newBuilding.id
    }
  }

  // Expand elements with quantity > 1 into individual records
  const elementsToInsert: Array<{
    project_id: string
    building_id: string | null
    name: string
    element_type: string
    status: string
    floor: number | null
    length_mm: number | null
    width_mm: number | null
    height_mm: number | null
    weight_kg: number | null
    rebar_spec: string | null
    drawing_reference: string | null
    production_notes: string | null
    priority: number
    created_by: string
  }> = []

  for (const element of selectedElements) {
    const systemType = mapElementType(element.element_type)
    const buildingId = resolveBuildingId(element.building, buildingMap)

    // Determine weight
    let weightKg = element.weight_kg
    if (!weightKg && element.length_mm && element.width_mm) {
      const estimate = estimateWeight(
        element.length_mm,
        element.width_mm,
        element.height_mm,
        systemType
      )
      if (estimate) {
        weightKg = estimate.weightKg
      }
    }

    const drawingRef = analysis.document_name

    if (element.quantity > 1 && element.production_notes?.match(/\d+H:/)) {
      // Has per-floor breakdown — expand per floor
      const floorBreakdown = parseFloorBreakdown(element.production_notes)

      if (floorBreakdown.length > 0) {
        for (const { floor, count } of floorBreakdown) {
          for (let i = 1; i <= count; i++) {
            elementsToInsert.push({
              project_id: projectId,
              building_id: buildingId,
              name: `${element.name}-${floor}H-${i}`,
              element_type: systemType,
              status: 'planned',
              floor,
              length_mm: element.length_mm,
              width_mm: element.width_mm,
              height_mm: element.height_mm,
              weight_kg: weightKg,
              rebar_spec: element.rebar_spec,
              drawing_reference: drawingRef,
              production_notes: element.production_notes,
              priority: 0,
              created_by: user.id,
            })
          }
        }
      } else {
        // Couldn't parse floor breakdown — create quantity items without floor suffix
        for (let i = 1; i <= element.quantity; i++) {
          elementsToInsert.push({
            project_id: projectId,
            building_id: buildingId,
            name: `${element.name}-${i}`,
            element_type: systemType,
            status: 'planned',
            floor: element.floor,
            length_mm: element.length_mm,
            width_mm: element.width_mm,
            height_mm: element.height_mm,
            weight_kg: weightKg,
            rebar_spec: element.rebar_spec,
            drawing_reference: drawingRef,
            production_notes: element.production_notes,
            priority: 0,
            created_by: user.id,
          })
        }
      }
    } else {
      // Single element (quantity 1)
      elementsToInsert.push({
        project_id: projectId,
        building_id: buildingId,
        name: element.name,
        element_type: systemType,
        status: 'planned',
        floor: element.floor,
        length_mm: element.length_mm,
        width_mm: element.width_mm,
        height_mm: element.height_mm,
        weight_kg: weightKg,
        rebar_spec: element.rebar_spec,
        drawing_reference: drawingRef,
        production_notes: element.production_notes,
        priority: 0,
        created_by: user.id,
      })
    }
  }

  // Batch insert — Supabase supports up to 500 in one insert
  if (elementsToInsert.length > 500) {
    // Split into chunks of 500
    const chunks = []
    for (let i = 0; i < elementsToInsert.length; i += 500) {
      chunks.push(elementsToInsert.slice(i, i + 500))
    }

    let totalInserted = 0
    for (const chunk of chunks) {
      const { error: insertError } = await supabase
        .from('elements')
        .insert(chunk)

      if (insertError) {
        console.error('Error batch inserting elements:', insertError)
        return {
          error: `Villa við að stofna einingar. ${totalInserted} af ${elementsToInsert.length} stofnaðar.`,
        }
      }
      totalInserted += chunk.length
    }
  } else {
    const { error: insertError } = await supabase
      .from('elements')
      .insert(elementsToInsert)

    if (insertError) {
      console.error('Error batch inserting elements:', insertError)
      return { error: 'Villa við að stofna einingar. Reyndu aftur.' }
    }
  }

  // Update analysis record
  await supabase
    .from('drawing_analyses')
    .update({
      status: 'committed',
      elements_created: elementsToInsert.length,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', analysisId)

  // Revalidate pages
  revalidatePath('/admin/projects')
  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/admin/projects/${projectId}/analyze-drawings`)
  revalidatePath('/factory')
  revalidatePath('/factory/production')

  return {
    success: true,
    elementsCreated: elementsToInsert.length,
  }
}

/**
 * Delete an analysis (only if not committed)
 */
export async function deleteAnalysis(analysisId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ekki innskráð/ur' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Aðeins stjórnandi' }
  }

  // Check status
  const { data: analysis } = await supabase
    .from('drawing_analyses')
    .select('status, project_id')
    .eq('id', analysisId)
    .single()

  if (!analysis) {
    return { error: 'Greining fannst ekki' }
  }

  if (analysis.status === 'committed') {
    return { error: 'Ekki hægt að eyða greiningu sem hefur verið staðfest' }
  }

  const { error } = await supabase
    .from('drawing_analyses')
    .delete()
    .eq('id', analysisId)

  if (error) {
    console.error('Error deleting analysis:', error)
    return { error: 'Villa við að eyða greiningu' }
  }

  revalidatePath(`/admin/projects/${analysis.project_id}/analyze-drawings`)

  return { success: true }
}

// -- Helper Functions --

/**
 * Resolve a building name to a building ID from the map.
 * Handles variations like "A", "Hús A", "hús a", "HÚS A"
 */
function resolveBuildingId(
  building: string | null,
  buildingMap: Record<string, string>
): string | null {
  if (!building) return null

  const normalized = building.toLowerCase().trim()

  // Direct match
  if (buildingMap[normalized]) return buildingMap[normalized]

  // Try without "Hús " prefix
  const stripped = normalized.replace(/^hús\s+/i, '')
  if (buildingMap[stripped]) return buildingMap[stripped]

  // Try adding "Hús " prefix
  const withPrefix = `hús ${stripped}`
  if (buildingMap[withPrefix]) return buildingMap[withPrefix]

  return null
}

/**
 * Parse floor breakdown from production_notes.
 * Input: "4H: 3stk, 3H: 6stk, 2H: 6stk, 1H: 6stk"
 * Output: [{ floor: 4, count: 3 }, { floor: 3, count: 6 }, ...]
 */
function parseFloorBreakdown(
  notes: string
): { floor: number; count: number }[] {
  const results: { floor: number; count: number }[] = []
  // Match patterns like "4H: 3stk" or "4H: 3.stk" or "4H:3"
  const regex = /(\d+)\s*[Hh]\s*[.:]\s*(\d+)\s*\.?\s*stk?/g
  let match

  while ((match = regex.exec(notes)) !== null) {
    const floor = parseInt(match[1], 10)
    const count = parseInt(match[2], 10)
    if (!isNaN(floor) && !isNaN(count) && count > 0) {
      results.push({ floor, count })
    }
  }

  return results
}
