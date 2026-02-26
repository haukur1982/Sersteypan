/**
 * AI Drawing Analysis — Response Parser
 *
 * Parses raw AI text responses into validated DrawingAnalysisResponse objects.
 * Handles markdown code block stripping, JSON parsing, and Zod validation.
 */

import {
  validateDrawingAnalysisResponse,
  extractedElementSchema,
  type DrawingAnalysisResponse,
  type ExtractedElement,
} from '@/lib/schemas/drawing-analysis'

export type ParseResult =
  | {
      success: true
      data: DrawingAnalysisResponse
      /** Whether Zod validation passed cleanly (vs salvaged partial data) */
      validated: true
    }
  | {
      success: true
      data: {
        elements: ExtractedElement[]
        page_description: string
        warnings: string[]
      }
      /** Partial data salvaged despite validation failure */
      validated: false
      validationIssues: string
    }
  | {
      success: false
      error: string
      rawText?: string
    }

/**
 * Parse AI response text into a validated drawing analysis result.
 *
 * Handles:
 * 1. Stripping markdown code blocks (```json ... ```)
 * 2. JSON.parse
 * 3. Zod schema validation
 * 4. Salvaging partial data if full validation fails
 */
export function parseDrawingAnalysisResponse(
  responseText: string
): ParseResult {
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
  const validation = validateDrawingAnalysisResponse(parsed)

  if (validation.success) {
    return {
      success: true,
      data: validation.data,
      validated: true,
    }
  }

  // 4. Salvage partial data if validation fails — validate each element individually
  //    to prevent garbage data from entering the commit pipeline.
  const rawData = parsed as Record<string, unknown>
  const rawElements = Array.isArray(rawData?.elements) ? rawData.elements : []
  const validElements: ExtractedElement[] = []
  const elementWarnings: string[] = []

  for (let i = 0; i < rawElements.length; i++) {
    const result = extractedElementSchema.safeParse(rawElements[i])
    if (result.success) {
      validElements.push(result.data)
    } else {
      const name =
        typeof rawElements[i]?.name === 'string' ? rawElements[i].name : `#${i}`
      elementWarnings.push(
        `Element "${name}" skipped: ${result.error.issues.map((iss) => iss.message).join(', ')}`
      )
    }
  }

  const existingWarnings = Array.isArray(rawData?.warnings)
    ? (rawData.warnings as string[])
    : []

  return {
    success: true,
    data: {
      elements: validElements,
      page_description:
        typeof rawData?.page_description === 'string'
          ? rawData.page_description
          : 'Greining lokið en sum gögn voru ófullnægjandi.',
      warnings: [...existingWarnings, ...elementWarnings],
    },
    validated: false,
    validationIssues: validation.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; '),
  }
}

/**
 * Extract raw text from an AI message content array.
 *
 * Works with both Anthropic (content blocks with type: 'text')
 * and Google Gemini (text parts) response formats.
 */
export function extractTextFromContentBlocks(
  content: Array<{ type: string; text?: string }>
): string {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('\n')
    .trim()
}
