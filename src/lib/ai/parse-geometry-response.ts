/**
 * AI Building Geometry — Response Parser
 *
 * Same pattern as parse-surface-response.ts but for geometry extraction.
 * Handles markdown stripping, JSON parsing, Zod validation, and
 * partial data salvage.
 */

import {
  validateBuildingGeometryResponse,
  wallSegmentSchema,
  floorZoneSchema,
  type BuildingGeometryResponse,
  type WallSegmentInput,
  type FloorZoneInput,
} from '@/lib/schemas/building-geometry'

export type GeometryParseResult =
  | {
      success: true
      data: BuildingGeometryResponse
      validated: true
    }
  | {
      success: true
      data: {
        bounding_width_mm: number
        bounding_height_mm: number
        wall_segments: WallSegmentInput[]
        floor_zones: FloorZoneInput[]
        scale: string | null
        floor: number | null
        building: string | null
        drawing_reference: string | null
        general_notes: string | null
        warnings: string[]
      }
      validated: false
      validationIssues: string
    }
  | {
      success: false
      error: string
      rawText?: string
    }

/**
 * Parse AI response text into a validated building geometry result.
 */
export function parseGeometryAnalysisResponse(
  responseText: string
): GeometryParseResult {
  // 1. Strip markdown code blocks if present
  let jsonText = responseText.trim()
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim()
  }

  // 2. Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {
      success: false,
      error: 'AI returned invalid JSON response',
      rawText: responseText.slice(0, 2000),
    }
  }

  // 3. Validate with Zod schema
  const validation = validateBuildingGeometryResponse(parsed)

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      validated: true,
    }
  }

  // 4. Salvage partial data — validate each wall/zone individually
  const rawData = parsed as Record<string, unknown>

  const rawWalls = Array.isArray(rawData?.wall_segments)
    ? rawData.wall_segments
    : []
  const validWalls: WallSegmentInput[] = []
  const wallWarnings: string[] = []

  for (let i = 0; i < rawWalls.length; i++) {
    const result = wallSegmentSchema.safeParse(rawWalls[i])
    if (result.success) {
      validWalls.push(result.data)
    } else {
      const id =
        typeof rawWalls[i]?.id === 'string' ? rawWalls[i].id : `#${i}`
      wallWarnings.push(
        `Wall "${id}" skipped: ${result.error.issues.map((iss) => iss.message).join(', ')}`
      )
    }
  }

  const rawZones = Array.isArray(rawData?.floor_zones)
    ? rawData.floor_zones
    : []
  const validZones: FloorZoneInput[] = []
  const zoneWarnings: string[] = []

  for (let i = 0; i < rawZones.length; i++) {
    const result = floorZoneSchema.safeParse(rawZones[i])
    if (result.success) {
      validZones.push(result.data)
    } else {
      const name =
        typeof rawZones[i]?.name === 'string' ? rawZones[i].name : `#${i}`
      zoneWarnings.push(
        `Zone "${name}" skipped: ${result.error.issues.map((iss) => iss.message).join(', ')}`
      )
    }
  }

  // Try to get bounding box — required for rendering
  const boundingWidth =
    typeof rawData?.bounding_width_mm === 'number' && rawData.bounding_width_mm > 0
      ? rawData.bounding_width_mm
      : inferBoundingWidth(validWalls)
  const boundingHeight =
    typeof rawData?.bounding_height_mm === 'number' && rawData.bounding_height_mm > 0
      ? rawData.bounding_height_mm
      : inferBoundingHeight(validWalls)

  if (boundingWidth === 0 || boundingHeight === 0) {
    return {
      success: false,
      error:
        'Could not determine building bounding box from AI response. No valid wall coordinates found.',
      rawText: responseText.slice(0, 2000),
    }
  }

  const existingWarnings = Array.isArray(rawData?.warnings)
    ? (rawData.warnings as string[])
    : []

  return {
    success: true,
    data: {
      bounding_width_mm: boundingWidth,
      bounding_height_mm: boundingHeight,
      wall_segments: validWalls,
      floor_zones: validZones,
      scale: typeof rawData?.scale === 'string' ? rawData.scale : null,
      floor: typeof rawData?.floor === 'number' ? rawData.floor : null,
      building: typeof rawData?.building === 'string' ? rawData.building : null,
      drawing_reference:
        typeof rawData?.drawing_reference === 'string'
          ? rawData.drawing_reference
          : null,
      general_notes:
        typeof rawData?.general_notes === 'string' ? rawData.general_notes : null,
      warnings: [...existingWarnings, ...wallWarnings, ...zoneWarnings],
    },
    validated: false,
    validationIssues: validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; '),
  }
}

/**
 * Infer bounding width from wall coordinates when the AI doesn't provide it.
 */
function inferBoundingWidth(walls: WallSegmentInput[]): number {
  if (walls.length === 0) return 0
  let maxX = 0
  for (const w of walls) {
    maxX = Math.max(maxX, w.x1_mm, w.x2_mm)
  }
  return maxX
}

/**
 * Infer bounding height from wall coordinates when the AI doesn't provide it.
 */
function inferBoundingHeight(walls: WallSegmentInput[]): number {
  if (walls.length === 0) return 0
  let maxY = 0
  for (const w of walls) {
    maxY = Math.max(maxY, w.y1_mm, w.y2_mm)
  }
  return maxY
}
