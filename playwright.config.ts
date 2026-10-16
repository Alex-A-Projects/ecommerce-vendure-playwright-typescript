import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Vendure test suite.
 *
 * Targets:
 *   - Storefront UI:   https://storefront.demo.vendure.io/
 *   - GraphQL Shop API: https://demo.vendure.io/shop-api
 *   - GraphQL Admin:    https://demo.vendure.io/admin-api
 *   - Database:         local SQLite file `vendure.sqlite` (optional)
 *
 * Three top-level test directories, each can be filtered with:
 *   - `npm run test:ui-only`
 *   - `npm run test:api-only`
 *   - `npm run test:db-only`
 *
 * Most UI tests are serial because they share the public demo's catalog
 * state. API + DB tests can run in parallel against the read-only public
 * shop-api GraphQL endpoint.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reportSlowTests: { max: 5, threshold: 20_000 },
  use: {
    baseURL: 'https://storefront.demo.vendure.io',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
