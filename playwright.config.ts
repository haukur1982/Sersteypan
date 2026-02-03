import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration for Sérsteypan
 * @see https://playwright.dev/docs/test-configuration
 */
const useExistingServer = process.env.PW_EXISTING_SERVER === 'true'

const browserProjectMap: Record<string, { name: string; use: (typeof devices)[keyof typeof devices] }> = {
  chromium: { name: 'chromium', use: devices['Desktop Chrome'] },
  firefox: { name: 'firefox', use: devices['Desktop Firefox'] },
  webkit: { name: 'webkit', use: devices['Desktop Safari'] },
}

const selectedBrowser = process.env.PW_BROWSER || 'chromium'
const selectedProject = browserProjectMap[selectedBrowser] || browserProjectMap.chromium

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [selectedProject],

  /* Run your local dev server before starting the tests */
  webServer: useExistingServer
    ? undefined
    : {
        command: 'E2E_TEST=true npm run dev',
        url: 'http://localhost:3000',
        // Allow reusing a manually started dev server when requested.
        // Set PW_REUSE_SERVER=true to skip starting a new server.
        reuseExistingServer: process.env.PW_REUSE_SERVER === 'true',
        timeout: 120 * 1000,
        env: {
          E2E_TEST: 'true',
        },
      },

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5 * 1000,
  },
})
