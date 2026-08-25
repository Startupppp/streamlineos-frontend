# 04 — HR's table count is frozen and payroll is one folder

**What to build:** HR stops accumulating tables, and payroll lives in one place. HR carries 27% of all endpoints and three times Build's table count; the recommendation is restraint, not a rewrite of 176 tables.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A stated rule: no new HR table without removing one.
- [ ] New HR state routes onto existing lifecycle columns or the custom-field engine.
- [ ] The two payroll folders are consolidated — they are disjoint with zero overlapping table names, so this is a folder move with no data migration.
- [ ] Imports are updated and both repos build.
- [ ] No table is refactored away in this ticket.

## Todo

- [ ] Record the rule where module work starts
- [ ] Move the folder, update imports, build
- [ ] Confirm zero table-name overlap before moving
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c23 — A tenant extends the product without a deploy`](../prd.md) · Candidate index: [`../README.md`](../README.md)
