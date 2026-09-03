# 22 — Extend route budgets past the handful currently measured and record percentiles

**What to build:** The route-budget manifest declares budgets for a tiny fraction of the route surface, and its measured fields are largely unpopulated. A gate that says "no budgets exceeded" while nothing is measured proves nothing — it now reports INCONCLUSIVE instead, which is honest but still not coverage. Declare and measure budgets for the critical routes and record real percentiles at the release commit.

**Blocked by:** 21.

**Status:** **4 of 6 closed**, unchanged — but the gate now fails on the right route for the right reason. `contracts/route-budgets.json` pointed `GET /calendar/events` at `dashboard-personal-calendar-events`, whose SQL is `DashboardPersonalService`; the calendar route runs `CalendarEventSourceLoader` and **had never been measured**. Re-linked, measured for the first time at **7,072 blocks against a 2,000 ceiling** — the stale 1,139 it carried fitted under that ceiling, so the gate had been reporting PARTIAL over an unmeasured route. `check:route-budgets` is exit 1 on that one real breach; **zero declared ceilings changed** (`git diff` touches no `max*` key). A **fourth vacuous budget** was caught: `dashboard-team-attendance` anchored its fixture to wall-clock `today` against a static seed, so it goes vacuous one day after any rebuild while the manifest keeps the last non-vacuous number — now anchored to the seed's own latest attendance day and measured on all four tenants. 108/570 declared ceilings measured (18.9%), coverage 82/3613 (2.3%). Reports: `reports/22-route-budgets.md`, `reports/22c-budget-drift-and-remeasure.md`, `reports/22d-calendar-lateral-and-budget-relink.md`.

- [ ] Every critical route and worker batch declares a maximum database-call count, downstream-call count, application latency, response-byte and memory budget.
  - 82 budgets (70 routes + 12 worker batches, up from 19), each declaring all five ceilings plus `maxReadPathP95Ms`, and `maxBatchSize`/`maxDurationMs` on worker batches. Every key validated against `openapi.json`.
  - PARTIAL: **63 of 82 `maxDbCalls` values are the manifest default (10), not a counted call path** — 5 are counted query-by-query, 14 are reasoned estimates. Each entry declares which in `dbCallBasis` and the gate prints the split, so a placeholder is labelled rather than indistinguishable from a measurement. Closing this is one call-path read per route and belongs with each module's owner.
    PARTIAL (S12): **7 of the 63 defaults were in reach and are now counted** — every dashboard route in this territory, read statement-by-statement out of its service, and **every one tightened**, 10 down to 1-4: announcements 1, leaves-today 2, team-attendance 2, my-issues 2, active-sprint 3, recent-projects 3 (worst branch), stats 4. Access and module resolution are not counted, matching the convention `GET /dashboard/personal` set. Basis split is now **12 counted / 14 estimated / 56 default**. Every note says the count is read from the call path, not from a live statement count.
    PARTIAL: the remaining 56 defaults are in other modules' territories, plus 4 KB routes in this one (`GET /kb/spaces`, `/kb/spaces/{spaceId}`, `/kb/pages/recent`, `/kb/pages/search`) whose call paths were not read this pass. The instrument is general and live coverage is 2 of 82 routes; extending it is one `countDbCalls` call per service. Not a mechanism gap — it needs each module's owner, and this pass owned calendar/mail/kb/settings/rbac/module-access/dashboard only.
  - PARTIAL: the critical set is asserted in `surface.criticalSelection`, not derived — there is no request-volume telemetry in the repo to rank 3,613 operations by traffic.
- [ ] p50/p95/p99 are recorded at the release commit for each declared budget, with measured fields populated.
  - **S13 (2026-09-03) — the four HTTP-level fields are POPULATED, 0/82 → 70/82 each.** `test/perf/merge-http-route-budgets.mjs` folds this release's own HTTP capture (recorded in `contracts/benchmark-manifest.json` under `requestLevel`: `scratch_t23_http`, 666/666 at head, `streamline_app` with `rolbypassrls=false`, Redis off, both control probes held on both tenants) into the contract. `measuredLatencyP95Ms`, `measuredDownstreamCalls`, `measuredResponseBytes` and `measuredMemoryMb` are now real numbers on the 70 budgets the capture reached; the other 12 keep `null` plus an `httpMeasurement` block naming the reason (4 routes answered 500, 2 answered 402 on both tenants, 6 are provider-backed mail routes with no connected account). **Zero `max*` keys changed** — `git diff` touches no ceiling line. `check:route-budgets` coverage **110/570 (19.3%) → 390/570 (68.4%)**, and it now fails on 3 measured breaches instead of 1. Self-test 27/27.
  - The merger refuses a capture whose control probe did not hold, whose role had BYPASSRLS, that was off journal head, or that recorded heap without `--expose-gc`; it refuses **per route** when the declared ceiling moved after the capture (the capture records `declared*` beside every measurement for exactly this); and a route that stopped being measurable has its stale number **cleared**, never carried forward.
  - PARTIAL: `measuredDbCalls` is still 2/82 and is deliberately NOT filled from this capture. The capture's `requestDbCalls` is a strict superset of the handler statement count `maxDbCalls` describes — 12 vs 3 on `GET /notifications` — so writing it would either fail a correct route or, once someone raised the ceiling to go green, widen every service-level ratchet in the file. It is recorded as `requestDbCalls` under `httpMeasurement` instead. Closing that field needs `countDbCalls` per service, which is each module owner's.
  - PARTIAL: `measuredBatchSize` / `measuredDurationMs` remain 0/12 on the worker batches — the HTTP harness times the sweep endpoint but records neither the batch it drained nor its own duration as a batch figure. Needs a worker-level instrument, not this one.
  - **REFRESHED (S13, same session).** The whole 164-slot capture was re-taken at head (667/667, migration 1043 applied to the copy, VACUUM ANALYZEd) with the chat payload fix in: `GET /chat/channels` now records **6,876** measured response bytes against its unchanged 131,072 ceiling, and that breach is gone from `check:route-budgets`. Field coverage settled at **69/82** — one write route stopped being measurable between captures — and the gate is exit 1 on two breaches: `GET /calendar/events` buffer blocks (pre-existing) and `GET /cron/storage-sweep` downstream calls (declared 0, measured 8, deliberately not raised — see ticket 23 box 7). Total measured ceilings **386/570 (67.7%)**, up from 110/570. Zero `max*` keys changed across both commits, verified by `git diff | grep '"max'` returning 0.
  - Read-path p50/p95/p99 over 200 `EXPLAIN (ANALYZE, BUFFERS)` samples recorded for **54 of 82** budgets as `streamline_app` under RLS, with commit/database/role/tenant/profile/sample-count provenance per entry, plus a minority-tenant figure alongside. Database-call counts recorded for 2. Overall **110 of 570 declared ceilings (19.3%)**.
  - **Re-measured and regenerated 2026-09-02** on `scratch_t22c` (a copy of the corrected perf seed brought to head, VACUUM ANALYZEd) with `measure-route-budgets.mjs --write`; **0 records refused** as vacuous / below-floor / unmeasurable, down from 32, and **zero declared ceilings changed** (`git diff` touches no `max*` key). The stale `measuredDbCalls: 5` on `GET /notifications` is now the counted **3**, and `unread-count`'s 4 is **2**.
  - PARTIAL (S12): **the HTTP harness has landed and is committed** — `test/perf/route-budget-http-harness.ts`, `route-budget-http-plan.ts`, `route-budget-http.seeded-e2e-spec.ts`, all tracked in git. `test/perf/**` is another agent's territory and **no run of it is claimed here**, so the four HTTP-level fields are still null for all 82. Consuming its artifact is a `--http=<artifact>` merge in `measure-route-budgets.mjs`, symmetrical with the existing `--db-calls=` merge.
  - PARTIAL: `measuredLatencyP95Ms`, `measuredDownstreamCalls`, `measuredResponseBytes` and `measuredMemoryMb` are null for all 82 — they need an HTTP-level harness. `test/helpers/seeded-e2e-app.ts` is the right vehicle but needs `AUTH_SIGNING_KEYS` (absent from `.env` here) and a seeded permission-holding user. `measure-route-budgets.mjs` deliberately refuses to fill `measuredLatencyP95Ms` from the read-path artifact — a 5.7 ms database read inside a 300 ms end-to-end ceiling would be a false pass.
  - PARTIAL: 32 budgets have no read-cost budget behind them (8 writes, 8 provider-backed mail routes, 12 worker batches, 4 unlinked reads), so the read-path instrument has nothing to measure for them.
- [x] Regression tests fail when an implementation adds unexpected database calls.
  - `src/scripts/route-budget-db-calls.ts` counts statements through `QueryTelemetryTracker` (wraps `client.unsafe`, the single entry point Drizzle's postgres-js driver uses), classifying `set_config` separately so tenant setup never inflates a route's count. `assertNoDbCallRegression` ratchets at the last recorded measurement, not the ceiling; `assertWithinDbCallBudget` stays the gate's strict question. Neither raises a ceiling.
  - Proved: `jest --testPathPattern=route-budget-db-calls` → **12 passed** (unit, no DB); `jest --config jest-e2e.json --testPathPattern=route-db-call-budget` → **5 passed** (live, real services over `scratch_perf_seed` as the app role with RLS live). It bit on first run: **`GET /notifications` issues 5 statements against a declared `maxDbCalls: 3`** — recorded, gate fails on it, not fixed here (notifications territory). `GET /notifications/unread-count` measured 4 against a ceiling of 5, matching its counted-call-path note exactly.
  - Live coverage is **2 of 82 routes**; the mechanism is general and extending it is one `countDbCalls` call per service.
- [x] The gate reports PARTIAL honestly when some budgets are unmeasured and only reports OK when every declared budget is measured and within ceiling.
  - `verdict()` in `check-route-budgets.mjs` has no path from an unmeasured field to OK, and coverage is counted **per field** rather than per entry (the old gate lumped everything into "pending measurement", so 50 measured buffer figures and zero call counts read as one state). Pinned by `ok-verdict` / `partial-verdict` / `inconclusive-verdict` / `fail-verdict` in `--self-test` (exit 0, 21 checks).
  - The read-cost runner gained the same three-way verdict (`STATUS: OK | PARTIAL | FAIL`); `--strict` / `STREAMLINE_STRICT_BUDGETS=1` makes a non-OK verdict exit 2.
  - Live: `node src/scripts/check-route-budgets.mjs` → exit 1, FAIL on 2 measured breaches. Before the measurements landed it reported PARTIAL, exit 0.
- [x] Coverage is stated as a fraction of the total route surface, not as a bare pass. Silent truncation of scope reads as full coverage.
  - Every run prints `82/3613 operations carry a budget (2.3%)`, denominator recomputed from `openapi.json` rather than read from the manifest; the manifest's recorded total is printed as a drift note when the two disagree. The PARTIAL message repeats the fraction so the last line cannot be mistaken for API coverage.
  - The read-cost runner prints its own: `Coverage: 64/70 declared read-cost budgets produced a non-empty measurement (91.4%)` with the unmeasured remainder broken out into vacuous / below-seed-floor / no-fixture / excluded.
- [x] The read-cost guard's own coverage is stated too — it currently covers a negligible share of routes.
  - `check-route-budgets.mjs` imports the read-cost catalog and prints `70 read-cost budgets declared (0 excluded), covering 70/3613 operations at most (1.9%); 54/82 route budgets are backed by one (65.9%)`.
  - The import also bought two structural checks: a `readCostBudgetId` resolving to nothing is a violation (a budget that looks measured and is not), and a `maxBufferBlocks` disagreeing with the linked read-cost ceiling is a violation. Undeclared, it resolves from the link — one number, one home.
  - **10 stale `excluded:` lines removed** ("CRM/Inventory module not seeded on scratch_e2e" is no longer true): the catalog now has zero exclusions and the runner reports `0 EXCL`.

## Resumption pass — budget drift swept, manifest regenerated (2026-09-02)

- **Eight read-cost budgets were measuring a query the application does not run.** Six filtered
  `user_id` on tables where a migration moved the recipient authority to a membership column
  (`notifications-list`, `notifications-unread-count`, `dashboard-personal-notifications-count`
  under 0520; `kb-page-visits-mine`, `my-leave-requests`, `my-attendance-history`); each was
  checked against its service before being moved. `timesheets-mine` resolved the membership with a
  scalar subquery the service does not issue and named `idx_timesheets_org_user_date`, which does
  not exist at head. `mail-inbox-cached` named `idx_mail_metadata_list`, which migration 1022
  DROPPED, and ordered by `date DESC` where `listCached` orders by `(date DESC, id DESC)`.
  Measured before → after, buffers, majority tenant: `notifications-list` 3,173 → 121 (59,561 → 98
  rows scanned), `notifications-unread-count` 10,566 → 16, `dashboard-personal-notifications-count`
  11,377 → 16 (it was a Seq Scan), `timesheets-mine` 10 → 7. Reproduced on the 9.00% and 0.90%
  tenants.
- **Three budgets that are correct were confirmed, not assumed:** `leave-ledger-mine`,
  `dashboard-leaves-today` and `dashboard-team-attendance` all still filter `user_id` because their
  services still do (`hrLeaveLedger.userId`, `leaveRequests.userId`, `attendance.userId`), and
  `dashboard-personal-calendar-events` matches its service EXISTS-for-EXISTS.
- **`dashboard-personal-my-tasks` kept its ceiling and is now green on the fix, not on a raised
  number.** It measured 1,801 rows against 1,000 for as long as the index was missing; `ef3c1960`
  landed `(org_id, assignee_membership_id, updated_at DESC) WHERE deleted_at IS NULL` mid-run and it
  now measures **4 buffers / 19 rows scanned**. `dashboard-my-issues` 1,844 → 13.
- **`dashboard-my-issues` now declares `maxScanRows`, and `dashboard-personal-my-tasks`' was
  tightened 1,000 → 200.** `my-issues` declared none at all, so it walked the identical 1,801 rows
  and reported PASS — 1,844 buffers sits inside its 2,000 block ceiling, and a budget with no
  scan-rows guard cannot see a plan regression that stays under its block ceiling. `my-tasks`' 1,000
  had stopped guarding at 45× the post-1027 scan. **Bite-proved**, not argued: with
  `idx_tickets_org_assignee_updated_live` dropped, **both fail at 1,801 > 200**; restored, both pass
  at 10–22 rows on all three measurable tenants. Tightened, never raised.
- **A "vacuous" reading on `dashboard-personal-my-tasks` means a stale database, not a stale
  predicate — verified, because it was routed to me as the opposite.** `seed-perf-scratch.mjs`
  writes `TODO/IN_PROGRESS/IN_REVIEW/DONE` at head and carries `LEGACY_STATUS_NAMES` to rename an
  existing database's rows in place (`3d157c15`, the ON UPDATE CASCADE FK carries the tickets).
  Measured: `scratch_t22b`/`scratch_t22c` hold `TODO 18125 / DONE 125 / IN_PROGRESS 125 /
  IN_REVIEW 125`; **`scratch_perf_seed` still holds `Todo / In Progress / In Review / Done`** because
  it predates that commit and was never re-seeded. On a seed at head the budget returns **10 rows,
  `vacuous: false`, on all three measurable tenants**, and the runner reports `0 vacuous`. The
  predicate was not retuned, and must not be. The 1,801 rows belong to **both** budgets — they are
  the same tenant+assignee read — and only look like `my-issues` alone on a title-case database
  where `my-tasks` matches nothing.

## Findings raised, not fixed

- **Six read-cost budgets were passing over an empty result set** — a new vacuous-result guard catches them (`dashboard-personal-my-tasks`, `leads-assigned-to-me`, `chat-saved-messages`, `kb-page-visits-mine`, `kb-page-id-probe-sdf`, `module-access-roster`). All six are seed-fixture defects; none was waived.
- **The status-vocabulary finding needs correcting.** `DEFAULT_PROJECT_STATUSES` and `ACTIVE_TICKET_STATUSES` both use UPPER_SNAKE and agree; the **seed scripts** write title-case. The budget mirrors production correctly and the fixture does not — retuning the budget would have made it measure a query the application never runs.
- **Minority-tenant measurement is fixed** (`--profile=minority`): the 43 previous "failures" on the 0.18% tenant were all unreachable seed floors. Now 34/70 measured with 0 breaches at 0.90% share, 9/70 at 0.18%, both PARTIAL. `inv-stock-transactions` measures **1,223 blocks on the majority tenant against 6 on every minority tenant** for the identical query.
- **Backend `pnpm typecheck` is red (exit 2, 20 errors), none in these paths** — schema files gained required columns while their consuming services in `hr/recruitment`, `e-sign`, `support/core`, `kb/wiki`, `build/core` and `automation` have not been updated. All are uncommitted work in the shared tree.

### Raised by the resumption pass — outside this territory

- **`GET /me/attendance/history` Seq Scans the whole tenant.** `AttendanceReadService.history`
  filters `attendance.user_membership_id`; the only owner index is
  `idx_attendance_org_user_date (org_id, user_id, date)` and nothing leads with the membership
  column. Measured: 193 buffers, **9,991 of 10,008 rows removed by filter**, to return 17. Invisible
  until the budget was re-pointed at the column the code uses. Needs
  `(org_id, user_membership_id, date DESC)` — `migrations/` + `src/db/schema/**`.
- **`GET /calendar/events` reads 1,139 buffers against a 500 ceiling** and is the one live breach
  in `check:route-budgets`. The plan de-correlates the attendee `EXISTS` into a hashed SubPlan that
  materialises **26,077 `event_attendees` rows (1,127 buffers)** regardless of `LIMIT 3`. The
  budget matches the service exactly, so this is the route, not the instrument → dashboard/calendar
  + schema. The ceiling was not raised.
- **The three CRM read-cost budgets bound tables their modules no longer read.** `GET /leads` and
  `GET /contacts` read `lead_party_map ⋈ business_parties` (Party is canonical; `leads`/`contacts`
  are derived mirrors), so `leads-active`, `leads-assigned-to-me` and `contacts-list` measure the
  mirror. **Not re-pointed:** on the perf seed at head `lead_party_map` and `contact_party_map` hold
  **0 rows** and `business_parties.owner_user_id` is NULL on all 22,240 rows, while `leads` and
  `contacts` hold 8,896 each — moving them today would trade a wrong-table budget for a vacuous one.
  The seed has to write the canonical side first (`test/perf` + `scripts/seed-*`); the column
  mapping the move needs is recorded in `read-cost-budgets.mjs` beside `leads-active`.
- **`run-read-cost-budgets.mjs` prints `N PASS / M FAIL` where PASS counts budgets and FAIL counts
  breaches**, so the two do not sum to the declared total when one budget trips two guards
  (`67 PASS / 4 FAIL` over 70 budgets was three failing budgets, one of them twice). Cosmetic, but
  it reads as an arithmetic error. That file is not in this territory.
