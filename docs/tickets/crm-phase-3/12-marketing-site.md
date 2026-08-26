# 12 — The marketing site

**Status:** backend done — the site already existed; two gaps closed.
**Track:** D — funnel
**Blocked by:** — (can start immediately)

## Why

Every customer currently costs a sales conversation, which caps growth at the
size of the sales team and makes the product uneconomic below enterprise price
points.

## Acceptance criteria

- [ ] A public site explains the product, its pricing and its data residency without requiring contact.
- [ ] Pricing shows the prospect's likely currency.
- [ ] **Data residency per region is stated**, because it decides whether an evaluation proceeds at all.
- [ ] It is not part of the authenticated application and does not import from it.

## Notes (2026-08-26)

**Most of this ticket was already built.** `app/(public)/` carries a landing
page, about, pricing, contact, waitlist and legal (privacy, security, terms). The
ticket's real gaps were narrower than it reads.

**Gap one: pricing was INR-only and hardcoded.** `GET /public/pricing?currency=`
now serves prices from the same table the charge path reads. A marketing page
with its own copy of the prices eventually quotes a number we do not charge —
which `lib/pricing.ts` already guards against with a consistency test, precisely
because it is a second copy. The response carries `isRequestedCurrency`, so the
page can say when we do not price in the currency asked for: a prospect shown a
number without being told which currency it is in finds out at checkout.

**Gap two: data residency was not stated anywhere.**
`GET /public/data-residency?country=` lists the regions and, when the caller says
where they are, names the likely one — with `isMapped` distinguishing a
determination from a default. Every European evaluation asks this before anything
else, and a review that has to email us to find out is a review that stalls.

**The landing page was not touched.** Root `CLAUDE.md` names it, `/signin` and
`/signup` as immutable reference surfaces.

**Still open:** wiring the pricing page to the endpoint, and a residency section
in the UI. Both are frontend work against a contract that now exists.