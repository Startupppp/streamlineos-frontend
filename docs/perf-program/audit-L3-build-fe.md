# Build Frontend Performance & Cleanup Audit — Lane L3

**Scope:** `frontend/app/(authenticated)/build/**`, `frontend/features/build/**`, `frontend/hooks/api/build/**`, `frontend/lib/build/**`, plus Build-only contracts/types/query-keys.
**Date:** 2026-10-22 | **Status:** READ-ONLY — no source edits

---

## 10-Line Summary

1. **Alias key explosion (FE-143):** `KanbanTicket` carries three names for the estimate value (`points`, `storyPoints`, `estimate`) and three for the assignee (`assigneeId`, `assignee`, `assignees`). The backend schema already has two (`storyPoints`/`estimate`); the frontend adds a third.
2. **Zero server prefetch on top-level pages (FE-145):** Every build page outside `[projectId]/layout.tsx` fetches entirely client-side — projects, all-work, command-center, goals, roadmap, templates, teams, portfolios, programs, search, settings, inbox, my-work. First-paint stalls on every cold navigation.
3. **Static imports of KanbanBoard, Gantt, Workload and recharts (FE-113):** Four heavy view components enter the initial bundle instead of being lazy-loaded. The board-section and cycle-detail imports are the most impactful.
4. **Client-side "Show N more rows" everywhere (FE-125/FE-146):** `list-view-group-rows.tsx`, `list-view-group.tsx` and `list-view.tsx` implement a custom show-more button that slices a full in-memory list; `cycle-planning-sheet.tsx` does the same for ticket filtering. None of these use server-side keyset pagination.
5. **2,933 manual memoization calls (FE-114):** The React Compiler (`reactCompiler: true`) is enabled but virtually every build file still carries `useMemo`/`useCallback`/`React.memo`, defeating compiler benefits and violating the "plain code" mandate.
6. **FE-41 violation:** `product-feedback-page.tsx:62` passes `isLoading: false, isError: false` with no `error` argument; any 402 from feedbucket silently shows "Something went wrong" instead of the upgrade path.
7. **Two unsanctioned business `route.ts` files (FE-06):** `build/route.ts` (entry redirect) and `[projectId]/bugs/[submissionId]/route.ts` (intake redirect) are not in `scripts/check-no-business-routes.mjs`'s `ALLOWED_ROUTES` map and will fail `check:routes`.
8. **Test harness barrel import (FE-127/FE-130):** `features/build/epics/epics-page-test-harness.tsx:179` imports from the `@/hooks/api/build` barrel; harness files are explicitly excluded from the test-file exemption.
9. **Ten-plus over-300-line files outside exempt dirs (FE-57):** `outcome-reviews-section.tsx` (468), `use-activity-feed.ts` (454), `ticket-detail-main-section.tsx` (448), `add-filter-popover.tsx` (435) and others breach the ratchet.
10. **One file over the hard 500-line limit (FE-57):** `features/build/intake/components/intake-decision-dialog.tsx` at 506 lines (intake is exempt from the 300-line rule but not from 500).

---

## Ledger

### Category 1 — Duplicate / Alias Keys (FE-143)

- [ ] `features/build/shared/types.ts:50-51` — `KanbanTicket` declares both `points?: number | null` and `storyPoints?: number | null` for the same estimate value. Pick `storyPoints` (matches the backend contract at `build-tickets-core-schema.ts:11,25`), remove `points`, and migrate all readers (`all-work-ticket-utils.ts:20,78`, `all-work-list-section.tsx:25`, `create-ticket-ai-menu.tsx:81,162`, `cycle-planning-sheet.tsx:29`, `use-cycle-detail.ts:132`, `epic-card-model.ts:30`, `my-tickets/map-board-ticket.ts:12`, `my-work/map-all-work-ticket.ts:18`, `ticket-details/sidebar-select-fields.tsx:100,108`).
- [ ] `hooks/api/build/build-tickets-core-schema.ts:11-12,25-26` — Backend contract schema carries both `storyPoints` and `estimate` for the same thing. One must be the canonical field; the other should be mapped or dropped. Flag to backend team as a contract fix needed (see Backend Contract Changes section).
- [ ] `features/build/shared/types.ts:52,64,72` — `KanbanTicket` has `assigneeId?: string | null` (line 52), `assignee?: {...} | null` (line 64), and `assignees?: {user?: ...}[]` (line 72) — three access paths for the same person. Callers that use only `assigneeId` without the full `assignee` object should be listed and the field removed once all callers migrated.

### Category 2 — Slow-page Causes (FE-145)

- [ ] `app/(authenticated)/build/projects/page.tsx` — No `createServerQueryClient` + `prefetchQuery` + `HydrationBoundary`. Add server prefetch for `projects list`. Pattern: `[projectId]/layout.tsx:5-71`.
- [ ] `app/(authenticated)/build/all-work/page.tsx` — No server prefetch. Primary read is `useAllWorkPageData` (projects, members, custom-states, teams, managed-products). Prefetch projects + org custom states; others can follow client-side since they're filter metadata.
- [ ] `app/(authenticated)/build/command-center/page.tsx` — No server prefetch. Prefetch projects list (drives the panel) in parallel.
- [ ] `app/(authenticated)/build/goals/page.tsx` — No server prefetch. Prefetch goals list.
- [ ] `app/(authenticated)/build/my-work/page.tsx` — No server prefetch. Prefetch my-work tickets.
- [ ] `app/(authenticated)/build/roadmap/page.tsx` — No server prefetch.
- [ ] `app/(authenticated)/build/portfolios/page.tsx`, `programs/page.tsx`, `teams/page.tsx`, `managed-products/page.tsx`, `templates/page.tsx`, `search/page.tsx`, `inbox/page.tsx`, `approvals/page.tsx` — All client-only with no server prefetch. Each is a candidate for `HydrationBoundary` with its primary list prefetched.
- [ ] `features/build/all-work/use-all-work-page-data.ts:22` — `useBuildMembers()` and `useProjectTeams({ pageSize: 100 })`, `useManagedProducts({ limit: 100 })` all cap at 100 rows for filter-option sources. Orgs with >100 teams/products silently show incomplete filter menus.

#### Fetch waterfall detail

- `all-work-view-content.tsx` composes five view sections (list, table, board, calendar, timeline) all imported statically. The user sees only one at a time; the other four parse their imports on every page load. Switching views should not require a new fetch.
- `command-center-page.tsx`: `useCommandCenterData` → several child hooks fire sequentially on the client; the first meaningful paint is delayed by the full waterfall.

### Category 3 — Dead and Duplicate Code (FE-134/FE-126/FE-140)

- [ ] `features/build/ticket-details/remove-relation-button.tsx` — Single-file, single-caller (`ticket-relations.tsx:293`), wraps `useAnimatedIcon` + `<button>` with only `stopPropagation` as extra behavior. Per FE-140, the `stopPropagation` + `AnimatedIconButton` pattern is written inline at the call site; delete this file and update `ticket-relations.tsx:293`.
- [ ] `features/build/epics/epics-page-test-harness.tsx:179` — Imports from `@/hooks/api/build` (barrel); FE-130 explicitly excludes `*-test-harness.tsx` files from the test-file exemption. Change to domain-module imports (`@/hooks/api/build/projects`, etc.).
- [ ] `features/build/views/list-view-group-rows.tsx:22-49` — `useGroupRenderLimit` hook and `ShowMoreRowsButton` component are only used within this file and `list-view-group.tsx`. The show-more pattern is itself an FE-125 violation (see Category 4). When that is fixed the helper and component become dead code and should be deleted.
- [ ] `features/build/shared/types.ts` — `LEGACY_STATUS_OPTIONS` (lines ~110-115) is returned when `statuses` is empty, duplicating data the backend should own. Verify if any call site still passes an empty `statuses` array and whether the legacy fallback can be removed.

### Category 4 — Unpaginated / Client-side Filter (FE-125, FE-146)

- [ ] `features/build/views/list-view-group-rows.tsx:22-100` — `useGroupRenderLimit(total)` stores a `visibleCount` in state and slices `items.slice(0, visibleCount)`; `ShowMoreRowsButton` increments it. The full ticket list for each group is already in memory. This is an FE-125 violation. Fix: use a true server-paginated read (`useInfiniteQuery` + `IntersectionObserver` sentinel, or cursor-based `TablePagination`). The "Show N more rows" label must not appear.
- [ ] `features/build/views/list-view-group.tsx:118-176` — Same pattern (`useGroupRenderLimit` + `ShowMoreRowsButton` at `onShowMore={showMore}`). Remove once the group-rows list is server-paginated.
- [ ] `features/build/views/list-view.tsx:243` — Flat list uses the same `useGroupRenderLimit` / `ShowMoreRowsButton` pattern for ungrouped tickets. Remove.
- [ ] `features/build/cycles/cycle-planning-sheet.tsx:46-58` — Loads all board tickets via `useProjectBoardTickets` (full download), then filters client-side by `ticket.cycleId === cycle.id` (line 46) and by the search query (line 55/58). Should read a dedicated `/build/:projectId/cycles/:cycleId/tickets` endpoint with server-side search, not slice the board snapshot.

### Category 5 — React Violations (FE-114 — Manual Memoization)

Total verified instances of `useMemo` / `useCallback` / `React.memo` in build non-test source: **2,933**. All are removal candidates under FE-114 (React Compiler is active). Files with the highest concentration are audit priorities:

- [ ] `features/build/all-work/all-work-page.tsx:69-197` — 10+ `useMemo` / `useCallback` calls. Remove; derive values inline.
- [ ] `features/build/all-work/all-work-timeline-section.tsx:47-176` — 11 `useMemo` / `useCallback` calls including geometry calculations. Remove; the compiler memoizes these automatically.
- [ ] `features/build/all-work/use-all-work-bulk.ts:74-219` — 8 `useMemo` / `useCallback` calls. Remove.
- [ ] `features/build/all-work/all-work-table-section.tsx:174-179` — `useMemo` for `tableColumns` and `tableRows`. Remove.
- [ ] `features/build/all-work/all-work-board-section.tsx:27-31` — `useMemo` for `kanbanTickets` + `useCallback` for `handleTicketSelect`. Remove.
- [ ] `features/build/ai/create-ticket-ai-menu.tsx:111-188` — 5 `useCallback` + 1 `useMemo`. Remove.
- [ ] `features/build/ai/ticket-detail-ai.tsx:73-106` — 4 `useCallback` + 1 `useMemo`. Remove.
- [ ] `features/build/all-work/all-work-views-menu.tsx:85-129` — 5 `useCallback`. Remove.
- [ ] `features/build/all-work/all-work-list-section.tsx:3,61` — `memo` wrapper + `useCallback`. Remove.

**Note:** The single legitimate exception class is a `useCallback` that is a direct dependency of a `useEffect` where the compiler cannot prove referential stability — verify each case before bulk-deleting.

### Category 6 — Next.js Violations (FE-01, FE-06, FE-113)

- [ ] `app/(authenticated)/build/route.ts` — Not in `ALLOWED_ROUTES` in `scripts/check-no-business-routes.mjs`. It is a pure redirect handler (no database, no writes, GET only, calls `enforceRouteAccess` before redirecting). Add an entry to `ALLOWED_ROUTES` with `reason` and `properties: ["read-only"]`, or refactor to a `next.config` redirect if the route-access check can be done in the layout.
- [ ] `app/(authenticated)/build/[projectId]/bugs/[submissionId]/route.ts` — Same issue. This handler calls the backend to look up an intake ID then redirects; it has business logic (a backend read). It cannot be a `next.config` redirect. It must be added to `ALLOWED_ROUTES` with documented properties, or the lookup must move to the client and the route.ts deleted.
- [ ] `features/build/all-work/all-work-board-section.tsx:7` — `import { KanbanBoard } from "@/features/build/views/kanban-board"` is static. KanbanBoard renders drag-and-drop with `@hello-pangea/dnd` and is only visible on the board view. Replace with `dynamic(() => import("@/features/build/views/kanban-board").then(m => m.KanbanBoard), { ssr: false, loading: () => <KanbanBoardSkeleton /> })`.
- [ ] `features/build/cycles/cycle-detail-page.tsx:4` — Same static `KanbanBoard` import. Apply the same dynamic pattern.
- [ ] `features/build/views/project-board-view-pane.tsx:8-9` — `GanttView` and `WorkloadView` imported statically alongside the already-dynamic `KanbanBoard` (line 20). Both are heavy canvas/SVG components. Make both dynamic with appropriate skeletons.
- [ ] `features/build/all-work/all-work-view-content.tsx:12-14` — `AllWorkBoardSection`, `AllWorkCalendarSection`, `AllWorkTimelineSection` imported statically; only one is visible at a time. Make all three dynamic.
- [ ] `features/build/managed-products/insights/evidence-themes-section.tsx:6` — `import { BarChart, Bar, ResponsiveContainer } from "recharts"` is static and reaches the main bundle through `product-discovery-section.tsx` → `product-insights-panels.tsx`. The consumers do not wrap it in `dynamic()`. Move recharts code into a dynamically-imported sub-module.

### Category 7 — RBAC / Page State (FE-40, FE-41, FE-47)

- [ ] `features/build/managed-products/product-feedback-page.tsx:62` — **FE-41 violation.** `usePageState({ module: "build", isLoading: false, isError: false })` hardcodes both loading flags and passes no `error`. Any 402 from the feedbucket read is silently hidden. Fix: derive `isLoading`/`isError`/`error` from the actual feedbucket query and pass all three.

All other `usePageState` call sites in scope pass `error`; no additional FE-41 violations found.

#### RBAC coverage per page (FE-147)

All `app/(authenticated)/build/**` route files call `enforceRouteAccess` before rendering. No missing module gate found. `useCan` is used correctly for mutation controls (FE-44), not for page-level state (FE-42 compliance confirmed).

### Category 8 — Loading.tsx Coverage (FE-144)

All `page.tsx` files in scope have a sibling `loading.tsx`. No missing sibling found.

Loading skeletons are generally well-structured. Two observations:

- `app/(authenticated)/build/command-center/loading.tsx` — Uses generic `<Skeleton>` blocks for the widget panels rather than `KanbanBoardSkeleton` or the actual widget-grid skeleton from `CommandCenterLoading`. The loading state diverges from the ready layout when the widget grid changes shape. Update to use the feature's own `command-center-loading.tsx` skeleton component.
- `app/(authenticated)/build/goals/loading.tsx` — StatCardGridSkeleton uses `cols={4}` but the goals page renders a 3-column card grid at `lg:grid-cols-3`. Correct the skeleton to match.

### Category 9 — File Size Ratchet (FE-57)

Files outside exempt directories (intake, QA, reports) that breach the 300-line ratchet:

| Lines | File |
|---|---|
| 468 | `features/build/managed-products/insights/outcome-reviews-section.tsx` |
| 454 | `features/build/ticket-details/use-activity-feed.ts` |
| 448 | `features/build/ticket-details/ticket-detail-main-section.tsx` |
| 435 | `features/build/project-list/add-filter-popover.tsx` |
| 425 | `features/build/managed-products/product-feedback-filters.tsx` |
| 424 | `features/build/managed-products/product-settings-page.tsx` |
| 421 | `features/build/managed-products/product-roadmap-page.tsx` |
| 410 | `features/build/milestones/goals-gallery-section.tsx` |
| 403 | `features/build/inbox/inbox-list.tsx` |
| 401 | `features/build/ticket-details/use-ticket-detail.ts` |
| 397 | `features/build/managed-products/projects/product-projects-table.tsx` |
| 391 | `features/build/project-create/steps/step-basics.tsx` |
| 381 | `features/build/tickets/use-create-ticket-dialog-state.ts` |
| 375 | `features/build/milestones/project-milestones-page.tsx` |
| 369 | `features/build/ticket-details/activity-feed.tsx` |
| 357 | `features/build/managed-products/projects/use-product-projects-page.ts` |
| 351 | `features/build/project-list/projects-page.tsx` |
| 350 | `features/build/managed-products/use-product-feedback-filters.ts` |
| 347 | `features/build/roadmap/roadmap-item-form-fields.tsx` |
| 346 | `features/build/my-work/use-my-work-data.ts` |

`features/build/intake/components/intake-decision-dialog.tsx` at 506 lines is in the intake-exempt directory but breaches the 500-line hard limit.

---

## Fix Lanes (Disjoint File Groups)

### Lane A — View Layer & Bundle (project-board, all-work, cycle views)
**Owner files:** `all-work-board-section.tsx`, `all-work-view-content.tsx`, `all-work-timeline-section.tsx`, `all-work-calendar-section.tsx`, `cycle-detail-page.tsx`, `project-board-view-pane.tsx`, `list-view-group-rows.tsx`, `list-view-group.tsx`, `list-view.tsx`, `views/project-board-content.tsx`

Work items:
- Convert static KanbanBoard / GanttView / WorkloadView / AllWork*Section imports to `dynamic()` (FE-113)
- Remove client-side "Show N more rows" pattern; replace with server-side paginated list (FE-125/FE-146)
- Remove all `useMemo`/`useCallback` in the above files (FE-114)

### Lane B — Managed Products & Insights (managed-products, evidence-themes, product-feedback)
**Owner files:** `product-feedback-page.tsx`, `evidence-themes-section.tsx`, `product-settings-page.tsx`, `product-roadmap-page.tsx`, `outcome-reviews-section.tsx`, `product-projects-table.tsx`, `product-feedback-filters.tsx`, `use-product-feedback-filters.ts`, `use-product-projects-page.ts`

Work items:
- Fix FE-41 violation in `product-feedback-page.tsx:62` (missing `error`)
- Convert `evidence-themes-section.tsx` recharts import to a dynamic sub-module (FE-113)
- Split files breaching 300-line ratchet into feature + hooks (FE-57)
- Remove manual memoization (FE-114)

### Lane C — Ticket Details & Cycles (ticket-details, cycles, shared types)
**Owner files:** `shared/types.ts`, `ticket-details/remove-relation-button.tsx`, `ticket-details/use-activity-feed.ts`, `ticket-details/ticket-detail-main-section.tsx`, `ticket-details/use-ticket-detail.ts`, `ticket-details/activity-feed.tsx`, `cycles/cycle-planning-sheet.tsx`

Work items:
- Resolve `points`/`storyPoints`/`estimate` alias (FE-143) — canonical: `storyPoints`; update all readers
- Resolve `assigneeId`/`assignee`/`assignees` alias (FE-143) — audit consumers, remove unused paths
- Delete `remove-relation-button.tsx`; inline at `ticket-relations.tsx:293` (FE-140)
- Fix `cycle-planning-sheet.tsx` client-side filter to use a server-side endpoint (FE-146)
- Split over-300 files (FE-57)
- Remove manual memoization (FE-114)

### Lane D — Hooks, Route Handlers & Test Harness (hooks/api/build, app routes, test fixtures)
**Owner files:** `hooks/api/build/recurring.ts`, `hooks/api/build/time-entries.ts`, `features/build/epics/epics-page-test-harness.tsx`, `app/(authenticated)/build/route.ts`, `app/(authenticated)/build/[projectId]/bugs/[submissionId]/route.ts`, `scripts/check-no-business-routes.mjs`

Work items:
- Fix barrel import in `epics-page-test-harness.tsx:179` to domain modules (FE-127/FE-130)
- Add both build redirect routes to `ALLOWED_ROUTES` in `check-no-business-routes.mjs` with documented `reason` and `properties` (FE-06) — or refactor to eliminate the route files
- `recurring.ts:36` `invalidateQueries` on the full ticket detail after recurrence change — consider a targeted `setQueryData` if the response already carries the new ticket state (FE-35/FE-133)
- `time-entries.ts:30` `invalidateQueries({ queryKey: buildWorkQueryKeys.projects.timeEntries() })` invalidates the full time-entries key; patch only the affected ticket's time entry list if the response carries it (FE-133)

---

## Coordinator-Owned Hot Files

These files are shared infrastructure and must not be edited unilaterally by a lane agent:

| File | Why coordinator-owned |
|---|---|
| `frontend/lib/query-keys/build-work.ts` | Defines all Build query key factories; changes ripple across all 40+ hook files |
| `frontend/components/layout/sidebar/sidebar-nav-items.ts` | Single source for Build navigation; FE-53 depends on it |
| `frontend/lib/rbac/route-access/route-access-entries.ts` | Build route permission map; FE-54 gate enforces it |
| `frontend/lib/build/build-route-manifest.ts` | Build route manifest; test fails if pages are not registered |
| `frontend/scripts/check-no-business-routes.mjs` | `ALLOWED_ROUTES` allowlist; editing this is the FE-06 fix for build/route.ts |
| `frontend/hooks/api/build/build-tickets-core-schema.ts` | Shared ticket contract; `storyPoints`/`estimate` alias fix touches every ticket hook |

---

## Backend Contract Changes Needed

| File | Line | Issue |
|---|---|---|
| `hooks/api/build/build-tickets-core-schema.ts` | 11–12, 25–26 | Backend returns both `storyPoints` and `estimate` for the same numeric field. The frontend `KanbanTicket` adds a third name (`points`). A contract fix on the backend to retire one field (and map through the other) unblocks the FE-143 migration. |
| `hooks/api/build/build-tickets-core-schema.ts` | 52, 64, 72 | `assigneeId`, `assignee`, and `assignees` are all present in the response. Backend should decide the canonical shape (single `assignee` object vs. `assignees` list); the frontend can then drop the unused paths. |
| Backend cycle endpoint | — | `cycle-planning-sheet.tsx` reads all board tickets to derive cycle membership. A dedicated `GET /build/:projectId/cycles/:cycleId/tickets?q=&limit=&cursor=` paginated endpoint is needed to fix FE-146. |
| Backend approvals endpoint | — | The inbox fetches one page at a time but the in-memory `pendingItems`/`actionItems` derived counts may be wrong when a page filter is active. A `statusCounts` aggregate from the server (FE-33) would let the tab badges show accurate totals across all pages. |

---

## Summary Counts

| Category | Finding count |
|---|---|
| Alias / duplicate keys (FE-143) | 3 |
| Missing server prefetch (FE-145) | 14 pages |
| Static heavy imports needing dynamic() (FE-113) | 7 |
| Client-side show-more / full-download filter (FE-125/FE-146) | 4 |
| Manual memoization instances (FE-114) | 2,933 |
| Missing `error` in usePageState (FE-41) | 1 |
| Unsanctioned route.ts files (FE-06) | 2 |
| Barrel import in test harness (FE-127/FE-130) | 1 |
| Files over 300-line ratchet outside exempt dirs (FE-57) | 20 |
| Files over 500-line hard limit (FE-57) | 1 |
| Single-button component to inline (FE-140) | 1 |
| Missing/generic loading.tsx skeletons (FE-144) | 2 |
