# 04 — HR's table count is frozen and payroll is one folder

**What to build:** HR stops accumulating tables, and payroll lives in one place. HR carries 27% of all endpoints and three times Build's table count; the recommendation is restraint, not a rewrite of 176 tables.

**Blocked by:** None — can start immediately

**Status:** done

**Audit note (2026-08-26):** Two criteria already satisfied in `backend/CLAUDE.md` §1. Payroll folder consolidation at the schema level is NOT done: `db/schema/hr/` still holds 6 payroll-related files (`payroll.ts`, `payroll-inputs.ts`, `payroll-payout.ts`, `payroll-policies.ts`, `payroll-runs.ts`, `payroll-workforce.ts`) alongside the standalone `db/schema/payroll/` folder. Build and import criteria blocked on that folder move.

## Acceptance criteria

- [x] A stated rule: no new HR table without removing one. — `backend/CLAUDE.md` §1 ("HR's table count is frozen")
- [x] New HR state routes onto existing lifecycle columns or the custom-field engine. — `backend/CLAUDE.md` §1 ("New HR state goes onto existing lifecycle columns or the custom-field engine")
- [x] The two payroll folders are consolidated — they are disjoint with zero overlapping table names, so this is a folder move with no data migration. — All six files moved into `backend/src/db/schema/payroll/`: `payroll-runs.ts`→`runs.ts`, `payroll-policies.ts`→`policies.ts`, `payroll-payout.ts`→`payout.ts`, `payroll-workforce.ts`→`workforce.ts`, `payroll-inputs.ts`→`input-capture.ts` (the existing `inputs.ts` holds a different table, `payroll_inputs`), `payroll.ts`→`claims-and-settlements.ts` (expenses, reimbursements, salary loans, bonuses, FNF settlements, asset returns). `db/schema/hr/` now contains zero payroll files. Committed as renames in `1c99a2e6`.
- [x] Imports are updated and both repos build. — 16 import sites rewritten: `db/schema/hr/index.ts` (6 exports removed), `db/schema/payroll/index.ts` (6 added), `hr/benefits.ts`, `accounting/finance-expenses.ts`, five files in `db/schema/payroll/` that used to reach across into `../hr/payroll-*`, the four sibling imports inside the moved files, and four module files under `modules/hr/payroll-inputs/` and `modules/payroll/runs/lib/`. Zero references to `schema/hr/payroll` remain. **Validation:** `tsc --noEmit` clean · `nest build` exit 0 · `madge --circular` "No circular dependency found!" over 3,853 files. The frontend has no database access (root `CLAUDE.md` §5), so it is untouched by a schema-folder move.
- [x] No table is refactored away in this ticket. — Table-name sets compared before moving: 27 tables in the six HR files, 15 in `db/schema/payroll/`, intersection **empty**. Every `pgTable(...)` call moved byte-for-byte; only import paths and the two barrels changed. `git show --stat 1c99a2e6` shows all six as pure renames.

## Todo

- [x] Record the rule where module work starts — `backend/CLAUDE.md` §1
- [x] Move the folder, update imports, build — see the two criteria above.
- [x] Confirm zero table-name overlap before moving — done first, before any file was touched. **A single-line `pgTable\(\s*"` pattern is wrong here** and undercounted by 10: six of the moving files put the table name on the line *after* `pgTable(`. The multiline scan found 27 HR payroll tables (`hr_payroll_input_periods`, `hr_payroll_input_snapshots`, `hr_payroll_adjustments`, `expense_categories`, `expenses`, `reimbursements`, `salary_loans`, `bonuses`, `fnf_settlements`, `asset_returns` were all invisible to the single-line pattern) against 15 in `db/schema/payroll/`. Intersection empty.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Lane 4 note (2026-08-26):** The move *reduced* coupling rather than adding it — five files in `db/schema/payroll/` already imported across into `db/schema/hr/payroll-runs` and `hr/payroll-payout`, and those edges are now local. One import-path line outside Lane 4's territory had to change (`db/schema/accounting/finance-expenses.ts:5`, `../hr/payroll` → `../payroll/claims-and-settlements`); leaving it would have broken the build for every lane. Recorded in [`../../lane-requests/lane-4.md`](../../lane-requests/lane-4.md).

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
