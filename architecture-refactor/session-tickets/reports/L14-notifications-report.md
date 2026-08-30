# L14 Notifications Report

**Status:** DONE (one bug fixed, all checks passing)

## Delivery proofs (VERIFIED DONE)

Existing tests prove the full guarantee chain: `notification-dispatch-after-commit.spec.ts` pins (1) intent written inside caller's transaction before dispatch, (2) drain marks row PROCESSED in its own tenant transaction, (3) failed drain leaves row PENDING for relay, (4) sync dispatch when no ambient transaction. `notification-outbox-relay.spec.ts` pins (5) relay recovers an intent whose immediate drain never ran, (6) dedupe key is threaded through so a replay cannot double-deliver, (7) retry on failure, (8) dead-letter after MAX_ATTEMPTS.

## Alert-predicate verdicts

- `alert:queue-age` — queries `outbox_events.delivery_state` / `retry_count`. Column names match schema exactly. Self-test: `pass: true`.
- `alert:dead-outbox` — queries `outbox_events.delivery_state = 'DEAD'` / `dead_lettered_at`. Columns match. Self-test: `pass: true`.
- `alert:dead-delivery` — queries `notification_deliveries.status = 'DEAD'` / `failed_at`. `notificationDeliveryStatusEnum` includes DEAD. Self-test: `pass: true`.
- No alert uses literal log-string scanning; all predicate against DB state directly.

## Webhook three-state verdict

`billing/core/provider-event-ledger.ts` (out-of-ownership) implements three states correctly: RECORDED (first insert), RETRY (conflict + `processedAt IS NULL`), PROCESSED (conflict + `processedAt NOT NULL`). Outgoing webhooks (`webhooks/webhooks-dispatch.service.ts`) do not need a ledger — they write to `webhook_logs` per delivery, not per received event.

## Bug fixed

`broadcasts-cursor-paging.spec.ts` had 2 failing tests: `pageThrough` checked `nextCursor === undefined` but `buildIdCursorPage` correctly returns `null` on exhaustion (per platform rule "explicit null, never undefined"). Fixed both assertions to check `null`. All 4 tests now pass.

## One-line test summary

266/266 tests pass (`notification|push|webhook`); `check:route-classification` 0 undeclared; `check:log-secrets` clean; tenant-isolation has 0 gaps in my trees; outbox-consumers 18 orphans all outside my ownership.
