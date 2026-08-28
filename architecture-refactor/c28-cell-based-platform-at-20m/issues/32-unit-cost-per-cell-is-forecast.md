# 32 — Unit cost per cell is tracked and forecast

**What to build:** Capacity is affordable, not just achievable. Cost is tracked per unit of use, each cell carries a monthly cost and saturation forecast, and an organization whose cost is anomalous triggers a throttling review or a placement change rather than being quietly subsidised by everyone else.

**Blocked by:** [27 — A cell has a measured capacity budget and an admission threshold](27-a-cell-has-a-capacity-budget.md)

**Status:** partially done — one unit has a real cost, six have measured quantities and no price, two are unmeasured; **no invoice exists, so no cost model can be approved**

**The units, from the PRD:** cost per active organization · per active user · per 1,000 requests · per 1,000 realtime minutes · per GB stored · per million indexed chunks · per million events · per notification delivered · per AI token.

**Decision taken at the start of this session:** instrument only what this cell can measure and say which are estimates, rather than filling nine units from vendor list prices. The ticket's own first criterion says "derived from real cell spend rather than from a list price", so a list-price fill would close the box dishonestly.

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the AI unit already exists and is the model for the rest — billing is token-metered through `computeTokenCharge(model, in, out)`, the ledger stores integer milli-credits, APIs emit fractional credits, and settlement refunds under-run and debits overage. `AI_FEATURE_COSTS` are reserve ceilings only, never flat per-action charges. The other eight units need the same treatment: a measured number, not a flat assumption.

**Verification:** `node src/scripts/__tests__/cell-unit-cost.test.mjs` — 14 tests, all pass. `node src/scripts/run-cell-unit-cost.mjs --self-test` → `SELF-TEST PASS: anomaly detector fired on 500-cost outlier — guard can fail`.

## Acceptance criteria

- [ ] Each unit above has a measured cost, derived from real cell spend rather than from a list price.

  **Open, and it cannot close from inside this repository.** `node src/scripts/run-cell-unit-cost.mjs`:

  ```
  per active organization              7
  per active user                      100,085
  per 1,000 requests                   UNMEASURED — requires: HTTP request count for this cell, from
                                       application request logs or an APM tool; not in the database.
  per 1,000 realtime minutes           UNMEASURED — requires: channel-minutes from the Ably dashboard
                                       or billing API for this cell's Ably app; not in the database.
  per GB stored                        1.307
  per million indexed chunks           0
  per million outbox events            31
  per notification delivered           865
  per AI token                         1,645 tokens · 0.078 credits · $0.0005
  ```

  Exactly one unit has a real cost: **per AI token**, derived from `ai_usage_logs.credits_milli` through `computeTokenCharge` settlement — real ledger spend, not a list price. Six units have a **measured quantity and no price**: the denominator comes from the database, the numerator needs the cell's monthly invoice. Two are unmeasured in both halves.

  **What would close it:** the cell's monthly Neon invoice (compute-hours and GB-months), the R2 and Resend invoices, an APM or log-derived request count, and the Ably channel-minutes figure. Each is named per unit in `cell-unit-costs.mjs` as the exact input required. Reusing the existing milli-credit ledger rather than building a second accounting path is why the AI unit needed no new plumbing.

  **The seam to fetch each one is now built, so this is an operator step rather than an engineering one.** `src/scripts/cell-cost/vendor-costs.mjs` holds a fetcher per vendor, each refusing loudly when its credential is absent and never substituting a list price:

  | Vendor | Required environment | What it fetches |
  |---|---|---|
  | Neon | `NEON_API_KEY` + `NEON_PROJECT_ID` | compute-seconds, storage byte-hours, data transfer — real consumption |
  | Ably | `ABLY_API_KEY` (**already present**) | `channelMean × intervalMinutes` = channel-minutes |
  | Cloudflare R2 | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (**absent**) | storage bytes, object count, class A/B operations |
  | Resend | `RESEND_API_KEY` (**already present**) | key presence only — Resend's public API exposes no cost or delivery-total endpoint |

  `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` are S3-compatibility keys and cannot query Cloudflare's billing API; a separate API token is required. Neon returns consumption, not dollars, so the dollar derivation needs rate variables (`NEON_COMPUTE_RATE_USD_PER_HOUR` and siblings) set **from the invoice** — they are deliberately left unset rather than filled with list prices, which is what the criterion forbids. `per 1,000 requests` reads `backend/.load-driver-results.json` when it exists and continues to report `UNMEASURED` when it does not; that file is written by ticket 30's load driver, which was not built (see that ticket).

- [ ] Each cell has a monthly cost forecast and a saturation forecast, and the two are reported together — a cell that is cheap because it is empty is not a finding.

  **Open on the numbers, met on the shape.** They are reported together, and the runner says plainly why the number is small:

  ```
  Monthly cost forecast:
    Projected monthly AI credits: 0.08 credits (7 active orgs)
    AI cost note: dollar value requires credit-to-USD rate from the billing config.
    Non-AI cost units are UNMEASURED — provide the cell's monthly Neon invoice for a full forecast.
  ```

  The occupancy is printed beside the cost precisely so a cheap-because-empty cell reads as empty rather than as cheap. The saturation half is ticket 27's, and it currently refuses for the same reason: fewer than three well-spaced samples.

  **What would close it:** three capacity measurements at a daily cadence plus the invoices above.

- [x] An organization whose unit cost is anomalous raises a review, and the review's outcomes are throttling or relocation, never a widened unbounded query.

  The constraint is structural rather than conventional: the review action union has exactly two variants, `THROTTLING_REVIEW` and `RELOCATION`, and there is no third, so a widened query budget is unrepresentable. Outcomes are recorded in `noisy_neighbour_reviews`.

  The detector is proved to fire, and proved to refuse rather than invent:

  ```
  $ node src/scripts/run-cell-unit-cost.mjs --self-test
  SELF-TEST PASS: anomaly detector fired on 500-cost outlier — guard can fail

  $ node src/scripts/run-cell-unit-cost.mjs
  AI cost anomaly check (last 30 days, sample of up to 50 orgs):
    REFUSED — only 2 org(s) with AI usage in the last 30 days; need at least 3 for anomaly detection
  ```

  Ticked on the mechanism, which is what the criterion asks for. Recorded plainly: **against live data it has never fired**, because two organizations have used AI in thirty days.

- [ ] Cost per unit is trended, so a regression introduced by a release is visible as a cost change and not only as a latency change.

  **Open.** The trend exists and now has enough samples to emit a figure, but the figure is meaningless at this volume:

  ```
  Cost-per-unit trends (from history):
    AI cost/token: 0.0474 milli-credits/token avg, +0.000000/day over 3 samples
  ```

  Three samples taken minutes apart on 1,645 lifetime tokens is not a trend against which a release regression could be seen. Only the AI unit is trended at all, because it is the only one with a cost.

  **What would close it:** `node src/scripts/run-cell-unit-cost.mjs` on a daily schedule across a release boundary, with real traffic, and the other eight units priced.

- [ ] The forecast is approved before capacity is claimed; per the PRD's release decision, unit-cost and per-cell forecasts remaining approved is one of the acceptance conditions for `20M-ready`.

  **Open.** There is no forecast to approve. Eight of nine units have no cost and the ninth is $0.0005 of lifetime AI spend. Nothing here supports a `20M-ready` claim and nothing here should be read as approving one.

- [x] Organization and user ids stay out of unbounded metric labels; cost attribution is sampled or aggregated, not labelled per tenant.

  Structural rather than conventional. Anomaly detection samples at most 50 organizations per run and reports an aggregate; the history file `backend/.cell-cost-history.json` holds per-cell aggregates only and carries no per-tenant time series, so a tenant cannot accumulate an unbounded label set. Per-tenant facts that must persist — a noisy-neighbour review — are **rows in a table**, not metric labels, which is the distinction the PRD draws. Pinned by the unit tests, including that an `UNMEASURED` unit can never contribute a number to a total.

## Todo

- [x] Instrument the units the second cell can actually measure first; a full nine-unit model built on one cell's guesses is worse than three measured ones.
- [x] Reuse the metering ledger rather than building a second accounting path; two implementations of one number is how the shadow subscription table with zero writers happened.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
