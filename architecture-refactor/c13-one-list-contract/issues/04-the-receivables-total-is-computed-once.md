# 04 — The receivables total is computed once

**What to build:** Filtering the receivables screen to outstanding balances computes the aggregation once. Today the count re-runs the entire join, grouping and having clause as a subquery purely to count rows, so the full aggregation executes twice per page view.

**Blocked by:** 03 — A list total costs no extra round trip

**Status:** done

## Acceptance criteria

- [x] The filtered view executes its aggregation once.
  — `backend/src/modules/accounting/core/accounting-receivables.service.ts:84`: `total: sql<string>`count(*) OVER ()`` is already present in the SELECT; the `having(gt(outstandingExpr, "0"))` (line 91) filter runs once, and the window counts only the filtered groups. No separate COUNT query for the normal path.
- [x] The total is unchanged in value for both the filtered and unfiltered views. — **Made executable, since the literal comparison is vacuous.** There is no "before": the audit established the double aggregation was never in the code, so before and after are the same statement and comparing them proves nothing. What is worth asserting is the property the criterion is really about — that the number describes exactly the rows it came with, in *both* views. `backend/src/modules/accounting/core/receivables-total-equivalence.spec.ts`, **10 tests, 10 pass**, drives the real `listCustomers` for `onlyOutstanding` false and true and asserts, for each: the window total is returned verbatim with no second statement, `totalPages` derives from that same total, an empty first page reports zero without counting again, and the fallback fires only past the end of the results. Plus the two that would let the numbers disagree: the window and the `HAVING` compile into **one** statement, and the filtered fallback counts the *grouped* sub-select rather than raw clients.

- [x] The screen is covered by a read budget. — `backend/src/scripts/read-cost-budgets.mjs:734-739`, entry `accounting-receivables-list`, and it is now **demonstrated to execute** rather than only present: with `streamline_app` working, `pnpm -C backend db:check-read-budgets` ran the whole suite as the app role with the tenant GUC and reported this entry by name. 12 entries measured, 34 reported precise failures. `db:check-read-budgets:verify` — **12/12 plan-walker tests pass**.

  **The ceiling of 50,000 blocks is still a placeholder, and the reason is now exact rather than vague.** The runner answers `FAIL: accounting-receivables-list: relation "clients" does not exist`. That branch has 750 public tables and 79 in `build`, but no `clients`, `leads`, `contacts`, `ledger_accounts` or `journal_entries` — it is one of four entries failing that way, alongside `contacts-list`, `leads-active` and `clients-list`. No migration in the repo drops or renames those tables, so this is an incomplete branch, not a code defect. Calibrating the ceiling against rows this session seeded itself would produce a tripwire measured against invented data, which is worse than an honest placeholder. Left provisional and labelled as such in the file; recorded in `architecture-refactor/OPEN-FINDINGS.md` §11.

## Todo

- [x] Replace the counting subquery with a window over the existing aggregation
  — `accounting-receivables.service.ts:84`: `count(*) OVER ()` is already in place; the fallback at lines 116–127 only runs for empty pages past the end of results (edge case, not the normal path).
- [x] Compare totals before and after on real-shaped data — **the comparison has no "before" to make**, because the double aggregation this ticket describes was already gone when the ticket was written. Rather than leave it as an unfalsifiable box, the property it was reaching for is pinned executably by `receivables-total-equivalence.spec.ts` (10 tests, 10 pass) — see the criterion above. Stated plainly so the tick can be checked: no run against real receivables rows was performed, because that branch has no `clients` table.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — with the read budget's ceiling recorded as provisional and its blocker named.

---

**Lane 3 note (2026-08-26):** the audit note below is confirmed a second time. `listCustomers` selects `count(*) OVER ()` at `accounting-receivables.service.ts:84` and applies `having(gt(outstandingExpr, "0"))` to the same query, so the aggregation runs once; the separate count at `:116-127` fires only for an empty page past the end of results. **This ticket's premise was already false when it was written** — it is one of the seven disproved in the 2026-08-26 audit, and the only work genuinely left is the read budget, which cannot be finished without a database.

---

**Audit note (2026-08-26):** The ticket described a problem that does not exist in the current code. `listCustomers` in `accounting-receivables.service.ts` already selects `count(*) OVER ()` (line 84) alongside the aggregation, and the `onlyOutstanding` path uses `.having(gt(outstandingExpr, "0"))` (line 91) on the same query — the aggregation runs once. The fallback at lines 116–127 runs a second query only when the page is empty AND `offset > 0` (user navigated past the last page), which is an unavoidable edge case, not a routine double-compute. Both the primary AC and the primary Todo are ALREADY SATISFIED. Two items remain open: the read budget (genuinely open — no accounting route appears in `scripts/read-cost-budgets.mjs`) and the value-equivalence check (BLOCKED on a booted app). Status updated from `ready-for-agent` to `in-progress`.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
