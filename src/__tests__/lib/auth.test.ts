import { describe, it, expect } from 'vitest'

// Test the AuthUser type and role validation
type UserRole = 'admin' | 'factory_manager' | 'buyer' | 'driver'

interface AuthUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  companyId: string | null
}

// Role-based access control helpers
function canAccessAdmin(role: UserRole): boolean {
  return role === 'admin'
}

function canAccessFactory(role: UserRole): boolean {
  return role === 'admin' || role === 'factory_manager'
}

function canAccessBuyer(role: UserRole): boolean {
  return role === 'admin' || role === 'buyer'
}

function canAccessDriver(role: UserRole): boolean {
  return role === 'admin' || role === 'driver'
}

function getPortalPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'factory_manager':
      return '/factory'
    case 'buyer':
      return '/buyer'
    case 'driver':
      return '/driver'
    default:
      return '/login'
  }
}

// Role normalization (handles Icelandic variants)
const roleMap: Record<string, UserRole | undefined> = {
  'admin': 'admin',
  'Admin': 'admin',
  'Kerfisstjóri': 'admin',
  'factory_manager': 'factory_manager',
  'Factory Manager': 'factory_manager',
  'Verksmiðjustjóri': 'factory_manager',
  'buyer': 'buyer',
  'Buyer': 'buyer',
  'Kaupamadur': 'buyer',
  'driver': 'driver',
  'Driver': 'driver',
  'Bílstjóri': 'driver',
}

function normalizeRole(role: string): UserRole | undefined {
  return roleMap[role]
}

describe('Authentication & Authorization', () => {
  describe('Role-based portal access', () => {
    it('admin can access admin portal', () => {
      expect(canAccessAdmin('admin')).toBe(true)
    })

    it('factory_manager cannot access admin portal', () => {
      expect(canAccessAdmin('factory_manager')).toBe(false)
    })

    it('buyer cannot access admin portal', () => {
      expect(canAccessAdmin('buyer')).toBe(false)
    })

    it('driver cannot access admin portal', () => {
      expect(canAccessAdmin('driver')).toBe(false)
    })
  })

  describe('Factory portal access', () => {
    it('admin can access factory portal', () => {
      expect(canAccessFactory('admin')).toBe(true)
    })

    it('factory_manager can access factory portal', () => {
      expect(canAccessFactory('factory_manager')).toBe(true)
    })

    it('buyer cannot access factory portal', () => {
      expect(canAccessFactory('buyer')).toBe(false)
    })

    it('driver cannot access factory portal', () => {
      expect(canAccessFactory('driver')).toBe(false)
    })
  })

  describe('getPortalPath', () => {
    it('returns /admin for admin role', () => {
      expect(getPortalPath('admin')).toBe('/admin')
    })

    it('returns /factory for factory_manager role', () => {
      expect(getPortalPath('factory_manager')).toBe('/factory')
    })

    it('returns /buyer for buyer role', () => {
      expect(getPortalPath('buyer')).toBe('/buyer')
    })

    it('returns /driver for driver role', () => {
      expect(getPortalPath('driver')).toBe('/driver')
    })
  })

  describe('Role normalization', () => {
    it('normalizes lowercase admin', () => {
      expect(normalizeRole('admin')).toBe('admin')
    })

    it('normalizes capitalized Admin', () => {
      expect(normalizeRole('Admin')).toBe('admin')
    })

    it('normalizes Icelandic Kerfisstjóri to admin', () => {
      expect(normalizeRole('Kerfisstjóri')).toBe('admin')
    })

    it('normalizes Verksmiðjustjóri to factory_manager', () => {
      expect(normalizeRole('Verksmiðjustjóri')).toBe('factory_manager')
    })

    it('normalizes Bílstjóri to driver', () => {
      expect(normalizeRole('Bílstjóri')).toBe('driver')
    })

    it('returns undefined for unknown role', () => {
      expect(normalizeRole('unknown')).toBeUndefined()
    })
  })

  describe('AuthUser type validation', () => {
    it('creates valid admin user', () => {
      const user: AuthUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@sersteypan.is',
        fullName: 'System Admin',
        role: 'admin',
        companyId: null,
      }

      expect(user.role).toBe('admin')
      expect(user.companyId).toBeNull()
    })

    it('creates valid buyer user with company', () => {
      const user: AuthUser = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'buyer@construction.is',
        fullName: 'Construction Buyer',
        role: 'buyer',
        companyId: 'company-123',
      }

      expect(user.role).toBe('buyer')
      expect(user.companyId).toBe('company-123')
    })

    it('creates valid driver user', () => {
      const user: AuthUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        email: 'driver@sersteypan.is',
        fullName: 'Truck Driver',
        role: 'driver',
        companyId: null,
      }

      expect(user.role).toBe('driver')
    })
  })
})
