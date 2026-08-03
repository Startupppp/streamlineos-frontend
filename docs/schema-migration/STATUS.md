---
type: schema-migration state snapshot
date: 2026-08-01
verified: |
  Re-verified 2026-08-01 against the live DB and `backend/migrations/meta/_journal.json`:
  journal entry count (108), last migration tag and idx (`0383_rls_org_members_identity_read`,
  idx 107), `drizzle.__drizzle_migrations` row count (114), full ledger-to-journal reconciliation
  (discrepancy RESOLVED — 4 skipped migrations, 8 duplicates, 2 unjournaled rows), GATE 0.5 status
  (PASSED), live RLS policy predicates on all nullable-tenant tables and on organization_members,
  next migration number (0384).
  Carried over unverified from 2026-07-28: table count in `public` schema (marked stale),
  cold-rebuild instructions, extensions list, ALTER…USING gotcha, operator SQL descriptions and
  ordering, wave 0 gate statuses 0.1–0.3, document status entries.
---

# Schema Migration Status — 2026-08-01

## Current verified state

| Item | Value |
|---|---|
| Journal entries | **108** (idx 0–107); verified 2026-08-01 against `backend/migrations/meta/_journal.json` |
| `drizzle.__drizzle_migrations` rows | **114** — reconciled 2026-08-01; the gap is 8 duplicate + 2 unjournaled rows minus 4 never-applied migrations. **See "RESOLVED" section below — the count was benign, what it exposed was not.** |
| Last journal entry | idx 107 = `0383_rls_org_members_identity_read` |
| Tables in `public` schema | **unverified** — 782 was the count from the 2026-07-28 cold rebuild; subsequent migrations have added tables; not re-confirmed 2026-08-01 |
| Organizations in DB | **3 orgs** / 4 users / 4 `organization_members` rows (verified 2026-08-01). The "0 organizations" figure carried from 2026-07-28 is stale — the DB is no longer empty, so the pending operator-SQL steps below are **no longer no-ops**. Re-check each one's blast radius before running. |
| GATE 0.4 (clean-DB reproducibility) | **INVALIDATED** (2026-08-01) — passed on 2026-07-28, but 4 journaled migrations have since been skipped by `db:migrate` and exist only in a cold rebuild. Live DB and cold-rebuild output have diverged. |
| GATE 0.5 (Neon pooler transaction-locality) | **PASSED** (2026-08-01) — POOL-01 executed; `pnpm db:verify-rls` asserts it as a permanent regression check |

Migration range: `0000_light_vance_astro` (idx 0) through `0383_rls_org_members_identity_read` (idx 107).

Note on numbering: idx 107 is tagged `0383`, not `0382`. `0382_drop_user_permissions` was authored in
the same session and is journaled after it. Drizzle applies migrations in journal order and keys on
the tag, so the filename prefix and the apply order intentionally differ here. Do not "fix" the
numbering by editing applied entries — that changes their hash.

---

## RESOLVED 2026-08-01: journal / DB ledger discrepancy — and the real problem behind it

The count gap was reconciled by matching every `drizzle.__drizzle_migrations.created_at` against
every journal `when`. The arithmetic closes exactly:

```
delta 6 = duplicates(8) + unjournaled(2) - pending(4)
```

The count was never the issue. Three separate defects were hiding inside it:

**1. Four journaled migrations have NEVER been applied and never will be by `db:migrate`.**

| idx | tag |
|---|---|
| 74 | `0354_drop_dead_types` |
| 86 | `0366_role_column_defaults` |
| 87 | `0367_drop_dead_user_preferences` |
| 88 | `0368_rename_ceo_to_final` |

Their `when` values sit BELOW the `created_at` of migrations already applied. `drizzle-kit migrate`
applies only entries newer than the last applied row, so an entry inserted out of chronological
order is skipped permanently and silently — re-running `db:migrate` reports "no pending migrations"
and will never pick them up.

**This invalidates GATE 0.4 for the current database.** A cold rebuild from empty applies the whole
journal in idx order, including these four; the live DB never got them. Cold-rebuild output and live
DB have therefore diverged, so the live DB is no longer proof of chain reproducibility. GATE 0.4's
2026-07-28 PASS remains true only for the chain as it stood that day.

**2. Eight migrations were applied twice** (`0350`, `0352`, `0369`, `0374`–`0378`), each with a
duplicate ledger row at an identical `created_at`. They survived only because their DDL happens to
be idempotent (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, guarded `DO` blocks). Non-idempotent
DDL in that position would have aborted the run. The likely cause is `db:bootstrap` (which applies
each migration on its own connection) overlapping with `db:migrate`; that was not confirmed.

**3. Two ledger rows are unjournaled** (`created_at` 1784993501607 and 1784993502607) — applied from
journal entries that were subsequently renamed or removed.

**Required before the next cold rebuild** (operator decisions — none taken yet):
- Review the four skipped migrations and decide, per migration, whether its DDL is still required
  against the current schema. Several look like drops/renames that later migrations may have
  superseded; applying them blindly is not safe.
- Decide whether to renumber their `when` values to the end of the chain (making them apply, and
  changing cold-rebuild ORDER) or to retire them from the journal (making the live DB authoritative).
  These two options produce different end states — pick deliberately.
- Deduplicate the ledger only after the above, and re-run `pnpm db:verify-rls`.

Do not treat `db:migrate` reporting "no pending migrations" as evidence the chain is fully applied.

---

## Note: FORCE ROW LEVEL SECURITY is not required

An earlier draft of the RLS design assumed every table needed `ALTER TABLE … FORCE ROW LEVEL
SECURITY`. This is incorrect. `FORCE ROW LEVEL SECURITY` applies policies to the table owner;
it is only necessary when the connecting role owns the table AND you want policies to apply to it.

The actual security boundary is the connecting role's `BYPASSRLS` attribute. The app connects
as `streamline_app`, which has been verified to have `rolbypassrls = false` — RLS policies
therefore apply unconditionally without `FORCE ROW LEVEL SECURITY`. Do not add `FORCE ROW LEVEL
SECURITY` to migrations unless the ownership model changes.

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
   number (currently `0381` for the next migration).
2. Prepend `SET statement_timeout = 0;` if the migration contains a PL/pgSQL `DO $$...$$` block
   that adds many constraints in a single statement. Without it, Neon's default timeout cancels
   the statement on a cold DB.
3. Add a breakpoint marker before each top-level DDL statement:
   ```sql
   --> statement-breakpoint
   ```
4. Append to `backend/migrations/meta/_journal.json`:
   ```json
   { "idx": 106, "version": "7", "when": <unix-ms>, "tag": "0381_your_name", "breakpoints": true }
   ```
   `idx` must equal the position in the `entries` array (0-based). Do not skip or reuse indices.
5. Run `pnpm -C backend db:migrate` — it applies only the new entry.
6. Verify with `SELECT count(*) FROM drizzle.__drizzle_migrations`.
   Note: do not assert an exact expected count until the journal/DB discrepancy (see above) is
   resolved. The current live count (112) is 6 ahead of the journal (106).

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

## Remaining operator SQL (pending as of 2026-08-01)

These are **data-migration scripts** — not journaled Drizzle migrations. They update existing rows
in a populated database. On the current fresh DB (0 organizations) they are no-ops except where noted.

Run each via `psql "$DATABASE_URL" -f docs/schema-migration/<file>` in the listed order.

| # | Script | Purpose | Needed on fresh DB? |
|---|---|---|---|
| 3 | ~~`rename-projects-to-build-data.sql`~~ | **DELETED 2026-08-03.** Rename already complete (all 4 targets = 0 across both orgs) and the script referenced the dropped `organizations.enabled_modules` column, so it would have aborted its own transaction | Never — script removed |
| 4 | ~~`backfill-org-modules-from-enabled-modules.sql`~~ | **DELETED 2026-08-03.** Read from `organizations.enabled_modules`, which no longer exists; `org_modules` is now the only module vocabulary | Never — script removed |
| 5 | `grant-directory-keys.sql` | Copies `directory:*`/`workforce:*` grants to roles holding `hr:employees:*` grants | No (0 roles with data) |
| 6 | `fix-support-agent-routing-cross-tenant.sql` | Tenant-isolation fix for support agent routing uniqueness | No (0 orgs) |
| 7 | `drop-dead-tables.sql` | Drops 7 dead tables: `service_accounts`, `allowance_types`, `course_enrollments`, `courses`, `course_categories`, `training_attendance`, `training_programs`. Also deletes `hr:learning:%` grants. **NOT** `payroll_statutory_rule_sets` (has 8 seeded rows — see below). | **YES** — these tables exist in the current DB |
| 8 | `purge-stale-permission-keys.sql` | Deletes 7 stale permission rows and all their grants from `permissions` / `role_permission_grants`: `hr:workforce:view` (renamed; replacement grants added by step 5), `blog:categories:manage`, `blog:posts:manage`, `branch:manage_targets`, `surveys:settings:manage`, `surveys:templates:manage`, `workflows:templates:manage`. Bumps `access_versions.permissions_version` for all orgs. | No (0 orgs, 0 grants) |

`payroll_statutory_rule_sets` is excluded from `drop-dead-tables.sql` by design. It holds 8 seeded
Indian statutory rule sets (`is_system_default = true`, `org_id = NULL`) and must not be dropped
until the payroll-statutory feature is confirmed abandoned or the seed data is migrated.

These scripts should run in the numbered order. Step 3 must precede Step 4 so the module vocabulary
is normalized before the backfill reads it. Step 7 is last among the destructive steps. Step 8 must
run after Step 5 (`grant-directory-keys.sql`) so that replacement `workforce:workers:view` grants
are in place before the old `hr:workforce:view` grants are removed.

---

## DEFERRED — do not run yet

- **`party-cutover-phase{1,2,3,5,7}.sql`** — needs ≥7-day shadow-read parity between phases and
  ≥30 days / 2 releases of zero legacy use before Phase 7 drops anything.
- ~~**`rls-phase{1,2,3}.sql`**~~ — **SUPERSEDED** — RLS work shipped as journaled migrations
  `0374`–`0378`; migration `0380` repaired the `WITH CHECK` predicate on nullable tenant columns.
  The standalone phase scripts are no longer the delivery vehicle. Do not run them.

---

## Wave 0 gate status

| Gate | Status |
|---|---|
| 0.1 — Create `prod-recon-baseline` Neon backup branch | PENDING operator action |
| 0.2 — Journal reconciliation | DONE (2026-07-27, commits `28dbfe4` + `2baf093`) |
| 0.3 — Generate + apply migrations for code-only tables | DONE (confirmed in live DB 2026-07-28) |
| 0.4 — Prove clean DB reaches head reproducibly | **DONE** (2026-07-28 — DB wiped + rebuilt; table count was 782 at that time, now unverified) |
| 0.5 — Neon pooler transaction-locality test | **PASSED** (2026-08-01) — POOL-01 executed; `pnpm db:verify-rls` asserts it as a permanent regression check |

---

## Document status

| Document | Status |
|---|---|
| `STATUS.md` (this file) | **Updated 2026-08-01** — journal count (70→106), last migration tag, DB row count discrepancy open question, GATE 0.5 marked PASSED, next migration number (0350→0381), RLS DEFERRED entry marked SUPERSEDED, FORCE RLS correction note added, operator SQL step 8 added |
| `pending-operator-sql-runbook.md` | **UPDATED 2026-07-28** — was stale (claimed none had executed); Step 1a had wrong column names (`is_org_owner`/`organization_id` → `is_owner`/`org_id`); Step 2 marked DONE; journal count corrected to 70 |
| `wave-12-dead-code-inventory.md` | **UPDATED 2026-07-28** — all 5 zombie endpoints confirmed removed; users dead columns confirmed dropped by 0334; `journal_lines` dimension columns confirmed NOT dead (actively used by accounting-gl); dead tables §1 status updated |
| `PROGRAM-INDEX.md` | **UPDATED 2026-07-28** — journal count corrected to 70; GATE 0.4 marked DONE; §3b refreshed |
| `wave-0-baseline-migration-runbook.md` | **HISTORICAL** — squash approach superseded by discrete migrations 0307–0349; Phase 0 (extension bootstrap) still relevant; Phase 9 (RLS pooler test) now DONE (GATE 0.5 PASSED) |
| `GO-LIVE-runbook.md` | **HISTORICAL** — describes a session blocked by Neon compute quota; waves described are now incorporated into the migration chain |
| `wave-1-execution-plan.md` through `wave-9-infra-retirement-plan.md` | Live planning docs for outstanding program work; content not re-verified against DB in this pass |
| `wave-0-rls-matrix.md` | Outstanding reference for RLS design; GATE 0.5 now PASSED (2026-08-01) |
| `wave-7-composite-fk-matrix.md`, `wave-0-composite-fk-matrix-*.md` | FK work now largely incorporated into 0322–0324 migrations; matrices retain value as design reference |
| `party-cutover-plan.md` | Live plan — gated on observation windows; deferral unchanged |
| `rls-rollout-plan.md` | Live plan — GATE 0.5 now PASSED; rollout sequence still relevant; do not edit per task constraints |
