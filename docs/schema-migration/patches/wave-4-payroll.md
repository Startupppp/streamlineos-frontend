---
type: wave-4 patch spec (payroll)
status: DRAFT
date: 2026-07-26
domain: payroll
phase_order: A (org_id gaps) → B (bare .references()) → C (candidate UNIQUE keys) → D (composite FKs)
source_matrix: wave-0-composite-fk-matrix-hr-payroll.md (GROUP 29–33)
schema_files_read:
  - backend/src/db/schema/payroll/entities-periods.ts
  - backend/src/db/schema/payroll/inputs.ts
  - backend/src/db/schema/payroll/run-events.ts
  - backend/src/db/schema/payroll/tax-windows.ts
  - backend/src/db/schema/payroll/templates.ts
  - backend/src/db/schema/payroll/command-receipts.ts
  - backend/src/db/schema/payroll/journal-batches.ts
  - backend/src/db/schema/payroll/payslip-publications.ts
  - backend/src/db/schema/hr/payroll-runs.ts
  - backend/src/db/schema/hr/payroll-payout.ts
  - backend/src/db/schema/hr/payroll-policies.ts
  - backend/src/db/schema/hr/payroll-workforce.ts
  - backend/src/db/schema/hr/payroll-inputs.ts
  - backend/src/db/schema/hr/payroll.ts
---

# Wave 4 — Payroll Domain Tenant-Safe FK Patch Spec

## Overview

This document specifies the exact Drizzle schema changes, generated SQL (with `NOT VALID` / `VALIDATE` phasing), and backfill/quarantine queries for every payroll table requiring composite FK treatment.

**Universal payroll context (confirmed from schema reads):**

- All `org_id` columns across payroll tables are `text` type. `organizations.id` is `text`. No type mismatch anywhere.
- No table currently uses `foreignKey({columns, foreignColumns})` composite FK syntax — all existing FKs are single-column `.references()`.
- No parent table has a `UNIQUE(org_id, id)` candidate key yet. Phase C adds these.
- `payroll_run_allocations.run_id` is a bare integer with no `.references()` (the only Phase B gap in the `payroll/` folder).
- `payroll_tds_ytd_ledger.run_id` is a bare integer with no `.references()`.
- `payroll_line_items.component_id` is a bare integer with no `.references()` (in `hr/payroll-runs.ts`).
- `employee_salary_profiles.policy_version_id` is a bare integer with no `.references()` (in `hr/payroll-workforce.ts`).
- `payroll_accounting_mappings.component_id` is a bare integer with no `.references()` (in `hr/payroll-policies.ts`).
- `expenses.reimbursement_batch_id` is a bare integer with no `.references()` (in `hr/payroll.ts`).

**Tables in scope (19 total):**

| # | Table | File | Phase |
|---|---|---|---|
| 1 | `payroll_entities` | `payroll/entities-periods.ts` | C, D |
| 2 | `payroll_periods` | `payroll/entities-periods.ts` | C, D |
| 3 | `payroll_statutory_rule_sets` | `payroll/entities-periods.ts` | D |
| 4 | `payroll_filings` | `payroll/entities-periods.ts` | D |
| 5 | `payroll_jobs` | `payroll/entities-periods.ts` | D |
| 6 | `payroll_run_allocations` | `payroll/entities-periods.ts` | B, D |
| 7 | `payroll_tds_ytd_ledger` | `payroll/entities-periods.ts` | B, D |
| 8 | `payroll_runs` | `hr/payroll-runs.ts` | C, D |
| 9 | `payroll_run_employees` | `hr/payroll-runs.ts` | C, D |
| 10 | `payroll_line_items` | `hr/payroll-runs.ts` | B, D |
| 11 | `payroll_exceptions` | `hr/payroll-runs.ts` | D |
| 12 | `payroll_approvals` | `hr/payroll-runs.ts` | D |
| 13 | `payroll_policies` | `hr/payroll-policies.ts` | C, D |
| 14 | `payroll_policy_versions` | `hr/payroll-policies.ts` | C, D |
| 15 | `payroll_accounting_mappings` | `hr/payroll-policies.ts` | B, D |
| 16 | `salary_components` | `hr/payroll-workforce.ts` | C, D |
| 17 | `employee_salary_profiles` | `hr/payroll-workforce.ts` | B, C, D |
| 18 | `employee_salary_profile_components` | `hr/payroll-workforce.ts` | D |
| 19 | `expenses` | `hr/payroll.ts` | B, D |

> **Out of scope (deferred):**
> - `payroll_journal_batches.run_id` → `payroll_runs` — already has single-column `.references()` (line 53 of `journal-batches.ts`); composite FK deferred to after Phase C adds `UNIQUE(org_id,id)` on `payroll_runs`.
> - `payroll_journal_batch_lines.batch_id` → `payroll_journal_batches` — has `.references()`; composite FK is Phase D work, follows Phase C on `payroll_journal_batches`.
> - `payslip_publications` — already has `.references()` on all FK cols; composite FK is Phase D, depends on Phase C of parents.
> - `salary_loans`, `reimbursements`, `bonuses`, `fnf_settlements`, `asset_returns`, `payrolls`, `salary_structures` — tenant-anchor-only changes (no child composite FK in this wave).
> - `hr_payroll_adjustments.period_id` — already has `.references()`; composite FK is Phase D after Phase C on `hr_payroll_input_periods`.
> - `expenses.project_id` → `projects` — cross-module FK, deferred to Wave 7-H per matrix.
> - `payroll_templates` — `orgId` is nullable (system templates have no org); no composite FK needed; tenant-anchor `UNIQUE(org_id,id)` deferred pending nullability decision.

---

## Phase A — Add Missing `org_id` Columns

**Verdict: No payroll table is missing `org_id`.** All 19 in-scope tables already carry `org_id text NOT NULL` (or nullable for `payroll_statutory_rule_sets.org_id` which is intentionally nullable for system-default rule sets — exempt from composite FK).

Phase A has no work items for the payroll domain.

---

## Phase B — Add Missing Single-Column `.references()` on Bare FK Columns

Six columns have no DB-enforced FK constraint. These must gain a single-column `.references()` before the Phase D composite FK can be created (Postgres requires both columns of a composite FK to individually resolve to the parent).

### B-1: `payroll_run_allocations.run_id`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Before:**
```ts
runId: integer("run_id").notNull(),
```

**After:**
```ts
import { payrollRuns } from "../hr/payroll-runs";
// (add import at top)

runId: integer("run_id")
  .notNull()
  .references(() => payrollRuns.id, { onDelete: "cascade" }),
```

**Generated SQL (NOT VALID then VALIDATE pattern):**
```sql
-- Step 1: Add constraint NOT VALID (fast, no table scan)
ALTER TABLE payroll_run_allocations
  ADD CONSTRAINT fk_payroll_run_alloc_run_id
  FOREIGN KEY (run_id) REFERENCES payroll_runs(id)
  ON DELETE CASCADE
  NOT VALID;

-- Step 2: Validate in a separate transaction (reads without lock)
ALTER TABLE payroll_run_allocations
  VALIDATE CONSTRAINT fk_payroll_run_alloc_run_id;
```

**Quarantine query (identify orphaned rows before applying):**
```sql
SELECT id, org_id, run_id
FROM payroll_run_allocations
WHERE run_id NOT IN (SELECT id FROM payroll_runs);
-- Expected: 0 rows. Any rows here must be investigated before B-1 is applied.
-- Remediation: DELETE FROM payroll_run_allocations WHERE run_id NOT IN (SELECT id FROM payroll_runs);
```

---

### B-2: `payroll_tds_ytd_ledger.run_id`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Before:**
```ts
runId: integer("run_id"),
```

**After:**
```ts
import { payrollRuns } from "../hr/payroll-runs";
// (add import at top)

runId: integer("run_id").references(() => payrollRuns.id, { onDelete: "set null" }),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_tds_ytd_ledger
  ADD CONSTRAINT fk_payroll_tds_ytd_run_id
  FOREIGN KEY (run_id) REFERENCES payroll_runs(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_tds_ytd_ledger
  VALIDATE CONSTRAINT fk_payroll_tds_ytd_run_id;
```

**Quarantine query:**
```sql
SELECT id, org_id, run_id
FROM payroll_tds_ytd_ledger
WHERE run_id IS NOT NULL
  AND run_id NOT IN (SELECT id FROM payroll_runs);
-- Remediation: UPDATE payroll_tds_ytd_ledger SET run_id = NULL
--              WHERE run_id IS NOT NULL AND run_id NOT IN (SELECT id FROM payroll_runs);
```

---

### B-3: `payroll_line_items.component_id`

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Before:**
```ts
componentId: integer("component_id"),
```

**After:**
```ts
import { salaryComponents } from "./payroll-workforce";
// (add import at top — check for circular; salaryComponents imports from payroll-runs indirectly via salaryLoans/payrollRuns; use AnyPgColumn if circular)

componentId: integer("component_id").references(() => salaryComponents.id, { onDelete: "set null" }),
```

> **Circular import note:** `payroll-runs.ts` does not currently import from `payroll-workforce.ts`. `payroll-workforce.ts` imports `salaryLoans` from `./payroll` and `payrollRuns` from `./payroll-runs`. Adding a reverse import creates a cycle. Resolve with Drizzle's `AnyPgColumn` lazy reference pattern:
```ts
import type { AnyPgColumn } from "drizzle-orm/pg-core";

componentId: integer("component_id").references(
  (): AnyPgColumn => salaryComponents.id,
  { onDelete: "set null" }
),
```
> Move the `salaryComponents` import to a dynamic/lazy reference to break the cycle, or restructure so `salary_components` is defined in a separate file imported by both (preferred long-term).

**Generated SQL:**
```sql
ALTER TABLE payroll_line_items
  ADD CONSTRAINT fk_payroll_line_items_component_id
  FOREIGN KEY (component_id) REFERENCES salary_components(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_line_items
  VALIDATE CONSTRAINT fk_payroll_line_items_component_id;
```

**Quarantine query:**
```sql
SELECT id, org_id, run_id, component_id
FROM payroll_line_items
WHERE component_id IS NOT NULL
  AND component_id NOT IN (SELECT id FROM salary_components);
-- Remediation: UPDATE payroll_line_items SET component_id = NULL
--              WHERE component_id IS NOT NULL AND component_id NOT IN (SELECT id FROM salary_components);
```

---

### B-4: `employee_salary_profiles.policy_version_id`

**File:** `backend/src/db/schema/hr/payroll-workforce.ts`

**Before:**
```ts
policyVersionId: integer("policy_version_id"),
```

**After:**
```ts
import { payrollPolicyVersions } from "./payroll-policies";
// (add import at top)

policyVersionId: integer("policy_version_id").references(
  () => payrollPolicyVersions.id,
  { onDelete: "set null" }
),
```

**Generated SQL:**
```sql
ALTER TABLE employee_salary_profiles
  ADD CONSTRAINT fk_emp_salary_profiles_policy_version_id
  FOREIGN KEY (policy_version_id) REFERENCES payroll_policy_versions(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE employee_salary_profiles
  VALIDATE CONSTRAINT fk_emp_salary_profiles_policy_version_id;
```

**Quarantine query:**
```sql
SELECT id, org_id, user_id, policy_version_id
FROM employee_salary_profiles
WHERE policy_version_id IS NOT NULL
  AND policy_version_id NOT IN (SELECT id FROM payroll_policy_versions);
-- Remediation: UPDATE employee_salary_profiles SET policy_version_id = NULL
--              WHERE policy_version_id IS NOT NULL
--                AND policy_version_id NOT IN (SELECT id FROM payroll_policy_versions);
```

---

### B-5: `payroll_accounting_mappings.component_id`

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Before:**
```ts
componentId: integer("component_id"),
```

**After:**
```ts
import { salaryComponents } from "./payroll-workforce";
// (add import at top)

componentId: integer("component_id").references(
  () => salaryComponents.id,
  { onDelete: "set null" }
),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_accounting_mappings
  ADD CONSTRAINT fk_payroll_acct_mappings_component_id
  FOREIGN KEY (component_id) REFERENCES salary_components(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_accounting_mappings
  VALIDATE CONSTRAINT fk_payroll_acct_mappings_component_id;
```

**Quarantine query:**
```sql
SELECT id, org_id, component_id
FROM payroll_accounting_mappings
WHERE component_id IS NOT NULL
  AND component_id NOT IN (SELECT id FROM salary_components);
-- Remediation: UPDATE payroll_accounting_mappings SET component_id = NULL
--              WHERE component_id IS NOT NULL
--                AND component_id NOT IN (SELECT id FROM salary_components);
```

---

### B-6: `expenses.reimbursement_batch_id`

**File:** `backend/src/db/schema/hr/payroll.ts`

**Before:**
```ts
reimbursementBatchId: integer("reimbursement_batch_id"),
```

**After:**
```ts
// reimbursements is already defined in the same file above expenses
reimbursementBatchId: integer("reimbursement_batch_id").references(
  () => reimbursements.id,
  { onDelete: "set null" }
),
```

**Generated SQL:**
```sql
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_reimbursement_batch_id
  FOREIGN KEY (reimbursement_batch_id) REFERENCES reimbursements(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE expenses
  VALIDATE CONSTRAINT fk_expenses_reimbursement_batch_id;
```

**Quarantine query:**
```sql
SELECT id, org_id, reimbursement_batch_id
FROM expenses
WHERE reimbursement_batch_id IS NOT NULL
  AND reimbursement_batch_id NOT IN (SELECT id FROM reimbursements);
-- Remediation: UPDATE expenses SET reimbursement_batch_id = NULL
--              WHERE reimbursement_batch_id IS NOT NULL
--                AND reimbursement_batch_id NOT IN (SELECT id FROM reimbursements);
```

---

## Phase C — Add `UNIQUE(org_id, id)` Candidate Keys on Parent Tables

Every parent table that will be the target of a composite FK must have `UNIQUE(org_id, id)`. These indexes are prerequisites for Phase D. Build them `CONCURRENTLY` to avoid table locks.

### C-1: `payroll_entities` — candidate key for `payroll_periods`, `payroll_statutory_rule_sets`, `payroll_filings`, `payroll_jobs`, `payroll_journal_batches`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff — add to table's index array:**
```ts
uniqueIndex("uniq_payroll_entities_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_entities_org_id
  ON payroll_entities(org_id, id);
```

**Backfill/verify query:**
```sql
-- Verify no duplicate (org_id, id) pairs exist (should be impossible with serial PK, but confirm):
SELECT org_id, id, COUNT(*) FROM payroll_entities GROUP BY org_id, id HAVING COUNT(*) > 1;
-- Expected: 0 rows.
```

---

### C-2: `payroll_periods` — candidate key for `payroll_filings` (period_id FK chain)

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_payroll_periods_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_periods_org_id
  ON payroll_periods(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM payroll_periods GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-3: `payroll_runs` — candidate key for `payroll_run_employees`, `payroll_run_allocations`, `payroll_tds_ytd_ledger`, `payroll_exceptions`, `payroll_approvals`, `payroll_bank_batches`, `payroll_loan_adjustments`, `payroll_journal_batches`, `payroll_run_events`, `payroll_inputs`, `payslip_publications`, `payroll_command_receipts`

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_payroll_runs_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_runs_org_id
  ON payroll_runs(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM payroll_runs GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-4: `payroll_run_employees` — candidate key for `payroll_line_items`, `payroll_exceptions`, `payroll_bank_batch_items`, `payslip_publications`

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_payroll_run_employees_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_run_employees_org_id
  ON payroll_run_employees(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM payroll_run_employees GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-5: `payroll_policies` — candidate key for `payroll_policy_versions`, `payroll_calendar_events`

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_payroll_policies_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_policies_org_id
  ON payroll_policies(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM payroll_policies GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-6: `payroll_policy_versions` — candidate key for `payroll_template_activations`, `payroll_runs` (via `policyVersionId`), `employee_salary_profiles` (via `policy_version_id`)

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_payroll_policy_versions_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_payroll_policy_versions_org_id
  ON payroll_policy_versions(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM payroll_policy_versions GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-7: `salary_components` — candidate key for `employee_salary_profile_components`, `payroll_line_items`, `payroll_accounting_mappings`

**File:** `backend/src/db/schema/hr/payroll-workforce.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_salary_components_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_salary_components_org_id
  ON salary_components(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM salary_components GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

### C-8: `employee_salary_profiles` — candidate key for `employee_salary_profile_components`

**File:** `backend/src/db/schema/hr/payroll-workforce.ts`

**Drizzle diff:**
```ts
uniqueIndex("uniq_employee_salary_profiles_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_employee_salary_profiles_org_id
  ON employee_salary_profiles(org_id, id);
```

**Verify:**
```sql
SELECT org_id, id, COUNT(*) FROM employee_salary_profiles GROUP BY org_id, id HAVING COUNT(*) > 1;
```

---

## Phase D — Add Composite FKs

All Phase D constraints reference parent candidate keys installed in Phase C. Apply `NOT VALID` first, validate separately. Order within Phase D follows the dependency chain (parents before children).

### D-1: `payroll_periods.entity_id` → `payroll_entities(org_id, id)`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle before (current):**
```ts
entityId: integer("entity_id").references(() => payrollEntities.id, { onDelete: "set null" }),
```

**Drizzle after — replace single-column ref with composite foreignKey block:**
```ts
import { foreignKey } from "drizzle-orm/pg-core";

// Remove .references() from entityId column:
entityId: integer("entity_id"),

// Add to table constraints array:
foreignKey({
  columns: [table.orgId, table.entityId],
  foreignColumns: [payrollEntities.orgId, payrollEntities.id],
  name: "fk_payroll_periods_org_entity",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_periods
  ADD CONSTRAINT fk_payroll_periods_org_entity
  FOREIGN KEY (org_id, entity_id)
  REFERENCES payroll_entities(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_periods
  VALIDATE CONSTRAINT fk_payroll_periods_org_entity;
```

**Quarantine query:**
```sql
SELECT id, org_id, entity_id
FROM payroll_periods
WHERE entity_id IS NOT NULL
  AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);
-- Remediation: UPDATE payroll_periods SET entity_id = NULL
--              WHERE entity_id IS NOT NULL
--                AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);
```

---

### D-2: `payroll_statutory_rule_sets.entity_id` → `payroll_entities(org_id, id)`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Current:** `entityId: integer("entity_id").references(() => payrollEntities.id, { onDelete: "set null" })`

**Note:** `org_id` is nullable on `payroll_statutory_rule_sets` (system defaults have no org). The composite FK applies only to org-scoped rule sets. Use a partial approach: add composite FK but allow both columns to be null (the constraint is satisfied when either column is null in Postgres).

**Drizzle diff:**
```ts
// Remove .references() from entityId column, keep nullable:
entityId: integer("entity_id"),

// Add to constraints array:
foreignKey({
  columns: [table.orgId, table.entityId],
  foreignColumns: [payrollEntities.orgId, payrollEntities.id],
  name: "fk_payroll_stat_rule_sets_org_entity",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_statutory_rule_sets
  ADD CONSTRAINT fk_payroll_stat_rule_sets_org_entity
  FOREIGN KEY (org_id, entity_id)
  REFERENCES payroll_entities(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_statutory_rule_sets
  VALIDATE CONSTRAINT fk_payroll_stat_rule_sets_org_entity;
```

**Quarantine query:**
```sql
SELECT id, org_id, entity_id
FROM payroll_statutory_rule_sets
WHERE org_id IS NOT NULL
  AND entity_id IS NOT NULL
  AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);
-- Remediation: UPDATE payroll_statutory_rule_sets SET entity_id = NULL
--              WHERE org_id IS NOT NULL AND entity_id IS NOT NULL
--                AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);
```

---

### D-3: `payroll_filings.entity_id` → `payroll_entities(org_id, id)` and `payroll_filings.period_id` → `payroll_periods(org_id, id)`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff:**
```ts
// Remove .references() from both columns:
entityId: integer("entity_id"),
periodId: integer("period_id"),

// Add to constraints array:
foreignKey({
  columns: [table.orgId, table.entityId],
  foreignColumns: [payrollEntities.orgId, payrollEntities.id],
  name: "fk_payroll_filings_org_entity",
}).onDelete("set null"),
foreignKey({
  columns: [table.orgId, table.periodId],
  foreignColumns: [payrollPeriods.orgId, payrollPeriods.id],
  name: "fk_payroll_filings_org_period",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_filings
  ADD CONSTRAINT fk_payroll_filings_org_entity
  FOREIGN KEY (org_id, entity_id)
  REFERENCES payroll_entities(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_filings
  VALIDATE CONSTRAINT fk_payroll_filings_org_entity;

ALTER TABLE payroll_filings
  ADD CONSTRAINT fk_payroll_filings_org_period
  FOREIGN KEY (org_id, period_id)
  REFERENCES payroll_periods(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_filings
  VALIDATE CONSTRAINT fk_payroll_filings_org_period;
```

**Quarantine queries:**
```sql
SELECT id, org_id, entity_id
FROM payroll_filings
WHERE entity_id IS NOT NULL
  AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);

SELECT id, org_id, period_id
FROM payroll_filings
WHERE period_id IS NOT NULL
  AND (org_id, period_id) NOT IN (SELECT org_id, id FROM payroll_periods);
-- Remediation: SET respective FK to NULL for any orphaned rows.
```

---

### D-4: `payroll_jobs.entity_id` → `payroll_entities(org_id, id)`

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff:**
```ts
entityId: integer("entity_id"),

foreignKey({
  columns: [table.orgId, table.entityId],
  foreignColumns: [payrollEntities.orgId, payrollEntities.id],
  name: "fk_payroll_jobs_org_entity",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_jobs
  ADD CONSTRAINT fk_payroll_jobs_org_entity
  FOREIGN KEY (org_id, entity_id)
  REFERENCES payroll_entities(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_jobs
  VALIDATE CONSTRAINT fk_payroll_jobs_org_entity;
```

**Quarantine query:**
```sql
SELECT id, org_id, entity_id FROM payroll_jobs
WHERE entity_id IS NOT NULL
  AND (org_id, entity_id) NOT IN (SELECT org_id, id FROM payroll_entities);
```

---

### D-5: `payroll_run_allocations.run_id` → `payroll_runs(org_id, id)`

**Prerequisite:** Phase B-1 (single-column FK added), Phase C-3 (candidate key on `payroll_runs`).

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff (replace single-column ref from B-1 with composite):**
```ts
// After B-1 adds .references(), replace with composite FK:
runId: integer("run_id").notNull(),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_run_alloc_org_run",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
-- Drop the single-column constraint added in B-1 first:
ALTER TABLE payroll_run_allocations
  DROP CONSTRAINT fk_payroll_run_alloc_run_id;

-- Add composite FK:
ALTER TABLE payroll_run_allocations
  ADD CONSTRAINT fk_payroll_run_alloc_org_run
  FOREIGN KEY (org_id, run_id)
  REFERENCES payroll_runs(org_id, id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE payroll_run_allocations
  VALIDATE CONSTRAINT fk_payroll_run_alloc_org_run;
```

**Quarantine query:**
```sql
SELECT id, org_id, run_id FROM payroll_run_allocations
WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);
-- Remediation: DELETE FROM payroll_run_allocations WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);
```

---

### D-6: `payroll_tds_ytd_ledger.run_id` → `payroll_runs(org_id, id)`

**Prerequisite:** Phase B-2, Phase C-3.

**File:** `backend/src/db/schema/payroll/entities-periods.ts`

**Drizzle diff:**
```ts
runId: integer("run_id"),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_tds_ytd_org_run",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_tds_ytd_ledger
  DROP CONSTRAINT fk_payroll_tds_ytd_run_id;

ALTER TABLE payroll_tds_ytd_ledger
  ADD CONSTRAINT fk_payroll_tds_ytd_org_run
  FOREIGN KEY (org_id, run_id)
  REFERENCES payroll_runs(org_id, id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE payroll_tds_ytd_ledger
  VALIDATE CONSTRAINT fk_payroll_tds_ytd_org_run;
```

**Quarantine query:**
```sql
SELECT id, org_id, run_id FROM payroll_tds_ytd_ledger
WHERE run_id IS NOT NULL
  AND (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);
-- Remediation: UPDATE payroll_tds_ytd_ledger SET run_id = NULL WHERE ...
```

---

### D-7: `payroll_run_employees.run_id` → `payroll_runs(org_id, id)`

**Prerequisite:** Phase C-3.

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
// Replace existing .references() with composite FK block:
runId: integer("run_id").notNull(),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_run_employees_org_run",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
-- Drop existing single-column FK:
ALTER TABLE payroll_run_employees
  DROP CONSTRAINT payroll_run_employees_run_id_payroll_runs_id_fk;

ALTER TABLE payroll_run_employees
  ADD CONSTRAINT fk_payroll_run_employees_org_run
  FOREIGN KEY (org_id, run_id)
  REFERENCES payroll_runs(org_id, id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE payroll_run_employees
  VALIDATE CONSTRAINT fk_payroll_run_employees_org_run;
```

> **Constraint name note:** Drizzle auto-generates FK constraint names in the form `{table}_{col}_{parent}_{parentcol}_fk`. Run `\d payroll_run_employees` in psql to confirm the exact generated name before the DROP.

**Quarantine query:**
```sql
SELECT id, org_id, run_id FROM payroll_run_employees
WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);
```

---

### D-8: `payroll_line_items.run_id` → `payroll_runs(org_id, id)` and `payroll_line_items.run_employee_id` → `payroll_run_employees(org_id, id)` and `payroll_line_items.component_id` → `salary_components(org_id, id)`

**Prerequisites:** Phase B-3 (component_id), Phase C-3 (payroll_runs), Phase C-4 (payroll_run_employees), Phase C-7 (salary_components).

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
runId: integer("run_id").notNull(),
runEmployeeId: integer("run_employee_id").notNull(),
componentId: integer("component_id"),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_line_items_org_run",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.runEmployeeId],
  foreignColumns: [payrollRunEmployees.orgId, payrollRunEmployees.id],
  name: "fk_payroll_line_items_org_run_employee",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.componentId],
  foreignColumns: [salaryComponents.orgId, salaryComponents.id],
  name: "fk_payroll_line_items_org_component",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
-- Drop existing single-column FKs for run_id and run_employee_id:
ALTER TABLE payroll_line_items DROP CONSTRAINT payroll_line_items_run_id_payroll_runs_id_fk;
ALTER TABLE payroll_line_items DROP CONSTRAINT payroll_line_items_run_employee_id_payroll_run_employees_id_fk;
-- Drop single-column FK for component_id added in B-3:
ALTER TABLE payroll_line_items DROP CONSTRAINT fk_payroll_line_items_component_id;

ALTER TABLE payroll_line_items
  ADD CONSTRAINT fk_payroll_line_items_org_run
  FOREIGN KEY (org_id, run_id) REFERENCES payroll_runs(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_line_items
  ADD CONSTRAINT fk_payroll_line_items_org_run_employee
  FOREIGN KEY (org_id, run_employee_id) REFERENCES payroll_run_employees(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_line_items
  ADD CONSTRAINT fk_payroll_line_items_org_component
  FOREIGN KEY (org_id, component_id) REFERENCES salary_components(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE payroll_line_items VALIDATE CONSTRAINT fk_payroll_line_items_org_run;
ALTER TABLE payroll_line_items VALIDATE CONSTRAINT fk_payroll_line_items_org_run_employee;
ALTER TABLE payroll_line_items VALIDATE CONSTRAINT fk_payroll_line_items_org_component;
```

**Quarantine queries:**
```sql
SELECT id, org_id, run_id FROM payroll_line_items
WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);

SELECT id, org_id, run_employee_id FROM payroll_line_items
WHERE (org_id, run_employee_id) NOT IN (SELECT org_id, id FROM payroll_run_employees);

SELECT id, org_id, component_id FROM payroll_line_items
WHERE component_id IS NOT NULL
  AND (org_id, component_id) NOT IN (SELECT org_id, id FROM salary_components);
```

---

### D-9: `payroll_exceptions.run_id` → `payroll_runs(org_id, id)` and `payroll_exceptions.run_employee_id` → `payroll_run_employees(org_id, id)`

**Prerequisites:** Phase C-3, Phase C-4.

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
runId: integer("run_id").notNull(),
runEmployeeId: integer("run_employee_id"),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_exceptions_org_run",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.runEmployeeId],
  foreignColumns: [payrollRunEmployees.orgId, payrollRunEmployees.id],
  name: "fk_payroll_exceptions_org_run_employee",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_exceptions DROP CONSTRAINT payroll_exceptions_run_id_payroll_runs_id_fk;
ALTER TABLE payroll_exceptions DROP CONSTRAINT payroll_exceptions_run_employee_id_payroll_run_employees_id_fk;

ALTER TABLE payroll_exceptions
  ADD CONSTRAINT fk_payroll_exceptions_org_run
  FOREIGN KEY (org_id, run_id) REFERENCES payroll_runs(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_exceptions
  ADD CONSTRAINT fk_payroll_exceptions_org_run_employee
  FOREIGN KEY (org_id, run_employee_id) REFERENCES payroll_run_employees(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_exceptions VALIDATE CONSTRAINT fk_payroll_exceptions_org_run;
ALTER TABLE payroll_exceptions VALIDATE CONSTRAINT fk_payroll_exceptions_org_run_employee;
```

**Quarantine queries:**
```sql
SELECT id, org_id, run_id FROM payroll_exceptions
WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);

SELECT id, org_id, run_employee_id FROM payroll_exceptions
WHERE run_employee_id IS NOT NULL
  AND (org_id, run_employee_id) NOT IN (SELECT org_id, id FROM payroll_run_employees);
```

---

### D-10: `payroll_approvals.run_id` → `payroll_runs(org_id, id)`

**Prerequisite:** Phase C-3.

**File:** `backend/src/db/schema/hr/payroll-runs.ts`

**Drizzle diff:**
```ts
runId: integer("run_id").notNull(),

foreignKey({
  columns: [table.orgId, table.runId],
  foreignColumns: [payrollRuns.orgId, payrollRuns.id],
  name: "fk_payroll_approvals_org_run",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_approvals DROP CONSTRAINT payroll_approvals_run_id_payroll_runs_id_fk;

ALTER TABLE payroll_approvals
  ADD CONSTRAINT fk_payroll_approvals_org_run
  FOREIGN KEY (org_id, run_id) REFERENCES payroll_runs(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_approvals VALIDATE CONSTRAINT fk_payroll_approvals_org_run;
```

**Quarantine query:**
```sql
SELECT id, org_id, run_id FROM payroll_approvals
WHERE (org_id, run_id) NOT IN (SELECT org_id, id FROM payroll_runs);
```

---

### D-11: `payroll_policy_versions.policy_id` → `payroll_policies(org_id, id)`

**Prerequisite:** Phase C-5.

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
policyId: integer("policy_id").notNull(),

foreignKey({
  columns: [table.orgId, table.policyId],
  foreignColumns: [payrollPolicies.orgId, payrollPolicies.id],
  name: "fk_payroll_policy_versions_org_policy",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_policy_versions DROP CONSTRAINT payroll_policy_versions_policy_id_payroll_policies_id_fk;

ALTER TABLE payroll_policy_versions
  ADD CONSTRAINT fk_payroll_policy_versions_org_policy
  FOREIGN KEY (org_id, policy_id) REFERENCES payroll_policies(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_policy_versions VALIDATE CONSTRAINT fk_payroll_policy_versions_org_policy;
```

**Quarantine query:**
```sql
SELECT id, org_id, policy_id FROM payroll_policy_versions
WHERE (org_id, policy_id) NOT IN (SELECT org_id, id FROM payroll_policies);
```

---

### D-12: `payroll_template_activations.policy_version_id` → `payroll_policy_versions(org_id, id)`

**Prerequisite:** Phase C-6.

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
policyVersionId: integer("policy_version_id").notNull(),

foreignKey({
  columns: [table.orgId, table.policyVersionId],
  foreignColumns: [payrollPolicyVersions.orgId, payrollPolicyVersions.id],
  name: "fk_payroll_template_act_org_policy_version",
}).onDelete("cascade"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_template_activations
  DROP CONSTRAINT payroll_template_activations_policy_version_id_payroll_policy_versions_id_fk;

ALTER TABLE payroll_template_activations
  ADD CONSTRAINT fk_payroll_template_act_org_policy_version
  FOREIGN KEY (org_id, policy_version_id) REFERENCES payroll_policy_versions(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE payroll_template_activations VALIDATE CONSTRAINT fk_payroll_template_act_org_policy_version;
```

**Quarantine query:**
```sql
SELECT id, org_id, policy_version_id FROM payroll_template_activations
WHERE (org_id, policy_version_id) NOT IN (SELECT org_id, id FROM payroll_policy_versions);
```

---

### D-13: `payroll_calendar_events.policy_id` → `payroll_policies(org_id, id)`

**Prerequisite:** Phase C-5.

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
policyId: integer("policy_id"),

foreignKey({
  columns: [table.orgId, table.policyId],
  foreignColumns: [payrollPolicies.orgId, payrollPolicies.id],
  name: "fk_payroll_calendar_events_org_policy",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_calendar_events DROP CONSTRAINT payroll_calendar_events_policy_id_payroll_policies_id_fk;

ALTER TABLE payroll_calendar_events
  ADD CONSTRAINT fk_payroll_calendar_events_org_policy
  FOREIGN KEY (org_id, policy_id) REFERENCES payroll_policies(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE payroll_calendar_events VALIDATE CONSTRAINT fk_payroll_calendar_events_org_policy;
```

**Quarantine query:**
```sql
SELECT id, org_id, policy_id FROM payroll_calendar_events
WHERE policy_id IS NOT NULL
  AND (org_id, policy_id) NOT IN (SELECT org_id, id FROM payroll_policies);
```

---

### D-14: `payroll_accounting_mappings.component_id` → `salary_components(org_id, id)`

**Prerequisites:** Phase B-5, Phase C-7.

**File:** `backend/src/db/schema/hr/payroll-policies.ts`

**Drizzle diff:**
```ts
componentId: integer("component_id"),

foreignKey({
  columns: [table.orgId, table.componentId],
  foreignColumns: [salaryComponents.orgId, salaryComponents.id],
  name: "fk_payroll_acct_mappings_org_component",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE payroll_accounting_mappings DROP CONSTRAINT fk_payroll_acct_mappings_component_id;

ALTER TABLE payroll_accounting_mappings
  ADD CONSTRAINT fk_payroll_acct_mappings_org_component
  FOREIGN KEY (org_id, component_id) REFERENCES salary_components(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE payroll_accounting_mappings VALIDATE CONSTRAINT fk_payroll_acct_mappings_org_component;
```

**Quarantine query:**
```sql
SELECT id, org_id, component_id FROM payroll_accounting_mappings
WHERE component_id IS NOT NULL
  AND (org_id, component_id) NOT IN (SELECT org_id, id FROM salary_components);
```

---

### D-15: `employee_salary_profiles.policy_version_id` → `payroll_policy_versions(org_id, id)`

**Prerequisites:** Phase B-4, Phase C-6.

**File:** `backend/src/db/schema/hr/payroll-workforce.ts`

**Drizzle diff:**
```ts
policyVersionId: integer("policy_version_id"),

foreignKey({
  columns: [table.orgId, table.policyVersionId],
  foreignColumns: [payrollPolicyVersions.orgId, payrollPolicyVersions.id],
  name: "fk_emp_salary_profiles_org_policy_version",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE employee_salary_profiles DROP CONSTRAINT fk_emp_salary_profiles_policy_version_id;

ALTER TABLE employee_salary_profiles
  ADD CONSTRAINT fk_emp_salary_profiles_org_policy_version
  FOREIGN KEY (org_id, policy_version_id) REFERENCES payroll_policy_versions(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE employee_salary_profiles VALIDATE CONSTRAINT fk_emp_salary_profiles_org_policy_version;
```

**Quarantine query:**
```sql
SELECT id, org_id, policy_version_id FROM employee_salary_profiles
WHERE policy_version_id IS NOT NULL
  AND (org_id, policy_version_id) NOT IN (SELECT org_id, id FROM payroll_policy_versions);
```

---

### D-16: `employee_salary_profile_components.profile_id` → `employee_salary_profiles(org_id, id)` and `employee_salary_profile_components.component_id` → `salary_components(org_id, id)`

**Prerequisites:** Phase C-7, Phase C-8.

**File:** `backend/src/db/schema/hr/payroll-workforce.ts`

**Drizzle diff:**
```ts
profileId: integer("profile_id").notNull(),
componentId: integer("component_id").notNull(),

foreignKey({
  columns: [table.orgId, table.profileId],
  foreignColumns: [employeeSalaryProfiles.orgId, employeeSalaryProfiles.id],
  name: "fk_esp_components_org_profile",
}).onDelete("cascade"),
foreignKey({
  columns: [table.orgId, table.componentId],
  foreignColumns: [salaryComponents.orgId, salaryComponents.id],
  name: "fk_esp_components_org_component",
}).onDelete("restrict"),
```

**Generated SQL:**
```sql
ALTER TABLE employee_salary_profile_components
  DROP CONSTRAINT employee_salary_profile_components_profile_id_employee_salary_profiles_id_fk;
ALTER TABLE employee_salary_profile_components
  DROP CONSTRAINT employee_salary_profile_components_component_id_salary_components_id_fk;

ALTER TABLE employee_salary_profile_components
  ADD CONSTRAINT fk_esp_components_org_profile
  FOREIGN KEY (org_id, profile_id) REFERENCES employee_salary_profiles(org_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE employee_salary_profile_components
  ADD CONSTRAINT fk_esp_components_org_component
  FOREIGN KEY (org_id, component_id) REFERENCES salary_components(org_id, id)
  ON DELETE RESTRICT NOT VALID;

ALTER TABLE employee_salary_profile_components VALIDATE CONSTRAINT fk_esp_components_org_profile;
ALTER TABLE employee_salary_profile_components VALIDATE CONSTRAINT fk_esp_components_org_component;
```

**Quarantine queries:**
```sql
SELECT id, org_id, profile_id FROM employee_salary_profile_components
WHERE (org_id, profile_id) NOT IN (SELECT org_id, id FROM employee_salary_profiles);

SELECT id, org_id, component_id FROM employee_salary_profile_components
WHERE (org_id, component_id) NOT IN (SELECT org_id, id FROM salary_components);
```

---

### D-17: `expenses.category_id` → `expense_categories(org_id, id)` and `expenses.reimbursement_batch_id` → `reimbursements(org_id, id)`

**Prerequisites for category_id:** `expense_categories` must have `UNIQUE(org_id, id)` candidate key. This table is a tenant anchor — add to its index array:

```ts
// In expenseCategories table constraints (hr/payroll.ts):
uniqueIndex("uniq_expense_categories_org_id").on(table.orgId, table.id),
```

```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_expense_categories_org_id ON expense_categories(org_id, id);
```

**Prerequisites for reimbursement_batch_id:** Phase B-6, and `reimbursements` must have `UNIQUE(org_id, id)`:

```ts
// In reimbursements table constraints (hr/payroll.ts):
uniqueIndex("uniq_reimbursements_org_id").on(table.orgId, table.id),
```

```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_reimbursements_org_id ON reimbursements(org_id, id);
```

**Drizzle diff for expenses:**
```ts
categoryId: integer("category_id"),
reimbursementBatchId: integer("reimbursement_batch_id"),

foreignKey({
  columns: [table.orgId, table.categoryId],
  foreignColumns: [expenseCategories.orgId, expenseCategories.id],
  name: "fk_expenses_org_category",
}).onDelete("set null"),
foreignKey({
  columns: [table.orgId, table.reimbursementBatchId],
  foreignColumns: [reimbursements.orgId, reimbursements.id],
  name: "fk_expenses_org_reimbursement_batch",
}).onDelete("set null"),
```

**Generated SQL:**
```sql
ALTER TABLE expenses DROP CONSTRAINT expenses_category_id_expense_categories_id_fk;
ALTER TABLE expenses DROP CONSTRAINT fk_expenses_reimbursement_batch_id;

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_org_category
  FOREIGN KEY (org_id, category_id) REFERENCES expense_categories(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_org_reimbursement_batch
  FOREIGN KEY (org_id, reimbursement_batch_id) REFERENCES reimbursements(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE expenses VALIDATE CONSTRAINT fk_expenses_org_category;
ALTER TABLE expenses VALIDATE CONSTRAINT fk_expenses_org_reimbursement_batch;
```

**Quarantine queries:**
```sql
SELECT id, org_id, category_id FROM expenses
WHERE category_id IS NOT NULL
  AND (org_id, category_id) NOT IN (SELECT org_id, id FROM expense_categories);

SELECT id, org_id, reimbursement_batch_id FROM expenses
WHERE reimbursement_batch_id IS NOT NULL
  AND (org_id, reimbursement_batch_id) NOT IN (SELECT org_id, id FROM reimbursements);
```

---

## Deferred Phase D Items (require prior cross-table Phase C)

These composite FKs are correct in intent but depend on Phase C running on tables in other payroll files (not yet covered here). They should be applied once the referenced parent has its candidate key.

| Table | FK | Parent | Blocker | Deferred until |
|---|---|---|---|---|
| `payroll_run_events` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payroll_inputs` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payroll_command_receipts` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payroll_journal_batches` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payroll_journal_batches` | `entity_id` | `payroll_entities` | Phase C-1 | C-1 done |
| `payroll_journal_batch_lines` | `batch_id` | `payroll_journal_batches` | Need candidate key on `payroll_journal_batches` | After C on journal_batches |
| `payslip_publications` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payslip_publications` | `run_employee_id` | `payroll_run_employees` | Phase C-4 | C-4 done |
| `payslip_publications` | `payslip_template_id` | `payslip_templates` | Need candidate key on `payslip_templates` | After C on payslip_templates |
| `payroll_bank_batches` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `payroll_bank_batch_items` | `batch_id` | `payroll_bank_batches` | Need candidate key on `payroll_bank_batches` | After C on bank_batches |
| `payroll_bank_batch_items` | `run_employee_id` | `payroll_run_employees` | Phase C-4 | C-4 done |
| `payroll_loan_adjustments` | `loan_id` | `salary_loans` | Need candidate key on `salary_loans` | After C on salary_loans |
| `payroll_loan_adjustments` | `run_id` | `payroll_runs` | Phase C-3 | C-3 done |
| `hr_payroll_adjustments` | `period_id` | `hr_payroll_input_periods` | Need candidate key on `hr_payroll_input_periods` | After C on input_periods |
| `hr_payroll_input_snapshots` | `period_id` | `hr_payroll_input_periods` | Need candidate key on `hr_payroll_input_periods` | After C on input_periods |
| `payroll_runs` | `policyVersionId` | `payroll_policy_versions` | Phase C-6 | C-6 done |
| `fnf_settlements` | `resignation_id` | `resignations` | Cross-domain (HR offboarding); handled in HR Wave 4 |
| `expenses` | `project_id` | `projects` | Cross-module; deferred to Wave 7-H |

---

## Execution Checklist

Run phases in strict order. Each phase must complete (including VALIDATE) before the next begins.

```
[ ] Pre-flight: Run ALL quarantine queries. Zero rows required before proceeding.
[ ] Phase B-1: payroll_run_allocations.run_id — add single FK
[ ] Phase B-2: payroll_tds_ytd_ledger.run_id — add single FK
[ ] Phase B-3: payroll_line_items.component_id — add single FK (resolve circular import first)
[ ] Phase B-4: employee_salary_profiles.policy_version_id — add single FK
[ ] Phase B-5: payroll_accounting_mappings.component_id — add single FK
[ ] Phase B-6: expenses.reimbursement_batch_id — add single FK
[ ] Phase C-1: UNIQUE(org_id,id) on payroll_entities — CONCURRENTLY
[ ] Phase C-2: UNIQUE(org_id,id) on payroll_periods — CONCURRENTLY
[ ] Phase C-3: UNIQUE(org_id,id) on payroll_runs — CONCURRENTLY
[ ] Phase C-4: UNIQUE(org_id,id) on payroll_run_employees — CONCURRENTLY
[ ] Phase C-5: UNIQUE(org_id,id) on payroll_policies — CONCURRENTLY
[ ] Phase C-6: UNIQUE(org_id,id) on payroll_policy_versions — CONCURRENTLY
[ ] Phase C-7: UNIQUE(org_id,id) on salary_components — CONCURRENTLY
[ ] Phase C-8: UNIQUE(org_id,id) on employee_salary_profiles — CONCURRENTLY
[ ] Phase C-9: UNIQUE(org_id,id) on expense_categories — CONCURRENTLY
[ ] Phase C-10: UNIQUE(org_id,id) on reimbursements — CONCURRENTLY
[ ] Phase D-1: payroll_periods → payroll_entities (composite FK)
[ ] Phase D-2: payroll_statutory_rule_sets → payroll_entities (composite FK)
[ ] Phase D-3: payroll_filings → payroll_entities + payroll_periods (composite FKs)
[ ] Phase D-4: payroll_jobs → payroll_entities (composite FK)
[ ] Phase D-5: payroll_run_allocations → payroll_runs (upgrade to composite FK)
[ ] Phase D-6: payroll_tds_ytd_ledger → payroll_runs (upgrade to composite FK)
[ ] Phase D-7: payroll_run_employees → payroll_runs (composite FK)
[ ] Phase D-8: payroll_line_items → payroll_runs + payroll_run_employees + salary_components
[ ] Phase D-9: payroll_exceptions → payroll_runs + payroll_run_employees
[ ] Phase D-10: payroll_approvals → payroll_runs
[ ] Phase D-11: payroll_policy_versions → payroll_policies
[ ] Phase D-12: payroll_template_activations → payroll_policy_versions
[ ] Phase D-13: payroll_calendar_events → payroll_policies
[ ] Phase D-14: payroll_accounting_mappings → salary_components
[ ] Phase D-15: employee_salary_profiles → payroll_policy_versions
[ ] Phase D-16: employee_salary_profile_components → employee_salary_profiles + salary_components
[ ] Phase D-17: expenses → expense_categories + reimbursements
```

---

## Table Count Summary

| Category | Count |
|---|---|
| Tables with Phase B work (bare FK columns) | 6 FK columns across 6 tables |
| Tables with Phase C work (candidate UNIQUE keys) | 10 parent tables |
| Tables with Phase D work (composite FKs) | 17 tables (33 composite FK constraints total) |
| Deferred Phase D items | 18 (blocked on sibling-table Phase C or cross-module) |
| **Total payroll tables in scope** | **19** |
