# 04 — The receivables total is computed once

**What to build:** Filtering the receivables screen to outstanding balances computes the aggregation once. Today the count re-runs the entire join, grouping and having clause as a subquery purely to count rows, so the full aggregation executes twice per page view.

**Blocked by:** 03 — A list total costs no extra round trip

**Status:** in-progress

## Acceptance criteria

- [x] The filtered view executes its aggregation once.
  — `backend/src/modules/accounting/core/accounting-receivables.service.ts:84`: `total: sql<string>`count(*) OVER ()`` is already present in the SELECT; the `having(gt(outstandingExpr, "0"))` (line 91) filter runs once, and the window counts only the filtered groups. No separate COUNT query for the normal path.
- [ ] The total is unchanged in value for both the filtered and unfiltered views. — **BLOCKED:** requires a booted app against real data; migrations 0473–0530 are written but unapplied.
- [ ] The screen is covered by a read budget.

## Todo

- [x] Replace the counting subquery with a window over the existing aggregation
  — `accounting-receivables.service.ts:84`: `count(*) OVER ()` is already in place; the fallback at lines 116–127 only runs for empty pages past the end of results (edge case, not the normal path).
- [ ] Compare totals before and after on real-shaped data — **BLOCKED:** requires a booted app against real data
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

**Audit note (2026-08-26):** The ticket described a problem that does not exist in the current code. `listCustomers` in `accounting-receivables.service.ts` already selects `count(*) OVER ()` (line 84) alongside the aggregation, and the `onlyOutstanding` path uses `.having(gt(outstandingExpr, "0"))` (line 91) on the same query — the aggregation runs once. The fallback at lines 116–127 runs a second query only when the page is empty AND `offset > 0` (user navigated past the last page), which is an unavoidable edge case, not a routine double-compute. Both the primary AC and the primary Todo are ALREADY SATISFIED. Two items remain open: the read budget (genuinely open — no accounting route appears in `scripts/read-cost-budgets.mjs`) and the value-equivalence check (BLOCKED on a booted app). Status updated from `ready-for-agent` to `in-progress`.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
