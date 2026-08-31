# MIG1 — Migration Integrity Report

**Date:** 2026-08-30
**DB:** Neon dev (`ep-orange-mode-azxn5hbr-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb`)
**Queried as:** `neondb_owner` (catalog queries only; no tenant data read)

---

## Task 1 — Migration 0665 audit

### File content (confirmed)

`backend/migrations/0665_kb_article_chunks_acl_revision_not_null.sql` runs in this order:
1. `SET lock_timeout = '5s'`
2. `ADD CONSTRAINT chk_kb_article_chunks_acl_revision_not_null CHECK (acl_revision IS NOT NULL) NOT VALID`
3. **`VALIDATE CONSTRAINT chk_kb_article_chunks_acl_revision_not_null`** ← before the backfill
4. `UPDATE kb_article_chunks SET acl_revision = 1 WHERE acl_revision IS NULL`
5. `ALTER COLUMN acl_revision SET NOT NULL`
6. `ALTER COLUMN acl_revision SET DEFAULT 1`
7. `DROP CONSTRAINT chk_kb_article_chunks_acl_revision_not_null`

The VALIDATE-before-backfill order is a real code defect that would abort the migration on any DB where rows with NULL `acl_revision` existed at step 3.

### Journal entry — CONFIRMED

```
idx=381, tag=0665_kb_article_chunks_acl_revision_not_null, when=1787941509254
```

### DB entry — CONFIRMED

```
id=662, hash=09628409bc8ad79f..., created_at=1787941509254
```

`created_at` matches journal `when` exactly. The migration is recorded as applied.

### Live column state — CONFIRMED against pg_catalog

```
information_schema.columns:
  column_name=acl_revision, is_nullable=NO, column_default=1, data_type=integer

pg_attribute:
  attname=acl_revision, attnotnull=True, default=1
```

### Constraint audit — CONFIRMED against pg_catalog

pg_constraint for `kb_article_chunks`:
- `kb_article_chunks_acl_revision_not_null` type=**n** (NOT NULL system constraint) — **present**
- `chk_kb_article_chunks_acl_revision_not_null` — **absent** (confirms step 7 ran)

### Table row count — CONFIRMED

```sql
SELECT COUNT(*) FROM kb_article_chunks;  -- 0
SELECT COUNT(*) FROM kb_article_chunks WHERE acl_revision IS NULL;  -- 0
```

### Execution verdict: FULLY EXECUTED

The table had **zero rows** when 0665 ran. VALIDATE (step 3) is vacuously true on an empty table — it found no NULLs, did not throw, and all six subsequent steps completed. Evidence chain:

- Journal records it (idx 381)
- DB records it (id 662, matching timestamp)
- Column is `NOT NULL DEFAULT 1`
- System NOT NULL constraint present
- `chk_` constraint absent (dropped at step 7)
- Table has 0 rows today

The VALIDATE-before-backfill bug is a **latent defect**: it did not bite here, but the same migration applied to a DB with any NULL `acl_revision` rows would abort at VALIDATE and leave the column nullable with the CHECK constraint orphaned. A forward migration correcting the order is recommended before any cold-DB replay is attempted.

### Snapshot drift from kb-chunks.ts change

The current Drizzle snapshot is `migrations/meta/0464_snapshot.json`. It does NOT contain the `acl_revision` column at all (the column was introduced after migration 0464 by a later hand-written migration, and `generate --custom` copies the snapshot instead of diffing, so no snapshot exists beyond 0464).

The change made to `kb-chunks.ts` (line 54: `integer("acl_revision")` → `.notNull().default(1)`) adds the following drift against the 0464 snapshot:

| Object | Snapshot state | Schema state after change | Live DB state |
|---|---|---|---|
| `kb_article_chunks.acl_revision` | **missing** | `integer NOT NULL DEFAULT 1` | `integer NOT NULL DEFAULT 1` |

The schema file now accurately reflects the live DB. However, if `db:generate` is run it will diff the full current schema against the 0464 snapshot and propose a massive migration including `ADD COLUMN acl_revision integer NOT NULL DEFAULT 1` — which 0665 already applied. The snapshot is already 200+ migrations stale; this change does not meaningfully worsen that. The snapshot must not be regenerated blind; it requires a careful `db:generate` diff review against all applied migrations before accepting the output.

---

## Task 2 — Journal vs database integrity sweep

### Check 1: Every .sql file has a journal entry

**CLEAN.** 393 SQL files, 393 journal entries, perfect bijection. No file is missing from the journal; no journal entry lacks a corresponding file.

### Check 2: Journal `when` values and DB watermark

**Journal monotonicity: CLEAN.** All 393 `when` values are strictly increasing.

**DB watermark:** `MAX(created_at)` in `drizzle.__drizzle_migrations` = **1788091262000** (corresponds to `0675_chat_remaining_membership_fks`, the last journal entry).

**Journal idx gap:** idx 286 is missing. The sequence runs 285 (`0504_mail_metadata_cache`) → 287 (`0510_kb_chunk_revision_uniqueness`). The corresponding SQL files are both present and applied. The gap is a journal authoring artifact with no correctness impact.

**4 journal entries below watermark with no matching DB `created_at`:**

| Tag | Journal `when` | DB match | pg_catalog effect |
|---|---|---|---|
| `0629_calendar_events_org_id_composite_unique` | 1787895935277 | none | `uniq_calendar_events_org_id` index **EXISTS** |
| `0666_rls_missing_tables` | 1787941589254 | none | RLS enabled on both tables, policy **EXISTS** |
| `0667_fix_invitations_pending_predicate` | 1787941649254 | none | `uniq_invitations_org_email_pending` **EXISTS** with correct predicate |
| `0669_chain_creates_inv_compliance_documents` | 1787941549254 | none | `inv_compliance_documents` table **EXISTS** |

These migrations are applied by effect. Their `when` values are all below the watermark, so Drizzle (which skips by timestamp) will permanently skip them — no re-application risk. The likely cause is that they were applied with a timestamp that does not match the current journal `when` (the journal may have been reconciled after the fact).

**Extra DB rows:** The DB contains 399 rows against 393 journal entries (+6). Seven timestamp groups in the 0656–0662 window (created_at range 1787941028254–1787941388254) each hold 2–3 rows with different hashes. These represent the 0656–0662 range of migrations being applied twice across two separate `db:migrate` runs. Since all timestamps are below the watermark, no re-application will occur. This is a record-keeping anomaly, not a correctness hazard.

**2 DB rows with no journal `when` match:** id=663 (created_at=1787941569254) and id=664 (created_at=1787941629254). These are 20–40 seconds away from the `when` values of 0669 and 0667 respectively, suggesting they were applied in an earlier run with a slightly different clock reading. Their effects (table and index) are confirmed in pg_catalog.

### Check 3: `statement-breakpoint` inside DO blocks

**CLEAN.** Zero occurrences across all 393 files. The scanner found no `DO $$ ... $$;` block containing `--> statement-breakpoint`.

### Check 4: `CREATE INDEX CONCURRENTLY`

**15 files** contain `CREATE INDEX CONCURRENTLY`:

```
0302_inv_perf_indexes.sql
0374_build_partial_indexes.sql
0497_ticket_key_lookup_index.sql
0501_calendar_overlap_index.sql
0504_mail_metadata_cache.sql
0510_kb_chunk_revision_uniqueness.sql
0513_leave_accrual_sweep_indexes.sql
0520_commercial_billing_catalog.sql
0521_billing_seat_ledger.sql
0522_billing_proration_ledger.sql
0523_billing_usage_events.sql
0524_billing_invoice_snapshots.sql
0542_hr_employments_custom_field_gin_index.sql
0575_ticket_list_sort_indexes.sql
0605_provider_webhook_events_tenant_scoped_unique.sql
```

**Verdict: not a hazard.** All journal entries have `breakpoints: true`, so each statement executes as a separate query with no wrapping transaction. `CONCURRENTLY` is valid in that mode. Confirmed: `idx_inv_transfers_org_status` from 0302 **EXISTS** in pg_catalog. Zero invalid indexes found across the entire DB.

### Check 5: `lock_timeout`, NOT VALID FK, SET NOT NULL discipline

**`lock_timeout` missing:** 149 files do not set it. 20 are pre-0232 (the early generated baseline). 130 are post-0232 — the recon wave (0232–0436) and several subsequent migrations authored without the guard. This is a locking risk on a live DB but is historical; all are already applied.

**ADD CONSTRAINT FOREIGN KEY without NOT VALID:** 31 files. Worst offenders are the recon migrations (0299, 0307, 0311, 0312, 0315, 0321, 0324, etc.). Each takes an ACCESS EXCLUSIVE lock on both referenced tables for the duration of the constraint install.

**SET NOT NULL without prior NOT VALID CHECK pattern:** 9 files:

```
0142_tickets_fractional_rank.sql
0310_recon_owner_pointer.sql
0320_recon_phase_a_orgid.sql
0326_recon_owner_not_null.sql
0333_pm_workspace_id_not_null.sql
0379_effective_dating_convention.sql
0628_communication_actor_normalization.sql
0657_kb_article_tags_tenant_integrity.sql
0658_calendar_membership_actors.sql
```

0657 and 0658 are recent (applied 2026-08-26). For tables with data this is a table rewrite. Since all are already applied to the dev DB, no corrective action is possible; forward migrations must follow the two-step pattern.

### Check 6: pg_catalog diff

**Scope:** most-recently applied migrations (0660–0675) cross-checked against pg_catalog.

| Migration | Expected object | Status |
|---|---|---|
| 0665 `kb_article_chunks.acl_revision` NOT NULL DEFAULT 1 | NOT NULL constraint + default | **CONFIRMED** |
| 0666 RLS on `expense_export_jobs`, `inv_compliance_documents` | `relrowsecurity=true`, policy present | **CONFIRMED** |
| 0667 `uniq_invitations_org_email_pending` | index with `WHERE status='PENDING'` predicate | **CONFIRMED** |
| 0669 `inv_compliance_documents` table | table present | **CONFIRMED** |
| 0629 `uniq_calendar_events_org_id` | unique index on `(org_id, id)` | **CONFIRMED** |

No pg_catalog discrepancy found for any of the audited migrations. No orphaned constraints or indexes from 0665 remain (the `chk_` constraint is absent as expected).

---

## Summary of findings requiring action

| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | 0665 VALIDATE-before-backfill bug | **Latent** — did not bite (0 rows at apply time) | Write a forward migration correcting the order before any cold-DB replay |
| 2 | `0464_snapshot.json` is current Drizzle snapshot, 200+ migrations stale | **Existing debt** | Do not run `db:generate` without reviewing the proposed diff against all applied migrations 0465–0675 |
| 3 | `acl_revision` absent from 0464 snapshot | **Drift** — `db:generate` would re-propose ADD COLUMN | Captured by item 2 above |
| 4 | 4 journal entries applied by effect but not by matching DB timestamp | **Informational** — safely below watermark | No action; document as reconciled |
| 5 | 6 extra DB rows (duplicate apply window 0656–0662) | **Informational** — below watermark | No action; record-keeping anomaly |
| 6 | 15 `CREATE INDEX CONCURRENTLY` files | **Safe** with breakpoints=true | No action |
| 7 | 130 post-0232 migrations missing `lock_timeout` | **Historical** — already applied | All future migrations must set it |
| 8 | 31 ADD FK without NOT VALID | **Historical** — already applied | All future FK additions must use two-step |
| 9 | 9 SET NOT NULL without NOT VALID check (incl. 0657, 0658 from 2026-08-26) | **Historical** — already applied | All future NOT NULL additions must use two-step |
| 10 | Journal idx 286 missing | **Cosmetic** | No action |
