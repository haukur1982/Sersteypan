/**
 * AI Surface Analysis — Response Parser
 *
 * Same pattern as parse-response.ts but for surface analysis results.
 * Handles markdown stripping, JSON parsing, and Zod validation.
 */

import {
  validateSurfaceAnalysisResponse,
  extractedSurfaceSchema,
  type SurfaceAnalysisResponse,
  type ExtractedSurface,
} from '@/lib/schemas/surface-analysis'

export type SurfaceParseResult =
  | {
      success: true
      data: SurfaceAnalysisResponse
      validated: true
    }
  | {
      success: true
      data: {
        surfaces: ExtractedSurface[]
        page_description: string
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
 * Parse AI response text into a validated surface analysis result.
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

  // 3. Validate with Zod schema
  const validation = validateSurfaceAnalysisResponse(parsed)

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      validated: true,
    }
  }

  // 4. Salvage partial data — validate each surface individually
  const rawData = parsed as Record<string, unknown>
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
    validated: false,
    validationIssues: validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; '),
  }
}
