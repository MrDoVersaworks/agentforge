# 2026-09-29 — Backend production build failure remediation

## Incident

The frontend and backend are deployed as separate Vercel projects:

- Frontend: `agentforge`
- Backend: `agentforge-y3vy`

The production deployment for backend project `agentforge-y3vy` was triggered by `main` commit `154ea17e61cfe8a2823b3ffda70980aeb7cee32f`, but Vercel marked the deployment `ERROR`.

## Observed build evidence

The backend deployment successfully:

1. cloned the `main` commit;
2. restored its build cache;
3. installed dependencies;
4. ran the production database migration command;
5. acquired and released the PostgreSQL migration lock;
6. confirmed pgvector was active;
7. completed all committed migrations.

The failure occurred during TypeScript compilation:

```
src/routes/chat.routes.ts(117,25): error TS5076:
'&&' and '??' operations cannot be mixed without parentheses.
```

The build then exited with code 2.

This was therefore a source-level TypeScript build failure, not a Vercel deployment-rate-limit failure and not a database migration failure.

## Original behavior

The chat route's catch block computed an error code with an expression that mixed logical AND (`&&`) and nullish coalescing (`??`) without parentheses:

```ts
const errorCode = error instanceof Error && error.message.match(/^\[ERR_[^\]]+\]/)?.[0] ?? '[ERR_CHAT_REQUEST]';
```

TypeScript rejects this syntax because the precedence between `&&` and `??` must be made explicit.

## Intended remediation behavior

Preserve the existing error classification exactly:

- If the caught value is an `Error` and its message starts with an `[ERR_...]` code, use that code.
- Otherwise use `[ERR_CHAT_REQUEST]`.
- Do not change chat routing, streaming, persistence, authentication, error payloads, or provider behavior.

## Remediation

On `audit-remediation`, the expression was minimally parenthesized:

```ts
const errorCode = (error instanceof Error && error.message.match(/^\[ERR_[^\]]+\]/)?.[0]) ?? '[ERR_CHAT_REQUEST]';
```

No business logic was otherwise changed.

The first remediation commit also accidentally changed the literal SSE newline framing while rewriting the route file. Follow-up PR #27 restored the original SSE framing exactly. The resulting production code therefore contains both the intended precedence fix and the original SSE framing.

## Verification and test-contract cleanup

Vercel subsequently produced a `READY` backend preview for the corrected route and a `READY` production backend deployment after PR #26/#27.

GitHub's backend test job initially remained red because two `gemini-embedding` assertions still expected the old error text (`Failed to generate embedding from Gemini API`). The current service intentionally returns the correlated client-safe error `[ERR_GEMINI_EMBEDDING_FAILURE] Gemini embedding failed. Check server logs for the correlated request.`.

Those tests are now being updated to assert the current error contract rather than reverting the production-safe error behavior.

## Proof contract

1. Backend production build must pass.
2. Backend tests must pass against the current error contract.
3. The corrected expression must preserve the intended error-code fallback behavior.
4. SSE framing must remain unchanged.
5. Frontend behavior must remain unchanged.
6. After merge, both Vercel projects must be checked independently:
   - frontend `agentforge`;
   - backend `agentforge-y3vy`.
7. Both production deployments must reach `READY`.

## Production safety

The failed build occurred after the production migration command completed successfully. No migration error was reported by that deployment. The original production fix is limited to TypeScript precedence; the test cleanup changes only stale test expectations to match the already-established client-safe Gemini error contract.
