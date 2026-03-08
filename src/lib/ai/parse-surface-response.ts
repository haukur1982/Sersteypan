/**
 * AI Surface Analysis — Response Parser
 *
 * Parses the combined surface + geometry response from AI.
 * Handles markdown stripping, JSON parsing, and Zod validation.
 * Geometry is extracted separately for saving to building_floor_geometries.
 */

import {
  validateSurfaceAnalysisResponse,
  extractedSurfaceSchema,
  geometryBlockSchema,
  type SurfaceAnalysisResponse,
  type ExtractedSurface,
  type GeometryBlock,
} from '@/lib/schemas/surface-analysis'

export type SurfaceParseResult =
  | {
      success: true
      data: SurfaceAnalysisResponse
      geometry: GeometryBlock | null
      validated: true
    }
  | {
      success: true
      data: {
        surfaces: ExtractedSurface[]
        page_description: string
        warnings: string[]
      }
      geometry: GeometryBlock | null
      validated: false
      validationIssues: string
    }
  | {
      success: false
      error: string
      rawText?: string
    }

/**
 * Try to extract and validate geometry from the raw parsed data.
 * Returns null if geometry is missing or invalid.
 */
function extractGeometry(rawData: Record<string, unknown>): GeometryBlock | null {
  if (!rawData?.geometry || typeof rawData.geometry !== 'object') return null
  const result = geometryBlockSchema.safeParse(rawData.geometry)
  return result.success ? result.data : null
}

/**
 * Parse AI response text into a validated surface analysis result.
 * Geometry is extracted alongside surfaces when present.
 */
export function parseSurfaceAnalysisResponse(
  responseText: string
): SurfaceParseResult {
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

  const rawData = parsed as Record<string, unknown>

  // 3. Extract geometry (independent of surface validation)
  const geometry = extractGeometry(rawData)

  // 4. Validate full response with Zod schema
  const validation = validateSurfaceAnalysisResponse(parsed)

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      geometry,
      validated: true,
    }
  }

  // 5. Salvage partial data — validate each surface individually
  const rawSurfaces = Array.isArray(rawData?.surfaces) ? rawData.surfaces : []
  const validSurfaces: ExtractedSurface[] = []
  const surfaceWarnings: string[] = []

  for (let i = 0; i < rawSurfaces.length; i++) {
    const result = extractedSurfaceSchema.safeParse(rawSurfaces[i])
    if (result.success) {
      validSurfaces.push(result.data)
    } else {
      const name =
        typeof rawSurfaces[i]?.name === 'string' ? rawSurfaces[i].name : `#${i}`
      surfaceWarnings.push(
        `Surface "${name}" skipped: ${result.error.issues.map((iss) => iss.message).join(', ')}`
      )
    }
  }

  const existingWarnings = Array.isArray(rawData?.warnings)
    ? (rawData.warnings as string[])
    : []

  return {
    success: true,
    data: {
      surfaces: validSurfaces,
      page_description:
        typeof rawData?.page_description === 'string'
          ? rawData.page_description
          : 'Greining lokið en sum gögn voru ófullnægjandi.',
      warnings: [...existingWarnings, ...surfaceWarnings],
    },
    geometry,
    validated: false,
    validationIssues: validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; '),
  }
}
