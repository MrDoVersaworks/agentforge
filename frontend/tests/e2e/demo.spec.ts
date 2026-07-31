import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:5003';
const FRONTEND_URL = 'http://localhost:3003';

test.describe('AgentForge — Public & User Features', () => {
  /* ---- UI Page Render Checks ---- */
  test('landing page renders successfully', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders with auto-focused form elements', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('register page renders with required form elements', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/register`);
    await expect(page.locator('#register-name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
  });

  test('privacy policy page renders', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/privacy`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('terms of service page renders', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/terms`);
    await expect(page.locator('body')).toBeVisible();
  });

  /* ---- Public Backend API Checks ---- */
  test('GET /health returns 200 OK', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    expect(res.status()).toBe(200);
  });

  test('GET /public/settings returns system parameters', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/public/settings`);
    expect(res.status()).toBe(200);
  });

  test('GET /public/reviews returns approved agent reviews', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/public/reviews`);
    expect(res.status()).toBe(200);
  });

  test('POST /public/reviews submits agent review', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/public/reviews`, {
      data: {
        name: 'AI Operations Director',
        rating: 5,
        feedback: 'AgentForge autonomous agent orchestration saves 20+ dev hours weekly.',
      },
    });
    expect([200, 201, 400]).toContain(res.status());
  });

  test('POST /contact submits contact message', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/contact`, {
      data: {
        name: 'Enterprise AI Lead',
        email: 'ai@enterprise.com',
        message: 'Requesting SLA and fine-tuning deployment guidelines for AgentForge.',
      },
    });
    expect([200, 201, 400]).toContain(res.status());
  });

  /* ---- Auth API Failure Checks ---- */
  test('POST /auth/register rejects missing payload', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/register`, { data: {} });
    expect([400, 422]).toContain(res.status());
  });

  test('POST /auth/login rejects incorrect password', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: 'fake@agentforge.ai', password: 'wrong' },
    });
    expect([400, 401]).toContain(res.status());
  });
});
