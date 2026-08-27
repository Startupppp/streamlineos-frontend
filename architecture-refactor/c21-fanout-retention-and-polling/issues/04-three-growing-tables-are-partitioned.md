# 04 — Three growing tables are partitioned

**What to build:** Notifications, chat messages and the notification outbox are partitioned, so removing old data later is a detach rather than a delete. Projected at five million users over two years these reach roughly ten and thirty-six billion rows, and none is partitioned today.

**Blocked by:** None — can start immediately

**Status:** in-progress — the widening half is done and shipped; the partition cutover is blocked, and the blocker is a decision this ticket has not made rather than an unapplied migration

## Acceptance criteria

- [ ] All three tables are partitioned on a time key. — **NOT DONE, deliberately.** See "Why the cutover did not happen" below. Each of the three has a distinct, specific obstacle that has to be decided before any DDL is written, and the house rule this ticket cites (`backend/CLAUDE.md` §3) says *"don't partition a table that isn't demonstrably large; record the triggering row count in the migration"* — no database has been touched this program, so that row count cannot be recorded and inventing one would be the opposite of what the rule asks.
- [x] `chat_messages` and every referencing foreign key are widened from int4 before volume can reach the 2,147,483,647 identity ceiling. — **done**, backend `72e68bae`. `chat_messages.id` → `bigint` (`db/schema/chat/chat.ts:98`), with `reply_to_id` (`:109`, a real self-referencing FK) and all four dependent keys: `chat_attachments.message_id` (`:147`), `chat_pinned_messages.message_id` (`:195`), `chat_saved_messages.message_id` (`:221`), `chat_reply_reminders.message_id` (`:244`). Migration `0581_chat_messages_widen_identity`, journalled idx 302, children before parent so the schema never passes through narrow-references-wide.

  **A second int4 ceiling was found that this ticket did not know about.** `notification_audit_logs.notification_id` was still `integer` while `notifications.id` has been `bigint` since SCH-001 — the widening was done and its dependent key missed. Postgres accepts an int4 column referencing an int8 key, so the constraint is valid and silent until an id exceeds int4, at which point every insert into the table that exists to explain what happened starts failing. Fixed in `db/schema/common/shared.ts:150`, migration `0580`, journalled idx 301.
- [ ] Existing data is preserved and readable across the boundary. — **BLOCKED:** there is no boundary yet, and no database to preserve data in.
- [ ] Reads and writes are unchanged in behaviour. — for the widening, yes: `bigint({ mode: "number" })` keeps the TypeScript type a `number`, `tsc --noEmit` is clean, and 34 suites / 254 tests across `modules/chat` and `modules/notifications` pass unchanged. Left unticked because the criterion is about the **partition** boundary, which does not exist.
- [x] The migration is online-safe with a lock timeout set. — both `0580` and `0581` open with `SET lock_timeout = '5s'` so they fail fast rather than queueing behind a long reader and blocking the table. Each `ALTER COLUMN … TYPE` is its own `--> statement-breakpoint`.
- [ ] The tables are vacuumed and analysed after the rewrite. — **BLOCKED on the operator.** Both migrations name the exact command in their header, including every table the rewrite touches. Cannot be executed without a database.
- [ ] Read budgets over these tables still pass. — **BLOCKED:** budgets are measured as `streamline_app` with the tenant GUC against real data.

## Todo

- [x] Partition before attempting any retention — a bulk delete at this size is an outage. — honoured by not changing retention: `NotificationRetentionService` detaches and drops and issues no `DELETE` (asserted by `notification-retention.spec.ts`), and nothing here enables a bulk-delete path ahead of partitioning.
- [x] Widen the chat identity and dependent keys with an expand/backfill/dual-read-or-write/cutover/contract migration; do not combine a blocking rewrite with the partition cutover — done as **expand only**, and kept separate on purpose. Both a type rewrite and a partition cutover take ACCESS EXCLUSIVE and rewrite the table; combined they are one long window with no point in between to stop and check. No backfill or dual-read phase is needed for a widening: `ALTER COLUMN … TYPE bigint` carries the identity sequence with it and no value changes.
- [ ] VACUUM ANALYZE after; a rewrite invalidates statistics and the visibility map — **BLOCKED on the operator**, command written into both migration headers.
- [ ] Re-measure the budgets — **BLOCKED:** needs a live database and the app role.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Why the cutover did not happen — three obstacles, one per table

Partitioning by `created_at` forces the partition key into every PK and UNIQUE on the table, and Postgres will only let a foreign key reference a unique constraint that therefore now includes it. That has a different consequence for each of the three, and none is mechanical:

| Table | Obstacle |
|---|---|
| `chat_messages` | **5 inbound foreign keys** — `chat_attachments`, `chat_pinned_messages`, `chat_saved_messages`, `chat_reply_reminders`, and its own `reply_to_id`. Each must denormalise the parent's `created_at` and reference the pair, or be dropped. `uniq_chat_messages_org_id` on `(org_id, id)` also absorbs the key. |
| `notifications` | **2 inbound foreign keys** — `notification_deliveries` and `notification_audit_logs`. Same choice. |
| `notification_outbox` | No inbound foreign keys, but **partitioning weakens its idempotency**. `uniq_notification_outbox_dedupe` on `(org_id, dedupe_key)` is the guarantee that "a retried request must not enqueue the same intent twice". Adding `created_at` means the same intent can exist once per partition, so a retry landing either side of a boundary enqueues twice. |

The outbox one deserves a second look before anyone assumes it is the easy table: an outbox is a **draining queue**, not an accumulating log. Its retention window is 90 days and rows leave once `PROCESSED`. It may not need partitioning at all, in which case its dedupe guarantee is worth more than the detach.

**`src/db/partition-preconditions.spec.ts` pins all of this** — the exact inbound-FK lists, the absence of a time component in outbox dedupe, and that all three identities are already `bigint`. It fails if a new foreign key is added to any of the three, so the cost of the eventual cutover stays visible instead of being discovered while writing it.

**Audit note (2026-08-27):** Two criteria and two todos closed with shipped code. The remaining five are one decision and one dependency: what happens to seven foreign keys and one uniqueness guarantee, and a database to measure and verify against. The widening was the part that had to happen early and is now done at the cheap moment, which is the same reasoning SCH-001 recorded for `notifications.id`.

---

PRD: [`c21 — Right models, right throughput — fan-out, retention and polling`](../prd.md) · Candidate index: [`../README.md`](../README.md)
