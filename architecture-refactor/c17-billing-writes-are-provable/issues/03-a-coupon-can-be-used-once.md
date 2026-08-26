# 03 — A coupon can be used once

**What to build:** A single-use promotion code can be used once. Today two guards exist and neither bites — the usage counter is never incremented and no redemption row is ever inserted — so a single-use code is reusable, forever, by anyone.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The usage counter is incremented and the redemption row inserted in the same transaction that applies the discount.
- [ ] A unique constraint does the actual enforcement, not an application-level check.
- [ ] Two simultaneous redemptions result in exactly one success.
- [ ] Redemptions are recorded so campaign performance is measurable.
- [ ] A usage limit above one is enforced at exactly that number.

## Todo

- [ ] Add the constraint first — the application check loses under concurrency
- [ ] Write the concurrent test; a sequential one passes while the bug is live
- [ ] Ensure the transaction mock invokes its callback
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
