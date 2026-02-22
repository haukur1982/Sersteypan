import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-users'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('#email', TEST_USERS.admin.email)
  await page.fill('#password', TEST_USERS.admin.password)
  await page.getByRole('button', { name: /innskrá|login/i }).click()
  await page.waitForURL('**/admin**', { timeout: 15000 })
}

test.describe('Smoke', () => {
  test('admin core pages render and sidebar menu is visible', async ({ page }) => {
    await loginAsAdmin(page)

    const pages = [
      '/admin',
      '/admin/companies',
      '/admin/projects',
      '/admin/users',
      '/admin/messages',
      '/admin/settings/element-types',
    ]

    for (const path of pages) {
      await page.goto(path)
      const sidebar = page.locator('aside').filter({ hasText: 'Sérsteypan' }).first()
      await expect(sidebar).toBeVisible()
      await expect(page.locator('main').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sérsteypan' })).toBeVisible()
      const logoutLinks = sidebar.getByRole('link', { name: /útskrá|log out/i })
      await expect(logoutLinks.first()).toBeVisible()
    }
  })
})
