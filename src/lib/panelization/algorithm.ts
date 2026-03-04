/**
 * Panelization Algorithm — Pure Functions
 *
 * Calculates optimal panel divisions for precast concrete walls and filigran slabs.
 * No external dependencies — runs both client-side (instant preview) and server-side.
 *
 * Reuses weight/area/volume calculations from src/lib/drawing-analysis/weight.ts
 * concepts but implemented inline to keep this module dependency-free.
 */

import type {
  WallPanelizationInput,
  FiligranPanelizationInput,
  PanelResult,
  PanelizationResult,
  PanelizationConstraints,
  OpeningDefinition,
} from './types'

// ── Helpers ──────────────────────────────────────────────────

/** Calculate weight (kg) from dimensions (mm) and density (kg/m³) */
function calcWeight(widthMm: number, heightMm: number, thicknessMm: number, density: number): number {
  const vol = (widthMm / 1000) * (heightMm / 1000) * (thicknessMm / 1000)
  return Math.round(vol * density * 10) / 10
}

/** Calculate area (m²) from dimensions (mm) */
function calcArea(widthMm: number, heightMm: number): number {
  return Math.round((widthMm / 1000) * (heightMm / 1000) * 100) / 100
}

/** Calculate volume (m³) from dimensions (mm) */
function calcVolume(widthMm: number, heightMm: number, thicknessMm: number): number {
  return Math.round((widthMm / 1000) * (heightMm / 1000) * (thicknessMm / 1000) * 1000) / 1000
}

/** Generate panel name: prefix-{floor}{seq} e.g. V-101, V-102 */
function generateName(prefix: string, floor: number, seq: number): string {
  const floorDigit = Math.max(0, Math.min(9, floor))
  const seqStr = String(seq).padStart(2, '0')
  return `${prefix}-${floorDigit}${seqStr}`
}

/** Check constraint violations for a panel */
function checkConstraints(
  panel: { widthMm: number; heightMm: number; thicknessMm: number; weightKg: number },
  constraints: PanelizationConstraints
): { exceedsWeight: boolean; exceedsTransport: boolean; exceedsTable: boolean } {
  const exceedsWeight = panel.weightKg > constraints.maxPanelWeightKg

  // Transport: the panel's width (horizontal) must fit on a truck
  const exceedsTransport =
    panel.widthMm > constraints.maxTransportWidthMm ||
    panel.heightMm > constraints.maxTransportHeightMm

  // Factory table: panel must fit on the production table
  const longerDim = Math.max(panel.widthMm, panel.heightMm)
  const shorterDim = Math.min(panel.widthMm, panel.heightMm)
  const exceedsTable =
    longerDim > constraints.maxTableLengthMm ||
    shorterDim > constraints.maxTableWidthMm

  return { exceedsWeight, exceedsTransport, exceedsTable }
}

/** Build summary stats from panels */
function buildResult(panels: PanelResult[]): PanelizationResult {
  return {
    panels,
    totalPanels: panels.length,
    totalWeightKg: Math.round(panels.reduce((s, p) => s + p.weightKg, 0) * 10) / 10,
    totalAreaM2: Math.round(panels.reduce((s, p) => s + p.areaM2, 0) * 100) / 100,
    totalVolumeM3: Math.round(panels.reduce((s, p) => s + p.volumeM3, 0) * 1000) / 1000,
    warningCount: panels.filter(p => p.exceedsWeight || p.exceedsTransport || p.exceedsTable).length,
  }
}

// ── Wall Panelization ────────────────────────────────────────

/**
 * Divide a wall surface into optimal panels.
 *
 * Algorithm:
 * 1. Collect division boundaries from openings (left/right edges) + surface edges
 * 2. Create segments between consecutive boundaries
 * 3. Subdivide oversized segments using preferred width
 * 4. Merge segments narrower than minimum width
 * 5. Calculate properties and constraint flags
 */
export function calculateWallPanels(input: WallPanelizationInput): PanelizationResult {
  const { surface, openings, constraints, namePrefix, floor } = input
  const { lengthMm, heightMm, thicknessMm } = surface

  // Edge case: surface is too small
  if (lengthMm <= 0 || heightMm <= 0) {
    return buildResult([])
  }

  // Step 1: Collect division boundaries from openings
  const boundaries = new Set<number>([0, lengthMm])

  for (const opening of openings) {
    const left = opening.offsetXMm
    const right = opening.offsetXMm + opening.widthMm

    // Only add boundaries that fall within the surface
    if (left > 0 && left < lengthMm) boundaries.add(left)
    if (right > 0 && right < lengthMm) boundaries.add(right)
  }

  // Step 2: Sort boundaries and create segments
  const sortedBounds = Array.from(boundaries).sort((a, b) => a - b)

  interface Segment {
    startMm: number
    endMm: number
    widthMm: number
  }

  let segments: Segment[] = []
  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const start = sortedBounds[i]
    const end = sortedBounds[i + 1]
    // Account for joints between panels: subtract half joint on each side
    // But only if this isn't the first or last boundary
    const effectiveWidth = end - start
    if (effectiveWidth > 0) {
      segments.push({ startMm: start, endMm: end, widthMm: effectiveWidth })
    }
  }

  // Step 3: Subdivide oversized segments
  const subdivided: Segment[] = []
  for (const seg of segments) {
    if (seg.widthMm <= constraints.maxPanelWidthMm) {
      subdivided.push(seg)
    } else {
      // Calculate how many panels of preferred width fit
      const usableWidth = seg.widthMm
      const jointCount = Math.max(0, Math.ceil(usableWidth / constraints.preferredPanelWidthMm) - 1)
      const totalJoints = jointCount * constraints.jointWidthMm
      const panelableWidth = usableWidth - totalJoints

      let n = Math.max(1, Math.round(panelableWidth / constraints.preferredPanelWidthMm))

      // Ensure each sub-panel doesn't exceed max width
      while (n > 0 && (panelableWidth / n) > constraints.maxPanelWidthMm) {
        n++
      }

      // Distribute evenly
      const panelWidth = Math.round(panelableWidth / n)
      let currentPos = seg.startMm

      for (let i = 0; i < n; i++) {
        const isLast = i === n - 1
        // Last panel absorbs rounding remainder
        const w = isLast ? (seg.endMm - currentPos) : panelWidth
        subdivided.push({
          startMm: currentPos,
          endMm: currentPos + w,
          widthMm: w,
        })
        currentPos += w + (isLast ? 0 : constraints.jointWidthMm)
      }
    }
  }

  // Step 4: Merge segments narrower than minimum
  segments = []
  for (const seg of subdivided) {
    if (seg.widthMm >= constraints.minPanelWidthMm) {
      segments.push(seg)
    } else if (segments.length > 0) {
      // Merge with the previous segment
      const prev = segments[segments.length - 1]
      prev.endMm = seg.endMm
      prev.widthMm = prev.endMm - prev.startMm
    } else {
      // First segment is too narrow — keep it, it'll merge with next
      segments.push(seg)
    }
  }

  // Second pass: if first segment is still too narrow, merge with next
  if (segments.length >= 2 && segments[0].widthMm < constraints.minPanelWidthMm) {
    const first = segments[0]
    const second = segments[1]
    second.startMm = first.startMm
    second.widthMm = second.endMm - second.startMm
    segments.shift()
  }

  // Step 5: Create panel results
  const panels: PanelResult[] = segments.map((seg, i) => {
    // For wall panels, determine effective height
    // Check if this segment overlaps with any opening
    const panelHeight = getEffectivePanelHeight(
      seg.startMm, seg.endMm, heightMm, openings
    )

    const weightKg = calcWeight(seg.widthMm, panelHeight, thicknessMm, constraints.concreteDensityKgM3)
    const areaM2 = calcArea(seg.widthMm, panelHeight)
    const volumeM3 = calcVolume(seg.widthMm, panelHeight, thicknessMm)
    const flags = checkConstraints(
      { widthMm: seg.widthMm, heightMm: panelHeight, thicknessMm, weightKg },
      constraints
    )

    return {
      index: i,
      name: generateName(namePrefix, floor, i + 1),
      offsetXMm: seg.startMm,
      offsetYMm: 0,
      widthMm: seg.widthMm,
      heightMm: panelHeight,
      thicknessMm,
      weightKg,
      areaM2,
      volumeM3,
      ...flags,
      isManuallyAdjusted: false,
    }
  })

  return buildResult(panels)
}

/**
 * Get effective height for a wall panel segment.
 * If the panel is entirely within an opening column, use the full wall height
 * (the opening creates separate above/below panels — but for MVP, we treat
 * each segment as full height since openings define the division boundaries).
 *
 * Full-height panels span the entire wall. Panels that align exactly with an
 * opening's edges use the full wall height — the opening is a void, not a panel.
 */
function getEffectivePanelHeight(
  segStartMm: number,
  segEndMm: number,
  wallHeightMm: number,
  _openings: OpeningDefinition[]
): number {
  // For MVP: all wall panels are full height.
  // The openings define WHERE to divide, but each panel between openings
  // spans the full wall height. The window/door void is cut out during
  // manufacturing — the panel just has a hole in it.
  //
  // Future enhancement: split into above-window + below-window + side panels
  // for more accurate weight calculation.
  return wallHeightMm
}

// ── Filigran Panelization ────────────────────────────────────

/**
 * Divide a floor area into parallel filigran slab strips.
 *
 * Algorithm:
 * 1. Determine the division axis from strip direction
 * 2. Calculate number of strips based on preferred width
 * 3. Distribute width evenly across strips
 * 4. Ensure no strip exceeds max or falls below min width
 */
export function calculateFiligranPanels(input: FiligranPanelizationInput): PanelizationResult {
  const { surface, constraints, stripDirection, namePrefix, floor } = input
  const { lengthMm, heightMm, thicknessMm } = surface

  if (lengthMm <= 0 || heightMm <= 0) {
    return buildResult([])
  }

  // Division axis: if strips run parallel to length, we divide along the width
  // If strips run parallel to width, we divide along the length
  const divisionSpan = stripDirection === 'length' ? heightMm : lengthMm
  const stripLength = stripDirection === 'length' ? lengthMm : heightMm

  // Calculate number of strips
  let n = Math.max(1, Math.round(divisionSpan / constraints.preferredPanelWidthMm))

  // Account for joints between strips
  const totalJoints = (n - 1) * constraints.jointWidthMm
  let stripWidth = Math.round((divisionSpan - totalJoints) / n)

  // Adjust if strip width exceeds max
  while (stripWidth > constraints.maxPanelWidthMm && n < 100) {
    n++
    stripWidth = Math.round((divisionSpan - (n - 1) * constraints.jointWidthMm) / n)
  }

  // Adjust if strip width is below min (reduce count)
  while (stripWidth < constraints.minPanelWidthMm && n > 1) {
    n--
    stripWidth = Math.round((divisionSpan - (n - 1) * constraints.jointWidthMm) / n)
  }

  // Generate strips
  const panels: PanelResult[] = []
  let currentPos = 0

  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    // Last strip absorbs rounding remainder
    const w = isLast
      ? divisionSpan - currentPos
      : stripWidth

    const weightKg = calcWeight(w, stripLength, thicknessMm, constraints.concreteDensityKgM3)
    const areaM2 = calcArea(w, stripLength)
    const volumeM3 = calcVolume(w, stripLength, thicknessMm)
    const flags = checkConstraints(
      { widthMm: Math.max(w, stripLength), heightMm: Math.min(w, stripLength), thicknessMm, weightKg },
      constraints
    )

    // Position depends on strip direction
    const offsetX = stripDirection === 'length' ? 0 : currentPos
    const offsetY = stripDirection === 'length' ? currentPos : 0

    panels.push({
      index: i,
      name: generateName(namePrefix, floor, i + 1),
      offsetXMm: offsetX,
      offsetYMm: offsetY,
      widthMm: w,
      heightMm: stripLength,
      thicknessMm,
      weightKg,
      areaM2,
      volumeM3,
      ...flags,
      isManuallyAdjusted: false,
    })

    currentPos += w + constraints.jointWidthMm
  }

  return buildResult(panels)
}

// ── Recalculate from manual dividers ─────────────────────────

/**
 * Given a set of manually-placed divider positions, generate panels.
 * Used when the user drags dividers in the SVG editor.
 */
export function panelsFromDividers(
  dividerPositions: number[],
  surfaceLengthMm: number,
  surfaceHeightMm: number,
  thicknessMm: number,
  constraints: PanelizationConstraints,
  namePrefix: string,
  floor: number
): PanelizationResult {
  // Sort dividers and add surface boundaries
  const positions = [0, ...dividerPositions.filter(p => p > 0 && p < surfaceLengthMm).sort((a, b) => a - b), surfaceLengthMm]

  const panels: PanelResult[] = []
  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i]
    const end = positions[i + 1]
    const width = end - start

    if (width <= 0) continue

    const weightKg = calcWeight(width, surfaceHeightMm, thicknessMm, constraints.concreteDensityKgM3)
    const areaM2 = calcArea(width, surfaceHeightMm)
    const volumeM3 = calcVolume(width, surfaceHeightMm, thicknessMm)
    const flags = checkConstraints(
      { widthMm: width, heightMm: surfaceHeightMm, thicknessMm, weightKg },
      constraints
    )

    panels.push({
      index: i,
      name: generateName(namePrefix, floor, i + 1),
      offsetXMm: start,
      offsetYMm: 0,
      widthMm: width,
      heightMm: surfaceHeightMm,
      thicknessMm,
      weightKg,
      areaM2,
      volumeM3,
      ...flags,
      isManuallyAdjusted: true,
    })
  }

  return buildResult(panels)
}
