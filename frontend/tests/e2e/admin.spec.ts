import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('AgentForge Settings & Admin', () => {
  test('settings page and admin inbox inspection', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.resolve(__dirname, '../../public/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    // 1. Settings View
    await page.goto('http://localhost:3003/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'settings.png') });

    // 2. Admin Inbox View
    await page.goto('http://localhost:3003/admin/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotDir, 'admin_inbox.png') });
  });
});
