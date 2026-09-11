# 12 — The marketing site

**Status:** done — the page quotes the live price in the visitor's currency and says where the data rests, both verified rendering against the running service.
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

---

## Notes

The site already existed — landing, about, pricing, contact, waitlist, legal —
so the gaps were narrower than the ticket implied and both were about honesty
rather than absence.

**Prices were a hand-maintained copy.** `lib/pricing.ts` mirrored the plan
catalogue and a test kept it honest, which catches drift in CI: the wrong place,
because by then somebody has had to notice. The page now reads
`GET /public/pricing`, which needs no session. The static table stays as the
fallback — a marketing page that renders nothing because an API is slow costs
more than a fortnight-old price.

**Everything was in rupees.** A prospect in Berlin was quoted INR, or a bare
number they discovered at checkout. `?currency=` now resolves through the same
`plan-pricing.ts` the charge path uses, and an unsupported currency is named
rather than silently substituted.

**Residency was never stated.** The first question from any European buyer, and
the site did not answer it. Not answering does not avoid the question; it moves
it to a sales call.

### Two bugs only the running service found

Both would have passed any fixture, because the fixture was written from the
type rather than from a response:

- **`annualMinor` is the whole year, not a month of it.** Read as the per-month
  figure the table quotes, it showed twelve times the price — €182.40 beside
  €19.00, entirely plausible-looking. It is `annualMinor / 12`.
- **Residency options carry `examples`, not a `label`.** The card rendered
  `undefined` as its heading.

There is also a layering fix worth keeping: the first version read
`NEXT_PUBLIC_API_URL` directly. The repo already has `lib/backend-url.ts`, which
prefers `API_INTERNAL_URL` — and in any deployment where the frontend and API
are separate services, the public URL is not reachable from inside the network.
Reading the public one works on a laptop and silently serves stale prices in
production.

### Left alone

The FAQ and savings calculator still quote INR competitor comparisons. Those are
India-market claims rather than our prices, and rewriting market comparisons per
locale is a copy exercise, not this ticket. The landing page was not touched;
`CLAUDE.md` names it immutable.
