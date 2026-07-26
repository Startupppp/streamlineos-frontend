---
wave: 0
type: baseline migration runbook (USER-EXECUTED)
status: DRAFT
date: 2026-07-26
prerequisite: wave-0-control-plane.md (read first — contains the drift report and root-cause analysis)
---

# Wave 0 — Baseline Migration Runbook (User-Executed)

> **Who runs this:** You (the developer with Neon DB access and a TTY).
> **What it does:** Squashes the broken migration journal into a single verified baseline so that
> `generate` + `migrate` reproducibly reach an identical schema on any empty database. This is the
> mandatory gate before any Wave 1–12 migration can be trusted.
>
> **Before you start — read `wave-0-control-plane.md` section T0.1.** The drift facts, root cause,
> and exit criterion are recorded there. This runbook is the *execution* companion.
>
> **Every command in this runbook runs from the `backend/` directory unless explicitly stated.**
> NEVER `db:push` (blocked by the guard in prod/CI, and is the root cause of the current drift).
> NEVER `apply-sql-file.mjs` or `apply-migration-file.mjs` for schema changes going forward —
> those helpers exist temporarily for reconciliation only and are retired after this runbook completes.

---

## Confirmed Drift State (verified 2026-07-26)

| Fact | Value |
|------|-------|
| `.sql` files on disk in `migrations/` | **24** (`0000`–`0008`, `0016`, `0291`–`0300`, `0301`–`0304`) |
| Entries in `_journal.json` | **21** (idx 0–20) |
| Files NOT in the journal | **`0007_search_trgm_indexes`**, **`0008_user_module_access`**, **`0300_kb_chunk_content_hash`** |
| Journal ordering anomaly | `0000`–`0006` → `0291`–`0299` → `0016_volatile_nicolaos` (idx 16) → `0301`–`0304` |
| Snapshot files | `0000_snapshot.json`, `0016_snapshot.json` — the `0016` snapshot is the current Drizzle diff baseline |
| Side-channel DDL (never journaled) | `docs/schema-migration/branch-sync-project-teams.sql` (applied via `apply-migration-file.mjs`) |
| Schema in code with NO migration | `directory/` tables (`organization_people`, `workers`, `worker_engagements`), `projects/pm-workspaces.ts`, `projects/pm-workspace-memberships.ts` |

---

## Safety Rules (non-negotiable throughout)

1. Every step runs on a **Neon branch copy first**. Never touch the primary branch until the
   branch run is fully verified.
2. `pnpm db:migrate` only — never `pnpm db:push` on a real environment.
3. Take a Neon branch snapshot before each destructive phase.
4. If any step fails mid-way, **stop and restore from the Neon branch snapshot** — do not attempt
   manual SQL surgery to proceed.
5. Keep the `migrations/_legacy/` archive until two green releases have passed.

---

## Phase 0 — Pre-flight Checks

### Step 0.1 — Confirm tooling versions

Run from `backend/`:

```bash
node --version          # must be >= 22
pnpm --version          # must be >= 10
npx drizzle-kit --version   # record this; must match devDependency "^0.31.8"
```

Verify `.env` is present and `DATABASE_URL` points to the Neon **branch** you are about to use
(NOT the main branch):

```bash
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL?.slice(0, 60))"
```

Expected output starts with `postgresql://` and contains the branch hostname. If it shows the
main Neon connection string, stop and fix `.env` before continuing.

### Step 0.2 — List files vs journal (confirm drift)

Run from `backend/`:

```bash
ls migrations/*.sql | sed 's|migrations/||;s|\.sql||' | sort > /tmp/disk_tags.txt
node -e "
  const j = require('./migrations/meta/_journal.json');
  j.entries.forEach(e => console.log(e.tag));
" | sort > /tmp/journal_tags.txt
diff /tmp/disk_tags.txt /tmp/journal_tags.txt
```

Expected diff output — exactly these three lines missing from the journal:

```
< 0007_search_trgm_indexes
< 0008_user_module_access
< 0300_kb_chunk_content_hash
```

If the diff is different from the above, **stop and reconcile with wave-0-control-plane.md** before
proceeding.

---

## Phase 1 — Neon Branch Snapshot (Safety Net)

### Step 1.1 — Create a dedicated reconciliation branch in Neon

In the Neon console or via the Neon CLI:

```bash
# Neon CLI (install once: npm install -g neonctl)
neonctl branches create \
  --name prod-recon-baseline \
  --parent <your-main-branch-name> \
  --project-id <your-neon-project-id>
```

Record the branch ID and connection string. Update your `backend/.env` `DATABASE_URL` to point
to `prod-recon-baseline`.

**Verification:**

```sql
-- Run against the new branch to confirm you are on it (not main)
SELECT current_database(), inet_server_addr(), version();
```

Confirm the host in the output matches the `prod-recon-baseline` connection string.

### Step 1.2 — Capture a pg_dump of the true deployed schema

This dump is the reconciliation target — what the DB actually looks like, regardless of what
the journal says.

```bash
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  "$DATABASE_URL" \
  > /tmp/prod-recon-schema-dump.sql
```

Confirm the dump is non-empty:

```bash
wc -l /tmp/prod-recon-schema-dump.sql
# Expect several thousand lines for a mature schema
```

Store this file — you will diff against it in Phase 4.

---

## Phase 2 — Inventory the True DB Schema

Run the following queries against the `prod-recon-baseline` branch. They are all read-only.

### Step 2.1 — List all tables (the ground truth)

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Save the output. This is the set of tables that must exist after the clean migration in Phase 5.

### Step 2.2 — Check the Drizzle ledger

```sql
-- Rows in the __drizzle_migrations table = what Drizzle thinks is applied
SELECT id, hash, created_at
FROM __drizzle_migrations
ORDER BY created_at;
```

Expected: 21 rows (matching the 21 journal entries). If the count differs, record the discrepancy —
it means some migrations were applied without going through `drizzle-kit migrate`.

### Step 2.3 — Identify tables in code but not in DB (the key missing tables)

```sql
-- Check for the tables known to have no migration:
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organization_people') AS has_organization_people,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workers') AS has_workers,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='worker_engagements') AS has_worker_engagements,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pm_workspaces') AS has_pm_workspaces,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pm_workspace_memberships') AS has_pm_workspace_memberships,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_teams') AS has_project_teams,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_team_members') AS has_project_team_members,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_workspace_members') AS has_project_workspace_members,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_team_assignments') AS has_project_team_assignments,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_module_access') AS has_user_module_access;
```

Record the `true`/`false` results — this tells you which tables the side-channel SQL files already
created on the branch vs. which need to be added by the new migrations.

### Step 2.4 — Check for un-journaled migrations applied via side channels

```sql
-- Detect schema objects that should come from 0007 (pg_trgm extension + trgm indexes)
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

SELECT indexname FROM pg_indexes
WHERE indexname IN (
  'idx_users_name_trgm', 'idx_users_email_trgm',
  'idx_users_first_name_trgm', 'idx_tickets_title_trgm'
);

-- Detect schema objects from 0300 (kb_chunk_content_hash)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'kb_article_chunks' AND column_name = 'content_hash';
```

This tells you whether `0007`, `0008`, and `0300` were already side-applied to this DB.

### Step 2.5 — Run the orphan-detection harness

Run all queries from `docs/schema-migration/reconciliation-queries.sql` now. Share the results
(especially §3 multi-owner / ownerless counts — those are direct inputs to Wave 1).

```bash
# From backend/ directory
node scripts/apply-migration-file.mjs \
  ../docs/schema-migration/reconciliation-queries.sql \
  --url "$DATABASE_URL"
# NOTE: this uses sql.unsafe — reconciliation-queries.sql is read-only SELECTs only.
# Alternatively, paste directly into psql or Neon SQL editor.
```

---

## Phase 3 — Reconcile Code Schema vs DB (Identify Drift Before Squashing)

### Step 3.1 — Generate a diff against the branch (DO NOT apply)

```bash
# Run from backend/
# This shows what drizzle-kit WOULD emit if run against the prod-recon-baseline branch.
# It does NOT apply anything. Read the output carefully.
pnpm db:generate --name drift_check_only
```

Review every statement in the generated file. There should be content for:
- `organization_people`, `workers`, `worker_engagements` (directory tables — never migrated)
- `pm_workspaces`, `pm_workspace_memberships` (PM workspace tables — never migrated)
- Possibly `project_teams`, `project_team_members`, `project_workspace_members`,
  `project_team_assignments` if the side-channel SQL in Step 2.3 showed them missing

If the diff is EMPTY (unlikely given the known missing tables), it means `db:push` already synced
everything — record that and skip Phase 3 surgery.

**Do NOT commit this generated file yet.** Delete it after review if it was only for diagnostic
purposes.

```bash
# Clean up the diagnostic-only file (record the name from the output above first)
rm migrations/<generated_tag_name>.sql
# Restore the journal to its prior state
git checkout -- migrations/meta/_journal.json
```

---

## Phase 4 — Build the Squashed Baseline

This is the main reconciliation step. Execute on the `prod-recon-baseline` branch only.

### Step 4.1 — Archive the current migrations

```bash
# From backend/
mkdir -p migrations/_legacy
cp -r migrations/*.sql migrations/_legacy/
cp -r migrations/meta/ migrations/_legacy/meta_backup/
echo "Archived $(ls migrations/_legacy/*.sql | wc -l) SQL files and meta/ to migrations/_legacy/"
```

### Step 4.2 — Remove the old migration files (DO NOT remove _legacy/)

```bash
# From backend/
# Remove only the tracked SQL files and meta entries — NOT _legacy/
rm migrations/0000_light_vance_astro.sql
rm migrations/0001_ai_token_billing.sql
rm migrations/0002_platform_admin_flag.sql
rm migrations/0003_document_types_country_code.sql
rm migrations/0004_attendance_multi_session.sql
rm migrations/0005_projectos_teams_and_comment_drafts.sql
rm migrations/0006_projectos_parity_gaps.sql
rm migrations/0007_search_trgm_indexes.sql
rm migrations/0008_user_module_access.sql
rm migrations/0016_volatile_nicolaos.sql
rm migrations/0291_payroll_phase0_safety.sql
rm migrations/0292_payroll_phase1_2_foundation.sql
rm migrations/0293_payroll_prd_ship_constraints.sql
rm migrations/0294_payroll_journal_outbox.sql
rm migrations/0295_hrms_perf_indexes.sql
rm migrations/0296_hrms_org_departments.sql
rm migrations/0297_hr_disciplinary_acknowledge.sql
rm migrations/0298_payroll_runs_entity_uniqueness.sql
rm migrations/0299_onboarding_template_org_departments.sql
rm migrations/0300_kb_chunk_content_hash.sql
rm migrations/0301_inv_stock_levels_natural_key.sql
rm migrations/0302_inv_perf_indexes.sql
rm migrations/0303_inv_name_uniqueness.sql
rm migrations/0304_inv_status_enums.sql
rm migrations/meta/_journal.json
rm migrations/meta/0000_snapshot.json
rm migrations/meta/0016_snapshot.json
```

**Verification:**

```bash
ls migrations/         # Should show only _legacy/
ls migrations/meta/    # Should be empty (or not exist yet)
```

### Step 4.3 — Generate the single baseline migration against an EMPTY database

You need an empty Postgres database to generate against. Use a second Neon branch with NO schema:

```bash
# In Neon console: create branch "empty-baseline-target" with no data (fresh empty DB)
# Set DATABASE_URL temporarily to the empty-baseline-target connection string:
export DATABASE_URL="<empty-baseline-target-connection-string>"

# From backend/
pnpm db:generate --name baseline
```

This emits:
- `migrations/0000_baseline.sql` — the entire current schema as CREATE TABLE / CREATE INDEX / etc.
- `migrations/meta/0000_snapshot.json` — the snapshot Drizzle uses for future incremental diffs
- `migrations/meta/_journal.json` — a clean journal with a single entry (idx 0, tag `0000_baseline`)

**Verification:**

```bash
ls migrations/*.sql     # Exactly one file: 0000_baseline.sql
cat migrations/meta/_journal.json | node -e "
  const j = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('entries:', j.entries.length, '| last tag:', j.entries.at(-1).tag);
"
# Expected: entries: 1 | last tag: 0000_baseline
```

### Step 4.4 — Apply the baseline to the empty DB (prove it runs)

```bash
# DATABASE_URL still points to empty-baseline-target
pnpm db:migrate
```

This must complete with no errors. Verify:

```sql
-- Run against empty-baseline-target
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- This count must match the count from Step 2.1 (tables in prod-recon-baseline)
```

### Step 4.5 — Diff the baseline DB against production (the zero-diff gate)

```bash
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  "<empty-baseline-target-connection-string>" \
  > /tmp/baseline-schema-dump.sql

# Normalize both dumps (sort, strip noise) then diff:
grep -v '^--' /tmp/prod-recon-schema-dump.sql | sort > /tmp/prod-sorted.sql
grep -v '^--' /tmp/baseline-schema-dump.sql   | sort > /tmp/baseline-sorted.sql
diff /tmp/prod-sorted.sql /tmp/baseline-sorted.sql > /tmp/schema-diff.txt
wc -l /tmp/schema-diff.txt
```

**Exit gate:** `/tmp/schema-diff.txt` must be empty (0 lines) or contain only ignorable cosmetic
differences (whitespace, column ordering in `pg_dump` output, `ALTER TABLE ... OWNER TO` lines).
If there are structural differences (missing tables, different column types, missing indexes),
**stop and reconcile the code schema to match the DB** — fix `src/db/schema/` files, NOT the DB,
and re-run from Step 4.2.

Common expected differences and how to resolve them:

| Diff symptom | Cause | Fix |
|---|---|---|
| Table present in prod dump, missing from baseline | Code schema file missing the table | Add the table to the appropriate `src/db/schema/` file, then re-run `db:generate` |
| Column present in prod dump, missing from baseline | Column not in Drizzle schema | Add the column to the schema file |
| Index present in prod, missing from baseline | Side-applied index not in schema | Add to schema or confirm it's intentionally absent |
| Enum type present in prod, missing from baseline | Enum was side-applied | Add to `src/db/schema/enums.ts` |

---

## Phase 5 — Register the Baseline on Existing DBs (the Ledger Stamp)

The `prod-recon-baseline` branch already has the schema physically. If you run `db:migrate` against
it with the new `0000_baseline` migration, Drizzle will try to re-CREATE all tables and fail with
`already exists` errors. Instead, you must stamp the ledger to tell Drizzle the baseline is already
applied — without re-running the SQL.

### Step 5.1 — Extract the hash of the baseline migration

```bash
# Drizzle stores the hash in __drizzle_migrations.hash
# The hash is computed by drizzle-kit from the SQL file content.
# Run db:migrate in dry-run mode to see what hash it would insert:
node -e "
  const { createHash } = require('crypto');
  const { readFileSync } = require('fs');
  const content = readFileSync('migrations/0000_baseline.sql', 'utf8');
  // Drizzle uses sha256 of the raw file content
  const hash = createHash('sha256').update(content).digest('hex');
  console.log('Hash:', hash);
"
```

### Step 5.2 — Stamp the ledger on prod-recon-baseline

Switch `DATABASE_URL` back to `prod-recon-baseline`:

```bash
export DATABASE_URL="<prod-recon-baseline-connection-string>"
```

Then stamp the ledger with the baseline hash. Replace `<hash>` with the value from Step 5.1 and
`<journal_when>` with the `when` value from `migrations/meta/_journal.json` entry idx 0:

```sql
-- Run this EXACTLY ONCE on prod-recon-baseline and on every other existing DB.
-- It tells Drizzle "0000_baseline is already applied" so migrate is a no-op for it.
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('<hash-from-step-5.1>', <journal_when_value>)
ON CONFLICT DO NOTHING;
```

**Verification:**

```sql
SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 3;
-- Must show the new baseline hash as the most recent (or only) entry.
```

### Step 5.3 — Confirm db:migrate is now a no-op on prod-recon-baseline

```bash
pnpm db:migrate
```

Expected output: `No migrations to run` (or equivalent Drizzle message indicating zero pending
migrations). If it tries to run any SQL, stop — the stamp in Step 5.2 was not inserted correctly.

---

## Phase 6 — Generate Missing Migrations for Un-migrated Tables

The directory tables (`organization_people`, `workers`, `worker_engagements`) and PM workspace
tables (`pm_workspaces`, `pm_workspace_memberships`) exist in the Drizzle schema but have no
migration. If Step 2.3 showed them as `false` (not in the branch DB), you must generate and apply
migrations for them now. If they are already present in the DB (because `db:push` or a side-channel
applied them), they will have been captured in `0000_baseline` automatically and this step is a
no-op.

**How to determine if this step is needed:** look at the `0000_baseline.sql` file. If it includes
`CREATE TABLE organization_people`, `CREATE TABLE workers`, etc., they are in the baseline and this
step is not needed. If those `CREATE TABLE` statements are absent, proceed below.

### Step 6.1 — Generate the missing-tables migration

```bash
# DATABASE_URL points to prod-recon-baseline (which has the baseline stamp from Phase 5)
pnpm db:generate --name directory_pm_workspace_tables
```

Drizzle diffs the current `src/db/schema/` against the `0000_baseline` snapshot. Since the
directory and PM workspace tables are in the code but not in the snapshot, it emits a migration
adding them.

Review the generated file carefully. It must contain:
- `CREATE TABLE organization_people` with all columns from `directory/organization-people.ts`
- `CREATE TABLE workers` with the composite FK to `organization_people`
- `CREATE TABLE worker_engagements` with the composite FK to `workers`
- `CREATE TABLE pm_workspaces` with the partial unique index `WHERE is_default = true`
- `CREATE TABLE pm_workspace_memberships` with the composite FK to `pm_workspaces`

**Verify the worker_engagement enum dependency:**

```sql
-- The worker_engagements table uses workerEngagementStatusEnum.
-- Confirm the enum exists in the DB before applying:
SELECT EXISTS (
  SELECT 1 FROM pg_type WHERE typname = 'worker_engagement_status'
) AS enum_exists;
```

If `false`, the enum will be in the generated migration as `CREATE TYPE`. Verify it appears before
the `CREATE TABLE worker_engagements` statement.

### Step 6.2 — Apply the new migration

```bash
pnpm db:migrate
```

**Verification:**

```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='organization_people') AS org_people,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workers') AS workers,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='worker_engagements') AS worker_engagements,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pm_workspaces') AS pm_workspaces,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pm_workspace_memberships') AS pm_ws_memberships;
-- All columns must be true.
```

---

## Phase 7 — Absorb the Side-Channel SQL as a Proper Migration

`docs/schema-migration/branch-sync-project-teams.sql` was applied via `apply-migration-file.mjs`
directly, bypassing the Drizzle ledger. The tables it creates (`project_workspace_members`,
`project_team_assignments`) are defined in `src/db/schema/project-teams.ts`.

**Check if they are already in the 0000_baseline:**

Grep `0000_baseline.sql` for these table names:

```bash
grep -i 'project_workspace_members\|project_team_assignments\|project_teams\|project_team_members' \
  migrations/0000_baseline.sql | head -20
```

If those `CREATE TABLE` statements appear in `0000_baseline.sql`, the tables are already in the
baseline and this phase is complete — nothing to do.

If they do NOT appear (meaning the side-channel was not applied to the branch you dumped), generate
a migration for them now using the same process as Phase 6 — `db:generate --name project_team_tables`
and then `db:migrate`.

**Critically:** the DDL in `branch-sync-project-teams.sql` is a subset of `project-teams.ts`. The
schema file is authoritative. Do not manually copy the side-channel SQL — let `db:generate` produce
the correct migration from the code.

**After this phase**, `docs/schema-migration/branch-sync-project-teams.sql` becomes a historical
artifact. Do not apply it again; it is superseded by the baseline migration.

---

## Phase 8 — Final Verification (the Wave 0 Exit Criterion)

### Step 8.1 — Verify the journal is linear and complete

```bash
node -e "
  const j = require('./migrations/meta/_journal.json');
  console.log('Total entries:', j.entries.length);
  j.entries.forEach((e, i) => {
    if (e.idx !== i) console.error('IDX MISMATCH at position', i, ':', e);
    else console.log('OK idx', i, ':', e.tag);
  });
"
```

Expected: all `idx` values match their position (0, 1, 2, …), tags are in the correct order
(`0000_baseline`, then the missing-tables migration, etc.), no gaps.

### Step 8.2 — Prove a fresh DB reaches the same head

Create a **third** Neon branch — `fresh-verify` — with an empty schema:

```bash
neonctl branches create \
  --name fresh-verify \
  --parent <empty-no-schema-parent> \
  --project-id <your-neon-project-id>
export DATABASE_URL="<fresh-verify-connection-string>"
```

Apply all migrations from scratch:

```bash
pnpm db:migrate
```

Must complete with zero errors.

Dump and diff:

```bash
pg_dump --schema-only --no-owner --no-privileges --schema=public \
  "$DATABASE_URL" > /tmp/fresh-verify-dump.sql

grep -v '^--' /tmp/prod-recon-schema-dump.sql | sort > /tmp/prod-sorted-final.sql
grep -v '^--' /tmp/fresh-verify-dump.sql       | sort > /tmp/fresh-sorted.sql
diff /tmp/prod-sorted-final.sql /tmp/fresh-sorted.sql
```

**Exit criterion:** diff output is empty or contains only cosmetic pg_dump noise. Zero structural
differences. If there are differences, resolve them (fix code schema, regenerate, re-migrate) and
re-run this step.

### Step 8.3 — Confirm db:generate on prod-recon-baseline produces no output

```bash
export DATABASE_URL="<prod-recon-baseline-connection-string>"
pnpm db:generate --name drift_check
```

If the journal is fully reconciled and the code schema matches the DB, Drizzle should report
"No changes detected" (no new SQL file generated). If a file is generated, inspect it, reconcile
the schema file it references, and re-run Phase 6 as needed.

Clean up the diagnostic file if one was generated:

```bash
rm -f migrations/<whatever-drift_check-tag>.sql
git checkout -- migrations/meta/_journal.json
```

---

## Phase 9 — Neon Pooler RLS Transaction-Locality Test

This proves that `set_config(..., true)` (transaction-local) is safe under the actual Neon pooler
mode and that GUCs do NOT leak across pooled connections. Run this **before any RLS policies are
enabled** (Wave 4 prerequisite, per `wave-0-rls-matrix.md` Part 5 NT-07).

Run the following SQL block in a single session. Use `psql` or the Neon SQL editor connected to
`prod-recon-baseline` via the **pooler connection string** (not the direct non-pooled URL):

```sql
-- ============================================================
-- RLS GUC transaction-locality proof
-- Run via the POOLER connection string, not the direct URL.
-- ============================================================

-- Transaction 1: set a GUC, commit, then verify it is gone
BEGIN;
SELECT set_config('app.organization_id', 'org_test_aaa', true);   -- transaction-local
SELECT current_setting('app.organization_id', true) AS guc_in_txn;
-- Expected: 'org_test_aaa'
COMMIT;

-- After commit: the transaction-local GUC must have reset to session default (empty/null)
SELECT current_setting('app.organization_id', true) AS guc_after_commit;
-- Expected: '' (empty string) or NULL — NOT 'org_test_aaa'

-- ============================================================
-- Confirm NULLIF behavior (the fail-closed predicate)
-- ============================================================
SELECT NULLIF(TRIM(current_setting('app.organization_id', true)), '') AS rls_org_id_result;
-- Expected: NULL (not 'org_test_aaa', not '')
-- This proves: after commit, rls_org_id() returns NULL → fail-closed predicate fires
-- ============================================================

-- Transaction 2: simulate a subsequent session reusing the pooled connection
-- WITHOUT setting the GUC — proves no leakage
BEGIN;
-- Do NOT call set_config here (simulating a new session that forgot to set GUCs)
SELECT NULLIF(TRIM(current_setting('app.organization_id', true)), '') AS rls_org_id_in_new_txn;
-- Expected: NULL — the GUC from Transaction 1 did NOT persist across the commit boundary
COMMIT;
```

**Pass criteria:**
1. `guc_in_txn` = `'org_test_aaa'` — GUC is visible within the transaction that set it.
2. `guc_after_commit` = `''` or `NULL` — GUC resets on commit (transaction-local confirmed).
3. `rls_org_id_result` = `NULL` — `NULLIF` correctly turns empty string into NULL.
4. `rls_org_id_in_new_txn` = `NULL` — no leakage across transaction boundary under pooler.

If test 2 or 4 shows `'org_test_aaa'` persisting after commit, Neon is using session-persistent
GUCs in this pooler mode. In that case:
- Switch the runtime GUC call to also issue `RESET app.organization_id` at transaction end, or
- Use Neon's transaction-mode pooler endpoint (PgBouncer transaction mode) which guarantees
  connection-level state is reset between client sessions.
- Do NOT proceed to enable RLS policies until this test passes.

**Record the result** (pass/fail + Neon pooler mode observed) in `wave-0-rls-matrix.md` under
Part 5 / NT-07.

---

## Phase 10 — Apply Baseline Stamp to All Remaining Environments

Repeat Phase 5 (Steps 5.2–5.3) on every database environment that already has the schema:
- Local dev databases
- Any staging environments
- Production (when prod-recon-baseline has been verified and the runbook declared complete)

For each environment, the procedure is identical: set `DATABASE_URL`, insert the baseline hash
into `__drizzle_migrations`, then run `pnpm db:migrate` and confirm it is a no-op.

---

## Phase 11 — Retire the Side-Channel Scripts

After the runbook is complete and the baseline is applied to all environments, file these for
removal in the Wave 12 dead-code sweep (`wave-12-dead-code-inventory.md`):

- `backend/scripts/apply-sql-file.mjs` — raw SQL applier that bypasses the ledger
- `backend/scripts/apply-migration-file.mjs` — same (used for branch-sync-project-teams.sql)
- `backend/scripts/apply-hrms-migrations.mjs` — references the defunct 0201–0226 range

Do NOT delete them now — they may still be needed for emergency reference during the reconciliation
window. The dead-code sweep will verify no callers remain before deletion.

Also retire `docs/schema-migration/branch-sync-project-teams.sql` — mark it as superseded by the
baseline migration at the top of the file:

```
-- SUPERSEDED: absorbed into 0000_baseline (Wave 0 reconciliation, 2026-07-26).
-- Do not apply. Historical reference only.
```

---

## Rollback Reference

At any phase, if something goes wrong:

| Phase | Rollback action |
|-------|----------------|
| 0–2 | No changes made — nothing to roll back |
| 3 | `git checkout -- migrations/` restores the original journal and SQL files |
| 4 | Delete the `migrations/` contents and restore from `migrations/_legacy/` |
| 5 | `DELETE FROM __drizzle_migrations WHERE hash = '<baseline-hash>';` on the branch |
| 6–7 | Neon console: delete the `prod-recon-baseline` branch and re-create from production |
| Any | Neon console: restore the production branch from its pre-runbook point-in-time snapshot |

**The nuclear option:** in Neon, every branch has a point-in-time restore. If the branch is
corrupted, restore from the moment before Phase 4 started. The production branch is never touched
until the runbook is declared complete.

---

## Ordered Execution Checklist

Run in strict order. Check each box before proceeding to the next.

- [ ] **0.1** Verify Node ≥22, pnpm ≥10, drizzle-kit version matches package.json
- [ ] **0.2** Confirm disk-vs-journal drift (3 files missing: 0007, 0008, 0300)
- [ ] **1.1** Create `prod-recon-baseline` Neon branch; update `.env` `DATABASE_URL`
- [ ] **1.2** `pg_dump --schema-only` → `/tmp/prod-recon-schema-dump.sql` (save this)
- [ ] **2.1** Run table inventory query; record table count
- [ ] **2.2** Run `__drizzle_migrations` count query; record row count
- [ ] **2.3** Run the 10-table existence query; record which are `true` vs `false`
- [ ] **2.4** Run the extension/index/column existence queries for 0007 and 0300 objects
- [ ] **2.5** Run all queries from `reconciliation-queries.sql`; share counts
- [ ] **3.1** Run `db:generate --name drift_check_only`; read the output; delete and revert journal
- [ ] **4.1** Archive migrations to `_legacy/`
- [ ] **4.2** Remove the 24 existing SQL files and meta entries
- [ ] **4.3** Point `DATABASE_URL` at empty DB; run `db:generate --name baseline`
- [ ] **4.4** Run `db:migrate` on empty DB; verify table count matches Step 2.1
- [ ] **4.5** `pg_dump` the empty DB; diff vs Step 1.2 dump; confirm 0-line diff
- [ ] **5.1** Extract the baseline migration SHA-256 hash
- [ ] **5.2** INSERT hash into `__drizzle_migrations` on `prod-recon-baseline`
- [ ] **5.3** Run `db:migrate` on `prod-recon-baseline`; confirm no-op
- [ ] **6.1** If directory/PM tables absent from baseline: `db:generate --name directory_pm_workspace_tables`
- [ ] **6.2** `db:migrate`; verify all 5 tables exist
- [ ] **7** Confirm project-team tables in baseline or generate+migrate them
- [ ] **8.1** Verify journal is linear (`idx` matches position, no gaps)
- [ ] **8.2** Fresh `empty` branch → `db:migrate` → diff vs Step 1.2 dump → 0 structural differences
- [ ] **8.3** `db:generate --name drift_check` on `prod-recon-baseline` → "No changes detected"
- [ ] **9** Run the RLS pooler transaction-locality test; record pass/fail in `wave-0-rls-matrix.md`
- [ ] **10** Stamp `__drizzle_migrations` on every other environment (dev, staging, prod)
- [ ] **11** Mark side-channel scripts for Wave 12 deletion; annotate `branch-sync-project-teams.sql`

---

## The Single Most Important Safety Step

**Create the `prod-recon-baseline` Neon branch BEFORE touching a single file.**

Every step in this runbook that modifies migrations, stamps the ledger, or runs DDL operates
against that branch — never directly against the production branch. The Neon branch is
cheap to create, instant to restore from, and the only thing standing between a failed
mid-squash state and a recoverable situation. If you skip this step and something goes wrong
in Phase 4 (where the old migration files are deleted), there is no way to recover the prior
state from git alone — the ledger entries in `__drizzle_migrations` are DB-side state that
git does not track.

**Create the branch. Run everything there first. Promote to production only after Step 8.2
produces a zero-line diff.**
