# 22c — Budgets that measured the wrong column, and the manifest re-measured at head

**Status:** the four routed defects are closed, and a mid-task correction that reversed one of them
was checked against the source rather than applied — it turned out to describe a stale database, and
§3 records the evidence and what genuinely changed because of it. `contracts/route-budgets.json` is regenerated from
a real measurement rather than hand-edited, `check:route-budgets` no longer fails on a stale number,
and eight read-cost budgets now bound the query their service actually issues. The gate is still
exit 1, on one genuine breach that belongs to another territory. Ticket 22 stays **4 of 6 closed**;
neither open box was closable here.

Everything below was measured on **`scratch_t22c`** — a `createdb -T` copy of `scratch_t22b` (the
corrected seed from report 22b) brought to journal head with `db:migrate`, `VACUUM ANALYZE`d — as
**`streamline_app`** (`rolbypassrls = false`) with `app.organization_id` set, **in buffers**, over
200 `EXPLAIN (ANALYZE, BUFFERS)` samples, on the **89.93 / 9.00 / 0.90** percent tenants.
`scratch_perf_seed` and `scratch_t22b` were not written to.

Backend HEAD when the numbers were taken: `bd47327c`. One caveat stated up front: **`ef3c1960`
(migration 1027) landed mid-run**, so the first pass measured `dashboard-personal-my-tasks` without
its index and the recorded pass measured it with. Both numbers are below.

---

## The three routed defects

### 1 — Two budgets measured a column the code does not use

`notifications` is RANGE-partitioned on `created_at`, and migration `0520` moved the recipient
authority from `user_id` to `membership_id`. The live indexes followed the service; **no index leads
with `(org_id, user_id, …)` any more.** `notifications-list` and `notifications-unread-count` still
filtered `user_id` and carried no `created_at` predicate, so they planned a Merge Append over all 49
partitions that `NotificationsReadService` prunes to 8 through its retention window. That is why they
reported 3,860–6,267 rows per partition and 10,234 blocks — and why the genuine improvement reported
in 22b (`measuredDbCalls` 5 → 3, 4 → 2, 49 partitions → 8) could not appear in them.

The predecessor pass had re-pointed six budgets and left them unmeasured. Each was verified against
its service before being trusted:

| budget | service | column it filters |
|---|---|---|
| `notifications-list` / `-unread-count` | `notifications-read.service.ts` `queryNotifications` / `queryUnreadCount` | `notifications.membershipId` + `createdAt` window |
| `dashboard-personal-notifications-count` | same (`GET /dashboard/personal` calls `unreadCount`) | same |
| `kb-page-visits-mine` | `kb-page-visits.service.ts` `getRecent` | `kbPageVisits.membershipId` |
| `my-leave-requests` | `leaves.service.ts` `my` | `leaveRequests.userMembershipId`, `ORDER BY id DESC` |
| `my-attendance-history` | `attendance-read.service.ts` | `attendance.userMembershipId` |

Before → after, buffers (execution + planning), same fixture, same database:

| budget | 89.93% | 9.00% | 0.90% |
|---|---|---|---|
| `notifications-list` | **3,173 → 121** | 1,367 → 119 | 1,200 → 85 |
| `notifications-unread-count` | **10,566 → 16** | 2,577 → 16 | 551 → 16 |
| `dashboard-personal-notifications-count` | **11,377 → 16** | 1,367 → 16 | 1,292 → 16 |
| `timesheets-mine` | 10 → 7 | 8 → 5 | 6 → 3 |
| `my-leave-requests` | 4 → 3 | 4 → 4 | 3 → 3 |
| `kb-page-visits-mine` | 76 → 75 | 13 → 13 | 13 → 13 |

Rows scanned on `notifications-list` at 89.93%: **59,561 → 98**. The `before` plan on
`dashboard-personal-notifications-count` was a **Seq Scan over 266,400 rows**. The two leave and
visit budgets barely move in buffers and that is the point — they now exercise
`idx_leave_requests_org_user_membership` and `idx_kb_page_visits_org_membership_visited`, the indexes
that serve the routes, instead of `idx_leave_requests_user_id` and
`idx_kb_page_visits_org_user_visited`, which the routes never touch. A budget on an index the route
does not use cannot notice that index being dropped.

**The sweep for others.** Every budget whose SQL mentions `user_id` was diffed against its service.
Two more were wrong and were fixed:

- **`timesheets-mine`** resolved the membership with `WHERE user_membership_id = (SELECT id FROM
  organization_members …)`. `listTimeEntries` takes the id off the request principal
  (`actingMembershipId(user.principal)`) and issues no such lookup, so the budget charged the route
  for a probe it does not make. Its comment also named `idx_timesheets_org_user_date`, which **does
  not exist** — `idx_timesheets_org_user_membership_date` is what serves it.
- **`mail-inbox-cached`** — see defect 4 below.

Three were checked and are **correct as written**, and are recorded so the next sweep does not
"fix" them: `leave-ledger-mine` (`hrLeaveLedger.userId` is still the service's column),
`dashboard-leaves-today` (`leaveRequests.userId`), `dashboard-team-attendance`
(`attendance.userId`). `dashboard-personal-calendar-events` matches its service EXISTS-for-EXISTS.

A mechanical cross-check backed the manual one: every `idx_*` name appearing anywhere in
`read-cost-budgets.mjs` was compared against `pg_indexes` at head. One did not exist —
`idx_timesheets_org_user_date`, above.

### 2 — `contracts/route-budgets.json` regenerated, not hand-edited

```
node src/scripts/measure-route-budgets.mjs \
  --from=<reference artifact> --minority=<0.90% artifact> --db-calls=<call artifact> \
  --database=scratch_t22c --write
```

The db-call artifact comes from ticket 22's own instrument, not from the read-path EXPLAIN:

```
SEED_ORG_ID=… ROUTE_BUDGET_DB_CALL_ARTIFACT=… \
  jest --config ./jest-e2e.json --runInBand --forceExit --testPathPattern=route-db-call-budget
```
→ **exit 0, 5/5 passed**, artifact `{ "GET /notifications": 3, "GET /notifications/unread-count": 2 }`.

Result: **54 read-path written** (was 50), **2 db-call counts written**, **0 refused** (was 32),
28 entries with no read-cost link. **Zero declared ceilings changed** — `git diff` on the manifest
touches no `max*` key (verified, count 0).

Every number that moved by more than a rounding step:

| route | before | after | why |
|---|---|---|---|
| `GET /notifications` | 2,838 blk · **5** calls | **121** blk · **3** calls | budget was on `user_id`; 22b's service fix now visible |
| `GET /notifications/unread-count` | 10,234 blk · **4** calls | **16** blk · **2** calls | same |
| `GET /dashboard/personal` | null (vacuous) | **4** | fixture fixed in 22b, then indexed by `ef3c1960` |
| `GET /dashboard/my-issues` | 261 | **13** | `ef3c1960` |
| `GET /inventory/stock/transactions` | 1,388 | **247** | not mine — `f55b9f9e` + fresh statistics |
| `GET /hr/employees` | 1,142 | **571** | not mine |
| `GET /kb/spaces/{spaceId}` | 14 | 61 | fixture no longer near-empty |
| `GET /dashboard/announcements` | 12 | 63 | fixture no longer near-empty |
| `GET /build/{projectId}/tickets` | 19 | 49 | fixture no longer near-empty |
| `GET /leads` | 212 | 253 | fixture; **and the budget is on the wrong table — §Findings** |
| `GET /me/access`, `GET /chat/saved`, `GET /kb/pages/search` | null | 159 / 84 / 128 | the six vacuous fixtures 22b fixed |
| **`GET /me/attendance/history`** | 32 | **199** | **NEW breach — §Findings** |
| **`GET /calendar/events`** | 6 | **1,139** | **NEW breach — §Findings** |

### 3 — `dashboard-personal-my-tasks` kept its ceiling, and `dashboard-my-issues` gained one

`maxScanRows` was **not raised**. It measured **1,801 rows / 1,835 buffers** for as long as the
covering index was absent — the planner took `idx_tickets_org_updated_live (org_id, updated_at DESC)`
for the `ORDER BY` and declined `idx_tickets_org_assignee_status`, which cannot order. The breach was
recorded in the budget as a `KNOWN BREACH` note naming the index that would fix it, and left failing.

`ef3c1960` (migration 1027) then landed exactly that index,
`(org_id, assignee_membership_id, updated_at DESC) WHERE deleted_at IS NULL`. Re-measured with it:
**4 buffers, 19 rows scanned, PASS.** The budget is green because the route was fixed, not because a
number was moved.

**A correction routed to me mid-task said this budget is vacuous rather than breaching, and that the
1,801 rows belong to `dashboard-my-issues` alone. That is an artifact of a stale database, and the
seed fix it asks for is already committed.** Verified rather than accepted:

- `src/scripts/seed-perf-scratch.mjs` at head writes `PROJECT_STATUSES = TODO / IN_PROGRESS /
  IN_REVIEW / DONE` and carries `LEGACY_STATUS_NAMES` to rename a pre-existing database's title-case
  rows in place — the composite FK is `ON UPDATE CASCADE`, so every ticket follows. That landed in
  `3d157c15`.
- Ticket status counts, same tenant, three databases:
  `scratch_t22c` and `scratch_t22b` → `TODO 18125 / DONE 125 / IN_PROGRESS 125 / IN_REVIEW 125`;
  **`scratch_perf_seed` → `Todo 18125 / In Progress 125 / In Review 125 / Done 125`.**
  `scratch_perf_seed` predates the fix and was never re-seeded, so anything measured on it reads
  this budget as vacuous.
- On a seed at head the budget is **not vacuous on any tenant**: `resultRows: 10`, `vacuous: false`
  at 89.93 / 9.00 / 0.90 percent, and the runner reports `0 vacuous` in all three artifacts.
- The 1,801 rows belong to **both** budgets, which is expected — they are the same tenant+assignee
  read, `my-tasks` merely adding a status filter that removes nothing at LIMIT 10. Pre-index,
  measured here: `my-tasks` 1,801 rows / 1,835 buffers, `my-issues` 1,801 rows / 1,844 buffers.

The predicate was **not** retuned to the fixture's vocabulary, and the comment now says that a
vacuous reading here is a stale database rather than a stale predicate, and names the remedy.

**What the correction was right about, and what changed because of it:** `dashboard-my-issues`
declared **no `maxScanRows` at all**, so it walked the identical 1,801 rows and reported PASS —
1,844 buffers sits inside its 2,000 block ceiling. A budget with no scan-rows guard cannot see a plan
regression that stays under its block ceiling, which is exactly the shape an index loss produces.
It now declares `maxScanRows: 200`, and `my-tasks`' 1,000 — 45× above the post-1027 scan, a guard
that had stopped guarding — was **tightened** to 200 as well.

Bite-proved by removing the index, not by argument:

| | index present | index dropped |
|---|---|---|
| `dashboard-personal-my-tasks` | PASS, 19 rows | **FAIL, 1,801 > 200** |
| `dashboard-my-issues` | PASS, 10 rows | **FAIL, 1,801 > 200** |

Post-1027 scan rows across the skew: 19 / 21 / 22 (`my-tasks`) and 10 / 21 / 22 (`my-issues`) at
89.93 / 9.00 / 0.90 percent — 9× headroom under 200.

### 4 — `mail-inbox-cached` named a dropped index

Migration `1022_t29_mail_metadata_search_and_keyset` **dropped `idx_mail_metadata_list`** and created
`idx_mail_metadata_list_keyset (org_id, user_membership_id, folder, date DESC, id DESC)` so the
cached page could be keyset-paged. The budget's comment still named the dropped index and described
it on `user_id`; its SQL ordered by `date DESC` alone, while `MailMetadataService.listCached` orders
by `(date DESC, id DESC)` and selects `id`. Corrected all three, plus `LIMIT` 50 → 51 (`pageSizeField(25, 50)`
so the worst-case page is `limit + 1 = 51`). Measured 29 → 30 buffers on the majority tenant, 2 → 2 on
both minorities: the cost is unchanged, but the budget now measures the plan the cursor depends on.

*(Note for the record: `scratch_t22b` still carried `idx_mail_metadata_list` even though 1022 was
applied to it — the index was recreated after the fact by something outside the migration. It was
dropped in `scratch_t22c` so the measurement describes head.)*

---

## Gates

| command | exit | result |
|---|---|---|
| `run-read-cost-budgets --self-test` | **0** | all 5 breach types detected |
| `run-read-cost-budgets` (89.93%, 200 samples) | 1 | **68 PASS / 3 breaches / 70 of 70 measured (100%)** |
| `run-read-cost-budgets --profile=minority` (9.00%) | 1 | 47 PASS / 1 breach, **48/70 measured**, was 47/70 |
| `run-read-cost-budgets --profile=minority` (0.90%) | **0** | 36 PASS / 0 breaches, **36/70 measured**, PARTIAL |
| `jest --config jest-e2e.json --testPathPattern=route-db-call-budget` | **0** | **5/5**, on `scratch_t22c` |
| `measure-route-budgets --self-test` | **0** | 8 checks |
| `measure-route-budgets … --write` | **0** | 54 written / 2 db-calls / 0 refused / 28 unlinked |
| `check-route-budgets --self-test` | **0** | 22 checks |
| index-drop bite proof on the two dashboard budgets | 1 | **both FAIL at 1,801 rows > `maxScanRows` 200**; index restored, both PASS |
| `check:route-budgets` | 1 | **1 breach: `GET /calendar/events` 1,139 > 500.** The stale `measuredDbCalls: 5` breach is gone |
| `pnpm typecheck` | — | **not run.** Both changed files are `.mjs` / `.json` and are outside `tsc`'s program |
| `pnpm lint`, full `pnpm test` / `test:e2e` | — | **not run** |

`check:route-budgets` now reports `110/570 declared ceilings measured (19.3%)`, up from
`102/570 (17.9%)`; `54/82 route budgets are backed by a read-cost budget (65.9%)`; route-surface
coverage is unchanged at `82/3613 (2.3%)`.

---

## Findings raised, not fixed — all outside this territory

1. **`GET /me/attendance/history` Seq Scans the tenant.** `AttendanceReadService.history` filters
   `attendance.user_membership_id`. The only owner index is
   `idx_attendance_org_user_date (org_id, user_id, date)`; nothing leads with the membership column.
   Measured at 89.93%:
   ```
   Seq Scan on attendance  (rows=17)
     Filter: (org_id = '…0001' AND user_membership_id = 3)
     Rows Removed by Filter: 9991
     Buffers: shared hit=47 read=146
   ```
   193 buffers to return 17 rows, against 9 before the budget was corrected. **This is the same shape
   as `dashboard-personal-my-tasks`: the number is new, the defect is not** — it was hidden because
   the budget measured `user_id`, which still has an index. Needs
   `(org_id, user_membership_id, date DESC)` → `migrations/` + `src/db/schema/**`. Also breaches on
   the 9.00% tenant (900 rows scanned against `maxScanRows` 200).

2. **`GET /calendar/events` — 1,139 buffers against a 500 ceiling**, the one live breach in
   `check:route-budgets`. The budget matches `dashboard-personal.service.ts` predicate for
   predicate, so this is the route. The planner de-correlates the attendee `EXISTS` into a hashed
   SubPlan that materialises **26,077 `event_attendees` rows for 1,127 buffers** before `LIMIT 3` can
   stop anything:
   ```
   Index Scan using idx_calendar_events_org_date  (rows=3)
     Filter: (visibility = 'org' OR ANY (…hashed SubPlan 4…) OR ANY (…hashed SubPlan 8…))
     SubPlan 8 -> Result (rows=26077)  Buffers: shared hit=3 read=1127
   ```
   → dashboard/calendar + schema. **The ceiling was not raised.**

3. **The three CRM read-cost budgets bound tables their modules no longer read.**
   `LeadsReadService.list` and `queryContacts` read `lead_party_map ⋈ business_parties` through
   `LEAD_PARTY_COLUMNS` / `CONTACT_PARTY_COLUMNS`; `leads` and `contacts` are derived mirrors. So
   `leads-active`, `leads-assigned-to-me` and `contacts-list` are the 0520 defect one level up, at
   the table rather than the column. **Deliberately not re-pointed:** measured on the seed at head,
   `lead_party_map` and `contact_party_map` hold **0 rows** and `business_parties.owner_user_id` is
   NULL on all **22,240** rows, while `leads` and `contacts` hold **8,896** each. Moving the SQL today
   would trade a budget that measures the wrong table for one that measures nothing, which is the
   exact failure this ticket exists to remove. The seed must write the canonical side first
   (`test/perf` + `scripts/seed-*`); the column mapping the move will need is recorded in
   `read-cost-budgets.mjs` beside `leads-active`.

4. **`run-read-cost-budgets.mjs`'s tally line mixes units.** `--- Tally: N PASS / M FAIL ---` counts
   budgets on the left and *breaches* on the right, so a budget that trips two guards makes the two
   sum past the declared total (`67 PASS / 4 FAIL` over 70 budgets was three failing budgets, one of
   them twice). Cosmetic, but it reads as an arithmetic error in a gate whose whole job is to be
   believed. That file is not in this territory.

5. **`scratch_t22b` carries an index that head drops** (`idx_mail_metadata_list`, dropped by 1022 yet
   present with 1022 applied). Anything measured on `scratch_t22b` for mail should be re-taken.

---

## Honest gaps

- **No route was timed over HTTP.** Every number here is buffers or statement counts.
  `measuredLatencyP95Ms`, `measuredDownstreamCalls`, `measuredResponseBytes` and `measuredMemoryMb`
  are still null for all 82 budgets. An HTTP harness is being built by another agent
  (`test/perf/route-budget-http-harness.ts`, untracked in the shared tree) — that is what closes
  ticket 22's second box, and it is not this territory.
- **`maxDbCalls` is still a default (10) on 63 of 82 budgets** — 5 counted, 14 estimated. Unchanged
  by this pass; closing it is one call-path read per route, per module owner. That is the first open
  box and it did not move.
- **The 0.18% tenant was not measured.** `test/perf/heavy-query-fixtures.mjs` still knows three
  organizations and the tiny tenant has no notifications at all, so the notification budgets are
  unmeasurable there. Unchanged from report 00 §8.5.
- **`pnpm typecheck`, `pnpm lint`, the full jest and e2e suites: not run.** Both files this ticket
  changed are `.mjs` and `.json`.
- **The `before` figures in §1 are my own measurement**, taken by running the pre-change SQL and the
  post-change SQL side by side on the same database and fixture in the same session — not quoted
  from report 22b, though where the two overlap they agree (22b's 10,234 blocks for
  `notifications-unread-count`, 11,044 for `dashboard-personal-notifications-count`).
- **`dashboard-personal-my-tasks` was measured twice**, once without `ef3c1960`'s index (1,801 rows,
  FAIL) and once with it (19 rows, PASS). The manifest records the second. If that commit is ever
  reverted the budget goes red again — which is no longer a hope: it was proved by dropping the index
  on the measurement copy and watching both dashboard budgets fail, then restoring it.
- **`scratch_perf_seed` is stale and should be rebuilt.** It still holds title-case ticket statuses
  from before `3d157c15`, which makes `dashboard-personal-my-tasks` read as vacuous on it and cost
  one round of mis-routing during this task. Nothing here was measured on it. Rebuilding it is seed
  territory, not this one — the seed *code* is already correct.
