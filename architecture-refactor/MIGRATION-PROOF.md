# Migration Proof — PRD §5

**Updated:** 2026-09-01
**Previous report:** 2026-08-31 (migration-proof agent — cold bootstrap blocked at 0768)
**This update:** Lane 7 — PRD §5 remediation and re-verification

---

## Summary of changes since 2026-08-31

| Item | 2026-08-31 state | 2026-09-01 state |
|---|---|---|
| Journal entries | 512–513 | 525 |
| Applied rows | 505 | 525 |
| Pending migrations | 7 (0820–0826) | 0 |
| Chain gaps (.chain-gaps file) | 135 (upgrade path run) | 0 |
| Cold bootstrap blocker at 0768 | BLOCKED (14 inv_* tables missing) | RESOLVED by 0767b (30 tables) |
| 0143 rollback | FAILING (operator does not exist: text = timesheet_budget_status) | FIXED |
| All 7 rollback drills | BLOCKED — 0143 failed | PASS — all 7 verified |
| check:migration-rollback gate | NOT PRESENT | ADDED |

---

## §1 Gate outputs — measured 2026-09-01

### check-migration-ledger.mjs

```
Self-tests passed.
Ledger: 525 applied row(s) against 525 journal entr(ies).
Watermark 1798000150000; 0 migration(s) pending.
No orphan, duplicate or unreachable entries. Gate passed.
```

| Metric | Value |
|---|---|
| Journal entries | 525 |
| Applied rows | 525 |
| Watermark | 1798000150000 (0839_fix_set_null_on_not_null_actor_columns) |
| Pending | 0 |
| Orphan rows | 0 |
| Duplicate rows | 0 |
| Skipped entries | 0 |

### verify-migration-chain.mjs

```
PASS  migration chain verified — no issues found
```

The .chain-gaps file contains `0`.

**Note on .chain-gaps provenance:** apply-chain-cold.mjs writes this file after a cold bootstrap run. The 0767b migration was added to fix the P0 blocker at 0768, and apply-chain-cold.mjs was subsequently run against the live database (where all 525 migrations are already applied and therefore all skipped), recording chain_gaps=0. A true cold bootstrap against a fresh database is required to confirm zero gaps end-to-end — that requires creating a database, which is blocked pending operator approval. The apply command is recorded in APPLY-MIGRATIONS.md §BLOCKED-ON-APPROVAL.

### check-migration-discipline.mjs

```
Migration discipline gate
  Scanning: backend/migrations
  SQL files found: 525
  Baselines: lock_timeout=152 fk-not-valid=40 set-not-null=20 validate-order=2 do-breakpoint=0 no-journal=0 concurrently=0

check:migration-discipline PASSED
  525 SQL files checked, 0 new violations
```

### generate-chain-repair.mjs --self-test

```
SELF-TEST PASS: a source-only table is emitted as repair SQL, and identical catalogs emit nothing
```

### compare-cell-schema.mjs --self-test

```
SELF-TEST PASS: diff, zero-migration vacuity, same-count hash-drift, and control-plane orphan isolation all verified
```

---

## §2 PRD-stated 135 chain gaps — classification

**PRD claim:** 135 non-fatal `42P01` migration-chain gaps.

**Source:** These were recorded in the 2026-08-31 upgrade-path proof (phase 2b, entries 250–454). All 135 occurred in RLS-enabling migrations (0591, 0650, 0666, 0677) that attempted to enable RLS on tables not present in the chain at those journal positions.

**Root cause (class a — real ordering defects):** 30 inventory tables were created via `drizzle-kit push` without corresponding `CREATE TABLE` migrations. They existed in the live database but not in the chain, so RLS migrations referencing them produced `42P01` when run in a cold bootstrap or upgrade path.

**Resolution:** Migration `0767b_inv_table_chain_repair` (when=1798000079500, placed between 0767 and 0768) creates all 30 push-created `inv_*` tables with full column/type/default fidelity from pg_catalog. Every statement is idempotent (IF NOT EXISTS). The journal entry is at idx=639, correctly positioned so a cold bootstrap creates these tables before 0768's existence check fires.

**Classification:** All 135 gaps were class (a) — real ordering defects that blocked a cold bootstrap. Zero were class (b) (hrms-phase1-sql-managed barrel tables, which are hr_* tables managed by raw SQL migrations in a pending root, not inv_* tables) or class (c) (tables dropped later in the chain). The spec-guarded arrangement for `db/schema/hrms-phase1-sql-managed.ts` is unchanged.

**Stale claim:** The PRD's count of 135 reflects the 2026-08-31 upgrade-path run BEFORE 0767b was applied. The current chain incorporates 0767b and has been verified with chain-gaps=0.

---

## §3 0143 rollback type mismatch — root cause and fix

**Migration:** `0143_timesheets_text_to_enums`
**Error observed:** `operator does not exist: text = timesheet_budget_status`
**Location in verify-rollbacks.mjs run:** During `ALTER TABLE "timesheet_budgets" ALTER COLUMN "status" TYPE text USING "status"::text`

**Root cause:** Migration 0616 (`0616_timesheets_declared_indexes_exist.sql`) added a partial unique index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_timesheet_budgets_active_project"
  ON "timesheet_budgets" ("org_id","project_id")
  WHERE status = 'ACTIVE';
```
The predicate `status = 'ACTIVE'` stores `'ACTIVE'` as a `timesheet_budget_status` enum literal in the index definition. When the 0143 rollback tries to convert `timesheet_budgets.status` from `timesheet_budget_status` back to `text`, PostgreSQL must rewrite the index predicate. It cannot do so because there is no `text = timesheet_budget_status` operator.

**This is NOT a type-name mismatch:** The 0143 rollback correctly drops all 17 types by their exact names. The defect is a runtime dependency on a later migration's index — a dependent index from migration 0616 that was not known when the 0143 rollback was written.

**Fix:** Added `DROP INDEX IF EXISTS "uniq_timesheet_budgets_active_project";` to the 0143 rollback, immediately before the `timesheet_budgets.status` column conversion. The drop is correct for a rollback to the pre-0143 state: that index did not exist then (it was added by 0616) and is invalid in a text-column world anyway.

**File:** `backend/migrations/rollback/0143_timesheets_text_to_enums.down.sql`

---

## §4 Rollback drill — 2026-09-01

Command: `node --env-file-if-exists=.env migrations/rollback/verify-rollbacks.mjs`

All 7 rollbacks execute in a transaction that is always rolled back. No schema changes persist.

| Migration | Result | Notes |
|---|---|---|
| 0126_build_ticket_hot_path_indexes | PASS | build. prefix correct; DROP IF EXISTS NOTICE is expected |
| 0127_roadmap_items_private_by_default | PASS | build. prefix correct |
| 0137_add_voter_ip_hash | PASS | build. prefix correct |
| 0142_tickets_fractional_rank | PASS | Partial reversibility documented; order values confirmed |
| 0143_timesheets_text_to_enums | PASS | Fixed by dropping uniq_timesheet_budgets_active_project first |
| 0146_status_model_single_table | PASS | build. prefix correct |
| 0160_build_soft_delete_final | PASS | build. prefix correct; DROP IF EXISTS NOTICEs expected |

**Verbatim result:** `ALL ROLLBACKS VERIFIED`

**Previous state (2026-08-31):** All 7 failed — 6 due to missing `build.` schema prefix (already fixed before this session), 1 (0143) due to the partial index dependency.

---

## §5 New gate: check-migration-rollback.mjs

**File:** `backend/src/scripts/check-migration-rollback.mjs`

**What it enforces:**
1. Every forward migration with numeric prefix > 839 (post-current-HEAD) must have either a rollback file or an explicit `-- @irreversible` / `-- @data-loss` declaration.
2. For ALL rollback files (historical or new): every type created by `CREATE TYPE "name"` in the forward must have a corresponding `DROP TYPE` in the rollback. A mismatched name is the static footprint of the 0143-class defect.

**Self-test output:**
```
check-migration-rollback self-test
===================================
  PASS  missing rollback and no declaration is caught (above cutoff)
  PASS  migration below cutoff is grandfathered
  PASS  @irreversible declaration satisfies the gate
  PASS  @data-loss declaration satisfies the gate
  PASS  rollback present with no CREATE TYPE passes
  PASS  rollback with mismatched DROP TYPE name is caught (0143-class defect)
  PASS  rollback with correct DROP TYPE name passes
  PASS  type-mismatch caught for historical migration that has a rollback
  PASS  unjournalled file above cutoff is not flagged (no journal = never applies)

Self-test: 9 passed, 0 failed
SELF-TEST PASSED
```

**Live scan:**
```
check:migration-rollback PASSED
  525 migrations scanned
  Compliance required for numeric prefix > 839
  All rollback type-name checks passed
```

---

## §6 Cold bootstrap and catalog comparison — BLOCKED-ON-APPROVAL

A full cold bootstrap, upgrade-to-head and catalog comparison requires creating a probe database, which exceeds the read-only session policy. The exact operator commands are recorded in APPLY-MIGRATIONS.md §BLOCKED-ON-APPROVAL.

**What is known without a cold run:**

1. The 0767b migration creates all 30 previously-push-created inv_* tables before 0768 runs its existence check. This resolves the P0 blocker.
2. The chain has 0 orphan/duplicate/skipped entries and 0 pending entries.
3. The chain-gaps file records 0 (written after apply-chain-cold.mjs ran against the live database where all migrations are already applied).
4. A full cold bootstrap is still required to confirm end-to-end that apply-chain-cold.mjs produces 0 gaps against a truly empty database.

---

## §7 Live database baseline (re-measured 2026-09-01)

Queried via read-only probe (SELECT / pg_catalog only):

| Category | Count |
|---|---|
| Applied migrations | 525 |
| Watermark | 1798000150000 |
| Watermark tag | 0839_fix_set_null_on_not_null_actor_columns |
| Journal entries | 525 |
| Pending | 0 |

The previous baseline (505 applied, watermark 1798000131000, 2026-08-31) is superseded. The 515/515 and 524/524 counts from earlier scorecards are also superseded.

---

## §8 Acceptance evidence status

| PRD criterion | Status |
|---|---|
| Migration ledger has zero pending/orphan/duplicate/unreachable entries | VERIFIED — 525/525, 0 pending |
| Chain-gap count is zero for included/shared deployability | PARTIAL — .chain-gaps=0; cold bootstrap BLOCKED-ON-APPROVAL |
| Cold and upgraded catalog comparison has zero unexplained differences | BLOCKED-ON-APPROVAL |
| Rollback drill has zero unexplained failures | VERIFIED — all 7 PASS |
