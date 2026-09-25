import { test, expect } from '@playwright/test';

test.describe('AgentForge public experience', () => {
  test.setTimeout(20000);
  test('landing page preserves primary navigation and legal links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit', timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Build Intelligent/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('sandbox still requires policy acknowledgement before launch', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit', timeout: 10000 });
    await page.getByRole('button', { name: 'Demo Sandbox' }).click();
    await expect(page.getByRole('dialog')).toContainText('Terms of Service and Usage Policy');
    await expect(page.getByRole('button', { name: 'Decline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept and Launch Sandbox' })).toBeVisible();
  });

  test('review submission surface remains available', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit', timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Tell us what you think/i })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Your experience')).toBeVisible();
  });
});

test.describe('AgentForge responsive public experience', () => {
  test.setTimeout(20000);
  test('mobile layout remains usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'commit', timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Build Intelligent/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Demo Sandbox' })).toBeVisible();
  });
});
