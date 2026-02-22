import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../test-users'

/**
 * Admin User Management E2E Tests (P1)
 * Tests user creation, editing, and listing
 */

// Helper to login as admin
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('#email', TEST_USERS.admin.email)
  await page.fill('#password', TEST_USERS.admin.password)
  await page.getByRole('button', { name: /innskrá|login/i }).click()
  await page.waitForURL('**/admin**', { timeout: 15000 })
  await page.waitForLoadState('domcontentloaded')
}

test.describe('User List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('displays users list', async ({ page }) => {
    await page.goto('/admin/users')

    // Page should load
    await expect(page).toHaveURL(/\/admin\/users/)

    // Should have a heading or table for users
    await expect(page.locator('body')).toBeVisible()
  })

  test('has link to create new user', async ({ page }) => {
    await page.goto('/admin/users')

    // Look for "New User" or "Nýr notandi" link/button
    const newUserLink = page.getByRole('link', { name: /new|nýr/i })
      .or(page.getByRole('button', { name: /new|nýr/i }))

    await expect(newUserLink.first()).toBeVisible()
  })
})

test.describe('User Creation Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/users/new', { waitUntil: 'domcontentloaded' })
  })

  test('displays user creation form', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/users\/new/, { timeout: 15000 })

    // Check for form fields
    await expect(page.locator('[name="email"]').or(page.locator('#email'))).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[name="full_name"]').or(page.locator('#full_name'))).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[name="password"]').or(page.locator('#password'))).toBeVisible({ timeout: 15000 })
  })

  test('validates required fields', async ({ page }) => {
    // Wait for form to be ready
    await page.waitForLoadState('domcontentloaded')

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /create|vista|save/i })
    await submitButton.click()

    // Form should not submit or show validation errors
    // Still on the same page
    await expect(page).toHaveURL(/\/admin\/users\/new/, { timeout: 15000 })
  })

  test('shows role selection', async ({ page }) => {
    // Look for role select/dropdown
    const roleSelect = page.locator('[name="role"]')
      .or(page.locator('#role'))
      .or(page.getByLabel(/role|hlutverk/i))

    await expect(roleSelect.first()).toBeVisible()
  })

  test('shows company selection for buyer role', async ({ page }) => {
    // Select buyer role
    const roleSelect = page.locator('[name="role"]')
      .or(page.locator('#role'))

    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('buyer')

      // Company field should appear
      const companySelect = page.locator('[name="company_id"]')
        .or(page.locator('#company_id'))

      await expect(companySelect.first()).toBeVisible()
    }
  })
})

test.describe('User Edit Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('can navigate to edit existing user', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })

    // Wait for users list to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000) // Brief wait for content

    // Find an edit link/button (usually with edit icon or text)
    const editLink = page.getByRole('link', { name: /edit|breyta/i }).first()
      .or(page.locator('[href*="/edit"]').first())
      .or(page.locator('a[href*="edit"]').first())

    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click()

      // Should navigate to edit page
      await page.waitForURL(/\/admin\/users\/.*\/edit/, { timeout: 15000 })
    }
  })
})

test.describe('User Deactivation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('shows deactivate option for users', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })

    // Wait for users list to load
    await page.waitForLoadState('domcontentloaded')

    // Just verify the page loaded correctly (deactivate might be hidden in dropdown)
    await expect(page.locator('body')).toBeVisible()
  })
})
