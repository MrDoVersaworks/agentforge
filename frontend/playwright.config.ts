import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // sovereign-ignore: no_hardcoded_urls, no_insecure_protocols
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    // sovereign-ignore: no-magic-numbers
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'tablet-safari',
      use: { ...devices['iPad Mini'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    // sovereign-ignore: no_hardcoded_urls, no_insecure_protocols
    url: 'http://localhost:3003',
    reuseExistingServer: true,
    // sovereign-ignore: no-magic-numbers
    timeout: 120 * 1000,
  },
});
