# 04 — HR's table count is frozen and payroll is one folder

**What to build:** HR stops accumulating tables, and payroll lives in one place. HR carries 27% of all endpoints and three times Build's table count; the recommendation is restraint, not a rewrite of 176 tables.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Audit note (2026-08-26):** Two criteria already satisfied in `backend/CLAUDE.md` §1. Payroll folder consolidation at the schema level is NOT done: `db/schema/hr/` still holds 6 payroll-related files (`payroll.ts`, `payroll-inputs.ts`, `payroll-payout.ts`, `payroll-policies.ts`, `payroll-runs.ts`, `payroll-workforce.ts`) alongside the standalone `db/schema/payroll/` folder. Build and import criteria blocked on that folder move.

## Acceptance criteria

- [x] A stated rule: no new HR table without removing one. — `backend/CLAUDE.md` §1 ("HR's table count is frozen")
- [x] New HR state routes onto existing lifecycle columns or the custom-field engine. — `backend/CLAUDE.md` §1 ("New HR state goes onto existing lifecycle columns or the custom-field engine")
- [ ] The two payroll folders are consolidated — they are disjoint with zero overlapping table names, so this is a folder move with no data migration. — **GENUINELY OPEN:** `db/schema/hr/` contains 6 `payroll-*.ts` files; `db/schema/payroll/` is a separate top-level folder; consolidation not done
- [ ] Imports are updated and both repos build. — **BLOCKED:** on the payroll schema folder consolidation above
- [ ] No table is refactored away in this ticket.

## Todo

- [x] Record the rule where module work starts — `backend/CLAUDE.md` §1
- [ ] Move the folder, update imports, build
- [ ] Confirm zero table-name overlap before moving — check `db/schema/hr/payroll-*.ts` tables against `db/schema/payroll/*.ts` tables before touching files
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
