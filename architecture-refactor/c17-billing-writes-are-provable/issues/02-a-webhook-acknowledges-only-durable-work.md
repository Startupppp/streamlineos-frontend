# 02 — A webhook acknowledges only durable work

**What to build:** A customer who pays gets what they paid for. Today the credit grant is fired without being awaited, with a log-only error handler, and the endpoint returns success — so if the grant fails the provider is told everything worked, the payment is recorded, and the credits never arrive. Nothing knows to retry.

**Blocked by:** 01 — A provider event is recorded before it is acted on

**Status:** done

## Acceptance criteria

- [x] The endpoint returns success only after the work has committed, or after it is durably enqueued on the outbox. — `billing-webhook.handler.ts:120` is the only path to 200: it enqueues the revenue events and stamps `processed_at` in one transaction, after every effect. "acknowledges the event after the grant, never before" asserts the acknowledgement is the last write; "returns a failure when acknowledging the event does not commit" asserts 500 when that transaction fails.
- [x] Forcing the credit grant to fail makes the endpoint return a failure so the provider retries — this is the direct regression test for the live defect. — `billing-webhook.spec.ts` "returns 500 so the provider retries"; the checkout path is covered by `billing.service.spec.ts` "fails the request when the plan credit grant fails, rather than returning success" (503, not success).
- [x] No partial state persists after a failed attempt. — the event is left unacknowledged (`processed_at` null) and no revenue event is enqueued: "leaves the event unacknowledged when the grant fails" and "enqueues no revenue event when the grant fails". What *does* persist is deliberate and idempotent — the `provider_webhook_events` row (that is c17-01) and the `platform_payments` row (the provider's factual report, upserted forward-only). Neither makes a retry wrong.
- [x] A retry after failure does not double-credit. — `ExternalEffectLedger.execute` returns `ALREADY_SUCCEEDED` once the effect is durable; "a retry does not double-credit once the effect has already succeeded" asserts the grant is not re-invoked and the event is still acknowledged.
- [x] Failed provisioning is visible in a queue rather than lost. — `GET /billing/provisioning-failures` (`billing.controller.ts:118`, gated on `billing:subscription:view`) → `ProviderEventLedger.listUnprocessed` (`provider-event-ledger.ts:83`), served by the existing `idx_provider_webhook_events_unprocessed` partial index. The raw payload is withheld because it carries payer detail. Two tests.
- [x] A customer whose payment succeeded but provisioning did not is informed. — `billing-webhook.handler.ts:210` notifies the organisation owner through `PaymentAnalyticsService.notifyOwner`, keyed through the effect ledger so a provider retrying every few minutes produces one message. "tells the organisation when the credit grant fails", "says nothing when provisioning succeeded", and "does not let a failed notification mask the failure that caused it".

## Todo

- [x] Remove the fire-and-forget with a logging catch — `void this.revenueAnalytics.recordEvent(...).catch(log)` is deleted from `verifyAndActivate`; `recordEvent` no longer exists. No `void this.*` remains in this lane's files.
- [x] Route through the outbox, which already has consumers and a dead state — `RevenueAnalyticsService.emit` writes through `OutboxWriter` inside the caller's transaction; the same service is the registered consumer.
- [x] Assert the failure response explicitly — every failure branch has a test asserting the exact status (500, 503, 409, 401, 400).
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Notes

The live defect was not only the fire-and-forget. Once the event ledger from c17-01 was in place, the
duplicate short-circuit **defeated the retry it exists to enable**: grant fails → 500 → provider
retries → the ledger says "already seen" → 200 → the provider stops retrying and the credits never
arrive. The pair of tests seeding `processedAt: null` versus `processedAt: <date>` and getting
opposite outcomes is what pins that distinction.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
