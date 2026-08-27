# c17 — Every billing write is provable

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 7 tickets, 5 retired.

The adapter shipped with c5 and the architecture is right. What is missing is proof that individual writes happened. Every defect here has the same shape: **a mechanism that looks like enforcement and is not** — and each fails permissively, in the direction of letting the request through, which on a billing path means revenue loss rather than an error someone notices.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | A provider event is recorded before it is acted on | — | done |
| 02 | A webhook acknowledges only durable work | 01 | done |
| 03 | A coupon can be used once | — | done |
| 04 | A quota that cannot be computed refuses the write | — | done |
| 05 | Revenue reporting reads what the system writes | 01 | done |
| 06 | Dunning history is queryable | — | done |
| 07 | An issued invoice cannot change | — | done |

## Closed ticket digests

**01 — A provider event is recorded before it is acted on.** `billing-webhook.handler.ts` verifies the signature before any side effect; `provider-event-ledger.ts` stores `provider + providerEventId + eventType + rawPayload` with a unique index (`provider-webhook-events.ts:28`). `ProviderEventClaim` has five states so `ON CONFLICT DO NOTHING` no longer conflates a committed replay with a failed retry — only a stamped `processed_at` row is a no-op. Suite `billing-webhook.spec.ts` (33 tests) covers replay, out-of-order, forged and health-reporting paths. Unique index is global, not tenant-scoped — cross-tenant collision returns 409 via `FOREIGN`; see `OPEN-FINDINGS.md` §3. Migration `0490_provider_webhook_events` journalled but unapplied on `.env` DB — every webhook 500s until applied; see `OPEN-FINDINGS.md` §4.

**02 — A webhook acknowledges only durable work.** Removed fire-and-forget `void this.revenueAnalytics.recordEvent(...).catch(log)` from `verifyAndActivate`; 200 is returned only after the outbox enqueue and `processed_at` stamp commit in one transaction (`billing-webhook.handler.ts:120`). `ExternalEffectLedger.execute` returns `ALREADY_SUCCEEDED` to prevent double-credit on provider retry. `GET /billing/provisioning-failures` (gated `billing:subscription:view`) surfaces unprocessed events via `idx_provider_webhook_events_unprocessed`. The duplicate short-circuit from c17-01 was refined: `processed_at = null` means unacknowledged (retry permitted); `processed_at` set means done (idempotent no-op).

**03 — A coupon can be used once.** `uq_coupon_redemptions_coupon_org UNIQUE (coupon_id, org_id)` has been enforcing since migration `0000` (confirmed against live DB via `pg_constraint`; migration `0473` is a no-op re-assertion). Counter increment and redemption insert run in one `SELECT FOR UPDATE` transaction at `billing.service.ts:214-243`; service maps `23505` to `ConflictException`. Second defect fixed: `createOrder` previously priced coupons with no eligibility rules; `evaluateCoupon` (`coupon-pricing.ts`) is now the single evaluator. `coupon_redemptions.amount` still null — needs `billingCycle` in the schema; see `OPEN-FINDINGS.md` §2.

**04 — A quota that cannot be computed refuses the write.** `plan-limits.service.ts:85-93` (`readCount`) now throws on missing rows, NULL/absent columns and non-numeric values; `assertWithinLimit` converts to `ServiceUnavailableException` naming the resource (`:271`). Previously every falsy result became `Number(... ?? 0)`, so an empty result set — exactly what a struggling DB returns — allowed every write. Fifteen new tests in `plan-limits.service.spec.ts:254-421`; seven failed against the pre-fix source. Prior commit `564be864` had narrowed the catch for thrown queries but the silent-zero path one layer down survived until this ticket.

**05 — Revenue reporting reads what the system writes.** All eight billing state changes now emit revenue events through the outbox: `new_subscription`, `reactivation`, `upgrade`, `downgrade`, `addon_purchase`, `refund`, trial-expiry churn and dunning-suspension churn. `RevenueAnalyticsService.emit` writes through `OutboxWriter` inside the caller's transaction; `getMetrics` derives MRR from ACTIVE subscriptions, not the event stream, to prevent inflation from replays. Decision doc at `docs/specs/c17-revenue-events-decision.md`. MRR reader scoped to caller's org under RLS despite `billing:analytics:view` being described as platform-admin-only; raised in `OPEN-FINDINGS.md` §5.

**06 — Dunning history is queryable.** Migration `0491_migrate_dunning_to_table` (journal idx 277) applied; `dunning_attempts` table backfilled from `subscriptions.metadata.dunningAttempts` JSONB arrays; JSONB writes removed from `billing.service.ts` (`transitionToPastDue`) and `cron-billing.service.ts` (dunning loop now inserts rows with `ON CONFLICT DO NOTHING RETURNING id`). Dead JSONB key cleanup (`metadata - 'dunningAttempts'`) handed to c18-04 — spec and prerequisites written in this ticket; no code reads `metadata.dunningAttempts` at `cron-billing.service.ts:26-31`.

**07 — An issued invoice cannot change.** `0492_invoice_immutability_trigger.sql` installs `BEFORE UPDATE` trigger `trg_invoice_immutability` on `invoices`; raises `check_violation` on any financial-field mutation for non-DRAFT invoices. `plan-limits.service.ts:66` `seatCount(orgId)` unified: accepted members + non-expired pending invitations; both the enforcement gate (`:333`) and the entitlements display (`:212`) share one definition, closing a display/enforcement mismatch. Credit-note work handed to c26-05; proration handed to c26-03.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
