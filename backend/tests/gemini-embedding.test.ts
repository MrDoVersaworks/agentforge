import assert from 'node:assert/strict';
import test from 'node:test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/ci_db';
process.env.JWT_ACCESS_SECRET ??= 'ci_access_secret_for_testing_32bytes';
process.env.JWT_REFRESH_SECRET ??= 'ci_refresh_secret_for_testing_32bytes';
process.env.AES_ENCRYPTION_KEY ??= '0000000000000000000000000000000000000000000000000000000000000000';
process.env.CORS_ORIGIN ??= 'http://localhost:3003';

const { generateEmbedding } = await import('../src/services/gemini.service.js');

test('generateEmbedding requests the supported Gemini embedding model at the database dimension', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({ embedding: { values: Array.from({ length: 768 }, (_, index) => index / 768) } }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };

  try {
    const embedding = await generateEmbedding('test-key', 'hello world');
    assert.equal(embedding.length, 768);
    assert.equal(requestUrl, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent');

    const headers = new Headers(requestInit?.headers);
    assert.equal(headers.get('x-goog-api-key'), 'test-key');
    assert.equal(headers.get('content-type'), 'application/json');

    const body = JSON.parse(String(requestInit?.body));
    assert.equal(body.output_dimensionality, 768);
    assert.deepEqual(body.content, { parts: [{ text: 'hello world' }] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('generateEmbedding rejects an embedding with the wrong dimension', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ embedding: { values: Array.from({ length: 3072 }, () => 0.1) } }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );

  try {
    await assert.rejects(
      generateEmbedding('test-key', 'wrong dimension'),
      /Failed to generate embedding from Gemini API/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('generateEmbedding surfaces Gemini API failures as embedding generation errors', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response('model unavailable', { status: 404 });

  try {
    await assert.rejects(
      generateEmbedding('test-key', 'failure'),
      /Failed to generate embedding from Gemini API/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
