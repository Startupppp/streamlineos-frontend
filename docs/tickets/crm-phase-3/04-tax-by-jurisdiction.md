# 04 — Tax by jurisdiction, computed server-side

**Status:** done — determination, with every input stored.
**Track:** A — payments and pricing
**Blocked by:** 03

## Why

"Why was I charged this" is a question that arrives long after the charge, and
recomputing against current configuration gives a different answer than the one
that was charged.

## Acceptance criteria

- [ ] Indian GST, European VAT including reverse charge, and United States sales tax where applicable are each computed server-side.
- [ ] **The determination, its inputs and the rate in force are stored on the invoice** — not just the resulting amount.
- [ ] A tax identifier supplied by the customer is validated in format and recorded.
- [ ] A jurisdiction with no configured treatment **fails loudly at subscription creation** rather than silently charging zero.
- [ ] Tax rates are configuration, not code, because they change without us.

## Notes (2026-08-26)

Rates are configuration in a versioned table, not logic. A legislature moves a
rate and every invoice after that date uses the new one, so a wrong rate is a
data correction rather than a deploy. **The file says plainly it is not tax
advice** — it encodes what somebody who knows told us to charge.

Basis points, not fractions. A rate held as `0.18` and multiplied by a price is
how a rounding argument starts.

India splits intra-state across CGST and SGST — not cosmetic, they go to
different authorities — and each head rounds independently against the net, so an
odd amount still has heads that **sum to the tax line** rather than one absorbing
the difference. A buyer with no state is treated as inter-state: charging the
same total to one head beats under-charging two.

An EU business with a well-formed number is reverse-charged; one without is
charged the consumer rate, because without a number we cannot treat them as a
business and assuming otherwise is how the seller ends up owing it. **A malformed
number does not reverse-charge, and is still recorded** — the input is part of
the determination, and dropping it makes the dispute unanswerable.

An unconfigured jurisdiction **throws**. Charging zero by default is a liability
that surfaces at audit, which is the worst possible time to find it.

**Still open:** the determination is not yet called from the charge path. That is
ticket 02's work, when there is a second provider and a tenant currency to
determine against.