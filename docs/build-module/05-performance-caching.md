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
| `GET /build/:projectId/tickets` and board variants | High-cardinality filters, rank order, assignee/label/status projection, and per-column continuation | `backend/src/modules/build/core/projects-tickets.controller.ts`, `backend/src/modules/build/core/board-projection.spec.ts` | DB-first; query key includes scope/filter/sort/cursor; 15–30 s client stale time; optimistic row moves with revision reconciliation |
| `GET /build/:projectId/tickets/:ticketId` | Detail currently owns a bounded comment include and multiple child projections | `backend/src/modules/build/core/projects-tickets-detail.service.ts` (`limit: 50`) | Cache detail 60 s; independently cursor comments/activity; patch exact detail and visible lists |
| `GET /build/all-work` | Cross-project union with actor/workspace/product/project predicates | `frontend/hooks/api/build/all-work.ts`, `backend/src/modules/build/` controller census | Actor/access-version key; 15 s; event-driven badge and row patch |
| `GET /build/:projectId/reports/burnup` | Event reconstruction and report revision cache | `backend/src/modules/build/core/projects-reports.controller.ts`, `backend/src/modules/build/core/projects-reports.service.ts` | Server cache by org/project/access/filter/report revision; 2 min client stale time |
| `GET /build/:projectId/reports/velocity` | Cursor page plus historical aggregation | same report controller/service; cache key at `projects-reports.service.ts` | Server cache by access/filter/revision/cursor; do not refetch prior pages after append |
| `GET /build/:projectId/reports/cycle-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after ticket transition commit |
| `GET /build/:projectId/reports/lead-time` | Date-window aggregate | same report controller/service | Revisioned aggregate cache; exact invalidation after relevant lifecycle writes |
| `GET /build/:projectId/reports/critical-path` | Dependency graph construction | same report controller/service | Revisioned bounded graph cache; invalidate dependency/date/status writers |
| `GET /build/billing-summary` | Timesheet joins and permission-sensitive cost projection | `backend/src/modules/build/execution/timesheets.controller.ts`, `timesheets.service.ts` | Server cache by org/actor/data-scope/period; current service invalidates `build:billing-summary:<orgId>` after time writes. **Audited: correct as built** (`timesheets.service.ts:372-375`); `check:cache-invalidation`'s three findings against it are false positives — see follow-up P2-3 |
| Workspace/product/project overview reads | Multiple bounded rollups and recent-work joins | `frontend/features/build/overview/workspace-overview-page.tsx`, `frontend/features/build/managed-products/product-insights-page.tsx` | Parallel bounded reads; 30–60 s by scope/access revision; patch child and invalidate affected summary |
| Portal/public projections | Source ACL, publication, expiry, and field-level projection | `backend/src/modules/portal/`, `backend/src/modules/build/client-portal/`, `backend/src/modules/public/public.controller.ts` | Separate public/portal cache namespaces; grant/publication revision; immediate purge on revoke/unpublish |

Every other Build operation remains in the endpoint census governed by `backend/src/scripts/check-build-read-cost.mjs`. **ASSUMPTION:** no endpoint outside this queue is expensive until traces or query-plan evidence say otherwise; a full measured 313-operation matrix is an implementation deliverable, not evidence available from this documentation pass.

The 2026-09-22 audit added two endpoints to this queue that were not on it:

| Endpoint | Why it requires measurement | Evidence |
|---|---|---|
| `GET /build/:projectId/analytics` | Seven reads per call including two raw `UNION` executes, uncached, while nine mutation paths evict a key nothing writes | `backend/src/modules/build/core/projects-analytics.service.ts`; follow-up **P1-1** |
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

- [ ] Every retained list uses bounded server pagination or virtualization. **2026-09-27 (re-run):** `check:unbounded-reads` self-test PASS; gate: FAIL — 21 unclassified paths and 1 regression (identical to `03-api-contracts.md` box 1). Build-territory unclassified (2, in fenced source): `/build/core/tickets/build-ticket-bulk-mutation.ts`, `/build/updates/updates.service.ts` — new since prior run, introduced by sibling lane work in `build/core/**`; cannot fix from this lane. The prior Build-territory meetings regression remains classified as `FALSE-POSITIVE` in `unbounded-reads-classification.json`. Timesheets regression (`billing-export.ts was KEYSET-MIGRATED`) and 19 out-of-lane unclassified paths remain. Virtualization verified: `kanban-virtual-ticket-list.tsx:258`. Box unticked: two Build-territory unclassified files in fenced source must be resolved before this box can be earned.
- [x] Query keys include every response-shaping input and rely on the repository tenant hash. **2026-09-27:** `check:cache-key-shapes` — PASS: 131 factory shapes, 184 writes, 402 invalidates, 0 missing shapes. `check:query-scope` — Build territory clean after fixing 3 inline key arrays (`milestones.ts:148,166`, `releases.ts:89,99,109`) and 1 hardcoded tenant prefix (`content-intake-gallery.tsx:155`); residual failure is `hooks/api/kb/pages.ts` (KB territory, out of lane). Both gates earned for Build territory.
- [ ] Every mutation documents precise patches and invalidations. **2026-09-27 OWNER-DECISION:** Ticket mutations verified: `ticket-cache.ts:281-348` matrix covers status, title, assignee, rank, points, cycle, dependency, delete (8 mutation types). Q: Must governance/forms/QA/meeting/incident mutations be in the matrix before this box is earned? Options: (A) Ticket scope — the matrix covers the highest-traffic mutations; other modules refetch on mutation, which is correct behavior. (B) Full scope — extend `performance-followup/cache-policy.md` to enumerate every Build mutation's patch and invalidation contract. Recommended: A — governance, forms, QA, and meetings are low-frequency relative to tickets; refetch on mutation is the correct policy for low-frequency actions (FE-35 only mandates patching when the response already carries the new state). Settling evidence: document which Build modules refetch vs patch in `performance-followup/cache-policy.md`; nominate any mutation where stale data is a real UX regression as the exception that needs explicit patch coverage.
- [x] Read-budget tests cover board, My Work, ticket list, and organization assigned-work queries. `backend/src/scripts/read-cost-budgets.mjs:61,83,108,124` defines budget specs with IDs `scoped-board-page`, `my-work`, `ticket-list-project`, `ticket-org-assigned-to-me`. `backend/package.json:79` registers `db:check-read-budgets:build` as the entry point. These scripts require `APP_DATABASE_URL` (the non-BYPASSRLS app role) to execute measurements.
- [ ] Production skeletons resolve to ready, empty, denied, or error within a measured budget. **2026-09-27 NEEDS-MEASUREMENT:** Budgets defined (P75 &lt;500 ms shell/nav, P75 &lt;1 s warm page, P95 &lt;400 ms list, P95 &lt;1.5 s aggregate). Q: Is this box earned by defining budgets, or by measuring against them? Options: (A) Definition sufficient — accept this box as a target specification; measurement is a separate ongoing task. (B) Measurement required — run `db:check-read-budgets:build` with a production-shaped fixture (`APP_DATABASE_URL` pointed at non-BYPASSRLS role) and record the results before ticking. Recommended: B — unticked boxes are honest about what is measured vs. specified; the budgets are stated but unverified. Instrument: `pnpm db:check-read-budgets:build` after setting `APP_DATABASE_URL` to the app-role connection string.
- [ ] Cross-module projections preserve source ACL, source freshness, and source ownership. **2026-09-27 OWNER-DECISION:** Policy specified in the endpoint plan table (Files/Wiki/Chat/Calendar: separate namespaces, source-revision in key, immediate purge on revoke). Q: Which cross-module surfaces must be audited before this box is earned? Options: (A) Files only — `frontend/features/build/files/` is the highest-risk; it reads from a cross-module storage service. (B) All four (Files, Wiki, Chat, Calendar) — each has an ACL source in a different module. (C) Defer — the policy is specified; implementation audit is a separate delivery. Recommended: A then B incrementally — start with Files (highest data-sensitivity risk), verify its cache key includes the source revision and its read re-checks the source ACL, tick when done. Settling evidence: find the Files hook in `hooks/api/build/files.ts` and confirm its query key includes the source module's revision or grant version.
- [x] Every invalidated cache key shape has a reader — `node src/scripts/build-performance/build-cache-key-readers.mjs` reports no orphaned invalidation. Verified 2026-09-27: `analyse()` run against `backend/src/modules/build/` (all `.ts`/`.mjs` files) returned **0 orphan writes, 0 null-shape reads**. The self-test suite at `backend/src/scripts/build-performance/__tests__/build-performance-checks.test.mjs` passed 22/22. The analyser covers `cached`, `cachedVersioned`, `cachedVersionedForOrg`, `del`, `invalidateNamespace`, `invalidateNamespaceForOrg`.
- [x] No pending migration removes a table or column the report-revision trigger reaches — `node src/scripts/build-performance/build-report-revision-integrity.mjs` exits 0. Verified 2026-09-27: `analyse()` run against `backend/migrations/` (3 report-revision migrations found: `1073_build_report_revision.sql`, `1152_build_report_revision_cycles.sql`, `1157_build_report_revision_rename_safe.sql`) and 9 pending migration files returned **0 findings**. Self-test passed 22/22.
