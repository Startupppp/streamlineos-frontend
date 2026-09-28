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

- [ ] Every retained list uses bounded server pagination or virtualization. **2026-09-28 NOT EARNED. Re-run this lane; figures corrected. Full evidence, the 8-stale root cause and the per-file site table live in [`03-api-contracts.md`](./03-api-contracts.md) box 1 — this box shares that gate and must not carry a second, drifting copy of its numbers.**

  Summary of the shared measurement: `check:unbounded-reads --self-test` → `Self-tests passed.` Gate → FAIL with **8 stale classification entries, 29 unclassified paths, 1 regression**. Figures corrected against the previous entry: **21 unclassified → 29**; **0 stale → 8**; **Build-territory unclassified 2 → 10**.

  The previous entry attributed the 2 Build sites to "sibling lane work in `build/core/**`". That was half right and the mechanism matters: the sibling work was a **directory split** of `build/core/` into `automation/`, `project-crud/`, `roadmap/`, `work-query/`, `tickets/`, `analytics/`. All 8 stale entries are Build-owned and each pairs with an unclassified entry at the file's new path, so 8 of the 10 Build-territory unclassified paths are the same files under new names, not new defects. Repointing those 8 entries in `src/scripts/baselines/unbounded-reads-classification.json` clears 8 stale and 8 unclassified in one edit.

  **Virtualization half: VERIFIED.** `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders `mode="virtual"` — confirmed on disk this lane.

  **Box unticked because** the 2 genuinely-new Build sites (`/build/core/tickets/build-ticket-bulk-mutation.ts:164,:201` and `/build/updates/updates.service.ts:56`) are unclassified, and because the gate stays red on 19 out-of-lane unclassified paths plus the `/timesheets/core/lib/billing-export.ts` regression regardless of what Build does. **This box cannot be earned by Build acting alone**, which is a scheduling fact and not permission for the Build items to remain.
- [x] Query keys include every response-shaping input and rely on the repository tenant hash. **2026-09-27:** `check:cache-key-shapes` — PASS: 131 factory shapes, 184 writes, 402 invalidates, 0 missing shapes. `check:query-scope` — Build territory clean after fixing 3 inline key arrays (`milestones.ts:148,166`, `releases.ts:89,99,109`) and 1 hardcoded tenant prefix (`content-intake-gallery.tsx:155`); residual failure is `hooks/api/kb/pages.ts` (KB territory, out of lane). Both gates earned for Build territory.
- [ ] Every mutation documents precise patches and invalidations. **2026-09-28 NOT EARNED. The evidence claim in the previous entry is false and is withdrawn.**

  **CLAIM CORRECTED: "`ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete (8 mutation types)".** Read at `frontend/hooks/api/build/ticket-cache.ts:231-349` this lane: the function derives **five** flags and branches on **four**. `rank`, dependency add/remove and delete are not parameters of it at all; `assigneeId`/`assigneeIds` are parameters with no branch; `schedulingChanged` is a flag with no branch. Two real defects follow from that — a start/due-date edit leaves `criticalPath`, `cycleTime` and `leadTime` stale, and `projects.analytics` is invalidated on every ticket update rather than on the assignee-and-grouping condition the policy states.

  The full line-by-line reading, both defects with file and line, and the owner options are in [`03-api-contracts.md`](./03-api-contracts.md) box 2 ("Response projections are sufficient for precise optimistic cache updates"). That box and this one are the same measurement seen from the projection side and the invalidation side; they are cross-referenced rather than duplicated so they cannot drift apart again — which is exactly how the "8 mutation types" figure survived unchallenged in three documents at once.

  **The scope decision (A) ticket-scope versus (B) full-scope is recorded in `03-api-contracts.md` box 2.** Recommendation is unchanged — **(A)** — but it is **not earnable until the two defects above are fixed**, because ticking (A) means asserting the ticket matrix is correct, and today it is not.

  **NOT A REQUIREMENT:** governance, forms, QA, meetings and incidents refetching rather than patching is a policy FE-35 permits, not a gap to be preserved. If one of those mutations is ever shown to leave a user looking at stale data, it becomes the named exception that needs explicit patch coverage.
- [x] Read-budget tests cover board, My Work, ticket list, and organization assigned-work queries. `backend/src/scripts/read-cost-budgets.mjs:61,83,108,124` defines budget specs with IDs `scoped-board-page`, `my-work`, `ticket-list-project`, `ticket-org-assigned-to-me`. `backend/package.json:79` registers `db:check-read-budgets:build` as the entry point. These scripts require `APP_DATABASE_URL` (the non-BYPASSRLS app role) to execute measurements.
- [ ] Production skeletons resolve to ready, empty, denied, or error within a measured budget. **2026-09-28 NOT EARNED — NEEDS-MEASUREMENT, and partly BROWSER-ONLY. The instrument the previous entry named is a production hazard as written; that is corrected here.**

  Recommendation **(B) measurement required** stands. Budgets are defined in § Budgets above (P75 <500 ms shell/nav · P75 <1 s warm page-ready · P95 <400 ms list at 50 rows · P95 <1.5 s aggregate · P95 <500 ms mutation ack · <100 ms board drag feedback) and none is verified.

  **CORRECTION — the settling command connects to PRODUCTION by default.** The previous entry said `db:check-read-budgets:build` needs `APP_DATABASE_URL` "set to the app-role connection string", implying it is unset. It is not. `backend/src/scripts/run-read-cost-budgets.mjs:3` imports `dotenv` and autoloads `backend/.env`; a run in this checkout printed `injected env (61) from .env`. **`backend/.env` defines `APP_DATABASE_URL` and its host is `streamlineos-instance-1.…ap-south-1.rds.amazonaws.com`** — production. `backend/src/scripts/benchmark-role-guard.mjs` refuses a BYPASSRLS or superuser role and refuses a target where a no-GUC read fails to raise `42501`, but it applies **no check on the target host** — it protects plan validity, not the target. So `pnpm db:check-read-budgets:build` typed with no override runs `EXPLAIN (ANALYZE, BUFFERS)` against production. This lane did not run it (rule 6). Anyone settling this box must override the variable explicitly on the command line rather than relying on it being absent.

  **THE DB HALF — exact command, environment and settling result.**

  - Command: `APP_DATABASE_URL='postgres://streamline_app:<pw>@127.0.0.1:5432/replay2' PGSSLMODE=disable pnpm db:check-read-budgets`
  - `APP_DATABASE_URL` must be set **on the command line** so it overrides the `.env` production value, and must name `streamline_app` — a non-BYPASSRLS role, or `benchmark-role-guard.mjs` refuses (BE-76).
  - `PGSSLMODE=disable` is required: `resolveSsl` defaults to `"require"` (`benchmark-role-guard.mjs:36-38`), which cannot reach a loopback target.
  - Use the **unsuffixed** alias. `db:check-read-budgets:build` passes `--ids=` naming only 6 specs, while `read-cost-budgets.mjs` declares **10** Build-scoped specs — `build-all-work` (:1331), `build-roadmap-list` (:1361), `build-feedback-list` (:1485) and `build-changelog-list` (:1505) are omitted from the alias and are never measured by it. That omission is itself a defect, routed to the orchestrator; see [`02-schemas.md`](./02-schemas.md) box 1.
  - The fixture must be production-shaped. On a zero-row database the planner chooses a Seq Scan regardless of index coverage, so a zero-row run settles nothing.
  - **Result that settles the DB half:** every Build budget spec reports measured latency and buffer counts inside its declared ceilings, with no `forbidSort` breach and no `vacuous-result`. `db:check-read-budgets --self-test` passes with no database at all — verified this lane, verbatim: `SELF-TEST PASS: all 6 breach types detected — ceiling, plan-assertion, scan-rows, seed-floor, vacuous-result, hashed-subplan` — so the specs and their breach detection can be proven before any fixture exists.

  **THE CLIENT HALF IS BROWSER-ONLY.** "Skeletons resolve to ready, empty, denied, or error" is a statement about what a user sees over time, and no database measurement observes it. A read-cost budget bounds the server's query cost; it does not show that the skeleton was replaced. jsdom cannot see paint (FE-123), so it cannot either. The P75 shell-interactive and P75 warm-page-ready budgets in particular are field metrics. Settling instruments that already exist: `check:web-vitals-budget` and `check:route-bundle-budget` (both in `frontend/package.json`, both with `:self-test` siblings) for the bundle and vitals ceilings, plus a real-browser pass that loads each Build route and records which of the four terminal states it reached and how long the skeleton was on screen. Note that the web-vitals build bakes in the production API URL, so a vitals capture is a production observation, not a local one.

  **NOT A REQUIREMENT:** the budgets above are targets that have not been checked, not ceilings that have been waived. An unmeasured budget is weaker than a measured one, not more permissive.
- [ ] Cross-module projections preserve source ACL, source freshness, and source ownership. **2026-09-28 NOT EARNED. The previous entry set option (A) Files-first as the settling step and named the check to run. This lane ran it. The answer is no, and the reason is more serious than the cache key.**

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

  **SCOPE — Wiki, Chat and Calendar remain unaudited.** Option (B) of the previous entry (audit all four) is still the target; Files was first because it is the highest data-sensitivity risk, and the finding above shows that was the right order. **NOT A REQUIREMENT:** the three unaudited projections are unaudited, not cleared. Nothing here says they may omit a source revision.
- [x] Every invalidated cache key shape has a reader — `node src/scripts/build-performance/build-cache-key-readers.mjs` reports no orphaned invalidation. Verified 2026-09-27: `analyse()` run against `backend/src/modules/build/` (all `.ts`/`.mjs` files) returned **0 orphan writes, 0 null-shape reads**. The self-test suite at `backend/src/scripts/build-performance/__tests__/build-performance-checks.test.mjs` passed 22/22. The analyser covers `cached`, `cachedVersioned`, `cachedVersionedForOrg`, `del`, `invalidateNamespace`, `invalidateNamespaceForOrg`.
- [x] No pending migration removes a table or column the report-revision trigger reaches — `node src/scripts/build-performance/build-report-revision-integrity.mjs` exits 0. Verified 2026-09-27: `analyse()` run against `backend/migrations/` (3 report-revision migrations found: `1073_build_report_revision.sql`, `1152_build_report_revision_cycles.sql`, `1157_build_report_revision_rename_safe.sql`) and 9 pending migration files returned **0 findings**. Self-test passed 22/22.
