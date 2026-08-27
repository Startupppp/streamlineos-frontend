# 05 — Revenue reporting reads what the system writes

**What to build:** Recurring revenue figures reflect reality. Today the event recorder has no call sites, so nothing writes revenue events and the dashboard computes from an empty table. Either the events are written, or the reader is deleted — a dashboard reading a table nothing writes is worse than a missing dashboard.

**Blocked by:** 01 — A provider event is recorded before it is acted on

**Status:** in-progress — one criterion blocked outside this lane's territory

## Acceptance criteria

- [ ] Either every billing state change records a revenue event, or the reader and its table are removed. — **Decision: write** (`docs/specs/c17-revenue-events-decision.md`). Six of the eight enumerated state changes now emit: `new_subscription`, `reactivation`, `upgrade`, `downgrade` (`billing.service.ts:257`, via `classifyPlanChange`), `addon_purchase` and `refund` (`billing-webhook.handler.ts:163-200`). **Blocker:** the two `churn` transitions live in `modules/cron/cron-billing.service.ts:50` (trial expiry → `EXPIRED`) and `:222` (dunning suspension → `CANCELLED`), which belong to another lane. The exact change is written up in `architecture-refactor/lane-requests/s1.md` §1. Until it lands, `churn` is never recorded and `churnRate` reads 0, so "every billing state change" is not yet true.
- [x] If written, recording happens through the outbox so it cannot be forgotten on a new path. — `RevenueAnalyticsService.emit` (`revenue-analytics.service.ts:42`) calls `OutboxWriter.emit` inside the caller's transaction; the same service is the registered consumer for `billing.revenue-event` and does the insert behind an `InboxConsumer` fence. Proven by "emits into the caller's transaction rather than writing the revenue row directly", "registers itself as the consumer for its own event type", "writes the row and the fence in one transaction", "writes nothing when the inbox says the event was already applied", and "a rolled-back activation enqueues nothing, because the emit is inside that transaction".
- [x] Reported figures reconcile with subscription state. — `getMetrics` (`revenue-analytics.service.ts:101`) derives MRR as the sum of plan prices over ACTIVE subscriptions and uses the events only for movement; `reconcile()` returns both levels and whether they agree. "takes MRR from what is subscribed now, not from the event stream", "a replayed history of new_subscription events cannot inflate the level", "excludes cancelled subscriptions from the level", "reconciles the reported level against the subscriptions behind it".
- [x] The decision is recorded in the spec. — `docs/specs/c17-revenue-events-decision.md`, including the write-or-delete reasoning, the emission table, and what is deliberately not implemented.

## Todo

- [x] Decide write-or-delete before building — decided **write**: the reader is a shipped, permission-gated surface (`GET /billing/analytics`) backed by a frontend page this lane does not own, and PRD user story 15 requires the events. Delete would have meant removing a permission key from both catalogs and a page from another repo.
- [x] If writing, enumerate the state changes that must emit — the table in `docs/specs/c17-revenue-events-decision.md`. `classifyPlanChange` (`revenue-events.ts:50`) is the only place the activation branches are decided, with a test per branch including the renewal case that must emit nothing.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — blocked on the `churn` criterion above.

## Notes

The premise that "the event recorder has no call sites" was already stale: `recordEvent` had exactly
one caller, `void this.revenueAnalytics.recordEvent(...).catch(log)` in `verifyAndActivate` — a
fire-and-forget that could not fail visibly and was trivial to forget on a new path. That call and
`recordEvent` itself are gone.

The reader was also wrong in a way nobody would have noticed: MRR was
`sum(mrr) where type = 'new_subscription'` joined to ACTIVE subscriptions, which counted every
re-subscribe again and never subtracted an upgrade, downgrade or churn. Writing the events without
fixing that would have produced a number that drifts further from reality with every billing change.

Under RLS the reader is scoped to the caller's organisation, despite `billing:analytics:view` being
described as "platform admin only". Raised in `lane-requests/s1.md` §5, not resolved here.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
