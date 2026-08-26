# 02 — A second payment provider

**Status:** code complete, needs an account — the adapter, the signature scheme, currency routing and the registry are built and tested from fixtures; only Stripe credentials are missing.
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

---

## Notes

### Razorpay stays

It settles INR domestically and India is the largest existing market. This adds
a provider beside it, behind ticket 01's interface, and `PlatformPaymentRegistry`
is the only place that knows which is which — no call site branches on provider.

### Routed by currency, not country

Country is what a customer tells us; currency is what we actually charge, and
the two disagree constantly — a British company with an Indian subsidiary billed
in INR should be charged where INR settles. Currency is also recorded on the
charge row, so the rule is checkable after the fact. A country rule would not be.

The fallback is deliberate and deliberately loud: a deployment with only one
provider configured still takes the sale, but `isPreferred: false` says so,
because charging a euro customer through the wrong provider **silently** is how
the currency problem happened the first time.

### HTTP, not the SDK

The phase's rule is that providers are exercised from fixtures; a mocked SDK
tests that the mock agrees with itself. The surface used is four fields of one
endpoint plus a signature scheme — considerably less than a dependency shipping
its own version of every type in the platform.

That makes the signature ours to implement, and Stripe's has three traps
Razorpay's does not:

- **The timestamp is inside the signature.** Signing the body alone leaves a
  captured delivery valid forever — a standing key for anyone who ever saw one
  request. Five-minute tolerance, and **future-dated deliveries are refused
  too**: with a skewed clock that is the same replay window reopened from the
  other side, and it is the case nobody writes a test for.
- **There can be several `v1` values.** Stripe signs with both secrets during a
  rotation. Checking only the first drops every delivery in exactly the window
  you need them.
- **`v0` is the test-mode scheme.** Accepting it lets a test-mode key sign an
  event that credits a live subscription.

### `verifyPaymentSignature` returns false, and that is the answer

Razorpay hands the browser an `order|payment` HMAC the server checks on return.
Stripe has no client-side equivalent — its confirmation is the webhook. Returning
true would accept an unverified browser return as proof of payment. Stripe
payments must be confirmed from the webhook, which is the safer flow anyway: a
browser that never comes back still credits the subscription.

### What is left

An account, and `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` /
`STRIPE_WEBHOOK_SECRET`. All three are optional in env validation, so a
deployment selling only in India boots without them and `selectProvider` simply
never picks Stripe.
