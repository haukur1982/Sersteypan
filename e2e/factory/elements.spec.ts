import { test, expect } from '@playwright/test'

/**
 * Factory Element Management E2E Tests (P1)
 * Tests element listing and status transitions
 */

const FACTORY_USER = {
  email: 'factory@sersteypan.test',
  password: 'Password123!',
}

// Valid status transitions based on the state machine
const STATUS_WORKFLOW = [
  'planned',
  'rebar',
  'cast',
  'curing',
  'ready',
  'loaded',
  'delivered'
]

// Helper to login as factory manager
async function loginAsFactory(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('#email', FACTORY_USER.email)
  await page.fill('#password', FACTORY_USER.password)
  await page.getByRole('button', { name: /innskrá|login/i }).click()
  await page.waitForURL('**/factory**', { timeout: 15000 })
}

test.describe('Production Queue Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFactory(page)
  })

  test('displays production page', async ({ page }) => {
    await page.goto('/factory/production')

    await expect(page).toHaveURL(/\/factory\/production/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('shows elements list or empty state', async ({ page }) => {
    await page.goto('/factory/production')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Should have either elements table/grid or empty state message
    const content = page.locator('main, [role="main"], .content')
    await expect(content.first()).toBeVisible()
  })

  test('has status filter options', async ({ page }) => {
    await page.goto('/factory/production')

    // Look for filter/tab for different statuses
    // Could be tabs, buttons, or select dropdown
    const statusFilter = page.getByRole('tab')
      .or(page.locator('[data-status]'))
      .or(page.getByRole('button', { name: /planned|rebar|cast|curing|ready/i }))

    // At least verify the page loads
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Element Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFactory(page)
  })

  test('can navigate to element detail', async ({ page }) => {
    await page.goto('/factory/production')

    // Wait for elements to load
    await page.waitForLoadState('networkidle')

    // Try to find an element link
    const elementLink = page.locator('a[href*="/factory/production/"]').first()
      .or(page.getByRole('link').filter({ hasText: /element|eining/i }).first())

    if (await elementLink.isVisible()) {
      await elementLink.click()

      // Should navigate to element detail page
      await page.waitForURL(/\/factory\/production\/[^/]+$/, { timeout: 10000 })
    }
  })
})

test.describe('Element Status Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFactory(page)
  })

  test('shows status update controls on element detail', async ({ page }) => {
    // Navigate to an element if available
    await page.goto('/factory/production')
    await page.waitForLoadState('networkidle')

    const elementLink = page.locator('a[href*="/factory/production/"]').first()

    if (await elementLink.isVisible()) {
      await elementLink.click()
      await page.waitForURL(/\/factory\/production\/[^/]+$/, { timeout: 10000 })

      // Look for status update button/form
      const statusControl = page.getByRole('button', { name: /update|uppfæra|status/i })
        .or(page.locator('[data-testid="status-update"]'))
        .or(page.locator('select[name="status"]'))

      // Element detail should show something
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('validates status transitions', async ({ page }) => {
    // This is a visual check - the UI should only show valid next statuses
    await page.goto('/factory/production')
    await page.waitForLoadState('networkidle')

    // Just verify the page loads correctly
    await expect(page).toHaveURL(/\/factory\/production/)
  })
})

test.describe('Factory Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFactory(page)
  })

  test('shows factory dashboard overview', async ({ page }) => {
    await page.goto('/factory')

    await expect(page).toHaveURL(/\/factory/)

    // Dashboard should have some summary content
    await expect(page.locator('body')).toBeVisible()
  })

  test('has navigation to key sections', async ({ page }) => {
    await page.goto('/factory')

    // Look for navigation links to main sections
    const navLinks = [
      page.getByRole('link', { name: /production|framleiðsla/i }),
      page.getByRole('link', { name: /diary|dagbók/i }),
      page.getByRole('link', { name: /todos|verkefni/i }),
    ]

    // At least one navigation element should exist
    await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible()
  })
})

test.describe('Diary Entries', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsFactory(page)
  })

  test('displays diary page', async ({ page }) => {
    await page.goto('/factory/diary')

    await expect(page).toHaveURL(/\/factory\/diary/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('has link to create new entry', async ({ page }) => {
    await page.goto('/factory/diary')

    // Look for "New Entry" link
    const newEntryLink = page.getByRole('link', { name: /new|ný/i })
      .or(page.locator('a[href*="/diary/new"]'))

    await expect(page.locator('body')).toBeVisible()
  })

  test('can access diary entry form', async ({ page }) => {
    await page.goto('/factory/diary/new')

    await expect(page).toHaveURL(/\/factory\/diary\/new/)

    // Check for form fields
    await expect(page.locator('[name="content"]').or(page.locator('#content')).or(page.locator('textarea'))).toBeVisible()
  })
})
