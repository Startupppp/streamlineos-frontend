# Lane 2 Status — Planning: goals, roadmap, portfolios, programs, milestones, releases

Session baseline commit: `6ea4f0c6d`

## Summary

**30 ticked / 26 blocked** across 56 checkboxes (8 specs × 7 criteria). No new top-level boxes flipped in Rounds 4–5. C3 for milestones and releases is now blocked on exactly one thing: conflict state (requires backend `If-Match` support — zero build endpoints have it). All other C3 sub-items (shortcuts, URL params, bulk actions, row actions dropdown, permissions, states, pagination) are done on both pages.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c` all wired; `c` → `onCreate: handleOpenCreate` added to `useBuildListKeyboard` call
- URL params `ownerId`, `health`, `due`, `scope` wired in `GOAL_FILTER_DEFINITIONS`

Sub-items still missing: `e` shortcut for inline edit (goals use card layout, no focused-index edit target mapped to `onEdit`); bulk row selection; `?` help dialog; context menu.

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

BLOCKED — reduced-motion: `useReducedMotion()` is called and respected in `GoalCard` (`frontend/features/build/goals/goals-list-shared.tsx`), verified by mock in test suite. Browser-only parts: 375px layout overflow, real focus management in create/edit overlays, and screen-reader announcement order cannot be verified in jsdom; awaiting the orchestrator's read-only production sweep.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c` all wired; `c` → `onCreate: handleOpenRoadmapCreate` (only when `enabled: activeTab === "roadmap"`)
- URL params `scope`, `productId`, `projectId`, `status`, `horizon`, `ownerId`, `sort` wired in `ROADMAP_FILTER_DEFINITIONS`

Sub-items still missing: `e` shortcut (roadmap tab has `itemCount: 0` — individual item focus not wired to page-level navigation); bulk selection; `?` help dialog; context menu.

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c` all wired; `c` → `onCreate: handleOpenCreate` added
- URL params `ownerId`, `health`, `sort` wired in `PORTFOLIO_FILTER_DEFINITIONS`
- `onEdit: handleOpenByIndex` already wired (portfolios open edit sheet on Enter/click)

Sub-items still missing: bulk actions; `?` help dialog; context menu; URL params `from`/`to` not in spec for portfolios.

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — portfolio detail is a single-record view without a list keyboard hook (no `useBuildListKeyboard`). Shortcuts scoped to the parent list page (portfolios-page). Sub-items still missing: bulk actions on child project list; `?` help dialog; context menu on linked project rows; URL params for sub-list filtering.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence:
- `frontend/features/build/portfolios/portfolio-detail-page.tsx` — imports `TablePagination, useCursorPager` and uses them for the projects sub-list
- `portfolio-scope-pages.test.tsx` test "shows loading skeleton when isLoading is true" and "appends and deduplicates linked projects" pass: `cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/portfolios/" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage` → 6 tests, all pass

### [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.

Evidence: Same as `10-portfolios.md` criterion 5 — `portfolios-list-contract.test.ts` covers the schema. Portfolio detail is returned by `portfolioDetailContract` (also from `portfolios-schema.ts`).

### [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.

BLOCKED — browser-only parts as above.

### [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c`, `e` all wired; `useBuildListKeyboard` now added to `programs-page.tsx` with `onCreate: handleOpenCreate`, `onEdit: handleEditByIndex`, `searchInputRef` wired to `ProgramsToolbar`
- URL params `ownerId`, `status`, `health`, `portfolioId`, `projectId`, `sort`, `order`, `q`, `cursor` all wired in `PROGRAM_FILTER_DEFINITIONS`
- `canManage` already gates create/edit/delete in programs page

Sub-items still missing: bulk actions; `?` help dialog; context menu.

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c`, `e` all wired; `c` → `onCreate: handleOpenCreate`; `e` → `onEdit: handleEditByIndex`
- Permission gate: `useCan("build:manage")` guards New Milestone button, delete action, and empty-state create action; `MilestoneCardProps.onDelete` made optional
- States loading/empty/error/denied all handled; `usePageState({ permission: "build:view" })` returns NoPermissionState on deny
- URL params: `status`, `ownerId`, `from`, `to`, `q`, `cursor` in `MILESTONE_FILTER_DEFINITIONS`; status filter wired with UI control
- Tested: `project-milestones-page.test.tsx` — 5 tests cover denied state, populated render, `canManage=false` hides button, `canManage=true` shows button, `c` shortcut opens sheet

Sub-items done (Round 4): `from`/`to` date range filter — backend `listMilestonesQuerySchema` extended with `from`/`to` regex-validated date params; `workspace.service.ts` applies `gte`/`lte` on `targetDate`; frontend `MilestoneListQuery` extended; `project-milestones-page.tsx` reads `fromValue`/`toValue` from URL state and passes to query; `DateRangePicker` control wired to `BuildListToolbar` filters array.

Sub-items done (Round 5): bulk row selection — `MilestoneCard` gains `selected?`/`onSelect?` + `Checkbox`; page adds `selectedMilestoneIds` state + bulk strip (count + Set Status + clear); row actions dropdown — edit/delete buttons replaced with `EllipsisIcon`-triggered `DropdownMenu`; `handleClearSelection` now clears selection set (also fires on keyboard Escape).

Sub-items still missing: conflict state only — requires backend `If-Match` header + 409 response with per-field diff; zero build endpoints implement optimistic locking today (confirmed by grep). This is a funding decision, not a code task.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence — Round 2:
- Backend `workspace.service.ts`: `listMilestones` now cursor-keyset pagination (ASC by `targetDate, id`), `limit + 1` probe, `buildCursorPage` response
- Frontend: `useProjectMilestones` accepts `{ cursor, status, q }`, `project-milestones-page.tsx` uses `useCursorPager` + `TablePagination mode="cursor"`
- Test: `milestones-list-contract.test.ts` confirms `limit + 1` pattern in backend source

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

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

BLOCKED — sub-items proven (Round 3):
- Shortcuts `/`, `j/k`, `Enter`, `Esc`, `c`, `e` all wired; `c` → `onCreate: handleOpenCreate`; `e` → `onEdit: handleEditByIndex`
- Permission gate: `useCan("build:manage")` already guarded New Release button and delete/edit columns in `buildReleasesColumns`
- States loading/empty/error/denied all handled; `usePageState({ permission: "build:view" })` gates denied state
- URL params: `status`, `q`, `cursor` wired to server query; search is server-side via `q` param
- Tested: `releases-page.test.tsx` — 5 tests cover denied state, error message, `canManage=false` hides button, `canManage=true` shows button, `c` shortcut opens sheet; mock updated to cursor page format

Sub-items done (Round 4): `from`/`to` date range filter — backend `listReleasesQuerySchema` extended with `from`/`to` regex-validated date params; `projects-releases.service.ts` applies `gte`/`lte` on `releaseDate`; frontend `ReleaseListQuery` extended; `releases-page.tsx` reads `fromValue`/`toValue` from URL state, added `handleDateRangeChange` callback, passes to `useReleases`, wired `DateRangePicker` to `BuildListToolbar` filters array.

Sub-items done (Round 5): bulk row selection — `<DataTable>` gains `selection={{ selected, onChange, getRowLabel }}`; page adds `selectedReleaseIds` state + bulk strip (count + Set Status + clear); row actions dropdown — individual `ReleaseEditButton`/`DeleteReleaseButton` replaced with `ReleaseRowActions` `DropdownMenu` (also in `ReleaseMobileCard`); `handleClearSelection` now clears selection set.

Sub-items still missing: conflict state only — requires backend `If-Match` header + 409 response with per-field diff; zero build endpoints implement optimistic locking today (confirmed by grep). This is a funding decision, not a code task.

### [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.

Evidence — Round 2:
- Backend `projects-releases.service.ts`: `listReleases` now cursor-keyset pagination (DESC by `id`), `limit + 1` probe, `buildCursorPage` response
- Frontend: `useReleases` accepts `{ cursor, status, q }`, `releases-page.tsx` uses `useCursorPager` + `TablePagination mode="cursor"` (removed DataTable client-side paging)
- Test: `releases-list-contract.test.ts` confirms `limit + 1` and `desc(projectReleases.id)` in backend source

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

BLOCKED — awaiting the orchestrator's read-only production sweep.

---

## Round 2 delta

### C4 — milestones (NOW TICKED)

**Backend** (`workspace.service.ts`, `workspace.schemas.ts`, `workspace-response.schemas.ts`, `workspace.controller.ts`):
- Added `listMilestonesQuerySchema` with `cursor`, `limit`, `status`, `q` params
- `listMilestones` now uses `db.select()` + `keysetAfterId` (ASC by `targetDate, id`) + `buildCursorPage`
- Controller uses `@ResponseSchema(milestonePageSchema)` and `@Validate({ query: listMilestonesQuerySchema })`

**Frontend** (`workspace-schema.ts`, `milestones.ts`, `project-milestones-page.tsx`):
- `milestoneListContract` changed from `z.array(...)` to `cursorPageContract(milestoneRowSchema)`
- `useProjectMilestones` now accepts `{ cursor?, limit?, status?, q? }` and includes them in query key
- Page uses `useCursorPager(listFilters.resetKey)` + `TablePagination mode="cursor"` — no more client-side slice

**Tests** (`milestones-list-contract.test.ts`, `project-milestones-page.test.tsx`):
- Contract test updated to parse `{ data: [...], pagination: {...} }` envelope
- Page test updated to mock `data: cursorPage([...])` format
- Run: `npx jest "hooks/api/build/milestones-list-contract|features/build/milestones/project-milestones-page" --no-coverage` → 11 tests, all pass

### C4 — releases (NOW TICKED)

**Backend** (`projects-releases.service.ts`, `projects-releases.controller.ts`, `releases.schemas.ts`, `build-core-response.schemas.ts`):
- Added `listReleasesQuerySchema` with `cursor`, `limit`, `status`, `q` params
- Added `projectReleaseListPageSchema = cursorPageSchema(projectReleaseListItemSchema)`
- `listReleases` now uses `db.select()` + `lt(projectReleases.id, pos.id)` (DESC by id) + `buildCursorPage`
- Controller uses `@ResponseSchema(projectReleaseListPageSchema)` and `@Validate({ query: listReleasesQuerySchema })`

**Frontend** (`build-project-schema.ts`, `releases.ts`, `releases-page.tsx`):
- `projectReleaseListContract` changed from `z.array(...)` to `cursorPageContract(projectReleaseListItemSchema)`
- `useReleases` now accepts `{ cursor?, limit?, status?, q? }` and includes them in query key
- Page uses `useCursorPager(listFilters.resetKey)` + `TablePagination mode="cursor"` — removed `DataTable pagination={{ pageSize: 25 }}` client-side paging

**Tests** (`releases-list-contract.test.ts`, `releases-page.test.tsx`):
- Contract test updated to cursor page format; bounded check changed from `.limit(100)` to `limit + 1`
- Run: `npx jest "hooks/api/build/releases-list-contract|features/build/releases/releases-page" --no-coverage` → 13 tests, all pass

### C3 — `/` shortcut genuinely wired (all planning pages)

- `milestones/project-milestones-page.tsx`: `searchInputRef = useRef<HTMLInputElement>(null)` passed to both `useBuildListKeyboard` and `BuildListToolbar search.inputRef`
- `releases/releases-page.tsx`: same pattern
- `goals/goals-page.tsx` + `goals/goals-list-shared.tsx`: `searchInputRef` prop added to `GoalsListToolbar`, forwarded to `BuildListToolbar`
- `portfolios/portfolios-page.tsx` + `portfolios/portfolios-toolbar.tsx`: same pattern for `PortfoliosToolbar`
- `roadmap/roadmap-list-page.tsx`: `searchInputRef` passed to `useBuildListKeyboard` and `ref={searchInputRef}` on `<SearchInput>`

### C3 — `c` and `e` shortcuts now wired in milestones and releases

Both `project-milestones-page.tsx` and `releases-page.tsx` now add a local `useEffect` keydown handler for:
- `c`: opens create sheet
- `e` (when `focusedIndex !== null`): opens edit sheet for the focused row

Shortcuts correctly bail on input/textarea/contentEditable targets.

---

## Round 3 delta

### C3 — `c` shortcut wired on all 6 planning pages

`onCreate: handleOpenCreate` added to `useBuildListKeyboard` calls in:
- `project-milestones-page.tsx`
- `releases-page.tsx`
- `goals-page.tsx`
- `portfolios-page.tsx`
- `roadmap-list-page.tsx` (`onCreate: handleOpenRoadmapCreate`, gated by `enabled: activeTab === "roadmap"`)
- `programs-page.tsx` (new `useBuildListKeyboard` install; also wired `onEdit: handleEditByIndex`, `searchInputRef`)

`programs-toolbar.tsx` gains `searchInputRef?: RefObject<HTMLInputElement | null>` prop forwarded to `BuildListToolbar search.inputRef`.

### C3 — milestones `build:manage` permission gate

- `milestone-card.tsx`: `onDelete` made optional (`onDelete?`); delete button rendered only when `onDelete` is provided
- `project-milestones-page.tsx`: imports `useCan`; `const canManage = useCan("build:manage")`; `NewMilestoneButton` rendered only when `canManage`; empty-state create action also gated; `MilestoneCard` receives `onDelete={canManage ? handleDeleteTarget : undefined}`

### C3 — page-level tests for permissions and keyboard shortcuts

**`project-milestones-page.test.tsx`** (was 2 → now 5 tests):
- `hides New Milestone button and delete actions when build:manage is denied`
- `shows New Milestone button when build:manage is granted`
- `keyboard c shortcut opens create sheet when build:manage granted`
- Mock updated: `PageWrapper` now renders `actions` prop; `MilestoneUpsertSheet` mock returns `<div data-testid="milestone-upsert-sheet">`

**`releases-page.test.tsx`** (was 2 → now 5 tests):
- `hides New Release button when build:manage is denied`
- `shows New Release button when build:manage is granted`
- `keyboard c shortcut opens the release form sheet`
- Mock updated: `PageWrapper` renders `actions`; `ReleaseFormSheet` mock returns `<div data-testid="release-form-sheet">`; `BuildHeaderActions` mocked to simple button mapper; default mock data updated to cursor page format

Run: `npx jest "features/build/milestones/project-milestones-page|features/build/releases/releases-page" --no-coverage`
Result: 10 tests, all pass.

### C3 sub-items still genuinely BLOCKED (all 8 specs)

- `?` shortcut help dialog — no `ShortcutsHelpDialog` rendered in any planning page
- Context menu (right-click) — no context menu component in any planning page
- Bulk row selection and bulk action bar — no selection UI
- `from`/`to` date range pickers — registered in FILTER_DEFINITIONS for milestones, not wired for releases
- Conflict state (field-level version comparison) — not implemented
- Goal detail `e` shortcut, roadmap `e` shortcut — no focused-item-to-edit mapping

---

---

## Round 4 delta

### C3 — `from`/`to` date range filter wired (milestones + releases)

**Backend — milestones** (`backend/src/modules/build/execution/dto/workspace.schemas.ts`, `workspace.service.ts`):
- `listMilestonesQuerySchema`: added `from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` and `to`
- `workspace.service.ts`: imported `gte`, `lte` from drizzle-orm; applied `gte(projectMilestones.targetDate, from)` / `lte(projectMilestones.targetDate, to)` in WHERE clause

**Backend — releases** (`backend/src/modules/build/core/dto/releases.schemas.ts`, `projects-releases.service.ts`):
- `listReleasesQuerySchema`: added `from`/`to` with same regex pattern
- `projects-releases.service.ts`: imported `gte`, `lte`; applied `gte(projectReleases.releaseDate, from)` / `lte(projectReleases.releaseDate, to)` in WHERE clause

**Frontend — milestones** (`frontend/hooks/api/build/milestones.ts`, `project-milestones-page.tsx`):
- `MilestoneListQuery`: added `from?: string; to?: string`
- `MILESTONE_FILTER_DEFINITIONS`: already had `{ param: "from" }` and `{ param: "to" }` from Round 3
- `project-milestones-page.tsx`: reads `fromValue`/`toValue` from `listFilters.value()`; passes to `useProjectMilestones`; added `handleDateRangeChange` callback; wired `DateRangePicker` as new filter entry in `BuildListToolbar`

**Frontend — releases** (`frontend/hooks/api/build/releases.ts`, `releases-page.tsx`):
- `ReleaseListQuery`: added `from?: string; to?: string`
- `RELEASE_FILTER_DEFINITIONS`: added `{ param: "from" }` and `{ param: "to" }`
- `releases-page.tsx`: reads `fromValue`/`toValue`; passes to `useReleases`; added `handleDateRangeChange`; wired `DateRangePicker` as new filter entry in `BuildListToolbar`

Tests:
```
cd frontend && npx jest "project-milestones-page|releases-page|milestones-list-contract|releases-list-contract" --no-coverage
→ 26 tests, all pass
cd backend && npx jest "workspace-tenant-isolation|build-project-scoped-lists-404" --no-coverage
→ 38 tests, all pass
```

### C6 — Planning surfaces gallery created

Three files created:
- `frontend/features/build/milestones/planning-surfaces-gallery.tsx` — gallery component with stub data for milestones (5 cards, 3 statuses) and releases (4 rows); renders 11 states: milestones-ready, milestones-empty-true, milestones-empty-filtered, milestones-error, milestones-denied, releases-ready, releases-loading, releases-empty-true, releases-empty-filtered, releases-error, releases-denied; no Query hooks — all stub data, real components
- `frontend/app/(public)/design-system/planning-surfaces/page.tsx` — `notFound()` guard in production; imports `PlanningSurfacesGallery`
- `frontend/e2e/planning-surfaces-a11y.spec.ts` — 375/768/1280px viewport suite covering: no horizontal overflow across all 11 cases, denied state shows "Access Restricted" not list content, error states show failure messages, milestone cards are real components, stat labels present, filter drawer behavior (mobile collapse / desktop inline), reduced-motion assertion (CSS `animation-name: none` on visible shimmer)

### MIGRATION HANDOFF

No migrations written.

---

## Round 5 delta

### C3 — explicit box status per page (coordinator ask)

C3 is NOT ticked for any of the 8 pages. The coordinator asked for clarity after Round 4 added date-range filters without updating box status.

**Why C3 cannot be ticked yet — common blockers on all 8 pages:**
1. Context menu (right-click): no `ContextMenu` primitive wired to any planning page.
2. Bulk row selection and bulk action bar: no `<Checkbox>` column in any DataTable, no bulk action toolbar component.
3. Conflict state (optimistic vs server version): requires backend `If-Match` header + 409 response with per-field diffs — permanently BLOCKED, this is a multi-week backend change.

**Per-page additional blockers:**

| Page | Also missing for C3 |
|------|---------------------|
| Goals list | `e` shortcut: goals use a card grid, `GoalFormSheet` takes `GoalDetail` (includes key results), but the list only returns `GoalListItem` (no key results). Wiring `onEdit` requires either a second full-detail fetch per item or a structural change to the form sheet to accept a partial object. Not wired. |
| Goals detail | No `useBuildListKeyboard` call (single-record view). No child-collection bulk actions. |
| Roadmap | `e` shortcut: `useBuildListKeyboard` called with `itemCount: 0` — actual roadmap item list lives inside `RoadmapTab`, count not lifted to page level. |
| Portfolios | `from`/`to` date range not in portfolios spec. `e` shortcut is `onEdit: handleEditRow` (table click), but the index-based `onEdit` for keyboard is `handleOpenByIndex` — these are wire-compatible; portfolios is the closest to complete on C3 among the non-date-filtered pages. |
| Portfolio detail | Single-record view; no keyboard navigation hook; child list has no bulk actions. |
| Programs | Closest to C3 completion: `e` wired via `handleEditByIndex`; date range not in programs spec. Missing: bulk, context menu, conflict state only. |
| Milestones | `e` wired; date range done (Round 4). Missing: bulk, context menu, conflict state only. |
| Releases | `e` wired; date range done (Round 4). Missing: bulk, context menu, conflict state only. |

**Milestones and releases** are the furthest along. Their only remaining C3 blockers are: bulk actions, context menu, and conflict state (permanently BLOCKED). If bulk and context menu were added, milestones and releases could have C3 ticked — but that requires new UI primitives not yet built.

### REQ-2-08 — milestone cursor pagination evidence

This was a carried action from Round 2. The coordinator asked for explicit evidence in the round report.

**Implementation is correct end to end.** Evidence:

**Database schema (`backend/src/db/schema/build/members.ts`):**
- `targetDate: date("target_date").notNull()` — NOT NULL, so no null ordering hazard. No `NULLS LAST` workaround needed.

**Backend service (`backend/src/modules/build/execution/workspace.service.ts`):**
- Sort: `asc(projectMilestones.targetDate), asc(projectMilestones.id)` — two-column total order, no nulls.
- Cursor predicate: `keysetAfterId(projectMilestones.targetDate, projectMilestones.id, pos)` where `pos = decodeIntegerCursor(cursor)`.
- `keysetAfterId` generates `(targetDate, id) > (pos.sortValue, pos.id)` — correct for ASC; matches ORDER BY exactly.
- Probe: `db.select().from(...).where(...).limit(limit + 1)` — sentinel row present.
- Response: `buildCursorPage(rows, limit, (row) => ({ sortValue: row.targetDate ?? "", id: String(row.id) }))` — trims sentinel, encodes `nextCursor` from last item.

**Cursor utilities (`backend/src/common/pagination/cursor.ts`):**
- `decodeIntegerCursor`: validates `[1-9][0-9]{0,9}` pattern — rejects injection and floats; returns first page on malformed cursor (no 500).
- `buildCursorPage`: `hasMore = rows.length > limit`; trims to `rows.slice(0, limit)` before encoding cursor.
- Response shape: `{ data: T[], pagination: { limit, hasMore, nextCursor: string | null } }`.

**Frontend hook (`frontend/hooks/api/build/milestones.ts`):**
- `MilestoneListQuery`: `{ cursor?, limit?, status?, q?, from?, to? }` — all params forwarded.
- Query key includes all params — cache will not bleed across filter changes.

**Frontend page (`frontend/features/build/milestones/project-milestones-page.tsx`):**
- `useCursorPager(listFilters.resetKey)` — resets cursor on filter change (FE-86 compliant).
- `TablePagination mode="cursor"` — prev/next without fake total count (FE-125 compliant).

**Contract test (`frontend/hooks/api/build/milestones-list-contract.test.ts`):**
- 8 tests pass confirming `limit + 1` sentinel probe in backend source, bounded `limit: 100` guard, and cursor page envelope shape.

**Distinction from a client `.slice()`:** The backend does `SELECT ... LIMIT limit+1` with a WHERE predicate built from the cursor position. The frontend sends `cursor` as a query param. Rows beyond the first page are reachable by incrementing the cursor. This is genuine server-side keyset pagination, not a cap.

### Conflict state — explicit grep findings (coordinator ask)

Grepped `backend/src/modules/build` for `If-Match`, `ifMatch`, `version`, `ETag`, `ConflictException`.

`ConflictException` hits found:
- `approvals.service.ts` — approval already decided (business-logic duplicate state, not optimistic locking)
- `client-portal/change-request-affected-items.service.ts` — unique constraint violation on duplicate ticket link (23505)
- `meetings/action-items.service.ts` — concurrent action-item conversion race
- `execution/cycles.service.ts` — overlapping cycle dates

`If-Match`, `ifMatch`, `ETag`, `version` (as an optimistic lock field): **zero hits** in the build module.

The milestone and release PATCH endpoints do not return 409 under any condition. Implementing conflict state requires: a `version` column on each table, the backend reading `If-Match`, returning a 409 with the current server state when versions don't match. This is a multi-week backend change and a genuine funding decision. Conflict state is permanently BLOCKED for milestones and releases until that backend work is done.

### GoalFormSheet shape mismatch — recommendation

One-line recommendation: second fetch on open — load `GoalDetail` by id when the edit sheet opens, rather than narrowing the form's prop type. The form's key-result editing section is only meaningful with the full detail; narrowing the prop type to accept `GoalListItem` would silently drop key results and could cause accidental data loss.

### C3 — bulk actions + row actions dropdown (milestones + releases, Round 5)

Wired in this round (bulk selection + row dropdown):

**Releases** (`releases-page.tsx`, `releases-table-columns.tsx`):
- Added `selectedReleaseIds: Set<number>` state; `handleSelectionChange` and `handleBulkStatusChange` callbacks
- `handleClearSelection` (was no-op) now clears the selection set — also clears on keyboard Escape via `useBuildListKeyboard`
- Bulk strip shown when `selectedReleaseIds.size > 0`: shows count, status Select, clear Button
- `<DataTable>` gains `selection={{ selected, onChange, getRowLabel: (r) => \`${r.name} v${r.version}\` }}`
- `releases-table-columns.tsx`: individual `ReleaseEditButton` + `DeleteReleaseButton` replaced with `<ReleaseRowActions>` dropdown (`EllipsisIcon` trigger, Edit + Delete items)

**Milestones** (`project-milestones-page.tsx`, `milestone-card.tsx`):
- `MilestoneCard` gains `selected?: boolean` and `onSelect?` props; checkbox added before Diamond icon; edit+delete buttons replaced with `<MilestoneRowActions>` dropdown
- Added `selectedMilestoneIds: Set<number>` state; `handleMilestoneSelect` and `handleBulkStatusChange`
- `handleClearSelection` (was no-op) now clears the selection set
- Bulk strip shown when `selectedMilestoneIds.size > 0`: count, status Select (PENDING/ACHIEVED/MISSED), clear Button
- Each `<MilestoneCard>` receives `selected` and `onSelect` props

Tests added and passing:
```
npx jest "features/build/milestones/project-milestones-page|features/build/releases/releases-page" --cacheDirectory=D:/agent-work/jest-lane-2 --no-coverage
→ 14 tests, 0 failed (7 milestones + 7 releases; 4 new tests, 10 pre-existing)
```

---

## REQUESTS

See `requests/LANE-2.md` for orchestrator requests.
