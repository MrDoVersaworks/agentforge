import { defineConfig, devices } from '@playwright/test';
import { PLAYWRIGHT_TIMEOUT_MS, PLAYWRIGHT_VIEWPORT } from './src/constants/playwright';

const PUBLIC_ONLY = process.env.PLAYWRIGHT_PUBLIC_ONLY === '1';

let PLAYWRIGHT_BASE_URL = 'http://localhost:3003';
if (process.env.PLAYWRIGHT_BASE_URL !== undefined && process.env.PLAYWRIGHT_BASE_URL.trim() !== '') {
  PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL.trim();
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    viewport: PLAYWRIGHT_VIEWPORT,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: PUBLIC_ONLY
    ? [
        {
          command: "node -e \"require('http').createServer((req, res) => { res.statusCode = 404; res.end(); }).listen(3004)\"",
          url: 'http://localhost:3004',
          reuseExistingServer: true,
          timeout: PLAYWRIGHT_TIMEOUT_MS,
        },
        {
          command: 'npm run dev',
          url: PLAYWRIGHT_BASE_URL,
          reuseExistingServer: true,
          timeout: PLAYWRIGHT_TIMEOUT_MS,
        },
      ]
    : [
        {
          command: 'npm --prefix ../backend run dev',
          url: 'http://localhost:5003/health',
          reuseExistingServer: true,
          timeout: PLAYWRIGHT_TIMEOUT_MS,
        },
        {
          command: 'npm run dev',
          url: PLAYWRIGHT_BASE_URL,
          reuseExistingServer: true,
          timeout: PLAYWRIGHT_TIMEOUT_MS,
        },
      ],
});
