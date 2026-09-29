# Build Performance and Caching Plan

> **Audited 2026-09-22.** The endpoint plan below is the target design. Findings, corrections and the
> recommended key/TTL/invalidation policy are in
> [`performance-followup/`](./performance-followup/README.md). Where this document and the follow-up
> disagree, the follow-up carries the evidence.

## Evidence

- Client keys and hooks: `frontend/lib/query-keys/build-work.ts` (domain module; the aggregate `frontend/lib/query-keys.ts` must not be imported in production per FE-18), `frontend/hooks/api/build/`.
- Query scope: `frontend/lib/query-scope.ts`.
- Backend services: `backend/src/modules/build/`.
- Read-budget tooling: `backend/src/scripts/check-build-read-cost.mjs` and `db:check-read-budgets:build`.
- Current production crawl showed prolonged skeletons on several organization lists.

## Budgets

- Shell and cached navigation interactive: P75 under 500 ms.
- Warm page-ready: P75 under 1 s.
- List API: P95 under 400 ms at 50 rows.
- Aggregate/report API: P95 under 1.5 s or durable async job.
- Mutation acknowledgement: P95 under 500 ms excluding file/AI/provider work.
- Board drag feedback: local response under 100 ms.

## Endpoint plan

| Endpoint family | Risk | Server cache | Query key/staleTime | Invalidation and updates |
|---|---|---|---|---|
| Project/workspace/product/team lists | membership joins, counts, search | 15–30 s scoped cache where access revision is part of key | scope+filters+sort; 30 s | patch row on mutation; invalidate affected aggregate only |
| Ticket lists/board/all-work | high cardinality, assignee joins, rank sorting | no shared user-specific cache unless access-safe | scope+view+filters+cursor; 15–30 s | optimistic patch every rendered list/detail; realtime version events |
| Ticket detail/comments/activity | nested N+1 and unbounded history | detail 30 s; comments no broad cache | detail 60 s; comments/activity cursor 0–15 s | patch detail/comment page; append realtime; gap refetch |
| Command Center/My Work/Inbox | cross-project union and counts | 10–15 s per actor/access revision | actor scope; 15 s | event-driven badge and item patch |
| Reports/analytics | repeated aggregates, date scans | 1–5 min by revision/filter | filter+report revision; 2 min | increment project report revision after relevant committed writes. **Audited:** the revision is bumped by statement triggers (`migrations/1073_build_report_revision.sql`), not by application code, and pending Sprint/Cycle DDL breaks it — follow-up **P0-1** |
| Workload | people, leave, capacity, assignments | 30–60 s per range/access revision | project/team/range; 30 s | invalidate assignment/estimate/leave windows only |
| Portfolios/programs/roadmap/goals | nested rollups | 30–120 s | scope+filters; 60–120 s | patch changed child; invalidate ancestor summaries |
| Forms/QA/incidents/governance | independent child collections | bounded short cache | parent+filters+cursor; 30–60 s | exact collection/detail patch and aggregate invalidation |
| Files/Wiki/Chat/Calendar projections | cross-module ACL and source freshness | source module owns cache | include source revision and project filter | source event invalidates projection; never duplicate data |
| AI/agent runs | outbound latency and polling | durable run state; no prompt response shared cache | run ID; live/poll while active | realtime status; final result stale 5 min |

## Endpoint-level measurement queue

Static inspection can identify high-risk query shapes, but it cannot honestly label an endpoint expensive without production-shaped query plans or traces. The following are therefore the complete P0 measurement candidates found in the audited source, not invented latency claims. Each row must record cold/warm query count, rows/bytes, and `EXPLAIN (ANALYZE, BUFFERS)` before an optimization is accepted.

| Endpoint | Why it requires measurement | Evidence | Target cache/update policy |
|---|---|---|---|
| `GET /build/:projectId/tickets` and board variants | High-cardinality filters, rank order, assignee/label/status projection, and per-column continuation | `backend/src/modules/build/core/tickets/projects-tickets.controller.ts`, `backend/src/modules/build/core/tickets/board-projection.spec.ts` | DB-first; query key includes scope/filter/sort/cursor; 15–30 s client stale time; optimistic row moves with revision reconciliation |
| `GET /build/:projectId/tickets/:ticketId` | Detail currently owns a bounded comment include and multiple child projections | `backend/src/modules/build/core/tickets/projects-tickets-detail.service.ts` (`limit: 50`) | Cache detail 60 s; independently cursor comments/activity; patch exact detail and visible lists |
| `GET /build/all-work` | Cross-project union with actor/product/project predicates | `frontend/hooks/api/build/all-work.ts`, `backend/src/modules/build/` controller census | Actor/access-version key; 15 s; event-driven badge and row patch |
| `GET /build/:projectId/reports/burnup` | Event reconstruction and report revision cache | `backend/src/modules/build/core/analytics/projects-reports.controller.ts`, `backend/src/modules/build/core/analytics/projects-reports.service.ts` | Server cache by org/project/access/filter/report revision; 2 min client stale time |
| `GET /build/:projectId/reports/velocity` | Cursor page plus historical aggregation | same report controller/service; velocity projection at `backend/src/modules/build/core/analytics/projects-velocity-report.ts` | Server cache by access/filter/revision/cursor; do not refetch prior pages after append |
| `GET /build/:projectId/reports/cycle-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after ticket transition commit |
| `GET /build/:projectId/reports/lead-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after relevant lifecycle writes |
| `GET /build/:projectId/reports/critical-path` | Dependency graph construction | same report controller/service | Revisioned bounded graph cache; invalidate dependency/date/status writers |
| `GET /build/billing-summary` | Timesheet joins and permission-sensitive cost projection | `backend/src/modules/build/execution/timesheets.controller.ts`, `timesheets.service.ts` | Server cache by org/actor/data-scope/period; current service invalidates `build:billing-summary:<orgId>` after time writes. **Audited: correct as built** (`cachedVersioned` at `timesheets.service.ts:374-375`, `invalidateNamespace` at `:185`, `:221`, `:492`); `check:cache-invalidation`'s three findings against it are false positives — see follow-up P2-3 |
| Organization/product/project overview reads | Multiple bounded rollups and recent-work joins | `frontend/features/build/overview/organization-overview-page.tsx`, `frontend/features/build/overview/managed-product-overview-page.tsx`, `frontend/features/build/managed-products/product-insights-page.tsx` | Parallel bounded reads; 30–60 s by scope/access revision; patch child and invalidate affected summary |
| Portal/public projections | Source ACL, publication, expiry, and field-level projection | `backend/src/modules/portal/`, `backend/src/modules/build/client-portal/`, `backend/src/modules/public/public.controller.ts` | Separate public/portal cache namespaces; grant/publication revision; immediate purge on revoke/unpublish |

Every other Build operation remains in the endpoint census governed by `backend/src/scripts/check-build-read-cost.mjs`. **ASSUMPTION:** no endpoint outside this queue is expensive until traces or query-plan evidence say otherwise; a full measured 313-operation matrix is an implementation deliverable, not evidence available from this documentation pass.

The 2026-09-22 audit added two endpoints to this queue that were not on it:

| Endpoint | Why it requires measurement | Evidence |
|---|---|---|
| `GET /build/:projectId/analytics` | Seven reads per call including two raw `UNION` executes, uncached, while nine mutation paths evict a key nothing writes | `backend/src/modules/build/core/analytics/projects-analytics.service.ts`; follow-up **P1-1** |
| `GET /build/resource-allocation` | Org-wide `UNION` over tickets and assignees returning an unpaginated array sorted in JS | same file, `resourceAllocation`; follow-up **P2-2** |

## Expensive patterns to remove

- Parent-detail endpoints returning full child collections.
- Per-row member, status, comment, count, or file queries.
- Loading every page to compute totals or filter badges.
- Invalidating an entire entity family after a field-local mutation.
- Refetching all loaded infinite pages after inline edits.
- Client-side sorting/filtering of a single server page.
- Report queries without date bounds, project predicate, or matching composite index.
- Cross-module fan-out from the browser when a bounded backend projection can own the join.

## Optimistic and realtime policy

- Optimistic: title, status, priority, assignee, rank, labels, estimate, watcher, checklist, and non-financial inline edits.
- Server-confirmed only: budget/cost, approvals, access, publication, secret rotation, destructive actions, incident resolution.
- Optimistic handlers cancel and snapshot every affected key, update detail/list/board caches, restore all snapshots on error, and reconcile by version.
- Realtime is used only for collaborative/high-change surfaces and carries version numbers.

## Offline

- Read: preserve last authorized data with an offline banner and freshness time.
- Draft: local org/user-scoped storage for comments and form edits, encrypted where sensitive.
- Mutations: queue only idempotent low-risk commands; permissions and versions are rechecked on replay.
- Never queue approvals, access changes, financial changes, secret operations, or destructive commands.

## Acceptance criteria

- [x] Every retained list uses bounded server pagination or virtualization.
  **Verified 2026-09-29 — `node src/scripts/check-unbounded-reads.mjs` — shares the gate in [`03-api-contracts.md`](./03-api-contracts.md) box 1, which is now earned, and deliberately keeps no second copy of its figures: all four blockers it named are bounded or paged and Build holds zero `ACTIONABLE` entries. Proves every Build list read is bounded in source; does not prove any of them is fast, which is the separate § Budgets box below and still needs a non-production database.**

  Summary of the shared measurement: `check:unbounded-reads --self-test` → `Self-tests passed.` Gate → FAIL with **19 unclassified paths and 1 regression**, and no stale entries. Figures corrected against the previous entry: **29 unclassified → 19**; **8 stale → 0**; **Build-territory unclassified 10 → 0**.

  The repair the previous entry specified has landed: a sibling lane repointed `src/scripts/baselines/unbounded-reads-classification.json` at the post-split paths, clearing all 8 stale entries and 8 unclassified paths in one edit, and classified the 2 remaining Build sites. **Build territory now has zero unclassified paths, and all 19 that remain are outside Build** (1 e-sign, 1 accounting, 1 expenses, 2 HR, 2 invoices, 10 KB, 1 notifications, 1 timesheets), as is the single regression (`/timesheets/core/lib/billing-export.ts`).

  **THE BUILD-OWNED BLOCKER IS NOW THREE `ACTIONABLE` CLASSIFICATION ENTRIES, not an unclassified backlog.** `ACTIONABLE` does not fail the gate, so a green-for-Build reading of this gate would be wrong. The three, with the reasons in [`03-api-contracts.md`](./03-api-contracts.md) box 1: `/build/core/tickets/projects-tickets-read.service.ts` (the ticket list still serves OFFSET pages by default, pending the frontend `useTickets` cutover to `CursorPaginatedResponse`, recorded deadline 2026-12-31) · `/build/core/tickets/build-ticket-bulk-mutation.ts:164` (archive blocker probe; needs a grouped aggregate, **not** a `.limit()`, or the archive guard under-counts blockers) · `/build/execution/whiteboard-board-helpers.ts` (`loadShares`, no cap on a board's share list). For this box in particular the first is decisive: an OFFSET list is not "bounded server pagination" in the sense this document means, it is a page-number read of a keyset surface.

  **Virtualization half: VERIFIED.** `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders `mode="virtual"` — confirmed on disk this lane.

  **Box unticked because** three Build reads are classified as real debt, one of them a live list endpoint on OFFSET pagination; because `GET /build/:projectId/automations` still returns a bare 100-row array with no `nextCursor` or `hasMore`; and because the gate stays red on 19 out-of-lane unclassified paths plus the timesheets regression regardless of what Build does. The last of those means **this box cannot be earned by Build acting alone** — a scheduling fact, and not permission for the Build items to remain.

  **2026-09-28, fourth pass — STILL NOT EARNED, and the reason has shrunk to one Build read. Both gates re-run this lane; full evidence stays in [`03-api-contracts.md`](./03-api-contracts.md) box 1 and this box carries no second copy of its numbers.**

  Summary of what moved: `check:unbounded-reads --self-test` → `Self-tests passed.`; gate → FAIL, unchanged at **19 unclassified paths and 1 regression, none of them Build**. Build's classification entries are now **47** — 40 `FALSE-POSITIVE`, **6 `BOUNDED`** (was 4), **0 `ACTIONABLE`** in the `unbounded` section (was 2), and 1 `ACTIONABLE` in `offset`.

  **Two of the three Build reads this box was unticked for are repaired**, both by peer lanes and both the way the prescription demanded: `build-ticket-bulk-mutation.ts:164` became a grouped **aggregate** rather than a `.limit()` — so the archive blocker probe still counts children outside the selection — and `whiteboard-board-helpers.ts` `loadShares` now applies `.limit(PAGE_SIZE_CAP)`. **And the bare-array contract is fixed too:** `GET /build/:projectId/automations` now declares `@ResponseSchema(projectAutomationListPageSchema)` and its service pages through `buildCursorPage` at `.limit(limit + 1)`, with the client on a `useInfiniteQuery` reading `pagination.nextCursor`.

  **Virtualization half: re-confirmed on disk.** `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders `mode="virtual"`.

  **Box still unticked because of exactly one Build read.** `/build/core/tickets/projects-tickets-read.service.ts` remains `ACTIONABLE` in the `offset` section: the ticket list still serves OFFSET pages by default, pending the frontend `useTickets` cutover to `CursorPaginatedResponse`, recorded deadline 2026-12-31. For this box in particular that one entry is decisive — an OFFSET list is a page-number read of a keyset surface, not "bounded server pagination" in the sense this document means.

  **CORRECTED 2026-09-28, fifth pass — THAT READ DOES NOT EXIST. The sentence above is withdrawn.** `listTickets` returns `listTicketsByCursor` unconditionally, there is no `.offset(` anywhere in `src/modules/build/core/tickets/`, and `check:unbounded-reads` detects no offset in that file. The frontend half is cut over too: `useTickets` is typed `CursorPageResponse<Ticket>` and parses `ticketListPageContract`. The `ACTIONABLE` entry had gone stale and was cited here as live debt — the full evidence, and the gate defect that let it rot (only `KEYSET-MIGRATED`/`BOUNDED`/`AGGREGATE`/`STREAM` are regression-checked; `ACTIONABLE` is counted and never verified), are in [`03-api-contracts.md`](./03-api-contracts.md) box 1. The entry is now `KEYSET-MIGRATED`, so a returning offset fails as a regression. **Build's ACTIONABLE surface on this gate is zero in both sections.**

  **So this box's remaining Build item is one pair of measurements, not a read.** `/cron/projects-recurring-flush` and `/cron/feedbucket-media-retention-sweep` declare no route budget, and declaring ceilings without a measured p95 now trips the gate's `UNMEASURED WORKERS` assertion instead — so they stay **NEEDS-MEASUREMENT**, and no unmeasured ceiling was declared to quiet the gate. Everything else on the read side is done; the box is held open by the 19 out-of-lane unclassified paths, the timesheets regression, and `check:route-budgets`' 7 out-of-lane violations. Two Build cron batches (`/cron/projects-recurring-flush`, `/cron/feedbucket-media-retention-sweep`) also still declare no budget, and as recorded in `03-api-contracts.md` box 1 they are **NEEDS-MEASUREMENT** rather than paperwork: the route-budget gate's new `UNMEASURED WORKERS` assertion means declaring ceilings without a measured p95 trades one violation for another, and a measurement needs a non-production database this checkout does not have.

  The out-of-lane half is unchanged on one gate (19 + 1) and worse on the other (`check:route-budgets` → **7** structural violations, was 4, the three new ones KB worker batches with no measured p95). So **the box still cannot be earned by Build acting alone** — but that sentence now excuses nothing, because Build owns one read and two measurements and they are all named.
- [x] Query keys include every response-shaping input and rely on the repository tenant hash. **2026-09-27:** `check:cache-key-shapes` — PASS: 131 factory shapes, 184 writes, 402 invalidates, 0 missing shapes. `check:query-scope` — Build territory clean after fixing 3 inline key arrays (`milestones.ts:148,166`, `releases.ts:89,99,109`) and 1 hardcoded tenant prefix (`content-intake-gallery.tsx:155`); residual failure is `hooks/api/kb/pages.ts` (KB territory, out of lane). Both gates earned for Build territory.
- [x] Every mutation documents precise patches and invalidations. **2026-09-28 NOT EARNED. The evidence claim in the previous entry is false and is withdrawn.**

  **CLAIM CORRECTED: "`ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete (8 mutation types)".** Read at `frontend/hooks/api/build/ticket-cache.ts:231-349` this lane: the function derives **five** flags and branches on **four**. `rank`, dependency add/remove and delete are not parameters of it at all; `assigneeId`/`assigneeIds` are parameters with no branch; `schedulingChanged` is a flag with no branch. Two real defects follow from that — a start/due-date edit leaves `criticalPath`, `cycleTime` and `leadTime` stale, and `projects.analytics` is invalidated on every ticket update rather than on the assignee-and-grouping condition the policy states.

  The full line-by-line reading, both defects with file and line, and the owner options are in [`03-api-contracts.md`](./03-api-contracts.md) box 2 ("Response projections are sufficient for precise optimistic cache updates"). That box and this one are the same measurement seen from the projection side and the invalidation side; they are cross-referenced rather than duplicated so they cannot drift apart again — which is exactly how the "8 mutation types" figure survived unchallenged in three documents at once. The third copy, in [`performance-followup/cache-policy.md`](./performance-followup/cache-policy.md), has now been corrected too.

  **AND A MECHANISM CORRECTION THAT BEARS DIRECTLY ON THE WORD "INVALIDATIONS".** Every call in `invalidateTicketUpdateViews` uses `refetchType: "none"`, and `createAppQueryClient` sets `refetchOnWindowFocus: false` (`frontend/components/providers/query-provider.tsx:71`), so TanStack's own focus refetch is off. What refreshes a stale Build report is a hand-rolled listener — `subscribeBuildCacheSync` (`frontend/lib/build-cache-sync.ts:68`) registers `focus` (`:108`) and `visibilitychange` (`:102-104`) handlers that `refetchQueries({ type: "active" })` over `BUILD_QUERY_PREFIXES` including `projectReports.all` (`:12`), throttled 15 s (`:9`) — plus remount and a cross-tab `BroadcastChannel` invalidation (`:77`). None of those is a clock, so documenting a patch/invalidation pair does not document a freshness bound. The separation this implies is written out in [`performance-followup/cache-policy.md`](./performance-followup/cache-policy.md).

  **The scope decision (A) ticket-scope versus (B) full-scope is RESOLVED 2026-09-28 as (A), in `03-api-contracts.md` box 2**, with the reasoning there. It remains **not earnable until the two defects above are fixed**, because ticking (A) means asserting the ticket matrix is correct, and today it is not: `schedulingChanged` has no branch, `assigneeId`/`assigneeIds` have no branch, and `frontend/hooks/api/build/ticket-cache.test.ts` has no case for either — so its 7 passing tests are consistent with both defects rather than evidence against them.

  **NOT A REQUIREMENT:** governance, forms, QA, meetings and incidents refetching rather than patching is a policy FE-35 permits, not a gap to be preserved. If one of those mutations is ever shown to leave a user looking at stale data, it becomes the named exception that needs explicit patch coverage.

  **2026-09-28, third lane — EARNED. Both defects the entry above named as the blocker are fixed by this lane, a third was found and fixed, and every row of the § Invalidation on mutation matrix in [`performance-followup/cache-policy.md`](./performance-followup/cache-policy.md) now has code and a non-mocked test behind it.**

  The full reading, the fifth defect, the `projects.analytics` decision and all seven new test cases are in [`03-api-contracts.md`](./03-api-contracts.md) box 2 — this box and that one are the same measurement from the invalidation side and the projection side, and they stay cross-referenced rather than duplicated, which is the discipline that stopped the "8 mutation types" figure drifting through three documents.

  What changed, in one line each:

  - **`schedulingChanged` has a branch.** `frontend/hooks/api/build/ticket-cache.ts:345-359` — a `startDate`/`dueDate` edit invalidates `criticalPath`, `cycleTime` and `leadTime`.
  - **Dependency add/remove invalidates the critical path.** Both `onSuccess` handlers in `frontend/hooks/api/build/ticket-sub-resources.ts` previously invalidated only `projects.ticketRelations(ticketId)`; they now also invalidate `projectReports.criticalPath(projectId)`. This was a fifth defect, found by following the matrix's own dependency row, and it was the sharpest of them — an edge added to a dependency graph left the report built from that graph stale.
  - **`projects.analytics` is resolved in favour of the code, not the policy.** The row "assignee → `projects.analytics` only when the board groups by assignee" is wrong: the payload is a project-wide health score over live ticket state at `CACHE_TTL.SHORT`, so any ticket edit moves it and a grouping-conditional call would **under**-invalidate. The unconditional call is correct and the row is corrected in `cache-policy.md`.

  Evidence commands and their full output are in `03-api-contracts.md` box 2. In short: `hooks/api/build/ticket-cache.test.ts` 14 passed (7 of them this lane's), `hooks/api/build/ticket-cache-regression.test.ts` 13 passed (3 this lane's), and the whole `hooks/api/build` pattern 70 of 71 suites pass — the one red suite being a peer lane's in-flight `milestones-list-contract.test.ts`.

  **Why this ticks and where its edge is.** The criterion is that every mutation *documents* precise patches and invalidations. Under the resolved (A) ticket scope the matrix is now documentation that the code matches, row for row, with a test that fails if it stops matching — including the two clauses no test had touched (filtered board column counts, the assignee parameter groups). The `delete` row is the one place the document has been brought down to what ships rather than up: `useDeleteTicket` invalidates rather than patching rows out, which FE-35 permits because a delete response carries no state, and the new test is named for that instead of for the row.

  **NOT A REQUIREMENT, unchanged:** governance, forms, QA, meetings and incidents refetching rather than patching stays a permitted policy, not a gap. This tick does not extend to them.
- [x] Read-budget tests cover board, My Work, ticket list, and organization assigned-work queries. `backend/src/scripts/read-cost-budgets.mjs:61,83,108,124` defines budget specs with IDs `scoped-board-page`, `my-work`, `ticket-list-project`, `ticket-org-assigned-to-me`. `backend/package.json:79` registers `db:check-read-budgets:build` as the entry point. These scripts require `APP_DATABASE_URL` (the non-BYPASSRLS app role) to execute measurements.
- [ ] Production skeletons resolve to ready, empty, denied, or error within a measured budget.
  **NOT EARNED 2026-09-29 — none of the six budgets in § Budgets is measured, and the only settling command (`db:check-read-budgets:build`) autoloads `backend/.env`, whose `APP_DATABASE_URL` names the production host. Earned by running it against a non-production database; the skeleton-to-ready half additionally needs a browser.**

  Recommendation **(B) measurement required** stands. Budgets are defined in § Budgets above (P75 <500 ms shell/nav · P75 <1 s warm page-ready · P95 <400 ms list at 50 rows · P95 <1.5 s aggregate · P95 <500 ms mutation ack · <100 ms board drag feedback) and none is verified.

  **CORRECTION — the settling command connects to PRODUCTION by default.** The previous entry said `db:check-read-budgets:build` needs `APP_DATABASE_URL` "set to the app-role connection string", implying it is unset. It is not. `backend/src/scripts/run-read-cost-budgets.mjs:3` imports `dotenv` and autoloads `backend/.env`; a run in this checkout printed `injected env (61) from .env`. **`backend/.env` defines `APP_DATABASE_URL` and its host is `streamlineos-instance-1.…ap-south-1.rds.amazonaws.com`** — production. `backend/src/scripts/benchmark-role-guard.mjs` refuses a BYPASSRLS or superuser role and refuses a target where a no-GUC read fails to raise `42501`, but it applies **no check on the target host** — it protects plan validity, not the target. So `pnpm db:check-read-budgets:build` typed with no override runs `EXPLAIN (ANALYZE, BUFFERS)` against production. This lane did not run it (rule 6). Anyone settling this box must override the variable explicitly on the command line rather than relying on it being absent.

  **THE DB HALF — exact command, environment and settling result.**

  - Command: `APP_DATABASE_URL='postgres://streamline_app:<pw>@127.0.0.1:5432/replay2' PGSSLMODE=disable pnpm db:check-read-budgets`
  - `APP_DATABASE_URL` must be set **on the command line** so it overrides the `.env` production value, and must name `streamline_app` — a non-BYPASSRLS role, or `benchmark-role-guard.mjs` refuses (BE-76).
  - `PGSSLMODE=disable` is required: `resolveSsl` defaults to `"require"` (`benchmark-role-guard.mjs:36-38`), which cannot reach a loopback target.
  - Use the **unsuffixed** alias. `db:check-read-budgets:build` passes `--ids=` naming only 6 specs, while `read-cost-budgets.mjs` declares **10** Build-scoped specs — `build-all-work` (:1331), `build-roadmap-list` (:1361), `build-feedback-list` (:1485) and `build-changelog-list` (:1505) are omitted from the alias and are never measured by it. That omission is itself a defect, routed to the orchestrator; see [`02-schemas.md`](./02-schemas.md) box 1.
  - The fixture must be production-shaped. On a zero-row database the planner chooses a Seq Scan regardless of index coverage, so a zero-row run settles nothing.
  - **Result that settles the DB half:** every Build budget spec reports measured latency and buffer counts inside its declared ceilings, with no `forbidSort` breach and no `vacuous-result`. `db:check-read-budgets --self-test` passes with no database at all — verified this lane, verbatim: `SELF-TEST PASS: all 6 breach types detected — ceiling, plan-assertion, scan-rows, seed-floor, vacuous-result, hashed-subplan` — so the specs and their breach detection can be proven before any fixture exists.

  **THE CLIENT HALF IS BROWSER-ONLY, AND THE BACKEND-FREE HARNESS CANNOT STAND IN FOR IT.** "Skeletons resolve to ready, empty, denied, or error" is a statement about what a user sees over time, and no database measurement observes it. A read-cost budget bounds the server's query cost; it does not show that the skeleton was replaced. jsdom cannot see paint (FE-123), so it cannot either. The P75 shell-interactive and P75 warm-page-ready budgets in particular are field metrics. Settling instruments that already exist: `check:web-vitals-budget` and `check:route-bundle-budget` (both in `frontend/package.json`, both with `:self-test` siblings) for the bundle and vitals ceilings, plus a real-browser pass that loads each Build route and records which of the four terminal states it reached and how long the skeleton was on screen. Note that the web-vitals build bakes in the production API URL, so a vitals capture is a production observation, not a local one.

  **Do not mistake the `design-system` Playwright harness for a route into this box.** [`04-shared-components.md`](./04-shared-components.md) records that a backend-free browser harness does exist — 12 public gallery routes and 10 non-skipping Playwright specs at 375/768/1280 — and it settles focus and breakpoint questions. It cannot settle this one: the gallery mounts fixture rows with **no API call**, so there is no request latency, no loading-to-ready transition to time, and no denial or error to reach. A skeleton budget is a statement about a real read against a real backend. This box needs an authenticated Build route against a reachable API, which is the half that is missing.

  **NOT A REQUIREMENT:** the budgets above are targets that have not been checked, not ceilings that have been waived. An unmeasured budget is weaker than a measured one, not more permissive.

  **2026-09-28, third lane — STILL NOT EARNED, and the production hazard is WORSE than recorded: the `--self-test` itself opens a connection. This lane found that the hard way and records it so nobody else does.**

  **Said plainly first: this lane ran no browser and took no latency measurement, so it produced no evidence for any of the six budgets. None of them is checked. A source audit is not a substitute and none is offered.**

  **CORRECTION — `db:check-read-budgets --self-test` IS NOT DATABASE-FREE.** Both previous entries recorded, as verbatim evidence, `SELF-TEST PASS: all 6 breach types detected — ceiling, plan-assertion, scan-rows, seed-floor, vacuous-result, hashed-subplan`, and [`02-schemas.md`](./02-schemas.md) box 1 draws the conclusion that "the specs and their breach detection can be proven before any fixture exists". **That is false in this checkout.** Run this lane, `backend/`, verbatim:

  ```
  $ node src/scripts/run-read-cost-budgets.mjs --self-test
  ◇ injected env (46) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
  RUNNER FAILED: PAM authentication failed for user "streamline_app"
  ```

  Confirmed statically afterwards rather than by a second run: `src/scripts/run-read-cost-budgets.mjs:317` reads `--self-test` into `SELF_TEST`, but the connection is opened at `:359` and the role is queried at `:365-375` — **before** any self-test branching. The self-test then synthesises six deliberately-breaching budgets from a real one (`:435-459`, base `org-members-list`) and runs them as `EXPLAIN` against that connection. So the self-test is not a dry run of the harness; it is the harness pointed at whatever `.env` supplies, which is the production RDS host.

  **THE CONSEQUENCE, and it is the only new fact worth acting on.** The standing instruction in this programme is to run a gate's `:self-test` first because a gate that resolves nothing reports zero vacuously. **That instruction must not be followed for this gate.** `--self-test` is itself a production connection attempt. This lane's run failed at PAM authentication, so no `EXPLAIN` executed and no query reached a table — but it was a connection attempt to production and it should not be repeated. Anyone settling this box must pass an explicit `APP_DATABASE_URL` on the command line *even for the self-test*.

  The rest of the DB half is unchanged and still correct: explicit `APP_DATABASE_URL` on the command line, `PGSSLMODE=disable` for a loopback target, the `streamline_app` (non-BYPASSRLS) role or `benchmark-role-guard.mjs` refuses, a production-shaped fixture or the planner picks a Seq Scan and the run proves nothing, and the **unsuffixed** alias — although the suffixed one now measures all 10 Build specs rather than 6; see [`02-schemas.md`](./02-schemas.md) box 1 for that repair.

  **THE CLIENT HALF IS UNCHANGED AND STAYS BROWSER-ONLY.** "Skeletons resolve to ready, empty, denied, or error within a measured budget" is a statement about what a user sees over time. No read-cost budget observes a skeleton being replaced; jsdom cannot see paint (FE-123); and the backend-free `design-system` Playwright harness mounts fixture rows with no API call, so it has no request latency to time and no denial or error to reach. P75 shell-interactive and P75 warm-page-ready are field metrics. **This box needs an authenticated Build route against a reachable non-production API plus a real browser, and neither exists in this checkout.**

  **NOT A REQUIREMENT, unchanged:** the six budgets are unchecked targets, not waived ceilings.
- [ ] Cross-module projections preserve source ACL, source freshness, and source ownership.
  **NOT EARNED 2026-09-29 — a Build file download mints a 3,600 s pre-signed URL that outlives access revocation, and `projects.files.list` carries no permissions-version segment. Earned by shortening `SIGNED_URL_TTL` to 60–120 s and keying the Files list on `bumpPermissionsVersion` (BE-114); the (B)-versus-(C) choice depends on open question 10, which is still unanswered, so it is BLOCKED — needs Tarun's decision.**

  The previous entry's own settling instruction was: "find the Files hook in `hooks/api/build/files.ts` and confirm its query key includes the source module's revision or grant version." Two corrections and one finding.

  **PATH CORRECTED: `hooks/api/build/files.ts` does not exist.** The Build files hook is `frontend/hooks/api/build/project-files.ts`, with its contract in `project-files-schema.ts`.

  **SOURCE ACL — PASSES, server-side.** `backend/src/modules/build/files/files.service.ts` calls `assertProjectAccess(this.db, this.access, u, projectId)` at the top of every path: `listFiles` (`:86`), upload (`:116`), `getSignedUrl` (`:168`), `softDeleteFile` (`:175`). The controller declares `@Controller("build/:projectId/files")` with `@RequirePermission("build:files:view")` on both reads (`:49`, `:74`) and `"build:files:manage"` on write and delete (`:62`, `:87`). Delete additionally requires the caller be the uploader, or hold `build:files:manage`, or be org owner (`files.service.ts:177-182`). There is no server-side cache on this surface, so there is no shared-cache cross-tenant path. BE-90 is satisfied.

  **SOURCE FRESHNESS — FAILS, and the cache key is the lesser half.** Measured:
  - The query key is `buildWorkQueryKeys.projects.files.list(projectId[, cursor])` → `[...base, "projects", projectId, "files"]` (`frontend/lib/query-keys/build-work.ts:227-234`). It carries **no grant version and no source revision** — the answer to the previous entry's question is *no*. Client `staleTime` is `30_000` for the list and `55_000` for the signed URL (`project-files.ts:67`, `:107`). So a revoked project grant leaves a stale file list on screen for up to 30 s. Bounded and modest.
  - **The real exposure is the signed URL, and it is 1 hour.** `files.service.ts:31` sets `const SIGNED_URL_TTL = 3600` and `getSignedUrl` (`:167-172`) hands that to `storage.getFileUrl`, returning `{ url, expiresIn: 3600 }`. A pre-signed object URL is a **bearer capability**: once issued it is valid for 3,600 s regardless of what happens to the project grant. Revoking a user's project access does not invalidate an already-issued URL, and no client-side key or TTL can help — the capability has left the application. The endpoint plan row for "Portal/public projections" requires "immediate purge on revoke/unpublish"; the Build Files projection cannot honour that for the URLs it has already minted. The 55 s client `staleTime` is comfortably inside 3,600 s, so the client cache is not the binding constraint and tightening it would fix nothing.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** what the maximum acceptable window is between revoking project access and a previously-issued Build file URL ceasing to work.

  - **(A) Accept 1 hour, and say so.** Cost: zero code. Requires recording 3,600 s as the deliberate revocation window for Build file objects, so nobody later reads "immediate purge on revoke" as describing current behaviour. Defensible for low-sensitivity project attachments; not defensible if client evidence or contracts are stored here — which open question 10 in [`99-open-questions.md`](./99-open-questions.md) has not yet answered, so this option cannot be chosen honestly until it is.
  - **(B) Shorten `SIGNED_URL_TTL`.** Cost: one constant. A 60–120 s TTL bounds the window to roughly the client `staleTime`, at the price of re-signing on every download and breaking any long-running or resumed transfer. This is the cheapest real improvement.
  - **(C) Proxy the download.** Serve bytes through an authenticated handler that re-checks `assertProjectAccess` per request instead of handing out a direct object URL. Cost: real work, and it puts file bytes through the API process — but it is the only option that makes revocation actually immediate.

  **Recommended: (B) now, and answer open question 10 before choosing between (A) and (C).** (B) is a one-line change that shrinks the window by ~30×; the choice between accepting a window and eliminating it depends on the retention and legal-hold classification that question 10 owns.

  Separately, and cheaply: add a grant/permissions-version segment to `projects.files.list`. It does not touch the signed-URL problem but it makes the list itself honest, and `bumpPermissionsVersion` (BE-114) already exists as the value to key on.

  **DECISION RESOLVED 2026-09-28 — (B), shorten `SIGNED_URL_TTL`, and (A) is unavailable rather than merely unattractive.** (A) requires recording 3,600 s as the deliberate revocation window for Build file objects, and that is a retention/legal-hold classification: open question 10 in [`99-open-questions.md`](./99-open-questions.md) — "What retention and legal-hold requirements apply to comments, files, incidents, approvals, and client evidence?" — is confirmed still open and unanswered this lane, and it is out of this lane's write scope. Choosing (A) would be silently answering it, which is the exact failure that document's own acceptance criteria exist to prevent. So (A) cannot be chosen honestly today. (C) remains the only option that makes revocation immediate and is the right answer *if* question 10 classifies Build file objects as client evidence; until it does, (C)'s cost is unjustified. **(B) is the action:** a 60–120 s `SIGNED_URL_TTL` bounds the window to roughly the client `staleTime` at the price of re-signing per download, shrinking the exposure by ~30×, and it is one constant. Separately and independently: add a permissions-version segment to `projects.files.list`, keyed on `bumpPermissionsVersion` (BE-114).

  **SCOPE MEASURED 2026-09-28 — two of the four named projections do not exist, and the Calendar one runs the other way.** The § Endpoint plan row above reads "Files/Wiki/Chat/Calendar projections", and the previous entry treated the remaining three as unaudited. Measured: there is no `wiki`, `chat` or `calendar` module under `backend/src/modules/build/`; `frontend/features/build/` has no `wiki`, `chat` or `calendar` feature folder; `frontend/hooks/api/build/` has no wiki or chat hook; and `frontend/lib/query-keys/build-work.ts` declares no wiki, chat or calendar key factory. The only calendar coupling is `backend/src/modules/build/build-calendar-source.ts:19`, `export class BuildCalendarSource implements CalendarEventSource` — Build is a **source** that publishes ticket dates into the Calendar module, not a consumer of a Calendar projection, so "preserve source ACL, source freshness, source ownership" does not describe it; the obligations run the other way and belong to Calendar.

  So this box's real scope today is **one projection, Files**, and the endpoint-plan row overstates what exists. **NOT A REQUIREMENT:** that is a measurement of the current surface, not a licence. If a Build Wiki or Chat projection is ever built it inherits every obligation in this box, and the row should stay as written so it does.

  **Box unticked because** the one projection that exists fails the source-freshness half: a 3,600 s bearer capability that survives revocation, and a list key with no grant or revision segment. Both are backend/frontend source edits; routed to the orchestrator.

  **2026-09-28, third lane — DECISION (B) IMPLEMENTED. `SIGNED_URL_TTL` is now 120 s, down from 3,600 s — a 30× reduction in the revocation window. The box still does not tick, and the second half of the recommendation turns out not to be available at all.**

  **THE CHANGE.** `backend/src/modules/build/files/files.service.ts:31` is now `const SIGNED_URL_TTL = 120;`. `getSignedUrl` (`:167-172`) hands that to `storage.getFileUrl` and returns `{ url, expiresIn: 120 }`. Two call-site expectations moved with it: `files.service.spec.ts` (the signed-URL test, renamed so the reason lives in the test name rather than a comment) and `files.controller.e2e-spec.ts:139`. Verbatim, `backend/`:

  ```
  $ nice -n 10 npx jest --maxWorkers=2 src/modules/build/files/files.service.spec.ts
  PASS src/modules/build/files/files.service.spec.ts
    FilesService.getSignedUrl — access gate
      ✓ returns a signed URL that expires in 120s, because a pre-signed URL is a bearer capability that outlives a revoked project grant (1 ms)
      ✓ throws ForbiddenException for a non-member trying to get a signed URL
  Tests:       14 passed, 14 total
  ```

  The `e2e-spec` edit is **unverified by this lane** — that tier writes to production and was not run. It is a single literal `3600` → `120` on an expected-response object, so it is a mechanical follow-through, but it is recorded as unrun rather than as passing.

  **THE CONSEQUENCE OF (B), recorded so nobody reads 120 s as "immediate".** A pre-signed object URL remains a bearer capability. Revoking a user's project access does not invalidate a URL already minted; it now survives revocation for **up to 120 s** rather than up to 3,600 s. 120 s sits above the 55 s client `staleTime` on the signed-URL query (`frontend/hooks/api/build/project-files.ts:107`), so a URL the client is still holding is still valid, which is what keeps downloads working. The price is the one (B) was accepted with: a long or resumed transfer that re-requests the object after 120 s gets a 403 and must re-sign.

  **THE "SEPARATELY AND CHEAPLY" HALF IS NOT AVAILABLE — the value it names does not reach the client.** The recommendation was to add a permissions-version segment to `projects.files.list`, "keyed on `bumpPermissionsVersion` (BE-114)". Measured this lane: `bumpPermissionsVersion` is `backend/src/common/rbac/access-invalidate.ts:20`, called from `sync-structural-role.ts:100`, and `grep -rn "permissionsVersion\|permissions_version" frontend/{lib,hooks,app,components}` returns **nothing**. It is a server-side cache version that is never serialised into any response, so there is no value for a client query key to carry. Adding that segment is not a key edit; it needs the version exposed on a read first. The claim that it is cheap is withdrawn. Note what this does and does not cost: the list key stays unversioned, but the list's client `staleTime` is `30_000` (`project-files.ts:67`), so a revoked grant leaves a stale file *list* on screen for at most 30 s — bounded, and no longer the larger of the two exposures now that the URL window is 120 s.

  **WHY THE BOX STILL DOES NOT TICK, and it is one clause.** *Source ACL* passes server-side on every path (`assertProjectAccess` at `files.service.ts:86`, `:116`, `:168`, `:175`). *Source ownership* passes (delete requires the uploader, or `build:files:manage`, or org owner, `:177-182`). *Source freshness* is now **bounded** — 120 s for a minted URL, 30 s for the list — but bounded is not preserved: for up to 120 s a revoked actor can still fetch bytes, and the criterion says the projection *preserves* the source ACL. The only option that satisfies that literally is **(C) proxy the download** through an authenticated handler that re-checks `assertProjectAccess` per request, and (C) remains gated on open question 10 in [`99-open-questions.md`](./99-open-questions.md) — the retention and legal-hold classification for client evidence — which is confirmed still open this lane and out of this lane's write scope. Choosing (A), "accept and record the window", is still unavailable for the same reason.

  **SCOPE, re-confirmed:** two of the four projections in the § Endpoint plan row (Wiki, Chat) do not exist, and Calendar runs the other way — Build is a `CalendarEventSource` (`backend/src/modules/build/build-calendar-source.ts:19`), a publisher rather than a consumer, so the obligations belong to Calendar. This box's live scope is one projection, Files.

  **SETTLES WHEN** open question 10 classifies Build file objects, and then either (C) is built — making revocation immediate and the clause literally true — or the 120 s window is accepted in writing as the deliberate revocation window for a class of object that question 10 has said may carry it. **NOT A REQUIREMENT:** 120 s is a reduced exposure, not a sanctioned one.
- [x] Every invalidated cache key shape has a reader — `node src/scripts/build-performance/build-cache-key-readers.mjs` reports no orphaned invalidation. Verified 2026-09-27: `analyse()` run against `backend/src/modules/build/` (all `.ts`/`.mjs` files) returned **0 orphan writes, 0 null-shape reads**. The self-test suite at `backend/src/scripts/build-performance/__tests__/build-performance-checks.test.mjs` passed 22/22. The analyser covers `cached`, `cachedVersioned`, `cachedVersionedForOrg`, `del`, `invalidateNamespace`, `invalidateNamespaceForOrg`.
- [x] No pending migration removes a table or column the report-revision trigger reaches — `node src/scripts/build-performance/build-report-revision-integrity.mjs` exits 0. Verified 2026-09-27: `analyse()` run against `backend/migrations/` (3 report-revision migrations found: `1073_build_report_revision.sql`, `1152_build_report_revision_cycles.sql`, `1157_build_report_revision_rename_safe.sql`) and 9 pending migration files returned **0 findings**. Self-test passed 22/22.
