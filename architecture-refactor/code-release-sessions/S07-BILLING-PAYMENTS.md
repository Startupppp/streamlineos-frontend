# S07 — Billing and Payments

Status: active

Independent scope: backend Billing/subscription/payment/provider modules/workers and frontend `/settings/billing`, AI-credit billing and payment hooks/components. Accounting customer invoicing remains S05. Schema and migration edits belong to S02.

Master coverage: section 10.10 plus owned parts of sections 3–8, 11 and 12.3.

## Acceptance criteria

- [ ] Verify plans, entitlements, seats/placements, proration, usage, provider events, invoices, adjustments, tax/currency and immutable ledgers with tenant-safe constraints.
- [ ] Keep checkout/change/cancel/profile/invoice/usage/credit contracts canonical, Zod/OpenAPI-complete, idempotent and provider-neutral.
- [ ] Keep provider identifiers, signatures and SDK behavior behind the adapter; prove a Stripe-ready contract does not change Billing callers.
- [ ] Route every non-universal mutation through exact non-delegable Billing permission checks and prove owner/admin/member plus in-flight revocation behavior.
- [ ] Prove webhook replay/forgery/out-of-order safety, seat/proration concurrency, local entitlement gating, provider/cache outage handling, retries/DLQ and precise invalidation.
- [ ] Verify only the two canonical Settings billing pages and remove dependency-proven duplicate routes/hooks/components.
- [ ] Run focused Billing/payment failure, authorization, ledger and contract tests plus targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S07 is complete; commit/evidence: _pending_.
