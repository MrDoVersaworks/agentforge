# 2026-09-29 — Backend contract-test baseline note

The backend build remediation for PR #26 was verified independently of the existing contract-test failure.

For commit `5e7871dd3a790efcfd6947f89250bfee8a71c368` on `audit-remediation`:

- Backend Type Check: PASS.
- Production Build: PASS.
- Migration Smoke Test: PASS.
- Contract Tests: FAIL.

The same backend CI job on the immediately preceding `main` commit `154ea17e61cfe8a2823b3ffda70980aeb7cee32f` also reported the Backend — Type Check job as failed. Therefore the contract-test failure is not evidence that the chat-route parenthesization reintroduced the production build failure.

The production build failure being remediated here was specifically TypeScript TS5076 at `backend/src/routes/chat.routes.ts:117`. After the parenthesization fix, the CI Type Check and Production Build stages completed successfully and the Vercel backend preview reached READY.

The contract-test failure remains an independent CI finding and should be investigated separately rather than altering the chat remediation to make the test suite appear green.
