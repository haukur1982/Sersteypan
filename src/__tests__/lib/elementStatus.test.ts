import { describe, it, expect } from 'vitest'

// Element status flow: planned → rebar → cast → curing → ready → loaded → delivered
const ELEMENT_STATUSES = ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded', 'delivered'] as const
type ElementStatus = typeof ELEMENT_STATUSES[number]

// Helper functions we're testing (these would normally be imported from a utils file)
function getStatusIndex(status: ElementStatus): number {
  return ELEMENT_STATUSES.indexOf(status)
}

function isValidTransition(from: ElementStatus, to: ElementStatus): boolean {
  const fromIndex = getStatusIndex(from)
  const toIndex = getStatusIndex(to)
  // Can only move forward by one step, or stay the same
  return toIndex === fromIndex + 1 || toIndex === fromIndex
}

function getNextStatus(current: ElementStatus): ElementStatus | null {
  const index = getStatusIndex(current)
  if (index === ELEMENT_STATUSES.length - 1) return null
  return ELEMENT_STATUSES[index + 1]
}

function canLoad(status: ElementStatus): boolean {
  return status === 'ready'
}

function isProduction(status: ElementStatus): boolean {
  return ['rebar', 'cast', 'curing'].includes(status)
}

function isCompleted(status: ElementStatus): boolean {
  return status === 'delivered'
}

describe('Element Status Flow', () => {
  describe('status ordering', () => {
    it('has correct number of statuses', () => {
      expect(ELEMENT_STATUSES).toHaveLength(7)
    })

    it('starts with planned', () => {
      expect(ELEMENT_STATUSES[0]).toBe('planned')
    })

    it('ends with delivered', () => {
      expect(ELEMENT_STATUSES[ELEMENT_STATUSES.length - 1]).toBe('delivered')
    })
  })

  describe('getStatusIndex', () => {
    it('returns correct index for planned', () => {
      expect(getStatusIndex('planned')).toBe(0)
    })

    it('returns correct index for ready', () => {
      expect(getStatusIndex('ready')).toBe(4)
    })

    it('returns correct index for delivered', () => {
      expect(getStatusIndex('delivered')).toBe(6)
    })
  })

  describe('isValidTransition', () => {
    it('allows planned → rebar', () => {
      expect(isValidTransition('planned', 'rebar')).toBe(true)
    })

    it('allows rebar → cast', () => {
      expect(isValidTransition('rebar', 'cast')).toBe(true)
    })

    it('allows cast → curing', () => {
      expect(isValidTransition('cast', 'curing')).toBe(true)
    })

    it('allows curing → ready', () => {
      expect(isValidTransition('curing', 'ready')).toBe(true)
    })

    it('allows ready → loaded', () => {
      expect(isValidTransition('ready', 'loaded')).toBe(true)
    })

    it('allows loaded → delivered', () => {
      expect(isValidTransition('loaded', 'delivered')).toBe(true)
    })

    it('allows staying at same status', () => {
      expect(isValidTransition('cast', 'cast')).toBe(true)
    })

    it('rejects skipping statuses', () => {
      expect(isValidTransition('planned', 'cast')).toBe(false)
    })

    it('rejects going backwards', () => {
      expect(isValidTransition('cast', 'rebar')).toBe(false)
    })

    it('rejects planned → delivered', () => {
      expect(isValidTransition('planned', 'delivered')).toBe(false)
    })
  })

  describe('getNextStatus', () => {
    it('returns rebar after planned', () => {
      expect(getNextStatus('planned')).toBe('rebar')
    })

    it('returns ready after curing', () => {
      expect(getNextStatus('curing')).toBe('ready')
    })

    it('returns null for delivered (final status)', () => {
      expect(getNextStatus('delivered')).toBeNull()
    })
  })

  describe('canLoad', () => {
    it('returns true for ready status', () => {
      expect(canLoad('ready')).toBe(true)
    })

    it('returns false for planned', () => {
      expect(canLoad('planned')).toBe(false)
    })

    it('returns false for cast', () => {
      expect(canLoad('cast')).toBe(false)
    })

    it('returns false for loaded', () => {
      expect(canLoad('loaded')).toBe(false)
    })

    it('returns false for delivered', () => {
      expect(canLoad('delivered')).toBe(false)
    })
  })

  describe('isProduction', () => {
    it('returns true for rebar', () => {
      expect(isProduction('rebar')).toBe(true)
    })

    it('returns true for cast', () => {
      expect(isProduction('cast')).toBe(true)
    })

    it('returns true for curing', () => {
      expect(isProduction('curing')).toBe(true)
    })

    it('returns false for planned', () => {
      expect(isProduction('planned')).toBe(false)
    })

    it('returns false for ready', () => {
      expect(isProduction('ready')).toBe(false)
    })

    it('returns false for delivered', () => {
      expect(isProduction('delivered')).toBe(false)
    })
  })

  describe('isCompleted', () => {
    it('returns true only for delivered', () => {
      expect(isCompleted('delivered')).toBe(true)
    })

    it('returns false for ready', () => {
      expect(isCompleted('ready')).toBe(false)
    })

    it('returns false for loaded', () => {
      expect(isCompleted('loaded')).toBe(false)
    })
  })
})
