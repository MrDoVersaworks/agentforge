import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { deleteAccountWithSessionInvalidation } from '../src/utils/accountDeletion.js';
import { validateEmbeddingDimension } from '../src/utils/embedding.js';

test('account deletion invalidates the access token only after deletion succeeds', async () => {
  const events: string[] = [];
  await deleteAccountWithSessionInvalidation(
    async () => { events.push('delete'); },
    () => { events.push('invalidate'); }
  );
  assert.deepEqual(events, ['delete', 'invalidate']);
});

test('account deletion does not invalidate the access token when deletion fails', async () => {
  const events: string[] = [];
  await assert.rejects(() => deleteAccountWithSessionInvalidation(
    async () => { events.push('delete'); throw new Error('invalid password'); },
    () => { events.push('invalidate'); }
  ));
  assert.deepEqual(events, ['delete']);
});

test('embedding dimensions must exactly match the pgvector contract', () => {
  assert.equal(validateEmbeddingDimension(new Array(768).fill(0), 768).length, 768);
  assert.throws(() => validateEmbeddingDimension(new Array(767).fill(0), 768), /expected 768/);
  assert.throws(() => validateEmbeddingDimension(new Array(769).fill(0), 768), /expected 768/);
});


test('refresh session contract is durable and rotates one-time refresh tokens', () => {
  const authService = readFileSync(resolve(process.cwd(), 'src/services/auth.service.ts'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/db/schema.ts'), 'utf8');
  const migration = readFileSync(resolve(process.cwd(), 'drizzle/0003_schema_auth_review_reconciliation.sql'), 'utf8');

  assert.match(schema, /session_id: uuid\('session_id'\)/);
  assert.match(schema, /revoked_at: timestamp\('revoked_at'/);
  assert.match(authService, /ERR_REFRESH_TOKEN_REPLAY/);
  assert.match(authService, /refreshTokens\.session_id/);
  assert.match(authService, /revoked_at: sql\.raw\('CURRENT_TIMESTAMP'\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "session_id"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "revoked_at"/);
});

test('production cookie auth uses cross-site-safe SameSite mode plus explicit CSRF validation', () => {
  const authRoutes = readFileSync(resolve(process.cwd(), 'src/routes/auth.routes.ts'), 'utf8');

  assert.match(authRoutes, /sameSite: config\.NODE_ENV === 'production' \? 'none'/);
  assert.match(authRoutes, /X-CSRF-Token/);
  assert.match(authRoutes, /ERR_CSRF_INVALID/);
});

test('public sandbox no longer contains a client-visible fixed credential pair', () => {
  const landing = readFileSync(resolve(process.cwd(), '../frontend/src/app/page.tsx'), 'utf8');

  assert.doesNotMatch(landing, /guest@sandbox\.agentforge\.dev/);
  assert.doesNotMatch(landing, /SandboxDemo2026!/);
  assert.doesNotMatch(landing, /auth\\/sandbox/);
  assert.match(landing, /Start Building/);
});

test('review publication requires moderation state', () => {
  const publicRoutes = readFileSync(resolve(process.cwd(), 'src/routes/public.routes.ts'), 'utf8');
  const adminRoutes = readFileSync(resolve(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/db/schema.ts'), 'utf8');

  assert.match(schema, /status: varchar\('status', \{ length: 20 \}\)/);
  assert.match(publicRoutes, /status: 'pending'/);
  assert.match(publicRoutes, /eq\(platformReviews\.status, 'approved'\)/);
  assert.match(adminRoutes, /enum\(\['approved', 'rejected', 'pending'\]\)/);
});
