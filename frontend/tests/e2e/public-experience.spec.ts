import { test, expect } from '@playwright/test';

test.describe('AgentForge public experience', () => {
  test.setTimeout(20000);
  test('landing page preserves primary navigation and legal links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit', timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Build Intelligent/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Building' })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Demo Sandbox' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Start Building' })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Demo Sandbox' })).toHaveCount(0);
  });
});


test('auth pages expose password visibility controls', async ({ page }) => {
  for (const path of ['/login', '/register']) {
    await page.goto(path, { waitUntil: 'commit', timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    if (path === '/register') {
      await expect(page.getByRole('button', { name: 'Show confirmation password' })).toBeVisible();
    }
  }
});

  test('legal pages render with clear navigation and substantive fallback content', async ({ page }) => {
    for (const path of ['/terms', '/privacy']) {
      await page.goto(path, { waitUntil: 'commit', timeout: 10000 });
      await expect(page.getByRole('link', { name: 'AgentForge' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Start Building' })).toBeVisible();
      await expect(page.getByRole('link', { name: path === '/terms' ? 'Privacy' : 'Terms' })).toBeVisible();
      await expect(page.getByText('Legal', { exact: true })).toBeVisible();
      await expect(page.locator('article')).toBeVisible();
    }
  });
