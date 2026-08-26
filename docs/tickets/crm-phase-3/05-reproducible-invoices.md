# 05 — An invoice that reproduces byte-identically

**Status:** not started
**Track:** A — payments and pricing
**Blocked by:** 03, 04

## Why

Reproducibility is what makes a tax position defensible and an accountant's
question answerable.

## Acceptance criteria

- [ ] An invoice regenerates **byte-identically** from stored inputs, asserted by test.
- [ ] The invoice format follows local convention for the customer's jurisdiction.
- [ ] Every figure traces to a stored input rather than a recomputation against current configuration.
- [ ] Rounding happens once, with the rule stated on the record.
