# 04 — The receivables total is computed once

**What to build:** Filtering the receivables screen to outstanding balances computes the aggregation once. Today the count re-runs the entire join, grouping and having clause as a subquery purely to count rows, so the full aggregation executes twice per page view.

**Blocked by:** 03 — A list total costs no extra round trip

**Status:** in-progress

## Acceptance criteria

- [x] The filtered view executes its aggregation once.
  — `backend/src/modules/accounting/core/accounting-receivables.service.ts:84`: `total: sql<string>`count(*) OVER ()`` is already present in the SELECT; the `having(gt(outstandingExpr, "0"))` (line 91) filter runs once, and the window counts only the filtered groups. No separate COUNT query for the normal path.
- [ ] The total is unchanged in value for both the filtered and unfiltered views. — **BLOCKED:** requires a booted app against real data, and the app cannot boot — `APP_DATABASE_URL` fails `28P01` for `streamline_app` and `DrizzleModule.assertRlsIsEnforced` throws from `onApplicationBootstrap` rather than degrading. Note this criterion compares before against after, and the audit below found there is no "before" — `count(*) OVER ()` was already in place, so nothing changed and there is nothing to compare. It stays unticked rather than being reworded to something answerable.
- [ ] The screen is covered by a read budget. — **PARTIAL, and the ceiling is not real yet.** `backend/src/scripts/read-cost-budgets.mjs:734-739` now carries an `accounting-receivables-list` entry (46 entries, was 45) mirroring what `listCustomers` executes: `clients` LEFT JOIN `invoices` grouped by client, a correlated payments-sum subquery, `count(*) OVER ()`, `$1 = orgId`, `minRows: 10`.

  **The ceiling of 50,000 blocks is a placeholder, labelled as such in the file, and is not a tripwire until it is measured.** No database has been touched in this program. `pnpm -C backend db:check-read-budgets:verify` passes (12/12 plan-walker tests) and all 46 entries pass structural validation, but `db:check-read-budgets:self-test` needs a reachable Neon branch and `streamline_app` credentials and was **not run** — it failed authentication, which is reported here as not run rather than as passing.

  To finish: boot against a seeded branch, `pnpm -C backend db:check-read-budgets --ids=accounting-receivables-list` **as `streamline_app` with the tenant GUC set** (as the owner it proves nothing — `BYPASSRLS` hides the policy cost), then set `ceiling` to roughly 3–5× the measured blocks.

  **Re-attempted 2026-08-27, and the blocker is narrower than "no database".** The Neon branch is alive — `DATABASE_URL` connects as `neondb_owner`. The runner was executed for this one id and answered `RUNNER FAILED: password authentication failed for user 'streamline_app'` (`28P01`); a direct probe of `APP_DATABASE_URL` gives the same code. So the credential has drifted, not the branch. **Fix it in the Neon console — `ALTER ROLE` does not survive a branch suspend.** `db:check-read-budgets:verify` was re-run this session: **12/12 plan-walker tests pass**, and all 46 entries still validate structurally. Recorded in `architecture-refactor/lane-requests/s4.md` §1, where it is the single cause of three separate blocked items.

## Todo

- [x] Replace the counting subquery with a window over the existing aggregation
  — `accounting-receivables.service.ts:84`: `count(*) OVER ()` is already in place; the fallback at lines 116–127 only runs for empty pages past the end of results (edge case, not the normal path).
- [ ] Compare totals before and after on real-shaped data — **BLOCKED:** same credential blocker as above. Same caveat too: there is no "before" to compare against, because the double aggregation the ticket describes was already gone.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by the unmeasured read budget.

---

**Lane 3 note (2026-08-26):** the audit note below is confirmed a second time. `listCustomers` selects `count(*) OVER ()` at `accounting-receivables.service.ts:84` and applies `having(gt(outstandingExpr, "0"))` to the same query, so the aggregation runs once; the separate count at `:116-127` fires only for an empty page past the end of results. **This ticket's premise was already false when it was written** — it is one of the seven disproved in the 2026-08-26 audit, and the only work genuinely left is the read budget, which cannot be finished without a database.

---

**Audit note (2026-08-26):** The ticket described a problem that does not exist in the current code. `listCustomers` in `accounting-receivables.service.ts` already selects `count(*) OVER ()` (line 84) alongside the aggregation, and the `onlyOutstanding` path uses `.having(gt(outstandingExpr, "0"))` (line 91) on the same query — the aggregation runs once. The fallback at lines 116–127 runs a second query only when the page is empty AND `offset > 0` (user navigated past the last page), which is an unavoidable edge case, not a routine double-compute. Both the primary AC and the primary Todo are ALREADY SATISFIED. Two items remain open: the read budget (genuinely open — no accounting route appears in `scripts/read-cost-budgets.mjs`) and the value-equivalence check (BLOCKED on a booted app). Status updated from `ready-for-agent` to `in-progress`.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
