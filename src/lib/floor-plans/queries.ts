import { createClient } from '@/lib/supabase/server'
import type { FloorPlanData } from '@/components/floor-plans/GeometryFloorPlanViewer'

/**
 * Fetch unified floor plan data for a project.
 *
 * Merges two sources:
 * 1. Traditional image-based floor plans (floor_plans table)
 * 2. AI-extracted building geometries (building_floor_geometries table)
 *
 * Also attaches positioned elements (elements with position_x_mm/y_mm)
 * to geometry-based plans, and image-pinned elements to image-based plans.
 *
 * Returns a single sorted array ready for GeometryFloorPlanViewer.
 */
export async function getUnifiedFloorPlans(projectId: string): Promise<FloorPlanData[]> {
  const supabase = await createClient()

  // Fetch all three data sources in parallel
  const [floorPlansRes, geometriesRes, elementsRes, positionsRes] = await Promise.all([
    // 1. Traditional image-based floor plans
    supabase
      .from('floor_plans')
      .select('id, name, floor, plan_image_url')
      .eq('project_id', projectId)
      .order('floor', { ascending: true }),

    // 2. AI-extracted geometries
    supabase
      .from('building_floor_geometries')
      .select('id, floor, building_id, bounding_width_mm, bounding_height_mm, wall_segments, floor_zones, source_document_name')
      .eq('project_id', projectId)
      .order('floor', { ascending: true }),

    // 3. Elements with position data (for geometry-based views)
    supabase
      .from('elements')
      .select('id, name, status, element_type, floor, building_id, position_x_mm, position_y_mm, rotation_deg, length_mm, width_mm, height_mm, weight_kg')
      .eq('project_id', projectId)
      .not('position_x_mm', 'is', null)
      .not('position_y_mm', 'is', null),

    // 4. Element positions on image-based floor plans
    supabase
      .from('element_positions')
      .select(`
        id,
        floor_plan_id,
        element_id,
        x_percent,
        y_percent,
        rotation_degrees,
        elements:element_id (id, name, status, element_type, length_mm, width_mm, height_mm, weight_kg)
      `)
      .in(
        'floor_plan_id',
        // We'll filter after — Supabase doesn't support subqueries here easily
        [] // Will be populated below
      ),
  ])

  const floorPlans = floorPlansRes.data ?? []
  const geometries = geometriesRes.data ?? []
  const positionedElements = elementsRes.data ?? []

  // Re-fetch positions if we have floor plans
  let imagePositions: Array<{
    floor_plan_id: string
    element_id: string
    x_percent: number
    y_percent: number
    elements: { id: string; name: string; status: string | null; element_type: string } | null
  }> = []

  if (floorPlans.length > 0) {
    const fpIds = floorPlans.map(fp => fp.id)
    const { data: posData } = await supabase
      .from('element_positions')
      .select(`
        floor_plan_id,
        element_id,
        x_percent,
        y_percent,
        elements:element_id (id, name, status, element_type)
      `)
      .in('floor_plan_id', fpIds)

    imagePositions = (posData ?? []) as typeof imagePositions
  }

  // Build floor map — merge image-based and geometry-based by floor number
  const floorMap = new Map<number, FloorPlanData>()

  // Add geometry-based floors
  for (const geo of geometries) {
    const floor = geo.floor

    // Parse wall_segments and floor_zones from snake_case JSONB to camelCase
    const wallSegments = parseWallSegments(geo.wall_segments as unknown[])
    const floorZones = parseFloorZones(geo.floor_zones as unknown[])

    // Find positioned elements for this floor
    const floorElements = positionedElements
      .filter(el => (el.floor ?? 1) === floor)
      .map(el => ({
        id: el.id,
        name: el.name,
        status: el.status,
        element_type: el.element_type,
        position_x_mm: el.position_x_mm,
        position_y_mm: el.position_y_mm,
        rotation_deg: el.rotation_deg,
        length_mm: el.length_mm,
        width_mm: el.width_mm,
        height_mm: el.height_mm,
        weight_kg: el.weight_kg,
      }))

    floorMap.set(floor, {
      id: geo.id,
      name: geo.source_document_name ?? `Hæð ${floor}`,
      floor,
      plan_image_url: null,
      geometry: {
        boundingWidthMm: geo.bounding_width_mm,
        boundingHeightMm: geo.bounding_height_mm,
        wallSegments,
        floorZones,
      },
      elements: floorElements,
    })
  }

  // Add/merge image-based floor plans
  for (const fp of floorPlans) {
    const floor = fp.floor as number

    // Find image-pinned elements for this floor plan
    const pinnedElements = imagePositions
      .filter(pos => pos.floor_plan_id === fp.id && pos.elements)
      .map(pos => ({
        id: pos.elements!.id,
        name: pos.elements!.name,
        status: pos.elements!.status,
        element_type: pos.elements!.element_type,
        x_percent: pos.x_percent,
        y_percent: pos.y_percent,
      }))

    const existing = floorMap.get(floor)
    if (existing) {
      // Floor already has geometry — add image as fallback
      if (!existing.plan_image_url) {
        existing.plan_image_url = fp.plan_image_url as string
      }
      // Merge pinned elements (avoid duplicates by id)
      const existingIds = new Set(existing.elements.map(e => e.id))
      for (const el of pinnedElements) {
        if (!existingIds.has(el.id)) {
          existing.elements.push(el)
        }
      }
    } else {
      // New floor — image only
      floorMap.set(floor, {
        id: fp.id,
        name: fp.name,
        floor,
        plan_image_url: fp.plan_image_url as string,
        geometry: null,
        elements: pinnedElements,
      })
    }
  }

  // Sort by floor number
  return Array.from(floorMap.values()).sort((a, b) => a.floor - b.floor)
}

// ── JSONB parsers (snake_case → camelCase) ─────────────────

interface RawWallSegment {
  id: string
  x1_mm: number
  y1_mm: number
  x2_mm: number
  y2_mm: number
  thickness_mm: number
  wall_type: string
}

interface RawFloorZone {
  id: string
  name?: string
  points: Array<{ x_mm: number; y_mm: number }>
  zone_type: string
}

function parseWallSegments(raw: unknown[]): Array<{
  id: string
  x1Mm: number
  y1Mm: number
  x2Mm: number
  y2Mm: number
  thicknessMm: number
  wallType: 'outer' | 'inner' | 'sandwich'
}> {
  if (!Array.isArray(raw)) return []
  return (raw as RawWallSegment[]).map(w => ({
    id: w.id,
    x1Mm: w.x1_mm,
    y1Mm: w.y1_mm,
    x2Mm: w.x2_mm,
    y2Mm: w.y2_mm,
    thicknessMm: w.thickness_mm,
    wallType: (w.wall_type as 'outer' | 'inner' | 'sandwich') ?? 'outer',
  }))
}

function parseFloorZones(raw: unknown[]): Array<{
  id: string
  name?: string
  points: Array<{ xMm: number; yMm: number }>
  zoneType: 'interior' | 'balcony'
}> {
  if (!Array.isArray(raw)) return []
  return (raw as RawFloorZone[]).map(z => ({
    id: z.id,
    name: z.name,
    points: (z.points ?? []).map(p => ({ xMm: p.x_mm, yMm: p.y_mm })),
    zoneType: (z.zone_type as 'interior' | 'balcony') ?? 'interior',
  }))
}
