# Wave-E-03 Status: Project Root, Issues, Workload

## clientId URL parameter — answered

**File:** `frontend/features/build/project-list/projects-page.tsx`  
**Line 139:** `const filterClientId = searchParams.get("clientId") ?? undefined;`

The parameter is read from the URL and used in three places:

1. `hasFiltersOrSearch` computation (lines 239–243) — only affects whether the "clear filters" button and "No projects match your filters" copy appear, not what data is returned.
2. `handleClearFilters` (line 183) — sets it to null when clearing all filters.
3. Nowhere else.

It is **not** passed to `useInfiniteProjects` (lines 198–207) and not passed to `filterVisibleProjects` (lines 228–237). Setting `?clientId=xyz` in the URL shows a "clear filters" affordance but returns the same projects as without it.

**Verdict: genuinely inert as a filter.** The existing test at `projects-page-url-params.test.tsx:112–118` documents this honestly — its name says "reserved for when the API adds server-side support." Box 3 on the projects list page (`10-org-projects.md`) should not be credited to this parameter unless it is wired through to the API. That spec is not one I own; I am recording the finding here for the orchestrator.

---

## Test results — all suites run by this lane

```
npx jest --runTestsByPath \
  "features/build/overview/project-overview-page.test.tsx" \
  "features/build/project-detail/project-board-page.test.tsx" \
  "features/build/project-list/projects-page-url-params.test.tsx" \
  "features/build/project-list/projects-page-empty.test.tsx" \
  "features/build/project-list/projects-page-denied.test.tsx" \
  "features/build/shared/use-build-list-keyboard.test.ts" \
  --no-coverage

PASS features/build/shared/use-build-list-keyboard.test.ts
PASS features/build/project-detail/project-board-page.test.tsx
PASS features/build/overview/project-overview-page.test.tsx
PASS features/build/project-list/projects-page-empty.test.tsx
PASS features/build/project-list/projects-page-url-params.test.tsx
PASS features/build/project-list/projects-page-denied.test.tsx
Test Suites: 6 passed, 6 total
Tests:       60 passed, 60 total
```

---

## Changes made this wave

### Source changes

**`frontend/features/build/views/use-board-navigation-actions.ts`**  
Fixed `handleCreateOpenChange`: the `open=true` branch previously returned early (was a no-op). Changed to set `?create=1` in the URL, so the `c` keyboard shortcut can open the create-ticket dialog. The close branch is unchanged.

**`frontend/features/build/project-detail/project-board-page.tsx`**  
Added `handleKeyboardCreate = () => handleCreateOpenChange(true)` and passed it as `onCreate` to `useBuildListKeyboard`. This wires the `c` keyboard shortcut to open the create-ticket dialog from the issues/workload board.

### Test changes

**`frontend/features/build/overview/project-overview-page.test.tsx`**  
Added one test: "renders the next-milestone card name and section heading when a pending milestone exists". The milestone card was implemented but untested. The test also asserts that only the nearest pending milestone (earliest targetDate) is shown, not all.

**`frontend/features/build/project-detail/project-board-page.test.tsx`**  
- Changed the `ProjectBoardContent` mock to capture `onBulkStatus`, `onBulkPriority`, `onBulkAssignee`, `onBulkCycle` props into `capturedBoardContentProps`.
- Replaced the two weak bulk-action tests (one was vacuous — the negative asserted `bulkMutate` was not called, but the test never triggered it) with four substantive tests:
  1. `onBulkStatus` calls `bulkMutate` with correct ids and status (positive for FE-122).
  2. `onBulkStatus` does NOT call `bulkMutate` when no tickets are selected (paired negative).
  3. `onBulkPriority` calls `bulkMutate` with `priority: "HIGH"`.
  4. `onBulkAssignee` calls `bulkMutate` with `assigneeId`.
- Added one test: "passes an onCreate handler to useBuildListKeyboard so the c keyboard shortcut opens the create-ticket dialog without a separate keydown listener".

---

## Box 3 assessment — `10-project.md` (Project Overview, `/build/[projectId]`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| health | core field | ✓ | ✓ | StatCard with analytics.healthStatus |
| progress | core field | ✗ | ✗ | No backend endpoint |
| due work | core field | ✗ | ✗ | Open-issues count is not "due work" (tickets with a due date past now) |
| risks | core field | ✗ | ✗ | No endpoint or component |
| milestones | core field | ✓ | ✓ | Next milestone card; test added this wave |
| releases | core field | ✗ | ✗ | No endpoint or component |
| activity | core field | ✗ | ✗ | No activity feed |
| URL param: range | URL state | ✗ | ✗ | Not read from URL, not forwarded to API |
| URL param: teamId | URL state | ✗ | ✗ | Same |
| URL param: ownerId | URL state | ✗ | ✗ | Same |
| shortcut: / search | shortcut | ✗ | ✗ | No search input on overview page |
| shortcut: c create | shortcut | ✗ | ✗ | No create action on overview page |
| shortcut: j/k move | shortcut | ✗ | ✗ | No list to navigate |
| shortcut: Enter open | shortcut | ✗ | ✗ | |
| shortcut: e edit | shortcut | ✗ | ✗ | |
| shortcut: Esc clear | shortcut | ✗ | ✗ | |
| shortcut: ? help | shortcut | ✗ | ✗ | |
| loading state | state | ✓ | ✓ | ProjectOverviewSkeleton via PageState |
| empty state | state | ✓ | ✓ | "Project not found" EmptyState |
| error state | state | ✓ | ✓ | onRetry wired |
| denied state | state | ✓ | ✓ | PageState with permission "build:view" |
| offline state | state | ✗ | ✗ | Not implemented |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | usePageState({ permission: "build:view" }) |

**Box 3: NOT TICKED.**

Blockers (all backend-constrained or structural):
- progress, risks, releases, activity — no backend endpoints expose these fields; the overview page renders analytics.healthStatus but none of the other four
- URL params range, teamId, ownerId — neither the component nor any hook reads them; no backend filter contract exists for them on this endpoint
- Keyboard shortcuts — the overview page is a summary page with stat cards and links, not a list; there is no search input, no row list to j/k through, and no create button. `/`, `j/k`, `Enter`, `e`, `Esc`, `?` have no natural targets here
- Offline state — not implemented

---

## Box 3 assessment — `10-project-issues.md` (Issues, `/build/[projectId]/issues`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| key | core field | ✓ | ✓ | projectKey from project data |
| title | core field | ✓ | ✓ | ticket title in board/list/kanban |
| type | core field | ✓ | ✓ | filterType URL param |
| status | core field | ✓ | ✓ | filterStatus URL param |
| priority | core field | ✓ | ✓ | filterPriority URL param |
| assignees | core field | ✓ | ✓ | filterAssigneeId URL param |
| cycle | core field | ✓ | ✓ | filterCycle URL param |
| module | core field | ✓ | ✓ | filterModule URL param |
| estimate | core field | ✓ | partial | In ticket data; no dedicated test |
| due | core field | ✓ | partial | dueDateFrom + dueDateTo; no dedicated test |
| rank | core field | partial | partial | Drag-and-drop reorder; not URL-filterable |
| URL param: layout | URL state | ✓ | ✓ | view param |
| URL param: viewId | URL state | ✓ | ✓ | |
| URL param: q | URL state | ✓ | ✓ | |
| URL param: type | URL state | ✓ | ✓ | |
| URL param: status | URL state | ✓ | ✓ | |
| URL param: priority | URL state | ✓ | ✓ | |
| URL param: assigneeId | URL state | ✓ | ✓ | |
| URL param: cycleId | URL state | ✓ | ✓ | mapped to `cycle` |
| URL param: moduleId | URL state | ✓ | ✓ | mapped to `module` |
| URL param: labelId | URL state | ✓ | ✓ | mapped to `labels` |
| URL param: due | URL state | ✓ | ✓ | dueDateFrom + dueDateTo |
| URL param: group | URL state | ✗ | ✗ | Not read from URL; stored in useState (not URL-backed) |
| URL param: sort | URL state | ✗ | ✗ | Not read from URL; not implemented |
| URL param: cursor | URL state | ✓ | partial | Via pagination |
| bulk assign | bulk action | ✓ | ✓ | tested this wave |
| bulk status | bulk action | ✓ | ✓ | tested this wave |
| bulk priority | bulk action | ✓ | ✓ | tested this wave |
| bulk cycle | bulk action | ✓ | ✓ | handleBulkCycle exists |
| bulk label | bulk action | ✗ | ✗ | Not implemented |
| bulk archive | bulk action | ✗ | ✗ | Not implemented |
| bulk export | bulk action | ✗ | ✗ | Not implemented |
| shortcut: / search | shortcut | ✗ | ✗ | searchInputRef not passed to useBuildListKeyboard; pressing / does nothing |
| shortcut: c create | shortcut | ✓ | ✓ | Fixed this wave; onCreate wires to handleCreateOpenChange(true) |
| shortcut: j/k | shortcut | ✓ | ✓ | enabled for list view |
| shortcut: Enter open | shortcut | ✓ | ✓ | |
| shortcut: e edit | shortcut | ✗ | ✗ | onEdit not passed to useBuildListKeyboard |
| shortcut: Esc clear | shortcut | ✓ | ✓ | onClearSelection |
| shortcut: ? help | shortcut | ✗ | ✗ | Not implemented globally |
| loading state | state | ✓ | ✓ | KanbanBoardSkeleton |
| empty state | state | ✓ | ✓ | via ProjectBoardContent |
| error state | state | ✓ | ✓ | ProjectLoadFallback |
| denied state | state | ✓ | ✓ | PageState denied |
| offline state | state | ✗ | ✗ | Not implemented |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | usePageState |
| build:create for create | permission | ✓ | partial | CreateTicketDialog gated |

**Box 3: NOT TICKED.**

Remaining blockers:
- `group` URL param: `useBoardUrlState` does not read a `group` param from the URL. The workload view has group logic in `useState(INITIAL_FILTERS)` which is not URL-backed. Adding `group` to the URL state would require modifying `use-board-url-state.ts` (serves all board pages) and a backend filter change.
- `sort` URL param: not read from URL, not implemented at all.
- `/` shortcut: pressing `/` does nothing because `searchInputRef` is not passed to `useBuildListKeyboard`. The search input is in `ProjectViewsToolbar`; threading a ref through requires prop additions to that component.
- `e` (edit) shortcut: `onEdit` is not passed. Inline edit from the list row would require navigating to the ticket panel or opening an edit overlay; no such handler exists.
- `?` shortcut help: not implemented anywhere in the build module.
- Bulk label, archive, export: not implemented.
- Offline state: not implemented.

---

## Box 3 assessment — `10-project-workload.md` (Workload, `/build/[projectId]/workload`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| member | core field | ✓ | ✓ | WorkloadView shows member rows |
| capacity | core field | ✓ | ✓ | capacityByMemberId from useWorkloadCapacity; tested enabled/disabled |
| leave | core field | ✗ | ✗ | Not in capacity schema; requires HR integration backend work |
| allocation | core field | ✓ | partial | Ticket count per member |
| estimate | core field | ✓ | partial | Ticket estimate field |
| actual | core field | ✗ | ✗ | Logged hours not in workload schema |
| variance | core field | ✓ | partial | isOverAllocated derived flag |
| URL param: from | URL state | ✗ | ✗ | In useState(INITIAL_FILTERS), not URL-backed |
| URL param: to | URL state | ✗ | ✗ | Same |
| URL param: teamId | URL state | ✗ | ✗ | Same |
| URL param: memberId | URL state | ✗ | ✗ | Same |
| URL param: projectId | URL state | ✗ | ✗ | Same |
| URL param: group | URL state | ✗ | ✗ | Same |
| shortcut: / search | shortcut | ✗ | ✗ | Same as issues |
| shortcut: c create | shortcut | ✓ | ✓ | Fixed this wave |
| shortcut: j/k | shortcut | ✓ | ✓ | enabled for list view (workload uses workload view, not list) |
| shortcut: e edit | shortcut | ✗ | ✗ | |
| shortcut: Esc clear | shortcut | ✓ | ✓ | |
| shortcut: ? help | shortcut | ✗ | ✗ | |
| loading state | state | ✓ | ✓ | KanbanBoardSkeleton |
| empty state | state | ✓ | partial | WorkloadView empty state |
| error state | state | ✓ | ✓ | ProjectLoadFallback |
| denied state | state | ✓ | ✓ | PageState denied |
| offline state | state | ✗ | ✗ | |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | usePageState |

**Box 3: NOT TICKED.**

Remaining blockers:
- leave, actual fields: not in the backend capacity schema. Require new backend endpoints or extended schema.
- All workload URL params (from, to, teamId, memberId, projectId, group): all stored in `useState(INITIAL_FILTERS)` in `use-board-url-state.ts`, never read from URL params. These need a URL-state migration in the URL state hook.
- Shortcut gaps: same as issues (/, e, ?).

---

## Gaps filed for orchestrator

1. **Project Overview — progress, risks, releases, activity fields**: no backend endpoints. `healthBreakdown.completionPct` exists in analytics but is not surfaced as "progress".
2. **Project Overview — URL params range/teamId/ownerId**: no backend filter on GET /build/:projectId for these; not implemented in component.
3. **Project Overview — keyboard shortcuts**: structural gap. The page has no list, no search input, no create form. Shortcuts require a surface to land on.
4. **Issues — group URL param**: `use-board-url-state.ts` does not read a `group` param from the URL. Would require URL state hook changes (affects all board pages) and backend filter support.
5. **Issues — sort URL param**: same — not read from URL, not implemented.
6. **Issues/Workload — `/` search shortcut**: search input is in `ProjectViewsToolbar`; threading a ref to it requires prop additions across that chain.
7. **Issues/Workload — `e` edit shortcut**: no `onEdit` handler wired up.
8. **Issues/Workload — `?` shortcut help**: no global shortcut help panel in the build module.
9. **Workload — all URL params (from/to/teamId/memberId/projectId/group)**: all in component state, not URL. Making them URL-backed requires changes to `use-board-url-state.ts` (shared across all board pages).
10. **Workload — leave and actual fields**: backend schema gap.
11. **clientId on projects list page (`/build`)**: `filterClientId` is read from URL but not forwarded to `useInfiniteProjects`. The `10-org-projects.md` box 3 tick should be reviewed.
