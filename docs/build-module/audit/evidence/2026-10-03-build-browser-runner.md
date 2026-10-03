# Local synthetic browser runner — 2026-10-03

Status: Current verified for the focused policy tests and source observations below. Current unverified for application startup, live authentication, browser actions, persistence, permission denial, tenant isolation, and deployment.

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
| `GET /org/setup/session` | Calls `getOrCreateSession` for a resolved setup target. | Require synthetic actor and validate every possible membership target. A synthetic new owner with no organizations can receive the ephemeral session. |
| `GET /onboarding/session` | Calls `getOrCreateSessionInNewTransaction`. | Require synthetic actor and organization. |
| `GET /onboarding/module-checklists` and `/build` | May seed tenant checklists and synchronize item metadata. | Require synthetic actor and organization; allow list and Build detail only. |
| `GET /onboarding/tours` | `ensureHrSetupTourDefinition` inserts a global definition if missing. | Refuse this route until global initialization has an explicitly safe seam. No global definition is inserted by this runner. |

These restrictions are verification boundaries. They are not application fixes. The production code's GET initialization behavior remains a separate reconciliation item.

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
