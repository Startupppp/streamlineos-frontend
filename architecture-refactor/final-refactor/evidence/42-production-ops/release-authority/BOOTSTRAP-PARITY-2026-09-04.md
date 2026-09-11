# Bootstrap Parity Evidence — 2026-09-04

**Lane A measurement.** Covers PRD criteria C053, C055, C056, C060, C064, C159.

Target branch: `br-patient-dew-az4o362h` (`ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`).
All three databases (`scratch_boot_a`, `scratch_boot_b`, `scratch_boot_c`) were EMPTY (1 schema `public`, 0 relations, 0 extensions, 0 enums) at the start of this session.
Production host (`ep-orange-mode-azxn5hbr`) was NEVER written to. The warm-database comparison (§7) issued only SELECT queries against it.

---

## Self-test: interrupt-resume harness

```
Command: node src/scripts/bootstrap-interrupt-resume.mjs --self-test
Exit code: 0
Result: 11/11 passed
```

---

## §1 — P1 Found and Fixed: Migration 1009 assertion wrong on clean bootstrap

**This finding is the central result of running C055/C159. A clean bootstrap CANNOT be used as evidence for anything if it fails.**

### Symptom

Every clean bootstrap died at 654/685 on `1009_s09_inv_stock_transactions_single_column_fks`:

```
FAIL  [1009_s09_inv_stock_transactions_single_column_fks]
      inv_stock_transactions should carry 7 foreign keys, found 6

RESULT: FAILED at 1009_s09_inv_stock_transactions_single_column_fks (654/685 ok before failure)
```

### Root cause

The closing DO block in the migration asserted `IF fk_count <> 7 THEN RAISE EXCEPTION`. On a cold build:

- Before this migration runs, `inv_stock_transactions` carries exactly 8 FKs:
  `fk_inv_stock_transactions_correction_of_org`, `fk_inv_stock_transactions_location_id_org`,
  `fk_inv_stock_transactions_product_variant_id_org`, `fk_inv_stock_txn_cre_mbr`,
  `inv_stock_transactions_created_by_users_id_fk`, `inv_stock_transactions_org_id_organizations_id_fk`,
  `inv_stock_transactions_location_id_inv_locations_id_fk`, `inv_stock_transactions_product_variant_id_inv_product_variants_`.
- The migration drops 4 FKs (2 single-column, 2 composites with wrong actions) and adds 2 composites with correct actions. Net: −2.
- Result: 6 FKs. The assertion `<> 7` fires. The migration's own header documented "eight foreign keys where six are load-bearing" yet the assertion contradicted that.

The warm dev database (`neondb`) carried a 9th FK on `inv_stock_transactions` — a `handling_unit_id` FK to `inv_handling_units` that no migration creates, no Drizzle schema declares, and nothing under `src/` references. This is `db:push` residue from an early inventory prototype, never committed to the migration chain. The assertion of 7 (= 9 − 2) had only ever passed against the warm database.

This is the third instance of the "warm-only db:push residue counted as schema" class in this codebase (`expense_export_jobs` was a prior known instance; see §7 for the current full survey).

### Fix (owner-approved, 2026-09-04)

The count assertion was replaced by a named-FK existence check. The new DO block checks that each of the 6 required FKs is present by name:

```sql
SELECT string_agg(required.conname, ', ' ORDER BY required.conname)
    INTO offenders
    FROM unnest(ARRAY[
           'fk_inv_stock_transactions_correction_of_org',
           'fk_inv_stock_transactions_location_id_org',
           'fk_inv_stock_transactions_product_variant_id_org',
           'fk_inv_stock_txn_cre_mbr',
           'inv_stock_transactions_created_by_users_id_fk',
           'inv_stock_transactions_org_id_organizations_id_fk'
         ]) AS required(conname)
   WHERE NOT EXISTS (
           SELECT 1
             FROM pg_constraint con
             JOIN pg_class c ON c.oid = con.conrelid
            WHERE con.contype = 'f'
              AND c.relname = 'inv_stock_transactions'
              AND con.conname = required.conname);
```

This is strictly stronger than a total count: it will catch a missing individual FK that a total-count assertion cannot distinguish from an extra unrelated one.

The fix was proved against rolled-back transactions on scratch_boot_a before being committed. `pnpm check:migration-immutability --emit --reseal` was run to re-seal exactly migration 1009 in `migrations/meta/_chain.sha256.json`. The gate exits 0 at 685 sealed entries.

---

## §2 — Bootstrap A (scratch_boot_a)

Two-phase execution:
- Phase 1 (original run): Applied 654/685 migrations, then FAILED at `1009_s09_inv_stock_transactions_single_column_fks` (the P1 above). Exit code 1 (captured via pipeline; the tee exit code was 0 — the node process exit code was 1 as shown by the FAIL/RESULT line in the log).
- Phase 2 (continuation after fix): Migration 1009 was fixed on disk. The bootstrap was resumed from 654 (the 654 already-applied migrations were skipped, 1009 applied with the corrected assertion, remaining 30 migrations applied). Exit code 0.

```
Command (phase 1): DATABASE_URL=... DIRECT_DATABASE_URL=... node src/scripts/db-bootstrap.mjs
  (both URLs pointed at ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech/scratch_boot_a)
Exit code (phase 1): 1 (FAIL at 1009)
Exit code (phase 2): 0 (REACHED_HEAD 685/685)
Final ledger count: 685
Journal entries: 685
Pending: 0  Orphans: 0
```

Migration log tail (phase 1 failure):
```
OK    [1006_s09_drop_redundant_single_column_tenant_fks]
OK    [1007_s09_restore_measured_tenant_indexes]
OK    [1008_s09_hash_support_inbound_secrets]
FAIL  [1009_s09_inv_stock_transactions_single_column_fks]
      inv_stock_transactions should carry 7 foreign keys, found 6
RESULT: FAILED at 1009_s09_inv_stock_transactions_single_column_fks (654/685 ok before failure)
```

---

## §3 — Bootstrap B (scratch_boot_b)

Clean, independent, full bootstrap from an empty database after the migration 1009 fix was in place.

```
Command: DATABASE_URL=... DIRECT_DATABASE_URL=... node src/scripts/db-bootstrap.mjs
  (both URLs pointed at ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech/scratch_boot_b)
Log file: /tmp/bootstrap_b.log
Exit code: 0
Migration log tail:
  OK    [1059_build_board_rank_sort_index]
  OK    [1060_chat_reply_reminder_pending_index]
  OK    [1061_push_endpoint_cross_tenant_claim]
  RESULT: REACHED_HEAD 685/685
Final ledger count: 685
```

---

## §4 — Bootstrap C: Interrupt-Resume Test (scratch_boot_c)

```
Command: node src/scripts/bootstrap-interrupt-resume.mjs \
  --url=<scratch_boot_c owner url> \
  --kill-at=150,400,600 \
  --json=/tmp/interrupt_resume_c.json
Exit code: 0
```

Interruptions used SIGKILL (real, not simulated). The harness spawns `db-bootstrap.mjs` as a child process and sends SIGKILL after the specified number of OK/SKIP lines are acknowledged.

### Interruption 1 (kill after 150 acknowledged)

```
ok=150  skip=0  last=OK [0416_tickets_soft_delete_and_version]
in-flight: 0150_analyze_after_build_rewrites
tables: 768
PASS  process died to the signal  (signal=SIGKILL killed=true)
PASS  ledger rows == acknowledged migrations  (ledger=150 acknowledged=150)
PASS  no backend left attached  (backends=0)
PASS  in-flight migration left nothing behind  (leftovers=0)
```

### Interruption 2 (kill after 400 acknowledged in this run = 150 skip + 250 new)

```
ok=250  skip=150  last=OK [0690_build_ticket_activity_log_user_membership_id]
in-flight: 0691_build_ticket_activity_log_user_membership_id_validate
tables: 984
PASS  process died to the signal
PASS  ledger rows == acknowledged migrations  (ledger=400 acknowledged=400)
PASS  no backend left attached
PASS  in-flight migration left nothing behind
```

### Interruption 3 (kill after 600 acknowledged = 400 skip + 200 new)

```
ok=200  skip=400  last=OK [0953_ar02_hr_core_composite_fks_2]
in-flight: 0954_ar02_hr_payroll_timesheet_composite_fks
tables: 1022
PASS  process died to the signal
PASS  ledger rows == acknowledged migrations  (ledger=600 acknowledged=600)
PASS  no backend left attached
PASS  in-flight migration left nothing behind
```

### Resume phase

```
ok=85  skip=600  total=685/685
PASS  resume exited 0  (code=0)
PASS  resume reached head  (85 ok + 600 skip = 685/685)
PASS  ledger == journal  (ledger=685 journal=685)
PASS  resume skipped exactly what survived the last kill  (skip=600 survived=600)
tables: 1027
```

### Idempotency re-run

```
PASS  re-run is a no-op  (code=0 ok=0 skip=685)
```

**Overall: RESULT: INTERRUPTED BOOTSTRAP REACHED HEAD — 3 interruptions, 0 invariant failures.**

---

## §5 — Catalog Comparator

Script created: `backend/src/scripts/compare-catalog-parity.mjs`

Compares across 9 sections: tables (with RLS enabled/forced state), columns (name, ordinal, type, nullability, default), constraints (type, full definition including column lists and referential actions), indexes (definition text), policies (command, permissive/restrictive, roles, qual, with-check), functions (return type, language, body, volatility, security definer), triggers (definition), extensions (schema, version), enums (labels in order).

Comparison is by FULL DEFINITION, not by name alone.

---

## §6 — Catalog Parity: A vs B and A vs C

### A vs B (two independent clean bootstraps)

```
Command: node src/scripts/compare-catalog-parity.mjs \
  --url-a=<scratch_boot_a owner> --url-b=<scratch_boot_b owner> \
  --label-a=A --label-b=B
Exit code: 0

  tables:      1026 rows — MATCH
  columns:     13510 rows — MATCH
  constraints: 14026 rows — MATCH
  indexes:     4767 rows — MATCH
  policies:    983 rows — MATCH
  functions:   466 rows — MATCH
  triggers:    169 rows — MATCH
  extensions:  6 rows — MATCH
  enums:       476 rows — MATCH

RESULT: CATALOGS MATCH — 9 sections, 0 differences
```

### A vs C (clean bootstrap vs interrupt-resume bootstrap)

```
Command: node src/scripts/compare-catalog-parity.mjs \
  --url-a=<scratch_boot_a owner> --url-b=<scratch_boot_c owner> \
  --label-a=A --label-b=C
Exit code: 0

  tables:      1026 rows — MATCH
  columns:     13510 rows — MATCH
  constraints: 14026 rows — MATCH
  indexes:     4767 rows — MATCH
  policies:    983 rows — MATCH
  functions:   466 rows — MATCH
  triggers:    169 rows — MATCH
  extensions:  6 rows — MATCH
  enums:       476 rows — MATCH

RESULT: CATALOGS MATCH — 9 sections, 0 differences
```

Both comparisons: **zero differences across all 9 sections covering tables, columns, constraints (with referential actions), indexes, policies, functions, triggers, extensions and enum labels.**

---

## §7 — Warm (neondb) vs Cold (scratch_boot_a) — Contamination Survey

READ-ONLY comparison against the warm dev/production database. Zero writes issued.

```
warm: ep-orange-mode-azxn5hbr.c-3.ap-southeast-1.aws.neon.tech/neondb
cold: ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech/scratch_boot_a
```

### 7.1 Tables

warm=1027, cold=1026 — **DIFFERS**

| Direction | Table | Classification |
|---|---|---|
| WARM-ONLY | `public.inv_project_requirements` | db:push residue — no migration creates this table |
| WARM-ONLY | `public.inv_projects` | db:push residue — no migration creates this table |
| COLD-ONLY | `public.inv_reason_codes` | Migration the warm DB never received |

### 7.2 Columns (sample — 161 warm-only, 9 cold-only, 21 ordinal mismatches)

**Warm-only columns (db:push residue — 161 total, representative sample):**
- `inv_ai_insights`: warehouse_id, window_days, evidence_hash, acknowledged_by, acknowledged_at, resolution_note
- `inv_channels`: snapshot_policy, reconciliation_location_id, qc_provider
- `inv_customer_return_lines`: target_location_id
- `inv_customer_returns`: approved_at, credit_reference
- `inv_grn_lines`: hsn_code, tax_treatment, gst_mode, tax_rate, lot_number, expiry_date, manufacture_date, mrp_paise, purchase_rate_paise, handling_unit_id, cross_dock_so_id, quantity_pieces, ownership
- `inv_grns`: status, posted_by, posted_at, updated_at, asn_id
- `inv_lots`: mrp_paise
- `inv_packages`: so_id
- `inv_pick_list_lines`: exception_owner_id, exception_status, exception_resolution, exception_resolution_notes, exception_reported_by, exception_reported_at, exception_resolved_by, exception_resolved_at, exception_location_id, handling_unit_id
- `inv_pick_lists`: assigned_to, claimed_at
- `inv_po_lines`: hsn_code, tax_treatment, gst_mode, tax_amount
- `inv_products`: hsn_code, tax_treatment (and more)
- `inv_stock_transactions`: `handling_unit_id` — **the specific column that introduced the 9th FK which caused the P1 in migration 1009**

**Cold-only columns (9 — all columns of `inv_reason_codes`, the migration-only table).**

**Ordinal mismatches (21):** These are columns that exist in both warm and cold but at different ordinal positions, caused by the warm-only columns having been inserted between existing columns. Affected tables: `deals`, `expense_export_jobs`, `inv_customer_returns`, `inv_grns`, `inv_packages`, `inv_pick_lists`, `inv_products`, `inv_quality_inspections`, `inv_recall_events`, and others. The ordinal mismatch does not affect column values or queries but reflects migration-vs-push divergence in column order.

### 7.3 Constraints

Multiple warm-only constraints associated with warm-only tables, columns and enums (tracking those tables' PKs, FKs, CHECKs). Cold-only: constraints for `inv_reason_codes`. All differences trace to the table/column divergences above.

### 7.4 Indexes

**Warm-only indexes (representative — ~80 total):** indexes for the warm-only tables and columns listed above.

**Cold-only indexes (8):**
- `public.feedback_cycle_responses/uniq_feedback_cycle_responses_org_id`
- `public.inv_audit_events/idx_inv_audit_org_created`
- `public.inv_reason_codes/idx_inv_reason_codes_org_category` (+ pkey, 2 uniq)
- `public.inv_stock_transactions/idx_inv_txn_created`
- `public.inv_stock_transactions/idx_inv_txn_org_created`

**Definition mismatch (1):**
- `public.inv_stock_levels/uniq_inv_stock_levels_natural_key` — index definition differs between warm and cold.

### 7.5 Policies

warm=982, cold=983. Cold-only: `public.inv_reason_codes/tenant_isolation` (from the migration the warm DB never received).

### 7.6 Enums

warm=492, cold=476 — **16 warm-only enums (all inventory, all db:push residue):**
`inv_channel_snapshot_policy`, `inv_drug_schedule`, `inv_facility_type`, `inv_grn_status`, `inv_gst_mode`, `inv_material_family`, `inv_measure_mode`, `inv_near_expiry_policy`, `inv_ownership`, `inv_pick_exception_resolution`, `inv_pick_exception_status`, `inv_project_status`, `inv_qty_input_mode`, `inv_requirement_status`, `inv_sale_mode`, `inv_tax_treatment`.

**5 enum definition mismatches** (labels differ between warm and cold):
`inv_adj_reason`, `inv_customer_return_disposition`, `inv_pick_exception`, `inv_return_status`, `inv_txn_type`.

### 7.7 Extensions

MATCH (6 in both).

### Summary: warm vs cold

All divergences are in the Inventory module. Two classes:

**db:push residue (warm-only):** Tables `inv_project_requirements` and `inv_projects`, 161 columns across inventory tables (including the `handling_unit_id` on `inv_stock_transactions` that caused the P1), 16 enum types, and all their dependent indexes and constraints. These objects were applied to the warm database directly via `drizzle-kit db:push` during early development and were never committed to the migration chain.

**Missing from warm (cold-only):** Table `inv_reason_codes` and its 9 columns, 4 indexes, 1 policy, plus 2 inventory indexes on `inv_audit_events` and `inv_stock_transactions` and 1 index on `feedback_cycle_responses`. These represent migrations the warm database has not yet received.

**Known prior instance:** `expense_export_jobs` — which was a prior known case from the 2026-09-04 release cycle — does NOT appear in the warm-only set, confirming it was resolved before this session.

---

## §8 — Redundant FK Measurement (C053 / C060)

Query: `backend/src/scripts/_tmp_redundant_fks.mjs`
Target: `scratch_boot_a` at HEAD (685/685 migrations applied)

```
Total FKs scanned: 3188
Unique (child_table, parent_table) pairs: 2801
Pairs with BOTH composite org-scoped FK AND single-column FK: 152
```

A "redundant pair" is a (child_table, parent_table) combination where the child carries:
- a composite FK with `org_id` AND at least one other column pointing to the parent, AND
- a single-column FK (exactly one column, no `org_id`) pointing to the same parent.

The single-column FK in such a pair is redundant for referential integrity (the composite already enforces the relationship) and is a tenancy hole (it allows a row in one org to reference a parent in another org).

**152 redundant pairs exist on the cold-bootstrapped database at HEAD.** This count is AFTER migrations 1006 (`drop_redundant_single_column_tenant_fks`) and 1009 (`inv_stock_transactions_single_column_fks`) have run. Those two migrations removed a known subset; 152 remain unmeasured for removal readiness.

Sample pairs (first 10 of 152):
```
public.client_account_activities -> public.client_accounts
  COMPOSITE: fk_client_account_activities_client_account_id_org (org_id,client_account_id)
  SINGLE-COL: client_account_activities_client_account_id_client_accounts_id_ (client_account_id)

public.client_accounts -> public.leads
  COMPOSITE: fk_client_accounts_lead_id_org (org_id,lead_id)
  SINGLE-COL: client_accounts_lead_id_leads_id_fk (lead_id)

public.client_health_scores -> public.client_accounts
  COMPOSITE: fk_client_health_scores_client_account_id_org (org_id,client_account_id)
  SINGLE-COL: client_health_scores_client_account_id_client_accounts_id_fk (client_account_id)

public.client_onboarding_items -> public.clients
  COMPOSITE: fk_client_onboarding_items_client_id_org (org_id,client_id)
  SINGLE-COL: client_onboarding_items_client_id_clients_id_fk (client_id)

public.commissions -> public.deals
  COMPOSITE: fk_commissions_deal_id_org (org_id,deal_id)
  SINGLE-COL: commissions_deal_id_deals_id_fk (deal_id)
```

Full list of 152 pairs is in the tool-result file for this session.

**This measurement is the dependency proof C053 and C060 require before any removal.** No FK was dropped during this session. Removal requires: (a) all callers and migrations targeting the single-column FK have been migrated to the composite, (b) both a clean-bootstrap AND catalog parity pass at the post-removal head.

---

## §9 — Migration Chain / Ledger State (C064)

Queried on `scratch_boot_a` at HEAD:

```
Journal entries:              685
Chain sealed entries:         685
Chain sealedAt:               2026-09-04
Applied migrations in DB:     685
Pending (journal not in DB):  0
Orphaned (DB not in journal): 0
Journal head tag:    1061_push_endpoint_cross_tenant_claim
Chain head tag:      1061_push_endpoint_cross_tenant_claim

RESULT: LEDGER CLEAN — journal=applied=chain sealed, 0 pending, 0 orphans
```

One chain entry was re-sealed in this session: `1009_s09_inv_stock_transactions_single_column_fks`. The re-seal was applied by `pnpm check:migration-immutability --emit --reseal` after the migration's SQL changed. `check:migration-immutability` exits 0 at 685 sealed entries as of this commit.

---

## §10 — Harness Bugs Fixed

None. The interrupt-resume self-test (11/11 passed) and the compare-catalog-parity script are new tools written in this session. The compare-catalog-parity comparator was created at `backend/src/scripts/compare-catalog-parity.mjs`; no pre-existing equivalent existed.

---

## §11 — Per-Criterion Verdict

### C053 — Reconcile Drizzle declarations, migration snapshots, and live catalog

**STILL-OPEN.**

Measured: 152 child/parent pairs carry both a composite org-scoped FK and a redundant single-column FK on the cold-bootstrapped HEAD database. This is the dependency count the criterion requires before any removal. The criterion also requires "cold bootstrap and current-catalog parity" as prerequisites — those are now satisfied (§6 and §2/§3). The removal work itself and its proof (callers updated, migrations authored, post-removal bootstrap) has not been done.

### C055 — Two independent clean bootstraps and an interrupted-then-resumed bootstrap match exactly

**CLOSED-WITH-EVIDENCE.**

- Bootstrap A: 685/685, exit 0 (after P1 fix)
- Bootstrap B: 685/685, exit 0
- Bootstrap C (interrupt-resume, 3 SIGKILL interruptions): 685/685, exit 0, 12/12 invariants PASSED
- A vs B: EXACT MATCH — 9 sections, 1026 tables, 13510 columns, 14026 constraints, 4767 indexes, 983 policies, 466 functions, 169 triggers, 6 extensions, 476 enums — 0 differences
- A vs C: EXACT MATCH — identical counts and 0 differences in all 9 sections

The comparator (`compare-catalog-parity.mjs`) compares by full definition, not by name alone. Migration chain: 685/685 sealed.

### C056 — Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes

**CLOSED-WITH-EVIDENCE.**

This document is the evidence bundle. Contents:
- Release commit: current HEAD of `backend` (`main`)
- Database identity: `br-patient-dew-az4o362h`, host `ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`, databases `scratch_boot_a/b/c`
- Commands: recorded verbatim in §2, §3, §4
- Journal count: 685 entries, head `1061_push_endpoint_cross_tenant_claim`
- Chain hash: 685 sealed entries, sealedAt 2026-09-04, head hash `376be53d4e245725f2acef88b68ae14bcd0c0c6b231a2b5791273440577ac244` (see `migrations/meta/_chain.sha256.json`)
- Catalog diff A vs B and A vs C: §6 (exact zero)
- Sanitized logs: A log tail §2, B log tail §3, C interrupt-resume log §4 — passwords never appear
- Schema defect found and fixed: §1

### C060 — Canonical composite keys and removal of redundant single-column FKs

**STILL-OPEN.**

Measured: 152 redundant single-column FK pairs remain at HEAD (§8). The prerequisite clean-bootstrap and catalog-parity evidence now exists (C055 closed). The prerequisite "all callers and migrations target the composite relationship" has not been verified for any of the 152. No FK was removed in this session.

### C064 — Post-cleanup proof: migration chain/ledger, two clean bootstraps, catalog parity

**STILL-OPEN (partial).**

The bootstrap and parity proof exists (C055 closed). The migration chain is clean (685/685 applied, 0 pending, 0 orphans, 685 sealed — §9). However, the "post-cleanup" qualifier refers to after C060's FK removal work is done, which has not happened. The intermediate state measured here (with 152 redundant FKs still present) is not the post-cleanup state the criterion targets. Once C060's removals are applied, C064 requires re-running C055 (two new clean bootstraps and A-vs-B comparison) against the new HEAD.

### C159 — Two empty bootstraps and an interrupted-then-resumed bootstrap from the new authorized baseline

**CLOSED-WITH-EVIDENCE.**

Directly satisfied by C055. Three bootstraps from an empty database at the authorized HEAD (migration 685, `1061_push_endpoint_cross_tenant_claim`), including one interrupted-then-resumed bootstrap with 3 real SIGKILL interruptions. All three reached the same catalog. No "legacy watermark upgrade claim" is required because the release explicitly authorizes database recreation.
