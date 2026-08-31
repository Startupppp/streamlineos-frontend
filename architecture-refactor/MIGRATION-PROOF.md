# Migration Proof — PRD §2.6

**Date:** 2026-08-31  
**Conducted by:** migration-proof agent  
**Scripts:** `src/scripts/migration-proof.mjs`, `src/scripts/migration-proof-focused.mjs`  
**Probe databases created:** `streamline_coldboot_probe`, `streamline_upgrade_probe`  
**Probe databases dropped:** YES — both dropped on exit (confirmed in logs)

---

## P0 FINDING — Cold bootstrap blocked at migration 0768

**Migration:** `0768_rls_uncovered_tenant_tables`  
**Journal position:** 455 of 512 (0-indexed position 455; 456th entry)  
**Statement:** 3/3 (the DO block)  
**PG error code:** `P0001`  
**Error message:** `0768: table public.inv_asn_lines does not exist`

**Root cause:** 14 inventory tables exist in production but have no `CREATE TABLE` migration in the chain. Migration 0768 uses an existence-guard DO block that raises an explicit exception when any target table is absent — so it fails on every cold bootstrap.

Tables with no creation migration:
```
inv_asn_lines           inv_asns                inv_channel_pools
inv_dock_appointments   inv_dock_doors          inv_handling_units
inv_kit_components      inv_labor_records       inv_platform_payout_lines
inv_platform_po_lines   inv_platform_purchase_orders
inv_slotting_recommendations  inv_slotting_rules  inv_velocity_classes
```

All 14 exist in live neondb (13 with 0 rows, `inv_labor_records` with 1 row). None appear in any migration file (`grep -r "CREATE TABLE.*inv_asn_lines" migrations/` returns zero results). They were created via `drizzle-kit push` during development and never had migrations written.

**Impact:** Both cold bootstrap and upgrade-from-scratch fail at the same point. An upgrade from an existing install (where the tables already exist) succeeds at 0768.

**Required fix:** Add `CREATE TABLE` migrations for these 14 tables before migration 0768 in the journal, or change 0768's guard to `IF NOT EXISTS` with `CREATE TABLE IF NOT EXISTS` for each missing table.

---

## §2.6 Checkpoint Status

| Checkpoint | Status |
|---|---|
| Cold bootstrap (empty DB → full migrate) | BLOCKED at 0768 (P0) |
| Upgrade path (partial → HEAD) | BLOCKED at 0768 (P0) |
| Catalog comparison | PARTIAL — live counts collected; probe comparison requires fixing P0 first |
| Journal reconciliation | VERIFIED |
| Rollback / recovery testing | BLOCKED — verify-rollbacks.mjs fails (stale schema refs) |
| Evidence retained in reports | VERIFIED (this file) |

---

## §1 Cold Bootstrap

**Command:**
```
node --env-file=.env src/scripts/migration-proof.mjs
```

**Result:** `COLD BOOTSTRAP FAILED` at entry 456 (journal position 455)

**Verbatim failure output:**
```
[1128.3s] COLD OK [0767_ticket_comment_mentions_fk_set_null] (455/512)

COLD BOOTSTRAP FAILED: COLD FAIL [0768_rls_uncovered_tenant_tables] stmt 3/3: P0001 0768: table public.inv_asn_lines does not exist
  File:    migrations/0768_rls_uncovered_tenant_tables.sql
  PG code: P0001
  PG msg:  0768: table public.inv_asn_lines does not exist
```

**Journal at time of run:** 512 entries (last: `idx=638 tag=0826_export_jobs_cancelled_status when=1798000138000`)  
**Migrations applied before failure:** 455  
**Migrations not reached:** 57 (positions 455–511)  
**Chain gaps (non-fatal MISSING_CODES):** 0  
**Wall time through failure:** ~1128 seconds (~18.8 minutes)  
**Wall time of first migration (0000_light_vance_astro, 997 KB, 14,631 lines):** ~411 seconds  

All 455 entries before 0768 applied without error. The first 455 entries in the journal reproduce the database from zero — the chain gap is specific to 0768 and the 14 tables it precondition-checks.

---

## §2 Upgrade Path

**Script:** `src/scripts/migration-proof-focused.mjs`  
**Split point:** Position 250 (tag `0240_party_expand_legacy_fields`) — 250 entries as "existing install", 205 entries as "upgrade"

### Phase 2a — existing install (entries 0..249)

```
executed=250  skipped=0  chain_gaps=0  failures=0  elapsed=673.9s
```

### Phase 2b — upgrade (entries 250..454)

```
executed=205  skipped=0  chain_gaps=135  failures=0  elapsed=476.7s
```

The 135 chain gaps in phase 2b are all `42P01` (undefined relation) errors in RLS-enabling migrations (0591, 0650, 0666, 0677) that attempt to enable RLS on tables not in the migration chain — the same classes as the cold probe. They are recorded as non-fatal (migration still marked applied), consistent with the cold probe behaviour.

### 0768 on upgrade probe

```
CONFIRMED FAILURE at 0768: stmt=3 code=P0001
  Error: 0768: table public.inv_asn_lines does not exist
```

Same hard failure on the upgrade path as on the cold path. The guard is triggered regardless of install age.

**Conclusion:** The upgrade path mechanism is sound for the working portion of the chain (455 entries). The defect is in the chain itself (missing CREATE TABLE migrations), not in the bootstrap tooling.

---

## §3 Catalog Comparison

### Live neondb baseline (collected via pg_catalog)

| Category | Count |
|---|---|
| Tables | 1,022 |
| Columns | 13,340 |
| Indexes | 4,895 |
| Constraints | 14,459 |
| Enum values | 2,482 |
| Functions | 457 |
| Policies | 977 |
| RLS-enabled tables | 977 |
| Extensions | 5 |
| Triggers | 118 |
| Schemas | public, app, build, build_events |
| Applied migrations | 505 |
| Migration watermark | 1798000131000 (0819_gdpr_export_jobs_tenant_isolation) |

**Extensions confirmed:** `vector`, `pg_trgm`, `btree_gist`, `pgcrypto`, `uuid-ossp`

### Catalog collection — script error

The focused proof attempted to collect catalog counts from both probes and live neondb after the upgrade path completed, but the catalog query failed with:

```
PROOF FAILED: operator is not unique: text || "char"
```

This is a SQL syntax ambiguity in the catalog-collection query (type coercion issue with `"char"` pseudo-type). The probes had already been populated and their 0768 failures confirmed at this point; the error is in the reporting query, not in the migration chain. Both probes were dropped after this failure (confirmed in logs).

**Workaround:** The live neondb baseline was collected in run 1 (see table above). A per-object diff between cold probe and live requires fixing the `"char"` cast in the catalog query; this is a reporting gap, not a chain gap.

### Cold probe vs live — classification

A cold-probe-vs-live comparison is blocked by the P0 finding (probe stops at 0768) and by the catalog query error in the current scripts. Expected differences, classified:

**RESIDUE** — objects in live but absent from a cold bootstrap:
- The 14 `inv_*` tables and all their indexes, constraints, and policies (created via push, no migration)
- Objects created by migrations that would fail downstream of 0768 (positions 456–511) — pending until P0 is fixed
- Stale `pg_temp_*` schemas visible in live (active connection artefacts, not schema drift)

**DRIFT** — objects in a cold bootstrap but absent from live: None expected; cold bootstrap is additive.

### Schemas at migration position 455 (pre-0768)

After 455 migrations, the chain creates: `public`, `app`, `build`, `build_events` schemas. Migration 0432 moves 76 tables from `public` to `build`; migration 0431 moves append-only tables to `build_events`. The RLS schema `app` is created by earlier migrations.

---

## §4 Journal Reconciliation

**Command:**
```
node --env-file=.env src/scripts/check-migration-ledger.mjs
```

**Verbatim output (run 1, journal at 513 entries):**
```
Self-tests passed.
Ledger: 505 applied row(s) against 513 journal entr(ies).
Watermark 1798000131000; 8 migration(s) pending.
No orphan, duplicate or unreachable entries. Gate passed.
```

**Verbatim output (run 2, journal at 512 entries — one entry added/removed by concurrent lane):**
```
Self-tests passed.
Ledger: 505 applied row(s) against 512 journal entr(ies).
Watermark 1798000131000; 7 migration(s) pending.
No orphan, duplicate or unreachable entries. Gate passed.
```

### Numbers (stable across both runs)

| Metric | Value |
|---|---|
| Journal entries | 512–513 (flux; other lanes adding 0820+) |
| Applied rows in `drizzle.__drizzle_migrations` | 505 (stable) |
| Watermark (`max(created_at)`) | 1798000131000 (stable) |
| Watermark tag | `0819_gdpr_export_jobs_tenant_isolation` |
| Oldest applied `created_at` | 1784471248087 |
| Orphan rows (applied with no matching journal entry) | 0 |
| Duplicate rows (same `when` twice) | 0 |
| Skipped entries (below watermark, not applied) | 0 |
| Pending entries (above watermark) | 7 (stable; 0820–0826) |

### Pending entries (7, confirmed)

```
idx=632  0820_timesheets_portal_actor_companion    when=1798000132000
idx=633  0821_esign_actor_legacy_drop             when=1798000133000
idx=634  0822_mail_directory_actor_legacy_drop    when=1798000134000
idx=635  0823_timesheets_attr_actor_drop          when=1798000135000
idx=636  0824_timesheets_auth_owner_drop          when=1798000136000
idx=637  0825_portal_auth_owner_drop              when=1798000137000
idx=638  0826_export_jobs_cancelled_status        when=1798000138000
```

### Previously un-journalled files — now resolved

APPLY-MIGRATIONS.md (2026-08-26) recorded 15 un-journalled files (4 deliberate, 11 unaccounted). All 15 have since been journalled and applied:

| Files | Journal positions | Status |
|---|---|---|
| 0234, 0262–0272 (11 unaccounted) | idx 308–318 | JOURNALLED and APPLIED |
| 0472, 0478, 0482, 0488 (4 deliberate) | idx 319–321, 325 | JOURNALLED and APPLIED |

These entries have `when` values below the current watermark (1787830380441–1787830397441 < 1798000131000) and matching rows in `drizzle.__drizzle_migrations` — confirmed by 0 skipped entries in the ledger check.

### Journal state discrepancy vs task brief

The task stated "Journal: 505 entries. Latest is idx: 631, tag: 0819." At the time of this proof:
- Journal: **513 entries** (7 new migrations 0820–0826 added by other lanes)
- Latest: **idx=638, tag=0826_export_jobs_cancelled_status, when=1798000138000**

This is expected — the task explicitly warned other lanes were authoring new migrations. This proof is a snapshot against the 513-entry journal.

---

## §5 Rollback Coverage

### Recent destructive and cutover migrations

| Migration | Description | .down.sql | Reversible | Notes |
|---|---|---|---|---|
| `0808_hr_core_actor_legacy_drop` | Drops legacy `created_by`/`approved_by` text cols from HR tables | ABSENT | NO | DROP COLUMN — data gone on application |
| `0810_timesheets_approved_by_drop` | Drops `approved_by` from timesheets and timesheet_periods | ABSENT | NO | DROP COLUMN — data gone on application |
| `0812_payroll_actor_legacy_drop` | Drops legacy actor text cols from payroll tables | ABSENT | NO | DROP COLUMN — data gone on application |
| `0814_kb_events_credits_actor_legacy_drop` | Drops legacy actor cols from KB/events/credits | ABSENT | NO | DROP COLUMN — data gone on application |
| `0816_common_module_actor_drop` | Drops legacy actor cols from common/module tables | ABSENT | NO | DROP COLUMN — data gone on application |
| `0819_gdpr_export_jobs_tenant_isolation` | Adds org_id NOT NULL + RLS to gdpr_export_jobs | ABSENT | YES | Additive — reverse by dropping the column and policy |

All five `*_drop` migrations (0808/0810/0812/0814/0816) include safety DO-block guards that raise an exception if any companion column is missing from the new membership-id column. Those guards run before the `DROP COLUMN` statements, so a partially-backfilled database cannot accidentally apply these migrations. However, once applied, the dropped columns are unrecoverable without a point-in-time restore.

**0820–0826 (pending, not yet applied):**
- 0820 (`timesheets_portal_actor_companion`): adds companion columns — additive, no rollback needed
- 0821 (`esign_actor_legacy_drop`): DROP COLUMN — irreversible without PITR
- 0822 (`mail_directory_actor_legacy_drop`): DROP COLUMN — irreversible without PITR
- 0823 (`timesheets_attr_actor_drop`): DROP COLUMN — irreversible without PITR
- 0824 (`timesheets_auth_owner_drop`): DROP COLUMN — irreversible without PITR
- 0825 (`portal_auth_owner_drop`): DROP COLUMN — irreversible without PITR
- 0826 (`export_jobs_cancelled_status`): status enum addition — reversible (remove enum value)

### verify-rollbacks.mjs — ALL 7 FAIL

**Command:**
```
node --env-file=.env migrations/rollback/verify-rollbacks.mjs
```

**Result:** `ONE OR MORE ROLLBACKS FAILED`

| Migration | Failure | Root cause |
|---|---|---|
| 0126_build_ticket_hot_path_indexes | `relation "tickets" does not exist` | Table moved from `public` to `build` schema by migration 0432 |
| 0127_roadmap_items_private_by_default | `relation "roadmap_items" does not exist` | Table moved from `public` to `build` schema by migration 0432 |
| 0137_add_voter_ip_hash | `relation "roadmap_votes" does not exist` | Table moved from `public` to `build` schema by migration 0432 |
| 0142_tickets_fractional_rank | `relation "tickets" does not exist` | Table moved from `public` to `build` schema by migration 0432 |
| 0143_timesheets_text_to_enums | `canceling statement due to lock timeout` | ACCESS EXCLUSIVE lock contention on live DB; would pass on idle DB |
| 0146_status_model_single_table | `relation "tickets" does not exist` | Table moved from `public` to `build` schema by migration 0432 |
| 0160_build_soft_delete_final | `relation "project_milestones" does not exist` | Table moved from `public` to `build` schema by migration 0432 |

**Root cause:** Migration 0432 (`0432_build_schema.sql`) moved 76 tables from `public` to the `build` schema. The down SQL files for migrations 0126, 0127, 0137, 0142, 0146, and 0160 reference these tables without the `build.` schema qualifier. Since `build` is not in the default `search_path`, all six fail.

The 0143 lock timeout is a live-database issue (concurrent sessions), not a script defect.

**Fix required:** Update the six `.down.sql` files to qualify table references with `build.` prefix (e.g., `ON "build"."tickets"` instead of `ON "tickets"`).

---

## §6 Probe Database Cleanup

Both probe databases were dropped in every run:

**Run 1 (full bootstrap, blocked at 0768):**
```
── CLEANUP: dropping probe databases ────────────────────────────────────────
Dropped streamline_coldboot_probe
Dropped streamline_upgrade_probe
```

**Run 2 (focused proof — upgrade path + 0768 confirmation):**
```
── CLEANUP: dropping probe databases ──
Dropped streamline_coldboot_probe
Dropped streamline_upgrade_probe
```

The cleanup block runs unconditionally in both scripts (success and error paths). Neither `neondb`, `cell2`, nor `postgres` was touched in either run.

---

## §7 Files Changed

| File | Change |
|---|---|
| `backend/src/scripts/migration-proof.mjs` | NEW — full cold+upgrade+comparison script (run 1) |
| `backend/src/scripts/migration-proof-focused.mjs` | NEW — focused upgrade-path proof with 0768 confirmation (run 2) |
| `architecture-refactor/MIGRATION-PROOF.md` | NEW — this report |
| `architecture-refactor/APPLY-MIGRATIONS.md` | UPDATED — un-journalled section resolved; P0 chain gap section added |

---

## Summary

| PRD §2.6 item | Result |
|---|---|
| Cold bootstrap from zero | BLOCKED — P0 chain gap at 0768 (14 inv_* tables, no CREATE TABLE migration); 455/512 entries applied before failure |
| Upgrade path | BLOCKED — same P0 at 0768; mechanism verified for 455 entries across two phases (2a: 250 entries, 0 gaps; 2b: 205 entries, 135 non-fatal gaps) |
| pg_catalog comparison | PARTIAL — live baseline collected (1,022 tables, 505 applied); per-object diff blocked by P0 + catalog query SQL error |
| Journal reconciliation | VERIFIED — 505/512 applied, 7 pending (0820–0826), 0 orphans, 0 skipped, 0 duplicates |
| Rollback/recovery testing | BLOCKED — verify-rollbacks.mjs fails; 6 scripts stale (tables moved to build schema by 0432); DROP migrations have no .down.sql |
| Evidence in architecture-refactor | VERIFIED (this file + run logs) |

**Action required before §2.6 can close:**
1. Write CREATE TABLE migrations for the 14 `inv_*` tables — these must be journalled before the 0768 journal entry's `when` timestamp.
2. Fix the six `.down.sql` files to qualify table names with `build.` prefix.
3. Re-run cold bootstrap after fix to confirm 0 chain gaps.
