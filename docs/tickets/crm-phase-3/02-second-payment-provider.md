# 02 — A second payment provider

**Status:** expand half done — schema unblocked; the provider needs an account.
**Track:** A — payments and pricing
**Blocked by:** 01

## Why

A prospect in Berlin or Chicago cannot give us money at all today. Razorpay
stays and serves India, which is the largest existing market; this adds a second
provider beside it rather than replacing it.

## Acceptance criteria

- [ ] A second provider implements the interface with no change to any billing call site.
- [ ] Provider routing is decided **once at subscription creation** from the tenant's billing country and stored — never re-derived per charge.
- [ ] A tenant whose country neither provider serves is told at signup, not at checkout.
- [ ] Webhooks from both providers are verified, idempotent, and tolerate out-of-order and duplicate delivery.
- [ ] The credits and subscription ledgers balance across reserve, settle, refund and overage with either provider, **including under concurrent spend**.

## Notes (2026-08-26, continued)

**The schema was what blocked a second provider, and it no longer does.**
`subscriptions` carried `razorpay_subscription_id`, `razorpay_customer_id` and
`razorpay_plan_id`; the two payment tables carried `razorpay_payment_id`,
`razorpay_order_id` and `razorpay_signature`. A second provider could not store
anything without either more provider-named columns — the same mistake twice — or
this.

Expand only: every existing column stays, every reader keeps working, and the new
columns are written alongside at both payment sites. `provider` is read from the
interface's `providerKey` rather than written as a literal, so the dual-write
follows whichever provider actually handled the charge once there is more than one.

Backfilled with `razorpay` rather than left null — every existing row is
Razorpay's, and an unanswerable "which provider was this?" is worst for exactly
the rows a dispute is about.

**The idempotency index is recreated on the new columns**, partial while they are
nullable. Without it the second provider gets no protection at all, and that is
the failure that turns one retried webhook into two charges on a statement.

**Still needs you:** a Stripe (or equivalent) account and credentials. The
adapter is a day's work against `PlatformPaymentProvider`; it cannot be written
honestly or tested at all without an account to call.