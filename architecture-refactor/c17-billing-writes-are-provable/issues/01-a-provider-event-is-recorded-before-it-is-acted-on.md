# 01 — A provider event is recorded before it is acted on

**What to build:** Every notification from the payment provider is verified and stored under its own event id before any work happens, so a replayed notification is a no-op by construction rather than by each handler happening to be idempotent.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] The signature is verified before any side effect, including before the ledger write. — `billing-webhook.handler.ts:61` rejects before `ledger.claim` at `:93`; `billing-webhook.spec.ts` "records nothing at all when the signature does not match" asserts zero recorded events, zero payments, zero outbox rows and no org lookup, and "records the event before it persists the payment" pins the order.
- [x] Every provider event is stored with the provider's event id, unique. — `provider-event-ledger.ts:36` stores `provider` + `providerEventId` + `eventType` + `rawPayload`; the unique index is `provider-webhook-events.ts:28`. Asserted by "stores the provider, its event id, the event type and the raw payload". **The index is global, not tenant-scoped** — see `architecture-refactor/OPEN-FINDINGS.md` §3; `claim` returns `FOREIGN` → 409 rather than reporting a cross-tenant collision as success.
- [x] A duplicate event short-circuits and changes nothing. — `provider-event-ledger.ts:60` returns `PROCESSED` only when `processed_at` is set; `billing-webhook.handler.ts:95` answers 200 `{duplicate:true}`. "answers duplicate and touches nothing when the event already finished" asserts no payment, no outbox row, no ledger call.
- [x] A forged event changes nothing and is reported. — `billing-webhook.handler.ts:61` returns 401 with no write, and calls `PaymentWebhookHealthService.recordSignatureFailure` (`payment-webhook-health.service.ts:154`), which flips every endpoint for that provider to `failing` and notifies the org owner once, on the healthy→failing edge. Asserted by "reports the rejected signature through the provider's endpoint health". **Caveat:** with no `payment_webhook_endpoints` row configured there is no health state to flip and the log line is the only record.
- [x] Out-of-order arrival does not corrupt state. — `payment-status-order.ts:23` ranks the lifecycle and `billing-payment-state.ts:55` applies it as the upsert's `setWhere`; the capture/refund timestamps carry the stored value forward instead of being nulled. `payment-status-order.spec.ts` (10 tests) pins the ranking and renders the emitted SQL; the webhook suite asserts the guard reaches the statement.

## Todo

- [x] Insert first, act second — `billing-webhook.handler.ts:93` claims before `persistPayment` at `:111` and before any grant.
- [x] Test replay, out-of-order and forged in one suite — `billing-webhook.spec.ts`, 33 tests, all passing.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Notes

The insert alone was not enough. `ON CONFLICT DO NOTHING` cannot distinguish a replay of an event
whose work committed from a retry of one that failed halfway, and the previous code answered
"duplicate" to both — so a failed credit grant returned 500, the provider retried, and the retry was
waved through while the credits never arrived. `processed_at` is what separates them; only a stamped
row is a no-op. That is why `ProviderEventClaim` has five values rather than two.

**Operator gate:** migration `0490_provider_webhook_events` is journalled but unapplied on the `.env`
database, so `provider_webhook_events` does not exist there and every webhook currently 500s at the
ledger write. `architecture-refactor/OPEN-FINDINGS.md` §4.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
