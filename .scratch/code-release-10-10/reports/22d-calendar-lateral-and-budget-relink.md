# 22d — The calendar budget measured the wrong service, and the fix is variance not cost

**Status:** the mis-link is repaired, `GET /calendar/events` is measured for the first time, the
LATERAL rewrite is committed and pinned by tests, and a fourth vacuous budget was caught. Ticket 22
stays **4 of 6 closed**; the two open boxes did not close and §Open records exactly why.

Every number below was taken on **`scratch_perf_seed`** — local, journal head, rebuilt 2026-09-02,
`VACUUM ANALYZE`d — as **`streamline_app`** (`rolbypassrls = false`) with `app.organization_id` set,
**in buffers**, over 200 `EXPLAIN (ANALYZE, BUFFERS)` samples, on **all four** seeded tenants
(89.93 / 9.00 / 0.90 / 0.18 percent). `DATABASE_URL` was never touched.

---

## 1 — The budget pointed at the wrong service

`contracts/route-budgets.json` linked `GET /calendar/events` to `dashboard-personal-calendar-events`,
whose SQL is `DashboardPersonalService.upcomingEvents` — a different route entirely. The calendar
route runs `CalendarEventSourceLoader.queryVisibleEvents`, and **it had never been measured at all**.

Both links are corrected, and `calendar-events-visible-batch` is a new read-cost budget over the
loader's actual statement: one keyset-paged batch of 500 over a one-month window, three left joins.
`GET /dashboard/personal` now links `dashboard-personal-calendar-events`, the most expensive of the
six sources it fans out to (its old link, `dashboard-personal-my-tasks`, measures 4 blocks and stays
enforced directly by the read-cost runner).

**The mis-link was hiding a breach behind a passing number.** The stale `measuredBufferBlocks: 1139`
sat under `calendar-events-visible-batch`'s 2,000 ceiling, so `check:route-budgets` reported PARTIAL,
exit 0. Re-measured, the real figure is **7,072** and the gate is exit 1 on it. Nothing was raised.

| read-cost budget | 89.93% | 9.00% | 0.90% | 0.18% |
|---|---:|---:|---:|---:|
| `calendar-events-visible-batch` (new) | **7,063 FAIL** | 202 PASS | 70 PASS | no fixture |
| `dashboard-personal-calendar-events` after | 18 PASS | 15 PASS | vacuous | no fixture |
| `dashboard-personal-calendar-events` before | 6 PASS | 6 PASS | vacuous | no fixture |

The 0.18% tenant has **zero** `calendar_events` rows, so both budgets are honestly unmeasurable
there; the 0.90% tenant has 612 events but none upcoming that the fixture user can see, so the
dashboard budget returns 0 rows and the runner refuses it as vacuous rather than passing it.

### Why `calendar-events-visible-batch` breaches, and what would fix it

Measured breakdown of the 7,063 at 89.93%, from the plan:

```
calendar_events index scan (idx_calendar_events_org_date)   3,623 blk   517 kept / 3,093 removed by filter
organization_members creator join (517 loops x 3)           1,551 blk
event_attendees caller-RSVP probe (517 loops)               1,886 blk
users (Memoize: 516 hits, 1 miss)                               3 blk
planning                                                      947 blk
```

`calendar_events` is 1,731 pages, so one batch of this route reads **four times a full sequential
scan of the table**. The driver is the recurring branch: it has no lower bound on `start_date`, so
every recurring event in the tenant's entire history is a candidate for any window (8,571 of 60,012
carry an rrule, 4,286 of those with a NULL `recurrence_end`), while only 77 non-recurring events fall
inside the month requested. 3,610 rows are scanned to return the 500-row batch and the loop then
pages for more.

The remedy is to split the two branches so `idx_calendar_events_org_recurring_start` serves the
recurring one, and to stop touching the heap for rows that fail the window filter —
`idx_calendar_events_org_start_cover` already INCLUDEs `end_date`, `rrule` and `recurrence_end`, the
exact filter columns, but the 18-column projection forces a heap fetch per candidate anyway, so it
needs a candidate-ids-then-fetch shape. **Not done here:** it is a redesign of a keyset-paged loop
whose `LIMIT 500` counts *visible* rows, so the visibility test cannot be pushed into the candidate
step without changing what a page means. Recorded as a breach with the ceiling untouched.

---

## 2 — The LATERAL rewrite: what it actually bought

`upcomingEvents` tested attendance with an `EXISTS` over `event_attendees INNER JOIN
organization_members`. The planner is free to de-correlate that into a **hashed SubPlan** that
materialises every attendee row the tenant owns before `LIMIT 3` can stop anything. Forced into that
plan on this seed, it materialises **26,079 `event_attendees` rows for 1,131 read blocks**. It is now
a `LEFT JOIN LATERAL … LIMIT 1` probed once per candidate row through
`event_attendees_event_membership_unique`; the ACTIVE-membership guard moved out of the SQL join into
`attendeeMembershipId`, which is `0` for a caller with no ACTIVE membership.

**State the trade honestly: this is not a cost reduction on this seed, it is a variance elimination.**
Warm execution buffers, same fixture, same database:

| tenant | before (EXISTS) | after (LATERAL) |
|---|---:|---:|
| 89.93% | 6 | 18 |
| 9.00% | 6 | 15 |
| 0.90% | vacuous (0 rows) | vacuous (0 rows) |
| 0.18% | no fixture (0 events) | no fixture (0 events) |

The LATERAL is probed for every candidate row even where `visibility = 'org'` would have
short-circuited, so the cheap window costs about 12 blocks more. What it removes is the tail:
the hashed-SubPlan plan is not reachable from a LATERAL, so the 26,079-row materialisation cannot
recur regardless of which rows the window happens to contain.

### The bimodality, and why no fixture on this seed can pin it

Report 22c recorded 1,139 blocks for this budget. Re-measured today the same pre-change SQL on the
same database measures **6**. That is not drift — it is the defect. The `OR` short-circuits on
`visibility = 'org'` unless a scanned row is private, so the block count depends on which rows fall
in the first three, which moves with the wall clock as events pass `NOW()`.

**Anchoring the fixture to the worst case was attempted and is not reachable on this seed.** Measured:
- Of 56 upcoming events on the 89.93% tenant, 51 are `org` and 5 are `private`; every private one
  shares its `start_date` with 5–6 org events, and the index returns the org rows first, so the
  SubPlan is `never executed` for any `start_date >= X` window. The 9.00% and 0.90% tenants have
  **zero** upcoming private events, so the branch is unreachable there at any window.
- A `(start_date, id)` keyset anchor onto the private row does force the plan — 26,079 rows,
  61,300 blocks — but it also makes the row-comparison non-index-usable, so both the before and
  after variants degrade to a 60,160-block full scan and the comparison stops describing the route.
- Restricting to `visibility <> 'org'` forces the branch fairly but shrinks the planner's row
  estimate enough that it picks a nested loop, not the hash: 390 before vs 360 after. It reproduces
  the branch, not the plan.

So the guard for this shape is **not** the block count. It is the plan shape, pinned in code rather
than in the catalog: `dashboard-personal-visibility.spec.ts` now asserts exactly one
`leftJoinLateral`, no `organization_members` join inside the attendee arm, and the outer WHERE
testing `"attended_event"."hit"`. Turning the LATERAL back into the EXISTS turns 13 tests red.

**What would make it pinnable in the catalog, for whoever owns those files:** the seed needs one
private upcoming event at a timestamp no other event shares, per tenant
(`test/perf/seed-heavy-query-load.mjs` — not this territory), or `run-read-cost-budgets.mjs` needs a
third `planAssertions` kind, `forbid-hashed-subplan`, which would be order-independent and would
have caught this without any fixture work at all (also not this territory — its two existing kinds
are `require-index-only-scan` and `forbid-seq-scan`).

---

## 3 — A fourth vacuous budget, and it was a time bomb

`dashboard-team-attendance` carried `measuredBufferBlocks: 41` in the manifest while returning **0
rows** on the seed at head. Cause: its fixture computed `new Date()...slice(0,10)` and the seed's last
`attendance` row is the day the seed was built. **The budget goes vacuous on a calendar boundary** —
one day after any rebuild — and until today the manifest kept the last non-vacuous number, which
reports a pass over an empty result set.

Fixed by anchoring the date to the seed's own latest attendance day as an InitPlan constant; the
predicate the route issues (`a.date = <one day>`) is unchanged. Now measured on **all four** tenants:
44 / 23 / 9 / 9 blocks against a 2,000 ceiling. The refusal path in `measure-route-budgets.mjs`
already clears a stale number when the instrument refuses (`applyMeasurement` nulls all four
read-path fields), so the manifest never carried the 41 forward once the run refused it.

---

## Gates

| command | exit | result |
|---|---|---|
| `run-read-cost-budgets` (89.93%, 200 samples) | 1 | 69 PASS / 2 FAIL, 70/71 measured |
| `run-read-cost-budgets --profile=minority` (0.90%) | 0 | 36 PASS / 0 FAIL, 36/71 measured, PARTIAL |
| `measure-route-budgets --self-test` | **0** | 8 checks |
| `measure-route-budgets … --write` | **0** | 53 written / 1 refused / 28 unlinked; **0 ceilings changed** |
| `check:route-budgets` | 1 | **1 breach: `GET /calendar/events` 7,072 > 2,000** |
| `jest --testPathPattern=dashboard` | **0** | 22 suites / 168 tests |
| `pnpm typecheck` | **0** | backend |
| `pnpm check:spec-typecheck` | **0** | backend |
| `pnpm type-check` (frontend) | **0** | |

---

## Open, and why

- **Box 1 (`maxDbCalls`)**: still 5 counted / 14 estimated / **63 default**. Unchanged by this pass.
  The instrument exists (`route-budget-db-calls.ts` counting through `QueryTelemetryTracker`) and
  live coverage is 2 of 82 routes; extending it is one `countDbCalls` per service and belongs with
  each module's owner. Not a mechanism gap.
- **Box 2 (p50/p95/p99 over HTTP)**: `measuredLatencyP95Ms`, `measuredDownstreamCalls`,
  `measuredResponseBytes` and `measuredMemoryMb` are **null for all 82**. The HTTP harness another
  agent was building has landed and is committed (`test/perf/route-budget-http-harness.ts`,
  `route-budget-http-plan.ts`, `route-budget-http.seeded-e2e-spec.ts`) — `test/perf/**` is not this
  territory, and no run of it is claimed here. `measure-route-budgets.mjs` still deliberately refuses
  to fill `measuredLatencyP95Ms` from the read-path artifact: a 5.7 ms database read inside a 300 ms
  end-to-end ceiling would be a false pass.
- **Cross-territory, resolved by someone else since 22c:** `GET /me/attendance/history` fell 199 → 5
  blocks — `idx_attendance_org_user_membership_date` now exists in `pg_indexes`, closing report 22c
  finding 1.
