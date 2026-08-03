---
type: wave-4 patch spec (finance+accounting)
status: DRAFT
date: 2026-07-26
covers: finance-ar-ap.ts, finance-assets.ts, finance-banking.ts, finance-expenses.ts, finance-planning.ts, finance-tax.ts, accounting.ts, accounting-core.ts
excludes: billing.ts (int→text org_id already fixed in commit 0c8e21b)
source-matrix: docs/schema-migration/wave-0-composite-fk-matrix-inventory-finance.md §2–9
---

# Wave 4 — Finance + Accounting composite-FK patch spec

> Implementation-ready Drizzle diffs + raw SQL for every table that needs
> tenant-safe composite foreign keys in the finance/accounting domain.
> Execution order: **A → B → C → D** (described below).
> All finance/accounting org_id columns are already `text` — zero int/text mismatches.

---

## Execution order

| Phase | What | Why |
|---|---|---|
| **A** | Add missing `org_id` columns to line tables | `credit_note_items`, `vendor_credit_items`, `fin_payment_run_items` have no own `org_id`; composite FK is impossible without one |
| **B** | Add missing single-column `.references()` | `journal_entries.period_id` references `accounting_periods` but has no FK at all |
| **C** | Add `UNIQUE(org_id, id)` candidate keys | `ledger_accounts` and `journal_entries` block 18+ downstream FKs — do these first, then the other parents |
| **D** | Add composite foreign keys | All downstream children, in dependency order |

---

## PHASE A — Add `org_id` to line tables that lack it

### A-1. `credit_note_items` — add `org_id`

**Current state (`finance-ar-ap.ts` lines 44–56):**
```ts
export const creditNoteItems = pgTable("credit_note_items", {
  id: serial("id").primaryKey(),
  creditNoteId: integer("credit_note_id").references(() => creditNotes.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId column
```

**After:**
```ts
import { foreignKey } from "drizzle-orm/pg-core"; // add to import if not present

export const creditNoteItems = pgTable("credit_note_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  creditNoteId: integer("credit_note_id").references(() => creditNotes.id, { onDelete: "cascade" }).notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_credit_note_items_cn").on(table.creditNoteId),
  index("idx_credit_note_items_org").on(table.orgId),
  foreignKey({
    columns: [table.orgId, table.creditNoteId],
    foreignColumns: [creditNotes.orgId, creditNotes.id],
    name: "fk_credit_note_items_org_cn",
  }),
]);
```

**Generated SQL — add column + backfill + NOT NULL + composite FK:**
```sql
-- Step 1: add nullable
ALTER TABLE credit_note_items
  ADD COLUMN IF NOT EXISTS org_id text;

-- Step 2: backfill from parent
UPDATE credit_note_items ci
SET org_id = cn.org_id
FROM credit_notes cn
WHERE cn.id = ci.credit_note_id;

-- Step 3: quarantine orphans (should be zero; delete if not)
SELECT ci.id, ci.credit_note_id
FROM credit_note_items ci
WHERE ci.org_id IS NULL;
-- If any rows returned: DELETE FROM credit_note_items WHERE org_id IS NULL;

-- Step 4: lock down NOT NULL
ALTER TABLE credit_note_items
  ALTER COLUMN org_id SET NOT NULL;

-- Step 5: FK to organizations
ALTER TABLE credit_note_items
  ADD CONSTRAINT fk_credit_note_items_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
  NOT VALID;
ALTER TABLE credit_note_items
  VALIDATE CONSTRAINT fk_credit_note_items_org;

-- Step 6: index
CREATE INDEX IF NOT EXISTS idx_credit_note_items_org
  ON credit_note_items (org_id);

-- Step 7: composite FK to credit_notes (added in Phase D — candidate key on credit_notes needed first)
```

**Backfill/quarantine query:**
```sql
SELECT ci.id, ci.credit_note_id
FROM credit_note_items ci
LEFT JOIN credit_notes cn ON cn.id = ci.credit_note_id AND cn.org_id = ci.org_id
WHERE cn.id IS NULL;
-- Any returned rows are cross-tenant or orphaned; delete before adding composite FK.
```

---

### A-2. `vendor_credit_items` — add `org_id`

**Current state (`finance-ar-ap.ts` lines 94–106):**
```ts
export const vendorCreditItems = pgTable("vendor_credit_items", {
  id: serial("id").primaryKey(),
  vendorCreditId: integer("vendor_credit_id").references(() => vendorCredits.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId column
```

**After:**
```ts
export const vendorCreditItems = pgTable("vendor_credit_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  vendorCreditId: integer("vendor_credit_id").references(() => vendorCredits.id, { onDelete: "cascade" }).notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_vendor_credit_items_vc").on(table.vendorCreditId),
  index("idx_vendor_credit_items_org").on(table.orgId),
  foreignKey({
    columns: [table.orgId, table.vendorCreditId],
    foreignColumns: [vendorCredits.orgId, vendorCredits.id],
    name: "fk_vendor_credit_items_org_vc",
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE vendor_credit_items
  ADD COLUMN IF NOT EXISTS org_id text;

UPDATE vendor_credit_items vci
SET org_id = vc.org_id
FROM vendor_credits vc
WHERE vc.id = vci.vendor_credit_id;

SELECT id FROM vendor_credit_items WHERE org_id IS NULL;

ALTER TABLE vendor_credit_items
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE vendor_credit_items
  ADD CONSTRAINT fk_vendor_credit_items_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
  NOT VALID;
ALTER TABLE vendor_credit_items VALIDATE CONSTRAINT fk_vendor_credit_items_org;

CREATE INDEX IF NOT EXISTS idx_vendor_credit_items_org ON vendor_credit_items (org_id);
```

**Backfill/quarantine query:**
```sql
SELECT vci.id, vci.vendor_credit_id
FROM vendor_credit_items vci
LEFT JOIN vendor_credits vc ON vc.id = vci.vendor_credit_id AND vc.org_id = vci.org_id
WHERE vc.id IS NULL;
```

---

### A-3. `fin_payment_run_items` — add `org_id`

**Current state (`finance-ar-ap.ts` lines 215–227):**
```ts
export const finPaymentRunItems = pgTable("fin_payment_run_items", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => finPaymentRuns.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId column
```

**After:**
```ts
export const finPaymentRunItems = pgTable("fin_payment_run_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  runId: integer("run_id").references(() => finPaymentRuns.id, { onDelete: "cascade" }).notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_fin_payment_run_items_run").on(table.runId),
  index("idx_fin_payment_run_items_bill").on(table.billId),
  index("idx_fin_payment_run_items_org").on(table.orgId),
  foreignKey({
    columns: [table.orgId, table.runId],
    foreignColumns: [finPaymentRuns.orgId, finPaymentRuns.id],
    name: "fk_fin_payment_run_items_org_run",
  }),
]);
```

**Generated SQL:**
```sql
ALTER TABLE fin_payment_run_items
  ADD COLUMN IF NOT EXISTS org_id text;

UPDATE fin_payment_run_items pri
SET org_id = pr.org_id
FROM fin_payment_runs pr
WHERE pr.id = pri.run_id;

SELECT id FROM fin_payment_run_items WHERE org_id IS NULL;

ALTER TABLE fin_payment_run_items
  ALTER COLUMN org_id SET NOT NULL;

ALTER TABLE fin_payment_run_items
  ADD CONSTRAINT fk_fin_payment_run_items_org
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
  NOT VALID;
ALTER TABLE fin_payment_run_items VALIDATE CONSTRAINT fk_fin_payment_run_items_org;

CREATE INDEX IF NOT EXISTS idx_fin_payment_run_items_org ON fin_payment_run_items (org_id);
```

**Backfill/quarantine query:**
```sql
SELECT pri.id, pri.run_id
FROM fin_payment_run_items pri
LEFT JOIN fin_payment_runs pr ON pr.id = pri.run_id AND pr.org_id = pri.org_id
WHERE pr.id IS NULL;
```

---

## PHASE B — Add missing single-column FKs

### B-1. `journal_entries.period_id` — add FK to `accounting_periods`

**Current state (`accounting.ts` line 40):**
```ts
periodId: integer("period_id"),   // bare integer, no .references()
```

**After:**
```ts
periodId: integer("period_id").references(() => accountingPeriods.id, { onDelete: "set null" }),
```

> `accounting-core.ts` must be imported in `accounting.ts` (add import):
> ```ts
> import { accountingPeriods } from "./accounting-core";
> ```
> This creates a circular import risk. Drizzle schema files are allowed to cross-import
> because they are not runtime modules. If the circular import causes a Drizzle schema
> resolution error, move the FK declaration into the `(table) => []` array using a `foreignKey()`
> call that lazily references the table, or move `accountingPeriods` to a shared base schema file.

**Generated SQL:**
```sql
-- accounting_periods already has a PK on id; single-col FK is straightforward
ALTER TABLE journal_entries
  ADD CONSTRAINT fk_journal_entries_period
  FOREIGN KEY (period_id) REFERENCES accounting_periods(id) ON DELETE SET NULL
  NOT VALID;
ALTER TABLE journal_entries VALIDATE CONSTRAINT fk_journal_entries_period;

-- Quarantine: entries pointing at a period from a different org
SELECT je.id, je.period_id, je.org_id, ap.org_id AS period_org
FROM journal_entries je
JOIN accounting_periods ap ON ap.id = je.period_id
WHERE je.period_id IS NOT NULL
  AND je.org_id <> ap.org_id;
-- Fix: UPDATE journal_entries SET period_id = NULL WHERE id IN (<ids from above>);
```

---

## PHASE C — Add `UNIQUE(org_id, id)` candidate keys

Order within phase C matters: `ledger_accounts` and `journal_entries` are the two highest-fanout
blockers and must land first. Then downstream parents that have children in Phase D.

### C-1. `ledger_accounts` — UNIQUE(org_id, id) [CRITICAL — blocks 9+ FKs]

**Current state (`accounting.ts`):**
The table has `unique("uniq_ledger_accounts_org_code").on(table.orgId, table.code)` but NO
`UNIQUE(org_id, id)`. The single-col self-ref `foreignKey` on `parentAccountId` exists.

**Drizzle change (add to the table's constraint array):**
```ts
export const ledgerAccounts = pgTable("ledger_accounts", {
  // ... columns unchanged
}, (table) => [
  foreignKey({ columns: [table.parentAccountId], foreignColumns: [table.id] }).onDelete("set null"),
  unique("uniq_ledger_accounts_org_code").on(table.orgId, table.code),
  unique("uniq_ledger_accounts_org_id").on(table.orgId, table.id),   // ADD THIS
  index("idx_ledger_accounts_org_type_active").on(table.orgId, table.accountType, table.isActive),
]);
```

**Generated SQL:**
```sql
-- This is a covering unique index; Postgres can use it for both lookups and FK targets.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_ledger_accounts_org_id
  ON ledger_accounts (org_id, id);

-- No data quarantine needed: (org_id, id) is always unique by definition of serial PK
-- within an org (org_id is NOT NULL). Safe to add immediately.
```

---

### C-2. `journal_entries` — UNIQUE(org_id, id) [CRITICAL — blocks 9+ FKs]

**Current state (`accounting.ts`):**
Has `unique("uniq_je_org_number")` and `unique("uniq_je_idempotency")` but NO `UNIQUE(org_id, id)`.
The single-col self-ref `foreignKey` on `reversedEntryId` exists.

**Drizzle change:**
```ts
export const journalEntries = pgTable("journal_entries", {
  // ... columns unchanged
}, (table) => [
  unique("uniq_je_org_number").on(table.orgId, table.entryNumber),
  unique("uniq_je_idempotency").on(table.orgId, table.sourceType, table.sourceId, table.sourceEvent),
  unique("uniq_je_org_id").on(table.orgId, table.id),               // ADD THIS
  index("idx_je_org_date").on(table.orgId, table.entryDate),
  index("idx_je_org_source").on(table.orgId, table.sourceType, table.sourceId),
  index("idx_je_org_status").on(table.orgId, table.status),
  foreignKey({ columns: [table.reversedEntryId], foreignColumns: [table.id] }).onDelete("set null"),
]);
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_je_org_id
  ON journal_entries (org_id, id);
```

---

### C-3. `credit_notes` — UNIQUE(org_id, id)

Needed for Phase D composite FK from `credit_note_items`.

**Drizzle change (add to constraint array):**
```ts
unique("uniq_credit_notes_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_credit_notes_org_id
  ON credit_notes (org_id, id);
```

---

### C-4. `vendor_credits` — UNIQUE(org_id, id)

Needed for composite FK from `vendor_credit_items`.

**Drizzle change:**
```ts
unique("uniq_vendor_credits_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_vendor_credits_org_id
  ON vendor_credits (org_id, id);
```

---

### C-5. `fin_payment_runs` — UNIQUE(org_id, id)

Needed for composite FK from `fin_payment_run_items`.

**Drizzle change:**
```ts
unique("uniq_fin_payment_runs_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_fin_payment_runs_org_id
  ON fin_payment_runs (org_id, id);
```

---

### C-6. `fin_bank_accounts` — UNIQUE(org_id, id)

Needed for composite FKs from `fin_bank_imports`, `fin_bank_transactions`, `fin_bank_transfers` (×2),
`fin_reimbursement_batches`.

**Drizzle change:**
```ts
unique("uniq_fin_bank_accounts_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_fin_bank_accounts_org_id
  ON fin_bank_accounts (org_id, id);
```

---

### C-7. `fin_bank_imports` — UNIQUE(org_id, id)

Needed for composite FK from `fin_bank_transactions.import_id`.

**Drizzle change:**
```ts
unique("uniq_fin_bank_imports_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_fin_bank_imports_org_id
  ON fin_bank_imports (org_id, id);
```

---

### C-8. `fin_bank_transactions` — UNIQUE(org_id, id)

Needed for composite FK from `fin_reconciliation_matches.bank_transaction_id`.

**Drizzle change:**
```ts
unique("uniq_fin_bank_txn_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_fin_bank_txn_org_id
  ON fin_bank_transactions (org_id, id);
```

---

### C-9. `acc_asset_categories` — UNIQUE(org_id, id)

Needed for composite FK from `acc_fixed_assets.category_id`.

**Drizzle change:**
```ts
unique("uniq_acc_asset_categories_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_acc_asset_categories_org_id
  ON acc_asset_categories (org_id, id);
```

---

### C-10. `acc_fixed_assets` — UNIQUE(org_id, id)

Needed for composite FK from `acc_depreciation_schedules.asset_id`.

**Drizzle change:**
```ts
unique("uniq_acc_fixed_assets_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_acc_fixed_assets_org_id
  ON acc_fixed_assets (org_id, id);
```

---

### C-11. `acc_depreciation_runs` — UNIQUE(org_id, id)

Needed for composite FK from `acc_depreciation_schedules.run_id`.

**Drizzle change:**
```ts
unique("uniq_acc_depreciation_runs_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_acc_depreciation_runs_org_id
  ON acc_depreciation_runs (org_id, id);
```

---

### C-12. `fin_budgets` — UNIQUE(org_id, id)

Needed for composite FKs from `fin_budget_lines.budget_id` and `fin_budget_revisions.budget_id`.

**Drizzle change:**
```ts
unique("uniq_fin_budgets_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_fin_budgets_org_id
  ON fin_budgets (org_id, id);
```

---

### C-13. `accounting_periods` — UNIQUE(org_id, id)

Needed for future composite FK on `journal_entries.period_id` (once `journal_entries` gets its own
candidate key and the self-ref is complete). The single-col FK from B-1 is unblocked immediately;
this candidate key enables a future composite FK upgrade.

**Drizzle change:**
```ts
unique("uniq_accounting_periods_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_accounting_periods_org_id
  ON accounting_periods (org_id, id);
```

---

### C-14. `accounting_dimensions` — UNIQUE(org_id, id)

Needed for composite FK from `accounting_dimension_values.dimension_id`.

**Drizzle change:**
```ts
unique("uniq_accounting_dimensions_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_accounting_dimensions_org_id
  ON accounting_dimensions (org_id, id);
```

---

## PHASE D — Add composite foreign keys

All Phase C candidate keys must be in place before running these ALTER TABLE statements.
Every FK is added `NOT VALID` and validated in a second step so it does not lock the table.

### D-1. `ledger_accounts` — composite self-ref on `parent_account_id`

Upgrades the existing single-col self-ref to a tenant-scoped composite FK.

**Drizzle change (accounting.ts):**
```ts
// Replace existing single-col self-ref:
foreignKey({ columns: [table.parentAccountId], foreignColumns: [table.id] }).onDelete("set null"),
// With composite:
foreignKey({
  columns: [table.orgId, table.parentAccountId],
  foreignColumns: [table.orgId, table.id],
  name: "fk_ledger_accounts_org_parent",
}).onDelete("set null"),
```

**Pre-validation quarantine query:**
```sql
SELECT la.id, la.parent_account_id, la.org_id
FROM ledger_accounts la
JOIN ledger_accounts parent ON parent.id = la.parent_account_id
WHERE la.parent_account_id IS NOT NULL
  AND parent.org_id <> la.org_id;
-- Fix: UPDATE ledger_accounts SET parent_account_id = NULL WHERE id IN (<ids>);
```

**Generated SQL:**
```sql
-- Drop old single-col constraint first (name may differ; verify with \d ledger_accounts)
ALTER TABLE ledger_accounts DROP CONSTRAINT IF EXISTS ledger_accounts_parent_account_id_fkey;

ALTER TABLE ledger_accounts
  ADD CONSTRAINT fk_ledger_accounts_org_parent
  FOREIGN KEY (org_id, parent_account_id)
  REFERENCES ledger_accounts (org_id, id)
  ON DELETE SET NULL
  NOT VALID;
ALTER TABLE ledger_accounts VALIDATE CONSTRAINT fk_ledger_accounts_org_parent;
```

---

### D-2. `journal_entries` — composite self-ref on `reversed_entry_id`

**Drizzle change (accounting.ts):**
```ts
foreignKey({
  columns: [table.orgId, table.reversedEntryId],
  foreignColumns: [table.orgId, table.id],
  name: "fk_journal_entries_org_reversed",
}).onDelete("set null"),
```

**Pre-validation quarantine query:**
```sql
SELECT je.id, je.reversed_entry_id, je.org_id
FROM journal_entries je
JOIN journal_entries rev ON rev.id = je.reversed_entry_id
WHERE je.reversed_entry_id IS NOT NULL
  AND rev.org_id <> je.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reversed_entry_id_fkey;

ALTER TABLE journal_entries
  ADD CONSTRAINT fk_journal_entries_org_reversed
  FOREIGN KEY (org_id, reversed_entry_id)
  REFERENCES journal_entries (org_id, id)
  ON DELETE SET NULL
  NOT VALID;
ALTER TABLE journal_entries VALIDATE CONSTRAINT fk_journal_entries_org_reversed;
```

---

### D-3. `journal_lines` — composite FKs to `journal_entries` and `ledger_accounts`

**Current state:** `journal_lines.org_id` is NULLABLE (`text("org_id").references(() => organizations.id, { onDelete: "cascade" })` — no `.notNull()`). Verify in the actual DB before enforcing NOT NULL. If nullable, the composite FK still works for non-null rows but will not enforce scoping on null rows. Recommend backfilling and tightening to NOT NULL first.

**Step 1 — verify and fix nullability:**
```sql
SELECT COUNT(*) FROM journal_lines WHERE org_id IS NULL;
-- If > 0:
UPDATE journal_lines jl
SET org_id = je.org_id
FROM journal_entries je
WHERE je.id = jl.entry_id AND jl.org_id IS NULL;

ALTER TABLE journal_lines ALTER COLUMN org_id SET NOT NULL;
```

**Drizzle change (accounting.ts):**
```ts
export const journalLines = pgTable("journal_lines", {
  // ...
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(), // fix nullable
  // ...
}, (table) => [
  index("idx_jl_entry").on(table.entryId),
  index("idx_jl_account").on(table.accountId),
  index("idx_jl_org_account").on(table.orgId, table.accountId),
  foreignKey({
    columns: [table.orgId, table.entryId],
    foreignColumns: [journalEntries.orgId, journalEntries.id],
    name: "fk_journal_lines_org_entry",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.orgId, table.accountId],
    foreignColumns: [ledgerAccounts.orgId, ledgerAccounts.id],
    name: "fk_journal_lines_org_account",
  }).onDelete("restrict"),
]);
```

**Pre-validation quarantine query:**
```sql
-- Cross-tenant entry references
SELECT jl.id FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.entry_id
WHERE je.org_id <> jl.org_id;

-- Cross-tenant account references
SELECT jl.id FROM journal_lines jl
JOIN ledger_accounts la ON la.id = jl.account_id
WHERE la.org_id <> jl.org_id;
```

**Generated SQL:**
```sql
-- Drop existing single-col FKs
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_entry_id_fkey;
ALTER TABLE journal_lines DROP CONSTRAINT IF EXISTS journal_lines_account_id_fkey;

ALTER TABLE journal_lines
  ADD CONSTRAINT fk_journal_lines_org_entry
  FOREIGN KEY (org_id, entry_id)
  REFERENCES journal_entries (org_id, id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE journal_lines
  ADD CONSTRAINT fk_journal_lines_org_account
  FOREIGN KEY (org_id, account_id)
  REFERENCES ledger_accounts (org_id, id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE journal_lines VALIDATE CONSTRAINT fk_journal_lines_org_entry;
ALTER TABLE journal_lines VALIDATE CONSTRAINT fk_journal_lines_org_account;
```

> **Known gap:** `journal_lines` has 6 bare dimension integer columns (`client_id`, `vendor_id`,
> `project_id`, `department_id`, `employee_id`, `tax_code_id`) with no `.references()`. These are
> analytic tags — intentionally unbound — but carry cross-tenant risk. Service layer MUST scope all
> dimension lookups by `org_id`. These are NOT part of this wave.

---

### D-4. `credit_note_items` — composite FK to `credit_notes`

(Phase A already added `org_id` and single-col org FK; Phase C-3 added candidate key on `credit_notes`.)

**Generated SQL:**
```sql
-- Remove old single-col FK if it was replaced in Phase A
ALTER TABLE credit_note_items DROP CONSTRAINT IF EXISTS credit_note_items_credit_note_id_fkey;

ALTER TABLE credit_note_items
  ADD CONSTRAINT fk_credit_note_items_org_cn
  FOREIGN KEY (org_id, credit_note_id)
  REFERENCES credit_notes (org_id, id)
  ON DELETE CASCADE
  NOT VALID;
ALTER TABLE credit_note_items VALIDATE CONSTRAINT fk_credit_note_items_org_cn;
```

---

### D-5. `fin_payment_allocations` — composite FKs to `payments` and `invoices`

**Prerequisite:** `payments` and `invoices` (in `crm/billing.ts`) must have `UNIQUE(org_id, id)`.
These are CRM/billing tables — verify they received candidate keys in the billing wave.
If not, add them before running this step.

**Drizzle change (finance-ar-ap.ts):**
```ts
import { foreignKey } from "drizzle-orm/pg-core";

// In finPaymentAllocations table constraint array:
foreignKey({
  columns: [table.orgId, table.paymentId],
  foreignColumns: [payments.orgId, payments.id],
  name: "fk_fin_pay_alloc_org_payment",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.invoiceId],
  foreignColumns: [invoices.orgId, invoices.id],
  name: "fk_fin_pay_alloc_org_invoice",
}).onDelete("cascade"),
```

**Pre-validation quarantine query:**
```sql
SELECT pa.id FROM fin_payment_allocations pa
JOIN payments p ON p.id = pa.payment_id
WHERE p.org_id <> pa.org_id;

SELECT pa.id FROM fin_payment_allocations pa
JOIN invoices inv ON inv.id = pa.invoice_id
WHERE inv.org_id <> pa.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_payment_allocations DROP CONSTRAINT IF EXISTS fin_payment_allocations_payment_id_fkey;
ALTER TABLE fin_payment_allocations DROP CONSTRAINT IF EXISTS fin_payment_allocations_invoice_id_fkey;

ALTER TABLE fin_payment_allocations
  ADD CONSTRAINT fk_fin_pay_alloc_org_payment
  FOREIGN KEY (org_id, payment_id) REFERENCES payments (org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_payment_allocations
  ADD CONSTRAINT fk_fin_pay_alloc_org_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices (org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_payment_allocations VALIDATE CONSTRAINT fk_fin_pay_alloc_org_payment;
ALTER TABLE fin_payment_allocations VALIDATE CONSTRAINT fk_fin_pay_alloc_org_invoice;
```

---

### D-6. `vendor_credits` — composite FKs to `clients` and `purchase_bills`

**Prerequisite:** `clients` and `purchase_bills` need `UNIQUE(org_id, id)` (CRM wave).

**Drizzle change:**
```ts
foreignKey({
  columns: [table.orgId, table.vendorId],
  foreignColumns: [clients.orgId, clients.id],
  name: "fk_vendor_credits_org_vendor",
}),
foreignKey({
  columns: [table.orgId, table.billId],
  foreignColumns: [purchaseBills.orgId, purchaseBills.id],
  name: "fk_vendor_credits_org_bill",
}),
```

**Pre-validation quarantine query:**
```sql
SELECT vc.id FROM vendor_credits vc
JOIN clients c ON c.id = vc.vendor_id
WHERE vc.vendor_id IS NOT NULL AND c.org_id <> vc.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE vendor_credits DROP CONSTRAINT IF EXISTS vendor_credits_vendor_id_fkey;
ALTER TABLE vendor_credits DROP CONSTRAINT IF EXISTS vendor_credits_bill_id_fkey;

ALTER TABLE vendor_credits
  ADD CONSTRAINT fk_vendor_credits_org_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES clients (org_id, id) NOT VALID;

ALTER TABLE vendor_credits
  ADD CONSTRAINT fk_vendor_credits_org_bill
  FOREIGN KEY (org_id, bill_id) REFERENCES purchase_bills (org_id, id) NOT VALID;

ALTER TABLE vendor_credits VALIDATE CONSTRAINT fk_vendor_credits_org_vendor;
ALTER TABLE vendor_credits VALIDATE CONSTRAINT fk_vendor_credits_org_bill;
```

---

### D-7. `vendor_credit_items` — composite FK to `vendor_credits`

(Phase A added `org_id`; Phase C-4 added candidate key on `vendor_credits`.)

**Generated SQL:**
```sql
ALTER TABLE vendor_credit_items DROP CONSTRAINT IF EXISTS vendor_credit_items_vendor_credit_id_fkey;

ALTER TABLE vendor_credit_items
  ADD CONSTRAINT fk_vendor_credit_items_org_vc
  FOREIGN KEY (org_id, vendor_credit_id)
  REFERENCES vendor_credits (org_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE vendor_credit_items VALIDATE CONSTRAINT fk_vendor_credit_items_org_vc;
```

---

### D-8. `fin_vendor_payment_allocations` — composite FKs to `vendor_payments` and `purchase_bills`

**Prerequisite:** `vendor_payments` and `purchase_bills` need `UNIQUE(org_id, id)` (CRM wave).

**Drizzle change:**
```ts
foreignKey({
  columns: [table.orgId, table.vendorPaymentId],
  foreignColumns: [vendorPayments.orgId, vendorPayments.id],
  name: "fk_fin_vpa_org_vendor_payment",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.billId],
  foreignColumns: [purchaseBills.orgId, purchaseBills.id],
  name: "fk_fin_vpa_org_bill",
}).onDelete("cascade"),
```

**Pre-validation quarantine query:**
```sql
SELECT vpa.id FROM fin_vendor_payment_allocations vpa
JOIN vendor_payments vp ON vp.id = vpa.vendor_payment_id
WHERE vp.org_id <> vpa.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_vendor_payment_allocations
  DROP CONSTRAINT IF EXISTS fin_vendor_payment_allocations_vendor_payment_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_vendor_payment_allocations_bill_id_fkey;

ALTER TABLE fin_vendor_payment_allocations
  ADD CONSTRAINT fk_fin_vpa_org_vendor_payment
  FOREIGN KEY (org_id, vendor_payment_id)
  REFERENCES vendor_payments (org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_vendor_payment_allocations
  ADD CONSTRAINT fk_fin_vpa_org_bill
  FOREIGN KEY (org_id, bill_id)
  REFERENCES purchase_bills (org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_vendor_payment_allocations VALIDATE CONSTRAINT fk_fin_vpa_org_vendor_payment;
ALTER TABLE fin_vendor_payment_allocations VALIDATE CONSTRAINT fk_fin_vpa_org_bill;
```

---

### D-9. `fin_recurring_invoice_templates` — composite FK to `clients`

**Generated SQL:**
```sql
ALTER TABLE fin_recurring_invoice_templates DROP CONSTRAINT IF EXISTS fin_recurring_invoice_templates_client_id_fkey;

ALTER TABLE fin_recurring_invoice_templates
  ADD CONSTRAINT fk_fin_rit_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients (org_id, id) NOT VALID;
ALTER TABLE fin_recurring_invoice_templates VALIDATE CONSTRAINT fk_fin_rit_org_client;
```

---

### D-10. `fin_recurring_bill_templates` — composite FK to `clients` (vendor stored as client)

**Generated SQL:**
```sql
ALTER TABLE fin_recurring_bill_templates DROP CONSTRAINT IF EXISTS fin_recurring_bill_templates_vendor_id_fkey;

ALTER TABLE fin_recurring_bill_templates
  ADD CONSTRAINT fk_fin_rbt_org_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES clients (org_id, id) NOT VALID;
ALTER TABLE fin_recurring_bill_templates VALIDATE CONSTRAINT fk_fin_rbt_org_vendor;
```

---

### D-11. `fin_reminder_log` — composite FK to `invoices`

**Generated SQL:**
```sql
ALTER TABLE fin_reminder_log DROP CONSTRAINT IF EXISTS fin_reminder_log_invoice_id_fkey;

ALTER TABLE fin_reminder_log
  ADD CONSTRAINT fk_fin_reminder_log_org_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices (org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE fin_reminder_log VALIDATE CONSTRAINT fk_fin_reminder_log_org_invoice;
```

---

### D-12. `fin_collection_activities` — composite FKs to `clients` and `invoices`

**Generated SQL:**
```sql
ALTER TABLE fin_collection_activities
  DROP CONSTRAINT IF EXISTS fin_collection_activities_client_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_collection_activities_invoice_id_fkey;

ALTER TABLE fin_collection_activities
  ADD CONSTRAINT fk_fin_ca_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients (org_id, id) NOT VALID;

ALTER TABLE fin_collection_activities
  ADD CONSTRAINT fk_fin_ca_org_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices (org_id, id) NOT VALID;

ALTER TABLE fin_collection_activities VALIDATE CONSTRAINT fk_fin_ca_org_client;
ALTER TABLE fin_collection_activities VALIDATE CONSTRAINT fk_fin_ca_org_invoice;
```

---

### D-13. `fin_payment_run_items` — composite FK to `fin_payment_runs`

(Phase A added `org_id`; Phase C-5 added candidate key on `fin_payment_runs`.)

**Generated SQL:**
```sql
ALTER TABLE fin_payment_run_items DROP CONSTRAINT IF EXISTS fin_payment_run_items_run_id_fkey;

ALTER TABLE fin_payment_run_items
  ADD CONSTRAINT fk_fin_pri_org_run
  FOREIGN KEY (org_id, run_id)
  REFERENCES fin_payment_runs (org_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE fin_payment_run_items VALIDATE CONSTRAINT fk_fin_pri_org_run;
```

---

### D-14. `fin_bank_accounts` — composite FK to `ledger_accounts`

(Phase C-1 added candidate key on `ledger_accounts`; Phase C-6 added candidate key on `fin_bank_accounts`.)

**Drizzle change (finance-banking.ts):**
```ts
import { foreignKey } from "drizzle-orm/pg-core";

// In finBankAccounts constraint array:
foreignKey({
  columns: [table.orgId, table.ledgerAccountId],
  foreignColumns: [ledgerAccounts.orgId, ledgerAccounts.id],
  name: "fk_fin_bank_accounts_org_ledger",
}),
```

**Pre-validation quarantine query:**
```sql
SELECT fba.id FROM fin_bank_accounts fba
JOIN ledger_accounts la ON la.id = fba.ledger_account_id
WHERE fba.ledger_account_id IS NOT NULL AND la.org_id <> fba.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_bank_accounts DROP CONSTRAINT IF EXISTS fin_bank_accounts_ledger_account_id_fkey;

ALTER TABLE fin_bank_accounts
  ADD CONSTRAINT fk_fin_bank_accounts_org_ledger
  FOREIGN KEY (org_id, ledger_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;
ALTER TABLE fin_bank_accounts VALIDATE CONSTRAINT fk_fin_bank_accounts_org_ledger;
```

---

### D-15. `fin_bank_imports` — composite FK to `fin_bank_accounts`

**Generated SQL:**
```sql
ALTER TABLE fin_bank_imports DROP CONSTRAINT IF EXISTS fin_bank_imports_bank_account_id_fkey;

ALTER TABLE fin_bank_imports
  ADD CONSTRAINT fk_fin_bank_imports_org_account
  FOREIGN KEY (org_id, bank_account_id)
  REFERENCES fin_bank_accounts (org_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE fin_bank_imports VALIDATE CONSTRAINT fk_fin_bank_imports_org_account;
```

---

### D-16. `fin_bank_transactions` — composite FKs to `fin_bank_accounts`, `fin_bank_imports`, `journal_entries`

**Pre-validation quarantine query:**
```sql
SELECT fbt.id FROM fin_bank_transactions fbt
JOIN fin_bank_accounts fba ON fba.id = fbt.bank_account_id
WHERE fba.org_id <> fbt.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_bank_transactions
  DROP CONSTRAINT IF EXISTS fin_bank_transactions_bank_account_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_bank_transactions_import_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_bank_transactions_matched_journal_entry_id_fkey;

ALTER TABLE fin_bank_transactions
  ADD CONSTRAINT fk_fin_bank_txn_org_account
  FOREIGN KEY (org_id, bank_account_id)
  REFERENCES fin_bank_accounts (org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_bank_transactions
  ADD CONSTRAINT fk_fin_bank_txn_org_import
  FOREIGN KEY (org_id, import_id)
  REFERENCES fin_bank_imports (org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE fin_bank_transactions
  ADD CONSTRAINT fk_fin_bank_txn_org_je
  FOREIGN KEY (org_id, matched_journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE fin_bank_transactions VALIDATE CONSTRAINT fk_fin_bank_txn_org_account;
ALTER TABLE fin_bank_transactions VALIDATE CONSTRAINT fk_fin_bank_txn_org_import;
ALTER TABLE fin_bank_transactions VALIDATE CONSTRAINT fk_fin_bank_txn_org_je;
```

---

### D-17. `fin_reconciliation_matches` — composite FKs to `fin_bank_transactions` and `journal_entries`

**Generated SQL:**
```sql
ALTER TABLE fin_reconciliation_matches
  DROP CONSTRAINT IF EXISTS fin_reconciliation_matches_bank_transaction_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_reconciliation_matches_journal_entry_id_fkey;

ALTER TABLE fin_reconciliation_matches
  ADD CONSTRAINT fk_fin_recon_match_org_txn
  FOREIGN KEY (org_id, bank_transaction_id)
  REFERENCES fin_bank_transactions (org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_reconciliation_matches
  ADD CONSTRAINT fk_fin_recon_match_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE fin_reconciliation_matches VALIDATE CONSTRAINT fk_fin_recon_match_org_txn;
ALTER TABLE fin_reconciliation_matches VALIDATE CONSTRAINT fk_fin_recon_match_org_je;
```

> `matched_record_id` is polymorphic (type from `matched_type` enum). No FK possible;
> service-layer BOLA check is mandatory.

---

### D-18. `fin_bank_transfers` — composite FKs to `fin_bank_accounts` (×2) and `journal_entries`

**Generated SQL:**
```sql
ALTER TABLE fin_bank_transfers
  DROP CONSTRAINT IF EXISTS fin_bank_transfers_from_bank_account_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_bank_transfers_to_bank_account_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_bank_transfers_journal_entry_id_fkey;

ALTER TABLE fin_bank_transfers
  ADD CONSTRAINT fk_fin_bank_transfers_org_from
  FOREIGN KEY (org_id, from_bank_account_id)
  REFERENCES fin_bank_accounts (org_id, id) NOT VALID;

ALTER TABLE fin_bank_transfers
  ADD CONSTRAINT fk_fin_bank_transfers_org_to
  FOREIGN KEY (org_id, to_bank_account_id)
  REFERENCES fin_bank_accounts (org_id, id) NOT VALID;

ALTER TABLE fin_bank_transfers
  ADD CONSTRAINT fk_fin_bank_transfers_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE fin_bank_transfers VALIDATE CONSTRAINT fk_fin_bank_transfers_org_from;
ALTER TABLE fin_bank_transfers VALIDATE CONSTRAINT fk_fin_bank_transfers_org_to;
ALTER TABLE fin_bank_transfers VALIDATE CONSTRAINT fk_fin_bank_transfers_org_je;
```

---

### D-19. `fin_reimbursement_batches` — composite FKs to `journal_entries` and `fin_bank_accounts`

**Generated SQL:**
```sql
ALTER TABLE fin_reimbursement_batches
  DROP CONSTRAINT IF EXISTS fin_reimbursement_batches_journal_entry_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_reimbursement_batches_bank_account_id_fkey;

ALTER TABLE fin_reimbursement_batches
  ADD CONSTRAINT fk_fin_reimb_batch_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE fin_reimbursement_batches
  ADD CONSTRAINT fk_fin_reimb_batch_org_bank
  FOREIGN KEY (org_id, bank_account_id)
  REFERENCES fin_bank_accounts (org_id, id) NOT VALID;

ALTER TABLE fin_reimbursement_batches VALIDATE CONSTRAINT fk_fin_reimb_batch_org_je;
ALTER TABLE fin_reimbursement_batches VALIDATE CONSTRAINT fk_fin_reimb_batch_org_bank;
```

---

### D-20. `fin_expense_policies` — composite FK to `expense_categories`

**Prerequisite (cross-module):** `expense_categories` (in `hr/payroll.ts`) must have `UNIQUE(org_id, id)`.
Coordinate with the HR payroll wave.

**Pre-validation quarantine query:**
```sql
SELECT fep.id FROM fin_expense_policies fep
JOIN expense_categories ec ON ec.id = fep.category_id
WHERE fep.category_id IS NOT NULL AND ec.org_id <> fep.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_expense_policies DROP CONSTRAINT IF EXISTS fin_expense_policies_category_id_fkey;

ALTER TABLE fin_expense_policies
  ADD CONSTRAINT fk_fin_expense_policies_org_cat
  FOREIGN KEY (org_id, category_id)
  REFERENCES expense_categories (org_id, id)
  ON DELETE SET NULL NOT VALID;
ALTER TABLE fin_expense_policies VALIDATE CONSTRAINT fk_fin_expense_policies_org_cat;
```

---

### D-21. `fin_budgets` — no intra-module parent FK needed (org anchor only)

Leaf as parent. Candidate key added in C-12. No further composite FK required here.

---

### D-22. `fin_budget_lines` — composite FKs to `fin_budgets`, `ledger_accounts`, `departments`, `projects`

**Prerequisite (cross-module):** `departments` (HR) and `projects` (PM) must have `UNIQUE(org_id, id)`.

**Drizzle change (finance-planning.ts):**
```ts
import { foreignKey } from "drizzle-orm/pg-core";

// In finBudgetLines constraint array:
foreignKey({
  columns: [table.orgId, table.budgetId],
  foreignColumns: [finBudgets.orgId, finBudgets.id],
  name: "fk_fin_budget_lines_org_budget",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.accountId],
  foreignColumns: [ledgerAccounts.orgId, ledgerAccounts.id],
  name: "fk_fin_budget_lines_org_account",
}),
foreignKey({
  columns: [table.orgId, table.departmentId],
  foreignColumns: [departments.orgId, departments.id],
  name: "fk_fin_budget_lines_org_dept",
}),
foreignKey({
  columns: [table.orgId, table.projectId],
  foreignColumns: [projects.orgId, projects.id],
  name: "fk_fin_budget_lines_org_project",
}),
```

> Note: `projects` uses `org_id` text; `departments` uses `org_id` text. Verify column name
> on each parent (`orgId` in Drizzle; `org_id` in SQL) before running.

**Pre-validation quarantine query:**
```sql
SELECT fbl.id FROM fin_budget_lines fbl
JOIN fin_budgets fb ON fb.id = fbl.budget_id
WHERE fb.org_id <> fbl.org_id;

SELECT fbl.id FROM fin_budget_lines fbl
JOIN ledger_accounts la ON la.id = fbl.account_id
WHERE la.org_id <> fbl.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE fin_budget_lines
  DROP CONSTRAINT IF EXISTS fin_budget_lines_budget_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_budget_lines_account_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_budget_lines_department_id_fkey,
  DROP CONSTRAINT IF EXISTS fin_budget_lines_project_id_fkey;

ALTER TABLE fin_budget_lines
  ADD CONSTRAINT fk_fin_budget_lines_org_budget
  FOREIGN KEY (org_id, budget_id)
  REFERENCES fin_budgets (org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE fin_budget_lines
  ADD CONSTRAINT fk_fin_budget_lines_org_account
  FOREIGN KEY (org_id, account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE fin_budget_lines
  ADD CONSTRAINT fk_fin_budget_lines_org_dept
  FOREIGN KEY (org_id, department_id)
  REFERENCES departments (org_id, id) NOT VALID;

ALTER TABLE fin_budget_lines
  ADD CONSTRAINT fk_fin_budget_lines_org_project
  FOREIGN KEY (org_id, project_id)
  REFERENCES projects (org_id, id) NOT VALID;

ALTER TABLE fin_budget_lines VALIDATE CONSTRAINT fk_fin_budget_lines_org_budget;
ALTER TABLE fin_budget_lines VALIDATE CONSTRAINT fk_fin_budget_lines_org_account;
ALTER TABLE fin_budget_lines VALIDATE CONSTRAINT fk_fin_budget_lines_org_dept;
ALTER TABLE fin_budget_lines VALIDATE CONSTRAINT fk_fin_budget_lines_org_project;
```

---

### D-23. `fin_budget_revisions` — composite FK to `fin_budgets`

**Generated SQL:**
```sql
ALTER TABLE fin_budget_revisions DROP CONSTRAINT IF EXISTS fin_budget_revisions_budget_id_fkey;

ALTER TABLE fin_budget_revisions
  ADD CONSTRAINT fk_fin_budget_revisions_org_budget
  FOREIGN KEY (org_id, budget_id)
  REFERENCES fin_budgets (org_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE fin_budget_revisions VALIDATE CONSTRAINT fk_fin_budget_revisions_org_budget;
```

---

### D-24. `acc_tax_codes` — composite FKs to `ledger_accounts` (×2)

**Generated SQL:**
```sql
ALTER TABLE acc_tax_codes
  DROP CONSTRAINT IF EXISTS acc_tax_codes_collected_account_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_tax_codes_paid_account_id_fkey;

ALTER TABLE acc_tax_codes
  ADD CONSTRAINT fk_acc_tax_codes_org_collected
  FOREIGN KEY (org_id, collected_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE acc_tax_codes
  ADD CONSTRAINT fk_acc_tax_codes_org_paid
  FOREIGN KEY (org_id, paid_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE acc_tax_codes VALIDATE CONSTRAINT fk_acc_tax_codes_org_collected;
ALTER TABLE acc_tax_codes VALIDATE CONSTRAINT fk_acc_tax_codes_org_paid;
```

---

### D-25. `acc_tax_payments` — composite FK to `journal_entries`

**Generated SQL:**
```sql
ALTER TABLE acc_tax_payments DROP CONSTRAINT IF EXISTS acc_tax_payments_journal_entry_id_fkey;

ALTER TABLE acc_tax_payments
  ADD CONSTRAINT fk_acc_tax_payments_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;
ALTER TABLE acc_tax_payments VALIDATE CONSTRAINT fk_acc_tax_payments_org_je;
```

---

### D-26. `acc_asset_categories` — composite FKs to `ledger_accounts` (×3)

**Generated SQL:**
```sql
ALTER TABLE acc_asset_categories
  DROP CONSTRAINT IF EXISTS acc_asset_categories_asset_account_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_asset_categories_depreciation_expense_account_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_asset_categories_accumulated_depreciation_account_id_fkey;

ALTER TABLE acc_asset_categories
  ADD CONSTRAINT fk_acc_asset_cat_org_asset_acct
  FOREIGN KEY (org_id, asset_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE acc_asset_categories
  ADD CONSTRAINT fk_acc_asset_cat_org_dep_exp_acct
  FOREIGN KEY (org_id, depreciation_expense_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE acc_asset_categories
  ADD CONSTRAINT fk_acc_asset_cat_org_accum_dep_acct
  FOREIGN KEY (org_id, accumulated_depreciation_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;

ALTER TABLE acc_asset_categories VALIDATE CONSTRAINT fk_acc_asset_cat_org_asset_acct;
ALTER TABLE acc_asset_categories VALIDATE CONSTRAINT fk_acc_asset_cat_org_dep_exp_acct;
ALTER TABLE acc_asset_categories VALIDATE CONSTRAINT fk_acc_asset_cat_org_accum_dep_acct;
```

---

### D-27. `acc_fixed_assets` — composite FKs to `acc_asset_categories`, `clients`, `purchase_bills`, `journal_entries`

**Prerequisite:** C-9 (`acc_asset_categories` candidate key) must be done.

**Pre-validation quarantine query:**
```sql
SELECT afa.id FROM acc_fixed_assets afa
JOIN acc_asset_categories ac ON ac.id = afa.category_id
WHERE ac.org_id <> afa.org_id;
```

**Generated SQL:**
```sql
ALTER TABLE acc_fixed_assets
  DROP CONSTRAINT IF EXISTS acc_fixed_assets_category_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_fixed_assets_vendor_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_fixed_assets_bill_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_fixed_assets_disposal_journal_entry_id_fkey;

ALTER TABLE acc_fixed_assets
  ADD CONSTRAINT fk_acc_fixed_assets_org_cat
  FOREIGN KEY (org_id, category_id)
  REFERENCES acc_asset_categories (org_id, id) NOT VALID;

ALTER TABLE acc_fixed_assets
  ADD CONSTRAINT fk_acc_fixed_assets_org_vendor
  FOREIGN KEY (org_id, vendor_id)
  REFERENCES clients (org_id, id) NOT VALID;

ALTER TABLE acc_fixed_assets
  ADD CONSTRAINT fk_acc_fixed_assets_org_bill
  FOREIGN KEY (org_id, bill_id)
  REFERENCES purchase_bills (org_id, id) NOT VALID;

ALTER TABLE acc_fixed_assets
  ADD CONSTRAINT fk_acc_fixed_assets_org_disposal_je
  FOREIGN KEY (org_id, disposal_journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE acc_fixed_assets VALIDATE CONSTRAINT fk_acc_fixed_assets_org_cat;
ALTER TABLE acc_fixed_assets VALIDATE CONSTRAINT fk_acc_fixed_assets_org_vendor;
ALTER TABLE acc_fixed_assets VALIDATE CONSTRAINT fk_acc_fixed_assets_org_bill;
ALTER TABLE acc_fixed_assets VALIDATE CONSTRAINT fk_acc_fixed_assets_org_disposal_je;
```

---

### D-28. `acc_depreciation_runs` — composite FK to `journal_entries`

**Generated SQL:**
```sql
ALTER TABLE acc_depreciation_runs DROP CONSTRAINT IF EXISTS acc_depreciation_runs_journal_entry_id_fkey;

ALTER TABLE acc_depreciation_runs
  ADD CONSTRAINT fk_acc_dep_runs_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;
ALTER TABLE acc_depreciation_runs VALIDATE CONSTRAINT fk_acc_dep_runs_org_je;
```

---

### D-29. `acc_depreciation_schedules` — composite FKs to `acc_fixed_assets`, `acc_depreciation_runs`, `journal_entries`

**Prerequisites:** C-10 (`acc_fixed_assets` candidate key) and C-11 (`acc_depreciation_runs` candidate key).

**Generated SQL:**
```sql
ALTER TABLE acc_depreciation_schedules
  DROP CONSTRAINT IF EXISTS acc_depreciation_schedules_asset_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_depreciation_schedules_run_id_fkey,
  DROP CONSTRAINT IF EXISTS acc_depreciation_schedules_journal_entry_id_fkey;

ALTER TABLE acc_depreciation_schedules
  ADD CONSTRAINT fk_acc_dep_sched_org_asset
  FOREIGN KEY (org_id, asset_id)
  REFERENCES acc_fixed_assets (org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE acc_depreciation_schedules
  ADD CONSTRAINT fk_acc_dep_sched_org_run
  FOREIGN KEY (org_id, run_id)
  REFERENCES acc_depreciation_runs (org_id, id) NOT VALID;

ALTER TABLE acc_depreciation_schedules
  ADD CONSTRAINT fk_acc_dep_sched_org_je
  FOREIGN KEY (org_id, journal_entry_id)
  REFERENCES journal_entries (org_id, id) NOT VALID;

ALTER TABLE acc_depreciation_schedules VALIDATE CONSTRAINT fk_acc_dep_sched_org_asset;
ALTER TABLE acc_depreciation_schedules VALIDATE CONSTRAINT fk_acc_dep_sched_org_run;
ALTER TABLE acc_depreciation_schedules VALIDATE CONSTRAINT fk_acc_dep_sched_org_je;
```

---

### D-30. `accounting_dimension_values` — composite FK to `accounting_dimensions`

**Generated SQL:**
```sql
ALTER TABLE accounting_dimension_values DROP CONSTRAINT IF EXISTS accounting_dimension_values_dimension_id_fkey;

ALTER TABLE accounting_dimension_values
  ADD CONSTRAINT fk_acc_dim_values_org_dim
  FOREIGN KEY (org_id, dimension_id)
  REFERENCES accounting_dimensions (org_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE accounting_dimension_values VALIDATE CONSTRAINT fk_acc_dim_values_org_dim;
```

---

### D-31. `accounting_settings` — composite FK to `ledger_accounts`

**Generated SQL:**
```sql
ALTER TABLE accounting_settings DROP CONSTRAINT IF EXISTS accounting_settings_retained_earnings_account_id_fkey;

ALTER TABLE accounting_settings
  ADD CONSTRAINT fk_accounting_settings_org_ret_earn
  FOREIGN KEY (org_id, retained_earnings_account_id)
  REFERENCES ledger_accounts (org_id, id) NOT VALID;
ALTER TABLE accounting_settings VALIDATE CONSTRAINT fk_accounting_settings_org_ret_earn;
```

---

### D-32. `acc_system_account_map` — composite FK to `ledger_accounts`

**Generated SQL:**
```sql
ALTER TABLE acc_system_account_map DROP CONSTRAINT IF EXISTS acc_system_account_map_account_id_fkey;

ALTER TABLE acc_system_account_map
  ADD CONSTRAINT fk_acc_system_account_map_org_acct
  FOREIGN KEY (org_id, account_id)
  REFERENCES ledger_accounts (org_id, id)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE acc_system_account_map VALIDATE CONSTRAINT fk_acc_system_account_map_org_acct;
```

---

### D-33. `credit_notes` — composite FKs to `clients` and `invoices`

**Generated SQL:**
```sql
ALTER TABLE credit_notes
  DROP CONSTRAINT IF EXISTS credit_notes_client_id_fkey,
  DROP CONSTRAINT IF EXISTS credit_notes_invoice_id_fkey;

ALTER TABLE credit_notes
  ADD CONSTRAINT fk_credit_notes_org_client
  FOREIGN KEY (org_id, client_id)
  REFERENCES clients (org_id, id) NOT VALID;

ALTER TABLE credit_notes
  ADD CONSTRAINT fk_credit_notes_org_invoice
  FOREIGN KEY (org_id, invoice_id)
  REFERENCES invoices (org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE credit_notes VALIDATE CONSTRAINT fk_credit_notes_org_client;
ALTER TABLE credit_notes VALIDATE CONSTRAINT fk_credit_notes_org_invoice;
```

---

## Cross-module dependencies (must coordinate with other waves)

| This table | Needs from other wave | Status |
|---|---|---|
| `fin_payment_allocations` | `payments.(org_id,id)`, `invoices.(org_id,id)` | CRM billing wave |
| `vendor_credits` | `clients.(org_id,id)`, `purchase_bills.(org_id,id)` | CRM billing wave |
| `fin_vendor_payment_allocations` | `vendor_payments.(org_id,id)`, `purchase_bills.(org_id,id)` | CRM billing wave |
| `fin_recurring_invoice_templates` | `clients.(org_id,id)` | CRM billing wave |
| `fin_recurring_bill_templates` | `clients.(org_id,id)` (vendor-as-client) | CRM billing wave |
| `fin_collection_activities` | `clients.(org_id,id)`, `invoices.(org_id,id)` | CRM billing wave |
| `fin_payment_run_items` | `purchase_bills.(org_id,id)`, `vendor_payments.(org_id,id)` | CRM billing wave |
| `acc_fixed_assets` | `clients.(org_id,id)` (vendor-as-client), `purchase_bills.(org_id,id)` | CRM billing wave |
| `fin_budget_lines` | `departments.(org_id,id)`, `projects.(org_id,id)` | HR + PM waves |
| `fin_expense_policies` | `expense_categories.(org_id,id)` | HR payroll wave |
| `credit_notes` | `invoices.(org_id,id)` | CRM billing wave |
| All `vendor_*` referencing `clients` | Future Wave 6 party migration will replace `client_id int` with `party_id text` | Wave 6 |

---

## Tables NOT changed in this wave (and why)

| Table | Reason |
|---|---|
| `fin_reminder_policies` | Org-anchored leaf, no intra-module parents |
| `fin_reconciliation_rules` | Org-anchored leaf |
| `fin_cash_flow_scenarios` | Org-anchored leaf |
| `accounting_periods` | Parent-only table; candidate key added (C-13) for future use; no own composite FK needed |
| `accounting_dimensions` | Parent-only; candidate key added (C-14) |
| `acc_number_sequences` | Org-anchored leaf (`UNIQUE(org_id, entity_type)`) |
| `fin_exchange_rates` | Org-anchored leaf |
| `fin_approval_policies` | Org-anchored leaf (`approver_user_id → users.id` is global, exempt) |
| `fin_approval_requests` | `record_id` is polymorphic — no FK possible; service-layer BOLA required |
| `fin_recurring_journal_templates` | Org-anchored leaf |
| All `billing.ts` tables | int→text fix already applied in commit 0c8e21b; excluded per brief |

---

## Summary

| Phase | Items |
|---|---|
| A — add `org_id` to line tables | 3 tables: `credit_note_items`, `vendor_credit_items`, `fin_payment_run_items` |
| B — add missing single-col FKs | 1 FK: `journal_entries.period_id → accounting_periods.id` |
| C — add UNIQUE(org_id, id) candidate keys | 14 tables (`ledger_accounts` and `journal_entries` first, then 12 others) |
| D — add composite FKs | 33 composite FK operations across 25 tables |
| Cross-module dependencies | 5 waves (CRM billing, HR, PM) must supply their candidate keys before cross-module FKs in this wave can be validated |
| **Tables touched in this wave** | **28 tables** (3 gain `org_id`; 14 gain candidate keys; 25 gain composite FKs; overlaps counted once) |

**Critical path:** `ledger_accounts` UNIQUE(org_id,id) (C-1) → `journal_entries` UNIQUE(org_id,id) (C-2) → then all of D-3 through D-32 can proceed in parallel batches. Every SQL statement uses `NOT VALID` + separate `VALIDATE` to avoid table locks.
