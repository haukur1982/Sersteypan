/**
 * Building floor geometry types.
 *
 * These types represent the spatial layout of a building floor —
 * wall segments as line coordinates and floor zones as polygons.
 * Extracted by AI from architectural floor plans for composite
 * panelization visualization.
 *
 * Coordinate system: origin at bottom-left, X→right, Y→up, all mm.
 */

export interface WallSegment {
  id: string
  x1Mm: number
  y1Mm: number
  x2Mm: number
  y2Mm: number
  thicknessMm: number
  wallType: 'outer' | 'inner' | 'sandwich'
  label?: string
}

export interface FloorZonePoint {
  xMm: number
  yMm: number
}

export interface FloorZone {
  id: string
  name: string
  points: FloorZonePoint[]
  zoneType: 'interior' | 'balcony'
  linkedLayoutId?: string | null
}

export interface BuildingFloorGeometry {
  id: string
  projectId: string
  buildingId: string | null
  floor: number
  boundingWidthMm: number
  boundingHeightMm: number
  wallSegments: WallSegment[]
  floorZones: FloorZone[]
  scale?: string
  generalNotes?: string
  sourceDocumentName?: string
  drawingAnalysisId?: string | null
  createdAt?: string
}

/** Convert DB JSONB wall segment to typed WallSegment */
export function parseWallSegment(raw: Record<string, unknown>): WallSegment {
  return {
    id: String(raw.id || ''),
    x1Mm: Number(raw.x1_mm || 0),
    y1Mm: Number(raw.y1_mm || 0),
    x2Mm: Number(raw.x2_mm || 0),
    y2Mm: Number(raw.y2_mm || 0),
    thicknessMm: Number(raw.thickness_mm || 200),
    wallType: (raw.wall_type as WallSegment['wallType']) || 'inner',
    label: raw.label as string | undefined,
  }
}

/** Convert DB JSONB floor zone to typed FloorZone */
export function parseFloorZone(raw: Record<string, unknown>): FloorZone {
  const points = Array.isArray(raw.points)
    ? raw.points.map((p: Record<string, unknown>) => ({
        xMm: Number(p.x_mm || 0),
        yMm: Number(p.y_mm || 0),
      }))
    : []

  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    points,
    zoneType: (raw.zone_type as FloorZone['zoneType']) || 'interior',
    linkedLayoutId: (raw.linked_layout_id as string) || null,
  }
}

/** Convert a full DB row to BuildingFloorGeometry */
export function parseGeometryRow(
  row: Record<string, unknown>
): BuildingFloorGeometry {
  const wallSegmentsRaw = Array.isArray(row.wall_segments)
    ? row.wall_segments
    : []
  const floorZonesRaw = Array.isArray(row.floor_zones) ? row.floor_zones : []

  return {
    id: String(row.id),
    projectId: String(row.project_id),
    buildingId: row.building_id ? String(row.building_id) : null,
    floor: Number(row.floor),
    boundingWidthMm: Number(row.bounding_width_mm),
    boundingHeightMm: Number(row.bounding_height_mm),
    wallSegments: wallSegmentsRaw.map((w: Record<string, unknown>) =>
      parseWallSegment(w)
    ),
    floorZones: floorZonesRaw.map((z: Record<string, unknown>) =>
      parseFloorZone(z)
    ),
    scale: row.scale as string | undefined,
    generalNotes: row.general_notes as string | undefined,
    sourceDocumentName: row.source_document_name as string | undefined,
    drawingAnalysisId: row.drawing_analysis_id as string | null | undefined,
    createdAt: row.created_at as string | undefined,
  }
}

/** Compute axis-aligned bounding box for a floor zone polygon */
export function computeZoneBBox(points: FloorZonePoint[]) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of points) {
    if (p.xMm < minX) minX = p.xMm
    if (p.yMm < minY) minY = p.yMm
    if (p.xMm > maxX) maxX = p.xMm
    if (p.yMm > maxY) maxY = p.yMm
  }
  return { minX, minY, maxX, maxY }
}
