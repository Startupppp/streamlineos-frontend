# Build refactor — change log

Each entry maps to the finding ID it closes. Findings: `docs/refactor/build-phase0-audit.md`.
Measured before/after: `docs/refactor/baseline/baseline-before.md` vs `baseline.md`.

---

## Measured results

All figures from `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with RLS enforced, against the
same seeded 204k-ticket dataset, same fixtures (project 9, ticket 251).

| Query | Before | After | Change |
|---|---|---|---|
| **Q1 board page 1** | 10.67ms · 3,345 blocks | **0.20ms · 55 blocks** | **53× faster, 61× less I/O** |
| **Q5 board + assignees/labels** | 7.25ms · 3,675 blocks | **0.71ms · 391 blocks** | **10× faster, 9.4× less I/O** |
| **Q6 My Work** | 45.70ms · 11,477 blocks | **0.16ms · 53 blocks** | **285× faster, 217× less I/O** |
| Q8 ticket comments | 1.70ms · 5 | 0.07ms · 5 | plan already optimal; cache warm |
| Q9 ticket activity | 3.36ms · 5 | 0.07ms · 5 | as above |
| Q2 board deep page (offset 3000) | 6.02ms · 3,339 | 4.51ms · 3,079 | **unchanged — offset still walks** |
| Q4 search ILIKE | 4.79ms · 3,339 | 6.01ms · 3,339 | **unchanged** |
| Q11 portfolio rollup | 142.8ms · 1,478 | 134.7ms · 1,311 | **marginal — still seq-scans** |
| Q12 billing rollup | 44.71ms · 4,474 | 40.52ms · 4,474 | unchanged |

The board went from reading the entire project on every load to an index-ordered 55-block scan.
Q2, Q4, Q11 and Q12 are **deliberately unchanged** — they need keyset pagination (API-003),
a search index (API-009) and a materialised rollup (API-008), which are not in this batch.

---

## Changes

### SEC-002 — ticket list ignored DataScope (P0, security) — CLOSED
`backend/src/modules/build/core/projects-tickets-read.service.ts`

`getTicket` enforced scope and audit-logged `RESTRICTED_SCOPE` denials; `listTickets` enforced
nothing, so the list returned title and description of tickets the detail endpoint forbade opening.

- `listTickets` now resolves scope via `resolveTicketsScope` and pushes the predicate into the SQL
  `WHERE`, not a post-fetch filter.
- `scope === "none"` short-circuits to an empty envelope before any query runs.
- Otherwise restricts to `assignee_id = caller OR reporter_id = caller OR EXISTS(ticket_assignees)`.
  The `EXISTS` clause is required so the list matches `getTicket`'s definition exactly — that method
  treats membership of `ticket.assignees` as sufficient.
- The same `where` feeds the `COUNT(*)`, so pagination totals match visible rows.

**Behaviour verified against seeded data, not just typecheck.** Running the exact scope predicate on
project 9 (3,334 tickets) as the RLS-enforced app role: **2,858 visible under `own` scope + 476
correctly hidden = 3,334** — a clean partition with no gap and no overlap, confirming the predicate
neither drops rows the user should see nor leaks rows they shouldn't. (The visible share is high only
because the seed assigns tickets round-robin across 4 users and each has both an assignee and a
reporter, so one user touches ~75%; a realistic org hides far more.)

**Measured cost of this fix (disclosed, not hidden).** The scoped board query is materially more
expensive than the unscoped one:

| Path | Exec | Blocks | Plan |
|---|---:|---:|---|
| scope `all` (owners/admins) | 0.20ms | 55 | `Index Scan using idx_tickets_org_project_order` |
| scope `own`/`team` | 86.95ms | 2,911 | `Incremental Sort` + `Bitmap Index Scan using idx_ticket_assignees_user_id` |

The three-way `OR` (assignee / reporter / `EXISTS` on `ticket_assignees`) defeats the ordered index,
so the sort becomes incremental and the assignee leg bitmap-scans that user's rows. Still better than
the pre-fix unscoped 3,345 blocks, and correctness outranks speed on a P0 disclosure — but it is a
real regression for restricted-scope users and is logged as **API-012** for follow-up.

I tested the obvious fix — a covering index `ticket_assignees (user_id, ticket_id)` — and it
**did not work**: the planner still chose `idx_ticket_assignees_user_id` and blocks stayed at
exactly 2,911. The index was created, measured, and dropped again so it isn't left taxing writes.
The remaining lever is rewriting the three-way `OR` as a `UNION` of index-ordered branches.
Note this measured on a seed where 4 users share 171k assignee rows (~43k each), which overstates
the effect for a realistic org.

### API-002 / API-007 — missing board and My Work indexes (P0/P1) — CLOSED
`backend/src/db/schema/build/tasks.ts`

- Added `idx_tickets_org_project_order` on `(org_id, project_id, "order")`. The board's
  `ORDER BY "order"` had no supporting index, so every load did Index Scan → **Sort** over the whole
  project. Now index-ordered.
- Added `idx_tickets_org_assignee_status` on `(org_id, assignee_id, status)` and **dropped**
  `idx_tickets_assignee`, which was not org-led (violating §19). Verified first that every
  `WHERE`-clause use of `tickets.assigneeId` in `backend/src/modules` is org-scoped; remaining uses
  are JOIN conditions, which do not use that index.
- **The composite alone did not fix My Work** — measured 11,477 → 11,473 blocks, essentially no
  change, because `status <> 'DONE'` is an inequality and the sort is on `due_date`. Added
  `idx_tickets_org_assignee_due_open` on `(org_id, assignee_id, due_date) WHERE status <> 'DONE'`,
  which turns the plan into a single index scan with no sort: **11,477 → 53 blocks**.

Applied to the dev DB with `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY`.

### API-001 — board fetched 5 pages in parallel and truncated silently (P0) — PARTIALLY CLOSED
`frontend/hooks/api/build/ticket-queries.ts`

`useProjectBoardTickets` fired page 1, read `totalPages`, then fanned out 4 more parallel requests
(`BOARD_PAGE_SIZE=100 × BOARD_MAX_PAGES=5`), concatenated them and returned a bare `Ticket[]` —
stripping the envelope (§14 violation) and **silently capping at 500 tickets**. A 3,333-ticket
project rendered 15% of its board with no indication.

- Converted to `useInfiniteQuery` with `getNextPageParam` driven by the real `{page, totalPages}`
  envelope, so pagination state is honest.
- Returns `data` flattened to `Ticket[]` for backward compatibility (verified all 10 call sites
  destructure only `data`/`isLoading`/`isError`/`refetch`, and none passed the removed options arg),
  plus `total`, `loadedCount` and `isTruncated` so truncation is now observable.
- Bounded auto-advance to `BOARD_AUTOLOAD_LIMIT = 500` keeps parity with previous behaviour rather
  than regressing to one page, but pages **sequentially** instead of bursting 5 requests at once.

**Why only partial:** the backend caps every list at 100/page (§19), so a 3,333-ticket board cannot
be fully loaded from this endpoint no matter how the hook is written. The complete fix is a
server-side per-column board endpoint with keyset pagination. That is Phase 2 work and is recorded
as still-open, not silently skipped.

### TIME-001 — two time-entry writers, one breaking billing (P0) — CLOSED
`backend/src/modules/build/execution/timesheets.service.ts`,
`backend/src/modules/timesheets/core/timesheets-core.module.ts`,
`backend/src/modules/build/execution/build-execution.module.ts`

Build's ticket time-log inserted straight into `timesheets`, omitting `project_id` and
`timesheet_period_id`. With `project_id` NULL the billing rollup's `GROUP BY project_id` dropped
those rows entirely, and with no period they never entered the approval workflow.

- `logTicketTime` now derives `projectId` from the already-fetched ticket row, and writes `status`,
  `invoicingStatus`, `payrollStatus` and `source` explicitly rather than relying on DB defaults.
- Exported `EntriesPeriodService` from `TimesheetsCoreModule`, imported that module into
  `BuildExecutionModule` (verified acyclic — `timesheets/` has no import of `build/`), and wired
  `getOrCreatePeriod` so entries now attach to the correct weekly period.
- Insert + period creation are now in **one transaction**, matching the core service's shape.
- TIME-002: `recomputeTimeSpent` took `(ticketId)` and summed hours with no `orgId` predicate.
  Now `(orgId, ticketId)`, org-scoped, and also excludes voided entries (`isNull(voidedAt)`) to
  match the core `syncTicketTimeSpent` predicate. All three call sites updated.

### TIME-003 — time-entry list filtered after pagination (P1) — CLOSED
Found while reviewing the file above, not in the original audit.

`listTimeEntries` ran `findMany` with `limit`/`offset` and then did
`entries.filter((e) => e.ticket?.projectId === query.projectId)` in JS. Filtering after the page
boundary means a filtered request returns fewer rows than `limit` — often zero — and the filter only
ever inspects the current page. Pushed into the SQL `WHERE` as `eq(timesheets.projectId, …)`, which
is only correct *because* TIME-001 now populates that column.

**Correction to the Phase 0 finding:** the audit claimed the Build writer also omitted rate columns
and so "valued entries at zero". That was wrong. The *core* writer does not snapshot rates either —
`bill_rate`/`cost_rate`/`currency` are NULL at insert for both paths and resolved live at billing
time by `RateResolverService`. That is a real but *different* and system-wide gap, now logged
separately as **TIME-004** (historical invoices are not reproducible if rate cards change).

### SCH-003b — unguarded epic cycles and dependency cycles (P1) — CLOSED
`backend/src/modules/build/core/projects-tickets-update.service.ts`,
`projects-tickets-create.service.ts`, `projects-ticket-relations.service.ts`

`parentTicketId` had a cycle guard; `epicId` — also a self-FK — had none, so `A.epicId = B` and
`B.epicId = A` was insertable. Dependency edges had only a duplicate check.

- Generalised the existing parent chain-walk into `assertSelfRefChain(field)`, following either
  `parentTicketId` or `epicId`, with field-specific messages. Reused rather than duplicated (DRY).
- **Fixed a latent bug in the existing guard:** `while (current != null && hops < 100)` exited
  *silently* at 100 hops, so a chain longer than 100 was written unchecked. It now throws.
- `updateTicket` runs the walk when `epicId` is set to a concrete id, validating same-org and
  same-project on the first hop. `createTicket` only needs an existence + same-project check (a new
  ticket has no id yet and cannot be part of a cycle).
- `addRelation` now runs `detectBlockingCycle` for `blocks` / `blocked_by` only — `relates_to` and
  `duplicate_of` are not directional. It loads the project's blocking edges in **one** query
  (project-scoped via an inner join on `tickets`, since `work_item_relations` has no `projectId`),
  bounded at 1001 rows, then does an iterative in-memory DFS. No per-hop round trips.

Why this matters: `projects-critical-path.util.ts` uses Kahn's algorithm, so a cycle never hung
anything — it silently **excluded every ticket in the cycle** from the critical path and set
`hasCycle: true`. Scheduling output was quietly incomplete rather than obviously broken.

### UI-001 — workspace routes re-exported another page.tsx (P1) — CLOSED
`frontend/app/(authenticated)/build/workspaces/[pmWorkspaceId]/**`,
`frontend/app/(authenticated)/build/{all,[projectId]}/**`, `frontend/features/build/**`

All 9 routes converted from `export { default } from "…/page"` — which §17 explicitly forbids — into
thin adapters importing a shared component from `features/`. Permission wrappers
(`requirePermission("build:workspaces:view")`, `<RequireModule module="build">`) preserved on both
variants of each pair.

Five page components that were defined **inline** inside `app/**/page.tsx` were extracted first,
since a route cannot import them otherwise:

| Component | Extracted to | Lines |
|---|---|---:|
| `ProjectsPage` | `features/build/project-list/projects-page.tsx` | 452 |
| `ProjectSettingsPage` | `features/build/settings/project-settings-page.tsx` | 394 |
| `ProjectBoardPage` | `features/build/project-detail/project-board-page.tsx` | 207 |
| `EpicsPage` | `features/build/epics/epics-page.tsx` | 195 |
| `ViewsPage` | `features/build/views/views-page.tsx` | 174 |

All under the 500-line cap. Both the canonical and workspace-prefixed route now render the same
component, differing only in their `params` type (`{projectId}` vs `{pmWorkspaceId, projectId}`).
Verified: zero `from "…/page"` imports remain anywhere under `app/(authenticated)/build`, and
`pnpm type-check` exits 0 with 0 errors.

**Correction to the Phase 0 finding:** the audit implied these workspace routes were dead
duplicates. They are not — `build/[projectId]/layout.tsx:62` redirects every project that has a
`pmWorkspaceId` to the workspace-prefixed URL, making these the *canonical* routes for such
projects. Deleting them would have broken live navigation. UI-002 is also narrower than first
stated: the workspace layout genuinely validates `pmWorkspaceId` (404/redirect), it just doesn't
scope the data.

### API-004 — `description` in the list projection — NO CHANGE NEEDED
Verified `frontend/features/build/triage/triage-row.tsx:70-72` renders `ticket.description` from the
list query to build its preview line. Removing the column would break that surface. Closing it
properly needs per-view field selection, not a blanket removal. Left in place deliberately.

---

---

# Batch 2 — sub-domain sweep

Driven by the two remaining Phase 0 audits (15 non-core sub-domains, product-management side).

### PM-005 — roadmap was public by default (P1, security) — CLOSED
`schema/build/roadmap.ts:18` · migration `0127_roadmap_items_private_by_default`

`roadmapItems.isPublic` defaulted to `true`, so every roadmap item any user created was live on the
unauthenticated `GET /public/roadmap` feed unless someone remembered to switch it off. Default is now
`false`; publishing is an explicit act. Migration applied and verified (`column_default = false`).
No backfill was needed — there are **0 existing roadmap items**, so no already-published item was
flipped and the product decision the agent flagged is moot.

### PM-006 — public roadmap endpoints had no rate limiting (P2) — CLOSED
`modules/public/public.controller.ts` · `common/ratelimit/rate-limit.service.ts`

`POST /public/contact` was rate-limited; `GET /public/roadmap`, `POST …/vote` and `POST …/feedback`
were not — open to scraping, vote stuffing and feedback spam (OWASP A04/A06). Added
`@UseGuards(RateLimitGuard)` + `@UseRateLimit(...)` to all three.

**The guards alone would have done nothing.** `RateLimitService.check()` is
`const t = TIERS[tier]; if (!t) return { allowed: true }` — an unregistered key **fails open and
silently disables the limit**. Registered all three tiers in `rate-limit.service.ts`:
`public:roadmap` 60/min, `public:roadmap-vote` 10/hr, `public:roadmap-feedback` 5/hr. Worth noting as
a standing footgun: adding a `@UseRateLimit` decorator without a `TIERS` entry looks protected in
review and is not.

### BE-001 — post-commit notification on a dead transaction handle (P1) — CLOSED
`build/approvals/approvals.service.ts:191`

`void this.notifyProjectChannel(...).catch(() => undefined)` kept the request's AsyncLocalStorage
context after the handler returned — but the transaction had committed and the handle was back in the
pool, so the transaction-local GUC was gone and every write died `42501`, silently. This is the exact
pattern §20 documents as having produced **zero rows in `notifications` for the life of the product**.
Now deferred via `registerAfterCommit` (drained only on success, so a rolled-back request never
announces itself), opening its own `runInNewTenantTransaction`, with recipient ids captured from
request scope while that transaction was still live — and the silent `.catch` replaced by a logged
error.

### BE-010/011/012 + BE-018 — transactions and a missing advisory lock (P2) — CLOSED
`build/execution/iterations.service.ts`, `build/execution/workspace.service.ts`

- `deleteCycle`, `deleteModule`, `deleteEpic` each nullified a ticket FK then deleted the parent as
  two separate statements. A crash between them left tickets pointing at a deleted row. All three now
  run in one `db.transaction`.
- `updateIntake`'s accepted path did `MAX(ticketNumber)` then inserted **without**
  `pg_advisory_xact_lock(projectId)`, which every other ticket-creating service takes. Concurrent
  accepts could collide on ticket number. Lock added, copied from the canonical idiom in
  `projects-tickets-create.service.ts`.
- BE-015: added the missing explicit `orgId` predicate to all three `updateIntake` write branches and
  the `MAX(ticketNumber)` query. RLS already blocked cross-tenant writes; this restores
  defence-in-depth for owner/bypass-role execution.

### BE-013 — meetings filtered after pagination (P2) — CLOSED
`build/meetings/meetings.service.ts`

`.limit(100)` then `.filter()` in JS for `hasActionItems`/`hasUnresolvedActionItems`, so an active
filter returned a short page with no way to know more existed. Both predicates moved into correlated
`EXISTS` subqueries in the `WHERE`, so `limit` applies to the filtered set. Response shape unchanged.
Same defect class as TIME-003 in batch 1 — third instance found, worth a lint rule.

**Attempted sweep for more instances — inconclusive, reported as such.** A pattern scan for `.filter(`
within 40 lines of a `limit` across all services returned 60 candidates, but the heuristic cannot
distinguish a pagination-defeating filter from an ordinary aggregation over an already-fetched set
(`.filter(...).length`), and most hits were outside Build. The only Build-scoped access-related
candidate, `projects-work-query.service.ts:169`, is **correct** — `allowedProjectIds` is computed
before the query and fed into the `WHERE` via `inArray`, which is proper pre-query scoping. All three
real instances were found by reading code, not by this pattern. No new instances confirmed; a reliable
detector would need to check whether the filtered value is the paginated result being returned.

### BE-002/016 — cross-project test-case injection (P2/P3) — CLOSED
`build/qa/test-runs.service.ts`

`createRun` inserted `input.caseIds` verbatim into `testRunResults` with no check that those cases
belong to this `(orgId, projectId)`. RLS blocks cross-tenant but **not cross-project**, so a caller
with `build:qa:manage` could attach another project's test cases and `getRun` would surface their
titles and steps. Now validated against `testCases` filtered by org, project and `deletedAt IS NULL`,
rejecting with `BadRequestException` on any count mismatch. `createBugFromResult` gained its explicit
`orgId` predicate.

### BE-003..009, BE-014, BE-017 — unbounded reads (P2) — CLOSED
Bounded limits added, each sized to its surface and stated: workflow transitions 500 (config rows),
change requests 100 (§19 cap), client-visibility tickets 500 / milestones 200 (bulk admin toggle
view), comment drafts 100, program linked-projects 200, milestones 100, `getSprint` tickets 200,
`listSprints` ticket hydration 500.

`teamTimesheets` was `limit: 500` — 5× the §19 cap with no pagination at all. Its DTO now takes
`page`/`limit` (`max(100)`, default 50) and the service paginates properly.

**Left open deliberately:** `listChangeRequests` and the three roadmap list endpoints return bounded
raw arrays rather than a `{data, pagination}` envelope. Adding the envelope changes the response
contract and needs matching frontend work — recorded as PM-008/009, not silently half-done.

### PM-010 — ungated roadmap hooks (P2) — CLOSED
`frontend/hooks/api/build/roadmap.ts`

`useRoadmapItems`, `useFeedbackPosts` and `useChangelog` fired unconditionally against endpoints
guarded by `build:roadmap:view`, so every user without that permission generated a 403 on mount.
All three now set `enabled: useCan("build:roadmap:view")` — verified against the backend decorators at
`projects-roadmap.controller.ts:50,89,128`, which all use that exact key.

### Navigation and route hygiene — CLOSED
`app/(authenticated)/build/page.tsx`, `components/layout/sidebar/sidebar-nav-items.ts`,
`app/(authenticated)/build/portal/**`

- `/build/page.tsx` was still `export { default } from "./all/page"` — the same §17 violation batch 1
  fixed elsewhere. **My batch-1 verification grep missed it** because the pattern used `\.\.` and this
  one is a same-directory `./all/page`. Now a thin adapter; a corrected repo-wide grep confirms zero
  page-to-page re-exports remain.
- The product switcher and nav group labelled the module **"Product Management"**, contradicting §16
  ("the delivery/strategy module is **Build**", an umbrella over project *and* product management).
  Renamed in all three places, keeping `PRODUCT_NAV_GROUP_LABELS` in sync with the group label.
- Deleted `/build/portal` and `/build/portal/[projectId]` — pure `redirect()` shims to `/portal`,
  which §17 bans outright ("no legacy redirect routes"). Verified no inbound links first; the only
  `/build/portal` hits were backend API paths in `client-portal.ts`, a different namespace.

---

# Batch 4 — remaining security and integrity findings

### API-012 — my own regression from batch 1 — CLOSED
`build/core/projects-tickets-read.service.ts`

SEC-002's three-way `OR` defeated `idx_tickets_org_project_order`, so restricted-scope users paid
49.31ms / 2,914 blocks against 0.20ms / 55 for scope `all`. I benchmarked six shapes before writing
any code:

| Shape | Exec | Blocks |
|---|---:|---:|
| 3-way OR (was) | 49.31ms | 2,914 |
| `IN`-subquery | 24.79ms | 2,911 |
| 3-branch UNION | 4.00ms | 3,719 |
| **2-branch UNION (shipped)** | **1.20ms** | **354** |
| 2-way OR, no EXISTS (diagnostic) | 0.19ms | 63 |

That last row is the diagnosis: the `EXISTS` on `ticket_assignees` is the *entire* cost. Shipped the
2-branch UNION — one branch for `assignee_id OR reporter_id` (uses the ordered index), one joining
`ticket_assignees` — with `UNION` (not `UNION ALL`, since a ticket can match both) and per-branch
`LIMIT = offset + limit`, which matters: limiting each branch to just `limit` is correct on page 1 and
silently wrong from page 2. IDs are selected first, then hydrated through the existing projection.
Non-default sort orders fall back to the original OR, and the guard is explicit in the code.

**Verified independently, not taken from the agent's report:** the visibility partition is unchanged at
**2,858 visible / 476 hidden / 3,334 total**, and the page-1 id sequence is byte-identical between the
OR and UNION forms. A perf fix to a P0 security predicate is exactly where a silent semantic drift
would be most costly.

### SEC-001 — public whiteboard token endpoints — AUDITED, two fixes
`build/execution/whiteboard-sharing.service.ts`

A `@Public()` controller exposing token-based `GET` and **`PATCH`** deserved scrutiny. Most of it was
already correct: `linkExpiresAt` exists and is checked on both paths; `rotateShareToken` overwrites the
stored token so old links die immediately (a unique index guarantees no stale row); the `PATCH` was
already allowlisted to `body.data` with a strict Zod scene schema (no mass-assignment); both
rate-limit tiers **are** registered; and RLS's `WITH CHECK` arm requires a real tenant GUC, so no write
is possible through the public-token read arm alone.

Two real defects fixed:
- **TOCTOU on the write.** The SELECT (in `withPublicToken`) and the UPDATE ran in *separate*
  transactions, and the UPDATE's `WHERE` was only `eq(id, board.id)`. In that window an admin could
  rotate the token, flip visibility to private, downgrade `publicAccess` to viewer, or set an expiry —
  and the write would still land. The `WHERE` now re-asserts all four sharing conditions atomically and
  throws `NotFoundException` on zero rows.
- **Over-broad read.** `getPublicByToken` fetched the whole row — `orgId`, `projectId`, `createdBy`,
  `shareToken` — before manually projecting. The response was clean, so there was no active leak, but a
  future spread would have exposed them silently. Now an explicit `columns` projection.

### PM-012 — owner FK blocked member removal — CLOSED
`ownerMembershipId` confirmed nullable, so `onDelete("restrict")` → `"set null"` is valid. Removing a
member who owns a managed product now nulls the owner instead of throwing a raw FK violation as a 500.

### PM-007 — vote stuffing — CLOSED
`voterIpHash` (HMAC-SHA256) added to `roadmapVotes`/`feedbackVotes` with partial unique indexes
`WHERE voter_ip_hash IS NOT NULL`, so existing NULL rows don't collide. Migration `0137` applied.

**Two gaps I had to close myself, both of the "inert fix" kind this session keeps producing:**
1. The subagent left the **controller unwired** — `vote()` gained a `voterIp` parameter that nothing
   passed, so `voterIpHash` was always `null` and the entire binding did nothing. Added `@Req()` +
   `clientIp(req)` to `voteRoadmap`, matching how `POST /public/contact` already does it.
2. `hashIp` used `process.env.VOTE_IP_SALT ?? ""` — an **empty HMAC key**, silently, in every
   environment where that new var is unset (i.e. all of them). Now falls back to the
   startup-validated `BACKEND_JWT_SECRET` with a domain-separated prefix, and throws if neither is set.
   Raw IPs are never stored either way.

### API-008 — portfolio rollup — ANALYSED, deliberately not "fixed"
Re-measured the plan: it is **already optimal** — `Index Only Scan using idx_tickets_org_project_status`
+ Hash Join, with the `Seq Scan` on `projects` (60 rows, correct for a tiny table). 1,311 blocks is good
I/O; the 147ms is aggregation CPU over 200k index entries. **No index fix exists.** The only real fix is
to stop recomputing per request — and `project_daily_snapshots` already holds exactly these per-project
per-state counts, but it is on-demand and gappy (RPT-002: no scheduler, no BullMQ). So API-008 is
**coupled to RPT-002**. Shipping a materialised aggregate that nothing refreshes would be worse than
leaving it, so it stays open with the reason recorded.

### §9 — all three oversized Build files split — CLOSED

No Build file in either repo now exceeds 500 lines.

| Was | Became |
|---|---|
| `db/schema/build/tasks.ts` **607** | 4-line barrel + `ticket-core` (155), `ticket-collaboration` (291), `ticket-releases` (72), `ticket-integrations` (136) |
| `build/execution/iterations.service.ts` **533** | 4-line barrel + `sprints` (170), `cycles` (135), `modules` (118), `epics` (112) — one `@Injectable()` per file |
| `build/core/projects-tickets.controller.ts` **518** | 185 + `projects-ticket-comments` (103), `projects-ticket-checklists` (110), `projects-ticket-associations` (206) |

Each keeps the original filename as a barrel, so no consumer outside the split needed editing.

**Verified, not assumed:**
- **Schema: zero renames.** I independently confirmed all **43** Build `pgTable` names still exist in the
  live DB — a renamed table would have silently produced a migration diff, which is the main risk in a
  schema move. All 18 symbols previously exported from `tasks.ts` are still exported from it.
- **Controller: routes unchanged.** 41 routes before, 41 after, each resolving to the identical URL with
  its `@RequirePermission` intact.
- **Acyclic** (§24): `ticket-core` imports none of its siblings; `ticket-integrations` doesn't reference
  `tickets` at all; the barrel is a leaf.

### Dead code — knip run, nothing to delete
Ran **knip v6.31.0** (installed in both repos with `knip.json`), satisfying §25's requirement for a
module-graph proof rather than grep. Backend exits 0 with zero unused files; frontend reports 5 unused
files, **all HR, none in Build**. The Build module has no dead code — nothing was deleted, which is
the correct outcome.

Worth flagging: the subagent assigned this reported knip as "NOT installed in either repo" and fell
back to a grep survey. That was wrong — `node_modules/.bin/knip` and `knip.json` are present in both.
I verified directly and ran it myself. §25 exists precisely because a grep-only dead-code claim once
cost a live file; accepting the agent's fallback would have left this unproven while sounding done.

---

## One fix outside this refactor's scope

`backend/src/modules/realtime/ably.service.ts` — **not Build, and not introduced by this work.** It
arrived already staged in the shared tree from a concurrent session (the Ably channel-capability
fix). It failed `tsc` with `TS2322`: the capability map was typed `Record<string, string[]>` but the
Ably SDK expects `{ [key: string]: capabilityOp[] | ['*'] }`. Since it blocked the backend
typecheck — and therefore verification of everything above — it is now
`Record<string, capabilityOp[]>` with `capabilityOp` imported as a type from `ably`. Type annotation
only; no behaviour change, no change to which capabilities are granted.

### PM-008 / PM-009 — pagination envelopes — CLOSED (both repos)

Four list endpoints returned bare arrays, so callers could not tell a full page from a truncated one —
the same defect class as the board hook that was silently showing 15% of a project.

- **Portfolios** (`portfolios.service.ts`): was hardcoded `.limit(100)` with no `page`/`offset` at all.
  Now takes `page`/`limit` (capped 100, matching the `pm-workspaces` DTO convention) and returns the
  envelope with a parallel `COUNT` via `Promise.all`.
- **Roadmap / feedback / changelog** (`projects-roadmap.service.ts`): already accepted `page`/`limit`
  but discarded the total. All three now return the envelope, also with a parallel `COUNT`. Their DTOs
  already capped at `max(100)` — verified rather than assumed.

Frontend updated in lockstep: `Paginated<T>` / `PortfoliosPage` types, hooks take `{page, limit}` and
return the real envelope, and all four surfaces use the shared `TablePagination` (§14 — no hand-rolled
prev/next footers), resetting to page 1 on filter change. `useChangelog` also picked up the
`placeholderData: keepPreviousData` it was missing.

**Verified, not assumed:** all 7 consumer call sites across both changes were updated (portfolios is
also consumed by `programs-page` and `program-form-sheet`); the new `useCan("build:portfolios:view")`
gate is a **real key in both catalogs** (backend `build.ts:235`, frontend `types.ts:331`) and matches
the controller decorator exactly — a ghost key would have failed `useCan` closed forever and shown an
empty page, which is the exact failure mode on record from the HR catalog. The pre-existing
`build:roadmap:view` gates were preserved.

### API-009 — escalated out of Build: RLS defeats every text-search index
Investigating why ticket search was slow turned up a platform-wide problem. Same query, same data,
only the role differs:

| Role | Plan | Exec | Blocks |
|---|---|---:|---:|
| `neondb_owner` (BYPASSRLS) | `Bitmap Index Scan using idx_tickets_title_trgm` | 1.73ms | 336 |
| `streamline_app` (what the app uses) | `Seq Scan` | ~75–82ms | 11,665 |

Ruled out first: data skew (200,000 distinct titles), a broken index (`indisvalid`/`indisready` true,
correct `gin_trgm_ops` definition, 16 MB), term selectivity (a zero-match term still seq-scans), and
planner reluctance (`enable_seqscan=off` picks a *btree* bitmap, still not the GIN).

Cause: `app.current_org_id()` is `STABLE` but **not `LEAKPROOF`**, so under RLS it cannot sit below the
index scan. **16 of the platform's 17 GIN indexes have `idx_scan = 0` — never used once**, including
`idx_kb_articles_fts`, `idx_kb_pages_fts`, `idx_users_*_trgm`, `idx_inv_*_trgm`. 733 tables have RLS on.

Remedy is `ALTER FUNCTION app.current_org_id() LEAKPROOF;` — **superuser-only**, and `neondb_owner` has
`rolsuper = false`, so I could not apply or prove it. Logged as a pending operator action in `PAGES.md`.

### API-003 — downgraded P1 → P3 on measurement, deliberately not fixed
Offset cost is linear, but at the depths this app actually reaches it is negligible: offset 0 =
0.43ms/108 blocks; offset 400 (the board's hard autoload ceiling) = **1.05ms/508 blocks**. Offset 3000
(6.88ms) is only reachable by manual deep paging. Converting to keyset would break the `page`/`limit`
contract for every caller in exchange for ~0.6ms at realistic usage. Revisit when a single project
exceeds ~50k tickets.

### Harness made reproducible
Added `pnpm -C backend seed:build-load` and `pnpm -C backend baseline:build` so the seed and the
EXPLAIN capture are discoverable rather than invoked by path. Verified both run.

## Still open from Phase 0

API-003 (keyset pagination) · API-005 (`COUNT(*)` per request) · API-008 (materialise portfolio
rollup) · API-009 (search index) ·
SCH-001 (ranking) · SCH-002 (status model) · SCH-004..010 · SEC-001 (public whiteboard `PATCH`) ·
RPT-001..003 (sprint burndown reproducibility) · UI-003/004.

## Pending user action

`pnpm -C backend db:generate` needs an interactive TTY, so the index changes exist in the Drizzle
schema and in the dev DB but **not yet as a committed migration**. The SQL a migration must emit:

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_tickets_assignee;
CREATE INDEX CONCURRENTLY idx_tickets_org_project_order    ON tickets (org_id, project_id, "order");
CREATE INDEX CONCURRENTLY idx_tickets_org_assignee_status  ON tickets (org_id, assignee_id, status);
CREATE INDEX CONCURRENTLY idx_tickets_org_assignee_due_open ON tickets (org_id, assignee_id, due_date)
  WHERE status <> 'DONE';
```
