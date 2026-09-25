# AgentForge Forensic Remediation Log

## Baseline and history

- Canonical state inspected: `b6b6592ee37323c3e4758c62ba8f183006bb77bd`.
- At the start, `main` and `audit-remediation` pointed to the same commit. Branch equality was therefore not treated as evidence that remediation never happened.
- Historical commits were inspected, including `3769be3640cf3e600e0b80af55177a4604dca08b` and `7aae5d3cf04a082a9120cd1e7e0408c7eaea7c81`.
- `main` has not been modified by this remediation work.

## Forensic rule

For each material remediation: establish original behavior, intended remediation behavior, behavior that must remain, positive proof, and regression proof. Current source is not treated as the complete historical record.

OWASP guidance supports the same engineering boundary: authorization must be enforced server-side and object-level access must be checked for each operation. citeturn5search3turn5search7

## Changes made on audit-remediation

### Admin authorization identity

Original behavior: `ownerMiddleware` compared the authenticated public email address to `ADMIN_EMAIL`.

Intended behavior: privileged identity must be server-controlled and not derived from a mutable public profile field.

Remediation: admin authorization now compares `req.user.id` to the server-side `ADMIN_USER_ID` UUID configuration. Missing configuration fails closed.

Preserved behavior: authenticated users without the configured admin identity remain denied.

Proof required for closure: configure the production admin UUID and run an integration test covering both the configured administrator and a non-admin account.

### Account deletion session semantics

Historical/current remediation-era behavior invalidated the access-token signature before password verification completed.

Intended behavior: a failed account deletion must not destroy the current session; a successful deletion must invalidate it.

Remediation: deletion and session invalidation are now explicitly ordered through `deleteAccountWithSessionInvalidation`.

Targeted regression tests were added for both success and failure ordering.

Closure still requires the test suite to execute successfully in CI.

### Embedding dimension contract

Original behavior silently truncated embeddings above 768 dimensions and padded embeddings below 768.

Intended behavior: the pgvector contract is exact; unexpected provider dimensions must fail rather than silently changing semantic data.

Remediation: `validateEmbeddingDimension` rejects any dimension other than 768.

Targeted tests cover 767, 768, and 769 dimensions.

### API contract reconciliation

Frontend agent and knowledge consumers now explicitly map the backend's snake_case DTOs to the frontend camelCase types, and request fields are mapped back to the server contract.

The chat client and server now use the same conversation/message route shape and SSE event envelope (`type: "chunk", content` plus `[DONE]`). The streaming client also fixes partial-line buffering.

Resource route parameters for agents, knowledge, and chat are validated as UUIDs at the server boundary; existing service-layer ownership checks remain authoritative.

## Findings intentionally left open

The following are not marked closed without further evidence:

- refresh-token rotation and replay detection;
- cross-site refresh-cookie / CSRF deployment contract;
- durable access-token revocation versus the current process-local blocklist;
- sandbox credential removal and any associated public UX;
- platform-review moderation and approval lifecycle;
- migration/schema reconciliation and fresh-database proof;
- CSP compatibility with the actual frontend deployment;
- full frontend build and browser regression suite;
- remaining audit findings not yet independently proven.

No finding is closed solely because TypeScript compiles. A closure requires both the audit requirement and demonstration that required pre-existing behavior remains intact.
