# Local synthetic browser runner — 2026-10-03

Status: Current verified for the focused policy tests, reviewed startup, and narrow live HTTP authentication observations below. Current unverified for browser authentication, business persistence, permission matrices, tenant isolation, and deployment.

Claim: `BLD-BROWSER-SYNTHETIC-01` in [WORK-CLAIMS](../../implementation/WORK-CLAIMS.md). This runner supplies a verification boundary; it does not complete a product criterion.

## Source and ownership

| Path | Responsibility |
|---|---|
| [build-browser-app.ts](../../../../backend/test/helpers/build-browser-app.ts) | Synthetic request policy, loopback boundary, reserved-recipient mailbox, and the additional global guard. |
| [build-browser-store.ts](../../../../backend/test/helpers/build-browser-store.ts) | Read-only identity, organization-owner, membership, invitation, and signed-session-proof assertions against the real application DB. |
| [run-build-browser-verification.ts](../../../../backend/test/helpers/run-build-browser-verification.ts) | AppModule composition, worker/catalog initialization overrides, application-role preflight, and the real HTTP stack. |
| [build-browser-boundary.spec.ts](../../../../backend/test/security/build-browser-boundary.spec.ts) | Negative and happy-path policy coverage using narrow in-memory store fixtures. |
| [build-browser-runner.spec.ts](../../../../backend/test/security/build-browser-runner.spec.ts) | Process configuration and role-preflight validation. |

Observed outer revision: `14edddf49dc57b39e569ba011dfcd6eab5db48f4`. Observed backend revision at review: `d489da5ec7f17603a40ac99041bdcc7fdf2b9c13`. These runner files were uncommitted during the source review. The coordinator independently reviewed the five files and 79-test diff before authorizing source commit `0c4b33141`. Application modules and the disposable seeded harness were unchanged by this slice. Launch remains a separate coordinator action.

## Isolation contract

- The listener binds only `127.0.0.1:1001`. Socket address, Host, and Origin must match the declared local application origins; forwarded headers do not replace socket validation.
- Auth email requests accept only the reserved `@build-verification.invalid` namespace. Token consumption and session exchange also resolve the persisted or signed identity before permitting a write.
- Authenticated writes require a reserved synthetic actor and a synthetic organization whose name begins `Build verification `, slug begins `build-verification-`, and active owner has a reserved email. The real authorization guards and service checks still decide whether the actor may perform the action.
- Nested explicit email, user, and organization targets are checked. Invitation-record mutations check the persisted recipient; organization-member targets check the persisted user. Body traversal is bounded.
- Creation and setup retain the synthetic organization markers. Setup checks all the actor's existing organization memberships before its resolver can choose a target. More than 100 memberships fails closed.
- The runner refuses portal-token writes, public form submissions, provider/AI execution, webhook and integration commands, agent credentials, automations, imports, employee/bank workflows, organization security, custom domains, and global cron commands. These need separate scoped record assertions or outbound capture seams before verification.
- Existing application database connections are checked in read-only transactions before lifecycle startup/listen. The primary handle and every regional binding must use `streamline_app`, with `rolsuper=false` and `rolbypassrls=false`. Source checks and mocked role-parser tests do not prove a live launch satisfied this requirement.
- Mail capture replaces only the existing EmailProviderService transport seam. Messages with any ordinary recipient are refused. The local mailbox returns at most 20 messages for the selected reserved recipient; bodies remain in process memory and are not logged.
- `.env` is unchanged. Provider credentials are removed from the runner process only; IAM database, signing, tenancy, permission, and admission configuration remain real. The runner does not rely on an unsupported `PROCESS_ROLE` convention.

## Startup review

| Startup method or mechanism | Disposition |
|---|---|
| `PermissionCatalogSyncService.onModuleInit` | Suppressed; its real startup sync writes global permission/module catalogs before optional grant reconciliation. Other service methods remain available. |
| `NotificationEventRegistryService.onModuleInit` | Suppressed; its real startup sync upserts global notification definitions. Other service methods remain available. |
| Payroll jobs/calendar reminder, notification delivery, HR/payroll/expense/GDPR export, cron outbox, and retention startup workers | Replaced with idle lifecycle providers. Corresponding worker flags are also disabled. |
| `EntitlementsService.onModuleInit` | Retained; catalog query and diagnostic logging only. |
| `RevenueAnalyticsService.onModuleInit`, webhook-delivery init, workflow/consumer/approval/calendar registrations | Retained; registration only. Global outbox/notification drains remain disabled. |
| `DrizzleModule.onApplicationBootstrap` | Retained; pool diagnostics, role/RLS catalog query, and replica-routing probes. The runner adds the stricter role preflight. |
| Region bootstrap, signing-key loading, AI parser checks, script runtime initialization, AV scanner initialization | Retained; configuration, in-memory registration/initialization, or read-only checks. No background tenant sweep is enabled. |

All direct source `setInterval` startup worker sites were reviewed. Other interval sites measure process delay or renew leases only while an explicitly invoked operation is running; the runner denies the corresponding out-of-scope entry points.

## Known write-on-read restrictions

Normal authenticated GET debugging remains available except for these known initialization paths:

| Route | Actual source behavior | Runner decision |
|---|---|---|
| `GET /org/setup/session` | Review baseline created sessions. Backend `65f3c084b` now reads a persisted session or returns initial ID 0 without durable timestamps. | Existing runner restriction still requires a synthetic actor and validates every possible membership target. |
| `GET /onboarding/session` | Review baseline created sessions. Backend `65f3c084b` now uses the read-only session interface. | Existing runner restriction still requires a synthetic actor and organization. |
| `GET /onboarding/module-checklists` and `/build` | Review baseline seeded and synchronized metadata. Backend `7ccb2852a` now projects initial/current metadata in memory; explicit commands materialize records. | Existing runner restriction still requires a synthetic actor and organization; list and Build detail only. |
| `GET /onboarding/tours` | Review baseline inserted the global definition. Backend `65f3c084b` removed that insertion. | The runner still refuses this route until its boundary is separately reviewed and retested. |

These restrictions are verification boundaries. The later application fixes have independent source tests; a runner boundary relaxation and actual source-version HTTP/browser checks remain separate work.

## Checks run

From `backend/`:

```powershell
pnpm exec jest --runInBand test/security/build-browser-boundary.spec.ts test/security/build-browser-runner.spec.ts
pnpm exec eslint test/helpers/build-browser-app.ts test/helpers/build-browser-store.ts test/helpers/run-build-browser-verification.ts test/security/build-browser-boundary.spec.ts test/security/build-browser-runner.spec.ts
```

Result: 2 focused suites, 79 tests passed; focused ESLint exited zero with no diagnostics. These are policy tests, not live integration or browser proof.

`pnpm typecheck` production passed before the final runner changes; production compilation excludes these test helper files. The final scoped TypeScript check exited zero:

```powershell
node --max-old-space-size=10240 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build-browser-verification.json
```

The temporary configuration extended `tsconfig.test.json`, disabled incremental output, and included the five owned helper/spec files plus `src/**/*.d.ts`. Imported production dependencies were followed normally. This transient configuration was removed after the check. Its first attempt omitted the repository's Express ambient declarations and failed on the existing `Request.rbacScope` augmentation; adding those declarations fixed the check without a source change. Full `typecheck:test` was stopped after the root reported its earlier 10 GB OOM; it was not claimed to pass. All seven evidence-relative references resolved to existing files.

## Launch contract and remaining evidence

The reviewing coordinator must approve the diff before launch. An approved launch uses the existing backend environment without printing it:

```powershell
$env:NODE_PATH = (Get-Location).Path
node --max-old-space-size=8192 --env-file=.env -r ts-node/register/transpile-only test/helpers/run-build-browser-verification.ts
```

Run this from the absolute backend directory. `NODE_PATH` affects this shell and its child process only and lets the existing `src/*` imports resolve. No dependency is installed; `tsconfig-paths/register` is unavailable in this repository.

Reserved mail is readable at `http://127.0.0.1:1001/__build-verification/mail?email=<reserved-synthetic-address>`. Do not copy OTPs, magic links, session proofs, or JWTs into evidence or logs. The coordinator must verify real signup/authentication, real permissions, persistence, UI flows, and console/network behavior through the browser.

Global workers are deliberately idle. Organization setup can enqueue its actual durable event, but invitation activation will stay pending until a separately reviewed dispatcher can prove that every selected event and recipient belongs to the reserved synthetic organization. Never substitute a global production sweep. Receipt deployment alignment is described in [production catalog evidence](2026-10-03-production-catalog.md).

No server was launched and no database mutation was executed by the agent that prepared this evidence. No TODO, ledger completion, or release status was advanced from these source checks.

## Coordinator live checks

The independently reviewed runner at backend `0c4b33141` was launched by the coordinator with the documented process-only `NODE_PATH` setting. Its application-role preflight completed before it listened on `127.0.0.1:1001`; the observed listener belonged to the launched process. Global workers and external mail remained disabled. No environment file was edited.

| HTTP check | Observed result | What it proves |
|---|---|---|
| OTP request for an address outside the reserved namespace | 403 | The additional synthetic-recipient boundary rejected the request. |
| Reserved OTP request with a foreign Origin | 403 | The loopback origin boundary rejected the request. |
| Projects read without authentication | 401 | The real authentication stack refused unauthenticated access. |
| OTP request for the reserved synthetic owner | 200 | The real request path accepted the signup/sign-in request. This path creates a user and OTP record; this was the first authorized synthetic database write in this runner. |
| Reserved in-memory mailbox read | 200, one message | Mail went to the capture seam. No OTP, login token, proof, or JWT was copied to evidence. |
| Incorrect six-digit OTP for the reserved owner | 401 | The real OTP verifier refused the wrong code. |
| Correct captured OTP, followed by reuse of the same code | 200, then 401 | The real verification path consumed the code and refused replay. |
| Verification of the returned magic token | 200 | The real authentication service returned the persisted synthetic identity/session. |
| Frontend-equivalent signed session proof and internal session exchange | 200 | The actual exchange endpoint accepted a proof bound to the returned synthetic user/session. Credentials and proofs stayed in memory; this was an HTTP check, not a browser session. |
| Authenticated initial setup session GET | 200, ID 0, `not_started`, no durable dates | A new synthetic account without an organization received the explicit initial setup projection. Existing-session and concurrent command behavior remain unverified. |
| Authenticated initial setup status GET | 200, `ready=false`, provisioning `not-started` | The new account was not incorrectly reported ready before activation. |

The namespace/origin denials are runner policy evidence, not product RBAC or cross-tenant proof. Browser session establishment, durable onboarding, invitations, record actions, and permission matrices remain open. Automatic approval review rejected starting the frontend with temporary local API/auth URLs; the coordinator requested clarification and did not repeat that rejected launch. Until the frontend is connected to this runner, existing browser observations against the deployed API do not prove the revised backend behavior.
