# Wave-B-11 Status: Project Root, Workload, Issues, Updates

## Page → Files Map

| Page | Route | Route File | Component File | Test File |
|------|-------|-----------|----------------|-----------|
| Project Overview | `/build/[projectId]` | `frontend/app/(authenticated)/build/[projectId]/page.tsx` | `frontend/features/build/overview/project-overview-page.tsx` | `frontend/features/build/overview/project-overview-page.test.tsx` |
| Workload | `/build/[projectId]/workload` | `frontend/app/(authenticated)/build/[projectId]/workload/page.tsx` | `frontend/features/build/project-detail/project-board-page.tsx` (defaultView="workload") | `frontend/features/build/project-detail/project-board-page.test.tsx` |
| Issues | `/build/[projectId]/issues` | `frontend/app/(authenticated)/build/[projectId]/issues/page.tsx` | `frontend/features/build/project-detail/project-board-page.tsx` | `frontend/features/build/project-detail/project-board-page.test.tsx` |
| Updates | `/build/[projectId]/updates` | `frontend/app/(authenticated)/build/[projectId]/updates/page.tsx` | `frontend/features/build/updates/updates-page.tsx` | `frontend/features/build/updates/updates-page.test.tsx` |

Both Issues and Workload are served by the same component (`ProjectBoardPage`). Workload passes `defaultView="workload"`. The workload-specific rendering (member rows, capacity bar) lives in `features/build/views/workload-view.tsx` which belongs to B02 and was not modified.

URL state (filter params, saved views) for both Issues and Workload is owned by `features/build/views/use-board-url-state.ts` (B02 territory — not modified).

---

## C3 Assessment Per Page

### 1. Project Overview (`10-project.md`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| health | core field | ✓ | ✓ | StatCard with analytics.healthStatus |
| progress | core field | ✗ | ✗ | No field in component; `healthBreakdown.completionPct` exists in analytics but not displayed |
| due work | core field | partial | partial | Open issues count shown; strict "due work" (tickets with due dates) not separately surfaced |
| risks | core field | ✗ | ✗ | Not in backend response schema, no dedicated endpoint |
| milestones | core field | ✓ | ✓ | Next milestone card with name, date, status |
| releases | core field | ✗ | ✗ | No releases endpoint or component |
| activity | core field | ✗ | ✗ | No activity feed implemented |
| URL param: range | URL state | ✗ | ✗ | Not implemented in component |
| URL param: teamId | URL state | ✗ | ✗ | Not implemented in component |
| URL param: ownerId | URL state | ✗ | ✗ | Not implemented in component |
| loading state | state | ✓ | ✓ | ProjectOverviewSkeleton via PageState loading prop |
| empty state | state | ✓ | ✓ | "Project not found" via PageState empty prop |
| error state | state | ✓ | ✓ | onRetry passed to PageState |
| denied state | state | ✓ | ✓ | PageState with permission "build:view" |
| build:view permission | permission | ✓ | ✓ | usePageState({ permission: "build:view" }) |

**C3: NOT TICKED.** Missing: progress, risks, releases, activity fields (backend-constrained — no endpoint exposes them); URL params range/teamId/ownerId not implemented.

---

### 2. Workload (`10-project-workload.md`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| member | core field | ✓ | ✓ | WorkloadView shows member rows |
| capacity | core field | ✓ | ✓ | capacityByMemberId from useWorkloadCapacity |
| leave | core field | ✗ | ✗ | Not in capacity schema; would require HR integration |
| allocation | core field | ✓ | partial | Ticket count per member in workload view |
| estimate | core field | ✓ | partial | Ticket estimate field available |
| actual | core field | ✗ | ✗ | Logged hours not exposed in workload view |
| variance | core field | ✓ | partial | isOverAllocated derived comparison |
| URL param: from | URL state | ✗ | ✗ | In state only (workloadFilters), not URL-backed; B02 territory |
| URL param: to | URL state | ✗ | ✗ | Same |
| URL param: teamId | URL state | ✗ | ✗ | Same |
| URL param: memberId | URL state | ✗ | ✗ | Same |
| URL param: group | URL state | ✗ | ✗ | Same |
| loading state | state | ✓ | ✓ | KanbanBoardSkeleton (via PageState) |
| empty state | state | ✓ | partial | Empty workload state in WorkloadView |
| error state | state | ✓ | ✓ | ProjectLoadFallback or PageState |
| denied state | state | ✓ | ✓ | Fixed: 403 now routes to PageState denied, not ProjectLoadFallback |
| build:view permission | permission | ✓ | ✓ | usePageState({ permission: "build:view" }) |
| workload capacity enabled only for workload view | behavior | ✓ | ✓ | Added test |
| keyboard nav enabled only for list view | behavior | ✓ | ✓ | Added test |

**C3: NOT TICKED.** Missing: leave field (HR-constrained); actual field (not in workload backend); URL params for workload filters are in state not URL (B02 territory — cannot modify).

---

### 3. Issues (`10-project-issues.md`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| key | core field | ✓ | ✓ | projectKey from project data |
| title | core field | ✓ | ✓ | Ticket title in board/list/kanban |
| type | core field | ✓ | ✓ | filterType in URL, passed to board |
| status | core field | ✓ | ✓ | filterStatus in URL |
| priority | core field | ✓ | ✓ | filterPriority in URL |
| assignees | core field | ✓ | ✓ | filterAssigneeId in URL |
| cycle | core field | ✓ | ✓ | cycle param in URL |
| module | core field | ✓ | ✓ | module param in URL |
| estimate | core field | ✓ | partial | In ticket data |
| due | core field | ✓ | partial | dueDateFrom/dueDateTo in URL |
| rank | core field | partial | partial | Drag-and-drop reorder, not directly URL-filterable |
| URL param: layout (as view) | URL state | ✓ | partial | view param |
| URL param: viewId | URL state | ✓ | ✓ | viewId param |
| URL param: q | URL state | ✓ | ✓ | q param |
| URL param: group | URL state | ✗ | ✗ | Not implemented in use-board-url-state (B02) |
| URL param: sort | URL state | ✗ | ✗ | Not implemented in use-board-url-state (B02) |
| bulk assign | bulk action | ✓ | ✓ | handleBulkAssignee tested |
| bulk status | bulk action | ✓ | ✓ | handleBulkStatus tested |
| bulk priority | bulk action | ✓ | ✓ | handleBulkPriority tested |
| bulk cycle | bulk action | ✓ | ✓ | handleBulkCycle implemented |
| loading state | state | ✓ | ✓ | KanbanBoardSkeleton |
| error state | state | ✓ | ✓ | ProjectLoadFallback |
| denied state | state | ✓ | ✓ | Fixed: 403 now shows denied via PageState |
| build:view permission | permission | ✓ | ✓ | usePageState |
| / keyboard search | shortcut | ✓ | ✓ | useBuildListKeyboard wires / to search |
| j/k navigation | shortcut | ✓ | ✓ | enabled for list view — tested |
| c create | shortcut | ✓ | partial | create param triggers CreateTicketDialog |
| Esc close | shortcut | ✓ | partial | handleClearSelection |

**C3: NOT TICKED.** Missing: group URL param (B02 territory); sort URL param (B02 territory). These are in `use-board-url-state.ts` which belongs to B02.

---

### 4. Updates (`10-project-updates.md`)

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| status | core field | ✓ | ✓ | Added: backend now exposes status (draft/published); shown in UpdateCard |
| summary (body) | core field | ✓ | ✓ | body field is the update text |
| wins | core field | ✗ | ✗ | Not in DB schema — would require migration |
| risks | core field | ✗ | ✗ | Not in DB schema — would require migration |
| next | core field | ✗ | ✗ | Not in DB schema — would require migration |
| author | core field | ✓ | partial | authorMembershipId shown (not resolved to display name) |
| audience | core field | ✓ | ✓ | Added: backend now exposes audience (internal/client); shown in UpdateCard |
| citations | core field | ✗ | ✗ | Not in DB schema — would require migration |
| URL param: status | URL state | ✓ | ✓ | Added: status filter to UPDATE_FILTER_DEFINITIONS + hook |
| URL param: authorId | URL state | ✓ | ✓ | Present and tested |
| URL param: from | URL state | ✓ | ✓ | Present and tested |
| URL param: to | URL state | ✓ | ✓ | Present and tested |
| URL param: cursor | URL state | ✓ | partial | Via infinite query pagination |
| create update | action | ✓ | ✓ | EntityFormDialog with body field |
| delete update | action | ✓ | ✓ | canManage gate, soft-delete |
| loading state | state | ✓ | ✓ | Skeleton via PageState loading prop (refactored) |
| empty state | state | ✓ | ✓ | EmptyState via PageState empty prop (refactored) |
| error state | state | ✓ | ✓ | ErrorState via PageState |
| denied state | state | ✓ | ✓ | NoPermissionState via PageState |
| plan-required (402) | state | ✓ | ✓ | PageState maps MODULE_NOT_ENABLED → plan-required with upgrade link |
| access loading (no flash) | state | ✓ | ✓ | Loading state shown during access check |
| build:updates:view permission | permission | ✓ | ✓ | usePageState({ permission: "build:updates:view" }) |
| build:updates:manage permission | permission | ✓ | ✓ | useCan gate on create/delete controls |

**C3: NOT TICKED.** Missing: wins, risks, next, citations fields (not in DB schema — require migration to add structured content fields). Author resolved to display name not implemented. These are genuine DB-schema gaps that require migration before they can be implemented.

---

## Files Changed

### Frontend
- `frontend/features/build/project-detail/project-board-page.tsx` — Fixed 403 routing: access-denial kinds are checked before projectError so a 403 on the project fetch shows the denied surface, not ProjectLoadFallback.
- `frontend/features/build/project-detail/project-board-page.test.tsx` — Added 7 new tests: 403 shows denied surface, bulk action board content present/absent with selections, workload capacity enabled only for workload view, keyboard nav enabled only for list view.
- `frontend/features/build/overview/project-overview-page.test.tsx` — Added 2 new tests: loading state does not flash content, empty state shows project-not-found and not stat cards.
- `frontend/features/build/updates/updates-page.tsx` — Added status URL filter; show status/audience in UpdateCard; refactored to use single PageState for all state branches (loading/empty/error/denied); pass isEmpty to usePageState.
- `frontend/features/build/updates/updates-page.test.tsx` — Updated mock data to include status/audience; added status filter tests.
- `frontend/hooks/api/build/project-updates-schema.ts` — Added status and audience to updateRowContract.
- `frontend/hooks/api/build/project-updates-schema.test.ts` — Updated minimalRow; added tests for status/audience fields.
- `frontend/hooks/api/build/project-updates.ts` — Added status to ProjectUpdatesFilters interface, ProjectUpdateRow interface, activeFilters collection, and API call params.

### Backend
- `backend/src/modules/build/updates/dto/updates.schemas.ts` — Added authorId, from, to, status to listUpdatesQuerySchema so the strict schema no longer 400s filtered requests.
- `backend/src/modules/build/updates/dto/updates-response.schemas.ts` — Added status and audience to updateRowSchema.
- `backend/src/modules/build/updates/updates.service.ts` — Added status/audience to select projection; added filtering by authorId, status, from, to.
- `backend/src/modules/build/updates/updates.service.spec.ts` — Added 2 new tests: status/audience in projected row; filter params accepted without error.

---

## Test Commands Run and Results

```
frontend: npx jest --runTestsByPath "features/build/project-detail/project-board-page.test.tsx" --no-coverage
  13 passed, 0 failed

frontend: npx jest --runTestsByPath "features/build/overview/project-overview-page.test.tsx" --no-coverage
  11 passed, 0 failed

frontend: npx jest --runTestsByPath "features/build/updates/updates-page.test.tsx" --no-coverage
  13 passed, 0 failed

frontend: npx jest --runTestsByPath "hooks/api/build/project-updates-schema.test.ts" --no-coverage
  19 passed, 0 failed

backend: npx jest --runTestsByPath "src/modules/build/updates/updates.service.spec.ts" --no-coverage
  16 passed, 0 failed

backend: npx jest --runTestsByPath "src/modules/build/updates/build-updates-params-schema.spec.ts" --no-coverage
  3 passed, 0 failed
```

Total: 75 tests passing across 6 suites.

---

## Bug Found and Fixed

**403 → ProjectLoadFallback routing bug in ProjectBoardPage**: When a project fetch returned a 403, `resolvePageState` correctly returned `{ kind: "denied" }`, but the `if (projectError) { return <ProjectLoadFallback> }` check ran before the resolution check, so the denied state was never shown. Fixed by checking `resolution.kind !== "ready" && resolution.kind !== "error"` before the project error check.

---

## Gaps Filed

The following gaps cannot be closed without backend schema changes (DB migrations) and are filed here for the orchestrator:

1. **Project Overview — fields not exposed**: progress (could use `healthBreakdown.completionPct`), risks, releases, activity. No dedicated endpoints or DB columns.
2. **Project Overview — URL params**: `range`, `teamId`, `ownerId` not implemented in either component or backend.
3. **Workload — URL-backed filters**: `from`, `to`, `teamId`, `memberId`, `group` are stored in component state (`useState`), not URL. The implementation is in `features/build/views/use-board-url-state.ts` (B02 territory).
4. **Workload — leave and actual fields**: Not available in current capacity data schema.
5. **Issues — group and sort URL params**: Not implemented in `use-board-url-state.ts` (B02 territory).
6. **Updates — wins, risks, next, citations fields**: Not in DB schema (`project_updates` table). Require migration to add structured content columns.
7. **Updates — author display name**: `authorMembershipId` shown as a number; member lookup to resolve display name not implemented.
