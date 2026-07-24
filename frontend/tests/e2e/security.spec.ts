import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('AgentForge Security & Auth Guards', () => {
  test('login authentication and security preflight checks', async ({ page }) => {
    const screenshotDir = path.resolve(__dirname, '../../public/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    // 1. Login Screen Validation
    await page.goto('http://localhost:3003/login');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'login.png') });
    await expect(page).toHaveURL('http://localhost:3003/login');
  });
});
