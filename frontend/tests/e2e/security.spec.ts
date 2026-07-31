import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:5003';

test.describe('AgentForge — Security & Agent Sovereignty (SIL Rules)', () => {
  /* ---- User Scoping & Unauthorized Access (SIL-3) ---- */
  test('GET /agents rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/agents`);
    expect(res.status()).toBe(401);
  });

  test('POST /agents rejects unauthenticated agent creation', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/agents`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test('GET /agents/:id rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/agents/unauthorized-agent-123`);
    expect(res.status()).toBe(401);
  });

  test('PATCH /agents/:id rejects unauthenticated agent updates', async ({ request }) => {
    const res = await request.patch(`${BACKEND_URL}/api/agents/unauthorized-agent-123`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test('DELETE /agents/:id rejects unauthenticated agent deletion', async ({ request }) => {
    const res = await request.delete(`${BACKEND_URL}/api/agents/unauthorized-agent-123`);
    expect(res.status()).toBe(401);
  });

  test('GET /auth/profile rejects unauthenticated profile query', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/auth/profile`);
    expect(res.status()).toBe(401);
  });

  test('DELETE /account rejects unauthenticated account deletion', async ({ request }) => {
    const res = await request.delete(`${BACKEND_URL}/api/auth/account`);
    expect(res.status()).toBe(401);
  });

  /* ---- Chat & Knowledge Scoping (SIL-3) ---- */
  test('POST /chat/conversations rejects unauthenticated access', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/chat/conversations`, { data: {} });
    expect(res.status()).toBe(401);
  });

  test('GET /knowledge/:agentId/documents rejects unauthenticated access', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/knowledge/fake-agent/documents`);
    expect(res.status()).toBe(401);
  });

  /* ---- Error Formatting (SIL-23) ---- */
  test('returns sentence-cased error messages on validation failure', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: 'bad-email-format', password: '123' },
    });
    if (res.status() === 400 || res.status() === 401) {
      const body = await res.json();
      if (body.error?.message) {
        expect(body.error.message).toMatch(/^[A-Z].*\.$/);
      }
    }
  });

  /* ---- CORS Restrictions (SIL-26) ---- */
  test('CORS headers reject wildcard origins on backend API', async ({ request }) => {
    const res = await request.fetch(`${BACKEND_URL}/api/agents`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-site.com' },
    });
    const allowOrigin = res.headers()['access-control-allow-origin'];
    expect(allowOrigin).not.toBe('*');
  });
});
