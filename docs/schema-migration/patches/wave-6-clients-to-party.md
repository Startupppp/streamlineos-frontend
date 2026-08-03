---
type: wave-6 patch spec
status: DRAFT
date: 2026-07-26
depends-on: wave-2-6-execution-plan.md (W6.1–W6.9), wave-6-business-party-design.md
gate: wave-0 ADR approval + reconciled baseline must be merged before any step executes
---

# Wave 6 — `clients.id` (integer) → `business_parties.party_id` (text UUID) patch spec

> This document is the **implementation-ready patch spec** for the type-change
> migration at the core of Wave 6. It covers every consumer table that FKs into
> `clients.id` (integer serial) and must be re-targeted to
> `business_parties.party_id` (text UUID) via the shadow-column + dual-write pattern.
>
> **Why a shadow column is mandatory:** `ALTER COLUMN TYPE integer → text` on a live
> Postgres table acquires an `ACCESS EXCLUSIVE` lock and rewrites every row. On tables
> with tens of thousands to millions of rows this causes unacceptable downtime.
> The shadow-column approach avoids any lock beyond a fast `ALTER TABLE … ADD COLUMN`
> on a nullable column (near-instant on Neon serverless).
>
> **Highest-risk stage: Stage C (`invoices` + `purchase_bills`).** These are the
> largest finance tables, written transactionally on every invoice creation and
> payment. A missed row at the backfill or cutover phase breaks invoice creation
> (the service tries to join `business_parties` on a null `party_id`). Each
> sub-stage must gate cleanly before the next begins.

---

## Consumer inventory

| # | Table | File | Legacy FK column | FK type | Counterparty role | Stage |
|---|---|---|---|---|---|---|
| 1 | `inv_vendors` | `inventory/purchase-orders.ts` | `client_id → clients.id` | `integer` nullable | vendor/supplier | A |
| 2 | `vendor_credits` | `finance-ar-ap.ts` | `vendor_id → clients.id` | `integer` nullable | vendor (AP) | B |
| 3 | `fin_recurring_bill_templates` | `finance-ar-ap.ts` | `vendor_id → clients.id` | `integer` nullable | vendor (AP recurring) | B |
| 4 | `acc_fixed_assets` | `finance-assets.ts` | `vendor_id → clients.id` | `integer` nullable | asset-purchase vendor | B |
| 5 | `fin_payment_run_items` | `finance-ar-ap.ts` | `vendor_id → clients.id` | `integer` nullable | vendor (AP run) | B |
| 6 | `fin_collection_activities` | `finance-ar-ap.ts` | `client_id → clients.id` | `integer` NOT NULL | customer (AR collections) | A |
| 7 | `credit_notes` | `finance-ar-ap.ts` | `client_id → clients.id` | `integer` nullable | customer (AR) | B |
| 8 | `fin_recurring_invoice_templates` | `finance-ar-ap.ts` | `client_id → clients.id` | `integer` nullable | customer (AR recurring) | B |
| 9 | `invoices` | `crm/billing.ts` | `client_id → clients.id` | `integer` nullable | customer (AR) | **C — HIGHEST RISK** |
| 10 | `purchase_bills` | `crm/billing.ts` | `vendor_id → clients.id` | `integer` nullable | vendor (AP) | **C — HIGHEST RISK** |

**Additional consumers (outside this spec's scope — covered in wave-6-business-party-design.md T6.2b/T6.3b):**
`client_opportunities`, `client_onboarding_items`, `csat_surveys`, `deals` (CRM — W6.4 CRM read cutover),
`inv_sales_orders.client_id`, `support_tickets.client_id`, `support_vip_clients.client_id`.

**Total consumer tables in this spec: 10 (2 Stage A, 6 Stage B, 2 Stage C).**

---

## Prerequisites (confirmed from repo)

- `business_parties` exists at `backend/src/db/schema/party/business-parties.ts` with:
  - `party_id text PRIMARY KEY` (UUID, `.$defaultFn(() => randomUUID())`)
  - `organization_id text NOT NULL REFERENCES organizations(id)`
  - `UNIQUE("uniq_business_parties_org_party").on(organization_id, party_id)` — the
    composite candidate key required for composite FK referencing
  - `party_type` enum `CUSTOMER | VENDOR | PARTNER | OTHER`
- `party_contacts` and `party_addresses` exist with composite FKs into `business_parties`
- `clients` table exists at `crm/contacts.ts`, `id` is `serial` (integer), `is_vendor boolean`
- **`client_party_map` does NOT yet exist** — this spec creates it in Step 2

---

## Step 0 — `crm_accounts` overlay table (W6.1)

This step is the **prerequisite expand** for the entire Wave 6 migration.
It creates the CRM-facing overlay table linking `business_parties` to CRM account data.
Run this before any shadow columns are added to consumer tables.

```sql
-- File: backend/migrations/<timestamp>_w6_01_crm_accounts.sql
-- Generated via: pnpm -C backend db:generate after editing crm/accounts.ts

CREATE TABLE crm_accounts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  party_id           TEXT        NOT NULL,
  account_manager_id TEXT        REFERENCES users(id) ON DELETE SET NULL,
  health_score       INTEGER     NOT NULL DEFAULT 50,
  health_status      crm_health_enum NOT NULL DEFAULT 'healthy',
  churn_risk_score   INTEGER,
  investment_value   DECIMAL(15,2),
  status             TEXT        NOT NULL DEFAULT 'active',
  converted_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_crm_accounts_org_id    UNIQUE (org_id, id),
  CONSTRAINT fk_crm_accounts_party     FOREIGN KEY (org_id, party_id)
    REFERENCES business_parties(organization_id, party_id) ON DELETE CASCADE
);

CREATE INDEX idx_crm_accounts_org_status ON crm_accounts(org_id, status);
CREATE INDEX idx_crm_accounts_party      ON crm_accounts(org_id, party_id);
```

**Drizzle schema:** add `backend/src/db/schema/crm/accounts.ts`.
**Gate:** migration applies cleanly; zero rows (expected — no backfill yet); prior app boots.
**Rollback:** `DROP TABLE crm_accounts;`

---

## Step 1 — Add `clients.party_id` shadow column + mapping table (W6.2-pre)

Add a shadow column to `clients` itself so every consumer backfill can resolve
`clients.id → party_id` in a single JOIN rather than a name-match (name-matching is
lossy when two clients in the same org have the same name).

```sql
-- File: backend/migrations/<timestamp>_w6_02a_clients_shadow.sql

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS party_id              TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at TIMESTAMPTZ;

CREATE INDEX idx_clients_party_id
  ON clients(org_id, party_id)
  WHERE party_id IS NOT NULL;

-- Mapping support table (migration-aid only; dropped in W6.11)
CREATE TABLE IF NOT EXISTS client_party_map (
  client_id  INTEGER     PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  party_id   TEXT        NOT NULL,
  org_id     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_party_map_party
  ON client_party_map(party_id);
CREATE INDEX idx_client_party_map_org
  ON client_party_map(org_id);
```

**Drizzle schema:** update `crm/contacts.ts` (`clients`) to add `partyId text` and
`partyIdBackfilledAt timestamp` columns.
**Gate:** migration applies without lock; all new columns are NULL (expected); prior app boots.
**Rollback:**
```sql
ALTER TABLE clients DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
DROP TABLE IF EXISTS client_party_map;
```

---

## Step 2 — Backfill: `clients` → `business_parties` + `crm_accounts` + `client_party_map`

Run as a Drizzle migration with raw SQL. Must be **idempotent** (safe to re-run).
Process one org at a time in a loop to keep transaction size bounded (target ≤1000 rows
per transaction). Log progress per org.

### 2a — Insert `business_parties` rows from `clients`

```sql
-- Idempotent: ON CONFLICT DO NOTHING on the composite unique key
-- Run per org in application-layer loop (pass :org_id as parameter)

INSERT INTO business_parties (
  party_id, organization_id, party_type,
  name, legal_name,
  tax_number, email, phone,
  status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  c.org_id,
  CASE WHEN c.is_vendor THEN 'VENDOR' ELSE 'CUSTOMER' END,
  c.name,
  c.company,         -- legal name from company field
  c.gstin,
  c.email,
  c.phone,
  c.status,
  c.created_at,
  c.updated_at
FROM clients c
WHERE c.org_id = :org_id
  AND c.party_id IS NULL   -- idempotency guard
ON CONFLICT DO NOTHING;    -- composite UNIQUE(organization_id, party_id) prevents dupes
```

> **Note on `ON CONFLICT DO NOTHING`:** The unique constraint on `business_parties` is
> `UNIQUE(organization_id, party_id)` — a UUID collision is impossible in practice
> (`gen_random_uuid()` is 122 bits of entropy). The `DO NOTHING` is purely a rerun guard
> and will never trigger in production.

### 2b — Populate `client_party_map` and write back `clients.party_id`

```sql
-- Step 2b: Map clients → newly created business_parties rows
-- Safe join: business_parties was just inserted in 2a; link by (org_id, name, created_at)
-- If the same name exists twice in the same org, this match is ambiguous — the
-- application-layer loop must detect this and route the second row to a distinct party
-- (e.g. append a suffix or create a second party row). Log ambiguous cases for manual review.

WITH newly_created AS (
  SELECT
    c.id AS client_id,
    bp.party_id,
    c.org_id
  FROM clients c
  JOIN business_parties bp
    ON bp.organization_id = c.org_id
   AND bp.name            = c.name
   AND bp.created_at      = c.created_at  -- tie-break: same timestamp
  WHERE c.org_id    = :org_id
    AND c.party_id IS NULL
)
INSERT INTO client_party_map (client_id, party_id, org_id)
SELECT client_id, party_id, org_id
FROM newly_created
ON CONFLICT (client_id) DO NOTHING;

-- Write shadow column back to clients
UPDATE clients c
SET
  party_id               = m.party_id,
  party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = c.id
  AND c.org_id    = :org_id
  AND c.party_id IS NULL;
```

### 2c — Insert `crm_accounts` overlay rows

```sql
INSERT INTO crm_accounts (
  id, org_id, party_id,
  account_manager_id, health_score, health_status,
  churn_risk_score, investment_value,
  status, converted_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  c.org_id,
  c.party_id,            -- shadow column populated in 2b
  c.account_manager_id,
  c.health_score,
  c.health_status,
  c.churn_risk_score,
  c.investment_value,
  c.status,
  c.converted_at,
  c.created_at,
  c.updated_at
FROM clients c
WHERE c.org_id   = :org_id
  AND c.party_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Reconciliation query after Step 2 (run before advancing to Step 3)

```sql
-- MUST return zero rows before proceeding.
-- Every clients row must have a non-null party_id.
SELECT c.id, c.org_id, c.name
FROM clients c
WHERE c.party_id IS NULL
ORDER BY c.org_id, c.id;

-- Every clients.party_id must exist in business_parties under the same org.
SELECT c.id, c.org_id, c.party_id
FROM clients c
LEFT JOIN business_parties bp
  ON bp.party_id        = c.party_id
 AND bp.organization_id = c.org_id
WHERE c.party_id IS NOT NULL
  AND bp.party_id IS NULL;

-- crm_accounts count must equal clients count (excluding soft-deleted).
SELECT
  (SELECT COUNT(*) FROM clients   WHERE deleted_at IS NULL) AS clients_count,
  (SELECT COUNT(*) FROM crm_accounts)                       AS crm_accounts_count;
-- Expected: both columns equal.

-- Idempotency: rerun of 2a/2b/2c should change zero rows.
```

**Gate (before Step 3):**
- Both reconciliation queries return zero rows
- Idempotent rerun changes zero rows
- `crm_accounts` count == `clients` count
- Rollback path tested on staging (null all `party_id` columns, delete `client_party_map` rows, truncate `crm_accounts`)

---

## Step 3 — Add shadow columns to all 10 consumer tables

Run as a single migration (additive, near-instant on Neon — nullable column, no default).
One `ALTER TABLE` per consumer table, all in the same migration file.

```sql
-- File: backend/migrations/<timestamp>_w6_02b_consumer_shadows.sql

-- Stage A consumers
ALTER TABLE inv_vendors
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE fin_collection_activities
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

-- Stage B consumers
ALTER TABLE vendor_credits
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE fin_recurring_bill_templates
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE acc_fixed_assets
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE fin_payment_run_items
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE fin_recurring_invoice_templates
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

-- Stage C consumers (HIGHEST RISK — same additive step, gated separately below)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

ALTER TABLE purchase_bills
  ADD COLUMN IF NOT EXISTS party_id               TEXT,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at  TIMESTAMPTZ;

-- Partial indexes (WHERE NOT NULL — cheap, only index populated rows)
CREATE INDEX IF NOT EXISTS idx_inv_vendors_party_id
  ON inv_vendors(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_collection_activities_party_id
  ON fin_collection_activities(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_credits_party_id
  ON vendor_credits(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_recurring_bill_templates_party_id
  ON fin_recurring_bill_templates(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acc_fixed_assets_party_id
  ON acc_fixed_assets(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_payment_run_items_party_id
  ON fin_payment_run_items(run_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_notes_party_id
  ON credit_notes(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_recurring_invoice_templates_party_id
  ON fin_recurring_invoice_templates(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_party_id
  ON invoices(org_id, party_id) WHERE party_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_bills_party_id
  ON purchase_bills(org_id, party_id) WHERE party_id IS NOT NULL;
```

**Drizzle schema changes:** add `partyId text` and `partyIdBackfilledAt timestamp` to each
of the 10 consumer table definitions in their respective schema files.

**Gate:** migration applies without lock; all new columns are NULL on all rows; prior app boots.

**Rollback:**
```sql
ALTER TABLE inv_vendors                  DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_collection_activities    DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE vendor_credits               DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_recurring_bill_templates DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE acc_fixed_assets             DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_payment_run_items        DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE credit_notes                 DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_recurring_invoice_templates DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE invoices                     DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE purchase_bills               DROP COLUMN IF EXISTS party_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
```

---

## Step 4 — Backfill: populate consumer `party_id` from `client_party_map`

Each consumer table's `client_id` (or `vendor_id`) is an integer FK into `clients.id`.
After Step 2, `client_party_map` holds `client_id → party_id` for every `clients` row.
Run per-org in batches of ≤1000 rows per transaction.

### Stage A — `inv_vendors` and `fin_collection_activities`

`inv_vendors` has two cases: rows with `client_id` (linked to a CRM client) and rows
where `client_id IS NULL` (standalone inventory vendors with no CRM record). Both must
end up with a `party_id`.

```sql
-- Case 1: inv_vendors with a client_id link — use client_party_map
UPDATE inv_vendors v
SET
  party_id               = m.party_id,
  party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = v.client_id
  AND v.org_id    = :org_id
  AND v.party_id IS NULL;

-- Case 2: inv_vendors with no client_id — create a new VENDOR party row
-- (must be run as application-layer logic to generate UUIDs and populate client_party_map)
-- For each inv_vendors row WHERE client_id IS NULL AND party_id IS NULL AND org_id = :org_id:
--   1. INSERT INTO business_parties (party_id=gen_random_uuid(), organization_id=v.org_id,
--        party_type='VENDOR', name=v.name, email=v.email, phone=v.phone, status='active',
--        created_at=v.created_at, updated_at=v.updated_at)
--      ON CONFLICT DO NOTHING;
--   2. UPDATE inv_vendors SET party_id=<new_party_id>, party_id_backfilled_at=NOW()
--      WHERE id=v.id;
-- Do NOT use a pure SQL loop here — application layer manages UUID generation safely.
```

```sql
-- fin_collection_activities — all rows have a non-null client_id (NOT NULL column)
UPDATE fin_collection_activities fa
SET
  party_id               = m.party_id,
  party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = fa.client_id
  AND fa.org_id   = :org_id
  AND fa.party_id IS NULL;
```

### Stage B — remaining 6 tables

Template — repeat for each table, substituting the table name and FK column name:

```sql
-- vendor_credits (FK column: vendor_id)
UPDATE vendor_credits t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.vendor_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL;

-- fin_recurring_bill_templates (FK column: vendor_id)
UPDATE fin_recurring_bill_templates t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.vendor_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL;

-- acc_fixed_assets (FK column: vendor_id)
UPDATE acc_fixed_assets t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.vendor_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL;

-- fin_payment_run_items (FK column: vendor_id; no org_id column — join via run_id)
-- Note: fin_payment_run_items has no org_id column; scope via run → org join
UPDATE fin_payment_run_items t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
JOIN fin_payment_runs r ON r.id = t.run_id AND r.org_id = :org_id
WHERE m.client_id = t.vendor_id
  AND t.party_id IS NULL;

-- credit_notes (FK column: client_id)
UPDATE credit_notes t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.client_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL;

-- fin_recurring_invoice_templates (FK column: client_id)
UPDATE fin_recurring_invoice_templates t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.client_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL;
```

### Stage C — `invoices` and `purchase_bills` (HIGHEST RISK)

> **Highest-risk stage in the entire Wave 6 program.** `invoices` and `purchase_bills`
> are the largest finance tables. They are written transactionally during every invoice
> creation, payment recording, and bill approval flow. A missed row means the service
> attempts to JOIN `business_parties` on a NULL `party_id` for an existing record —
> this is a silent data gap that only surfaces at read time, breaking invoice display
> and AR aging reports. A missed row on a NEW invoice (written before dual-write is
> enabled) means the invoice is created with `client_id` only and never gets a
> `party_id` — undetected until the next reconciliation check.
>
> **Mitigation:** enable dual-write (Step 5) BEFORE running Stage C backfill. The
> dual-write ensures every row created after Step 5 already has a `party_id`. The
> backfill then only needs to catch up historical rows.
>
> Batch size: **500 rows per org per transaction** for these tables (half the standard
> 1000 cap to avoid long-running transactions blocking concurrent invoice writes on Neon).
> Track progress: write a `migration_progress` log row after each org batch completes.

```sql
-- invoices (FK column: client_id)
-- Batched by org; process in chunks of 500 ordered by id ASC
-- Run this loop until SELECT COUNT(*) FROM invoices WHERE org_id=:org_id AND party_id IS NULL = 0

UPDATE invoices t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.client_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL
  AND t.id        IN (
    SELECT id FROM invoices
    WHERE org_id = :org_id AND party_id IS NULL
    ORDER BY id ASC
    LIMIT 500
  );

-- purchase_bills (FK column: vendor_id)
-- Same batch pattern

UPDATE purchase_bills t
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = t.vendor_id
  AND t.org_id    = :org_id
  AND t.party_id IS NULL
  AND t.id        IN (
    SELECT id FROM purchase_bills
    WHERE org_id = :org_id AND party_id IS NULL
    ORDER BY id ASC
    LIMIT 500
  );
```

---

## Step 5 — Reconciliation queries (run after each stage)

Run these after each stage's backfill completes. **Every query must return zero rows
before advancing to the next stage.** The invoices/purchase_bills queries (Stage C)
also require explicit owner approval before read cutover.

### Stage A reconciliation

```sql
-- inv_vendors: 100% populated
SELECT id, org_id, name, client_id
FROM inv_vendors
WHERE party_id IS NULL
ORDER BY org_id, id;
-- Expected: zero rows.

-- inv_vendors: no cross-org orphan party_id
SELECT v.id, v.org_id, v.party_id
FROM inv_vendors v
LEFT JOIN business_parties bp
  ON bp.party_id        = v.party_id
 AND bp.organization_id = v.org_id
WHERE v.party_id IS NOT NULL
  AND bp.party_id IS NULL;
-- Expected: zero rows.

-- fin_collection_activities: 100% populated (all rows have non-null client_id)
SELECT id, org_id, client_id
FROM fin_collection_activities
WHERE party_id IS NULL
ORDER BY org_id, id;
-- Expected: zero rows.

-- fin_collection_activities: no cross-org orphan
SELECT fa.id, fa.org_id, fa.party_id
FROM fin_collection_activities fa
LEFT JOIN business_parties bp
  ON bp.party_id        = fa.party_id
 AND bp.organization_id = fa.org_id
WHERE fa.party_id IS NOT NULL
  AND bp.party_id IS NULL;
-- Expected: zero rows.
```

### Stage B reconciliation (repeat pattern for each table)

```sql
-- Template: substitute table name and org_id column
SELECT id, org_id, vendor_id   -- or client_id
FROM <table>
WHERE party_id IS NULL
ORDER BY org_id, id;
-- Expected: zero rows.

SELECT t.id, t.org_id, t.party_id
FROM <table> t
LEFT JOIN business_parties bp
  ON bp.party_id        = t.party_id
 AND bp.organization_id = t.org_id
WHERE t.party_id IS NOT NULL
  AND bp.party_id IS NULL;
-- Expected: zero rows.
```

> **`fin_payment_run_items` note:** this table has no `org_id` column. Use `run_id → fin_payment_runs.org_id` in the orphan check:
> ```sql
> SELECT pri.id, r.org_id, pri.party_id
> FROM fin_payment_run_items pri
> JOIN fin_payment_runs r ON r.id = pri.run_id
> LEFT JOIN business_parties bp
>   ON bp.party_id        = pri.party_id
>  AND bp.organization_id = r.org_id
> WHERE pri.party_id IS NOT NULL
>   AND bp.party_id IS NULL;
> ```

### Stage C reconciliation (HIGHEST RISK — requires owner approval before read cutover)

```sql
-- invoices: 100% populated
SELECT id, org_id, client_id, invoice_number
FROM invoices
WHERE party_id IS NULL
ORDER BY org_id, id;
-- Expected: zero rows.

-- invoices: no cross-org orphan
SELECT i.id, i.org_id, i.party_id
FROM invoices i
LEFT JOIN business_parties bp
  ON bp.party_id        = i.party_id
 AND bp.organization_id = i.org_id
WHERE i.party_id IS NOT NULL
  AND bp.party_id IS NULL;
-- Expected: zero rows.

-- purchase_bills: 100% populated
SELECT id, org_id, vendor_id, bill_number
FROM purchase_bills
WHERE party_id IS NULL
ORDER BY org_id, id;
-- Expected: zero rows.

-- purchase_bills: no cross-org orphan
SELECT pb.id, pb.org_id, pb.party_id
FROM purchase_bills pb
LEFT JOIN business_parties bp
  ON bp.party_id        = pb.party_id
 AND bp.organization_id = pb.org_id
WHERE pb.party_id IS NOT NULL
  AND bp.party_id IS NULL;
-- Expected: zero rows.

-- Aggregate count check
SELECT
  (SELECT COUNT(*) FROM invoices      WHERE party_id IS NOT NULL) AS invoices_with_party,
  (SELECT COUNT(*) FROM invoices)                                  AS invoices_total,
  (SELECT COUNT(*) FROM purchase_bills WHERE party_id IS NOT NULL) AS bills_with_party,
  (SELECT COUNT(*) FROM purchase_bills)                            AS bills_total;
-- Expected: _with_party == _total for both.
```

---

## Step 6 — Dual-write: enable shadow writes in service layer

After reconciliation queries pass for a given stage, enable dual-write in the relevant
service classes. The dual-write writes both the legacy integer FK column (`client_id` /
`vendor_id`) AND the new `party_id` text column on every CREATE and UPDATE.

**Pattern for each service (example: `InvoiceService`):**

```typescript
// In InvoiceService.create(dto, actor):
// Resolve party_id from client_id using client_party_map
const partyRow = await this.db.query.clientPartyMap.findFirst({
  where: and(
    eq(clientPartyMap.clientId, dto.clientId),
  ),
});

await this.db.insert(invoices).values({
  orgId:    actor.orgId,
  clientId: dto.clientId,           // legacy write — still populated
  partyId:  partyRow?.partyId ?? null,  // shadow write
  // ... other fields
});
```

> **Update paths must also dual-write.** Audit every `service.update()` method that
> touches `clientId`/`vendorId`. A shadow write on create but not on update causes
> `party_id` to go stale after the first edit — this is a bug that causes the
> reconciliation query to pass initially but fail after the first update.

**Stage C dual-write is the highest-risk service change.** Before enabling it for
`invoices` and `purchase_bills`, confirm that the `InvoicesService.create`,
`InvoicesService.update`, `PurchaseBillsService.create`, and `PurchaseBillsService.update`
all resolve `party_id` from `client_party_map` and that the map lookup is covered by
`idx_client_party_map_party` (it uses `client_id` as the lookup key, which is the PK).

---

## Step 7 — Shadow-read comparison (7+ days per stage)

For each consumer table's service, add a shadow-read that fetches the party's
identity fields from both the legacy path (`clients.name`, `clients.email`) and
the new path (`business_parties.name`, `business_parties.email`), compares them,
and logs mismatches. The existing response still comes from the legacy path.
Do not advance to read cutover until zero unexplained mismatches for ≥7 consecutive days.

**Example pattern (`InvoiceService.findById`):**

```typescript
const [legacyClient, partyRow] = await Promise.all([
  this.db.query.clients.findFirst({ where: eq(clients.id, invoice.clientId) }),
  invoice.partyId
    ? this.db.query.businessParties.findFirst({
        where: and(
          eq(businessParties.partyId, invoice.partyId),
          eq(businessParties.organizationId, actor.orgId),
        ),
      })
    : Promise.resolve(null),
]);

if (partyRow) {
  const mismatches: string[] = [];
  if (legacyClient?.name  !== partyRow.name)  mismatches.push('name');
  if (legacyClient?.email !== partyRow.email) mismatches.push('email');
  if (mismatches.length > 0) {
    this.logger.warn('party_shadow_mismatch', {
      table: 'invoices', invoiceId: invoice.id, orgId: actor.orgId,
      fields: mismatches,
      legacy: { name: legacyClient?.name, email: legacyClient?.email },
      party:  { name: partyRow.name,       email: partyRow.email },
    });
  }
}
// Return response from legacyClient path (no behavior change)
```

---

## Step 8 — Read cutover + add composite FK constraints

After zero mismatches for ≥7 days, switch reads from `clients` to `business_parties`
one consumer at a time. Add the composite FK constraint as part of the cutover migration.

### Composite FK constraint per table (add after read cutover, as `NOT VALID` first)

```sql
-- Example for invoices (repeat for each migrated table)
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_party
    FOREIGN KEY (org_id, party_id)
    REFERENCES business_parties(organization_id, party_id)
    ON DELETE SET NULL
    NOT VALID;

-- Run VALIDATE separately (does not block writes, scans table with ShareLock only)
VALIDATE CONSTRAINT fk_invoices_party;
```

Full list of constraints to add (after read cutover for that table):

| Table | Constraint name | FK columns | References |
|---|---|---|---|
| `inv_vendors` | `fk_inv_vendors_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `fin_collection_activities` | `fk_fin_collection_activities_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `vendor_credits` | `fk_vendor_credits_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `fin_recurring_bill_templates` | `fk_fin_recurring_bill_templates_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `acc_fixed_assets` | `fk_acc_fixed_assets_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `fin_payment_run_items` | `fk_fin_payment_run_items_party` | see note | — |
| `credit_notes` | `fk_credit_notes_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `fin_recurring_invoice_templates` | `fk_fin_recurring_invoice_templates_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `invoices` | `fk_invoices_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |
| `purchase_bills` | `fk_purchase_bills_party` | `(org_id, party_id)` | `business_parties(organization_id, party_id)` |

> **`fin_payment_run_items` note:** this table has no `org_id` column — the composite
> FK pattern cannot be applied directly. Instead, add a plain single-column FK:
> ```sql
> ALTER TABLE fin_payment_run_items
>   ADD CONSTRAINT fk_fin_payment_run_items_party
>     FOREIGN KEY (party_id) REFERENCES business_parties(party_id) ON DELETE SET NULL
>     NOT VALID;
> VALIDATE CONSTRAINT fk_fin_payment_run_items_party;
> ```

---

## Step 9 — Stop legacy writes (W6.10)

After read cutover has been clean for ≥2 releases, stop dual-writing to the integer
`client_id` / `vendor_id` column in each service. The column remains in the schema
(nullable, no data dropped). Order: Stage A → Stage B → Stage C.

- Remove the `client_id` / `vendor_id` write from each service's create/update methods
- Confirm via query telemetry that the column is no longer written
- Gate: zero writes confirmed for ≥2 releases before advancing

---

## Step 10 — Drop legacy FK columns + `client_party_map` (W6.11 — contract)

> **Irreversible.** Requires explicit owner approval, ≥30 days + ≥2 releases since
> W6.10, verified backup restore, and zero legacy column reads in query telemetry.

```sql
-- File: backend/migrations/<timestamp>_w6_11_drop_legacy_fks.sql
-- Run per-table after all gates pass

-- Stage A
ALTER TABLE inv_vendors               DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_collection_activities DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;

-- Stage B
ALTER TABLE vendor_credits               DROP COLUMN IF EXISTS vendor_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_recurring_bill_templates DROP COLUMN IF EXISTS vendor_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE acc_fixed_assets             DROP COLUMN IF EXISTS vendor_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_payment_run_items        DROP COLUMN IF EXISTS vendor_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE credit_notes                 DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_recurring_invoice_templates DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;

-- Stage C
ALTER TABLE invoices       DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE purchase_bills DROP COLUMN IF EXISTS vendor_id, DROP COLUMN IF EXISTS party_id_backfilled_at;

-- Drop migration-aid support table (no longer needed)
DROP TABLE IF EXISTS client_party_map;
```

Remove all `clientId` / `vendorId` fields from Drizzle schema definitions and Drizzle
`relations` blocks for the affected tables. Run `pnpm -C backend db:generate` and
verify build + lint + types pass.

---

## Step 11 — `crm_accounts` overlay: linking `business_parties` as the CRM name

`crm_accounts` (created in Step 0) is the CRM-specific overlay table that links
`business_parties` to CRM account data (health score, account manager, investment value,
churn risk). It is not a separate migration step — it was created in Step 0 and
backfilled in Step 2c. The read cutover for CRM services is covered under W6.3/W6.4
in the main execution plan.

**Post-cutover CRM service join pattern:**

```typescript
// CRM services join: crm_accounts → business_parties
const account = await this.db
  .select({
    id:               crmAccounts.id,
    partyId:          crmAccounts.partyId,
    name:             businessParties.name,
    email:            businessParties.email,
    phone:            businessParties.phone,
    taxNumber:        businessParties.taxNumber,
    status:           businessParties.status,
    healthScore:      crmAccounts.healthScore,
    healthStatus:     crmAccounts.healthStatus,
    accountManagerId: crmAccounts.accountManagerId,
  })
  .from(crmAccounts)
  .innerJoin(
    businessParties,
    and(
      eq(businessParties.partyId,        crmAccounts.partyId),
      eq(businessParties.organizationId, crmAccounts.orgId),
    ),
  )
  .where(
    and(
      eq(crmAccounts.orgId,    actor.orgId),
      eq(crmAccounts.partyId,  partyId),
    ),
  )
  .limit(1);
```

`crm_accounts` does NOT replace `clients` directly — `clients` remains the legacy
physical table during the migration window. `crm_accounts` is the new CRM overlay
reading from `business_parties`. The CRM services cut over to `crm_accounts +
business_parties` in W6.4; `clients` stops being written to in W6.10; `clients` is
evaluated for drop or view-conversion in W6.11.

---

## Risk register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Missed row in Stage C backfill (invoices/purchase_bills) | Medium — high row count | HIGH — invoice creation breaks on read | Batch 500 rows/org/txn; reconciliation query MUST show zero before dual-write enables; dual-write catches all new rows |
| Stale `party_id` after an UPDATE (dual-write gap on update path) | Medium | HIGH — shadow comparison shows mismatch | Audit ALL service update methods; enforce in code review gate |
| Name collision in same org during `client_party_map` join (Step 2b) | Low — requires two clients with identical names + identical `created_at` | Medium — wrong party linked | Detect in application-layer loop; log ambiguous cases; add a sequence suffix or manual review step |
| `fin_payment_run_items` has no `org_id` — orphan check requires multi-join | Low | Low — detectable | Use `run_id → fin_payment_runs.org_id` join in all reconciliation queries for this table |
| `inv_vendors` with `client_id IS NULL` never gets a `party_id` (Case 2 skipped) | Medium — many vendors are standalone | HIGH — vendor lookup breaks on cutover | Case 2 application logic (Step 4, Stage A) must run before reconciliation query; log count of standalone vendors processed |
| Cross-tenant party leak (party_id from wrong org) | Very Low | CRITICAL | Every reconciliation query includes the cross-org orphan check; composite FK enforces `(org_id, party_id)` pair |
| Stage C read cutover without owner approval | Low (process) | HIGH | Stage C gate in `wave-2-6-execution-plan.md` explicitly requires owner approval beyond technical gates |

---

## Sequencing summary

```
Step 0   W6.1   crm_accounts table (additive)
Step 1   W6.2-pre  clients.party_id shadow column + client_party_map
Step 2   W6.2   Backfill clients → business_parties + crm_accounts (per-org batches)
Step 3   W6.2b  Shadow columns on all 10 consumer tables (additive, single migration)
Step 4   W6.6/W6.9  Backfill consumers from client_party_map
         ├── Stage A: inv_vendors + fin_collection_activities
         │   └── Reconciliation → dual-write enable (Step 5) → shadow-read 7d (Step 6)
         │       → read cutover + composite FK NOT VALID (Step 7) → VALIDATE
         ├── Stage B: vendor_credits + fin_recurring_bill_templates +
         │           acc_fixed_assets + fin_payment_run_items +
         │           credit_notes + fin_recurring_invoice_templates
         │   └── (same gate sequence as Stage A)
         └── Stage C: invoices + purchase_bills  ← HIGHEST RISK
             └── (same gate sequence; requires owner approval before read cutover)
Step 9   W6.10  Stop legacy client_id/vendor_id writes (A then B then C)
Step 10  W6.11  Drop legacy FK columns + client_party_map (owner approval required)
```

Gates between stages are hard — not optional observations. "Code merged" is not an
exit criterion. Each stage must complete its reconciliation, shadow-read 7-day window,
and owner approval (for Stage C) before the next stage begins.
