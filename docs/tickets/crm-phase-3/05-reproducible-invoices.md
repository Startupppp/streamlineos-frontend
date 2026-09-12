# 05 — An invoice that reproduces byte-identically

**Status:** done — reproducible, and provably so.
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

## Notes (2026-08-26)

Rendering is a pure function of a stored snapshot: no clock, no configuration
read, and **deliberately no `Intl`**. Intl output moves with the ICU version
bundled in the runtime, so an invoice rendered on a new Node release would differ
from the one the customer received — and the difference would be invisible until
somebody compared them.

A stored fingerprint makes "still reproduces" **provable rather than assumed**.
Comparing hashes catches a silent divergence the first time it happens rather
than during a dispute.

`snapshotProblems` checks the arithmetic before the snapshot is stored: lines
against net, heads against tax, net plus tax against gross, each line multiplying
out, and the determination having been made against the same net. A snapshot
whose totals disagree with its lines is **worse than none** — it reproduces
perfectly, and reproduces something wrong.

**Still open:** persisting the snapshot on the invoice row, and the local invoice
*format* per jurisdiction. The reproducibility mechanism is the part that was in
question.