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

## Proof contract

Before merging to `main`:

1. Backend TypeScript/build must pass.
2. Backend tests must pass.
3. The corrected expression must preserve the intended error-code fallback behavior.
4. Frontend behavior must remain unchanged.
5. After merge, both Vercel projects must be checked independently:
   - frontend `agentforge`;
   - backend `agentforge-y3vy`.
6. The backend production deployment must reach `READY`; a frontend `READY` deployment alone is not sufficient evidence.

## Production safety

The failed build occurred after the production migration command completed successfully. No migration error was reported by this deployment. The remediation is limited to a TypeScript syntax/precedence correction in the chat route.
