import { z } from 'zod'

/**
 * AI Drawing Analysis schemas
 *
 * Defines the structure of data extracted by Claude Vision from
 * structural engineering drawings. Used to validate AI responses
 * and type the review/commit pipeline.
 */

// Confidence levels for each extracted field
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])

// A single element extracted from a drawing
export const extractedElementSchema = z.object({
  name: z.string().min(1).max(100),
  element_type: z.string().min(1).max(50),
  length_mm: z.number().int().positive().max(50000).nullable(),
  width_mm: z.number().int().positive().max(50000).nullable(),
  height_mm: z.number().int().positive().max(50000).nullable(),
  weight_kg: z.number().positive().max(100000).nullable(),
  quantity: z.number().int().positive().default(1),
  rebar_spec: z.string().max(500).nullable(),
  floor: z.number().int().nullable(),
  building: z.string().max(50).nullable(),
  production_notes: z.string().max(2000).nullable(),
  confidence: z.object({
    name: confidenceLevelSchema,
    dimensions: confidenceLevelSchema,
    weight: confidenceLevelSchema,
  }),
  // Position fields — extracted from BF (filigran) layout drawings
  // Origin: bottom-left of slab area, X→right, Y→up, in mm
  position_x_mm: z.number().int().min(0).max(100000).nullable().optional(),
  position_y_mm: z.number().int().min(0).max(100000).nullable().optional(),
  rotation_deg: z.number().min(0).max(360).nullable().optional(),
})

// Slab area bounding box — extracted from BF drawings for floor plan visualization
export const slabAreaSchema = z.object({
  width_mm: z.number().int().positive(),
  height_mm: z.number().int().positive(),
})

// Full response from Claude Vision analysis of one drawing/page
export const drawingAnalysisResponseSchema = z.object({
  drawing_reference: z.string().max(200),
  drawing_type: z.string().max(50),
  building: z.string().max(50).nullable(),
  floor: z.number().int().nullable(),
  general_notes: z.string().max(2000).default(''),
  elements: z.array(extractedElementSchema),
  warnings: z.array(z.string()),
  page_description: z.string().max(1000),
  // BF drawings: total slab area bounding box for floor plan rendering
  slab_area: slabAreaSchema.nullable().optional(),
})

// Schema for committing elements from an analysis
export const commitAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  selectedIndices: z.array(z.number().int().min(0)).min(1, 'Veldu að minnsta kosti eina einingu'),
  buildingMappings: z.record(z.string(), z.string().uuid()).optional(),
  buildingsToCreate: z.array(z.object({
    name: z.string().min(1).max(100),
    tempId: z.string(),
  })).optional(),
})

// Types
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>
export type ExtractedElement = z.infer<typeof extractedElementSchema>
export type SlabArea = z.infer<typeof slabAreaSchema>
export type DrawingAnalysisResponse = z.infer<typeof drawingAnalysisResponseSchema>
export type CommitAnalysisInput = z.infer<typeof commitAnalysisSchema>

// Validation helpers
export function validateDrawingAnalysisResponse(data: unknown) {
  return drawingAnalysisResponseSchema.safeParse(data)
}

export function validateCommitAnalysis(data: unknown) {
  return commitAnalysisSchema.safeParse(data)
}

// Map AI element types to system element type keys
// Based on real Icelandic structural engineering drawing conventions
export const ELEMENT_TYPE_MAP: Record<string, string> = {
  // Direct matches (what the AI prompt asks for)
  filigran: 'filigran',
  balcony: 'balcony',
  staircase: 'staircase',
  wall: 'wall',
  column: 'column',
  beam: 'beam',
  ceiling: 'ceiling',
  corridor: 'svalagangur',

  // Icelandic names the AI might use
  svalir: 'balcony',
  svalagangar: 'svalagangur',
  svalagangur: 'svalagangur',
  stigi: 'staircase',
  stigategund: 'staircase',
  veggur: 'wall',
  sula: 'column',
  súla: 'column',
  bita: 'beam',
  þak: 'ceiling',
  filegranplata: 'filigran',
  filegranplötur: 'filigran',
  svalaplata: 'balcony',
  svalaplötur: 'balcony',

  // Common abbreviations from real drawings
  fg: 'filigran',
  sv: 'balcony',
  sg: 'svalagangur',
  st: 'staircase',
  bf: 'filigran',    // BF drawing prefix sometimes used as type
  bs: 'other',       // BS is a drawing sheet type, not an element type
}

/**
 * Map an AI-extracted element type string to the system's element_type key.
 * Falls back to 'other' if no match found.
 */
export function mapElementType(aiType: string): string {
  const normalized = aiType.toLowerCase().trim()
  return ELEMENT_TYPE_MAP[normalized] || 'other'
}

/**
 * Extract elements array from the stored extracted_elements JSONB.
 *
 * Handles both storage formats:
 * - Legacy: a flat ExtractedElement[] array
 * - New (BF with positions): { elements: ExtractedElement[], slab_area: {...}, ... }
 */
export function extractElementsFromStored(raw: unknown): {
  elements: ExtractedElement[]
  slabArea: SlabArea | null
} {
  if (Array.isArray(raw)) {
    return { elements: raw as ExtractedElement[], slabArea: null }
  }
  if (raw && typeof raw === 'object' && 'elements' in (raw as Record<string, unknown>)) {
    const wrapper = raw as Record<string, unknown>
    const elements = (wrapper.elements as ExtractedElement[]) || []
    let slabArea: SlabArea | null = null
    if (wrapper.slab_area && typeof wrapper.slab_area === 'object') {
      const sa = wrapper.slab_area as { width_mm?: number; height_mm?: number }
      if (sa.width_mm && sa.height_mm) {
        slabArea = { width_mm: sa.width_mm, height_mm: sa.height_mm }
      }
    }
    return { elements, slabArea }
  }
  return { elements: [], slabArea: null }
}
