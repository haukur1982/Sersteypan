import { z } from 'zod'
import { uuidSchema, safeStringSchema } from './common'

/**
 * Validation schemas for the panelization feature.
 */

// ── Mode ─────────────────────────────────────────────────────

export const panelizationModeSchema = z.enum(['wall', 'filigran'], {
  message: 'Veldu tegund: veggur eða filigran',
})

export const stripDirectionSchema = z.enum(['length', 'width'], {
  message: 'Veldu stefnu remsna: lengd eða breidd',
})

export const openingTypeSchema = z.enum(['window', 'door', 'other'], {
  message: 'Veldu tegund ops: gluggi, hurð eða annað',
})

// ── Dimension helpers (required, not optional like common.dimensionSchema) ──

const requiredDimensionMm = z
  .number()
  .int('Verður að vera heil tala')
  .min(1, 'Verður að vera að minnsta kosti 1 mm')
  .max(50000, 'Má ekki vera meira en 50.000 mm')

const thicknessMm = z
  .number()
  .int('Verður að vera heil tala')
  .min(10, 'Verður að vera að minnsta kosti 10 mm')
  .max(500, 'Má ekki vera meira en 500 mm')

const constraintDimensionMm = z
  .number()
  .int('Verður að vera heil tala')
  .min(100, 'Verður að vera að minnsta kosti 100 mm')
  .max(50000, 'Má ekki vera meira en 50.000 mm')

// ── Create Layout ────────────────────────────────────────────

export const panelizationCreateSchema = z.object({
  project_id: uuidSchema,
  building_id: uuidSchema.optional().or(z.literal('')).or(z.literal('none')).or(z.null()).transform(v => (v && v !== 'none') ? v : undefined),
  mode: panelizationModeSchema,
  name: safeStringSchema(1, 200),
  floor: z.coerce.number().int().min(0).max(99).optional().default(1),
  surface_length_mm: requiredDimensionMm,
  surface_height_mm: requiredDimensionMm,
  thickness_mm: thicknessMm,
  name_prefix: safeStringSchema(1, 10).default('V'),
  strip_direction: stripDirectionSchema.optional(),
  // Constraints (all optional, use DB defaults if not provided)
  max_panel_width_mm: constraintDimensionMm.optional(),
  preferred_panel_width_mm: constraintDimensionMm.optional(),
  min_panel_width_mm: constraintDimensionMm.optional(),
  max_panel_weight_kg: z.number().min(100).max(50000).optional(),
  joint_width_mm: z.number().int().min(0).max(100).optional(),
  concrete_density_kg_m3: z.number().int().min(1500).max(3000).optional(),
})

export type PanelizationCreateInput = z.infer<typeof panelizationCreateSchema>

// ── Update Layout Constraints ────────────────────────────────

export const panelizationUpdateConstraintsSchema = z.object({
  max_panel_width_mm: constraintDimensionMm.optional(),
  preferred_panel_width_mm: constraintDimensionMm.optional(),
  min_panel_width_mm: constraintDimensionMm.optional(),
  max_panel_weight_kg: z.number().min(100).max(50000).optional(),
  joint_width_mm: z.number().int().min(0).max(100).optional(),
  concrete_density_kg_m3: z.number().int().min(1500).max(3000).optional(),
  max_transport_width_mm: constraintDimensionMm.optional(),
  max_transport_height_mm: constraintDimensionMm.optional(),
  max_table_length_mm: constraintDimensionMm.optional(),
  max_table_width_mm: constraintDimensionMm.optional(),
})

export type PanelizationUpdateConstraints = z.infer<typeof panelizationUpdateConstraintsSchema>

// ── Opening ──────────────────────────────────────────────────

export const panelizationOpeningSchema = z.object({
  opening_type: openingTypeSchema,
  offset_x_mm: z.number().int().min(0, 'Staðsetning verður að vera 0 eða hærri'),
  offset_y_mm: z.number().int().min(0, 'Staðsetning verður að vera 0 eða hærri'),
  width_mm: requiredDimensionMm,
  height_mm: requiredDimensionMm,
  label: z.string().max(100).optional().or(z.literal('')).transform(v => v || undefined),
})

export type PanelizationOpeningInput = z.infer<typeof panelizationOpeningSchema>
