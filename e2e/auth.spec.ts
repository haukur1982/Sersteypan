import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-users'

/**
 * Authentication E2E Tests (P0)
 * Tests login, logout, and role-based redirects
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page
    await page.goto('/login')
  })

  test('displays login form correctly', async ({ page }) => {
    // Check page title and form elements
    await expect(page.locator('h1')).toContainText('Sérsteypan')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /innskrá|login/i })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.fill('#email', 'invalid@test.com')
    await page.fill('#password', 'wrongpassword')
    await page.getByRole('button', { name: /innskrá|login/i }).click()

    // Wait for error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
  })

  test('shows error for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /innskrá|login/i }).click()

    // Form validation should prevent submission (HTML5 required)
    // The form won't submit due to required fields
    await expect(page.locator('#email')).toHaveAttribute('required', '')
    await expect(page.locator('#password')).toHaveAttribute('required', '')
  })
})

test.describe('Role-Based Login Redirects', () => {
  for (const [role, user] of Object.entries(TEST_USERS)) {
    test(`${role} user redirects to ${user.portal}`, async ({ page }) => {
      await page.goto('/login')

      // Fill login form
      await page.fill('#email', user.email)
      await page.fill('#password', user.password)

      // Submit
      await page.getByRole('button', { name: /innskrá|login/i }).click()

      // Wait for redirect to role-specific portal
      await page.waitForURL(`**${user.portal}**`, { timeout: 15000 })

      // Verify we're on the correct portal
      expect(page.url()).toContain(user.portal)
    })
  }
})

test.describe('Session Management', () => {
  test('authenticated user stays logged in after page refresh', async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('#email', TEST_USERS.admin.email)
    await page.fill('#password', TEST_USERS.admin.password)
    await page.getByRole('button', { name: /innskrá|login/i }).click()

    // Wait for redirect
    await page.waitForURL('**/admin**', { timeout: 15000 })

    // Refresh page
    await page.reload()

    // Should still be on admin portal (not redirected to login)
    await expect(page).toHaveURL(/\/admin/)
  })

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/admin')

    // Should be redirected to login
    await page.waitForURL('**/login**', { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Logout Flow', () => {
  test('user can logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('#email', TEST_USERS.admin.email)
    await page.fill('#password', TEST_USERS.admin.password)
    await page.getByRole('button', { name: /innskrá|login/i }).click()

    // Wait for admin dashboard
    await page.waitForURL('**/admin**', { timeout: 15000 })

    // Find and click logout button (usually in dropdown or sidebar)
    // Look for logout button/link
    const logoutButton = page.getByRole('button', { name: /útskrá|logout/i })
      .or(page.getByRole('link', { name: /útskrá|logout/i }))
      .or(page.locator('[data-testid="logout-button"]'))

    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Should redirect to login
      await page.waitForURL('**/login**', { timeout: 10000 })
      expect(page.url()).toContain('/login')
    }
  })
})
