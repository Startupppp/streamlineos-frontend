# 04 — Three growing tables are partitioned

**What to build:** Notifications, chat messages and the notification outbox are partitioned, so removing old data later is a detach rather than a delete. Projected at five million users over two years these reach roughly ten and thirty-six billion rows, and none is partitioned today.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] All three tables are partitioned on a time key.
- [ ] `chat_messages` and every referencing foreign key are widened from int4 before volume can reach the 2,147,483,647 identity ceiling. — **Partial prior work:** `notifications.id` is already `bigint` (`db/schema/common/shared.ts:20`; comment "SCH-001: was serial (int4)"). `chat_messages.id` is still `integer` (`db/schema/chat/chat.ts:94`). The expand phase for `chat_messages` is needed.
- [ ] Existing data is preserved and readable across the boundary.
- [ ] Reads and writes are unchanged in behaviour.
- [ ] The migration is online-safe with a lock timeout set.
- [ ] The tables are vacuumed and analysed after the rewrite.
- [ ] Read budgets over these tables still pass.

## Todo

- [ ] Partition before attempting any retention — a bulk delete at this size is an outage
- [ ] Widen the chat identity and dependent keys with an expand/backfill/dual-read-or-write/cutover/contract migration; do not combine a blocking rewrite with the partition cutover
- [ ] VACUUM ANALYZE after; a rewrite invalidates statistics and the visibility map
- [ ] Re-measure the budgets
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Audit note (2026-08-26):** No partitioning migrations exist for any of the three tables — confirmed by grep of `migrations/` for `PARTITION BY RANGE`. The only partition-by-range migrations are under `migrations/pending/hrms-phase1/` (attendance events, leave ledger, hierarchy audit — different tables). `notifications.id` is already `bigint` (prior work SCH-001); `chat_messages.id` is still `integer`. All criteria genuinely open.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
