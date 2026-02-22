/**
 * Shared E2E test credentials.
 *
 * Uses env vars when available (CI, staging), falls back to default
 * test-account values for local development.
 *
 * Env vars:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 *   E2E_FACTORY_EMAIL, E2E_FACTORY_PASSWORD
 *   E2E_BUYER_EMAIL, E2E_BUYER_PASSWORD
 *   E2E_DRIVER_EMAIL, E2E_DRIVER_PASSWORD
 */
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'owner.admin@sersteypan.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'OwnerAccess!2026',
    portal: '/admin',
  },
  factory: {
    email: process.env.E2E_FACTORY_EMAIL || 'owner.factory@sersteypan.test',
    password: process.env.E2E_FACTORY_PASSWORD || 'OwnerAccess!2026',
    portal: '/factory',
  },
  buyer: {
    email: process.env.E2E_BUYER_EMAIL || 'owner.buyer@sersteypan.test',
    password: process.env.E2E_BUYER_PASSWORD || 'OwnerAccess!2026',
    portal: '/buyer',
  },
  driver: {
    email: process.env.E2E_DRIVER_EMAIL || 'owner.driver@sersteypan.test',
    password: process.env.E2E_DRIVER_PASSWORD || 'OwnerAccess!2026',
    portal: '/driver',
  },
} as const

export type TestRole = keyof typeof TEST_USERS
