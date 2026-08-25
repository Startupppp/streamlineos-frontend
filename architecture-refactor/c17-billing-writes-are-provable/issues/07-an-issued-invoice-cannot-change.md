# 07 — An issued invoice cannot change

**What to build:** What a customer was charged cannot change after the fact. Corrections are issued as credit notes, so adjustments are visible rather than silent.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Mutating an issued invoice is rejected at the database, not by convention.
- [ ] A correction is issued as a credit note.
- [ ] Seat counting has one stated definition shared between billing and membership.
- [ ] A mid-cycle plan change is prorated.

## Todo

- [ ] Enforce immutability with a database constraint
- [ ] Write down the seat-count definition once and point both consumers at it
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
