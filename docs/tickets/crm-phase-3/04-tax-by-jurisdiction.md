# 04 — Tax by jurisdiction, computed server-side

**Status:** not started
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
