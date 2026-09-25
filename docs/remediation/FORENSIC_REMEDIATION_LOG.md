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


### Automated production migration execution

Original deployment risk: migration files could be present in source control and pass a fresh-database CI smoke test while a production backend started against an older schema. A Vercel frontend deployment alone does not execute the backend migration command.

Intended behavior: every backend deployment/startup must apply all tracked Drizzle migrations before serving application traffic, using the deployment environment's existing DATABASE_URL secret. No database credential is stored in the repository.

Implementation: the backend production start command now runs the compiled migration entrypoint first (node dist/db/migrate.js) and only starts the API after migrations succeed. CI also performs a backend production build before its migration smoke test, so the same compiled migration entrypoint is part of the build artifact. The README deployment/setup instructions now use the tracked migration command instead of schema push.

Preserved behavior: migrations remain versioned and idempotent through Drizzle's migration journal; application startup is refused when a migration fails rather than serving against an unverified schema. The migration command continues to create/verify pgvector before applying the tracked migration set.

Positive proof: CI must continue to pass the backend build and fresh PostgreSQL + pgvector migration smoke test. The production start path is now deterministic and secret-free from source control.

Regression proof required for final closure: deploy the backend through its actual production host with its configured DATABASE_URL, verify startup applies the pending migration(s), then verify API health and application flows. This remediation does not claim that the live production database has already been migrated; it establishes the automated path that will perform the migration when the backend deployment/start occurs.

## Final post-production verification gate

This is a required final evidence step and is intentionally separate from CI, local verification, preview verification, and fresh-database pre-production testing. The remediation must not be marked fully closed merely because the application builds, tests pass, migrations succeed on a fresh database, or a preview behaves correctly.

### When to perform

After the remediation is deployed to the actual production environment, perform this verification against the real production deployment, production database, configured infrastructure, and production integrations. Record the deployment commit/version, environment, timestamp, operator, and exact test scope before recording results.

### Verification matrix

For each area below, record what was actually tested, result (PASS, FAIL, or UNVERIFIED), evidence/reference, and limitations or unverified items. Do not infer a production result from CI or pre-production evidence.

1. **Production deployment and infrastructure**
   - Verify the intended production artifact/version is deployed and the expected frontend and backend services are running.
   - Verify required production environment variables/secrets are present through the deployment platform rather than source control.
   - Verify health/readiness behavior, routing, TLS/origin configuration, service-to-service connectivity, and deployment/startup logs.
   - Confirm the backend actually executes the tracked migration runner before serving traffic where that is the configured deployment path.

2. **Production database, schema, and migrations**
   - Verify the production DATABASE_URL is the intended database and that the tracked Drizzle migration history is applied successfully.
   - Verify migration 0003_schema_auth_review_reconciliation.sql and all prior required migrations are present in the production migration journal.
   - Verify the expected production schema, indexes/constraints, pgvector extension, session/revocation fields, and review moderation state.
   - Confirm no schema drift or failed/partially applied migration remains.

3. **Persistence and data integrity**
   - Exercise representative create/read/update/delete flows that were touched by remediation.
   - Verify persisted values retain their intended types, relationships, ownership, timestamps, and semantic data without silent truncation/padding.
   - Verify the 768-dimension embedding contract against the production provider/integration path where applicable.
   - Confirm existing production data remains readable and functionally intact.

4. **Authentication and session behavior**
   - Verify login, registration, refresh, rotation, logout, account deletion, refresh-token replay handling, and session invalidation in production.
   - Verify failed account deletion does not invalidate the active session and successful deletion does.
   - Verify revoked durable sessions remain rejected across separate backend instances/processes where the production topology permits this test.
   - Verify production refresh-cookie and CSRF behavior across the real frontend/backend origins.

5. **Authorization and access control**
   - Test an authorized user, an authenticated non-owner, an unauthenticated request, and the configured administrator against representative protected resources.
   - Verify object-level ownership checks remain enforced server-side for agents, knowledge, chat/conversations, and other affected resources.
   - Verify the configured ADMIN_USER_ID path grants intended administrative operations and that non-admin users remain denied.

6. **Security boundaries and adversarial cases**
   - Exercise malformed/invalid UUID resource identifiers, missing/invalid authentication, expired/revoked credentials, CSRF failures, cross-origin cookie cases, and representative unauthorized object access.
   - Verify the public sandbox path does not expose a reusable fixed credential pair and still enforces the intended policy acknowledgement flow.
   - Verify production security headers/CSP are actually present and compatible with all legitimate scripts, frames, connections, and legal/analytics integrations.
   - Record any security control that could not be exercised safely in production as UNVERIFIED rather than assuming the pre-production result transfers to production.

7. **API contracts and client/server integration**
   - Exercise the production frontend against the production backend for the reconciled agent, knowledge, chat, conversation/message, auth, sandbox, and review paths that are in scope.
   - Verify snake_case server DTOs and camelCase frontend mappings, request payloads, UUID boundaries, and chat SSE envelopes (chunk events plus [DONE]).
   - Verify streaming handles partial SSE lines and surfaces stream failures without corrupting the conversation state.

8. **Background jobs, notifications, and scheduled processes**
   - Where production uses workers, queues, schedulers, cron jobs, notification delivery, or asynchronous processing, verify the affected workflows execute once as intended, persist their results, and do not regress under retry/restart conditions.
   - If a capability is not present in AgentForge production, record it as NOT APPLICABLE rather than inventing a test. If the production mechanism exists but cannot be safely exercised, record UNVERIFIED with the reason.

9. **File/object storage and external integrations**
   - Where applicable, verify upload, persistence, retrieval, deletion, authorization, and failure handling against the real production storage provider.
   - Verify external integrations used by affected flows, including provider credentials, API contracts, rate limits, and error handling, without exposing secrets in evidence.
   - If no production file/object-storage surface exists, record NOT APPLICABLE.

10. **Frontend/browser behavior and integration**
    - Run the public landing, policy acknowledgement, sandbox launch, authentication, dashboard, review, and affected application flows in supported desktop and mobile browser contexts.
    - Verify responsive behavior, theme switching, Terms of Service, Privacy Policy, navigation, loading/error states, and the production CSP/security headers.
    - Confirm the visual polish did not remove or alter intended product workflows.

11. **End-to-end and regression behavior**
    - Run the applicable production-safe E2E/regression suite against the deployed system.
    - Re-run the specific flows that correspond to every material remediation finding, not merely generic smoke tests.
    - Where A2A scripts or endpoints do not exist in this repository, record that as NOT APPLICABLE or outside the evidence boundary rather than fabricating a test. If production exposes an external A2A surface, identify it explicitly before testing.

12. **Original functionality preservation**
    - For every material remediation, explicitly demonstrate the pre-existing intended behavior that had to remain intact.
    - Record the original behavior, the remediation behavior, the preserved behavior, the production test used to prove preservation, and the result.
    - A remediation finding is not fully closed when the security/control change works but the required original functionality has not been demonstrated in production.

### Production verification result record

Use the following structure when the production verification is actually performed:

| Area | What was actually tested | Result | Evidence/reference | Limitations / unverified items |
| --- | --- | --- | --- | --- |
| Production deployment and infrastructure | TBD | UNVERIFIED | TBD | Awaiting production deployment |
| Production database/schema/migrations | TBD | UNVERIFIED | TBD | Awaiting production deployment and migration verification |
| Persistence/data integrity | TBD | UNVERIFIED | TBD | Awaiting production data-path testing |
| Authentication/session behavior | TBD | UNVERIFIED | TBD | Awaiting production auth/session testing |
| Authorization/access control | TBD | UNVERIFIED | TBD | Awaiting production authorization testing |
| Security boundaries/adversarial cases | TBD | UNVERIFIED | TBD | Awaiting production security verification |
| API contracts/client-server integration | TBD | UNVERIFIED | TBD | Awaiting production integration testing |
| Background jobs/notifications/scheduled processes | TBD | UNVERIFIED | TBD | Determine applicability from production infrastructure |
| File/object storage/external integrations | TBD | UNVERIFIED | TBD | Determine applicability from production infrastructure |
| Frontend/browser behavior/integration | TBD | UNVERIFIED | TBD | Awaiting production browser verification |
| End-to-end/regression behavior | TBD | UNVERIFIED | TBD | Awaiting production E2E/regression execution |
| Original functionality preservation | TBD | UNVERIFIED | TBD | Awaiting production proof for preserved behavior |

### Closure rule

**Production verification is currently an outstanding evidence gate.** The remediation must remain documented as implemented and pre-production-tested, but not fully closed, until the matrix above has been completed against the real production environment. Once production testing is performed, replace each TBD/UNVERIFIED entry with the actual test, result, evidence, and limitation. Any failure or material unverified item must remain open and be investigated rather than being converted into a pass by inference.

No application behavior is changed by this section. This is documentation and evidence-tracking only.

## Sandbox removal remediation

### Original behavior
The public landing page exposed a "Demo Sandbox" flow. The client opened a policy-acceptance modal and then called `POST /api/auth/sandbox`. The backend generated a synthetic sandbox email/password, registered that account, issued a normal authenticated session, and redirected the browser into the dashboard. This was an anonymous account-creation path distinct from the normal sign-up/sign-in flow.

### Intended remediation behavior
The sandbox is removed completely. Public visitors must use the normal authentication flow. "Start Building" is the only landing-page build CTA; existing users retain a direct Sign In action. There is no public sandbox provisioning endpoint and no policy modal or sandbox client flow.

### Behavior that must remain
Normal registration, normal login, authenticated dashboard access, legal Terms/Privacy links, reviews, responsive landing behavior, and the rest of the existing authenticated product remain available. No sandbox-only data path is reused by ordinary accounts.

### Implementation
- Removed the `POST /api/auth/sandbox` backend route.
- Removed the sandbox provisioning client flow, policy modal, loading/error state, and Demo Sandbox CTA from the landing page.
- Removed the secondary "Get Started" landing CTA so the build action is consistently "Start Building"; Sign In remains available for existing users.
- Updated public E2E coverage to prove Start Building remains, Demo Sandbox is absent, and legal/review/mobile surfaces remain.
- No database schema change is required because the sandbox did not have a dedicated table or persistent sandbox-specific schema.

### Positive proof
- Current `audit-remediation` source contains no `/auth/sandbox` route in `backend/src/routes/auth.routes.ts`.
- Current landing source contains no executable sandbox flow or policy modal.
- Current public E2E explicitly asserts zero Demo Sandbox buttons and two Start Building buttons on desktop/mobile layouts.
- The backend authentication service used by normal registration/login remains unchanged by this removal.

### Regression proof
The existing CI production-build/type-check/E2E pipeline must pass after this change. The public E2E continues to verify Sign In, Start Building, Terms of Service, Privacy Policy, review submission, and mobile rendering. Production verification remains a separate gate and must not be inferred from CI alone.

### Data boundary note
This code change prevents creation of new sandbox accounts. It does not silently delete historical database rows created by the former sandbox flow. Any historical sandbox guest rows, if present in a live database, require an explicitly authorized data-cleanup operation after identifying them and confirming retention/deletion requirements.


### Latest verification note
After the initial sandbox-removal edits, the landing navigation was rechecked and a JSX wrapper mismatch introduced during the edit was corrected before closure. The final source cleanup also removed the now-unused React callback import. The final branch head is tracked separately from the earlier Vercel preview builds; therefore the earlier READY preview build is evidence for the immediately preceding sandbox-removal source, not proof of the final post-cleanup head until a matching deployment/build is observed.


## Legal pages UI and content remediation

### Original behavior
The Terms and Privacy routes used the same sparse dark-page shell with large fixed spacing and only two very short built-in fallback sections. When the public legal API was unavailable, the pages silently displayed that incomplete fallback. The server-provided HTML was rendered without an explanatory document shell or navigation between legal pages.

### Intended remediation behavior
Legal pages should be readable, calm, responsive, navigable, and explicit about their document state. They should provide meaningful built-in fallback summaries rather than presenting an obviously incomplete document as if it were the full policy. The UI should clearly expose Terms, Privacy, and the normal Start Building path without reintroducing the removed sandbox.

### Behavior that must remain
The existing public legal API endpoints remain the source for the current published documents when available. Terms and Privacy remain publicly accessible. No authentication requirement, legal endpoint contract, or product workflow was removed.

### Implementation
- Rebuilt both pages with a shared legal-page presentation: responsive header, document metadata, readable article surface, desktop navigation, mobile-safe layout, and consistent AgentForge navigation.
- Improved the fallback Terms content to cover acceptance, user material, AI output limitations, security/misuse, service changes, and contact.
- Improved the fallback Privacy content to cover information handled, purposes, sensitive credentials, service providers, retention/deletion, and privacy choices.
- Added explicit loading and retrieval-failure states instead of silently hiding a failed document fetch.
- Added legal-page E2E coverage for navigation and article rendering.
- Preserved the backend legal document endpoints and server-provided document rendering path.

### Proof boundary
This is a UI/content remediation, not legal advice or a jurisdiction-specific legal compliance certification. The product owner or qualified counsel should review the final legal wording for the jurisdictions and business practices that actually apply.


## Follow-up remediation: legal, account, authentication, and email-settings review

### Cross-project comparison
The related NexusDoc and FlowSync repositories were inspected at their current `main` state for this specific question. Both expose an owner-protected admin settings area containing platform-level Google Analytics and Termly configuration. Neither inspected admin settings page exposes a Resend credential.

AgentForge does have an admin surface (`frontend/src/app/admin/settings`, `frontend/src/app/admin/inbox`) and its backend admin router is protected by `authMiddleware` plus `ownerMiddleware`. The AgentForge Resend control is different: it is currently a per-user credential stored in the `users` table through `/api/settings/resend-key`, together with a per-user notification email. No Resend sending service or contact-notification delivery path was found in the AgentForge source inspected during this review. Therefore it cannot be honestly described as the same platform-admin integration used by NexusDoc or FlowSync. It is currently a user-scoped configuration whose operational delivery path is not evidenced.

This distinction is recorded rather than moving the setting into admin and inventing a platform behavior. A separate decision is required if AgentForge is intended to support platform-wide transactional email.

### Authentication production finding
Vercel confirms the currently deployed production frontend and backend still point to `main` commit `b6b6592...`, while the remediation branch has separate READY preview deployments. Therefore a visitor to the published production site can still encounter pre-remediation sandbox and authentication behavior.

A production runtime review for the backend found repeated Express rate-limit proxy configuration warnings on the old production deployment. It did not find matching `register`, `login`, or `ERR_` application error logs in the available 24-hour runtime-log query. Consequently the user's observed login failure cannot be attributed to a specific production application exception from the available logs.

The remediation branch also contained a concrete authentication defect: login set the refresh cookie with production-inappropriate `SameSite=Strict` and did not issue the CSRF cookie, while the refresh endpoint requires a matching CSRF token for cookie-authenticated refresh. Login now uses the same production cookie/CSRF contract as registration.

### Account deletion finding
The settings UI previously called `DELETE /api/settings/account`, but the AgentForge backend settings router does not expose that endpoint. The actual password-protected deletion endpoint is `DELETE /api/auth/account`.

The UI has been corrected to call the existing password-protected endpoint. The destructive action was also redesigned from a browser `confirm()` dialog into a deliberate in-app confirmation modal requiring the account password, with clear consequences, cancellation, disabled state, and responsive layout. The misleading "vaporize" terminology was replaced with explicit account-deletion language.

### Password visibility
Login and registration now provide explicit Show/Hide controls for password and confirmation-password fields. This does not expose stored passwords or alter credential handling; it only changes whether the current field value is visually masked in the browser.

### Registration feedback
Successful registration now provides explicit in-page confirmation before continuing to the authenticated workspace. Existing automatic post-registration sign-in behavior remains intact.

### Verification additions
Public E2E coverage now checks:
- Terms and Privacy page navigation/layout.
- Demo Sandbox absence and Start Building presence.
- Login password visibility.
- Registration password and confirmation-password visibility.
- Existing public review and mobile surfaces.

The login-cookie correction and account-deletion endpoint correction require the backend/frontend CI and deployment pipeline to pass before they are considered closed. Production remains a separate verification gate because the published deployment is still on `main`.
