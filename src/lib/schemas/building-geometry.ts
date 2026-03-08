import { z } from 'zod'

/**
 * Zod schemas for AI-extracted building floor geometry.
 *
 * Validates wall segments (line coordinates) and floor zones (polygons)
 * extracted from architectural floor plans by Claude Vision.
 */

export const wallSegmentSchema = z.object({
  id: z.string().min(1).max(50),
  x1_mm: z.number().int(),
  y1_mm: z.number().int(),
  x2_mm: z.number().int(),
  y2_mm: z.number().int(),
  thickness_mm: z.number().int().positive().max(1000),
  wall_type: z.enum(['outer', 'inner', 'sandwich']),
  label: z.string().max(100).optional(),
})

export const floorZonePointSchema = z.object({
  x_mm: z.number().int(),
  y_mm: z.number().int(),
})

export const floorZoneSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  points: z.array(floorZonePointSchema).min(3).max(20),
  zone_type: z.enum(['interior', 'balcony']),
})

export const buildingGeometryResponseSchema = z.object({
  bounding_width_mm: z.number().int().positive().max(200000),
  bounding_height_mm: z.number().int().positive().max(200000),
  wall_segments: z.array(wallSegmentSchema),
  floor_zones: z.array(floorZoneSchema),
  scale: z.string().max(50).nullable().optional(),
  floor: z.number().int().nullable().optional(),
  building: z.string().max(200).nullable().optional(),
  drawing_reference: z.string().max(200).nullable().optional(),
  general_notes: z.string().max(2000).nullable().optional(),
  warnings: z.array(z.string()).default([]),
})

// Types inferred from schemas
export type WallSegmentInput = z.infer<typeof wallSegmentSchema>
export type FloorZoneInput = z.infer<typeof floorZoneSchema>
export type BuildingGeometryResponse = z.infer<
  typeof buildingGeometryResponseSchema
>

// Validation
export function validateBuildingGeometryResponse(data: unknown) {
  return buildingGeometryResponseSchema.safeParse(data)
}
