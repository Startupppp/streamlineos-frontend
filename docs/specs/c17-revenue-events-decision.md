# c17-05 revenue events: write, not delete

Decided 2026-08-27 while closing `c17-05 — Revenue reporting reads what the system writes`.

## Decision

**Write the events. Keep `revenue_events` and its reader.**

The ticket allowed either outcome. Delete was rejected on two grounds:

- The reader is a shipped surface, not a stub. `GET /billing/analytics`
  (`billing.controller.ts`) is gated on `billing:analytics:view` and serves a
  frontend page; removing it would mean deleting a permission key from both
  catalogs and a page from a repo this lane does not own.
- PRD user story 15 requires revenue events on every billing state change, and
  the enum, table, indexes and reader all already exist. The gap was writers.

## How it is written

Producers call `RevenueAnalyticsService.emit(tx, event)` **inside the transaction
that changes billing state**. That enqueues an outbox event; the same service is
the registered consumer for `billing.revenue-event` and performs the insert
behind an `InboxConsumer` fence. So the event commits with the state change, and
a delivery failure retries and eventually dead-letters rather than vanishing.

Each event carries its own `aggregateId` (its outbox `eventId`), because the
inbox's monotonic per-aggregate version fence would otherwise suppress a second
revenue event for the same organisation as out-of-order.

The previous shape — `void this.revenueAnalytics.recordEvent(...).catch(log)` at
one call site — is removed. `recordEvent` no longer exists.

## State changes that must emit

| Change | Event | MRR |
|---|---|---|
| Paid activation, no prior subscription | `new_subscription` | plan price |
| Paid activation, prior subscription on TRIAL | `new_subscription` | plan price |
| Paid activation, prior subscription lapsed (PAST_DUE / CANCELLED / SUSPENDED / EXPIRED) | `reactivation` | plan price |
| Plan change upward while ACTIVE | `upgrade` | price delta |
| Plan change downward while ACTIVE | `downgrade` | price delta (magnitude) |
| Renewal of the plan already held | *none* | — |
| AI credit pack captured via webhook | `addon_purchase` | 0, `amount` = paid |
| Payment refunded via webhook | `refund` | 0, `amount` = refunded |
| Trial expiry sweep (`TRIAL` → `EXPIRED`) | `churn` | 0 |
| Dunning suspension sweep (`PAST_DUE` → `CANCELLED`) | `churn` | plan price |
| Payment failure (`ACTIVE` → `PAST_DUE`) | *none* | — |

`classifyPlanChange` (`billing/core/revenue-events.ts`) is the only place the
first six rows are decided. MRR is always a non-negative magnitude; the type
carries the sign.

**Churn is emitted exactly once per customer lost, at the terminal transition.**
`ACTIVE → PAST_DUE` deliberately emits nothing: the customer may still recover,
and a recovery already emits `reactivation`. Emitting churn there too would
double-count every suspension. A lapsed trial carries `mrr: 0` because it never
contributed any MRR — it is a lost customer, not lost revenue, and counting its
plan price as churned MRR would show contraction that never happened.

## Reporting reconciles with subscription state

MRR is **not** summed from the event stream. `getMetrics` computes it as the sum
of plan prices over ACTIVE subscriptions; the events supply movement between
levels (new, expansion, contraction, churn, refunds). Summing
`new_subscription` rows — the previous implementation — counted every
re-subscribe again and never subtracted anything, so the headline number drifted
further from reality with each billing change.

`RevenueAnalyticsService.reconcile()` returns the reported level, the level
implied by subscriptions, and whether they agree.

Under RLS the reader is scoped to the caller's organisation, so these are
per-organisation figures despite the permission's "platform admin only"
description. That mismatch is recorded in the lane request, not resolved here.
