# S07 — Billing and Payments

Status: active

Independent scope: backend Billing/subscription/payment/provider modules/workers and frontend `/settings/billing`, AI-credit billing and payment hooks/components. Accounting customer invoicing remains S05. Schema and migration edits belong to S02.

Master coverage: section 10.10 plus owned parts of sections 3–8, 11 and 12.3.

## Acceptance criteria

- [ ] Verify plans, entitlements, seats/placements, proration, usage, provider events, invoices, adjustments, tax/currency and immutable ledgers with tenant-safe constraints.
- [ ] Keep checkout/change/cancel/profile/invoice/usage/credit contracts canonical, Zod/OpenAPI-complete, idempotent and provider-neutral.
- [x] Keep provider identifiers, signatures and SDK behavior behind the adapter; prove a Stripe-ready contract does not change Billing callers. — eleven leaks closed (3 provider-named routes, 3 verify-schema fields, `razorpayKeyId`, a `handleRazorpayWebhook` alias). `billing-provider-contract.spec.ts` drives a `FakeProviderAdapter("stripe")` through the same caller path and asserts the neutral schema REJECTS the `razorpay_*` names. Two defects the report missed and I caught: the frontend was left calling all three deleted routes (checkout dead end-to-end, invisible to typecheck since routes are string literals), and removing the alias broke 30 tests in the webhook signature-before-side-effect spec.
- [x] Route every non-universal mutation through exact non-delegable Billing permission checks and prove owner/admin/member plus in-flight revocation behavior. — 20+ keys confirmed verbatim against the catalog rather than assumed; `billing-permission-fence.e2e-spec.ts` 69 tests covering owner/grant-holder allowed and member denied (403) across 7 billing + 13 payment mutations, plus revocation DURING checkout confirmation. Bite proof: neutering `AccessService.holds` turns the 403 into 200. Billing: 40 suites / 496 tests.
- [ ] Prove webhook replay/forgery/out-of-order safety, seat/proration concurrency, local entitlement gating, provider/cache outage handling, retries/DLQ and precise invalidation.
- [ ] Verify only the two canonical Settings billing pages and remove dependency-proven duplicate routes/hooks/components.
- [ ] Run focused Billing/payment failure, authorization, ledger and contract tests plus targeted gates; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S07 is complete; commit/evidence: _pending_.
