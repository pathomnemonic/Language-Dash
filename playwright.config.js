import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  timeout: 30000,
  expect: {
    timeout: 8000
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',
    // The page ships a Content-Security-Policy, which also blocks the string evaluation Playwright uses for waitForFunction.
    // Tests run without it; csp.spec.js turns it back on (test.use({ bypassCSP: false })) to check the real policy.
    bypassCSP: true,
    // A player chooses a language pair on first launch; tests start with one chosen (English speaker learning Spanish).
    // The welcome screen itself is covered by tests/e2e/welcome.spec.js, which clears it.
    storageState: {
      cookies: [],
      origins: [{ origin: new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173').origin, localStorage: [{ name: 'langdash.pair.v1', value: JSON.stringify({ known: 'en', target: 'es' }) }, { name: 'ld_levels', value: JSON.stringify({ 'en-es': { level: 'beginner', frontier: 80, source: 'beginner', at: 0 } }) }] }]
    },
    // Set PW_CHROMIUM to use a browser that is already installed instead of the one Playwright downloads
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 8000,
    navigationTimeout: 15000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] }
    }
  ],
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
