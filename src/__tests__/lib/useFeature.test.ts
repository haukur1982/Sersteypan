import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFeature } from '@/lib/hooks/useFeature'

// Mock the useAuth hook
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/lib/hooks/useAuth'

describe('useFeature hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    })

    const { result } = renderHook(() => useFeature('visual_pilot'))
    expect(result.current).toBe(false)
  })

  it('returns false when user has no preferences', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '123',
        email: 'test@test.com',
        fullName: 'Test User',
        role: 'buyer',
        companyId: null,
        preferences: {},
      },
      loading: false,
    })

    const { result } = renderHook(() => useFeature('visual_pilot'))
    expect(result.current).toBe(false)
  })

  it('returns false when feature is not enabled', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '123',
        email: 'test@test.com',
        fullName: 'Test User',
        role: 'buyer',
        companyId: null,
        preferences: {
          features: {
            visual_pilot: false,
          },
        },
      },
      loading: false,
    })

    const { result } = renderHook(() => useFeature('visual_pilot'))
    expect(result.current).toBe(false)
  })

  it('returns true when feature is enabled', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '123',
        email: 'test@test.com',
        fullName: 'Test User',
        role: 'driver',
        companyId: 'company-1',
        preferences: {
          features: {
            visual_pilot: true,
          },
        },
      },
      loading: false,
    })

    const { result } = renderHook(() => useFeature('visual_pilot'))
    expect(result.current).toBe(true)
  })

  it('returns false for non-existent feature', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '123',
        email: 'test@test.com',
        fullName: 'Test User',
        role: 'admin',
        companyId: null,
        preferences: {
          features: {
            visual_pilot: true,
          },
        },
      },
      loading: false,
    })

    const { result } = renderHook(() => useFeature('non_existent_feature'))
    expect(result.current).toBe(false)
  })
})
