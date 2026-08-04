---
type: forward-repair and migration apply order
status: ACTIVE
date: 2026-08-04
related: compatibility-authorities.md
---

# Forward-repair runbook

Operator-facing apply order for platform-domain-redesign spine migrations. Run on a Neon backup branch first (`prod-recon-baseline` per `pending-operator-sql-runbook.md`).

## Apply order (cold DB or incremental)

| Order | Migration | Purpose | Forward repair if partial |
|-------|-----------|---------|---------------------------|
| 1 | `0117_*` | `invitation_events.org_id` FK (NOT VALID → VALIDATE) | Re-run VALIDATE; quarantine orphan `invitation_id` rows |
| 2 | `0118_*` | Module-access / audit indexes | Idempotent index create; safe to retry |
| 3 | `0370_*` | Billing `org_id` text repair + tenant integrity | Shadow column already landed; **do not re-cast** |
| 4 | `0392_payroll_worker_subject` | Worker subject on salary profiles + run employees | Backfill `worker_id` from people/workers join; validate CHECK |
| 5 | `0393_payroll_lifecycle_worker_subject` | Worker subject on payslip publications, batch items, TDS ledger | Backfill from `payroll_run_employees.worker_id`; validate CHECK |

## Pre-flight (0392 / 0393)

Run on target branch **before** apply. All counts must be 0 (or quarantined) before VALIDATE steps.

```sql
-- Orphan run employees without resolvable subject
SELECT org_id, id, user_id, worker_id
FROM payroll_run_employees
WHERE worker_id IS NULL AND user_id IS NULL;

-- Payslip publications missing both subjects
SELECT org_id, id FROM payslip_publications
WHERE worker_id IS NULL AND user_id IS NULL;

-- Salary profiles missing both subjects
SELECT org_id, id FROM employee_salary_profiles
WHERE worker_id IS NULL AND user_id IS NULL;

-- Batch items missing both subjects
SELECT org_id, id FROM payroll_bank_batch_items
WHERE worker_id IS NULL AND user_id IS NULL;

-- TDS ledger missing both subjects
SELECT org_id, id FROM payroll_tds_ytd_ledger
WHERE worker_id IS NULL AND user_id IS NULL;
```

### 0392 forward repair (partial apply)

If migration stops after ADD COLUMN but before VALIDATE:

1. Re-run backfill UPDATE blocks from `0392_payroll_worker_subject.sql` (idempotent `WHERE … IS NULL`).
2. `ALTER TABLE … VALIDATE CONSTRAINT chk_employee_salary_profiles_subject;`
3. `ALTER TABLE … VALIDATE CONSTRAINT chk_payroll_run_employees_subject;`
4. `ALTER TABLE … VALIDATE CONSTRAINT fk_employee_salary_profiles_org_worker;`
5. `ALTER TABLE … VALIDATE CONSTRAINT fk_payroll_run_employees_org_worker;`
6. Create partial unique indexes if missing (see migration tail).

**Rollback:** Do not drop columns. Application rollback = deploy prior backend that writes `user_id` only; reads continue on fallback resolver.

### 0393 forward repair (partial apply)

1. Re-run backfill UPDATEs from `0393_payroll_lifecycle_worker_subject.sql`.
2. VALIDATE each CHECK + FK constraint in migration order.
3. Confirm partial unique indexes on `(org_id, worker_id, …)` exist.

**Rollback:** Same as 0392 — keep columns, revert app to user_id-primary writes only.

## Post-apply verification

```sql
-- Confirm CHECK constraints validated
SELECT conname, convalidated FROM pg_constraint
WHERE conname LIKE '%payroll%' OR conname LIKE '%salary_profiles%'
ORDER BY conname;

-- Sample worker-backed payees
SELECT count(*) FILTER (WHERE worker_id IS NOT NULL) AS with_worker,
       count(*) FILTER (WHERE user_id IS NOT NULL AND worker_id IS NULL) AS user_only
FROM payroll_run_employees;
```

## Dual-write retirement telemetry

Before stopping legacy writes, monitor weekly (see `compatibility-authorities.md` for full matrix):

| Signal | Query / audit action | Stop threshold |
|--------|---------------------|----------------|
| Payroll user-only new rows | `INSERT` audit without `worker_id` on run employees | 0 for 30 days |
| Role assignment orphans | `user_roles` without matching `role_assignments` | 0 after Wave 5-D backfill |
| Module array drift | `enabled_modules` vs `org_modules` disagree | 0 writes to array for 30 days |
| Portal legacy client_id | New non-null `projects.client_id` | 0 for 30 days |
| Offer fulfillment cross-tenant probe | Service 404 on wrong org (BOLA spec) | Always 404 — no telemetry needed |

Audit actions to watch in logs (existing `AuditService`, no new counters required):

- `offer_fulfillment.created|updated|deleted`
- `party.party.created|updated|deleted`
- Payroll publish/payout actions post-0393 should include `worker_id` in metadata when present

## FORCE RLS global — explicitly deferred

Do **not** enable FORCE RLS on new table groups without approved rows in `rls-matrix.md` + `wave-0-rls-matrix.md`. Current posture:

- Canary: `projects` only (`0375_rls_canary_projects`)
- Spine tables: service-layer BOLA + `runInTenantTransaction`
- Shadow observation notes in `rls-matrix.md`

## Rollback posture summary

| Migration | Rollback |
|-----------|----------|
| **0392 / 0393** | Additive nullable columns — stop writing `worker_id`, keep reads on `user_id` |
| **0370** | Do not revert text `org_id` on billing tables once FKs validate |
| **0117** | Drop FK only if no dependent code requires `org_id` on invitation events |

Full operator sequence: `pending-operator-sql-runbook.md`. Program index: `PROGRAM-INDEX.md`.
