# c21 — Right models, right throughput — fan-out, retention and polling

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 7 tickets, 6 done, 1 open (seed-data blocked).

The models are correct: the realtime capability is per-channel with active revocation, the outbox relay claims rows safely, and chat unread uses a watermark. **What is wrong is what happens at volume** — a 50k announcement is a sequential insert loop that outlives the HTTP timeout, three tables grow forever, and polling alone is ~22,000 requests per second at 50k sessions with over half from one four-second widget.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Polling stops when realtime is live | — | done |
| 02 | An announcement to everyone completes | — | done |
| 03 | Notifications page correctly, and mark-all-read is constant work | — | done |
| 04 | [Three growing tables are partitioned](issues/04-three-growing-tables-are-partitioned.md) | — | in-progress — read-budget criteria blocked on seed data |
| 05 | Retention detaches rather than deletes | 04 | done |
| 06 | The inbox renders from cached metadata | — | done |
| 07 | One delivery policy governs email, in-app, push and alerts | — | done — tenant-member product events migrated; direct exceptions explicitly classified |

## Closed ticket digests

**01 — Polling stops when realtime is live.** Already satisfied at audit; no code changes required. `frontend/hooks/common/use-realtime-poll-interval.ts` returns `false` when Ably is connected and the configured fallback interval on disconnect; every polling hook consumes it. The support widget interval was already corrected from 4 s to 30 s.

**02 — An announcement to everyone completes.** Already satisfied at audit; no code changes required. `broadcasts.service.ts:186-215` resolves recipients in one indexed SELECT, writes one broadcast row, and emits via `registerAfterCommit` so the HTTP response returns before any per-channel work. `broadcasts-fanout.spec.ts:137` tests a 50,000-member audience; dismissal uses `onConflictDoNothing` on the `(orgId, broadcastId, userId)` unique index.

**03 — Notifications page correctly, and mark-all-read is constant work.** Migration 0476 applied the watermark table with O(1) `markAllRead` (`max(id)` + upsert) and `id`-ordered pagination using `lt(id, cursor)`. Added `notifications-pagination-boundary.spec.ts` to prove id-cursor paging produces no duplicates or gaps when `created_at` timestamps are tied. The `org_id`-prefixed chat unread index was already present.

**05 — Retention detaches rather than deletes.** Policy recorded in `notification-retention-policy.ts:20-24` (180/365/90-day windows with written rationale per window). `NotificationRetentionService` registered in `CronModule`; backend `c1fbb6e0` fixed `DETACH PARTITION IF EXISTS` (not valid Postgres) to probe `to_regclass` first. `notification-retention.spec.ts` asserts no DELETE is ever issued; the service is a clean no-op for `chat_messages` and `notification_outbox`, which are deliberately unpartitioned.

**06 — The inbox renders from cached metadata.** Sync-on-access: `fetchMessagesForAccount` fire-and-forgets an `upsertBatch` after every provider fetch; first-page requests fresh under 5 min are served from DB. New files: `db/schema/mail/mail-metadata.ts`, `backend/migrations/0504_mail_metadata_cache.sql`, `mail-metadata.service.ts`, `mail-metadata-isolation.spec.ts`. Orchestrator action still required: add `export * from "./mail"` to `backend/src/db/schema/index.ts` (before `custom-field-engine`) and journal migration `0504_mail_metadata_cache`.

**07 — One delivery policy governs email, in-app, push and alerts.** `notification-caller-inventory.ts` has zero `PENDING_MIGRATION` entries — 28 direct callers all explicitly exempt (15 `WORKFLOW_EXTERNAL`, 2 `OPERATOR_ALERT`, rest for consent/report/digest/platform). `notification-delivery-worker.service.ts` now reads its retry curve from `notification-delivery-class.ts` (backend `8f3ef103`). `calendar.service.ts` and `leave-decision-effects.service.ts` migrated to emit through the dispatch seam. Gap carried forward: `alert-dead-delivery.mjs` fires on every dead delivery rather than mandatory-only because the catalog flag is not persisted onto `notification_deliveries` rows; fix = persist it at dispatch time and filter on it.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
