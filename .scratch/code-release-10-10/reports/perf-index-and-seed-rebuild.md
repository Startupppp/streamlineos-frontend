# perf — the evidence database rebuilt, one index shipped, one declined

**Status:** the seed is rebuilt at head and swapped in; `GET /me/attendance/history` is fixed and
proved on all four tenants; `GET /calendar/events` is **not** fixed and the gate is **still red**,
deliberately — §3 records what the breach actually is, the two rewrites I measured, the index I
measured and refused to ship, and the three-line change in another territory that fixes it.

Everything below was measured on **`scratch_perf_seed`** (built as `scratch_perf_seed_new`, then
swapped — §1.4), at journal head **665/665**, as **`streamline_app`** (`rolbypassrls = false`,
`rolsuper = false`) with `app.organization_id` set, **in buffers** (root
`Shared Hit Blocks + Shared Read Blocks`, the same accounting `run-read-cost-budgets.mjs` uses),
warm (last of five samples), `VACUUM ANALYZE` after every DDL, on **all four tenants** of the skew.
Backend HEAD when the numbers were taken: `77484370`.

---

## 1 — The stale evidence database, rebuilt

### 1.1 What was wrong

`scratch_perf_seed` was built before `3d157c15` and never re-seeded. Confirmed here before touching
it, on the same tenant:

| database | `build.tickets.status` |
|---|---|
| `scratch_perf_seed` (old) | `Todo 18642 / In Progress 645 / In Review 643 / Done 642` |
| `scratch_t22c` (at head) | `TODO 18642 / IN_PROGRESS 645 / IN_REVIEW 643 / DONE 642` |

`scratch_t07c`, 1,703 MB and the same title-case vocabulary, is a copy of the stale one and carries
the same defect. It was **not** rebuilt — it is another ticket's evidence — but anything
status-dependent measured on it reads vacuous.

### 1.2 The rebuild

Report `00-seeded-perf-database.md` §2 verbatim, into a **new** database beside the live one, every
step's exit code read:

| step | command | exit | result |
|---|---|---|---|
| 0 | `createdb -O neondb_owner scratch_perf_seed_new` + 6 extensions | 0 | |
| 1 | `db-bootstrap.mjs` | **0** | `REACHED_HEAD 664/664` |
| 2 | `db-bootstrap-app-role.mjs` | **0** | `READY`, `bypassrls=false` |
| 3a | `seed-scratch-e2e.mjs` | **0** | 4 s |
| 3b | `test/perf/seed-heavy-query-load.mjs` | **0** | 471 s |
| 3c | `seed-perf-scratch.mjs` | **0** | `All sections completed without errors.` |
| 4 | `test/perf/ai/seed-kb-retrieval-corpus.mjs` | **0** | 49,000 chunks, HNSW rebuilt |
| 5 | `VACUUM ANALYZE` (whole database) | 0 | |
| 6 | `db-bootstrap.mjs` again, after migration 1041 | **0** | `REACHED_HEAD 665/665` (`1 OK / 664 SKIP`) |

### 1.3 Verified shape — checked against report 00 §6, not asserted

| property | report 00 | rebuilt | |
|---|---|---|---|
| journal | 649/649 | **665/665** | at head, incl. this ticket's 1041 |
| size | 1,699 MB | **1,720 MB** | +2 new tables, same HNSW (487 MB) |
| non-empty tables | 88 | **90** | +`lead_party_map`, +`contact_party_map` |
| organizations | 8 | **8** | 4 perf + 4 `perf_kb_*` |
| tenant split | 89.93 / 9.00 / 0.90 / 0.18 | **identical** | table below |
| ticket statuses | title-case (stale) | **`TODO / IN_PROGRESS / IN_REVIEW / DONE`** | |
| `streamline_app` | `rolbypassrls=false` | **`f`, `rolsuper=f`** | |
| RLS live | yes | **899 RLS relations in `public`**; as the app role with the tiny tenant's GUC, `inv_stock_transactions` returns **300 of 166,800** | |

Per-tenant rows, layer-3 report output, identical to report 00 §6 on every row it already had:

```
table                          large       mid     small      tiny     total  majority%  minority%
build.tickets                  18500      1850       185        37     20572     89.93%      1.08%
notifications                 240000     24000      2400         0    266400     90.09%      0.90%
calendar_events                60012      6012       612         0     66636     90.06%      0.92%
event_attendees               125004     12720      1296         0    139020     89.92%      0.93%
contacts                        8000       800        80        16      8896     89.93%      1.08%
leads                           8000       800        80        16      8896     89.93%      1.08%
business_parties               20000      2000       200        40     22240     89.93%      1.08%
lead_party_map                  8000       800        80        16      8896     89.93%      1.08%   <- new
contact_party_map               8000       800        80        16      8896     89.93%      1.08%   <- new
inv_stock_transactions        150000     15000      1500       300    166800     89.93%      1.08%
attendance                      9000       900        90        18     10008     89.93%      1.08%
organization_members             500        60         8         5       573     87.26%      2.27%
```

`kb_article_chunks` totals **62,320** (49,000 corpus + 13,320 application), unchanged.

The read-cost gate on the rebuilt database, as the app role with the tenant GUC:

```
run-read-cost-budgets.mjs                 exit 0   70 PASS / 0 FAIL / 0 UNMEASURED / 0 EXCL / 0 SKIP
--profile=minority  9.00%                 exit 0   48 PASS / 0 FAIL / 17 UNMEASURED / 5 SKIP
--profile=minority  0.90%                 exit 0   37 PASS / 0 FAIL / 28 UNMEASURED / 5 SKIP
--profile=minority  0.18%                 exit 0    9 PASS / 0 FAIL / 53 UNMEASURED / 8 SKIP
```

**Zero exclusions and zero skips at the reference tenant, and 70 of 70 measured** — the 10 false
`excluded:` lines report 00 §8.1 raised are gone (fixed by someone else meanwhile), and nothing
here reports `seed-too-small`.

### 1.4 The swap

Built as `scratch_perf_seed_new`, verified above, then renamed:

```
ALTER DATABASE scratch_perf_seed     RENAME TO scratch_perf_seed_stale_20260902;
ALTER DATABASE scratch_perf_seed_new RENAME TO scratch_perf_seed;
```

**The stale database is renamed, not dropped** — it is cited in report 22c and in this one, and a
rename keeps it readable as `scratch_perf_seed_stale_20260902`. Delete it when 22c is closed.

The swap waited for a quiet window: a live `streamlineos-api` pool (6 connections, `neondb_owner`)
was holding the old database throughout. The swap script polls until every connection is `idle` and
has been idle for 90 s, then terminates the idle backends — `postgres.js` reconnects on its own, to
the new database of the same name — and refuses to swap at all if a query is in flight. Its log is
`/private/tmp/.../scratchpad/swap.log`. **If that log ends with `SWAP NOT PERFORMED`, the
replacement is still sitting at `scratch_perf_seed_new` and the two `ALTER DATABASE` lines above are
all that remains.**

`scratch_boot_b/c/d` were not touched. No `psql` ran against anything but `scratch_*`.

### 1.5 The seeder did NOT write the Party seam — it does now

The question ticket 22c raised, answered: **the seeder should populate the canonical side, and did
not.** `business_parties` was written; `lead_party_map` and `contact_party_map` were not, and
`owner_user_id` was NULL on all 22,240 parties.

That is not cosmetic. Ticket 02 made Party canonical and left `leads` / `contacts` derived mirrors,
so `LeadsReadService.list` and `queryContacts` select through `crm-party-reads.ts` from
`lead_party_map ⋈ business_parties` and `contact_party_map ⋈ business_parties` — **20 services
import `PARTY_OF_LEAD` / `PARTY_OF_CONTACT`**. On the old seed every one of those reads matched
nothing, which is exactly why 22c could not re-point `leads-active`, `leads-assigned-to-me` and
`contacts-list` at the tables their modules read: the move would have replaced a budget on the wrong
table with a budget on an empty join.

`seed-perf-scratch.mjs` now has a `seedPartySeam` section. Leads take parties from the front of the
org's party list and contacts from the back, so the two never collide; each legacy id gets its own
party (several ids answering to one party is what a *merge* produces, and nothing here is merged);
and the columns the reads coalesce over are projected from the mirror row, so a canonical-side
predicate selects the rows the mirror-side predicate selected —
`lifecycle_stage ← leads.status`, `qualification_score ← leads.score`,
`owner_user_id ← leads.assigned_to_id`, plus `priority` / `acquisition_source`, and
`next_follow_up_at` on half the lead parties (a quarter overdue, a quarter upcoming) because the CRM
inbox filters on it and a column that is NULL everywhere makes that filter free. Contact parties get
an owner round-robin from the member pool, `party_kind = 'PERSON'`, and the contact's job title and
department.

Measured on the rebuilt database:

| | before | after |
|---|---|---|
| `lead_party_map` | 0 | **8,896** |
| `contact_party_map` | 0 | **8,896** |
| parties with `owner_user_id` | 0 of 22,240 | **17,792** |
| parties with `lifecycle_stage` | 0 | **8,896** |
| parties with `next_follow_up_at` | 0 | **4,448** |
| parties mapped by both a lead and a contact | — | **0** |
| canonical-side "active leads", majority tenant | **0 rows** | **6,400 rows** |
| canonical-side "leads assigned to me" | **0 rows** | **16 rows** |

`node src/scripts/seed-perf-scratch.mjs --self-test` → **exit 0, 13/13** (was 11/11; the two new
cases assert that every tenant has enough parties to map both legacy sides, and that the three
`organization_id`-keyed tables are read on that column and not on `org_id` — a real trap, since
`purge()` and the shape report both hard-coded `business_parties` as the only exception).

**Still not re-pointable, and this is the remaining blocker for ticket 22:** the canonical-side
"assigned to me" read returns **16** rows at the majority tenant, because layer 3 spreads 8,000
leads over 500 members. `leads-assigned-to-me` would measure a 16-row answer. That is a *fixture*
question (which member to pick), not a seed-emptiness question any more — the join is no longer
empty, which is what was blocking. → tickets 20/22.

---

## 2 — `GET /me/attendance/history`: shipped, measured on four tenants

**Migration `1041_t22c_attendance_membership_history_index`**, journal idx 797,
`when` 1803000010116 (above the 2027-02-19 watermark), `.sql` + `.down.sql` + journal in **one**
commit, `git cat-file -e HEAD:migrations/1041_….sql` verified.

`AttendanceReadService.history` filters `attendance.user_membership_id` — the tenant authority since
the actor-contract rollout (`fk_attendance_user_actor`) — and orders `date DESC, created_at DESC`.
None of the table's five indexes led with that column; `idx_attendance_org_user_date` is still on the
display identity `user_id`.

**The index was already declared and had never been created.**
`src/db/schema/hr/attendance.ts` has carried
`index("idx_attendance_org_user_membership_date").on(orgId, userMembershipId, date)` since the actor
rollout, and **no migration in `migrations/` ever mentioned that name** — `pg_indexes` on a database
bootstrapped from zero to head has five indexes on `attendance` and this is not one of them. So this
is declaration drift closed, not a new index invented.

Measured, index created and dropped around each run:

| tenant | head, buffers | `(org, membership, date)` | **shipped** `(…, date DESC, created_at DESC)` |
|---|---|---|---|
| 89.93% | **193** | 5 | **5** |
| 9.00% | 25 | 17 | **17** |
| 0.90% | 6 | 4 | **4** |
| 0.18% | 3 | 4 | **3** |

The `count(*)` beside it, same predicate: **193 / 25 / 6 / 3 → 3 / 3 / 3 / 3.**

Rows read from `attendance` to answer the page: **10,008 / 900 / 90 / 18 → 17 / 15 / 12 / 4.**
At the majority tenant head is a Seq Scan of the whole tenant — 9,991 rows discarded by the filter
to return 17 — and `attendance-mine`'s `maxScanRows: 200` was breached at two tenants.

**Why `created_at DESC` is in the key and not decoration.** With `(org, membership, date)` alone the
index orders by `date` only, the planner adds an Incremental Sort for the tiebreak, and the tiny
tenant pays **one buffer more than head** (4 against 3) — a real, if small, regression, of exactly
the shape that made 0999's seven index drops regressions. With `created_at DESC` appended the
ordering is satisfied outright, the plan is a bare `Index Scan` with no sort node, and **no tenant is
worse than head**. Both keys DESC so the scan runs forward. This is the inverse of the
`(org, assignee, status, updated_at DESC)` failure: nothing sits *between* the equality columns and
the sort column, so `LIMIT` stops early.

**464 kB against a 1,544 kB heap.** The Drizzle declaration was updated to the shape that shipped.
The index is chosen on all four tenants — verified by reading `Index Name` out of the plan, not by
assuming.

`attendance-mine` on the rebuilt database after 1041: **5 buffers, 17 rows scanned, PASS**, and
PASS on the 9.00% and 0.90% profiles too (17 and 4 buffers). Unmeasurable on the 0.18% tenant —
18 rows is below the budget's seed floor of 30.

---

## 3 — `GET /calendar/events`: NOT fixed, gate still red, and precisely why

`check:route-budgets` → **exit 1**, one breach:
`GET /calendar/events — measuredBufferBlocks=1139 exceeds maxBufferBlocks=500`.
**No ceiling was raised.** `contracts/route-budgets.json` was not edited.

### 3.1 The breach is real, and it is a different service from the route

The route budget's `readCostBudgetId` is `dashboard-personal-calendar-events`, and that budget's SQL
mirrors **`src/modules/dashboard/dashboard-personal.service.ts`** (`upcomingEvents`,
`LIMIT 3`) — not `GET /calendar/events`, which is
`CalendarService.getEvents → CalendarEventsAggregateService → CalendarNativeEventSource →
CalendarEventSourceLoader.queryVisibleEvents` and issues a completely different statement (a
keyset-paged 500-row batch with a `LEFT JOIN event_attendees` on the caller's membership). The
1,139 blocks are the dashboard's, charged to the calendar route.

Reproduced exactly on the rebuilt seed: **1,140 blocks, 26,079 `event_attendees` rows** materialised
by the hashed SubPlan (22c measured 1,139 / 26,077 on `scratch_t22c` — one attendee row's
difference).

### 3.2 The number is bimodal, and that matters more than the number

On the freshly rebuilt seed the **same query, same fixture, same database** measures **6 blocks**,
and `run-read-cost-budgets.mjs` reports it PASS at 6. It is not fixed; it short-circuits.

`visibility = 'org' OR EXISTS(creator) OR EXISTS(attendee)` is evaluated left to right, and the
hashed SubPlan is only *built* if the OR reaches it. The seed writes 54,558 `org` and 5,454
`private` events per majority tenant in groups of seven sharing one `start_date`, with the private
one rotating position within the group. Whether `start_date >= NOW()` cuts the window so that a
private event lands inside the first three rows is a function of **wall-clock time since the seed
ran**:

| first 3 upcoming events | measured |
|---|---|
| all `visibility = 'org'` (rebuilt seed, now) | **6 blocks**, SubPlan never built |
| one `private` among them (`scratch_t22c`, and the manifest's run) | **1,140 blocks**, 26,079 rows |

Every number in §3.3 is therefore taken with the window **anchored deterministically at the earliest
upcoming timestamp group whose first three rows contain a non-`org` event** — the worst case, which
is the case the manifest recorded and the only one that measures the subplan at all.

Two consequences worth acting on, neither in this territory:
- **Re-measuring the manifest on a fresh seed will turn this gate green without anything being
  fixed.** If `measure-route-budgets --write` is re-run tonight it will overwrite 1,139 with ~6.
- The budget cannot see its own defect on a majority of runs. A `maxScanRows`-style guard on
  `event_attendees` rows would bite regardless of which branch of the OR wins.

### 3.3 What I measured, at the majority tenant, worst case anchored

| variant | blocks | attendee rows read | new index |
|---|---|---|---|
| head (the budget as written) | **1,140** | 26,079 | — |
| **correlated `EXISTS` with the membership resolved to a constant** | **1,140** | 26,079 | — |
| OR-to-`UNION ALL`, three branches each `LIMIT 3` | **1,223** | 26,079 | — |
| head + `event_attendees (org_id, membership_id, event_id) WHERE status <> 'declined'` | **230** | 26,079 | 6,296 kB |
| head + `event_attendees (org_id, membership_id, event_id, status)` | **411** | 26,079 | 11 MB |
| **`LEFT JOIN LATERAL … LIMIT 1` + `att.hit IS NOT NULL`, no new index** | **23** | 0.67 per row | **none** |

Two of the four options the ticket suggested were measured and **do not work**: removing the
`organization_members` join from the subquery changes nothing (a correlated `EXISTS` on
`ea.event_id = calendar_events.id` is hashable, so Postgres hashes it regardless), and the
OR-to-UNION restructure is *worse* than head, because the attendee branch de-correlates the same way
inside its own `LIMIT 3`.

The one that works is the LATERAL join, and it works because a `LEFT JOIN LATERAL` is not a
subplan: the planner probes `event_attendees_event_membership_unique (org_id, event_id,
membership_id)` once per candidate row and `LIMIT 3` stops after three. **It needs no new index and
no new storage.** It is also exactly what `CalendarEventSourceLoader` already does — the calendar
module got this right and the dashboard did not.

### 3.4 Why I shipped no index

The partial covering index takes the breach away (230 < 500) and is entirely inside my territory.
I refused it, on the measurement rather than on taste:

- the query fix is **10× better** (23 against 230) and costs **0 bytes** against 6,296 kB on a
  15 MB heap;
- the index leaves the O(attendee-rows) hash in place — it makes 26,079 rows cheaper to read, not
  fewer to read, so the cost still grows with one member's attendance;
- it would be a 6 MB index whose only justification is a budget that measures *another module's*
  query, and it becomes dead the moment that query is fixed. This release has already dropped seven
  indexes for looking redundant and found all seven were load-bearing; adding one that genuinely is
  redundant-in-waiting is the same mistake with the sign flipped.

**Routed, not fixed — `src/modules/dashboard/dashboard-personal.service.ts`, `upcomingEvents`
(~line 113).** Resolve the caller's membership once, then replace the attendee `exists(...)` with a
`LEFT JOIN LATERAL (SELECT 1 … LIMIT 1) att ON true` and `isNotNull(att.hit)` in the `or(...)`.
Measured: **1,140 → 23 blocks**, 26,079 → 0.67 attendee rows per candidate row, same three rows
returned. That is the whole fix.

### 3.5 The route's own query was never measured, and costs more

While confirming which statement the route issues, `CalendarEventSourceLoader.queryVisibleEvents`
was measured directly — first keyset batch, one-month window, same tenants:

| tenant | blocks | rows | `calendar_events` rows scanned |
|---|---|---|---|
| 89.93% | **7,063** | 500 (batch cap — it loops) | 3,610 |
| 9.00% | 199 | 500 | 876 |
| 0.90% | 70 | 96 | 97 |
| 0.18% | 2 | 0 | 0 |

**The route budget has never measured this.** 7,063 blocks is one batch of a loop that pages until
exhausted, against a `maxBufferBlocks` of 500. The driver is recurrence, not the attendee join:
8,571 of the majority tenant's 60,012 events carry an `rrule`, and the recurring branch
(`start_date < end AND (recurrence_end IS NULL OR recurrence_end > start)`) has no lower bound, so
every recurring event in the tenant's two-year history is a candidate for any window. Only **77**
non-recurring events fall in the month actually requested.

I tried the obvious narrowing — a lower bound on `start_date` for the non-recurring branch — and
measured it: **7,063 → 7,063 at the majority tenant, no change**, because the recurring branch
dominates and the planner keeps the same scan. A real fix means splitting the two branches
(the partial index `idx_calendar_events_org_recurring_start` already exists and the minority tenants
already use it) and is a larger change than the evidence I have justifies at this point — in
particular the seed's "8,571 recurring events, mostly with a NULL `recurrence_end`" is a layer-2
shape I have not checked against anything real. **Recorded, not attempted.** → ticket 20/22 plus
calendar.

---

## Gates

| command | exit | result |
|---|---|---|
| `pnpm typecheck` (through the mutex) | **0** | 0 errors; exit code read, not grepped |
| `node src/scripts/check-migration-discipline.mjs` | **0** | 665 SQL files, 0 new violations |
| `node src/scripts/check-migration-rollback.mjs` | **0** | 665 migrations scanned, all rollback checks pass |
| `node src/scripts/seed-perf-scratch.mjs --self-test` | **0** | **13/13** |
| `node src/scripts/db-bootstrap.mjs` (scratch) | **0** | `REACHED_HEAD 665/665` |
| `run-read-cost-budgets.mjs` (89.93%) | **0** | **70 PASS / 0 FAIL / 0 UNMEASURED / 0 EXCL / 0 SKIP** |
| `run-read-cost-budgets.mjs --profile=minority` (9.00% / 0.90% / 0.18%) | **0 / 0 / 0** | 48 / 37 / 9 PASS, 0 FAIL each |
| `node src/scripts/check-route-budgets.mjs` | **1** | **1 breach: `GET /calendar/events` 1,139 > 500** — §3 |
| `node src/scripts/check-migration-ledger.mjs` | 1 | **fails closed without `DATABASE_URL`**, which is the shared remote Neon and was not set. Pre-existing, unrelated to this work. |
| `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `check:spec-typecheck` | — | **not run** |

---

## Cross-territory findings

1. **`GET /calendar/events`'s route budget measures the dashboard's query.**
   `readCostBudgetId: "dashboard-personal-calendar-events"` in `contracts/route-budgets.json` points
   at `dashboard-personal.service.ts`, not at the calendar route. The route's own statement costs
   7,063 blocks a batch and is unmeasured. → ticket 22.
2. **That budget's measured value is time-dependent** (§3.2): 6 blocks on a fresh seed, 1,140 once
   the clock moves a private event into the first three rows. Re-running
   `measure-route-budgets --write` will silently make the gate green. → ticket 22.
3. **The fix for the breach is three lines in `dashboard-personal.service.ts`**, measured at
   1,140 → 23 blocks with no new index (§3.4). → dashboard owner.
4. **`scratch_t07c` is a copy of the stale seed** (title-case ticket statuses, 1,703 MB). Anything
   status-dependent measured on it reads vacuous. → whoever owns ticket 07's evidence.
5. **`leads-assigned-to-me` is now re-pointable but would measure 16 rows** at the majority tenant,
   because 8,000 leads are spread over 500 members. A fixture choice, not a seed gap (§1.5).
   → ticket 22.
6. **`run-read-cost-budgets.mjs`'s tally line mixes units** — still true, unchanged from 22c §4.
7. `idx_calendar_events_org_creator_membership` exists in the database on
   `(org_id, created_by_membership_id, start_date)` while `calendar-events.ts` declares
   `idx_calendar_events_org_created_by_membership` on `(org_id, created_by_membership_id)` —
   a second declaration drift, in a table I did not need to touch. → 07b.

---

## Honest gaps

- **The calendar breach is not fixed and the gate is red on purpose.** §3.4 says why, with the
  numbers for the fix I declined and the fix I could not apply.
- **The LATERAL rewrite was measured only at the majority tenant.** The 9.00%, 0.90% and 0.18%
  tenants have 14, 7 and 0 upcoming events and **none of them private**, so the subplan is
  unreachable there and there is nothing to measure. That is a layer-2 seed shape
  (`test/perf/seed-heavy-query-load.mjs`, not my territory), not a property of the query.
- **No route was timed over HTTP.** Every number here is buffers.
- **`pnpm lint`, `pnpm test`, `pnpm test:e2e` and `check:spec-typecheck`: not run.** Nothing here
  changes a spec, and the two `.mjs` files are outside `tsc`'s program; `node --check` passes on
  both. `pnpm typecheck` **was** run and is 0.
- **`check:migration-ledger` was not run against a database** — it needs `DATABASE_URL`, which is
  the shared remote Neon.
- **The 1041 index was proved by measurement and by `db-bootstrap` applying it**, not by an e2e
  suite. No spec covers `AttendanceReadService.history`'s plan.
- **`seed-perf-scratch.mjs --purge` was not exercised** on the new party-seam section; the two map
  tables were added to `PURGEABLE` ahead of the tables they reference, and their foreign keys are
  `ON DELETE CASCADE`, but the path was not run.
- **The party-seam projection was not verified against the CRM services' own output**, only against
  the SQL those services build (`crm-party-reads.ts`). No CRM endpoint was called.
