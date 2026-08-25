# 04 — Stock adjustments serialize

**What to build:** Two concurrent stock adjustments cannot produce an impossible quantity. Transfers already lock the row correctly; the adjustment path is unverified — two adjustments that both read a quantity of ten and both post minus ten would produce phantom negative stock.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The adjustment path takes the same row lock the transfer path takes.
- [ ] Two concurrent adjustments leave an arithmetically possible final quantity.
- [ ] Adjustments and transfers use the same locking, so neither path is weaker.
- [ ] The transaction mock in the tests invokes its callback — otherwise every assertion inside the locked transaction is vacuous.

## Todo

- [ ] Verify the current locking before changing it
- [ ] Write the concurrent test; this is the phantom-stock regression test
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
