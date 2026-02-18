/**
 * Weight and area calculation utilities for precast concrete elements.
 *
 * Standard reinforced concrete density: ~2400 kg/m³
 * These formulas provide estimates. The factory should always verify
 * critical weights against engineering specifications.
 */

// Concrete densities in kg/m³
export const CONCRETE_DENSITIES = {
  /** Standard reinforced concrete (most precast elements) */
  standard: 2400,
  /** Lightweight aggregate concrete */
  lightweight: 1800,
  /** Heavy concrete (radiation shielding etc.) */
  heavy: 2600,
} as const

export type ConcreteDensity = keyof typeof CONCRETE_DENSITIES

// Default thicknesses for element types where height/thickness
// is standardized and may not appear in every drawing (in mm)
export const DEFAULT_THICKNESSES: Record<string, number> = {
  /** Filigran floor slabs: 60mm standard plate thickness */
  filigran: 60,
  /** Balcony slabs: typically 180-200mm */
  balcony: 200,
  /** Balcony corridors: typically 180-200mm */
  svalagangur: 200,
}

/**
 * Calculate weight in kg from dimensions in mm.
 *
 * @param lengthMm - Length in millimeters
 * @param widthMm - Width in millimeters
 * @param heightMm - Height/thickness in millimeters
 * @param density - Concrete density type (default: 'standard')
 * @returns Weight in kg, rounded to 1 decimal place
 */
export function calculateWeightKg(
  lengthMm: number,
  widthMm: number,
  heightMm: number,
  density: ConcreteDensity = 'standard'
): number {
  // Convert mm to meters
  const lengthM = lengthMm / 1000
  const widthM = widthMm / 1000
  const heightM = heightMm / 1000

  const volumeM3 = lengthM * widthM * heightM
  const weightKg = volumeM3 * CONCRETE_DENSITIES[density]

  return Math.round(weightKg * 10) / 10 // Round to 1 decimal
}

/**
 * Calculate area in m² from dimensions in mm.
 *
 * @param lengthMm - Length in millimeters
 * @param widthMm - Width in millimeters
 * @returns Area in m², rounded to 2 decimal places
 */
export function calculateAreaM2(lengthMm: number, widthMm: number): number {
  return Math.round((lengthMm / 1000) * (widthMm / 1000) * 100) / 100
}

/**
 * Try to calculate weight for an element, using default thickness
 * for the element type if height is not provided.
 *
 * Returns null if insufficient data.
 */
export function estimateWeight(
  lengthMm: number | null,
  widthMm: number | null,
  heightMm: number | null,
  elementType?: string,
  density: ConcreteDensity = 'standard'
): { weightKg: number; source: 'calculated' | 'estimated' } | null {
  if (!lengthMm || !widthMm) return null

  if (heightMm) {
    return {
      weightKg: calculateWeightKg(lengthMm, widthMm, heightMm, density),
      source: 'calculated',
    }
  }

  // Try default thickness for the element type
  if (elementType) {
    const defaultThickness = DEFAULT_THICKNESSES[elementType]
    if (defaultThickness) {
      return {
        weightKg: calculateWeightKg(lengthMm, widthMm, defaultThickness, density),
        source: 'estimated',
      }
    }
  }

  return null
}

// ── Weight confidence override ──────────────────────────────

/**
 * Types whose weight can be reliably calculated from dimensions alone.
 * These are simple rectangular slabs with known standard thicknesses.
 */
const CALCULABLE_TYPES = new Set(['filigran', 'svalagangur', 'balcony'])

/**
 * Override the AI's weight confidence when the system can calculate
 * weight from dimensions. This reduces noisy "low" confidence warnings
 * for filigran/balcony/svalagangur elements on placement plans where
 * the AI can't read weights (they're on separate detail sheets).
 *
 * Returns 'calculated' when weight was derived from exact dimensions,
 * 'medium' when using a default thickness estimate, or the original
 * confidence level if no override applies.
 */
export function getWeightConfidenceOverride(
  elementType: string,
  lengthMm: number | null,
  widthMm: number | null,
  heightMm: number | null,
  originalConfidence: 'high' | 'medium' | 'low'
): 'high' | 'medium' | 'low' | 'calculated' {
  // Only override 'low' confidence for calculable slab types
  if (originalConfidence !== 'low') return originalConfidence
  if (!CALCULABLE_TYPES.has(elementType)) return originalConfidence
  if (!lengthMm || !widthMm) return originalConfidence

  // Explicit height provided → weight is calculated from real dimensions
  if (heightMm) return 'calculated'

  // Default thickness available → weight is a reasonable estimate
  if (DEFAULT_THICKNESSES[elementType]) return 'medium'

  return originalConfidence
}
