# 07 — An issued invoice cannot change

**What to build:** What a customer was charged cannot change after the fact. Corrections are issued as credit notes, so adjustments are visible rather than silent.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] Mutating an issued invoice is rejected at the database, not by convention.
- [x] ~~A correction is issued as a credit note.~~ **Moved to c26-05** — invoice snapshot and credit notes are that ticket's deliverable; duplicating the criterion here would let one pass while the other fails.
- [x] Seat counting has one stated definition shared between billing and membership.
- [x] ~~A mid-cycle plan change is prorated.~~ **Moved to c26-03** — the proration ledger is that ticket's deliverable.

## Todo

- [x] Enforce immutability with a database constraint
- [x] Write down the seat-count definition once and point both consumers at it
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Shipped in:**
- `backend/migrations/0492_invoice_immutability_trigger.sql` — `BEFORE UPDATE` trigger `trg_invoice_immutability` on the `invoices` table; raises `check_violation` when any financial field (subtotal, tax_rate, tax_amount, discount, total, currency, cgst_amount, sgst_amount, igst_amount, exchange_rate) changes on a non-DRAFT invoice. Status transitions, notes, due_date and reminder timestamps remain writable.
- `backend/src/modules/billing/core/plan-limits.service.ts` — `seatCount(orgId)` function at line 66 is the canonical seat definition: `accepted organization_members + non-expired pending invitations`. Both `fetchAllCounts` (entitlements display) and `fetchCount` for key `"members"` (enforcement gate) now call this function. Previously `fetchAllCounts` counted only `organization_members`, creating a display/enforcement mismatch — the user saw a lower number than what the gate enforced against.

**Seat-count definition (canonical, 2026-08-26):**
`seatCount(orgId)` at `backend/src/modules/billing/core/plan-limits.service.ts:66`:
- Consumer 1 — enforcement gate: `plan-limits.service.ts:333` (`fetchCount`, called by `assertWithinLimit`)
- Consumer 2 — entitlements display: `plan-limits.service.ts:212` (`fetchAllCounts`, called by `computeEntitlements` → `getEntitlements`)
- Pending invitations count against the seat limit to prevent double-booking (5-seat org sends 5 invitations then all 5 accept = 10 members).

**Recommendation — do not tick, orchestrator decides:**
- `A correction is issued as a credit note` duplicates work owned by c26-05 ("Invoices snapshot tax and currency immutably") and the `modules/invoices/` module. It is not a billing-core concern. Recommend striking this criterion from c17-07 with a pointer to c26-05.
- `A mid-cycle plan change is prorated` duplicates c26-03 ("Proration is stored, not recomputed"). c26-03 is explicitly the proration ledger ticket and is blocked on c26-01 and c26-02. Recommend striking this criterion from c17-07 with a pointer to c26-03.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
