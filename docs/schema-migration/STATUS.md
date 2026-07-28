---
type: schema-migration state snapshot
date: 2026-07-28
verified: all factual claims below were confirmed against the live DB and the migrations/ folder on this date
---

# Schema Migration Status — 2026-07-28

## Current verified state

| Item | Value |
|---|---|
| Total migrations | 70 (journal entries = SQL files = `drizzle.__drizzle_migrations` rows — all match) |
| Tables in `public` schema | 782 |
| Organizations in DB | 0 (fresh DB — wiped and cold-rebuilt 2026-07-28) |
| GATE 0.4 (clean-DB reproducibility) | **PASSED** — DB was wiped and all 70 migrations applied from empty |

Migration range: `0000_light_vance_astro` (idx 0) through `0349_retire_legacy_org_tables` (idx 69).

---

## How to do a cold rebuild

`DROP SCHEMA public CASCADE` followed by `CREATE SCHEMA public` is the correct wipe. Dropping only
tables is **insufficient** — it leaves ~397 enum types and ~413 functions behind, and migration
`0000` then fails with errors like `type "account_type" already exists`.

After the wipe, also reset the Drizzle migrations ledger so that `db:migrate` does not treat all
migrations as already applied:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- then either truncate the ledger:
TRUNCATE drizzle.__drizzle_migrations;
-- or drop and let db:migrate recreate it:
-- DROP SCHEMA drizzle CASCADE;
```

Before running `db:migrate` on a fresh database, the five required extensions must be created.
**No migration creates them.** They must pre-exist or `0000` fails with `type "vector" does not exist`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

The recommended cold-rebuild command is:

```bash
# Run from backend/ with DATABASE_URL pointing to the fresh branch
pnpm db:bootstrap
```

`db:bootstrap` automatically derives the direct (non-pooler) Neon endpoint from `DATABASE_URL`,
creates the extensions, and applies each migration on a fresh connection (with retries). After it
completes, `pnpm db:migrate` should report zero pending migrations.

---

## How to add a new migration (TTY constraint)

`pnpm -C backend db:generate` **cannot run headless** — it hits a TTY prompt
(`promptNamedWithSchemasConflict`) when run non-interactively and hangs or errors. New migrations
must be hand-written and journaled manually:

1. Write the SQL as `backend/migrations/<NNNN>_<snake_case_name>.sql`. Use the next sequential
   number (currently `0350` for the next migration).
2. Prepend `SET statement_timeout = 0;` if the migration contains a PL/pgSQL `DO $$...$$` block
   that adds many constraints in a single statement. Without it, Neon's default timeout cancels
   the statement on a cold DB.
3. Add a breakpoint marker before each top-level DDL statement:
   ```sql
   --> statement-breakpoint
   ```
4. Append to `backend/migrations/meta/_journal.json`:
   ```json
   { "idx": 70, "version": "7", "when": <unix-ms>, "tag": "0350_your_name", "breakpoints": true }
   ```
   `idx` must equal the position in the `entries` array (0-based). Do not skip or reuse indices.
5. Run `pnpm -C backend db:migrate` — it applies only the new entry.
6. Verify with `SELECT count(*) FROM drizzle.__drizzle_migrations` — should be 71 after the first
   new migration.

---

## Known ALTER … USING gotcha

Postgres forbids a subquery inside `ALTER COLUMN … TYPE … USING (subquery)`. If you need to cast a
column using data from another table (e.g. mapping an old integer FK to a new text UUID via a lookup
table), use the add/update/drop/rename pattern:

```sql
ALTER TABLE t ADD COLUMN col_new text;
UPDATE t SET col_new = lookup.new_id FROM lookup WHERE lookup.old_id = t.col_old;
ALTER TABLE t DROP COLUMN col_old;
ALTER TABLE t RENAME COLUMN col_new TO col_old;
```

Migrations `0349` (hr_locations → org_units, branches → org_units repoint) use this pattern
throughout. Attempting the USING-subquery form causes a parse error at migration time.

---

## Remaining operator SQL (pending as of 2026-07-28)

These are **data-migration scripts** — not journaled Drizzle migrations. They update existing rows
in a populated database. On the current fresh DB (0 organizations) they are no-ops except where noted.

Run each via `psql "$DATABASE_URL" -f docs/schema-migration/<file>` in the listed order.

| # | Script | Purpose | Needed on fresh DB? |
|---|---|---|---|
| 3 | `rename-projects-to-build-data.sql` | Rewrites `role_permission_grants` `projects:*`→`build:*`, `org_modules.module_key` `projects`→`build`, `organizations.enabled_modules` `PROJECTS`→`BUILD`, `user_module_access`, `module_setup_checklists` | No (0 orgs, 0 grants) |
| 4 | `backfill-org-modules-from-enabled-modules.sql` | Inserts `org_modules` rows from `organizations.enabled_modules` for any org that lacks them | No (0 orgs) |
| 5 | `grant-directory-keys.sql` | Copies `directory:*`/`workforce:*` grants to roles holding `hr:employees:*` grants | No (0 roles with data) |
| 6 | `fix-support-agent-routing-cross-tenant.sql` | Tenant-isolation fix for support agent routing uniqueness | No (0 orgs) |
| 7 | `drop-dead-tables.sql` | Drops 7 dead tables: `service_accounts`, `allowance_types`, `course_enrollments`, `courses`, `course_categories`, `training_attendance`, `training_programs`. Also deletes `hr:learning:%` grants. **NOT** `payroll_statutory_rule_sets` (has 8 seeded rows — see below). | **YES** — these tables exist in the current DB |

`payroll_statutory_rule_sets` is excluded from `drop-dead-tables.sql` by design. It holds 8 seeded
Indian statutory rule sets (`is_system_default = true`, `org_id = NULL`) and must not be dropped
until the payroll-statutory feature is confirmed abandoned or the seed data is migrated.

These scripts should run in the numbered order. Step 3 must precede Step 4 so the module vocabulary
is normalized before the backfill reads it. Step 7 is last because it is destructive.

---

## DEFERRED — do not run yet

- **`party-cutover-phase{1,2,3,5,7}.sql`** — needs ≥7-day shadow-read parity between phases and
  ≥30 days / 2 releases of zero legacy use before Phase 7 drops anything.
- **`rls-phase{1,2,3}.sql`** — HARD-BLOCKED on **GATE 0.5**: the Neon pooler transaction-locality
  test must pass first. If `set_config(..., true)` is not transaction-local under the pooler,
  enabling RLS causes cross-tenant leakage. `src/db/rls-context.ts` is authored but not wired.

---

## Wave 0 gate status

| Gate | Status |
|---|---|
| 0.1 — Create `prod-recon-baseline` Neon backup branch | PENDING operator action |
| 0.2 — Journal reconciliation | DONE (2026-07-27, commits `28dbfe4` + `2baf093`) |
| 0.3 — Generate + apply migrations for code-only tables | DONE (confirmed in live DB 2026-07-28) |
| 0.4 — Prove clean DB reaches head reproducibly | **DONE** (2026-07-28 — DB wiped + rebuilt, 782 tables) |
| 0.5 — Neon pooler transaction-locality test | PENDING operator action (hard gate for all RLS) |

---

## Document status

| Document | Status |
|---|---|
| `STATUS.md` (this file) | Authoritative current snapshot — verified 2026-07-28 |
| `pending-operator-sql-runbook.md` | **UPDATED 2026-07-28** — was stale (claimed none had executed); Step 1a had wrong column names (`is_org_owner`/`organization_id` → `is_owner`/`org_id`); Step 2 marked DONE; journal count corrected to 70 |
| `wave-12-dead-code-inventory.md` | **UPDATED 2026-07-28** — all 5 zombie endpoints confirmed removed; users dead columns confirmed dropped by 0334; `journal_lines` dimension columns confirmed NOT dead (actively used by accounting-gl); dead tables §1 status updated |
| `PROGRAM-INDEX.md` | **UPDATED 2026-07-28** — journal count corrected to 70; GATE 0.4 marked DONE; §3b refreshed |
| `wave-0-baseline-migration-runbook.md` | **HISTORICAL** — squash approach superseded by discrete migrations 0307–0349; Phase 0 (extension bootstrap) and Phase 9 (RLS pooler test) still relevant |
| `GO-LIVE-runbook.md` | **HISTORICAL** — describes a session blocked by Neon compute quota; waves described are now incorporated into the migration chain |
| `wave-1-execution-plan.md` through `wave-9-infra-retirement-plan.md` | Live planning docs for outstanding program work; content not re-verified against DB in this pass |
| `wave-0-rls-matrix.md` | Outstanding reference for RLS design; GATE 0.5 pooler test not yet run |
| `wave-7-composite-fk-matrix.md`, `wave-0-composite-fk-matrix-*.md` | FK work now largely incorporated into 0322–0324 migrations; matrices retain value as design reference |
| `party-cutover-plan.md`, `rls-rollout-plan.md` | Live plans — gated on observation windows and GATE 0.5 respectively |
