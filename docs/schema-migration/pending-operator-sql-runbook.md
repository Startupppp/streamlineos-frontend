---
type: operator runbook — the exact ordered sequence for all PENDING database work
status: PARTIALLY DONE — see update block below
date: 2026-07-27
updated: 2026-07-28
---

# Pending operator SQL — ordered runbook

> **UPDATE 2026-07-28 — DB was wiped and cold-rebuilt.** The original header claimed "NONE of it has
> executed" — that is now false. The Neon database was wiped (`DROP SCHEMA public CASCADE`) and all
> **70 migrations** were applied from empty via `pnpm db:bootstrap`. The drizzle ledger confirms
> 70 applied migrations and 782 tables. Verified via direct DB query 2026-07-28.
>
> **What changed:**
> - Step 2 (apply journaled migrations 0328–0333) is **DONE** — those migrations are part of the
>   70-migration chain now applied.
> - Steps 3–7 are **data-migration scripts for populated DBs**. On the current fresh DB (0 orgs)
>   they are mostly no-ops. They must still be run on any DB with real organization data.
> - Step 7 (`drop-dead-tables.sql`) is **still needed** — the 7 target tables exist even on the
>   fresh DB (service_accounts, allowance_types, course_enrollments, courses, course_categories,
>   training_attendance, training_programs all confirmed present via DB query 2026-07-28).
>
> **DO NOT re-run the historical `wave-*.sql` files.** They were folded into journaled migrations
> `0307`–`0327` during the journal reconciliation. `db:migrate` covers them. Running them by hand
> would duplicate work.

## Step 0 — GATE 0.1: backup branch (MANDATORY, do not skip)

Create a Neon branch from the current state named `prod-recon-baseline`. Steps 2 and 7 below are
destructive (`SET NOT NULL`, `DROP TABLE`). **Without this branch there is no rollback.**

## Step 1 — PRE-FLIGHT (read-only). ABORT if any check returns rows.

Three of the new migrations enforce invariants that FAIL on pre-existing bad data. Run these first;
if any returns rows, quarantine/fix that data before Step 2, or `db:migrate` will stop mid-chain.

```sql
-- 1a. 0329 owner-exactly-one: orgs with 0 or >1 owners
-- NOTE: real columns are is_owner and org_id (not is_org_owner / organization_id).
--       Verified against schema and live DB 2026-07-28.
SELECT org_id, count(*) AS owners
FROM   organization_members
WHERE  is_owner = true
GROUP  BY org_id
HAVING count(*) <> 1;

-- 1b. 0330 worker-engagement overlap: existing overlapping live engagements
SELECT a.organization_id, a.worker_id, a.id AS a_id, b.id AS b_id
FROM   worker_engagements a
JOIN   worker_engagements b
       ON a.organization_id = b.organization_id
      AND a.worker_id = b.worker_id
      AND a.id < b.id
      AND daterange(a.starts_on, COALESCE(a.ends_on, 'infinity'::date), '[)')
       && daterange(b.starts_on, COALESCE(b.ends_on, 'infinity'::date), '[)')
WHERE  a.status NOT IN ('COMPLETED','TERMINATED','CANCELLED')
  AND  b.status NOT IN ('COMPLETED','TERMINATED','CANCELLED');

-- 1c. 0333 pm_workspace_id NOT NULL: rows that would violate it
--     (0332 backfills these; this check confirms 0332 did its job)
SELECT 'projects' t, count(*) FROM projects WHERE pm_workspace_id IS NULL
UNION ALL SELECT 'managed_products', count(*) FROM managed_products WHERE pm_workspace_id IS NULL
UNION ALL SELECT 'project_teams', count(*) FROM project_teams WHERE pm_workspace_id IS NULL;
```

Also confirm the extensions exist (already present on the dev branch; REQUIRED on any fresh branch
before `db:migrate` — no migration creates them):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Step 2 — ✅ DONE (2026-07-28) — apply the journaled migrations

This step is complete. Migrations 0328–0333 (idx 48–53) are part of the 70-migration chain that
was applied when the DB was wiped and rebuilt. No action needed.

For reference, what these applied:
- `0328_membership_role_assignments`, `0329_owner_exactly_one`, `0330_worker_engagement_overlap`
- `0331_pm_workspace_id_nullable`, `0332_pm_workspace_id_backfill`, `0333_pm_workspace_id_not_null`

Journal is now consistent at **70 entries = 70 files** (not 54 as originally written — 16
additional migrations 0334–0349 were added this session).

## Steps 3 & 4 — RETIRED 2026-08-03 (scripts deleted)

`rename-projects-to-build-data.sql` and `backfill-org-modules-from-enabled-modules.sql`
were deleted. Both read `organizations.enabled_modules`, a column that no longer exists,
so neither could run — the rename ran inside a single transaction and would have aborted
at that statement.

Verified against the live DB before deletion: `org_modules.module_key='projects'` = 0,
`role_permission_grants LIKE 'projects:%'` = 0, `user_module_access` = 0,
`module_setup_checklists` = 0, across both orgs. The rename is complete and the
`enabled_modules` vocabulary is retired, so the backfill has no source to read.

Consequence for task #46: the `@RequireModule` fail-closed flip is **no longer blocked**
on Step 4 — `org_modules` is now the only module vocabulary.

## Step 5 — directory/workforce grant backfill

```bash
psql "$DATABASE_URL" -f docs/schema-migration/grant-directory-keys.sql
```

Copies `directory:*` / `workforce:*` grants to any role holding the matching `hr:employees:*`
grants, so the re-keyed directory endpoints keep working for existing roles.

## Step 6 — cross-tenant support-routing fix

```bash
psql "$DATABASE_URL" -f docs/schema-migration/fix-support-agent-routing-cross-tenant.sql
```

Tenant-isolation correction (a global uniqueness/index that should be org-scoped). Review the file's
header before running.

## Step 7 — DESTRUCTIVE: drop dead tables (do LAST)

```bash
psql "$DATABASE_URL" -f docs/schema-migration/drop-dead-tables.sql
```

Drops 7 verified code-dead candidate tables (`service_accounts`, `allowance_types`, and the
abandoned LMS/Training cluster `courses`, `course_categories`, `course_enrollments`,
`training_programs`, `training_attendance`) and deletes orphaned `hr:learning:%` grants.
`payroll_statutory_rule_sets` is deliberately preserved because it contains seeded statutory data.
Run the row-count and inbound-FK preflights in the SQL file before applying it through the canonical
migration ledger; do not execute this file directly against production.

## Step 8 — post-run verification (for Steps 3–7 on a populated DB)

```sql
-- RBAC keys migrated
SELECT count(*) AS stale_projects_grants FROM role_permission_grants WHERE permission LIKE 'projects:%';  -- expect 0
-- module vocabulary normalized
SELECT count(*) AS stale_projects_modules FROM org_modules WHERE module_key = 'projects';                 -- expect 0
SELECT count(*) AS stale_PROJECTS_arrays FROM organizations WHERE 'PROJECTS' = ANY(enabled_modules);      -- expect 0
-- dead tables gone
SELECT count(*) AS dead_tables_remaining FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
 ('service_accounts','allowance_types','courses','course_categories',
  'course_enrollments','training_programs','training_attendance');                                        -- expect 0
```

Then restart the API so the RBAC/entitlements caches rebuild (or confirm the permissions-version bump
in Step 3 invalidated them).

## DEFERRED — do NOT run yet (gated by design)

- **`party-cutover-phase{1,2,3,5,7}.sql`** — needs ≥7-day shadow-read parity between phases and
  ≥30 days / 2 releases of zero legacy use before Phase 7 drops anything. Phase 5 (invoice /
  purchase_bills type change) is the highest-risk step in the whole program.
- **`rls-phase{1,2,3}.sql`** — HARD-BLOCKED on **GATE 0.5**: prove `set_config(...,true)` is
  transaction-local under the Neon **pooler** (pgbouncer). If it is not, enabling RLS causes
  cross-tenant leakage. `src/db/rls-context.ts` is authored but intentionally NOT wired.
