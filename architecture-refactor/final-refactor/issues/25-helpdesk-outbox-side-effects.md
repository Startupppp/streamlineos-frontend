# 25: Move HR Helpdesk side effects to the outbox

**What to build:** Helpdesk assignment and status notifications are durable, retryable and visible to operators instead of silently ignored.

**Blocked by:** 18 — Cursor-page and index HR Helpdesk search.

**Status:** done

- [x] Helpdesk state and notification intent commit atomically.
- [x] Swallowed promise failures are removed.
- [x] Retry and duplicate delivery are idempotent with dead-letter telemetry.
- [x] Commit, rollback, retry and notification tests pass.

## Changes

- `backend/src/modules/hr/helpdesk/hr-helpdesk.service.ts` — `create()` and `updateTicket()` now run inside `db.transaction` and call `OutboxWriter.emit(tx, …)` in the same transaction. `void this.dispatchNewTicketEmails(...).catch(() => {})` is deleted, along with the service's direct dependency on `NotificationDispatchService` and `AccessService`.
- `backend/src/modules/hr/helpdesk/hr-helpdesk-events.consumer.ts` (new) — registers for the three event types, claims through `InboxConsumer`, validates each payload with Zod, dispatches with `dedupeKey: outboxEffectIdempotencyKey(event, CONSUMER_NAME)` and marks `COMPLETED`/`FAILED`.
- `backend/src/modules/hr/helpdesk/dto/hr-helpdesk-events.schema.ts` (new), `hr-helpdesk.module.ts` (consumer registered as a provider, `OutboxModule` imported).
- `backend/src/modules/notifications/notification-events.catalog.ts` — `hr.helpdesk.ticket_assigned` and `hr.helpdesk.ticket_status_changed` added beside the existing `ticket_created`.

## Findings

- `updateTicket` sent nothing at all. Assignment and status changes — the two events an employee actually waits on — notified nobody, which is what "silently ignored" meant.
- `create()` ended in `void this.dispatchNewTicketEmails(...).catch(() => {})`. Two failures in one line: the `.catch(() => {})` discarded every error, and the continuation ran after the request transaction had committed, so under RLS its queries died `42501` with nobody watching.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/hr/helpdesk` — 26 passed (shared with ticket 18). The outbox-specific cases: the emit happens on the same `tx` object as the insert; a transaction error is not swallowed; `ticket_assigned` and `ticket_status_changed` are emitted only when the value actually changed; a duplicate delivery is claimed once and the second attempt is a no-op; an invalid payload is marked `FAILED` rather than discarded; a dispatch failure is not swallowed. The `db.transaction` double invokes its callback — a bare `jest.fn()` would have voided every assertion inside it.

Runtime, against the booted API and the real database (`node src/scripts/verify-hr-list-endpoints.mjs`):

```
PASS  helpdesk create returns the ticket — status=201
PASS  create committed an outbox row in the same transaction — state=PENDING
PASS  helpdesk update succeeds — status=200
PASS  assignment and status change each committed an outbox row — hr.helpdesk.ticket_assigned, hr.helpdesk.ticket_created, hr.helpdesk.ticket_status_changed
PASS  a rejected create writes no outbox row — status=409 created_events=1
```

The last line is the atomicity proof from the other side: a create rejected by the duplicate-title conflict leaves the event count unchanged, so no event escapes without its row.

Draining the outbox for real, `POST /cron/outbox-events-worker`:

```
{"success":true,"claimed":9,"delivered":3,"suppressed":0,"retried":6,"dead":0,"fenced":0}

hr.helpdesk.ticket_assigned       | DELIVERED | attempts=0
hr.helpdesk.ticket_status_changed | DELIVERED | attempts=0
hr.helpdesk.ticket_created        | DELIVERED | attempts=0

inbox_records: hr:helpdesk | COMPLETED | retries=0   (x3)
```

All three consumed on the first attempt, each with its own inbox claim row, so a redelivery is suppressed rather than duplicated.

## What the runtime drain then exposed

Driving the next stage, `POST /cron/notification-outbox-flush`, returned `Claimed 3: 1 processed, 2 retrying, 0 dead` and left two intents `PENDING` with a real error attached. That failure is **not** in this ticket's code and is not caused by it: `notifications.created_at` holds microsecond precision (`2026-08-27 05:29:36.040080`) while the delivery back-fill round-trips it through a JavaScript `Date`, which truncates to milliseconds, so the composite FK `notification_deliveries (notification_id, notification_created_at) -> notifications (id, created_at)` can never match and the transaction rolls back with `23503`. It is platform-wide and pre-existing; it is filed for the notifications owner in `CROSS-SESSION.md` with the rolled-back probe that proves it.

It is worth stating plainly why this counts as the ticket being **done** rather than blocked. The acceptance criterion is that the side effect is durable, retryable and *visible* instead of silently ignored. Before this change the same failure was invisible — `.catch(() => {})` swallowed it and the request returned 201. Now the intent is committed with the business row, the delivery attempt is recorded with `attempt_count` and `last_error`, it is retried, and it will dead-letter if it keeps failing. The pipeline surfaced a genuine platform defect on its first real run, which is exactly the behaviour the ticket asked for.
