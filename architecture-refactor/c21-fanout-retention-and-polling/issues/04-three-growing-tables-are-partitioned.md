# 04 — Three growing tables are partitioned

**What to build:** Notifications, chat messages and the notification outbox are partitioned, so removing old data later is a detach rather than a delete. Projected at five million users over two years these reach roughly ten and thirty-six billion rows, and none is partitioned today.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] All three tables are partitioned on a time key.
- [ ] Existing data is preserved and readable across the boundary.
- [ ] Reads and writes are unchanged in behaviour.
- [ ] The migration is online-safe with a lock timeout set.
- [ ] The tables are vacuumed and analysed after the rewrite.
- [ ] Read budgets over these tables still pass.

## Todo

- [ ] Partition before attempting any retention — a bulk delete at this size is an outage
- [ ] VACUUM ANALYZE after; a rewrite invalidates statistics and the visibility map
- [ ] Re-measure the budgets
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
