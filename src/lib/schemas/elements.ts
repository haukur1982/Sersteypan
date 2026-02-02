import { z } from 'zod'
import {
  safeStringSchema,
  optionalStringSchema,
  uuidSchema,
  dimensionSchema,
  weightSchema,
  floorSchema,
  prioritySchema
} from './common'

/**
 * Element (concrete piece) validation schemas
 */

// Default element types (fallback when database is not available)
// These are kept for backward compatibility and static validation
export const DEFAULT_ELEMENT_TYPES = [
  'wall', 'filigran', 'staircase', 'balcony', 'ceiling', 'column', 'beam', 'other'
] as const

export const elementTypeSchema = z.enum(
  DEFAULT_ELEMENT_TYPES,
  { message: 'Ógild tegund einingar' }
)

/**
 * Create a dynamic element type schema from database types
 * Use this when you have fetched types from the database
 */
export function createElementTypeSchema(validTypes: string[]) {
  if (validTypes.length === 0) {
    // Fallback to default if no types provided
    return elementTypeSchema
  }
  return z.string().refine(
    (val) => validTypes.includes(val),
    { message: 'Ógild tegund einingar' }
  )
}

export const elementStatusSchema = z.enum(
  ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded', 'delivered'],
  { message: 'Ógild staða einingar' }
)

// Valid status transitions (state machine)
export const validStatusTransitions: Record<string, string[]> = {
  planned: ['rebar'],
  rebar: ['cast', 'planned'],
  cast: ['curing', 'rebar'],
  curing: ['ready', 'cast'],
  ready: ['loaded', 'curing'],
  loaded: ['delivered', 'ready'],
  delivered: ['loaded'] // Can go back to loaded if delivery failed
}

export const elementCreateSchema = z.object({
  name: safeStringSchema(1, 100).describe('Nafn einingar'),
  project_id: uuidSchema.describe('Verkefni'),
  element_type: elementTypeSchema.describe('Tegund'),
  status: elementStatusSchema.default('planned'),
  priority: prioritySchema.describe('Forgangur'),
  floor: floorSchema.describe('Hæð'),
  position_description: optionalStringSchema(500).describe('Staðsetning'),
  length_mm: dimensionSchema.describe('Lengd (mm)'),
  width_mm: dimensionSchema.describe('Breidd (mm)'),
  height_mm: dimensionSchema.describe('Hæð (mm)'),
  weight_kg: weightSchema.describe('Þyngd (kg)'),
  drawing_reference: optionalStringSchema(200).describe('Teikningarnúmer'),
  batch_number: optionalStringSchema(100).describe('Lotu númer'),
  production_notes: optionalStringSchema(2000).describe('Framleiðsluathugasemdir'),
  qr_code: optionalStringSchema(500).describe('QR kóði')
})

export const elementUpdateSchema = z.object({
  id: uuidSchema,
  name: safeStringSchema(1, 100).optional(),
  project_id: uuidSchema.optional(),
  element_type: elementTypeSchema.optional(),
  status: elementStatusSchema.optional(),
  priority: prioritySchema.optional(),
  floor: floorSchema,
  position_description: optionalStringSchema(500),
  length_mm: dimensionSchema,
  width_mm: dimensionSchema,
  height_mm: dimensionSchema,
  weight_kg: weightSchema,
  drawing_reference: optionalStringSchema(200),
  batch_number: optionalStringSchema(100),
  production_notes: optionalStringSchema(2000),
  qr_code: optionalStringSchema(500)
})

export const elementStatusUpdateSchema = z.object({
  element_id: uuidSchema,
  new_status: elementStatusSchema,
  notes: optionalStringSchema(1000)
})

// Batch create schema for importing multiple elements
export const elementBatchCreateSchema = z.object({
  project_id: uuidSchema,
  elements: z.array(elementCreateSchema.omit({ project_id: true })).min(1).max(500)
})

export type ElementType = z.infer<typeof elementTypeSchema>
export type ElementStatus = z.infer<typeof elementStatusSchema>
export type ElementCreateInput = z.infer<typeof elementCreateSchema>
export type ElementUpdateInput = z.infer<typeof elementUpdateSchema>
export type ElementStatusUpdateInput = z.infer<typeof elementStatusUpdateSchema>
export type ElementBatchCreateInput = z.infer<typeof elementBatchCreateSchema>

export function validateElementCreate(data: unknown) {
  return elementCreateSchema.safeParse(data)
}

export function validateElementUpdate(data: unknown) {
  return elementUpdateSchema.safeParse(data)
}

export function validateElementStatusUpdate(data: unknown) {
  return elementStatusUpdateSchema.safeParse(data)
}

export function validateElementBatchCreate(data: unknown) {
  return elementBatchCreateSchema.safeParse(data)
}

// Validate status transition
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = validStatusTransitions[currentStatus]
  return allowed?.includes(newStatus) ?? false
}
