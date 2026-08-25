# 06 — Dunning history is queryable

**What to build:** Collection performance can be measured. Today the attempts table is dead while the actual state lives in a JSON array, so dunning history cannot be queried, aggregated or audited.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Dunning attempts live in their table and are queryable.
- [ ] The existing array is migrated with no history lost.
- [ ] The array column is removed only after migration.
- [ ] Collection performance is reportable.

## Todo

- [ ] Migrate, verify, then drop
- [ ] Coordinate with c18-04, which removes the column
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
