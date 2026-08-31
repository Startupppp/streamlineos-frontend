# RLS2 — Tenant Isolation for `mail_sync_checkpoints` and `payroll_run_export_jobs`

## Per-method tenant-context audit (BEFORE)

### `mail_sync_checkpoints` — `MailSyncCheckpointService`

| Method | Caller | Had tenant context? | Notes |
|---|---|---|---|
| `loadPosition(orgId, accountId, folder)` | Mail sync background worker | **NO** | Raw `this.db.select()` with no transaction; GUC absent → 42501 once RLS enabled |
| `savePosition(orgId, accountId, folder, cursorValue)` | Mail sync background worker | YES | Already used `runInNewTenantTransaction` |
| `clearPositions(tx, orgId, accountId)` | Caller-provided `TenantTx` | YES | Accepts `TenantTx` parameter |

### `payroll_run_export_jobs` — `PayrollRunExportService`

| Method | Caller | Had tenant context? | Notes |
|---|---|---|---|
| `create(user, filters, idempotencyKey)` | Controller (request-path) | **NO** | Raw `this.db.insert()` + `this.db.select()` |
| `get(user, id)` → `find()` | Controller (request-path) | **NO** | Raw `this.db.select()` in private `find` |
| `download(user, id)` → `find()` | Controller (request-path) | **NO** | Same |
| `claim(orgId)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.select()` + `this.db.update()` |
| `rows(job, afterId)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.select()` |
| `progress(id, processedRows)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.update()`, no orgId param |
| `complete(id, fileKey, fileName, size, count)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.update()`, no orgId param |
| `fail(job, error)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.update()` |
| `reclaim(orgId, staleBefore)` | `PayrollRunExportWorkerService` (background) | **NO** | Raw `this.db.update()` |

## Per-method tenant-context audit (AFTER)

### `MailSyncCheckpointService`

| Method | Change |
|---|---|
| `loadPosition` | Wrapped body in `runInNewTenantTransaction(this.db, orgId, async (tx) => { tx.select(...) })` |
| `savePosition` | Unchanged (already used `runInNewTenantTransaction`) |
| `clearPositions` | Unchanged (already took `TenantTx`) |

### `PayrollRunExportService`

| Method | Change |
|---|---|
| `create` | Body wrapped in `runInTenantTransaction(this.db, fn, { orgId: user.orgId })` — insert + fallback select inside |
| `find` (private) | Body wrapped in `runInTenantTransaction(this.db, fn, { orgId: user.orgId })` |
| `claim(orgId)` | Body wrapped in `runInNewTenantTransaction(this.db, orgId, fn)` — both select and update inside single tx |
| `rows(job, afterId)` | Body wrapped in `runInNewTenantTransaction(this.db, job.orgId, fn)` |
| `progress(id, processedRows, orgId)` | Added `orgId` param; body wrapped in `runInNewTenantTransaction` |
| `complete(id, …, orgId)` | Added `orgId` param; body wrapped in `runInNewTenantTransaction` |
| `fail(job, error)` | Body wrapped in `runInNewTenantTransaction(this.db, job.orgId, fn)` |
| `reclaim(orgId, staleBefore)` | Body wrapped in `runInNewTenantTransaction(this.db, orgId, fn)` |

`PayrollRunExportWorkerService.process(job)` updated to pass `job.orgId` to `progress` and `complete`.

## Claimer decision and justification

`claim(orgId)` is NOT a cross-tenant operation. It is called from `forEachOrg` in `PayrollRunExportWorkerService.tick()`, which iterates orgs one at a time and passes the orgId. The claim selects the first pending job for that specific org, then updates it to running — both operations are org-scoped. Wrapping both in a single `runInNewTenantTransaction(this.db, orgId, ...)` is correct: the GUC is set, RLS allows only that org's rows, and the optimistic lock (UPDATE WHERE status = 'pending') is atomic inside the transaction.

This is NOT the cross-tenant scenario described in the task instructions ("a claimer that must pick jobs from ANY org without knowing which one"). The `forEachOrg` boundary already provides the orgId before `claim` is invoked. Therefore `payroll_run_export_jobs` is protected by a standard `tenant_isolation` policy and does **not** need to join the `PLATFORM_GLOBAL_TABLES` exemption list.

## Index findings

### `mail_sync_checkpoints` (BEFORE migration 0723)

| Index | Columns | Includes org_id? |
|---|---|---|
| `mail_sync_checkpoints_pkey` | `(id)` | No |
| `uniq_mail_sync_checkpoint_account_folder` | `(account_id, folder)` | **No — unusable under RLS for `loadPosition` query** |
| `uniq_mail_sync_checkpoint_org_id` | `(org_id, id)` | Yes — but does not cover `loadPosition` predicate `(org_id, account_id, folder)` |

Migration 0723 added: `idx_mail_sync_checkpoints_org_account_folder` on `(org_id, account_id, folder)`.

### `payroll_run_export_jobs` (already correct, no index changes needed)

| Index | Columns | Covers which query |
|---|---|---|
| `uniq_payroll_run_export_jobs_org_idempotency` | `(org_id, idempotency_key)` | `create` conflict target |
| `idx_payroll_run_export_jobs_org_status_created` | `(org_id, status, created_at)` | `claim` SELECT |
| `idx_payroll_run_export_jobs_org_requester_created` | `(org_id, requested_by_membership_id, created_at)` | `find` query |
| `payroll_run_export_jobs_pkey` | `(id)` | PK lookups for UPDATE in `progress`, `complete`, `fail` |

All `payroll_run_export_jobs` indexes already led with `org_id`. No index changes required.

## Migrations written and applied

### Migration 0723 — `0723_mail_checkpoint_org_index.sql` (idx 545, when 1798000045000)

```sql
SET lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS idx_mail_sync_checkpoints_org_account_folder ON public.mail_sync_checkpoints (org_id, account_id, folder);
```

Applied output:
```
applying 0723_mail_checkpoint_org_index: 1 statement(s)
  OK   [1/1] SET lock_timeout = '5s';
RECORDED 0723_mail_checkpoint_org_index at created_at=1798000045000
```

### Migration 0724 — `0724_rls_mail_checkpoints_payroll_export.sql` (idx 546, when 1798000046000)

```sql
SET lock_timeout = '5s';
ALTER TABLE public.mail_sync_checkpoints ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.mail_sync_checkpoints FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
--> statement-breakpoint
ALTER TABLE public.payroll_run_export_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.payroll_run_export_jobs FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());
```

Applied output:
```
applying 0724_rls_mail_checkpoints_payroll_export: 4 statement(s)
  OK   [1/4] SET lock_timeout = '5s'; (plus ALTER TABLE mail_sync_checkpoints ENABLE ROW LEVEL SECURITY)
  OK   [2/4] CREATE POLICY tenant_isolation ON public.mail_sync_checkpoints ...
  OK   [3/4] ALTER TABLE public.payroll_run_export_jobs ENABLE ROW LEVEL SECURITY;
  OK   [4/4] CREATE POLICY tenant_isolation ON public.payroll_run_export_jobs ...
RECORDED 0724_rls_mail_checkpoints_payroll_export at created_at=1798000046000
```

## pg_catalog state AFTER migrations

```
relname                    | relrowsecurity | relforcerowsecurity
---------------------------+----------------+--------------------
mail_sync_checkpoints      | true           | false
payroll_run_export_jobs    | true           | false

Policies:
tablename                  | policyname         | cmd | qual                           | with_check
---------------------------+--------------------+-----+--------------------------------+-------------------------------
mail_sync_checkpoints      | tenant_isolation   | ALL | (org_id = current_org_id())    | (org_id = current_org_id())
payroll_run_export_jobs    | tenant_isolation   | ALL | (org_id = current_org_id())    | (org_id = current_org_id())
```

## Live isolation proof — pasted output as `streamline_app`

### mail_sync_checkpoints

```
Inserted test rows as owner (BYPASSRLS) for org c5b82e53-e69e-4937-ace8-1126ae3c0c7f and ed6e823a-2543-4696-9d75-6876741f6fd4
Test 1 (streamline_app with org A GUC) - sees 1 row(s): [ 'c5b82e53-e69e-4937-ace8-1126ae3c0c7f' ]
ISOLATION CHECK 1 (org A only): PASS
Test 2 (streamline_app with org B GUC) - sees 1 row(s): [ 'ed6e823a-2543-4696-9d75-6876741f6fd4' ]
ISOLATION CHECK 2 (org B only): PASS
Test 3 error code: 42501 message: no tenant context: app.organization_id is not set for this transaction
ISOLATION CHECK 3 (no GUC = 42501): PASS
Overall: ALL ISOLATION CHECKS PASSED
```

### payroll_run_export_jobs

```
Test 1 (org A): sees [ 'c5b82e53-e69e-4937-ace8-1126ae3c0c7f' ]
ISOLATION CHECK 1: PASS
Test 2 error code: 42501 msg: no tenant context: app.organization_id is not set for this transaction
ISOLATION CHECK 2 (no GUC = 42501): PASS
```

Org B's row is invisible to org A's context. No-GUC query fails `42501` as designed.

## Test results

### mail and payroll spec suites

Command: `node ./node_modules/jest/bin/jest.js --silent --testPathPattern "src/modules/mail/|src/modules/payroll/"`

```
Test Suites: 86 passed, 86 total
Tests:       776 passed, 776 total
Exit code: 0
```

### db:verify-rls

```
PASS  migration role still unrestricted (BYPASSRLS)
PASS  tenant A reads only its own rows
PASS  tenant B reads only its own rows
PASS  unknown tenant reads nothing
PASS  query with no tenant context is rejected
PASS  cross-tenant INSERT is blocked
PASS  cross-tenant UPDATE touches nothing
PASS  cross-tenant DELETE touches nothing
PASS  own-tenant INSERT still succeeds
PASS  the other tenant's rows are intact
PASS  platform-level INSERT succeeds with no tenant context
PASS  platform-level INSERT succeeds inside a tenant transaction
PASS  own-tenant INSERT still succeeds on a nullable tenant column
PASS  cross-tenant INSERT is blocked on a nullable tenant column
PASS  tenant does not see the other tenant's rows on a nullable tenant column
PASS  tenant id does not survive COMMIT

coverage: 959 of 964 tenant-scoped tables have RLS enabled
SKIP  public.noisy_neighbour_reviews — registered as platform-global
SKIP  public.organization_lifecycle_sagas — registered as platform-global
SKIP  public.organization_placement — registered as platform-global
SKIP  public.organization_relocations — registered as platform-global
SKIP  public.organization_reservations — registered as platform-global
SKIP  public.placement_decisions — registered as platform-global
SKIP  public.organization_relocation_checksums — registered as platform-global
SKIP  public.organization_saga_steps — registered as platform-global

RESULT: RLS VERIFIED
Exit code: 0
```

Coverage moved from 957/964 to 959/964. Zero FAIL lines. 8 tables in the exemption list (all with documented rationale already in the script).

## Files changed

- `src/modules/mail/mail-sync-checkpoint.service.ts` — `loadPosition` wrapped in `runInNewTenantTransaction`
- `src/modules/payroll/runs/payroll-export.service.ts` — all 9 methods wrapped; `progress` and `complete` signatures extended with `orgId`; import added
- `src/modules/payroll/runs/payroll-export-worker.service.ts` — updated calls to `progress` and `complete` to pass `job.orgId`
- `src/modules/payroll/runs/__tests__/payroll-export-cross-tenant.spec.ts` — added `jest.mock` for `run-in-tenant-transaction` so tests do not attempt a real DB transaction
- `migrations/0723_mail_checkpoint_org_index.sql` — new migration
- `migrations/0724_rls_mail_checkpoints_payroll_export.sql` — new migration
- `migrations/meta/_journal.json` — two entries appended (idx 545, 546)
