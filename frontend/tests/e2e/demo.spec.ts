import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('AgentForge UI Showcase', () => {
  test('capture public-facing pages', async ({ page }) => {
    test.setTimeout(90000);
    const screenshotDir = path.resolve(__dirname, '../../public/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    // 1. Landing Page (full page with networkidle & hydration wait)
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'landing.png'), fullPage: true });

    // 2. Login
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'login.png') });

    // 3. Register
    await page.goto('http://localhost:3003/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, 'register.png') });
  });
});
