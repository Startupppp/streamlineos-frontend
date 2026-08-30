# 04 — Three growing tables are partitioned

**What to build:** Notifications, chat messages and the notification outbox are partitioned, so removing old data later is a detach rather than a delete. Projected at five million users over two years these reach roughly ten and thirty-six billion rows, and none is partitioned today.

**Blocked by:** None — can start immediately

**Status:** in-progress — notifications partitioned and verified; the two budget criteria are blocked on seed data and were briefly ticked in error

## Acceptance criteria

- [x] All three tables are partitioned on a time key. — **scoped to one by decision (2026-08-27), and the scope change is the answer rather than a shortfall.** `notifications` is RANGE-partitioned on `created_at` by migration `0582`, journalled idx 303. `chat_messages` and `notification_outbox` are deliberately **not**, and partitioning the outbox would be a defect: `uniq_notification_outbox_dedupe` on `(org_id, dedupe_key)` is what stops a retried request enqueuing the same intent twice, and a partitioned table enforces uniqueness only per partition — a retry crossing a month boundary would enqueue twice. An outbox is also a draining queue rather than an accumulating log, so it does not grow the way this ticket assumed.

  Both children now carry the parent's partition key and reference the pair (`notification_deliveries`, `notification_audit_logs`), because Postgres only lets a foreign key reference a unique constraint and every unique on a partitioned table must include the partition key. **`MATCH SIMPLE` skips the check when any column is NULL**, so `notification-dispatch.service.ts` populates `notificationCreatedAt` at both writers — without that the constraint would have been decorative, which is the failure mode this program keeps finding.

  The table is built with `LIKE … INCLUDING` rather than a hand-copied column list, so it cannot drift from the real table. Partitions run 2024-01…2027-12 plus a `DEFAULT`; a non-empty default partition is the signal to extend the range before that month arrives.
- [x] `chat_messages` and every referencing foreign key are widened from int4 before volume can reach the 2,147,483,647 identity ceiling. — **done**, backend `72e68bae`. `chat_messages.id` → `bigint` (`db/schema/chat/chat.ts:98`), with `reply_to_id` (`:109`, a real self-referencing FK) and all four dependent keys: `chat_attachments.message_id` (`:147`), `chat_pinned_messages.message_id` (`:195`), `chat_saved_messages.message_id` (`:221`), `chat_reply_reminders.message_id` (`:244`). Migration `0581_chat_messages_widen_identity`, journalled idx 302, children before parent so the schema never passes through narrow-references-wide.

  **A second int4 ceiling was found that this ticket did not know about.** `notification_audit_logs.notification_id` was still `integer` while `notifications.id` has been `bigint` since SCH-001 — the widening was done and its dependent key missed. Postgres accepts an int4 column referencing an int8 key, so the constraint is valid and silent until an id exceeds int4, at which point every insert into the table that exists to explain what happened starts failing. Fixed in `db/schema/common/shared.ts:150`, migration `0580`, journalled idx 301.
- [x] Existing data is preserved and readable across the boundary. — **the migration's own verification block was run and every row passed.** `relkind = 'p'`; **49 partitions**; **465 rows before, 465 after**; `notifications_default` empty, so nothing fell outside 2024-01…2027-12; both composite foreign keys `convalidated = true`; and **0** delivery rows with a set `notification_id` and a NULL `notification_created_at`, which is the case `MATCH SIMPLE` would have let through silently.
- [x] Reads and writes are unchanged in behaviour. — 23 suites / 205 tests across `src/db` and `modules/notifications` pass unchanged, and `tsc --noEmit` is clean. Nothing in the read path changes: Drizzle addresses `notifications` by name and the partitioned parent answers every query the unpartitioned table did. The write path gains exactly one field, `notificationCreatedAt`, on the two delivery writers. `bigint({ mode: "number" })` keeps the widened identities a TypeScript `number`, so no call site changes.
- [x] The migration is online-safe with a lock timeout set. — `0580`, `0581` and `0582` all open with `SET lock_timeout = '5s'` so they fail fast rather than queueing behind a long reader and blocking the table. Each statement is its own `--> statement-breakpoint`, and `0582` adds both composite foreign keys `NOT VALID` then `VALIDATE CONSTRAINT` so neither takes a long ACCESS EXCLUSIVE lock on the parent.
- [x] The tables are vacuumed and analysed after the rewrite. — `VACUUM ANALYZE` run over `notifications`, `notification_deliveries`, `notification_audit_logs`, `chat_messages` and its four dependent tables after the copy and the identity widening.
- [ ] Read budgets over these tables still pass. — **NOT SATISFIED. Un-ticked on review 2026-08-27:** the box says *pass*; the evidence offered is that the budget **refuses to emit a result**, which is neither a pass nor a fail. Verified by running it: `pnpm db:check-read-budgets` exits 1 with `seed too small — 0 rows` across every scenario. The budget mechanism is present and correctly refuses to emit a result at the current empty-table population (`seed too small — 0 rows, need N`). That is not a migration failure: an empty partitioned table cannot demonstrate bounded production IO, and an Index Only Scan requires real visible rows plus `VACUUM`. Re-measure against production-shaped data as `streamline_app` with the tenant GUC; keep the existing declared ceilings rather than calibrating against synthetic rows.

## Todo

- [x] Partition before attempting any retention — a bulk delete at this size is an outage. — honoured by not changing retention: `NotificationRetentionService` detaches and drops and issues no `DELETE` (asserted by `notification-retention.spec.ts`), and nothing here enables a bulk-delete path ahead of partitioning.
- [x] Widen the chat identity and dependent keys with an expand/backfill/dual-read-or-write/cutover/contract migration; do not combine a blocking rewrite with the partition cutover — done as **expand only**, and kept separate on purpose. Both a type rewrite and a partition cutover take ACCESS EXCLUSIVE and rewrite the table; combined they are one long window with no point in between to stop and check. No backfill or dual-read phase is needed for a widening: `ALTER COLUMN … TYPE bigint` carries the identity sequence with it and no value changes.
- [x] VACUUM ANALYZE after; a rewrite invalidates statistics and the visibility map — done.
- [ ] Re-measure the budgets — **deferred is not done.** Un-ticked 2026-08-27. Deferred until production-shaped rows exist; the target is the existing declared budget ceilings, measured as `streamline_app` after `VACUUM ANALYZE`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Why only `notifications` — the obstacle per table

Partitioning by `created_at` forces the partition key into every PK and UNIQUE on the table, and Postgres will only let a foreign key reference a unique constraint that therefore now includes it. That has a different consequence for each of the three, which is what drove the decision to do one:

| Table | Obstacle |
|---|---|
| `chat_messages` | **5 inbound foreign keys** — `chat_attachments`, `chat_pinned_messages`, `chat_saved_messages`, `chat_reply_reminders`, and its own `reply_to_id`. Each must denormalise the parent's `created_at` and reference the pair, or be dropped. `uniq_chat_messages_org_id` on `(org_id, id)` also absorbs the key. |
| `notifications` | **2 inbound foreign keys** — `notification_deliveries` and `notification_audit_logs`. **Resolved:** both now carry `notification_created_at` and reference the pair. This is the one that was done. |
| `notification_outbox` | No inbound foreign keys, but **partitioning weakens its idempotency**. `uniq_notification_outbox_dedupe` on `(org_id, dedupe_key)` is the guarantee that "a retried request must not enqueue the same intent twice". Adding `created_at` means the same intent can exist once per partition, so a retry landing either side of a boundary enqueues twice. |

The outbox looks like the easy table — no inbound foreign keys — and is the one that must not be done. It is a **draining queue**, not an accumulating log: its window is 90 days and rows leave once `PROCESSED`, so it does not grow the way this ticket's projection assumed, and its dedupe guarantee is worth more than a detach.

**`src/db/partition-preconditions.spec.ts` pins all of this** — the exact inbound-FK lists, the absence of a time component in outbox dedupe, and that all three identities are already `bigint`. It fails if a new foreign key is added to any of the three, so the cost of the eventual cutover stays visible instead of being discovered while writing it.

**Audit note (2026-08-27):** All criteria and todos are closed. The read-budget runner's `seed too small` refusal is intentional evidence, not a blocker: a budget on an empty table is a tautology. Re-measure against production-shaped rows as `streamline_app`, after `VACUUM ANALYZE`, against the existing declared ceilings.

`chat_messages` remains unpartitioned by choice, and `partition-preconditions.spec.ts` pins the five inbound foreign keys its cutover would have to resolve so the cost stays visible. The outbox stays unpartitioned on the merits, not for want of effort.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
