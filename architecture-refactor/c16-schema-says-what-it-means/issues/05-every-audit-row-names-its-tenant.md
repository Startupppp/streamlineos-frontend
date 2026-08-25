# 05 — Every audit row names its tenant

**What to build:** An audit trail can be scoped with confidence. Today the tenant column is nullable, so a row without one is either a platform event or a bug and no query can tell the difference.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The tenant column is non-nullable.
- [ ] Platform-level events have an explicit representation, distinguishable from tenant events.
- [ ] A row with neither is rejected by the constraint.
- [ ] Existing rows are backfilled before the constraint is applied.

## Todo

- [ ] Backfill first, then constrain
- [ ] Add the constraint NOT VALID then validate, so the migration is online-safe
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
