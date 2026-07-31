import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:5003';
const FRONTEND_URL = 'http://localhost:3003';

test.describe('AgentForge — Admin & Infrastructure Controls', () => {
  /* ---- Admin UI Page Renders ---- */
  test('admin inbox UI page renders', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/inbox`);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin settings UI page renders', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/settings`);
    await expect(page.locator('body')).toBeVisible();
  });

  /* ---- Admin API Endpoint Protection ---- */
  test('GET /admin/inbox rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/admin/inbox`);
    expect(res.status()).toBe(401);
  });

  test('PATCH /admin/inbox/:id/read rejects unauthenticated access', async ({ request }) => {
    const res = await request.patch(`${BACKEND_URL}/api/admin/inbox/fake-id/read`);
    expect(res.status()).toBe(401);
  });

  test('DELETE /admin/inbox/:id rejects unauthenticated access', async ({ request }) => {
    const res = await request.delete(`${BACKEND_URL}/api/admin/inbox/fake-id`);
    expect(res.status()).toBe(401);
  });

  test('GET /admin/settings rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/admin/settings`);
    expect(res.status()).toBe(401);
  });

  test('PUT /admin/settings rejects unauthenticated access', async ({ request }) => {
    const res = await request.put(`${BACKEND_URL}/api/admin/settings`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test('GET /admin/reviews rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/admin/reviews`);
    expect(res.status()).toBe(401);
  });

  test('DELETE /admin/reviews/:id rejects unauthenticated access', async ({ request }) => {
    const res = await request.delete(`${BACKEND_URL}/api/admin/reviews/fake-id`);
    expect(res.status()).toBe(401);
  });
});
