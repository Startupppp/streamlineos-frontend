# 07 — An issued invoice cannot change

**What to build:** What a customer was charged cannot change after the fact. Corrections are issued as credit notes, so adjustments are visible rather than silent.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] Mutating an issued invoice is rejected at the database, not by convention.
- [ ] A correction is issued as a credit note.
- [ ] Seat counting has one stated definition shared between billing and membership.
- [ ] A mid-cycle plan change is prorated.

## Todo

- [x] Enforce immutability with a database constraint
- [ ] Write down the seat-count definition once and point both consumers at it
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Shipped in:**
- `backend/migrations/0492_invoice_immutability_trigger.sql` — `BEFORE UPDATE` trigger `trg_invoice_immutability` on the `invoices` table; raises `check_violation` when any financial field (subtotal, tax_rate, tax_amount, discount, total, currency, cgst_amount, sgst_amount, igst_amount, exchange_rate) changes on a non-DRAFT invoice. Status transitions, notes, due_date and reminder timestamps remain writable.

**Remaining criteria out of scope for this agent:**
- Credit note issuance lives in `modules/invoices/**`.
- Seat-count definition and proration are cross-cutting; requires coordination with `modules/billing/` membership flow and `modules/invoices/`.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
