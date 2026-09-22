# Build Performance and Caching Plan

## Evidence

- Client keys and hooks: `frontend/lib/query-keys.ts`, `frontend/hooks/api/build/`.
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
| Reports/analytics | repeated aggregates, date scans | 1–5 min by revision/filter | filter+report revision; 2 min | increment project report revision after relevant committed writes |
| Workload | people, leave, capacity, assignments | 30–60 s per range/access revision | project/team/range; 30 s | invalidate assignment/estimate/leave windows only |
| Portfolios/programs/roadmap/goals | nested rollups | 30–120 s | scope+filters; 60–120 s | patch changed child; invalidate ancestor summaries |
| Forms/QA/incidents/governance | independent child collections | bounded short cache | parent+filters+cursor; 30–60 s | exact collection/detail patch and aggregate invalidation |
| Files/Wiki/Chat/Calendar projections | cross-module ACL and source freshness | source module owns cache | include source revision and project filter | source event invalidates projection; never duplicate data |
| AI/agent runs | outbound latency and polling | durable run state; no prompt response shared cache | run ID; live/poll while active | realtime status; final result stale 5 min |

## Endpoint-level measurement queue

Static inspection can identify high-risk query shapes, but it cannot honestly label an endpoint expensive without production-shaped query plans or traces. The following are therefore the complete P0 measurement candidates found in the audited source, not invented latency claims. Each row must record cold/warm query count, rows/bytes, and `EXPLAIN (ANALYZE, BUFFERS)` before an optimization is accepted.

| Endpoint | Why it requires measurement | Evidence | Target cache/update policy |
|---|---|---|---|
| `GET /build/:projectId/tickets` and board variants | High-cardinality filters, rank order, assignee/label/status projection, and per-column continuation | `backend/src/modules/build/core/projects-tickets.controller.ts`, `backend/src/modules/build/core/board-projection.spec.ts` | DB-first; query key includes scope/filter/sort/cursor; 15–30 s client stale time; optimistic row moves with revision reconciliation |
| `GET /build/:projectId/tickets/:ticketId` | Detail currently owns a bounded comment include and multiple child projections | `backend/src/modules/build/core/projects-tickets-detail.service.ts` (`limit: 50`) | Cache detail 60 s; independently cursor comments/activity; patch exact detail and visible lists |
| `GET /build/all-work` | Cross-project union with actor/workspace/product/project predicates | `frontend/hooks/api/build/all-work.ts`, `backend/src/modules/build/` controller census | Actor/access-version key; 15 s; event-driven badge and row patch |
| `GET /build/:projectId/reports/burnup` | Event reconstruction and report revision cache | `backend/src/modules/build/core/projects-reports.controller.ts`, `backend/src/modules/build/core/projects-reports.service.ts` | Server cache by org/project/access/filter/report revision; 2 min client stale time |
| `GET /build/:projectId/reports/velocity` | Cursor page plus historical aggregation | same report controller/service; cache key at `projects-reports.service.ts` | Server cache by access/filter/revision/cursor; do not refetch prior pages after append |
| `GET /build/:projectId/reports/cycle-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after ticket transition commit |
| `GET /build/:projectId/reports/lead-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after relevant lifecycle writes |
| `GET /build/:projectId/reports/critical-path` | Dependency graph construction | same report controller/service | Revisioned bounded graph cache; invalidate dependency/date/status writers |
| `GET /build/billing-summary` | Timesheet joins and permission-sensitive cost projection | `backend/src/modules/build/execution/timesheets.controller.ts`, `timesheets.service.ts` | Server cache by org/actor/data-scope/period; current service invalidates `build:billing-summary:<orgId>` after time writes |
| Workspace/product/project overview reads | Multiple bounded rollups and recent-work joins | `frontend/features/build/overview/workspace-overview-page.tsx`, `frontend/features/build/managed-products/product-insights-page.tsx` | Parallel bounded reads; 30–60 s by scope/access revision; patch child and invalidate affected summary |
| Portal/public projections | Source ACL, publication, expiry, and field-level projection | `backend/src/modules/portal/`, `backend/src/modules/build/client-portal/`, `backend/src/modules/public/public.controller.ts` | Separate public/portal cache namespaces; grant/publication revision; immediate purge on revoke/unpublish |

Every other Build operation remains in the endpoint census governed by `backend/src/scripts/check-build-read-cost.mjs`. **ASSUMPTION:** no endpoint outside this queue is expensive until traces or query-plan evidence say otherwise; a full measured 313-operation matrix is an implementation deliverable, not evidence available from this documentation pass.

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

- [ ] Every retained list uses bounded server pagination or virtualization.
- [ ] Query keys include every response-shaping input and rely on the repository tenant hash.
- [ ] Every mutation documents precise patches and invalidations.
- [ ] Read-budget tests cover board, My Work, ticket list, and organization assigned-work queries.
- [ ] Production skeletons resolve to ready, empty, denied, or error within a measured budget.
- [ ] Cross-module projections preserve source ACL, source freshness, and source ownership.
