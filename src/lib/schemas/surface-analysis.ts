import { z } from 'zod'

/**
 * AI Surface Analysis schemas
 *
 * Defines the structure of data extracted by Claude Vision from
 * architectural floor plans. Includes both:
 * 1. Surfaces (walls + floors with dimensions) for panelization
 * 2. Geometry (wall coordinates + zone polygons) for floor plan rendering
 */

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])

// Opening on a wall surface (window/door)
export const extractedOpeningSchema = z.object({
  type: z.enum(['window', 'door', 'other']),
  offset_x_mm: z.number().int().min(0),
  offset_y_mm: z.number().int().min(0),
  width_mm: z.number().int().positive().max(10000),
  height_mm: z.number().int().positive().max(10000),
  label: z.string().max(100).nullable().optional(),
})

// A surface extracted from an architectural floor plan
export const extractedSurfaceSchema = z.object({
  name: z.string().min(1).max(200),
  surface_type: z.enum(['wall', 'floor']),
  wall_type: z.enum(['outer', 'inner', 'sandwich']).nullable().optional(),
  length_mm: z.number().int().positive().max(50000),
  height_mm: z.number().int().positive().max(50000),
  thickness_mm: z.number().int().positive().max(500),
  floor: z.number().int().nullable(),
  building: z.string().max(50).nullable(),
  openings: z.array(extractedOpeningSchema).default([]),
  confidence: z.object({
    dimensions: confidenceLevelSchema,
  }),
})

// Geometry: wall segment as a coordinate pair
const geoWallSegmentSchema = z.object({
  id: z.string().min(1).max(50),
  surface_name: z.string().max(200).nullable().optional(),
  x1_mm: z.number(),
  y1_mm: z.number(),
  x2_mm: z.number(),
  y2_mm: z.number(),
  thickness_mm: z.number().int().positive().max(1000),
  wall_type: z.enum(['outer', 'inner', 'sandwich']),
  label: z.string().max(200).nullable().optional(),
})

// Geometry: floor zone as a closed polygon
const geoFloorZoneSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  points: z.array(z.object({
    x_mm: z.number(),
    y_mm: z.number(),
  })).min(3),
  zone_type: z.enum(['interior', 'balcony']),
})

// Geometry block — spatial layout for floor plan rendering
export const geometryBlockSchema = z.object({
  bounding_width_mm: z.number().int().positive().max(200000),
  bounding_height_mm: z.number().int().positive().max(200000),
  wall_segments: z.array(geoWallSegmentSchema),
  floor_zones: z.array(geoFloorZoneSchema),
})

// Full response from surface analysis of an architectural drawing
export const surfaceAnalysisResponseSchema = z.object({
  spatial_planning: z.string().max(2000).optional().nullable(),
  drawing_reference: z.string().max(200),
  building: z.string().max(50).nullable(),
  floor: z.number().int().nullable(),
  general_notes: z.string().max(2000).default(''),
  surfaces: z.array(extractedSurfaceSchema),
  geometry: geometryBlockSchema.optional().nullable(),
  warnings: z.array(z.string()),
  page_description: z.string().max(1000),
})

// Types
export type ExtractedOpening = z.infer<typeof extractedOpeningSchema>
export type ExtractedSurface = z.infer<typeof extractedSurfaceSchema>
export type GeometryBlock = z.infer<typeof geometryBlockSchema>
export type SurfaceAnalysisResponse = z.infer<typeof surfaceAnalysisResponseSchema>

// Validation
export function validateSurfaceAnalysisResponse(data: unknown) {
  return surfaceAnalysisResponseSchema.safeParse(data)
}
