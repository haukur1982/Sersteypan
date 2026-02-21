import type { FramvindaContractLine, FramvindaCategory, PeriodSummary } from './types'

// ============================================================
// Area calculation
// ============================================================

/** Calculate area in m² from element dimensions in mm */
export function calculateAreaM2(
  lengthMm: number | null,
  widthMm: number | null
): number {
  if (!lengthMm || !widthMm) return 0
  return (lengthMm * widthMm) / 1_000_000
}

// ============================================================
// Auto-suggest quantities from element data
// ============================================================

interface ElementData {
  id: string
  name: string | null
  element_type: string | null
  building_id: string | null
  floor: number | null
  length_mm: number | null
  width_mm: number | null
  drawing_reference: string | null
  status: string | null
  cast_at: string | null
  ready_at: string | null
  delivered_at: string | null
}

interface DeliveryData {
  id: string
  status: string | null
  completed_at: string | null
}

/** Check if a date falls within a range */
function isInPeriod(
  dateStr: string | null,
  periodStart: string,
  periodEnd: string
): boolean {
  if (!dateStr) return false
  const date = dateStr.slice(0, 10) // ISO date part
  return date >= periodStart && date <= periodEnd
}

/** Suggest quantity for a single contract line based on element data */
export function suggestQuantityForLine(
  line: FramvindaContractLine,
  elements: ElementData[],
  deliveries: DeliveryData[],
  periodStart: string,
  periodEnd: string
): number {
  switch (line.category as FramvindaCategory) {
    case 'filigran':
      return suggestFiligranQuantity(line, elements, periodStart, periodEnd)
    case 'svalir':
    case 'svalagangar':
      return suggestByDrawingReference(line, elements, periodStart, periodEnd)
    case 'stigar':
      return suggestStigarQuantity(line, elements, periodStart, periodEnd)
    case 'flutningur':
      return suggestFlutningurQuantity(deliveries, periodStart, periodEnd)
    default:
      return 0
  }
}

function suggestFiligranQuantity(
  line: FramvindaContractLine,
  elements: ElementData[],
  periodStart: string,
  periodEnd: string
): number {
  // Match filigran elements on specific building + floor
  const matching = elements.filter(
    (e) =>
      e.element_type === 'filigran' &&
      e.building_id === line.building_id &&
      e.floor === line.floor &&
      isInPeriod(e.cast_at, periodStart, periodEnd)
  )

  if (line.pricing_unit === 'm2') {
    // Sum area of matching elements
    return matching.reduce(
      (sum, e) => sum + calculateAreaM2(e.length_mm, e.width_mm),
      0
    )
  }

  return matching.length
}

function suggestByDrawingReference(
  line: FramvindaContractLine,
  elements: ElementData[],
  periodStart: string,
  periodEnd: string
): number {
  if (!line.drawing_reference_pattern) return 0

  const pattern = line.drawing_reference_pattern.toLowerCase()

  // Match elements by drawing reference and cast date in period
  const matching = elements.filter((e) => {
    if (!e.drawing_reference) return false
    const ref = e.drawing_reference.toLowerCase()
    return ref === pattern || ref.startsWith(pattern + '-') || ref.startsWith(pattern + ' ')
  }).filter((e) => isInPeriod(e.cast_at, periodStart, periodEnd))

  if (line.is_extra) {
    // Extra lines use same count as parent (same elements, different price)
    return matching.length
  }

  if (line.pricing_unit === 'm2') {
    return matching.reduce(
      (sum, e) => sum + calculateAreaM2(e.length_mm, e.width_mm),
      0
    )
  }

  return matching.length
}

function suggestStigarQuantity(
  line: FramvindaContractLine,
  elements: ElementData[],
  periodStart: string,
  periodEnd: string
): number {
  const matching = elements.filter(
    (e) =>
      e.element_type === 'staircase' &&
      isInPeriod(e.ready_at, periodStart, periodEnd)
  )
  return matching.length
}

function suggestFlutningurQuantity(
  deliveries: DeliveryData[],
  periodStart: string,
  periodEnd: string
): number {
  return deliveries.filter(
    (d) =>
      d.status === 'completed' &&
      isInPeriod(d.completed_at, periodStart, periodEnd)
  ).length
}

// ============================================================
// Contract setup auto-suggest: generate initial contract lines
// ============================================================

interface BuildingData {
  id: string
  name: string
  floors: number | null
}

export interface SuggestedContractLine {
  category: FramvindaCategory
  label: string
  pricing_unit: 'm2' | 'stk' | 'ferdir'
  contract_count: number | null
  unit_area_m2: number | null
  total_quantity: number
  building_id: string | null
  floor: number | null
  element_type_key: string | null
  drawing_reference_pattern: string | null
  is_extra: boolean
  sort_order: number
}

/** Generate suggested contract lines from project's element data */
export function suggestContractLines(
  elements: ElementData[],
  buildings: BuildingData[],
  deliveryCount: number
): SuggestedContractLine[] {
  const lines: SuggestedContractLine[] = []
  let sortOrder = 0

  // --- Filigran: group by building + floor ---
  const filigranElements = elements.filter((e) => e.element_type === 'filigran')
  const buildingMap = new Map(buildings.map((b) => [b.id, b]))

  // Group by building_id + floor
  const filigranGroups = new Map<string, ElementData[]>()
  for (const el of filigranElements) {
    const key = `${el.building_id ?? 'unknown'}_${el.floor ?? 0}`
    if (!filigranGroups.has(key)) filigranGroups.set(key, [])
    filigranGroups.get(key)!.push(el)
  }

  for (const [key, groupElements] of filigranGroups) {
    const [buildingId, floorStr] = key.split('_')
    const building = buildingMap.get(buildingId)
    const floor = parseInt(floorStr, 10)
    const totalM2 = groupElements.reduce(
      (sum, e) => sum + calculateAreaM2(e.length_mm, e.width_mm),
      0
    )

    const buildingName = building?.name ?? 'Óþekkt'
    lines.push({
      category: 'filigran',
      label: `${buildingName} ${floor}. hæð`,
      pricing_unit: 'm2',
      contract_count: null,
      unit_area_m2: null,
      total_quantity: Math.round(totalM2 * 100) / 100,
      building_id: buildingId !== 'unknown' ? buildingId : null,
      floor: isNaN(floor) ? null : floor,
      element_type_key: 'filigran',
      drawing_reference_pattern: null,
      is_extra: false,
      sort_order: sortOrder++,
    })
  }

  // --- Svalir: group by drawing_reference ---
  const balconyElements = elements.filter((e) => e.element_type === 'balcony')
  const balconyGroups = groupByDrawingReference(balconyElements)

  for (const [ref, groupElements] of balconyGroups) {
    const count = groupElements.length
    const avgArea =
      groupElements.reduce(
        (sum, e) => sum + calculateAreaM2(e.length_mm, e.width_mm),
        0
      ) / (count || 1)
    const totalM2 = avgArea * count

    lines.push({
      category: 'svalir',
      label: ref,
      pricing_unit: 'm2',
      contract_count: count,
      unit_area_m2: Math.round(avgArea * 10000) / 10000,
      total_quantity: Math.round(totalM2 * 100) / 100,
      building_id: null,
      floor: null,
      element_type_key: 'balcony',
      drawing_reference_pattern: ref,
      is_extra: false,
      sort_order: sortOrder++,
    })
  }

  // --- Stigar: count staircases ---
  const staircaseElements = elements.filter(
    (e) => e.element_type === 'staircase'
  )
  if (staircaseElements.length > 0) {
    lines.push({
      category: 'stigar',
      label: 'Stigar',
      pricing_unit: 'stk',
      contract_count: staircaseElements.length,
      unit_area_m2: null,
      total_quantity: staircaseElements.length,
      building_id: null,
      floor: null,
      element_type_key: 'staircase',
      drawing_reference_pattern: null,
      is_extra: false,
      sort_order: sortOrder++,
    })
  }

  // --- Svalagangar: group by drawing_reference ---
  const svalagangurElements = elements.filter(
    (e) => e.element_type === 'svalagangur'
  )
  const sgGroups = groupByDrawingReference(svalagangurElements)

  for (const [ref, groupElements] of sgGroups) {
    const count = groupElements.length
    const avgArea =
      groupElements.reduce(
        (sum, e) => sum + calculateAreaM2(e.length_mm, e.width_mm),
        0
      ) / (count || 1)
    const totalM2 = avgArea * count

    lines.push({
      category: 'svalagangar',
      label: ref,
      pricing_unit: 'm2',
      contract_count: count,
      unit_area_m2: Math.round(avgArea * 10000) / 10000,
      total_quantity: Math.round(totalM2 * 100) / 100,
      building_id: null,
      floor: null,
      element_type_key: 'svalagangur',
      drawing_reference_pattern: ref,
      is_extra: false,
      sort_order: sortOrder++,
    })
  }

  // --- Flutningur ---
  if (deliveryCount > 0) {
    // Add flutningur line when there are deliveries
    lines.push({
      category: 'flutningur',
      label: 'Flutningur á byggingarstað',
      pricing_unit: 'ferdir',
      contract_count: deliveryCount || null,
      unit_area_m2: null,
      total_quantity: deliveryCount || 0,
      building_id: null,
      floor: null,
      element_type_key: null,
      drawing_reference_pattern: null,
      is_extra: false,
      sort_order: sortOrder++,
    })
  }

  return lines
}

function groupByDrawingReference(
  elements: ElementData[]
): Map<string, ElementData[]> {
  const groups = new Map<string, ElementData[]>()
  for (const el of elements) {
    const ref = el.drawing_reference?.trim() || el.name || 'Óþekkt'
    if (!groups.has(ref)) groups.set(ref, [])
    groups.get(ref)!.push(el)
  }
  return groups
}

// ============================================================
// Vísitala (price index) calculation
// ============================================================

export function calculateVisitala(
  periodSubtotal: number,
  grunnvisitala: number,
  currentVisitala: number,
  vatRate = 0,
  retainagePercentage = 0
): PeriodSummary {
  const visitalaMultiplier = currentVisitala / grunnvisitala
  const visitalaAmount = (visitalaMultiplier - 1) * periodSubtotal
  const totalWithVisitala = periodSubtotal + visitalaAmount

  const retainageAmount = totalWithVisitala * (retainagePercentage / 100)
  const totalAfterRetainage = totalWithVisitala - retainageAmount

  const vatAmount = totalAfterRetainage * (vatRate / 100)
  const grandTotalWithVat = totalAfterRetainage + vatAmount

  return {
    subtotal: periodSubtotal,
    grunnvisitala,
    visitala: currentVisitala,
    visitalaMultiplier,
    visitalaAmount: Math.round(visitalaAmount),
    totalWithVisitala: Math.round(totalWithVisitala),
    retainagePercentage,
    retainageAmount: Math.round(retainageAmount),
    totalAfterRetainage: Math.round(totalAfterRetainage),
    vatRate,
    vatAmount: Math.round(vatAmount),
    grandTotalWithVat: Math.round(grandTotalWithVat),
  }
}

// ============================================================
// Number formatting (Icelandic)
// ============================================================

/** Format number as Icelandic currency: 1.234.567 kr */
export function formatISK(amount: number): string {
  const rounded = Math.round(amount)
  return rounded.toLocaleString('is-IS') + ' kr'
}

/** Format number with Icelandic decimals: 1.234,56 */
export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('is-IS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format percentage: 33% */
export function formatPercent(n: number): string {
  return Math.round(n * 100) + '%'
}
