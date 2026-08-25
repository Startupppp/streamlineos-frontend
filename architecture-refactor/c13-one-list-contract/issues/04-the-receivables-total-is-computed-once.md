# 04 — The receivables total is computed once

**What to build:** Filtering the receivables screen to outstanding balances computes the aggregation once. Today the count re-runs the entire join, grouping and having clause as a subquery purely to count rows, so the full aggregation executes twice per page view.

**Blocked by:** 03 — A list total costs no extra round trip

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The filtered view executes its aggregation once.
- [ ] The total is unchanged in value for both the filtered and unfiltered views.
- [ ] The screen is covered by a read budget.

## Todo

- [ ] Replace the counting subquery with a window over the existing aggregation
- [ ] Compare totals before and after on real-shaped data
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
