/**
 * Panelization types — shared between algorithm (client + server) and UI.
 *
 * These interfaces define the inputs and outputs of the panelization
 * algorithm. They are intentionally independent of Supabase/database types
 * so the algorithm can run as a pure function in any context.
 */

// ── Constraints ──────────────────────────────────────────────

export interface PanelizationConstraints {
  /** Maximum panel width along the division axis (mm) */
  maxPanelWidthMm: number
  /** Preferred/target panel width (mm) — algorithm tries to get close to this */
  preferredPanelWidthMm: number
  /** Minimum panel width (mm) — panels narrower than this get merged */
  minPanelWidthMm: number
  /** Maximum panel weight (kg) */
  maxPanelWeightKg: number
  /** Joint/gap width between panels (mm) */
  jointWidthMm: number
  /** Concrete density (kg/m³) for weight calculation */
  concreteDensityKgM3: number
  /** Maximum width for truck transport (mm) */
  maxTransportWidthMm: number
  /** Maximum height for truck transport (mm) */
  maxTransportHeightMm: number
  /** Maximum factory production table length (mm) */
  maxTableLengthMm: number
  /** Maximum factory production table width (mm) */
  maxTableWidthMm: number
}

// ── Surface Definition ───────────────────────────────────────

export interface SurfaceDefinition {
  /** Total surface length (mm) — horizontal extent for walls, or primary dimension for floors */
  lengthMm: number
  /** Total surface height (mm) — wall height, or secondary dimension for floors */
  heightMm: number
  /** Element thickness (mm) */
  thicknessMm: number
}

// ── Openings ─────────────────────────────────────────────────

export interface OpeningDefinition {
  /** Opening type */
  type: 'window' | 'door' | 'other'
  /** Horizontal offset from left edge of surface (mm) */
  offsetXMm: number
  /** Vertical offset from bottom edge of surface (mm) */
  offsetYMm: number
  /** Opening width (mm) */
  widthMm: number
  /** Opening height (mm) */
  heightMm: number
  /** Optional label */
  label?: string
}

// ── Panel Result ─────────────────────────────────────────────

export interface PanelResult {
  /** Sequential index (0-based, left to right) */
  index: number
  /** Generated name (e.g. "V-101") */
  name: string
  /** Horizontal offset from left edge (mm) */
  offsetXMm: number
  /** Vertical offset from bottom edge (mm) */
  offsetYMm: number
  /** Panel width along division axis (mm) */
  widthMm: number
  /** Panel height perpendicular to division (mm) */
  heightMm: number
  /** Panel thickness (mm) */
  thicknessMm: number
  /** Calculated weight (kg) */
  weightKg: number
  /** Calculated area (m²) */
  areaM2: number
  /** Calculated volume (m³) */
  volumeM3: number
  /** Exceeds weight constraint */
  exceedsWeight: boolean
  /** Exceeds transport width constraint */
  exceedsTransport: boolean
  /** Exceeds factory table constraint */
  exceedsTable: boolean
  /** Was this panel manually adjusted (not from auto-calculation) */
  isManuallyAdjusted: boolean
}

// ── Algorithm Input/Output ───────────────────────────────────

export interface WallPanelizationInput {
  surface: SurfaceDefinition
  openings: OpeningDefinition[]
  constraints: PanelizationConstraints
  namePrefix: string
  floor: number
}

export interface FiligranPanelizationInput {
  surface: SurfaceDefinition
  constraints: PanelizationConstraints
  /** Strip direction: 'length' = strips parallel to length, 'width' = strips parallel to width */
  stripDirection: 'length' | 'width'
  namePrefix: string
  floor: number
}

export interface PanelizationResult {
  panels: PanelResult[]
  /** Summary stats */
  totalPanels: number
  totalWeightKg: number
  totalAreaM2: number
  totalVolumeM3: number
  /** Number of panels with constraint violations */
  warningCount: number
}

// ── Default Constraints ──────────────────────────────────────

/** Factory defaults from owner's real production limits */
export const DEFAULT_CONSTRAINTS: PanelizationConstraints = {
  maxPanelWidthMm: 2500,
  preferredPanelWidthMm: 2000,
  minPanelWidthMm: 600,
  maxPanelWeightKg: 20000,
  jointWidthMm: 20,
  concreteDensityKgM3: 2400,
  maxTransportWidthMm: 3000,
  maxTransportHeightMm: 4000,
  maxTableLengthMm: 12000,
  maxTableWidthMm: 4000,
}

/** Mode-specific constraint overrides applied on top of DEFAULT_CONSTRAINTS */
export const WALL_CONSTRAINT_OVERRIDES: Partial<PanelizationConstraints> = {
  maxPanelWidthMm: 8000,
  maxTransportHeightMm: 4000,
}

export const FILIGRAN_CONSTRAINT_OVERRIDES: Partial<PanelizationConstraints> = {
  maxPanelWidthMm: 2500,
  maxTableLengthMm: 4600,
}

// ── Wall Types ──────────────────────────────────────────────

export type WallType = 'outer' | 'sandwich' | 'inner'

export const WALL_THICKNESSES: Record<WallType, number> = {
  outer: 220,
  sandwich: 320,
  inner: 200,
}

export const WALL_TYPE_LABELS: Record<WallType, string> = {
  outer: 'Útveggur',
  sandwich: 'Samlokuveggur',
  inner: 'Stoðveggur',
}

/** Default wall thickness (mm) — outer wall is most common */
export const DEFAULT_WALL_THICKNESS_MM = 220

/** Default floor-to-floor height (mm) — from Víkursandur 4: Hæð 1→2 = 2850mm */
export const DEFAULT_FLOOR_HEIGHT_MM = 2850

/** Default filigran slab thickness (mm) */
export const DEFAULT_FILIGRAN_THICKNESS_MM = 60
