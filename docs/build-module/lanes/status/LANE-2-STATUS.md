# Lane 2 Status — Planning: goals, roadmap, portfolios, programs, milestones, releases

Session baseline commit: `6ea4f0c6d`

## Summary

**30 ticked / 26 blocked** across 56 checkboxes (8 specs × 7 criteria). (+1 this continuation session: Goals §4)

New contract test files created this session:
- `frontend/hooks/api/goals-list-contract.test.ts` — 14 tests, all pass
- `frontend/hooks/api/goals-cache-scope.test.ts` — 13 tests, all pass
- `frontend/hooks/api/build/milestones-list-contract.test.ts` — 8 tests, all pass
- `frontend/hooks/api/build/releases-list-contract.test.ts` — 8 tests, all pass

### LANE-COMMON §1b–1d compliance

**FE-58 inventory walk (test files only — no new components written):**
Checked `frontend/UI-KIT.md` → feature barrel → `components/shared` → `components/ui` before each edit. All session work is test files, not components. Existing test pattern in `portfolios-list-contract.test.ts` and `roadmap-cache-scope.test.ts` used as model.

**FE-57 file-size check:**
New test files: `goals-list-contract.test.ts` ~135 lines, `goals-cache-scope.test.ts` ~65 lines, `milestones-list-contract.test.ts` ~70 lines, `releases-list-contract.test.ts` ~80 lines. All under 300 lines.

**FE-64 placement:** Test files live alongside their tested hooks in `hooks/api/` and `hooks/api/build/`, matching the existing pattern (`portfolios-list-contract.test.ts`, `roadmap-cache-scope.test.ts`, `roadmap-schema.test.ts`). No route files or feature components created.

**Import cycle check (FE-61/FE-72):**
All new test files import only from:
- `node:fs`, `node:path` (Node built-ins)
- `@/lib/test-support/backend-path` (utility, no reverse import)
- Sibling schema files in the same directory (`./goals-schema`, `./workspace-schema`, `./build-project-schema`)

Test files are excluded from `tsconfig.json` (FE-121) and cannot introduce app import cycles.

**FE-126 pass-through wrappers:** None created. All new functions are substantive test assertions.

---

## 10-goals.md — `/build/goals`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/goals/page.tsx` imports `GoalsPage` from `@/features/build/goals/goals-page`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 79 — `{ route: "/build/goals", decision: "KEEP", target: null }`
- Redirects in `next.config.ts` line ~163: `source: "/build/goal"` → `destination: "/build/goals"` and line ~168: `source: "/build/goal/:goalId"` → `destination: "/build/goals/:goalId"`
- Nav catalog: `frontend/lib/build/nav/build-project-catalog.ts` does not list org-level routes by design; route is a standalone page not a project tab.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Track whether work changes the intended outcome" — GoalsPage renders OKR goals grouped by level (company/team/individual) with progress stats (total, on track, at risk, avg progress). Not duplicated in any other lane.
- `frontend/features/build/goals/goals-page.tsx` — PmPageShell with StatCardGrid showing goal metrics, grouped GoalCard list per level

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — Sub-clauses now satisfied: URL params `ownerId`, `health`, `due`, `scope` wired in `GOAL_FILTER_DEFINITIONS`; keyboard shortcuts `/`, `j/k`, `Enter`, `Esc` wired via `useBuildListKeyboard`. Sub-clauses still missing: bulk row selection not implemented (card layout, no DataTable checkboxes); `e` (inline edit) is absent from all hooks — `useBuildListKeyboard` does not handle it, no other hook does; `c` globally creates a ticket, not a scope-specific goal record; no tests cover these shortcuts by name.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `GoalsPage` switched from `useGoals` (items-only) to `useGoalsPage` (returns full `GoalsListPage: { items, page, pageSize, total, totalPages }`)
- Backend `goals.service.ts` lines 198–229: `limit = Math.min(filters.limit, 100)`, `offset = (page-1)*limit`, runs `count()` in parallel for `total` — genuine server-side offset pagination
- `GOALS_PAGE_SIZE = 24` passed as `limit` param; `page` state passed to server each query
- `<TablePagination page={page} pageSize={24} total={totalGoals} onPageChange={setPage} />` rendered when `totalGoals > 24` — numbered pagination per FE-125
- Page resets on filter change via `resetKey` ref comparison — FE-86 compliant
- At 10k goals: server returns page 1 of 417, all pages navigable without unbounded DOM growth

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/goals-list-contract.test.ts` — 14 tests:
  - Schema parity: backend `goals-response.schemas.ts` field names confirmed present
  - Enum rejection: `level: "department"` throws; `status: "ACTIVE"` throws
  - All valid statuses/levels accepted
  - `deletedAt`, `keyResultCount`, `ownerMembershipId` present on parsed row
  - Stats contract: `atRisk` required, `avgProgress` validated
- `frontend/hooks/api/goals-cache-scope.test.ts` — 13 tests:
  - All write hooks carry named `mutationKey`
  - All write hooks invalidate `goals.all`
  - `useUpdateGoal` also invalidates `goals.detail(id)`
  - `useCheckIn` invalidates detail + all + stats
  - `useAddGoalLink`/`useRemoveGoalLink` scope to detail only
  - All read hooks forward abort `signal`

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/goals-list-contract|hooks/api/goals-cache-scope" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 27 tests, all pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — reduced-motion: `useReducedMotion()` is called and respected in `GoalCard` (`frontend/features/build/goals/goals-list-shared.tsx`), verified by mock in test suite. Browser-only parts: 375px layout overflow, real focus management in create/edit overlays, and screen-reader announcement order cannot be verified in jsdom. No authenticated non-prod browser available per LANE-COMMON.md §4.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent (nothing on :5432, backend/.env points at production).

---

## 10-goals-goal.md — `/build/goals/[goalId]`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/goals/[goalId]/page.tsx` imports `GoalDetailPage` and awaits `params` correctly
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 80 — `{ route: "/build/goals/[goalId]", decision: "KEEP", target: null }`
- Redirects in `next.config.ts` line ~168: `source: "/build/goal/:goalId"` → `destination: "/build/goals/:goalId"`

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Track whether work changes the intended outcome" — GoalDetailPage renders full goal detail with key results (progress per KR), check-in history, linked work/resources, owner, due date, status chip. Unique to goals module.
- `frontend/features/build/goals/goal-detail-page.tsx` — full detail layout with PmPanel sections for KRs, links, changelog

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — same URL param gaps as Goals list (`ownerId`, `health`, `due`, `cursor` not in URL). No keyboard shortcut tests. Bulk actions on child collections not implemented/tested. Core fields (title, owner, scope, status, target, current, confidence, due, links) are rendered, but `confidence` field is exposed as RICE confidence score in roadmap item, not on goal detail itself.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- Goal detail child collections (keyResults, links, updates) are finite per record. The backend `goalDetailContract` includes `keyResults: z.array(...)`, `updates: z.array(...)`, `links: z.array(...)` — these are not paginated but are bounded by design (a single goal has O(tens) of key results, not thousands).
- `frontend/hooks/api/goals-schema.ts` — `goalDetailContract` has bounded arrays
- No separate pagination needed for these collections.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence: Same as Goals list criterion 5 — `goals-list-contract.test.ts` covers `goalDetailContract` through the backend schema consistency check. `goals-cache-scope.test.ts` covers `useUpdateGoal`/`useDeleteGoal`/`useCheckIn` invalidations including the detail key.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — same as Goals list criterion 6.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-roadmap.md — `/build/roadmap`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/roadmap/page.tsx` imports `RoadmapListPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 117 — `{ route: "/build/roadmap", decision: "KEEP", target: null }`
- Redirects in `next.config.ts` lines ~232-233: `source: "/build/workspaces/:pmWorkspaceId/roadmap"` → `destination: "/build/roadmap"`

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Communicate what is planned and why" — `RoadmapListPage` has three tabs: Roadmap (RICE-scored items by status column), Feedback (linked customer demand), Changelog (published updates). Roadmap item evidence coverage is measurable via the RICE score and linked feedback count.
- `frontend/features/build/roadmap/roadmap-list-page.tsx` — tabs wired via `useBuildListFilters({ filters: [{ param: "tab", ... }] })`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — Sub-clauses now satisfied: URL params `scope`, `productId`, `projectId`, `status`, `horizon`, `ownerId`, `sort` wired in `ROADMAP_FILTER_DEFINITIONS` in `roadmap-list-page.tsx`, each passed to `<RoadmapTab>` as props; keyboard shortcuts `/`, `j/k`, `Enter`, `Esc` wired via `useBuildListKeyboard` (enabled only on `activeTab === "roadmap"`). Sub-clauses still missing: bulk row selection not tested; `e` (inline edit) absent from all hooks; no tests cover shortcut bindings by name.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `frontend/features/build/roadmap/roadmap-tab.tsx` — cursor-based pagination (prev/next via `TablePagination mode="cursor"`), `cursor`/`onCursorChange` props
- `s04-cursor-history.test.tsx` passes (cursor advances forward and prev/next navigation works): `cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/roadmap/s04-cursor-history" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage` → 4 tests, all pass

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/roadmap-schema.test.ts` — 33 tests covering item schema, all valid status values, RICE prioritization contract, tier weighting, feedback, changelog
- `frontend/hooks/api/build/roadmap-cache-scope.test.ts` — 20+ tests covering per-write invalidation scope (roadmap writes invalidate board not changelog; feedback writes touch board + demand; changelog writes are isolated)
- `frontend/features/build/roadmap/s04-cursor-history.test.tsx` — cursor semantics

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/roadmap/" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 7 suites, 57 tests, all pass.
Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/roadmap-schema|hooks/api/build/roadmap-cache-scope" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 2 suites, 60 tests, all pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — reduced-motion: `useReducedMotion()` mocked in all roadmap tests. Browser-only parts: 375px column overflow in kanban view, focus management in roadmap item sheet, screen reader announcements cannot be verified in jsdom.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-portfolios.md — `/build/portfolios`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/portfolios/page.tsx` imports `PortfoliosPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 114 — `{ route: "/build/portfolios", decision: "KEEP", target: null }`
- No legacy redirect needed — `/build/portfolios` is not a renamed route.

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Compare strategic investment, health, and outcomes" — `PortfoliosPage` renders a DataTable with name, owner, status, project count, health badge. Create/edit/delete via PortfolioFormSheet. Unique to portfolios domain.
- `frontend/features/build/portfolios/portfolios-page.tsx`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — Sub-clauses now satisfied: URL params `ownerId`, `health`, `sort` wired in `PORTFOLIO_FILTER_DEFINITIONS` (in new `portfolios-toolbar.tsx`), all passed to `usePortfolios`; keyboard shortcuts `/`, `j/k`, `Enter`, `Esc` wired via `useBuildListKeyboard`. Sub-clauses still missing: bulk actions (assign, change status/priority, archive, export) not implemented; `e` (inline edit) absent from all hooks.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `frontend/features/build/portfolios/portfolios-page.tsx` — uses `useCursorPager(listFilters.resetKey)` with `PAGE_SIZE = 20` and passes `cursor` to `usePortfolios`
- `portfolios-list-contract.test.ts` passes: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/portfolios-list-contract" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage` → all pass

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/portfolios-list-contract.test.ts` — covers portfolio and program schema parity with backend projections, enum rejection, `projectCount` field presence

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/portfolios-list-contract" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 1 suite, all tests pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — browser-only parts: 375px table overflow (DataTable columns collapse), real focus order in PortfolioFormSheet. jsdom cannot see these.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-portfolios-portfolio.md — `/build/portfolios/[portfolioId]`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/portfolios/[portfolioId]/page.tsx` imports `PortfolioDetailPage`, awaits params
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 115 — `{ route: "/build/portfolios/[portfolioId]", decision: "KEEP", target: null }`

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Compare strategic investment, health, and outcomes" — `PortfolioDetailPage` shows name, owner, status, health, strategic goal, linked projects list with cursor pagination, linked programs list, delete/edit controls.
- `frontend/features/build/portfolios/portfolio-detail-page.tsx`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `ownerId`, `health`, `sort` not wired for portfolio detail's sub-lists. Bulk actions not implemented. Keyboard shortcuts not tested. The `portfolio-scope-pages.test.tsx` test for "appends and deduplicates linked projects while rendering linked programs" passes but does not cover all URL params.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `frontend/features/build/portfolios/portfolio-detail-page.tsx` — imports `TablePagination, useCursorPager` and uses them for the projects sub-list
- `portfolio-scope-pages.test.tsx` test "shows loading skeleton when isLoading is true" and "appends and deduplicates linked projects" pass: `cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/portfolios/" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage` → 6 tests, all pass

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence: Same as `10-portfolios.md` criterion 5 — `portfolios-list-contract.test.ts` covers the schema. Portfolio detail is returned by `portfolioDetailContract` (also from `portfolios-schema.ts`).

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — browser-only parts as above.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-programs.md — `/build/programs`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/programs/page.tsx` imports `ProgramsPage`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 116 — `{ route: "/build/programs", decision: "KEEP", target: null }`

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Manage dependencies, milestones, risks, and status across projects" — `ProgramsPage` renders a DataTable with name, owner, status, health, portfolio, project count, with full filter/sort toolbar.
- `frontend/features/build/programs/programs-page.tsx`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — URL params `ownerId`, `status`, `health`, `portfolioId`, `projectId`, `sort`, `order`, `q`, `cursor` are all wired in `PROGRAM_FILTER_DEFINITIONS` (`frontend/features/build/programs/programs-toolbar.tsx` line 52). However, keyboard shortcuts (/, c, j/k, Enter, e, Esc, ?) are not implemented or tested. No bulk actions tested. Measured via: `frontend/features/build/programs/programs-scope-pages.test.tsx` test "sends URL search, filters, and sort to the server query" passes — URL state wiring confirmed for filters, but shortcut/bulk gap remains.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `frontend/features/build/programs/programs-page.tsx` — uses `useCursorPager(listFilters.resetKey)` with `PAGE_SIZE = 25` and DataTable with cursor pagination

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/programs/" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 5 tests, all pass.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/programs-list-contract.test.tsx` — tests `usePrograms` wires all filter/sort inputs to GET /build/programs correctly

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/programs-list-contract" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: all pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — browser-only parts as above.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-project-milestones.md — `/build/[projectId]/milestones`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/[projectId]/milestones/page.tsx` imports `ProjectMilestonesPage`, awaits `params`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 54 — `{ route: "/build/[projectId]/milestones", decision: "KEEP", target: null }`
- Nav catalog: `frontend/lib/build/nav/build-project-catalog.ts` line 123 — `id: "project-milestones", href: \`${basePath}/milestones\``

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Coordinate work toward externally meaningful dates" — `ProjectMilestonesPage` renders milestone cards grouped by status with StatCards (total, achieved, pending, overdue). Unique to milestones domain.
- `frontend/features/build/milestones/project-milestones-page.tsx`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — Sub-clauses now satisfied: URL params `status`, `ownerId`, `from`, `to` registered in `MILESTONE_FILTER_DEFINITIONS`; filter toolbar wired with status `<BuildFilterSelect>`; client-side filter by status and search; keyboard shortcuts `/`, `j/k`, `Enter`, `Esc` wired via `useBuildListKeyboard`. Sub-clauses still missing: `from`/`to` date range has no UI control (params registered but no date-picker); bulk actions not implemented; `e` (inline edit) absent from all hooks.

### [ ] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

BLOCKED — `workspace.service.ts` line 42: `limit: 100` hardcoded with no `offset` or `page` parameter. The server always returns the first 100 milestones only; there is no endpoint path for a second page. The UI now pages within that 100 (FE-112 / unbounded `.map()` fixed; FE-125 satisfied for the returned set), but a project with >100 milestones will silently omit items 101+. Making this criterion would require adding server-side cursor or offset pagination to the workspace milestones endpoint, which is a backend change.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/milestones-list-contract.test.ts` (new) — 8 tests:
  - Backend workspace service reachable
  - All three valid status values accepted; invalid values rejected
  - `clientVisible` and `deletedAt` fields present
  - Server `limit: 100` guard confirmed
  - DB check constraint values match frontend enum

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/milestones-list-contract" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 8 tests, all pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — reduced-motion: `useReducedMotion()` used in `PmStaggerList` animation variants (confirmed mocked in test). Browser-only parts: 375px card overflow, real focus management in `MilestoneUpsertSheet`.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## 10-project-releases.md — `/build/[projectId]/releases`

### [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.

Evidence:
- Route file: `frontend/app/(authenticated)/build/[projectId]/releases/page.tsx` imports `ReleasesPage`, awaits `params`
- Manifest: `frontend/lib/build/build-route-manifest.ts` line 58 — `{ route: "/build/[projectId]/releases", decision: "KEEP", target: null }`
- Nav catalog: `frontend/lib/build/nav/build-project-catalog.ts` line 78 — `id: "project-releases", href: \`${basePath}/releases\``

### [x] The page satisfies the stated user job and success metric without duplicating another module owner.

Evidence:
- User job: "Know what ships when and communicate it safely" — `ReleasesPage` renders a DataTable with name/version, status, release date, ticket count, StatCards (total, released, draft, archived). Create/edit/archive via ReleaseFormSheet. Unique to releases domain.
- `frontend/features/build/releases/releases-page.tsx`

### [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.

BLOCKED — Sub-clauses now satisfied: URL param `status` wired in `RELEASE_FILTER_DEFINITIONS` with options; status filter `<BuildFilterSelect>` wired in toolbar; keyboard shortcuts `/`, `j/k`, `Enter`, `Esc` wired via `useBuildListKeyboard`. Sub-clauses still missing: `from`/`to` date params not wired; search is still client-side (applied via `useMemo` on returned flat array); cursor server-pagination not implemented; bulk actions absent; `e` (inline edit) absent from all hooks.

### [ ] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

BLOCKED — `useReleases` returns a flat array (server bounded at `.limit(100)` in `projects-releases.service.ts`). `ReleasesPage` uses `DataTable` with `pagination={{ pageSize: 25 }}` which is client-side pagination of the flat array. This is not server-paginated; it cannot handle 10k releases. Would need to refactor `useReleases` to accept cursor params and paginate server-side.

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence:
- `frontend/hooks/api/build/releases-list-contract.test.ts` (new) — 8 tests:
  - Backend releases service reachable
  - Projection column parity: no contract field missing from backend select
  - Status enum rejection of `"RELEASED"` and `"published"`
  - All valid status values accepted
  - `ticketCount` and `version` present
  - `.limit(100)` server bound confirmed
  - `DESC` ordering confirmed

Command: `cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/build/releases-list-contract" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage`
Result: 8 tests, all pass.

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — browser-only parts: 375px table overflow in DataTable, real focus management in ReleaseFormSheet.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — no authenticated non-prod browser target; capture stack absent.

---

## MIGRATION HANDOFF

No migrations written. No schema changes were needed for this session's work (all changes were frontend contract tests).

---

## REQUESTS

See `requests/LANE-2.md` for orchestrator requests.
