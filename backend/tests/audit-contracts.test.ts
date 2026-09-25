import test from 'node:test';
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
