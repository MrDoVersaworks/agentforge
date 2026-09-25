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


## Continued remediation: session lifecycle, deployment contract, public UX

### Refresh-token rotation and replay

Original behavior: a refresh token remained reusable until expiry and refresh only issued a new access token.

Intended remediation behavior: refresh tokens are one-time credentials. A successful refresh rotates the token while preserving the logical session. Reuse of a previously revoked refresh token is treated as replay and invalidates the user's refresh sessions.

Preserved behavior: users still receive a short-lived access token, refresh remains silent through the httpOnly cookie, and normal login/register/logout flows remain available.

Implementation: refresh token rows now carry a durable session identifier and revocation timestamp. Refresh marks the current token revoked and creates a replacement in the same session. Replay invalidates all refresh sessions for the affected account.

Proof added: contract tests assert session fields, rotation, and replay handling. Full database-backed execution remains part of final closure.

### Durable access-token session revocation

Original behavior: access-token invalidation relied on an in-process signature blocklist.

Intended remediation behavior: logout and account deletion must remain effective across serverless instances.

Preserved behavior: the existing in-process blocklist remains as a fast local rejection path.

Implementation: access tokens now carry the durable session identifier. Authenticated requests require an active, unrevoked refresh session in PostgreSQL. Logout revokes the durable session; account deletion removes the user's sessions through the existing foreign-key cascade.

Proof added: middleware now checks the durable session state on every authenticated request. CI and an integration environment still need to exercise the multi-instance path before final closure.

### Cross-site refresh-cookie and CSRF contract

Deployment evidence: the Vercel setup uses separate frontend and backend projects, so production frontend/backend origins are cross-site.

Intended behavior: refresh cookies must be usable in that deployment topology without allowing cross-site request forgery.

Implementation: production refresh and CSRF cookies use SameSite=None with Secure. Cookie-authenticated refresh and logout require a matching X-CSRF-Token header. The frontend client reads the non-httpOnly CSRF cookie and sends the header on those requests.

Preserved behavior: local development keeps strict same-site cookies.

Proof added: backend contract tests cover the production SameSite mode and explicit CSRF validation. Browser verification against the deployed preview is still required.

### Sandbox credential boundary

Original behavior: the public landing page contained a fixed sandbox email and password and attempted login before falling back to registration.

Intended behavior: the demo experience remains one click after policy acknowledgement, but no reusable credential pair is shipped to every browser.

Implementation: the client now calls a rate-limited public sandbox endpoint. The server creates a unique sandbox account with a server-generated credential and establishes the normal auth session.

Preserved behavior: the existing policy acknowledgement remains before sandbox launch and successful launch still routes to the dashboard.

Proof added: the audit contract test checks that the former fixed credential pair is absent from the client and that the sandbox endpoint is used.

### Review publication lifecycle

Original behavior: public review submissions were inserted directly as published records.

Intended behavior: user-generated reviews require explicit moderation before public publication.

Implementation: reviews now carry pending, approved, or rejected state. Existing reviews are migrated to approved to preserve their published status. Public reads return approved reviews only. Admins can change moderation state.

Preserved behavior: the public review form remains available and the submitting user sees their own pending submission immediately.

Proof added: route/schema contract tests cover pending creation, approved-only public reads, and admin state transitions.

### Migration/schema reconciliation

The live schema definition contained fields that were not represented by the existing migration history, including several updated_at fields and system settings legal-content columns.

Implementation: migration 0003_schema_auth_review_reconciliation.sql adds the missing fields and the new session/review state fields. The migration journal now registers the new migration.

Fresh-database execution against PostgreSQL with pgvector is still required before this finding is marked fully closed.

### UI polish

The functional surface was preserved while the visual system was simplified toward a calm, Apple-like product language: system typography, restrained surfaces, quieter borders, solid actions, reduced glow, responsive spacing, and adaptive mobile layouts. Terms of Service and Privacy Policy navigation remain present. The theme switch remains supported.

No product workflows were intentionally removed or changed as part of the visual pass.

### E2E contract updates

Added a Playwright public-experience suite covering landing navigation, policy acknowledgement, review submission UI, and a mobile viewport. The existing Playwright configuration remains the execution harness.

A2A script inventory remains to be verified against the repository tree before any script is changed. No A2A behavior is being guessed or rewritten without locating the actual scripts.

## Closure status

Implemented but awaiting final runtime proof:
- durable refresh-token rotation and replay handling;
- cross-site cookie/CSRF deployment contract;
- durable session-backed access-token revocation;
- sandbox credential removal from the client;
- review moderation lifecycle;
- migration/schema reconciliation;
- responsive UI polish and public E2E coverage.

Still open for final evidence:
- fresh PostgreSQL + pgvector migration run;
- full backend test suite on the final head;
- full frontend production build;
- browser/E2E execution against the final preview;
- CSP validation against actual deployed assets and scripts;
- A2A script inventory and targeted updates if the scripts are affected by the reconciled API contracts;
- any remaining audit findings not independently proven.


### Frontend response security headers

Observed deployment state: the current production frontend response did not advertise a Content-Security-Policy header.

Intended behavior: the deployed frontend should constrain script, frame, connection, and object sources while retaining the explicitly configured legal and analytics integrations.

Implementation: Next.js now emits CSP, Referrer-Policy, X-Content-Type-Options, and Permissions-Policy headers. The CSP scopes API connections to NEXT_PUBLIC_API_URL when it is available and retains the required Termly and Google Analytics script/frame sources.

Proof added: the configuration is covered by the production build path. Final closure still requires a deployed preview response-header check and browser verification to confirm that all legitimate scripts continue to load.


### A2A contract inventory

A repository-wide code search on the remediation head found no A2A scripts, agent-card files, A2A protocol endpoints, or /.well-known A2A artifacts in AgentForge. No A2A implementation was therefore changed or fabricated. If an external A2A package or deployment-side script exists outside this repository, it remains outside the evidence boundary of this remediation.

### Final verification update

CI run 64 reached the backend type check, fresh pgvector migration smoke test, backend contract tests, frontend type check, and frontend production build successfully. The public Playwright job remained in progress during this audit pass, so it is not treated as a passed browser regression.

Main remains untouched. No remediation finding is being called fully closed solely from static inspection or successful compilation.
