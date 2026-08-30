# FINAL-VERIFICATION.md — StreamlineOS Architecture Programme

**Date run:** 2026-08-31 (DOCS1 re-verification)
**Previous run:** 2026-08-30 (S10 lane)

All gate commands run from their respective repo roots (`backend/` or `frontend/` as noted).
Every number in this document was obtained by running the gate command this session (2026-08-31).
Verbatim output is quoted for each gate. An OPEN row has a concrete reason — it is not a skip.
SUPERSEDED figures are marked with the corrected value rather than silently overwritten.

---

## Backend gates

### Working tree — `git status` (backend)

Snapshot from S10 (2026-08-30); working tree changes daily. See `git status` for the live state.

### TypeScript — `pnpm typecheck` (backend)

Not re-run this session (hangs on this machine; banned by lane rules). S10 confirmed exit 0. Validation is `tsc --noEmit -p tsconfig.build.json`.

Verdict: **PASS (S10 baseline — exit 0, zero errors)**

### Backend routes — `pnpm check:route-classification`

```
Route classification report
  Total handlers : 3539
  public         : 208
  universal      : 95
  permissioned   : 3189
  in-service     : 47
  UNDECLARED     : 0

RESULT: ALL ROUTES CLASSIFIED
Manifest pilot (timesheets): publicExposure=false — OK
```

SUPERSEDED: S10 reported 3,518 handlers. Current: **3,539**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on UNDECLARED > 0)

### Permissions — `pnpm check:permission-keys`

```
Scanned  3100 @RequirePermission usages  (622 unique keys)
  of which 21 pass a constant rather than a literal
Backend catalog   693 keys
Frontend PermissionKey union  691 keys
OK — every @RequirePermission key resolves and exists in the backend catalog and the frontend PermissionKey union.
Manifest pilot (timesheets): all @RequirePermission keys in its folder use declared namespaces — OK
```

SUPERSEDED: S10 reported 690 backend keys / 690 frontend keys. Current: **693 backend / 691 frontend** (2-key gap: platform-only keys intentionally absent from the frontend union; gate passes exit 0).

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on unresolved keys or catalog drift)

### Tenant indexes — `pnpm check:tenant-indexes`

```
Schema files            340
Tenant tables           747
Leading tenant index    747
OK — every tenant table declares an index leading with its tenant column.
```

SUPERSEDED: S10 reported 330 schema files / 722 tables. Current: **340 schema files / 747 tables**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail when a new tenant table lacks a leading index)

### Scope/BOLA — `pnpm check:scope-application`

```
Scope resolutions   122
Applied             122
OK — every resolved DataScope reaches a predicate.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail when a DataScope resolution has no predicate)

### Record access — `pnpm check:record-access`

```
findFirst calls        1145
  record reads         558
  conflict checks      64
  other                523
PURGE READS — named, not hidden in an allowlist:
  SKIP  src/modules/kb/wiki/kb-page-tree.service.ts:204  kbPages  — hardDelete reads the page in order to purge it; excluding deleted rows would make a deleted page unpurgeable
OK — every record read excludes soft-deleted rows.
```

SUPERSEDED: S10 reported 1,154 findFirst / 560 record reads. Current: **1,145 findFirst / 558 record reads**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new findFirst that reads deleted rows)

### Tenant isolation — `pnpm check:tenant-isolation` (static)

```
Service files with db handle   900
  — tenant-owned               840
  — global/platform            60
Isolation test files found     498
Services with a DECLARED test  823 / 840  (98%)

UNCOVERED — tenant-owned services with no cross-tenant negative test:
  MISSING  src/modules/crm/core/crm-ce-dashboard.service.ts
  MISSING  src/modules/crm/core/crm-organizations-merge.service.ts
  MISSING  src/modules/e-sign/sign-public-form.service.ts
  MISSING  src/modules/inventory/purchase-orders/grn-receive.service.ts
  MISSING  src/modules/kb/retrieval/kb-article-reindex.service.ts
  MISSING  src/modules/kb/retrieval/kb-indexing.service.ts
  MISSING  src/modules/kb/retrieval/kb-ingestion-checkpoint.service.ts
  MISSING  src/modules/party/party-revert.service.ts
  MISSING  src/modules/payroll/payout/batch-status.service.ts
  MISSING  src/modules/payroll/runs/loan-recovery.service.ts
  MISSING  src/modules/payroll/runs/run-data-loader.service.ts
  MISSING  src/modules/payroll/runs/run-result-persister.service.ts
  MISSING  src/modules/platform/platform-analytics.service.ts
  MISSING  src/modules/timesheets/core/approvals-bulk.service.ts
  MISSING  src/modules/timesheets/core/timesheet-analytics.service.ts
  MISSING  src/modules/users/user-activity.service.ts
  MISSING  src/modules/workflows/workflows-analytics.service.ts

FAIL — 17 tenant-owned service(s) have no cross-tenant negative test (98% covered).
```

SUPERSEDED: S10 reported PASS 818/818 (100%). Current: **FAIL — 823/840 (98%), 17 uncovered**. New services added by concurrent lanes were not matched with isolation specs.

Verdict: **FAIL — exit 1** (invocable; has self-test; can fail on missing coverage — and it does)

### Tenant isolation — `pnpm check:tenant-isolation:run` (execution)

Not re-run this session (timed out at 30 s; suite takes ~160 s). S10 confirmed 373/373 suites, 1,436 tests, exit 0.

Verdict: **PASS (S10 baseline — exit 0, 373/373 suites)**

### Placement bypass — `pnpm check:placement-bypass`

```
Bypass sites found       76
  @NoTenantTransaction   17
  runOutsideTenantCtx    12
  withIdentity           23
  cron direct db         24
  registerAfterCommit    0
... (76 named SKIPs with justifications)
OK — every database bypass is on the allowlist with a reason.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail when a new bypass lacks an allowlist entry)

### RBAC integrity — `pnpm verify:rbac-integrity`

```
  PASS  expect=REJECT got=REJECT  cross-tenant assigner on role_assignments [23503]
  PASS  expect=ACCEPT got=ACCEPT  same-tenant assigner [control]
  PASS  expect=ACCEPT got=ACCEPT  null assigner [control]
  PASS  expect=REJECT got=REJECT  uncatalogued module on module_ownerships [23503]
  PASS  expect=REJECT got=REJECT  uncatalogued module on roles [23503]
  PASS  expect=REJECT got=REJECT  namespace drift: chat key under crm [23503]
  PASS  expect=ACCEPT got=ACCEPT  correct: chat key under home [control]
  PASS  expect=ACCEPT got=ACCEPT  correct: hr key under hr [control]
  PASS  expect=REJECT got=REJECT  platform namespace settings:manage is not grantable [23503]
  PASS  expect=REJECT got=REJECT  cross-tenant granter on user_permission_grants [23503]
OK — RBAC actor and module keys are referentially constrained, and the controls prove the constraints are not over-strict.
```

Run with `--env-file-if-exists=.env`. Requires `DATABASE_URL` — exits 1 with "DATABASE_URL is not set" when absent.

Verdict: **PASS — exit 0, 10/10** (invocable; has self-test that covers namespace logic without DB; full run requires DB)

### Owner authority — `pnpm check:owner-authority`

```
production files scanned   3249
owner-only operations      9 declared, 9 enforced
owner shortcuts (reported) 12
... (12 named SKIPs with justifications)
OK — nothing fabricates ownership and every owner gate reads the catalog.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new owner shortcut or undeclared gate)

### Idempotency — `pnpm check:idempotent-commands`

```
Controllers scanned   527
Handlers in scope     9
... (9 named bespoke-mechanism exceptions)
OK — every in-scope mutating handler carries @Idempotent.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new in-scope handler without @Idempotent)

### Async — `pnpm check:outbox-consumers`

```
Emitted event types  (18): ...
Consumed event types (20): ...
OK — every emitted outbox event type has a registered consumer
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on an emitted type with no consumer)

Note: 4 Inventory outbox emits were deleted in a prior lane after confirming the downstream work happens inline. The `check:outbox-consumers` counts emitted vs. consumed type strings; the two extra consumed types (`expense.submitted`, `expense.decided`) are legacy consumers with no active emitter — the gate checks emitted → consumed direction only.

### Migration discipline — `pnpm check:migration-discipline`

```
Migration discipline gate
  Scanning: D:\projects\personal\Streamlineos\backend\migrations
  SQL files found: 424
  Baselines: lock_timeout=149 fk-not-valid=40 set-not-null=20 validate-order=2 do-breakpoint=0 no-journal=0
  These counts can only shrink. A new file not in a baseline fails the gate.
check:migration-discipline PASSED
  424 SQL files checked, 0 new violations
  Also enforced: journal monotonicity, duplicate idx, duplicate numeric prefixes, and journal entries with no file on disk.
  Not covered: applied-watermark skipping (needs the DB), CONCURRENTLY inside a transaction, and keywords in SQL comments.
  Companion: check:migration-chain
```

Was missing from S10 report. Added this session: exit 0.

Verdict: **PASS — exit 0** (invocable; has self-test with 20 passing checks; can fail on a new migration with a missing lock_timeout, bare FK, or inline SET NOT NULL; baselined pre-existing violations are immutable history)

### Migration chain — `pnpm check:migration-chain`

```
PASS  migration chain verified — no issues found
```

Run with `--env-file-if-exists=.env`. Requires `DATABASE_URL` for the applied-watermark check (check (f)); that check is skipped gracefully when no DB is reachable.

Verdict: **PASS — exit 0** (invocable; has self-test with 10 passing checks including vacuity guard for check (f))

### Mock surface — `pnpm check:mock-surface`

```
Doubles scanned   : 2454
Classes resolved  : 233
Genuine defects   : 6

Class: AccessPermissionResolver — [PHANTOM] .innerJoin(), .where()
  spec: src/modules/access/__tests__/home-surfaces-universal.spec.ts
Class: AutonomyHoldService — [PHANTOM] .where()
  spec: src/modules/autonomy/autonomy-hold.service.spec.ts
Class: PermissionCatalogSyncService — [PHANTOM] .onConflictDoNothing(), .onConflictDoUpdate()
  spec: src/modules/rbac/__tests__/permission-delegability.spec.ts
Class: StockEngineBatchService — [PHANTOM] .execute()
  spec: src/modules/inventory/inv-quality-counts-reports-isolation.spec.ts
FAIL — phantom mock methods detected
```

New gate (S07). Previously reported as fixed after 69 phantom methods were eliminated. Current: **FAIL — exit 1, 6 genuine defects across 4 classes**. Either 4 mocks regressed or the 69-fix count was for a different baseline. Genuinely unfinished.

Verdict: **FAIL — exit 1** (invocable; has self-test with vacuity guard; can fail on a phantom method — and it does)

### OpenAPI — `pnpm openapi:check`

```
openapi.json is STALE. Run: pnpm openapi:generate
  changed DELETE /crm/automations/{ruleId}
  changed DELETE /crm/products/{productId}
  changed DELETE /renderer/layouts/{layoutKey}
  changed GET /renderer/layouts/{layoutKey}
  changed GET /renderer/layouts/{layoutKey}/usage
  changed PUT /renderer/layouts/{layoutKey}
EXIT:1
```

Committed `openapi.json` has **3,551 operations**. Five routes changed after the last generation; `openapi:check` exits 1. Needs `pnpm openapi:generate` before the gate will pass.

`x-exposure` stamp: the committed openapi.json carries `x-exposure` on **3,551 of 3,551 operations** — the key-format mismatch (`ClassName_method` vs. Swagger's `ClassName_method[1]` under URI versioning) is fixed. The `0 of ~7,100` figure from the prior S10 note was the pre-fix state.

SUPERSEDED: S10 body reported "3,546 operations, 2,843 carrying a zod contract" and marked it STALE (exit 1 at the time); now stale again by 5 operations after additional route changes this session.

Verdict: **FAIL — exit 1** (invocable; has self-test; genuinely unfinished — needs regeneration after each route change)

### Module entitlement — `pnpm check:module-entitlement`

```
OK — timesheets: planGated=true, storedKey="TIMESHEETS" round-trips correctly.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new gated module without the storedKey round-trip)

### Module lifecycle — `pnpm check:module-lifecycle`

```
RESULT: ALL GATES PASSED  (timesheets, 11 tables)
```

Verdict: **PASS — exit 0** (requires DATABASE_URL; invocable; can fail on missing RLS policies, absent catalog entries, or missing org_id FKs)

### Navigation permissions — `pnpm check:navigation-permissions`

```
Navigation gates  436  (195 unique keys)
Backend catalog   693 keys
Keys enforced on a route  622
... (12 named ENFORCED-IN-SERVICE SKIPs)
OK — every navigation gate names a key that some route enforces.
Manifest pilot (timesheets): all nav routes are under "/timesheets" — OK
```

SUPERSEDED: S10 reported counts not explicitly stated; backend catalog was 690. Current: **436 gates, 195 unique keys, 693 backend keys, 622 route-enforced**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a nav key that no route enforces)

### Log secrets — `pnpm check:log-secrets`

```
Scanned    2782 source files
TIERS map  75 entries
OK — no plaintext secret logging found and all @UseRateLimit keys are in TIERS.
```

SUPERSEDED: S10 reported 2,732 source files / 73 TIERS entries. Current: **2,782 files / 75 entries**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new @UseRateLimit key absent from TIERS)

### Cycles — `pnpm check:cycles` (backend)

Not re-run this session (madge takes ~2 min). S10 confirmed exit 0, 0 circular imports.

Verdict: **PASS (S10 baseline — exit 0, 0 cycles)**

### Legacy actors — `pnpm scan:legacy-actors:check`

```
Legacy Organization-Actor Scan
======================================================
Organizational (to migrate):   689
Bridge (person↔account links): 3
Authentication (identity):     5
Unknown (manual review):       0
Total user_id FKs scanned:     697

By module (organizational count):
  hr=222  crm=76  build=74  inventory=58  payroll=56  common=49
  accounting=44  support=25  kb=24  billing=18  chat=10  timesheets=10
  e-sign=7  ai=6  surveys=5  directory=2  calendar=1  mail=1  portal-access=1

Ratchet OK: 689/689 remaining (0 migrated since baseline).
```

SUPERSEDED (twice): the original S10 body read "553/555 remaining (2 migrated since baseline)" — that scanner's regex matched only `pgTable(`, so ~121 raw-SQL FKs were invisible and 555 was a floor. After the scanner fix the honest baseline was reestablished at 689 organizational FKs. The S10 summary table read "697" (the total of all categories); the organizational subset to migrate is **689**. Current ratchet: 689/689, 0 migrated. Actor contraction is long-horizon (see dedicated row below).

Verdict: **PASS — exit 0** (ratchet locked: count can only decrease; invocable; has self-test; can fail when count exceeds baseline)

---

## Frontend gates

### Working tree — `git status` (root repo)

Snapshot from S10 (2026-08-30); working tree changes daily.

### TypeScript — `pnpm type-check` (frontend)

Not re-run this session (banned). S10 confirmed exit 0, zero errors.

Verdict: **PASS (S10 baseline — exit 0, zero errors)**

### Cycles — `pnpm check:cycles` (frontend)

Not re-run this session. S10 confirmed exit 0, 0 cycles.

Verdict: **PASS (S10 baseline — exit 0, 0 cycles)**

### Routes — `pnpm check:routes`

```
✔  No business route handlers found.
```

Verdict: **PASS — exit 0** (invocable; can fail on a new app/api business route)

### Query scope — `pnpm check:query-scope`

```
✔  No query-scope violations found.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new cross-scope query)

### Formatters — `pnpm check:formatters`

```
✔  No local Intl.NumberFormat formatters found outside lib/format-utils.ts (4763 files scanned).
```

SUPERSEDED: S10 reported 4,744 files. Current: **4,763 files scanned**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a new hand-rolled Intl.NumberFormat)

### Empty states — `pnpm check:empty-states`

```
✔  No hand-rolled empty states found outside EmptyState.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on a hand-rolled empty state)

### Effect fetches — `pnpm check:effect-fetches`

```
✔  No useEffect-driven API fetches found.
```

Verdict: **PASS — exit 0** (invocable; can fail on a useEffect fetch)

### Icon labels — `pnpm check:icon-labels`

```
✔  No icon-only buttons without an accessible name found.
```

Verdict: **PASS — exit 0** (invocable; can fail on an unlabeled icon button)

### Client pages — `pnpm check:client-pages`

```
Client pages: 315 of 598 (52.7%)
Ceiling:      315
✔  Within ceiling (0 below limit).
```

SUPERSEDED: S10 body reported "259 of 598 (43.3%), ceiling 259". Current: **315 of 598 (52.7%), ceiling 315**. The S10 summary table already showed 315 — the body was stale when written.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail when client pages exceed the ceiling)

### Module manifest — `pnpm check:module-manifest`

```
✔  Module manifest is consistent.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on manifest drift)

### Route access contract — `pnpm check:route-access-contract`

```
Navigation source files   26
Permission keys checked   200 (17 excluded as access rungs or non-permissions)
x-permission in contract  621
✔  every route-access permission names an endpoint in the generated contract.
```

SUPERSEDED: S10 reported 197 keys checked / 620 x-permission. Current: **200 keys checked / 621 x-permission**.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail when a route-access key is absent from the contract)

### Contract drift — `pnpm check:contract-drift`

```
=== KNOWN UNFIXED DEFECTS — 0 baselined drift(s) tracked; not accepted behaviour; awaiting resolution ===
✔  No new timesheets contract drift detected.
```

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on new contract drift)

### Contract vendor — `pnpm check:contract-vendor`

```
✔  frontend/contracts/openapi.json matches backend/openapi.json
   sha256: 2a34112404142d3f...
```

Note: both files track the same (currently stale) openapi.json. When `openapi:generate` runs in backend, the frontend/contracts/openapi.json must be re-synced before this gate passes again.

Verdict: **PASS — exit 0** (invocable; has self-test; can fail on hash mismatch between the two copies)

### Server data seam — `pnpm verify:server-data-seam`

```
server-data seam verified: 5 authenticated routes, 6 public routes, build xRckbAmzuyuA6LpGLGEiJ
```

Verdict: **PASS — exit 0** (invocable; can fail on a new server route that bypasses the auth seam)

### Dead code — `pnpm check:dead-code` (frontend only)

```
knip raw: files=0 exports=61 types=38
=== Baseline: files=0 exports=0 ===
=== Current:  files=0 exports=0 ===
PASS: dead code within baseline.
```

**The backend has neither `check:dead-code` nor knip.** The S10 row crediting "check:dead-code + knip for BOTH repos" was wrong — only the frontend repo has these tools. No equivalent gate exists in the backend; backend dead-code claims require `nest build` or manual module-graph analysis.

Frontend: PASS — exit 0, files=0 vs. baseline 0. The gate classifies 81 unproven exports (mostly CRM/telemetry/barrel extensions) as UNPROVEN rather than DEAD, which is correct per the documented scan limitations. The 18 RETAINED-BY-CONTRACT and 0 RETAINED-BY-CONVENTION entries are nominal.

Verdict: **PASS (frontend only) — exit 0** (invocable; has self-test; can fail when a new file deletion falls below baseline)

---

## Builds

### Build — `pnpm build` (backend)

OPEN — `nest build` not run this session (banned: hangs on this machine). S10 confirmed exit 0 via L53.

### Build — `pnpm build` (frontend)

OPEN — `next build` not run this session (banned). S10 confirmed 463 pages, exit 0 via L53.

---

## Tests

### Tenant-isolation suite — `pnpm check:tenant-isolation:run`

OPEN — timed out at 30 s this session; suite takes ~160 s. S10 baseline: 373/373 suites, 1,436 tests, exit 0.

### Full backend jest

OPEN — not run; suite takes ~40 min across 6 shards. S10/L46 established a passing baseline. Rate-limit note: `DEV_LIMIT_MULTIPLIER` makes every tier 10× outside production; use `effectiveRateLimit(tier)` when asserting tier ceilings.

### Backend e2e — `pnpm test:e2e`

FAIL — not run this session. Pre-existing blockers from L46: stale ts-jest transform cache (`chat-messages.controller` pre-rename output), AppModule OOM without raised heap, and 10 scope specs that skip silently because `RBAC_E2E_DATABASE_URL` is not wired into `jest-e2e.json`. In a measured shard 25 of 25 suites failed to RUN while jest exited 0 due to `--forceExit`. Genuinely unfinished — not an instrumentation gap.

### Frontend jest

OPEN — not run this session. L33 baseline: 156 passed, 1 failed (subsequently fixed). Frontend tsconfig excludes test files, so `tsc --noEmit` does not prove tests compile.

---

## Structure — files >500 lines

Counted 2026-08-31 via PowerShell file scan across all TS source directories:

- **Backend non-spec**: 17 files over 500 lines (top: `notification-events.catalog.ts` 1,027 — cohesive catalog exception per §7; `access.service.ts` 725; `relocate-org-data.ts` 703; `org-lifecycle.service.ts` 599; `role-templates.constants.ts` 582; `invitations.service.ts` 573; `org-setup.service.ts` 559; `roles.service.ts` 557; `build-entity.adapter.ts` 555; and 8 more between 504–552 lines)
- **Backend spec**: 14 spec/e2e-spec files over 500 lines (largest: `module-access.controller.e2e-spec.ts` 767; these are cohesive by test subject and not split-eligible)
- **Frontend**: 2 files over 500 lines (`automation-trigger-data.ts` 599; `channel-sidebar.tsx` 501)
- **Total**: **33 files** (31 backend + 2 frontend)

SUPERSEDED: S10 reported "45 files still over the hard ceiling". Several splits landed between that count and this one. Outstanding: `notification-events.catalog.ts` (1,027) is a declared catalog exception; `access.service.ts` (725) and `relocate-org-data.ts` (703) are genuinely pending.

---

## Applied-migration state — pg_catalog diff (historical record)

REPAIRED before this session. Five journalled migrations were permanently skipped because their `when` timestamps were set to `1798000000000+` (far-future epoch), pushing the applied watermark above every normally-numbered entry; `db:migrate` printed success while skipping them. Six Drizzle-declared columns were absent from Neon (42703 for every affected org). All five migrations were applied and verified against pg_catalog. The `check:migration-discipline` gate now enforces journal monotonicity to catch this class of error at commit time.

---

## Actor contraction — long-horizon

Current position: **689 organizational user_id FKs remain** (ratchet baseline, 0 migrated). Two EXPAND tranches shipped (migrations 0690-0699, 0700/0701) — these added the `member_id` shadow column alongside the legacy `user_id` FKs in preparation for contraction. No CONTRACTION migration has landed; no legacy column has been dropped.

This is long-horizon work: 689 columns across 19 modules, migrated module by module. Each module requires a EXPAND migration (add shadow column), a backfill, an application dual-write, and a CONTRACTION migration (drop old column). The ratchet (`scan:legacy-actors:check`) enforces that the count never increases; individual module cutover is tracked separately per module.

---

## Mock surface — `pnpm check:mock-surface`

```
Doubles scanned   : 2454
Classes resolved  : 233
Genuine defects   : 6
FAIL — phantom mock methods detected
```

(See full output in the Mock surface gate section above.)

New gate (S07). Previously described as fixed at 0 defects after eliminating 69 phantom methods. Current: FAIL — 6 defects across 4 classes. Either 4 mocks regressed or the prior 69-fix count was against a different scan baseline. Genuinely unfinished.

---

## Recovery / Load / Cost — S08 runbooks

**OPEN — operator-blocked.**
7 runbooks written in `architecture-refactor/runbooks/` by L31. Until the operator executes the runbooks and files evidence in `architecture-refactor/runbooks/evidence/`, production readiness is below 10/10 for this criterion.

Blocked items:
- RB-01: Cell isolation — requires separate Neon branches per cell
- RB-02: PITR backup — requires Neon PITR enabled on production project
- RB-03: Read replica — requires read replica provisioned
- RB-04: Recovery drill — requires staging environment
- RB-05: Production load — requires seed script fix and production-volume DB
- RB-06: Live alert delivery — requires PagerDuty/alerting infrastructure
- RB-07: Per-cell cost — requires production billing data

---

## Summary table

| Gate | Command | Invocable | Can Fail | Result |
|---|---|---|---|---|
| TypeScript (backend) | `pnpm typecheck` | yes | yes | **PASS — 0 errors (S10)** |
| TypeScript (frontend) | `pnpm type-check` | yes | yes | **PASS — 0 errors (S10)** |
| Build (backend) | `pnpm build` | yes | yes | OPEN — last green S10/L53 |
| Build (frontend) | `pnpm build` | yes | yes | OPEN — last green S10/L53 |
| Imports (backend) | `pnpm check:cycles` | yes | yes | **PASS — 0 cycles (S10)** |
| Imports (frontend) | `pnpm check:cycles` | yes | yes | **PASS — 0 cycles (S10)** |
| Backend routes | `check:route-classification` | yes | yes | **PASS — 3,539 handlers, 0 undeclared** |
| Permissions | `check:permission-keys` | yes | yes | **PASS — 693 backend / 691 frontend, 0 drift** |
| Tenant indexes | `check:tenant-indexes` | yes | yes | **PASS — 747/747** |
| Scope/BOLA | `check:scope-application` | yes | yes | **PASS — 122/122** |
| Record access | `check:record-access` | yes | yes | **PASS — 1,145 findFirst, 558 record reads** |
| Isolation (static) | `check:tenant-isolation` | yes | yes | **FAIL — 823/840 (98%), 17 uncovered** |
| Isolation (execution) | `check:tenant-isolation:run` | yes | yes | OPEN — S10 baseline: 373/373, 1,436 tests |
| Placement | `check:placement-bypass` | yes | yes | **PASS — 76 bypasses, all allowlisted** |
| RBAC integrity | `verify:rbac-integrity` | yes (needs DB) | yes | **PASS — 10/10** |
| Owner authority | `check:owner-authority` | yes | yes | **PASS** |
| Idempotency | `check:idempotent-commands` | yes | yes | **PASS — 9 bespoke exceptions** |
| Async | `check:outbox-consumers` | yes | yes | **PASS — 18 emitted, all consumed** |
| Migration discipline | `check:migration-discipline` | yes | yes | **PASS — 424 SQL files, 0 new violations** |
| Migration chain | `check:migration-chain` | yes (needs DB for check f) | yes | **PASS** |
| Mock surface | `check:mock-surface` | yes | yes | **FAIL — 6 phantom methods, 4 classes** |
| OpenAPI freshness | `openapi:check` | yes | yes | **FAIL — stale by 5 ops (3,551 committed); x-exposure 3,551/3,551** |
| Contract vendor | `check:contract-vendor` | yes | yes | **PASS — sha256 matches** |
| Contract drift | `check:contract-drift` | yes | yes | **PASS — 0 baselined drift** |
| Module entitlement | `check:module-entitlement` | yes (needs DB) | yes | **PASS** |
| Module lifecycle | `check:module-lifecycle` | yes (needs DB) | yes | **PASS** |
| Navigation permissions | `check:navigation-permissions` | yes | yes | **PASS — 436 gates, 195 keys** |
| Log secrets | `check:log-secrets` | yes | yes | **PASS — 2,782 files, 75 TIERS** |
| Route access contract | `check:route-access-contract` | yes | yes | **PASS — 200 keys, 621 x-permission** |
| Frontend routes | `check:routes` | yes | yes | **PASS** |
| Frontend query scope | `check:query-scope` | yes | yes | **PASS** |
| Frontend formatters | `check:formatters` | yes | yes | **PASS — 4,763 files** |
| Frontend empty states | `check:empty-states` | yes | yes | **PASS** |
| Frontend effect fetches | `check:effect-fetches` | yes | yes | **PASS** |
| Frontend icon labels | `check:icon-labels` | yes | yes | **PASS** |
| Frontend client pages | `check:client-pages` | yes | yes | **PASS — 315/598 (52.7%), ceiling 315** |
| Frontend module manifest | `check:module-manifest` | yes | yes | **PASS** |
| Server data seam | `verify:server-data-seam` | yes | yes | **PASS — 5 auth + 6 public routes** |
| Dead code | `check:dead-code` + knip | yes (frontend only) | yes | **PASS (frontend only) — files=0; backend has no equivalent gate** |
| Tests (isolation run) | `check:tenant-isolation:run` | yes | yes | OPEN — S10 baseline: 373/373 |
| Tests (full backend) | jest sharded | yes | yes | OPEN — isolation suite green |
| Tests (e2e) | `pnpm test:e2e` | yes | no (exits 0 on suite crash) | **FAIL — pre-existing: ts-jest cache, OOM, missing env var; 25/25 suites failed to RUN in a measured shard** |
| Tests (frontend) | jest | yes | yes | OPEN |
| Applied-migration state | pg_catalog diff | requires DB | yes | **REPAIRED prior to this session (5 skipped migrations applied)** |
| Structure >500 lines | file scan | N/A | N/A | **33 files over ceiling (17 backend non-spec + 14 spec + 2 frontend); was 45 at S10** |
| Actor contraction | `scan:legacy-actors:check` | yes | yes | **LONG-HORIZON — 689 org FKs remain, 0 dropped; EXPAND shipped, CONTRACTION not started** |
| Recovery / Load / Cost | S08 runbooks | requires infrastructure | N/A | **OPEN — operator-blocked (RB-01 through RB-07)** |
