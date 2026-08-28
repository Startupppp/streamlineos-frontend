# 38: Close Billing and Payments release invariants

**What to build:** Billing decisions are locally enforceable, replay-safe and financially reproducible across seats, proration, usage, invoices, tax and currency.

**Blocked by:** 10 — Migrate Billing, Accounting, Finance and Support actors.

**Status:** ready-for-agent

- [ ] Active billable seats and effective-dated proration produce immutable ledger evidence.
- [ ] Usage ingestion and provider webhooks are idempotent, signature-verified and replayable.
- [ ] Invoice/credit-note snapshots, currency minor units and tax behavior are immutable and explicit.
- [ ] Entitlements are locally cached with event invalidation and no provider request-path call.
- [ ] Provider replay, concurrency, proration, tax/currency and entitlement-cache tests pass.
