# 32 — Unit cost per cell is tracked and forecast

**What to build:** Capacity is affordable, not just achievable. Cost is tracked per unit of use, each cell carries a monthly cost and saturation forecast, and an organization whose cost is anomalous triggers a throttling review or a placement change rather than being quietly subsidised by everyone else.

**Blocked by:** [27 — A cell has a measured capacity budget and an admission threshold](27-a-cell-has-a-capacity-budget.md)

**Status:** ready-for-agent — **depends on a running second cell with measured capacity**

**The units, from the PRD:** cost per active organization · per active user · per 1,000 requests · per 1,000 realtime minutes · per GB stored · per million indexed chunks · per million events · per notification delivered · per AI token.

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the AI unit already exists and is the model for the rest — billing is token-metered through `computeTokenCharge(model, in, out)`, the ledger stores integer milli-credits, APIs emit fractional credits, and settlement refunds under-run and debits overage. `AI_FEATURE_COSTS` are reserve ceilings only, never flat per-action charges. The other eight units need the same treatment: a measured number, not a flat assumption.

## Acceptance criteria

- [ ] Each unit above has a measured cost, derived from real cell spend rather than from a list price.
- [ ] Each cell has a monthly cost forecast and a saturation forecast, and the two are reported together — a cell that is cheap because it is empty is not a finding.
- [ ] An organization whose unit cost is anomalous raises a review, and the review's outcomes are throttling or relocation, never a widened unbounded query.
- [ ] Cost per unit is trended, so a regression introduced by a release is visible as a cost change and not only as a latency change.
- [ ] The forecast is approved before capacity is claimed; per the PRD's release decision, unit-cost and per-cell forecasts remaining approved is one of the acceptance conditions for `20M-ready`.
- [ ] Organization and user ids stay out of unbounded metric labels; cost attribution is sampled or aggregated, not labelled per tenant.

## Todo

- [ ] Instrument the units the second cell can actually measure first; a full nine-unit model built on one cell's guesses is worse than three measured ones.
- [ ] Reuse the metering ledger rather than building a second accounting path — two implementations of one number is how the shadow subscription table with zero writers happened.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
