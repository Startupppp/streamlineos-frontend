# 38: Close Billing and Payments release invariants

**What to build:** Billing decisions are locally enforceable, replay-safe and financially reproducible across seats, proration, usage, invoices, tax and currency.

**Blocked by:** 10 — Migrate Billing, Accounting, Finance and Support actors.

**Status:** implemented

- [x] Active billable seats and effective-dated proration produce immutable ledger evidence.
- [x] Usage ingestion and provider webhooks are idempotent, signature-verified and replayable.
- [x] Invoice/credit-note snapshots, currency minor units and tax behavior are immutable and explicit.
- [x] Entitlements are locally cached with event invalidation and no provider request-path call.
- [x] Provider replay, concurrency, proration, tax/currency and entitlement-cache tests pass.

Evidence: billing ledger, webhook, snapshot, proration, usage and entitlement focused tests pass.
