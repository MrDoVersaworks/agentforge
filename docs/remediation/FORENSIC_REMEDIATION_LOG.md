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


## Follow-up: Resend/contact trace and account-deletion UI refinement

### Resend/contact trace
- The authenticated user settings page contained a per-user Resend API-key field plus a notification email field.
- The backend exposed storage/update/delete operations for those values, but no AgentForge source inspected on `audit-remediation` used the stored Resend credential to send an email.
- The contact route currently stores submitted contact messages in the `contact_messages` table and the admin inbox can inspect that data. It does not invoke Resend.
- The public footer's Contact action on the landing page is an external portfolio/developer link, not a contact-message form.
- Therefore the Resend settings were not a working implementation of either owner contact notifications or agent-to-user offline notifications. They were dead configuration/storage rather than a functioning delivery feature.
- Remediation removes the unused Resend API-key and notification-email settings from the user UI, API contracts, service, schema, and database through a tracked migration. The existing Contact link and contact-message storage/inbox behavior are not removed by this change.
- Historical Resend credential data, if present in deployed databases, is removed by the migration because the feature has been explicitly determined to have no functioning delivery contract.

### Account deletion UI
- Existing intended behavior remains password-confirmed account deletion through `DELETE /api/auth/account`.
- The UI was refined rather than functionally changed: clearer hierarchy, better modal proportions, aligned action buttons, mobile stacking, and password clearing when the modal is dismissed.
- The deletion endpoint, password requirement, deletion consequences, and post-success logout/redirect remain unchanged.

### Login branch/main clarification
- `main` did not contain the later login cookie/CSRF remediation.
- The remediation branch added that fix after the production-login investigation: login now uses the same production cookie options as refresh and sets the CSRF cookie required by cookie-authenticated refresh.
- This is not a duplicate of an existing `main` fix. The branch is still separate from `main`.
- PR #1 is open/draft and unmerged. No remediation branch changes have been merged into `main`.


## Production database migration gate

### Original behavior
The GitHub Actions migration smoke test used the disposable pgvector service database postgresql://postgres:postgres@localhost:5432/ci_db. That validates committed migrations against a clean PostgreSQL/pgvector database but does not reconcile the Vercel production database. The Vercel backend is deployed as a serverless function and therefore does not execute the backend package's npm start migration command as part of the frontend production build.

### Intended remediation behavior
Production deployment must reconcile the actual Vercel production DATABASE_URL with the committed Drizzle migrations before the frontend build is allowed to succeed. Non-production Vercel builds must not mutate production. The migration journal remains the source of truth, so an already-current database performs a state check without reapplying migrations. Concurrent production builds must not race migrations.

### Behavior that must remain
- GitHub CI continues to use an isolated PostgreSQL/pgvector database for migration validation.
- Production credentials remain in Vercel and are not copied into GitHub Actions.
- Preview and local builds do not run production migrations.
- Only committed migration files are applied.
- A migration failure fails the production deployment rather than publishing incompatible application code.
- Existing application functionality is unchanged by the migration gate.

### Implementation
- frontend/scripts/vercel-build.mjs checks VERCEL_ENV and runs the backend migration only for production builds.
- The production build requires DATABASE_URL, installs backend dependencies, runs npm run db:migrate, and only then runs next build.
- backend/src/db/migrate.ts uses a PostgreSQL advisory session lock and keeps the same PostgreSQL client for Drizzle migration execution, preventing concurrent production migration races.

### Proof requirements
A remediation deployment is not considered proven until Vercel build logs show the production migration gate executing against the production environment and completing before the frontend build. The deployment must also be checked for READY status, and runtime smoke tests should be performed after release.


### Vercel backend deployment correction
The first implementation placed the production migration gate in the frontend build. Inspection of the live Vercel backend build logs showed that the backend project uses a legacy builds entry in backend/vercel.json, which caused Vercel Project Build and Development Settings to be ignored. The production backend deployment therefore needed its own explicit build gate.

The remediation now moves the authoritative gate into the backend Vercel deployment path: the backend package build invokes backend/scripts/vercel-build.mjs, and the legacy builds/routes configuration is removed in favor of Vercel's Express framework deployment. Production runs the committed migration runner before TypeScript compilation; non-production deployments skip production migration. The frontend gate remains defensive, but the backend deployment is the primary production database reconciliation point.

Verification requirement: the next backend production build must show the migration gate before the backend build in Vercel build logs. Do not treat the configuration as proven until that ordering is observed.


### Deployment-trigger probe
A minimal documentation-only change was made on `main` solely to generate a fresh Git push event for the Vercel Git integration. No application behavior or remediation logic was changed. The resulting push is being used only to determine whether Vercel automatically creates a deployment for a new `main` commit.


## 2026-09-26 authentication, legal, and deployment correction

### Production evidence that triggered the remediation
The current Vercel backend deployment dpl_AuPfVozY5Sok3vRoX78SV4Zj2Jdo recorded successful POST /api/auth/login and GET /api/auth/profile requests, but it also recorded repeated POST /api/auth/refresh 401/403 responses. The 403 responses were produced by the cookie-authenticated CSRF check; the 401 responses followed failed refresh attempts. This established that the browser could reach the backend and that the persistent-session path, not basic connectivity, was the material failure observed in the deployment.

The same deployment recorded POST /api/auth/register 400 responses. Source inspection established a second defect: backend validation can return message as a string or error as a structured object, while the registration page previously attempted to render response.data.error directly. A structured error object can therefore produce React minified error #31 in the browser after the 400 response.

The backend also emitted ERR_ERL_UNEXPECTED_X_FORWARDED_FOR because Vercel supplies X-Forwarded-For while Express had the default proxy trust setting. This was corrected with an explicit one-hop trust setting appropriate to the Vercel proxy boundary.

### Root cause and remediation
The production frontend and backend are separate origins. The backend's non-httpOnly CSRF cookie is therefore not readable through document.cookie from the frontend origin, even though the browser can send the backend cookie with credentialed requests. The previous frontend implementation consequently could not reliably reproduce the CSRF header required by /auth/refresh and /auth/logout after deployment/reload.

Remediation now returns the CSRF token in login, registration, and refresh responses, persists that token in browser storage, sends it on cookie-authenticated refresh/logout requests, and rotates the stored value after refresh. The backend CORS allow-list explicitly includes X-CSRF-Token. Login and registration now also establish the authenticated user from the successful auth response instead of immediately requiring a second profile request.

The password error display was normalized so string messages, structured { message } errors, and validation message responses all render as text. Browser password reveal affordances supported by the browser are suppressed where possible; the deliberate AgentForge Show/Hide controls remain the only application-provided visibility controls.

### Legal pages
The Terms and Privacy pages were replaced with coherent, static, product-grounded documents rather than a failed /api/v1/public/legal/... fetch plus sparse fallback. The pages now have consistent navigation, effective/version metadata, readable sections, desktop on-page navigation, and responsive mobile behavior. The wording is limited to behaviors evidenced by the current application and is explicitly not represented as jurisdiction-specific legal advice.

### Verification
PR #4 (fix: restore production authentication and refine legal pages) was merged as ca9bf5af5327a0331bbdcd16ac8c56ec15781ebf after the final GitHub CI run passed:
- Backend type check: PASS
- Backend production build: PASS
- Fresh PostgreSQL + pgvector migration smoke test: PASS
- Backend contract tests: PASS
- Frontend type check: PASS
- Frontend production build: PASS
- Public Playwright E2E: PASS (5/5)

The E2E failure found during the first CI attempt was a test selector ambiguity, not an application failure; the selector was corrected to target the exact AgentForge brand link and the final E2E run passed.

### Production database migration status
The authoritative production migration gate remains in backend/scripts/vercel-build.mjs: production requires DATABASE_URL and runs npm run db:migrate before TypeScript compilation; non-production deployments skip production migrations. The fresh-database CI migration smoke test passed on the final PR head.

A successful production deployment alone is not proof that a particular migration executed. The available Vercel build-log connector did not provide the backend build log needed to directly observe the migration command in the production deployment. Therefore production migration execution is recorded as UNVERIFIED, not falsely marked complete. The required proof is the backend production build log showing the migration gate executing successfully against the configured production DATABASE_URL, followed by production schema/runtime verification.

### Deployment trigger evidence
The earlier main push probe did successfully trigger a Vercel backend production deployment. The current remediation merge is now the authoritative application state. The next required step is to verify the resulting frontend and backend production deployments against the merged commit and then execute production authentication, registration, session, and legal-page smoke tests.

### Superseding stale log entries
Earlier entries in this document described the remediation as branch-only and described a frontend-owned production migration gate. Those statements reflect earlier intermediate states and are superseded by this section: PR #4 is merged into main, the frontend no longer owns production database migrations, and the backend deployment is the authoritative production migration path.

## 2026-09-26 — production auth cookie boundary and PostgreSQL SSL warning remediation

### Original observed behavior
Production registration returned 201 and login returned 200, but the browser immediately followed with /auth/refresh returning 401. Runtime evidence showed the backend was reachable and credential verification succeeded; the persistent refresh-session path was failing. The frontend and backend were deployed as separate Vercel origins, while refresh authentication depended on a backend-origin httpOnly cookie.

The backend also emitted a PostgreSQL client warning on production requests: pg treated legacy sslmode values such as require/prefer/verify-ca as aliases for verify-full and warned about the upcoming pg v9 semantic change.

### Intended remediation behavior
- Browser API traffic must remain same-origin so refresh/CSRF cookies are first-party to the application origin.
- Existing backend routes, authentication semantics, refresh-token rotation, and CSRF checks must remain intact.
- PostgreSQL TLS behavior must remain encrypted and explicit while eliminating the legacy connection-string warning.

### Changes made
PR #5, merged as aafabcbf28b8e148911119209980aee340abac05:
- Browser-side Axios now targets same-origin /api.
- Next.js rewrites /api/* to the configured backend origin.
- The backend migration client normalizes legacy sslmode/ssl parameters before constructing the pg client.

Production deployments for PR #5 reached READY on both frontend and backend.

Production runtime evidence after PR #5 showed the PostgreSQL warning still appearing because the application runtime Drizzle pool, separate from the migration client, still passed the legacy connection-string parameters.

PR #6, merged as 04946d900a9f87d6deb4bf65ca8bbb8a285fb461:
- The runtime PostgreSQL pool now applies the same explicit SSL normalization.

### Positive proof
- GitHub CI for PR #5 passed backend type check, production build, fresh PostgreSQL+pgvector migration smoke test, contract tests, frontend type check, frontend production build, and public Playwright E2E.
- GitHub CI for PR #6 passed the same backend and frontend gates, including public E2E.
- Current frontend production deployment for commit 04946d900a9f87d6deb4bf65ca8bbb8a285fb461 reached READY.
- Current backend production deployment for the same commit reached READY.
- The current production backend logs queried after deployment show no new PostgreSQL SSL warning from the current deployment; the warning visible in the queried window belongs to the previous deployment dpl_FhjzdKqWQE98idU7kxoohkqNgFRh. This is evidence that the runtime warning remediation is active, but not a substitute for a longer observation window.
- The current frontend production HTML is served successfully (HTTP 200) from the deployment for the merged commit.

### What remains for direct user verification
The assistant cannot perform a real browser login with the user's credentials from the available Vercel connector. The production architecture is now arranged so the browser calls same-origin /api and Next.js forwards those requests to the backend. The user should now test registration/login in the production UI; the critical expected sequence is register/login 2xx, refresh 2xx, and no redirect back to /login.

### Migration proof status
Production migration execution remains UNVERIFIED at the build-log level because the available Vercel build-log connector is unavailable. CI migration smoke testing and READY deployments prove build/test health, not that production migration SQL was executed. Do not mark this subfinding closed until production build-log evidence or equivalent direct production schema evidence is obtained.

## 2026-09-26 — authentication context split and stale bootstrap remediation

### Original behavior
Production login returned HTTP 200, but the dashboard could immediately disappear and redirect back to /login. Vercel runtime logs showed successful login/profile/refresh requests interspersed with refresh 401 responses.

Source inspection established a concrete frontend state defect:
- The root frontend/src/app/layout.tsx already mounted AuthProvider.
- frontend/src/app/(auth)/layout.tsx mounted a second, independent AuthProvider.
- Therefore the login page consumed the nested provider and stored the successful login only in that provider.
- The dashboard route consumed the root provider. On navigation, the nested provider was unmounted, so the dashboard saw the root provider's unauthenticated state and redirected to /login.
- The root provider also started a bootstrap /auth/refresh when the application mounted. Its result could complete after a newer login/register operation and previously could clear authentication state established by that newer operation.

This explains the observed production symptom without requiring credentials or a backend authentication failure: /auth/login can succeed while the dashboard still receives a different, unauthenticated React auth context.

### Intended remediation behavior
- Exactly one AuthProvider owns authentication state for the entire application.
- Login and registration must update the same context consumed by protected routes.
- A stale bootstrap refresh must never clear or overwrite state created by a newer login, registration, or logout.
- Refresh-token rotation, CSRF validation, access-token validation, durable sessions, and backend authentication semantics must remain unchanged.

### Changes
- Removed the duplicate AuthProvider from frontend/src/app/(auth)/layout.tsx; the root provider is now the single provider across auth and dashboard route groups.
- Added a monotonic auth-operation ID in frontend/src/contexts/AuthContext.tsx.
- Login, registration, and logout advance that operation ID.
- Bootstrap refresh and its subsequent profile request capture their operation ID and discard stale results if a newer auth operation has started.
- This is a frontend state-coordination fix; it does not weaken authentication checks or change token/session security semantics.

### Proof requirements
Positive proof requires frontend type checking/building and the existing public E2E suite to pass. The critical regression scenario is: a login started while bootstrap refresh is pending must leave the authenticated user and access token intact after the stale bootstrap request completes, and /dashboard must remain accessible.

Backend auth behavior and refresh-token rotation must remain covered by the existing backend contract tests.


## 2026-09-26 — settings/profile simplification and public about presentation

### Original behavior
The authenticated Settings screen combined Gemini credentials/model configuration, editable profile information (name and read-only email), and account deletion. The public footer contained only a minimal product/technology line and legal links, leaving the public product-introduction area visually underdeveloped.

### Intended remediation behavior
Settings should stay focused on product configuration and account security. Redundant profile-management UI should not occupy a full settings card when the application does not otherwise present profile management as a distinct product concern. The public footer/about area should have deliberate hierarchy, readable spacing, and a concise product description without changing navigation or legal links.

### Behavior that must remain
- Gemini API key/model configuration remains functional.
- Account deletion remains password-protected and destructive behavior is unchanged.
- Authentication, authorization, session, CSRF, and API behavior are untouched by this UI cleanup.
- Terms of Service and Privacy Policy links remain available.
- No backend profile endpoint or stored user data is removed merely because the redundant UI is removed.

### Changes
- Removed the Profile Settings card, profile-name form state, and profile-save handler from the Settings page.
- Tightened Settings layout spacing and made the remaining configuration/danger-zone hierarchy more intentional.
- Refined the public footer/about presentation with an explicit ABOUT kicker, concise product description, stronger product-name hierarchy, improved spacing, and a cleaner responsive layout.

### Proof requirement
GitHub CI must pass frontend typecheck/build and public E2E after these changes. The settings page must render only the remaining configuration and account-security sections; the public footer must retain Contact (when configured), Terms, and Privacy navigation.



## 2026-09-26 — production login redirect root-cause confirmation

### Observed behavior
The reported production symptom was: credentials are accepted, but the application does not reliably enter the dashboard; after opening the Vercel deployment and clicking Visit, a fresh application load can reach the dashboard.

### Evidence
Production backend runtime logs for deployment `dpl_A12rUM7541fcSVjTBXZF2LQ1a4wN` on `main` show successful authentication and profile requests:
- POST `/api/auth/login` returned 200 repeatedly.
- GET `/api/auth/profile` returned 200.
- POST `/api/auth/refresh` returned both 200 and repeated 401 responses, including bursts of multiple 401 responses at the same second.

Source inspection of the production `main` commit established the client-side cause:
- `frontend/src/app/layout.tsx` mounts an application-wide `AuthProvider`.
- `frontend/src/app/(auth)/layout.tsx` mounts a second independent `AuthProvider`.
- The login page therefore updates the auth provider owned by the auth route group, while the dashboard consumes the root provider.
- Both providers also execute their bootstrap `POST /auth/refresh` on mount.
- The backend intentionally performs one-time refresh-token rotation: a successful refresh revokes the presented refresh token and creates a replacement. A concurrent second refresh using the same cookie therefore receives the replay/invalid-token path and HTTP 401.
- The root provider's bootstrap failure can clear its access token/user state. When navigation moves from the auth route group to the dashboard, the nested provider is unmounted and the dashboard is left with the root provider's state. This directly explains why a successful login can still be followed by a redirect to `/login`.
- A fresh Vercel Visit starts a new application lifecycle with one root provider, so a fresh refresh can establish the session and make the dashboard accessible. This matches the reported recovery behavior.

### Root cause
The production issue was not a basic login or backend connectivity failure. It was the interaction of **duplicate frontend authentication contexts** with **one-time refresh-token rotation**. The duplicate providers caused concurrent bootstrap refreshes and split authentication state across route groups.

### Intended remediation
- Exactly one `AuthProvider` must own authentication state.
- Login/register state must be the same state consumed by protected dashboard routes.
- Bootstrap refresh/profile results that belong to an older auth operation must not overwrite a newer login/register/logout state.
- Backend refresh-token rotation and security semantics must remain unchanged.

### Remediation applied
The existing PR #7 branch removes the duplicate auth provider from the auth route group and adds a monotonic auth-operation guard in `AuthContext.tsx`. This is the direct remediation for the confirmed root cause.

### Production-state clarification
At the time of this confirmation, production `main` still points to commit `10ee7dbac56bec7dc49be0fa10e2993acb2f68cc`, whose source still contains the duplicate provider. Therefore the root-cause remediation is **not yet production-live**. The corresponding frontend preview deployment for the remediation branch is READY, but it is not a production deployment.

### Proof requirements
Closure requires:
1. CI passes on the final remediation head.
2. The frontend production deployment is built from the remediation commit.
3. A production login test shows login success followed by dashboard access without returning to `/login`.
4. Runtime logs no longer show the duplicate-bootstrap refresh pattern associated with the two-provider lifecycle.
5. The existing backend refresh-token rotation tests continue to pass.

## 2026-09-26 — Danger Zone/account-deletion UI refinement

### Original behavior
The Danger Zone already opened a password-confirmation dialog and called the existing `DELETE /api/auth/account` flow. The functionality was correct, but the presentation was visually heavy and lacked clear hierarchy between the security warning, destructive consequence, password confirmation, and final action.

### Intended remediation behavior
The Danger Zone should look like a deliberate account-security section rather than a generic red card. The confirmation dialog should make the permanence and affected data clear before asking for the password, with balanced action hierarchy and responsive behavior.

### Behavior that must remain
- Account deletion remains explicitly initiated by the user.
- Password confirmation remains required.
- The existing `DELETE /api/auth/account` endpoint and request payload remain unchanged.
- Successful deletion still clears the local auth state and returns the user to login.
- Failed deletion still leaves the account/session intact and surfaces the existing error.
- No backend deletion semantics or authorization behavior changes.

### Changes
- Refined the Danger Zone card with a compact security kicker, structured heading, restrained destructive treatment, explicit consequence text, and cleaner action alignment.
- Redesigned the confirmation modal with a clearer permanent-action label, concise consequence list, improved spacing, stronger hierarchy, and responsive button stacking.
- Added an accessible description relationship to the confirmation dialog.
- No deletion logic was changed.

### Proof requirements
Frontend typecheck/build and the relevant E2E suite must pass. Manual authenticated verification should confirm the modal opens, dismissal clears the password, empty confirmation cannot submit, successful deletion follows the existing logout/redirect path, and an invalid password does not delete the account.


## 2026-09-26 — Knowledge embedding model and Agent collection presentation

### Knowledge embedding failure
- **Original behavior:** `backend/src/services/gemini.service.ts` hard-coded `text-embedding-004` while the database contract remained `vector(768)`.
- **Observed production failure:** knowledge upload reached the backend and failed during embedding with Gemini HTTP 404 for `text-embedding-004`; this was not a CSV parsing failure and did not indicate a missing Gemini API key.
- **Remediation intent:** keep the existing per-user Gemini key flow and 768-dimensional pgvector contract, but call a currently supported embedding model directly without introducing a new user/admin configuration surface.
- **Change:** embedding generation now calls the supported `gemini-embedding-001` endpoint with `output_dimensionality: 768`, then validates the returned vector is exactly 768 dimensions. Chat-generation model configuration remains unchanged.
- **Preserved behavior:** document text is still chunked exactly as before; embedding concurrency is unchanged; vectors remain `vector(768)`; RAG still uses cosine similarity; no embedding values are silently padded/truncated.
- **Verification added:** `backend/tests/gemini-embedding.test.ts` verifies the model endpoint, API-key header, 768-dimensional request, exact returned dimension, and API/dimension failures.
- **Compatibility note:** Gemini embedding spaces are model-specific. Any pre-existing vectors produced by the retired `text-embedding-004` model are not interchangeable with the new model's vectors and require re-embedding before their semantic retrieval can be considered valid. No existing knowledge rows are deleted automatically by this remediation.

### Agent collection UI
- **Original behavior:** the dashboard rendered all agents as fixed cards only, with four action controls crowded into each card footer.
- **Remediation intent:** preserve create/edit/chat/data/delete functionality while making the collection scalable when many agents exist.
- **Change:** added a persisted Grid/List view toggle. Grid retains the card presentation; List presents each agent as a compact row with name/temperature, prompt preview, document/chunk stats, and actions aligned into distinct columns. Mobile collapses list rows into a readable single-column arrangement.
- **Preserved behavior:** existing agent actions and routes remain unchanged; the view preference is presentation-only and stored locally in the browser.

## 2026-09-27 — Danger Zone mobile hierarchy follow-up

### New production/UI evidence
A current mobile screenshot of the deployed Settings page showed that the Danger Zone still reads as visually heavy: the security heading, deletion explanation, consequence text, and destructive button form one tall stacked block with weak hierarchy and excessive visual weight. This supersedes the earlier Danger Zone refinement as a presentation follow-up, not a functional defect.

The screenshot also confirms that the account-deletion area is the Settings surface the user relies on for permanent account removal. The destructive action must therefore remain prominent enough to find, but compact enough that it does not dominate the settings page.

### Original behavior being remediated
- Account deletion already opened a password-confirmation dialog.
- The existing account-deletion request, password requirement, success logout/redirect, and failure handling were already correct.
- The prior UI refinement reduced some visual weight, but the mobile composition still stacked the consequence copy and destructive action in a way that produced an oversized block.

### Intended remediation behavior
- Keep the account-security warning immediately identifiable.
- Establish a small security kicker and compact heading rather than a large red section title.
- Keep the destructive treatment restrained: neutral glass surface with a narrow rose security accent instead of a fully tinted red card.
- Separate the deletion explanation from the final action with a compact divider.
- Present the deletion consequences as a small, clearly labelled supporting detail.
- On narrow screens, stack the final action cleanly and make the delete trigger full-width without changing its semantics.
- Preserve the existing password-confirmation modal and deletion endpoint unchanged.

### Changes
- Reworked the Danger Zone card hierarchy and spacing in frontend/src/app/(dashboard)/settings/page.tsx.
- Reduced heading/icon/card density and removed the heavy full-card red treatment.
- Added a compact “What gets deleted” consequence label.
- Changed the action area to an intentional two-column desktop layout with a clean mobile single-column fallback.
- Kept the delete button visually destructive but compact and full-width only on narrow screens.
- No account-deletion logic, API route, payload, authentication, authorization, or redirect behavior changed.

### Proof requirements
- Frontend TypeScript and production build must pass.
- Existing public E2E must remain green.
- The final merged commit must deploy to the frontend production target.
- Manual authenticated verification should confirm: Danger Zone is compact on mobile, delete dialog opens, cancel clears the password field, empty password cannot submit, valid deletion follows the existing account-deletion path, and an invalid password does not delete the account.


## 2026-09-27 — production URL/visual verification discrepancy and Danger Zone polish

### Evidence
- The user's current mobile screenshot shows the older, visually heavy Danger Zone treatment: oversized “ACCOUNT SECURITY”/“Danger Zone” typography, a long unstructured deletion paragraph, and a large destructive button block.
- The screenshot URL is `forge-drab.vercel.app`.
- Vercel's current AgentForge production deployment is `dpl_9CPeVcSnFYjqpQ7CKpZJo8VxqfFk`, READY, built from main commit `5d9b09a3700748142caaa81664ba8dec8c01e2e7`, with production aliases including `agentforge-drab.vercel.app`.
- The current `main` source already contains the earlier Danger Zone refinement, so the screenshot is not evidence that the current source was absent; it is evidence that the URL being viewed does not match the current production alias returned by Vercel.
- The screenshot also shows the older Gemini-key status placement, which further supports that the viewed page is from an older/stale deployment rather than the current Settings source.

### Intended remediation behavior
- Do not rely on a deployment merely being READY; the visible production surface must correspond to the current source and remain visually coherent at mobile widths.
- Keep account deletion discoverable and destructive, but make the Danger Zone compact, structured, and secondary to the primary settings task.
- Preserve the password-confirmation modal and all deletion behavior.

### Additional change
- Reduced Danger Zone card/header/copy spacing and typography.
- Collapsed the consequence text into a compact supporting line instead of a separate visual block.
- Kept a clear divider before the destructive action.
- On narrow screens, the delete trigger remains full-width for touch usability without expanding the surrounding card unnecessarily.
- No account-deletion logic, API endpoint, payload, auth, authorization, or redirect behavior changed.

### Proof requirements
- Frontend typecheck/build and existing E2E must pass.
- The branch must merge to `main` and the resulting frontend production deployment must be READY.
- Production should be checked against the current Vercel production alias, not an older deployment URL.
- Manual authenticated verification should confirm the delete dialog still opens, cancel clears password state, empty password cannot submit, and invalid credentials do not delete the account.


## 2026-09-27 — knowledge observability, vector-count truth, and grounded-chat detection

### Original behavior
- Production info/warning logs were discarded because the logger returned immediately outside development mode. This prevented Vercel runtime logs from showing the knowledge upload/chunk/embedding lifecycle.
- Knowledge-document responses omitted `chunk_count`; the frontend defaulted the missing field to `0`, masking an API contract defect as a real zero-vector state.
- Agent list/detail responses returned raw agent rows without `document_count` or `chunk_count`, even though the frontend and chat UI depend on those fields. The frontend again defaulted missing counts to `0`.
- The chat page decides whether “Grounded mode” is active from `agent.documentCount`. Therefore an agent with real knowledge documents could display “Grounded mode inactive” simply because the count was omitted.
- Agent GET responses are cached, while knowledge upload/delete did not invalidate the agent cache, so knowledge state could remain stale until cache expiry.

### Intended remediation behavior
- Retain normal application info/warning logs in production as well as development so operational investigation can reconstruct the knowledge pipeline.
- Never silently convert a missing document/vector count into a valid-looking zero. The API supplies authoritative counts and the frontend consumes them as required fields.
- Agent list/detail responses expose actual document and chunk counts derived from `knowledge_documents` and `knowledge_chunks`.
- Knowledge upload responses expose the actual number of embedded chunks, and upload/delete invalidate the agent cache so chat sees current knowledge state.
- Grounded-mode presentation therefore reflects actual indexed knowledge presence; the RAG retrieval algorithm itself remains unchanged.

### Behavior that must remain
- Gemini embedding generation remains per-user-key based and uses the 768-dimensional pgvector contract.
- Knowledge chunking, embedding concurrency, vector storage, cosine-similarity retrieval, chat generation, and auth semantics remain unchanged.
- Missing knowledge still legitimately produces grounded mode inactive; only the false-zero detection path is remediated.
- No API keys or document contents are written to logs.

### Changes
- Logger info/warn output is now retained in production.
- Knowledge upload logs record safe lifecycle metadata: filename, content length, chunk count, embedding count/dimension, document ID, and completion state; no key or document body is logged.
- Knowledge document list responses include authoritative `chunk_count` from `knowledge_chunks`.
- Agent list/detail and create/update responses include authoritative `document_count` and `chunk_count` using correlated database counts.
- Knowledge upload returns `chunk_count` and invalidates the authenticated user’s `/api/agents` cache; deletion invalidates the same cache.
- Frontend knowledge/agent mappers now require the API count fields instead of defaulting missing fields to zero.

### Proof requirements
1. Backend tests must pass, including the Gemini embedding contract tests.
2. Backend build and frontend production build/typecheck must pass.
3. The knowledge upload path must be verified as: upload request → chunking → Gemini embeddings → transactional document/chunk persistence → authoritative counts → agent cache invalidation → chat grounded-state detection.
4. Runtime logs must show the knowledge lifecycle in production while omitting secrets/content.
5. Existing chat/RAG retrieval and knowledge deletion behavior must remain functional.


## 2026-09-27 — Authoritative knowledge counts across Vercel instances and Danger Zone layout reconstruction

### Original behavior
- Agent list/detail GET endpoints used an in-process `NodeCache` with a TTL.
- Knowledge upload/delete attempted to invalidate that cache after database mutation.
- The cache lived inside the Node.js process, so invalidation only affected the specific serverless instance handling the mutation.
- On a multi-instance/serverless deployment, a later agent GET could be served by another warm instance containing an older `document_count`/`chunk_count` response.
- The frontend dashboard and chat both trusted the agent GET counts, so stale zeroes could make the dashboard show `0 documents / 0 chunks` and the chat show the grounded-mode-inactive state even though the knowledge page showed persisted vectors.
- The Danger Zone had been repeatedly adjusted through spacing-only CSS changes. The card also used `overflow: hidden` plus a decorative pseudo-element and a two-column action row, which made responsive clipping possible and made visual changes difficult to reason about from source alone.

### Intended remediation
- Agent list/detail responses must read authoritative counts from PostgreSQL on every request rather than depend on process-local cache state.
- Preserve the existing database count queries, authentication, agent CRUD semantics, knowledge persistence, RAG behavior, and deletion flow.
- Reconstruct the Danger Zone as a bounded, width-safe component: no clipping container, explicit `box-sizing`, width constraints, safe text wrapping, a stable desktop action row, and a single-column mobile action layout.

### Existing behavior that must remain
- Agent CRUD endpoints remain authenticated and user-scoped.
- Knowledge upload still chunks, embeds, persists the document/chunks, and reports the actual chunk count.
- Knowledge deletion still removes the document and associated vectors through the existing database cascade/relationship.
- Chat still uses the agent's authoritative document count to determine whether grounded presentation is active.
- Account deletion still opens the existing confirmation dialog and calls the existing authenticated account-deletion endpoint with password confirmation.
- No secrets, document contents, or passwords are introduced into logs or UI.

### Changes
- Removed the process-local cache middleware from `GET /api/agents` and `GET /api/agents/:id`.
- Removed now-unnecessary knowledge/agent cache invalidation calls. The source of truth is the database query itself.
- Kept the existing correlated PostgreSQL document/chunk count queries unchanged.
- Rebuilt the Danger Zone CSS around width containment and responsive flow:
  - `box-sizing: border-box` and `width: 100%` on the card.
  - Removed `overflow: hidden` and the left-edge pseudo-element that could visually clip content.
  - Removed arbitrary left padding from the copy.
  - Made the action row width-safe with `minmax(0, 1fr)` and an explicit action column.
  - Added `max-width: 100%` and safe text wrapping to consequence content.
  - Made the destructive trigger explicitly width-safe.
  - At narrow widths, the consequence and delete action stack in one column with a full-width button.

### Proof contract
1. Upload a document that produces three chunks.
2. Verify the knowledge page reports one document and three vectors.
3. Request `GET /api/agents` and `GET /api/agents/:id` after upload; both must report one document and three chunks regardless of which serverless instance handles the request.
4. Return to the dashboard; the same agent card must show `1` document and `3` chunks.
5. Open chat; the grounded-mode-inactive notice must not be rendered while the document exists.
6. Delete the document; knowledge, agent list/detail, dashboard, and chat must return to the legitimate zero-knowledge state.
7. Verify Danger Zone at desktop and narrow/mobile widths: all text remains inside the card border, the action row does not overlap or clip, and the delete trigger remains fully inside the card.
8. Run backend tests, frontend typecheck/build, and the existing Playwright suite. A source diff alone is not considered visual proof.


### 2026-09-27 — Production-safe end-to-end forensic tracing for knowledge/count persistence

**Original behavior:** Knowledge uploads successfully created documents/chunks, but the production symptom could still not be localized from application behavior alone when the dashboard later displayed zero document/vector counts.

**Diagnostic objective:** Establish an observable chain without changing business behavior:
1. frontend request starts;
2. backend receives the request with a correlation ID;
3. authentication resolves the user;
4. knowledge upload chunks/embeds/persists;
5. database persistence is immediately re-read and counted;
6. API response contains the authoritative counts;
7. frontend receives the response;
8. frontend maps API snake_case fields to client camelCase fields;
9. frontend state is updated;
10. subsequent agent-list/detail requests return the same authoritative counts.

**Remediation:** Added structured production-safe tracing only. No knowledge, authentication, CRUD, RAG, deletion, or UI business behavior was intentionally changed.

**Backend instrumentation:**
- Every HTTP request receives or preserves an `X-Request-ID` correlation identifier and returns it in the response header.
- Request start/completion events record method, route, status, and duration.
- Knowledge upload logs persistence verification using database counts immediately after the transaction.
- Knowledge listing logs returned document IDs, filenames, and per-document chunk counts.
- Agent list/detail service queries log the authoritative `document_count` and `chunk_count` returned by PostgreSQL.
- Agent/knowledge route handlers log the exact response payload counts being sent.
- Structured JSON logging is used in production; no document contents, embeddings, API keys, access tokens, passwords, or secrets are logged.

**Frontend instrumentation:**
- Axios requests receive correlation IDs and log start/completion/error events.
- Agent-list responses log raw API count fields before mapping and client-state values after mapping.
- Knowledge-list responses log document and chunk totals.
- Successful uploads log document ID and chunk count.
- Errors are logged with status/message/request ID, without authorization headers or response bodies.

**Proof contract:** After one upload and one navigation away/back cycle, the logs must let us determine whether the value becomes zero at persistence, database read, API response, frontend mapping, or frontend state/rendering. This is diagnostic instrumentation only and must be removed or reduced once the root cause is conclusively identified.

**Existing behavior that must remain:** The authoritative PostgreSQL count queries remain the source of truth; no caching layer, endpoint contract, authentication behavior, knowledge persistence semantics, or destructive-action behavior is changed by this tracing work.
