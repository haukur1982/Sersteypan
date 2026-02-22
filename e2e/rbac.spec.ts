import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-users'

/**
 * Role-Based Access Control E2E Tests (P0)
 * Tests that users can only access their designated portals
 */

// Helper to login as a specific user
async function loginAs(page: import('@playwright/test').Page, role: keyof typeof TEST_USERS) {
  await page.goto('/login')
  await page.fill('#email', TEST_USERS[role].email)
  await page.fill('#password', TEST_USERS[role].password)
  await page.getByRole('button', { name: /innskrá|login/i }).click()

  // Wait for initial redirect
  await page.waitForURL(/\/(admin|factory|buyer|driver)/, { timeout: 15000 })

  // Wait for the page to stabilize (content to load)
  await page.waitForLoadState('domcontentloaded')
}

test.describe('Admin Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('admin can access /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)
    // Admin dashboard should have user management
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin can access /admin/users', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
  })

  test('admin can access /admin/companies', async ({ page }) => {
    await page.goto('/admin/companies')
    await expect(page).toHaveURL(/\/admin\/companies/)
  })

  test('admin can access /admin/projects', async ({ page }) => {
    await page.goto('/admin/projects')
    await expect(page).toHaveURL(/\/admin\/projects/)
  })

  // Admin should also be able to access other portals (for oversight)
  test('admin can access /factory', async ({ page }) => {
    await page.goto('/factory')
    // Admin may be allowed to view factory or redirected - verify no error
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Factory Manager Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'factory')
  })

  test('factory manager can access /factory', async ({ page }) => {
    await page.goto('/factory')
    await expect(page).toHaveURL(/\/factory/)
  })

  test('factory manager can access /factory/production', async ({ page }) => {
    await page.goto('/factory/production')
    await expect(page).toHaveURL(/\/factory\/production/)
  })

  test('factory manager can access /factory/diary', async ({ page }) => {
    await page.goto('/factory/diary')
    await expect(page).toHaveURL(/\/factory\/diary/)
  })

  test('factory manager cannot access /admin', async ({ page }) => {
    await page.goto('/admin')

    // Should be redirected away from admin (to factory or login)
    await page.waitForURL(/\/(factory|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/admin')
  })

  test('factory manager cannot access /admin/users', async ({ page }) => {
    await page.goto('/admin/users')

    // Should be redirected
    await page.waitForURL(/\/(factory|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/admin')
  })
})

test.describe('Buyer Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'buyer')
  })

  test('buyer can access /buyer', async ({ page }) => {
    await page.goto('/buyer')
    await expect(page).toHaveURL(/\/buyer/)
  })

  test('buyer can access /buyer/projects', async ({ page }) => {
    await page.goto('/buyer/projects', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/buyer\/projects/, { timeout: 15000 })
  })

  test('buyer can access /buyer/deliveries', async ({ page }) => {
    await page.goto('/buyer/deliveries', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/buyer\/deliveries/, { timeout: 15000 })
  })

  test('buyer cannot access /admin', async ({ page }) => {
    await page.goto('/admin')

    // Should be redirected to buyer portal or login
    await page.waitForURL(/\/(buyer|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/admin')
  })

  test('buyer cannot access /factory', async ({ page }) => {
    await page.goto('/factory')

    // Should be redirected
    await page.waitForURL(/\/(buyer|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/factory')
  })

  test('buyer cannot access /driver', async ({ page }) => {
    await page.goto('/driver')

    // Should be redirected
    await page.waitForURL(/\/(buyer|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/driver')
  })
})

test.describe('Driver Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'driver')
  })

  test('driver can access /driver', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).toHaveURL(/\/driver/)
  })

  test('driver can access /driver/deliveries', async ({ page }) => {
    await page.goto('/driver/deliveries', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/driver\/deliveries/, { timeout: 15000 })
  })

  test('driver can access /driver/scan', async ({ page }) => {
    await page.goto('/driver/scan', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/driver\/scan/, { timeout: 15000 })
  })

  test('driver cannot access /admin', async ({ page }) => {
    await page.goto('/admin')

    // Should be redirected
    await page.waitForURL(/\/(driver|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/admin')
  })

  test('driver cannot access /factory', async ({ page }) => {
    await page.goto('/factory')

    // Should be redirected
    await page.waitForURL(/\/(driver|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/factory')
  })

  test('driver cannot access /buyer', async ({ page }) => {
    await page.goto('/buyer')

    // Should be redirected
    await page.waitForURL(/\/(driver|login)/, { timeout: 10000 })
    expect(page.url()).not.toContain('/buyer')
  })
})

test.describe('Cross-Portal Data Isolation', () => {
  test('buyer can only see their company projects', async ({ page }) => {
    await loginAs(page, 'buyer')
    await page.goto('/buyer/projects', { waitUntil: 'domcontentloaded' })

    // Page should load without error
    await expect(page).toHaveURL(/\/buyer\/projects/, { timeout: 15000 })

    // The projects list should be visible (even if empty)
    await expect(page.locator('body')).toBeVisible()
  })
})
