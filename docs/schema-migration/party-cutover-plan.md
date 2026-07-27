---
wave: 6 (continuation)
status: AUTHORING — not yet approved for execution
author: architecture review 2026-07-27
depends-on:
  - 0307_recon_additive_foundation (business_parties exists)
  - 0317_recon_party_overlays (crm_party_accounts, inv_party_vendor_profiles exist)
  - 0324_recon_directory_party_fks (uniq_business_parties_org_party promoted to CONSTRAINT)
---

# Party cutover plan — `clients` / `crm_organizations` / `inv_vendors` -> `business_parties`

> **Read this before executing any phase.**
> This is a zero-downtime, additive, reversible migration.
> Each phase is independently deployable and safe to abort.
> No phase modifies business_parties, clients, or any consumer table destructively until Phase 7.
> Phases 1–6 are additive only; the legacy int FK columns remain writable throughout.

---

## 0. Verified ground truth — consumer inventory

### 0.1 `clients.id` consumers (type: `integer serial` PK)

All tables below currently hold a foreign key (or bare int) referencing `clients.id`.
This is the primary migration scope.

| Table | Column | Type | Nullable | On Delete | Schema file |
|---|---|---|---|---|---|
| `client_opportunities` | `client_id` | int | NOT NULL | CASCADE | `crm/contacts.ts` |
| `client_onboarding_items` | `client_id` | int | NOT NULL | CASCADE | `crm/contacts.ts` |
| `csat_surveys` | `client_id` | int | NULL | CASCADE | `crm/contacts.ts` |
| `deals` | `client_id` | int | NULL | SET NULL | `crm/deals.ts` |
| `invoices` | `client_id` | int | NULL | NO ACTION | `crm/invoicing.ts` |
| `purchase_bills` | `vendor_id` | int | NULL | NO ACTION | `crm/invoicing.ts` |
| `support_tickets` | `client_id` | int | NULL | NO ACTION | `support/tickets.ts` |
| `support_vip_clients` | `client_id` | int | NOT NULL | CASCADE | `support/agent-routing.ts` |
| `credit_notes` | `client_id` | int | NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `vendor_credits` | `vendor_id` | int | NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `fin_recurring_invoice_templates` | `client_id` | int | NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `fin_recurring_bill_templates` | `vendor_id` | int | NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `fin_collection_activities` | `client_id` | int | NOT NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `fin_payment_run_items` | `vendor_id` | int | NULL | NO ACTION | `accounting/finance-ar-ap.ts` |
| `acc_fixed_assets` | `vendor_id` | int | NULL | NO ACTION | `accounting/finance-assets.ts` |
| `inv_vendors` | `client_id` | int | NULL | SET NULL | `inventory/purchase-orders.ts` |
| `inv_sales_orders` | `client_id` | int | NULL | SET NULL | `inventory/sales-orders.ts` |
| `inv_customer_returns` | `client_id` | int | NULL | SET NULL | `inventory/operations.ts` |
| `journal_lines` | `client_id` | int | NULL | SET NULL | `accounting/accounting.ts` |
| `journal_lines` | `vendor_id` | int | NULL | SET NULL | `accounting/accounting.ts` |

**Bare integer columns (no DB FK constraint)** — logically reference `clients.id` but
will drift silently if a `clients` row is deleted. These must be backfilled via the map
table and then optionally given a real FK after the cutover:

| Table | Column | Schema file |
|---|---|---|
| `timesheet_budgets` | `client_id` | `timesheets/budgets.ts` |
| `timesheet_rates` | `client_id` | `timesheets/rates.ts` |

### 0.2 `crm_organizations.id` consumers (type: `integer serial` PK)

| Table | Column | Type | Nullable | On Delete | Schema file |
|---|---|---|---|---|---|
| `contacts` | `organization_id` | int | NULL | SET NULL | `crm/contacts.ts` |
| `crm_party_accounts` | `crm_organization_id` | int | NULL | SET NULL | `crm/party-account.ts` |
| `crm_organizations` | `parent_id` | int | NULL | SET NULL | `crm/contacts.ts` (self-ref) |
| `crm_organizations` | `merged_into_id` | int | NULL | SET NULL | `crm/contacts.ts` (self-ref) |

Note: `crm_organizations` self-references do NOT need migration (they stay within the legacy table until Phase 7).

### 0.3 `inv_vendors.id` downstream consumers (these tables do NOT reference `clients` directly)

| Table | Column | Type | Nullable | On Delete |
|---|---|---|---|---|
| `inv_purchase_orders` | `vendor_id` | int | NOT NULL | RESTRICT |
| `inv_vendor_returns` | `vendor_id` | int | NOT NULL | RESTRICT |
| `inv_reorder_rules` | `vendor_id` | int | NULL | SET NULL |

These tables will be migrated from `inv_vendors.id -> party_id text` in a sub-track
(Track C). Until Phase 7, `inv_vendors` remains the int FK parent.

### 0.4 Backend services that directly query `clients`

Verified via grep — 26 service/module files import or query from the `clients` table:
`modules/clients/*`, `modules/crm/crm-customer360*.service.ts`,
`modules/accounting/accounting-receivables.service.ts`,
`modules/accounting/accounting-payables-query.service.ts`,
`modules/finance-ar/*`, `modules/finance-ap/*`,
`modules/finance-banking/matching.service.ts`,
`modules/finance-reports/*`, `modules/finance-tax/tax-reports.service.ts`,
`modules/inv-returns/customer-returns.service.ts`,
`modules/search/search.service.ts`, `modules/leads/lead-status.service.ts`,
`modules/chat/entity-channel-name.util.ts`, `modules/ai/services/crm-scoring.service.ts`.

Services directly querying `inv_vendors`:
`modules/inv-vendors/inv-vendors.service.ts`,
`modules/inv-traceability/traceability-chain.service.ts`,
`modules/inv-returns/vendor-returns.service.ts`,
`modules/inv-products/inv-products.service.ts`.

---

## 1. Identity mapping strategy

**Problem:** `clients.id` is a serial integer. `business_parties.party_id` is a text UUID.
There is no natural 1:1 business key on `clients` that is unique per `(org_id, name)` —
the schema has `uniq_clients_org_id ON (org_id, id)` as a composite candidate key, but
no `UNIQUE(org_id, name)`. Multiple clients with the same name CAN exist in the same org.

**Decision:** One `business_parties` row is created for each `clients` row, regardless of
name collisions. The authoritative mapping is recorded in a durable bridge table
`party_migration_client_map(org_id, client_id, party_id)`. This bridge table is the only
source of truth for Phase 2 backfill and all subsequent shadow-column updates.

**party_type assignment:**
- `clients.is_vendor = false` -> `party_type = 'CUSTOMER'`
- `clients.is_vendor = true`  -> `party_type = 'VENDOR'`
- Clients that appear in BOTH `invoices` AND `purchase_bills` should be manually reviewed
  and updated to `party_type = 'BOTH'` after Phase 2. A pre-flight query is provided
  in `party-cutover-phase2.sql` to identify these.

**Duplicate rows (same org_id + name):** Each gets its own UUID in `business_parties`.
No automatic merge. The operator MUST run the duplicate pre-flight query before Phase 2
and decide: merge (manual SQL), keep as separate parties, or flag for product review.
The backfill never drops a row; it always errors loudly or quarantines on ambiguity.

**Unmatched rows:** `clients.name` is NOT NULL, so every `clients` row is guaranteed a
mapping. Rows with no FK consumers (orphaned clients not referenced by any invoice,
deal, etc.) are still migrated — they simply result in a `business_parties` row with no
consumer shadow column pointing at it. These are identified by the orphan pre-flight query.

**inv_vendors without a client_id (Track C):** Each gets its own `business_parties` row
via `party_migration_vendor_map(org_id, vendor_id, party_id)`. Its `party_type = 'VENDOR'`.
The vendor's `inv_party_vendor_profiles.vendor_profile_id` is set to the new `party_id`.

**crm_organizations (Track B):** Each gets its own `business_parties` row via
`party_migration_org_map(org_id, crm_org_id, party_id)`. Its `party_type = 'CUSTOMER'`.
`contacts.party_id` (shadow) is backfilled via this map.

---

## 2. Migration phases

### Phase 1 — Add nullable shadow columns + indexes (DDL only)

**Gate before starting:** None. This is always safe to run.

**What it does:**
- Adds `party_id TEXT NULL` alongside every `client_id INT` (and `vendor_id INT`) column
  in every consumer table listed in §0.1.
- Adds `party_id TEXT NULL` to `crm_organizations` and `contacts` (Track B shadow).
- Creates composite indexes on `(org_id, party_id)` for every consumer table.
- Creates the three bridge tables: `party_migration_client_map`,
  `party_migration_vendor_map`, `party_migration_org_map`.
- **NO behavior change.** All new columns are NULL and unused.

**Rollback:** `ALTER TABLE ... DROP COLUMN party_id;` for each table. Bridge tables
`DROP TABLE IF EXISTS party_migration_*_map;`. No data is changed, so rollback is instant.

**Operator run:** Yes — this is a planned Drizzle migration + manual SQL. Run during
off-peak hours (ADD COLUMN with no default is instant in Postgres; indexes build
concurrently via `CREATE INDEX CONCURRENTLY`).

**SQL file:** `party-cutover-phase1.sql`

---

### Phase 2 — Batched backfill (create party rows + populate shadow columns)

**Gate before starting:**
1. Phase 1 must be complete (all shadow columns exist, bridge tables exist).
2. Run the pre-flight duplicate query (§2A in phase2.sql) and resolve any name collisions.
3. Run the pre-flight orphan query (§2B) and record count for auditing.
4. Confirm `business_parties` row count is ZERO or contains only rows created by a
   different process (not by prior party_migration runs). If non-zero, abort and
   reconcile manually.

**What it does:**
- **Phase 2A — clients track:** Batched INSERT into `business_parties` for each
  `clients` row (bounded batches of 500 rows per statement). Records each mapping in
  `party_migration_client_map`. Idempotent: skips rows already in the map.
- **Phase 2B — vendor track:** Batched INSERT into `business_parties` for each
  `inv_vendors` row with `client_id IS NULL`. Records in `party_migration_vendor_map`.
  Idempotent.
- **Phase 2C — org track:** Batched INSERT into `business_parties` for each
  `crm_organizations` row. Records in `party_migration_org_map`. Idempotent.
- **Phase 2D — shadow backfill:** Batched UPDATE of the `party_id` shadow column in
  every consumer table, joining through the bridge table. Bounded 500 rows per batch.
  Idempotent (only updates rows where `party_id IS NULL`).

**Unmatched handling:** If a consumer table row references a `client_id` that does NOT
exist in `party_migration_client_map` (e.g., a `clients` row was deleted between Phase 1
and Phase 2), the shadow column remains NULL. A post-backfill verification query counts
these orphans. They are NOT silently dropped; the operator decides: insert a tombstone
party row, or leave NULL (which is valid since all shadow columns are nullable).

**Rollback:** Truncate `party_migration_*_map` tables, UPDATE all `party_id` shadow
columns SET to NULL, DELETE from `business_parties` WHERE `party_id IN (SELECT party_id
FROM party_migration_client_map)`. The SQL for this rollback is in the comment block at
the bottom of `party-cutover-phase2.sql`.

**Estimated duration:** For 100k `clients` rows: ~2-3 minutes per track at 500-row batches
with a short `pg_sleep(0.05)` between batches to throttle write amplification.

**Operator run:** Yes — DBA executes the batched loop. Can be paused and resumed at any
point; idempotent checks ensure no double-insertion.

**SQL file:** `party-cutover-phase2.sql`

---

### Phase 3 — Dual-write + shadow-read parity (app code change)

**Gate before starting:** Phase 2 backfill must be complete with zero unmatched rows
(or the operator has accepted and documented remaining orphans).

**What it does (app code, not DDL):**
- Every write path that sets `client_id = X` or `vendor_id = X` is updated to ALSO set
  `party_id = (lookup party_id from party_migration_client_map where client_id = X)`.
  The lookup is served from Redis cache (TTL: 1 hour, keyed by `party_map:{org_id}:{client_id}`).
- Shadow-read parity is measured: for every read that currently resolves a client name
  via a JOIN to `clients`, add a parallel JOIN through `party_id -> business_parties`
  and compare the `name` fields. Log mismatches to the `legacy_endpoint_call` telemetry
  table with `context = 'party_parity_mismatch'`.
- **Gate for Phase 4:** Parity check must pass for >= 7 consecutive days with
  mismatch rate < 0.01% of daily reads (measured per org, not globally).

**Rollback:** Revert the dual-write to single-write (client_id only). Parity logging
stops. No DDL changes to revert.

**Operator run:** Shipped as a backend release. Feature-flagged per `org_id` for
gradual rollout (start with org_id = internal test org, then expand 10%/day).

**SQL file:** `party-cutover-phase3.sql` (verification queries only — no DDL)

---

### Phase 4 — Switch reads to `party_id` (app code change)

**Gate before starting:**
- >= 7 days of passing parity (Phase 3 gate).
- All consumer services have been updated to dual-write (Phase 3 shipped and stable).

**What it does (app code, not DDL):**
- Update all service methods to JOIN on `party_id -> business_parties` instead of
  `client_id -> clients`.
- The legacy `client_id` column is still written (dual-write continues).
- Reads that previously filtered by `client_id = X` now filter by `party_id = Y`
  (resolved via the map cache).

**Rollback:** Revert the read path to use `client_id`. The legacy column is still
populated so data is available.

**No DDL.** No SQL file for this phase.

---

### Phase 5 — Highest-risk: composite FK installation on `invoices` and `purchase_bills`

**Gate before starting:**
- Phase 4 has been running for >= 14 days.
- Zero shadow-column NULLs on `invoices.party_id` and `purchase_bills.party_id`
  (verified by the pre-flight query in phase5.sql).
- Confirm `business_parties(organization_id, party_id)` has the UNIQUE CONSTRAINT
  `uniq_business_parties_org_party` (promoted in migration 0324).
- Maintenance window scheduled (Phase 5 requires `ShareUpdateExclusiveLock` for
  VALIDATE CONSTRAINT — plan for 15-60 minutes per table depending on row count).

**Why this is the highest risk:**
- `invoices` and `purchase_bills` are the largest financial tables. Any constraint
  violation found during VALIDATE will fail the entire VALIDATE and leave an invalid
  FK in place (must be dropped and the data issue resolved before retrying).
- An in-place `ALTER COLUMN client_id TYPE text` is NOT POSSIBLE because the column is
  a foreign key (int) — Postgres cannot cast int -> text implicitly while an FK is
  active. The safe route is: new column + composite FK + swap (described below).
- The `fin_collection_activities.client_id` is NOT NULL, which means the shadow
  `party_id` must be 100% populated BEFORE any NOT NULL enforcement.

**What it does (per table — ordered safest to riskiest):**

Step 1 (DDL, instant): Add `org_id TEXT` column to any consumer table that doesn't
already have it alongside `party_id`. (Most already have `org_id`.)

Step 2 (DDL, instant): `ADD CONSTRAINT fk_{table}_org_party FOREIGN KEY (org_id, party_id)
REFERENCES business_parties(organization_id, party_id) NOT VALID;`
This registers the FK without scanning existing rows. Zero downtime.

Step 3 (operator-run during maintenance window):
`ALTER TABLE {table} VALIDATE CONSTRAINT fk_{table}_org_party;`
This scans existing rows. Acquires `ShareUpdateExclusiveLock` (does NOT block reads
or writes, but blocks other DDL and VACUUM). Run one table at a time.

Order for Phase 5 VALIDATE (start smallest, build confidence):
1. `support_vip_clients` (typically small)
2. `csat_surveys`
3. `client_opportunities`
4. `client_onboarding_items`
5. `deals`
6. `support_tickets`
7. `inv_sales_orders`
8. `inv_customer_returns`
9. `credit_notes`
10. `fin_payment_run_items`
11. `fin_recurring_invoice_templates`
12. `fin_recurring_bill_templates`
13. `fin_collection_activities` (NOT NULL — highest row count risk)
14. `vendor_credits`
15. `acc_fixed_assets`
16. `journal_lines` (two FKs: client_id + vendor_id)
17. `invoices` (HIGHEST ROW COUNT — schedule separately)
18. `purchase_bills` (HIGHEST ROW COUNT — schedule separately)

**Rollback (per table):** `ALTER TABLE {table} DROP CONSTRAINT fk_{table}_org_party;`
This instantly removes the FK. The shadow `party_id` column remains (still nullable).

**SQL file:** `party-cutover-phase5.sql`

---

### Phase 6 — Stop legacy writes (app code change)

**Gate before starting:**
- All Phase 5 constraints are VALIDATED (no NOT VALID FKs remaining).
- >= 30 days of monitoring since Phase 4 shipped.
- The `legacy_endpoint_call` telemetry shows ZERO events tagged
  `context = 'clients_column_write'` for >= 30 days in production
  (or the team has accepted the risk for a specific count floor).

**What it does (app code + optional DDL):**
- Remove dual-write: service methods stop writing to `client_id` / `vendor_id` legacy
  int columns.
- Optional DDL: `ALTER TABLE {table} ALTER COLUMN client_id DROP NOT NULL;`
  for `client_opportunities.client_id` (NOT NULL) and
  `fin_collection_activities.client_id` (NOT NULL) — making them nullable prepares
  for Phase 7 drop without app code changes needing to align perfectly.
- Optional DDL: `ALTER TABLE {table} DROP CONSTRAINT {fk_to_clients};` for every
  legacy int FK (drops the old FK from consumer tables to `clients.id`). This is
  safe because the new composite party FKs (Phase 5) are now the authoritative
  constraints.

**Rollback:** Re-add dual-write in the service layer. No DDL changes in this phase
should be made that can't be undone with a complementary ADD CONSTRAINT.

**SQL file:** `party-cutover-phase6.sql` (verification + optional DDL)

---

### Phase 7 — Drop legacy columns and tables

**Gate before starting:**
- Phase 6 gate fully met (30 days zero legacy writes).
- All consumer tables have been verified: `client_id` (int) columns are 100% NULL
  (or contain no NEW values — rows from before Phase 6 are acceptable, they will
  be dropped with the column).
- A full database backup has been taken and confirmed restorable.
- The Drizzle schema has been updated to remove the legacy columns/tables before
  running this migration (to keep schema and DB in sync).

**What it does:**
- DROP COLUMN `client_id` (and `vendor_id` where it mapped to `clients.id`) from
  every consumer table.
- DROP TABLE `clients` (after verifying no remaining FK dependencies).
- DROP TABLE `crm_organizations` (Track B, if contacts.organization_id -> party_id
  cutover is complete).
- DROP TABLE `inv_vendors` (Track C, after inv_purchase_orders/inv_vendor_returns/
  inv_reorder_rules all point to `inv_party_vendor_profiles.vendor_profile_id`).
- DROP TABLE `party_migration_client_map`, `party_migration_vendor_map`,
  `party_migration_org_map` (bridge tables — no longer needed after drop).

**Requires downtime?** YES — `DROP TABLE clients` blocks all concurrent reads of
`clients` briefly. Schedule in a maintenance window. The DROP itself is fast
(metadata only in Postgres), but dependent FK checks may surface missing dropps.

**SQL file:** `party-cutover-phase7.sql`

---

## 3. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| `invoices.party_id` NULL when VALIDATE runs | CRITICAL | Abort Phase 5; re-run Phase 2D backfill; verify 100% fill before retry |
| `fin_collection_activities.client_id NOT NULL` constraint blocks shadow-only mode | HIGH | Drop NOT NULL in Phase 6 before stopping writes to this column |
| Duplicate `(org_id, name)` in `clients` → ambiguous business_parties | HIGH | Pre-flight duplicate query in Phase 2 SQL; operator must resolve before backfill |
| `crm_organizations` and `clients` represent the SAME real-world company (unlinked) | HIGH | Cannot be auto-detected; manual review + merge query provided in Phase 2 SQL |
| `inv_vendors` rows with no `client_id` lose their "is the same party" link | MEDIUM | Map separately via `party_migration_vendor_map`; link `crm_party_accounts` post-cutover |
| Redis map cache stale during Phase 3 dual-write (party_id lookup miss) | MEDIUM | Set cache TTL = 1h; on miss, fall back to DB lookup; log the fallback |
| VALIDATE CONSTRAINT deadlock on `invoices` during peak traffic | MEDIUM | Run VALIDATE during maintenance window; set `lock_timeout = 10s` so VALIDATE fails fast if blocked |
| Drizzle schema drift between Phase 1 DDL and Drizzle-managed migrations | LOW | Run `db:generate` after each phase and verify no diff; do not hand-edit generated SQL |
| `timesheet_budgets.client_id` and `timesheet_rates.client_id` have no FK constraint | LOW | Backfill via bridge table; add FK after backfill; then drop in Phase 7 |
| Two tenants sharing a `party_id` value | NOT POSSIBLE | `party_id` is a UUID, globally unique; composite `(org_id, party_id)` FK enforces tenant isolation |

---

## 4. Anything requiring downtime

Two steps require a maintenance window:

1. **Phase 5 — VALIDATE CONSTRAINT on `invoices` and `purchase_bills`.** Not truly
   downtime (reads + writes proceed), but `ShareUpdateExclusiveLock` blocks autovacuum
   and DDL. On a Neon branch, this may cause statement timeouts on very large tables.
   Mitigation: `SET lock_timeout = '30s'` on the session; if blocked, VALIDATE fails
   and the table is left with NOT VALID FK (still enforced on new inserts — just not
   on existing rows). Retry in the next window.

2. **Phase 7 — DROP TABLE `clients`.** A momentary metadata lock. Not a true service
   outage, but should be done off-peak. All app code must be confirmed not querying
   `clients` before this step (monitored via telemetry for >= 30 days in Phase 6).

All other phases are zero-downtime (ADD COLUMN is instant; indexes build concurrently;
dual-write is backward compatible).

---

## 5. Tenant collision analysis

`business_parties.party_id` is a UUID (text), globally unique. There is zero risk of
cross-tenant collision on `party_id` alone.

The composite FK pattern `(org_id, party_id) -> business_parties(organization_id, party_id)`
enforces that a consumer row's `(org_id, party_id)` pair MUST exist as a row in
`business_parties`. Since `business_parties.organization_id` is the tenant key, a
consumer row in org A cannot reference a party from org B — the composite FK blocks it
at the DB level.

The candidate key `uniq_business_parties_org_party` (promoted to a UNIQUE CONSTRAINT in
migration 0324) ensures the FK target is well-defined and non-ambiguous per tenant.

The bridge tables (`party_migration_client_map` etc.) are keyed on `(org_id, client_id)`,
which is itself a composite candidate key (matches `uniq_clients_org_id`). No cross-tenant
mapping is possible.

---

## 6. What could NOT be determined from the code

1. **Row counts.** The number of rows in `clients`, `invoices`, `purchase_bills`, and
   `inv_vendors` is not known from the schema alone. The operator must run the pre-flight
   row-count queries in `party-cutover-phase2.sql` to size the batching and schedule.

2. **Whether `business_parties` already contains rows** (e.g., rows inserted by a test
   or a partial prior migration run). Phase 2 requires the operator to confirm the table
   is empty or to reconcile existing rows before starting.

3. **Whether the `is_vendor` boolean accurately reflects a client's true role.** Some
   clients may be treated as vendors in AP workflows despite `is_vendor = false`. The
   pre-flight query to identify clients appearing in BOTH `invoices` AND `purchase_bills`
   is provided; the operator decides the `party_type` override.

4. **Redis key scheme for the party map cache.** The plan recommends
   `party_map:{org_id}:{client_id}`, but the actual cache key conventions in
   `common/cache/cache-keys.ts` must be consulted before implementing Phase 3 app code.

5. **Timesheets bare client_id intent.** `timesheet_budgets.client_id` and
   `timesheet_rates.client_id` have NO FK constraint. It is not verified from the code
   alone whether these columns reference `clients.id` semantically or are dead/placeholder
   columns. The operator must inspect actual data values before Phase 2D backfill for
   these tables.
