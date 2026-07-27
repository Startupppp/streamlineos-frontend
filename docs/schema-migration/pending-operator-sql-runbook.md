---
type: operator runbook — the exact ordered sequence for all PENDING database work
status: READY TO RUN (blocked only on a valid DATABASE_URL)
date: 2026-07-27
---

# Pending operator SQL — ordered runbook

> **Why this exists:** all the SQL below is authored, idempotent, and committed, but NONE of it has
> executed — `backend/.env` `DATABASE_URL` fails auth (`password authentication failed for user
> 'neondb_owner'`; the Neon password was rotated mid-session). Fix the credential, then run these
> steps IN ORDER. Every step is idempotent and safe to re-run.
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
SELECT organization_id, count(*) AS owners
FROM   organization_members
WHERE  is_org_owner = true
GROUP  BY organization_id
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

## Step 2 — apply the journaled migrations (idx 48–53)

```bash
pnpm -C backend db:migrate
```

Applies `0328_membership_role_assignments`, `0329_owner_exactly_one`,
`0330_worker_engagement_overlap`, `0331_pm_workspace_id_nullable`,
`0332_pm_workspace_id_backfill`, `0333_pm_workspace_id_not_null`.
Journal is consistent at **54 entries = 54 files**. If it stops, fix the reported invariant and re-run
(idempotent).

## Step 3 — Build module rename data-migration

```bash
psql "$DATABASE_URL" -f docs/schema-migration/rename-projects-to-build-data.sql
```

Rewrites `role_permission_grants` `projects:%`→`build:%`, `org_modules.module_key`
`projects`→`build`, `organizations.enabled_modules` `PROJECTS`→`BUILD`,
`user_module_access` / onboarding module keys, then bumps the permissions version.
**Run BEFORE Step 4** so the module vocabulary is already normalized when the backfill reads it.
Until this runs, existing users' grants still say `projects:*` and won't match the deployed
`build:*` keys.

## Step 4 — org_modules backfill (prerequisite for the #46 fail-closed flip)

```bash
psql "$DATABASE_URL" -f docs/schema-migration/backfill-org-modules-from-enabled-modules.sql
```

Inserts the lowercase `org_modules` row for every value in `organizations.enabled_modules`
(`ON CONFLICT DO NOTHING`). Then verify **zero** orgs are missing rows:

```sql
SELECT o.id
FROM   organizations o
WHERE  EXISTS (SELECT 1 FROM unnest(o.enabled_modules) m
               WHERE lower(m) NOT IN (SELECT module_key FROM org_modules WHERE org_id = o.id));
```

Only once this returns no rows is it safe to flip `@RequireModule` to deny-on-absent (task #46).

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

Drops 10 verified-dead tables (`service_accounts`, `allowance_types`,
`payroll_statutory_rule_sets`, and the abandoned LMS/Training cluster `courses`,
`course_categories`, `course_enrollments`, `training_programs`, `training_attendance`) and deletes
orphaned `hr:learning:%` grants. The file contains commented row-count checks — run them first if you
want to confirm the tables are empty.

## Step 8 — post-run verification

```sql
-- RBAC keys migrated
SELECT count(*) AS stale_projects_grants FROM role_permission_grants WHERE permission LIKE 'projects:%';  -- expect 0
-- module vocabulary normalized
SELECT count(*) AS stale_projects_modules FROM org_modules WHERE module_key = 'projects';                 -- expect 0
SELECT count(*) AS stale_PROJECTS_arrays FROM organizations WHERE 'PROJECTS' = ANY(enabled_modules);      -- expect 0
-- dead tables gone
SELECT count(*) AS dead_tables_remaining FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
 ('service_accounts','allowance_types','payroll_statutory_rule_sets','courses','course_categories',
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
