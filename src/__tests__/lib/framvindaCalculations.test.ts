import { describe, it, expect } from 'vitest'
import {
  suggestQuantityForLine,
  suggestContractLines,
  calculateAreaM2,
} from '@/lib/framvinda/calculations'
import type { FramvindaContractLine } from '@/lib/framvinda/types'

// ============================================================
// Test helpers
// ============================================================

function makeElement(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    name: null as string | null,
    element_type: 'filigran' as string | null,
    building_id: 'bld-1' as string | null,
    floor: 1 as number | null,
    length_mm: 6000 as number | null,
    width_mm: 1200 as number | null,
    drawing_reference: null as string | null,
    status: 'cast' as string | null,
    cast_at: '2026-02-15T10:00:00Z' as string | null,
    ready_at: null as string | null,
    delivered_at: null as string | null,
    piece_count: 1 as number | null,
    ...overrides,
  }
}

function makeContractLine(overrides: Partial<FramvindaContractLine> = {}): FramvindaContractLine {
  return {
    id: crypto.randomUUID(),
    contract_id: 'contract-1',
    category: 'filigran',
    label: 'Test line',
    is_extra: false,
    extra_description: null,
    pricing_unit: 'm2',
    contract_count: null,
    unit_area_m2: null,
    total_quantity: 100,
    unit_price: 10000,
    total_price: 1000000,
    building_id: 'bld-1',
    floor: 1,
    element_type_key: 'filigran',
    drawing_reference_pattern: null,
    revision_id: null,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

const PERIOD_START = '2026-02-01'
const PERIOD_END = '2026-02-28'

// ============================================================
// piece_count tests
// ============================================================

describe('piece_count handling', () => {
  it('counts multi-piece elements correctly for filigran (count mode)', () => {
    const elements = [
      makeElement({ piece_count: 3 }),
      makeElement({ piece_count: 2 }),
      makeElement({ piece_count: 1 }),
    ]
    const line = makeContractLine({ pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(6) // 3 + 2 + 1 = 6, not 3 (rows)
  })

  it('multiplies area by piece_count for filigran (m2 mode)', () => {
    const elements = [
      makeElement({ length_mm: 6000, width_mm: 1200, piece_count: 3 }),
    ]
    const line = makeContractLine({ pricing_unit: 'm2' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    const expectedArea = calculateAreaM2(6000, 1200) * 3 // 7.2 * 3 = 21.6
    expect(result).toBeCloseTo(expectedArea, 4)
  })

  it('treats null piece_count as 1', () => {
    const elements = [
      makeElement({ piece_count: null }),
      makeElement({ piece_count: null }),
    ]
    const line = makeContractLine({ pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(2)
  })

  it('counts piece_count for balcony (svalir) category', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1',
        piece_count: 5,
      }),
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1',
        piece_count: 3,
      }),
    ]
    const line = makeContractLine({
      category: 'svalir',
      drawing_reference_pattern: 'SV-1',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(8) // 5 + 3, not 2 (rows)
  })

  it('counts piece_count for staircase (stigar) category', () => {
    const elements = [
      makeElement({
        element_type: 'staircase',
        piece_count: 2,
        ready_at: '2026-02-10T10:00:00Z',
      }),
    ]
    const line = makeContractLine({
      category: 'stigar',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(2) // not 1
  })
})

// ============================================================
// Drawing reference matching tests
// ============================================================

describe('drawing reference matching', () => {
  it('falls back to element name when drawing_reference is null', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: null,
        name: 'SV-1',
        piece_count: 1,
      }),
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1',
        piece_count: 1,
      }),
    ]
    const line = makeContractLine({
      category: 'svalir',
      drawing_reference_pattern: 'SV-1',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(2) // both should match, not just the one with drawing_reference
  })

  it('does not match when both drawing_reference and name are null', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: null,
        name: null,
        piece_count: 1,
      }),
    ]
    const line = makeContractLine({
      category: 'svalir',
      drawing_reference_pattern: 'SV-1',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(0)
  })

  it('matches case-insensitively', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'sv-1',
        piece_count: 1,
      }),
    ]
    const line = makeContractLine({
      category: 'svalir',
      drawing_reference_pattern: 'SV-1',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1)
  })

  it('matches prefix patterns (SV-1 matches SV-1-A)', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1-A',
        piece_count: 1,
      }),
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1-B',
        piece_count: 1,
      }),
    ]
    const line = makeContractLine({
      category: 'svalir',
      drawing_reference_pattern: 'SV-1',
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(2)
  })
})

// ============================================================
// Building + floor matching tests
// ============================================================

describe('building and floor matching', () => {
  it('matches elements with null floor to contract line with floor 0', () => {
    const elements = [
      makeElement({ floor: null }),
    ]
    // Contract line would store floor: 0 (from contract setup normalization)
    const line = makeContractLine({ floor: 0, pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1)
  })

  it('matches elements with null floor to contract line with null floor', () => {
    const elements = [
      makeElement({ floor: null }),
    ]
    const line = makeContractLine({ floor: null, pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1)
  })

  it('matches elements with null building_id to contract line with null building_id', () => {
    const elements = [
      makeElement({ building_id: null }),
    ]
    const line = makeContractLine({ building_id: null, pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1)
  })

  it('does not cross-match different buildings', () => {
    const elements = [
      makeElement({ building_id: 'bld-1' }),
      makeElement({ building_id: 'bld-2' }),
    ]
    const line = makeContractLine({ building_id: 'bld-1', pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1) // only bld-1
  })

  it('does not cross-match different floors', () => {
    const elements = [
      makeElement({ floor: 1 }),
      makeElement({ floor: 2 }),
      makeElement({ floor: 3 }),
    ]
    const line = makeContractLine({ floor: 2, pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1) // only floor 2
  })

  it('handles multiple buildings and floors correctly', () => {
    const elements = [
      makeElement({ building_id: 'bld-1', floor: 1 }),
      makeElement({ building_id: 'bld-1', floor: 1 }),
      makeElement({ building_id: 'bld-1', floor: 2 }),
      makeElement({ building_id: 'bld-2', floor: 1 }),
    ]
    const line = makeContractLine({
      building_id: 'bld-1',
      floor: 1,
      pricing_unit: 'stk',
    })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(2) // only bld-1 + floor 1
  })
})

// ============================================================
// Period date filtering tests
// ============================================================

describe('period date filtering', () => {
  it('only counts elements with cast_at within the period', () => {
    const elements = [
      makeElement({ cast_at: '2026-02-15T10:00:00Z' }), // in period
      makeElement({ cast_at: '2026-01-15T10:00:00Z' }), // before period
      makeElement({ cast_at: '2026-03-15T10:00:00Z' }), // after period
      makeElement({ cast_at: null }),                     // no cast date
    ]
    const line = makeContractLine({ pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1)
  })

  it('uses ready_at for staircase elements', () => {
    const elements = [
      makeElement({
        element_type: 'staircase',
        ready_at: '2026-02-15T10:00:00Z',
        cast_at: null,
      }),
      makeElement({
        element_type: 'staircase',
        ready_at: '2026-01-15T10:00:00Z',
        cast_at: '2026-02-15T10:00:00Z', // cast_at in period but shouldn't matter
      }),
    ]
    const line = makeContractLine({ category: 'stigar', pricing_unit: 'stk' })

    const result = suggestQuantityForLine(line, elements, [], PERIOD_START, PERIOD_END)
    expect(result).toBe(1) // only the one with ready_at in period
  })
})

// ============================================================
// suggestContractLines tests
// ============================================================

describe('suggestContractLines', () => {
  it('sums piece_count in balcony contract_count', () => {
    const elements = [
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1',
        piece_count: 3,
        length_mm: 3000,
        width_mm: 1500,
      }),
      makeElement({
        element_type: 'balcony',
        drawing_reference: 'SV-1',
        piece_count: 2,
        length_mm: 3000,
        width_mm: 1500,
      }),
    ]

    const lines = suggestContractLines(elements, [], 0)
    const svalirLine = lines.find((l) => l.category === 'svalir')

    expect(svalirLine).toBeDefined()
    expect(svalirLine!.contract_count).toBe(5) // 3 + 2, not 2 (rows)
  })

  it('sums piece_count in staircase contract_count', () => {
    const elements = [
      makeElement({ element_type: 'staircase', piece_count: 4 }),
      makeElement({ element_type: 'staircase', piece_count: 2 }),
    ]

    const lines = suggestContractLines(elements, [], 0)
    const stigarLine = lines.find((l) => l.category === 'stigar')

    expect(stigarLine).toBeDefined()
    expect(stigarLine!.contract_count).toBe(6)
    expect(stigarLine!.total_quantity).toBe(6)
  })

  it('groups filigran by building and floor', () => {
    const buildings = [
      { id: 'bld-1', name: 'Hús A', floors: 3 },
      { id: 'bld-2', name: 'Hús B', floors: 2 },
    ]
    const elements = [
      makeElement({ building_id: 'bld-1', floor: 1 }),
      makeElement({ building_id: 'bld-1', floor: 1 }),
      makeElement({ building_id: 'bld-1', floor: 2 }),
      makeElement({ building_id: 'bld-2', floor: 1 }),
    ]

    const lines = suggestContractLines(elements, buildings, 0)
    const filigranLines = lines.filter((l) => l.category === 'filigran')

    expect(filigranLines).toHaveLength(3) // bld-1/floor1, bld-1/floor2, bld-2/floor1
    const bld1Floor1 = filigranLines.find(
      (l) => l.building_id === 'bld-1' && l.floor === 1
    )
    expect(bld1Floor1).toBeDefined()
    // Area = 2 elements × (6000mm × 1200mm) = 2 × 7.2m² = 14.4m²
    expect(bld1Floor1!.total_quantity).toBeCloseTo(14.4, 1)
  })

  it('multiplies area by piece_count in filigran', () => {
    const buildings = [{ id: 'bld-1', name: 'Hús A', floors: 1 }]
    const elements = [
      makeElement({
        building_id: 'bld-1',
        floor: 1,
        length_mm: 6000,
        width_mm: 1200,
        piece_count: 3,
      }),
    ]

    const lines = suggestContractLines(elements, buildings, 0)
    const filigranLine = lines.find((l) => l.category === 'filigran')

    // 1 element × 3 pieces × 7.2m² = 21.6m²
    expect(filigranLine!.total_quantity).toBeCloseTo(21.6, 1)
  })
})

// ============================================================
// calculateAreaM2 tests
// ============================================================

describe('calculateAreaM2', () => {
  it('converts mm to m2 correctly', () => {
    expect(calculateAreaM2(6000, 1200)).toBeCloseTo(7.2, 4)
    expect(calculateAreaM2(1000, 1000)).toBeCloseTo(1.0, 4)
  })

  it('returns 0 for null dimensions', () => {
    expect(calculateAreaM2(null, 1200)).toBe(0)
    expect(calculateAreaM2(6000, null)).toBe(0)
    expect(calculateAreaM2(null, null)).toBe(0)
  })
})
