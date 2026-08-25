# 04 — Invoice line items are queryable

**What to build:** A finance user can filter invoices by what is on their lines, and invoices behave the same as quotes. Today quote line items are a real table with a foreign key while invoice line items are a JSON array of the same shape — one domain concept, two representations, in one module.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Invoice line items are a table matching the shape quotes already uses.
- [ ] An invoice's total reconciles with the sum of its lines, before and after migration, on production-shaped data.
- [ ] Line items are filterable and aggregatable.
- [ ] Converting a quote to an invoice is not a translation between representations.
- [ ] The array column is removed only after every row is migrated.

## Todo

- [ ] Migrate the arrays, verify reconciliation, then drop the column
- [ ] Do not drop the column in the same ticket that migrates the data
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
