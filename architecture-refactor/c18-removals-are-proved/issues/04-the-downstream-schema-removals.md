# 04 — The downstream schema removals

**What to build:** Two columns that other tickets replaced are removed once nothing reads them. Removing either before its replacement lands is data loss, which is why this ticket is last.

**Blocked by:** c16-04 — Invoice line items are queryable; c17-06 — Dunning history is queryable

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The invoice line-item array column is removed only after every row is migrated and reconciled.
- [ ] The dunning array column is removed only after its history is migrated.
- [ ] Each removal is proved by zero symbol references, zero raw name references and no dependent foreign key.
- [ ] The migration-integrity spec still passes.

## Todo

- [ ] Verify migration completeness before dropping
- [ ] Grep by path as well as by symbol
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
