import { createClient } from '@/lib/supabase/server'

export interface PositionedElement {
  id: string
  name: string
  element_type: string
  status: string | null
  floor: number | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  weight_kg: number | null
  position_x_mm: number
  position_y_mm: number
  rotation_deg: number | null
  building_id: string | null
}

export interface FloorGeometry {
  id: string
  floor: number
  building_id: string | null
  bounding_width_mm: number
  bounding_height_mm: number
  wall_segments: unknown[]
  floor_zones: unknown[]
  source_document_name: string | null
}

export interface BuildingViewData {
  floors: Array<{
    floor: number
    buildingId: string | null
    geometry: FloorGeometry | null
    elements: PositionedElement[]
    boundingWidth: number
    boundingHeight: number
  }>
  totalElements: number
  positionedElements: number
}

/**
 * Fetch all positioned elements and their floor geometries for a project.
 * Groups by floor for the building view.
 */
export async function getBuildingViewData(
  projectId: string
): Promise<{ data: BuildingViewData | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Fetch elements that have position data
    const { data: elements, error: elemError } = await supabase
      .from('elements')
      .select(
        'id, name, element_type, status, floor, length_mm, width_mm, height_mm, weight_kg, position_x_mm, position_y_mm, rotation_deg, building_id'
      )
      .eq('project_id', projectId)
      .not('position_x_mm', 'is', null)
      .not('position_y_mm', 'is', null)
      .order('floor', { ascending: true })
      .order('name', { ascending: true })

    if (elemError) {
      console.error('getBuildingViewData elements error:', elemError)
      return { data: null, error: elemError.message }
    }

    if (!elements || elements.length === 0) {
      return {
        data: {
          floors: [],
          totalElements: 0,
          positionedElements: 0,
        },
        error: null,
      }
    }

    // Fetch geometries for the project
    const { data: geometries } = await supabase
      .from('building_floor_geometries')
      .select('id, floor, building_id, bounding_width_mm, bounding_height_mm, wall_segments, floor_zones, source_document_name')
      .eq('project_id', projectId)
      .order('floor', { ascending: true })

    // Get total element count for context
    const { count: totalCount } = await supabase
      .from('elements')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    // Group elements by floor
    const floorMap = new Map<
      number,
      {
        buildingId: string | null
        elements: PositionedElement[]
      }
    >()

    for (const el of elements) {
      const floor = el.floor ?? 1
      if (!floorMap.has(floor)) {
        floorMap.set(floor, { buildingId: el.building_id, elements: [] })
      }
      floorMap.get(floor)!.elements.push(el as PositionedElement)
    }

    // Build floor data with geometry
    const floors = Array.from(floorMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, { buildingId, elements: floorElements }]) => {
        // Find matching geometry
        const geo = geometries?.find(
          (g) => g.floor === floor && g.building_id === buildingId
        ) ?? null

        // Compute bounding box from geometry or elements
        let boundingWidth = geo?.bounding_width_mm ?? 0
        let boundingHeight = geo?.bounding_height_mm ?? 0

        if (!boundingWidth || !boundingHeight) {
          // Derive from element positions + dimensions
          for (const el of floorElements) {
            const rot = el.rotation_deg ?? 0
            const isVertical = rot >= 45 && rot <= 135
            const elW = isVertical ? (el.width_mm ?? 0) : (el.length_mm ?? 0)
            const elH = isVertical ? (el.length_mm ?? 0) : (el.width_mm ?? 0)
            boundingWidth = Math.max(boundingWidth, el.position_x_mm + elW)
            boundingHeight = Math.max(boundingHeight, el.position_y_mm + elH)
          }
          // Add 5% padding
          boundingWidth = Math.ceil(boundingWidth * 1.05)
          boundingHeight = Math.ceil(boundingHeight * 1.05)
        }

        return {
          floor,
          buildingId,
          geometry: geo as FloorGeometry | null,
          elements: floorElements,
          boundingWidth,
          boundingHeight,
        }
      })

    return {
      data: {
        floors,
        totalElements: totalCount ?? elements.length,
        positionedElements: elements.length,
      },
      error: null,
    }
  } catch (err) {
    console.error('getBuildingViewData unexpected error:', err)
    return { data: null, error: 'Unexpected error' }
  }
}
