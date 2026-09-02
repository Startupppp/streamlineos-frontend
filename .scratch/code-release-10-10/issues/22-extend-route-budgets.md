# 22 — Extend route budgets past the handful currently measured and record percentiles

**What to build:** The route-budget manifest declares budgets for a tiny fraction of the route surface, and its measured fields are largely unpopulated. A gate that says "no budgets exceeded" while nothing is measured proves nothing — it now reports INCONCLUSIVE instead, which is honest but still not coverage. Declare and measure budgets for the critical routes and record real percentiles at the release commit.

**Blocked by:** 21.

**Status:** ready-for-agent

- [ ] Every critical route and worker batch declares a maximum database-call count, downstream-call count, application latency, response-byte and memory budget.
- [ ] p50/p95/p99 are recorded at the release commit for each declared budget, with measured fields populated.
- [ ] Regression tests fail when an implementation adds unexpected database calls.
- [ ] The gate reports PARTIAL honestly when some budgets are unmeasured and only reports OK when every declared budget is measured and within ceiling.
- [ ] Coverage is stated as a fraction of the total route surface, not as a bare pass. Silent truncation of scope reads as full coverage.
- [ ] The read-cost guard's own coverage is stated too — it currently covers a negligible share of routes.
