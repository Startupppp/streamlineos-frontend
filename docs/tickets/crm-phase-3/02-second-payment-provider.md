# 02 — A second payment provider

**Status:** not started
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
