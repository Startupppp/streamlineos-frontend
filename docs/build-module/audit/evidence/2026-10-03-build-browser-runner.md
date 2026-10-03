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

## Coordinator synthetic project and ticket HTTP checks

Status: Current verified for these local HTTP observations against the reviewed real AppModule runner. The reserved Flow02 owner created records only in its new synthetic organization. This is not browser, complete permission-matrix, deployment, or performance acceptance.

| Action | Observed result | Limit |
|---|---|---|
| Create a project with a fresh idempotency key | 201, persisted project returned | One authorized owner and one default workflow. |
| Repeat the same project command with the same key | 201, same project ID | Sequential replay; concurrent project commands remain open. |
| Reuse that key with a different project payload | 422 `UNPROCESSABLE_ENTITY` | This is the actual global idempotency interceptor behavior; do not document this tested case as 409. |
| Submit an invalid blank project name with a fresh key | 400 `VALIDATION_FAILED` | Narrow input-validation negative. |
| Read the new project, project collection, and workflow states | All 200; collection contains the same project; TODO/IN_PROGRESS/IN_REVIEW/DONE returned | The local project-read ambiguity fix succeeded on this real endpoint. The browser still uses the separately deployed API. |
| Read an existing project belonging to another organization | 404 `PROJECTS_NOT_FOUND` | One read-only cross-organization negative; no foreign record was mutated. |
| Create an assigned ticket and replay its idempotency key | Both 201, same ticket ID; detail 200 with version 1, TODO, and one assignee | Assignment changes, relation commands, attachments, comments, and other principal matrices remain open. |
| Submit an unknown ticket status | 400 `PROJECTS_INVALID_TICKET_STATUS` | Status validation through the actual command. |
| Change status using version 1, then read detail | 200; fresh detail 200, IN_PROGRESS, version 2 | Persists through another HTTP request; browser refresh and event/cache evidence remain open. |
| Update priority using stale version 1 | 409 `PROJECTS_TICKET_CONFLICT` | Optimistic concurrency refused the stale command. |
| Save the owner's ticket draft and read `/build/comment-drafts/mine` | PUT 200; collection 200 with one matching ticket/body | Draft resume, paging/filtering, other actors, offline replay, and browser persistence remain open. |

One initial draft request used the wrong guessed project-scoped path and returned 404; source inspection identified the canonical `/build/comment-drafts/tickets/:ticketId` route before the successful request. Several initial ticket/draft checks encountered an expired backend token and returned 401. They were retried only after a fresh exchange bound to the real issued user/session/organization; those initial responses are not counted as validation or persistence proof. No raw session, proof, token, or draft identity was logged.

A separate IAM application-role transaction then asserted `current_user=streamline_app` and `transaction_read_only=on`, set the exact synthetic tenant/audience context, and queried only the new organization/project/ticket and current actor. It returned one matching project, one ticket with IN_PROGRESS/version 2/MEDIUM, one actor assignment, and one actor-owned draft with the expected text. This independently confirms tracked record persistence and that the rejected stale priority update did not change the ticket. It does not establish a complete write census, event delivery, browser cache behavior, or another actor's visibility.

### Advanced navigation browser observation

The existing authenticated browser, still connected to the deployed API, opened More Build tools. Searching `approv` left only Approvals at its canonical `/build/approvals` destination. Escape dismissed the dialog and returned focus to the More Build tools button. The screenshot measures 1280 × 720: [search result](2026-10-03-browser/build-more-tools-search-desktop.jpg). No pin or record mutation was issued. Other roles, denied destinations, pin persistence, mobile navigation, and the complete navigation criterion remain open.

## Impossible-date regression and reviewed API retest

The reserved Flow02 owner originally submitted a cycle with `startDate=2026-02-30` and `endDate=2026-03-03`. The real API returned 500 `INTERNAL_ERROR`, with PostgreSQL SQLSTATE `22008` and correlation `670ec25e-e7e7-4b0e-a042-934bcf2a0455`. This was a genuine validation defect rather than an authorization denial.

Backend `9c749d7a3` reuses the shared Gregorian calendar validator for Cycle, Epic, Workstream and Sprint dates, preserving optional/clear/range behavior and existing instant grammar. Shared Release/Checklist write-date consumers inherit the corrected validator. Backend `80f3ac51c` separately applies the same validator to Release `from`/`to` filters while preserving their existing empty-string rejection. Root and independent agents reviewed each slice. Calendar suites passed 89 tests across five suites; Release focused schema tests passed 21. Production and scoped test TypeScript and scoped ESLint passed for the calendar slice; Release scoped TypeScript passed and production TypeScript completed without diagnostics.

The old local runner was absent when restart was attempted. An initial launch failed to resolve `src/db/drizzle.constants` before application startup because `NODE_PATH` targeted node_modules. The corrected hidden launch used the repository root for source resolution, unchanged `.env`, the existing synthetic boundary and disabled providers/workers; it became ready at loopback port 1001 with process 18440. A tool interruption discarded the coordinator's in-memory session variables. The coordinator therefore repeated the normal captured-mail OTP and magic-link flow for the same synthetic owner and exchanged that real newly issued session through the canonical session-exchange endpoint. No backend JWT was directly minted and no credential was logged.

| Retest through the real local API | Observed result |
|---|---|
| Cycle collection before invalid request | 200, zero rows. |
| Repeat impossible-date cycle creation with a fresh idempotency key | 400 `VALIDATION_FAILED`; collection afterward still zero rows. |
| Cycle `from=2026-02-30` filter | 400 `VALIDATION_FAILED`. |
| Release `from=2026-02-30` filter | 400 `VALIDATION_FAILED`. |
| Create valid leap-date cycle, `2028-02-29` to `2028-03-03`, capacity 10 | 201, cycle 58 in synthetic project 54. |
| Replay identical valid request with the same key | 201, same cycle 58. |
| Re-read cycle collection | 200, exactly one matching cycle with the stored dates, capacity 10 and version 1. |

An independent agent then used a fresh IAM application-role connection for one `READ ONLY` transaction. It asserted `streamline_app` and read-only mode, set the exact tenant and INTERNAL audience, and verified the supplied organization name/slug plus its ACTIVE owner membership, actor and reserved email before reading Build records. Exact synthetic project 54 matched once. Scalar results were `live_cycle_count=1`, `matching_valid_cycle_count=1` and `invalid_cycle_count=0`; the matching cycle had ID 58, the expected name/dates/capacity/actor and no deletion. The process exited 0 and closed the connection, with no writes or credentials in output.

These checks use the actual application guards, command and database path. Browser creation, other actors/tenants, all calendar consumers and deployed behavior remain Current unverified. The independent read proves only the targeted persisted cycle truth. No ticket comment was posted.

### Organization-member target adapter correction

Backend `a310fae3e` corrects only the synthetic verification adapter. The actual organization controller uses `memberId` as a user ID; the adapter previously coerced it to a numeric organization-membership ID. Four legitimate synthetic UUID update/delete/suspend/reactivate cases failed, and a missing route parameter incorrectly passed the adapter in the new RED tests. The corrected adapter requires the exact route's scalar user ID, checks its reserved synthetic email, and retains numeric membership lookup for module-grant routes. Missing, mismatched, array, unknown and normal-user targets refuse. Existing actor/organization checks and the application's real guards remain in place.

Independent review passed. Four focused suites passed 166 tests; scoped ESLint passed with zero warnings; the two-file test TypeScript check passed. An earlier broader TypeScript run caught a new test-table inference issue, which was corrected, and in-progress assignment-authority errors owned by the parallel workstream; it was not represented as passing. The existing process 15616 was left running on its prior source. No organization suspension/reactivation or browser proof is claimed from these source checks; its next reviewed restart and a genuine synthetic second member are still required.

### Bounded personal-token verification adapter

Backend `1834d98c1` permits the real `/me/api-tokens` create/revoke endpoints through the synthetic runner after reserved actor and organization checks. Creation requires a reserved verification name, 1–100 unique Build-only scopes, and an explicit ISO expiry in the next hour. Revocation requires the exact scalar route ID; the real controller and service still enforce permission and token ownership. Background workers and external providers remain disabled. No JWT signing, credential import, browser session transfer or frontend URL change was added.

Two positive adapter cases failed before the change; four suites then passed 180 tests, zero-warning scoped ESLint and the two-file test TypeScript check passed. Independent review was clear. This is adapter evidence only: no personal token had been created at this source checkpoint. Subsequent real probes must retain raw tokens only in process memory, use the original human session for revocation, and record cleanup separately from authorization results.

## Delivery checklist

### Tracking scope reconciliation

The original implementation index contained 50 checked and 392 open items. Ten subsequently added evidence reports had not yet been indexed because they lacked the required Delivery heading. Adding that documentary heading and regenerating the index includes their existing 44 checked evidence-capture items and 19 open follow-up items: 94 checked and 411 open across 70 current documents. This reconciles tracking scope; it does not close any of the original 392 implementation items. Evidence-capture checks do not certify product acceptance, and overlapping release obligations remain tied to the canonical requirement IDs.

- [x] Record the named evidence, its source or runtime scope, and the remaining verification limits in this report.

Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
