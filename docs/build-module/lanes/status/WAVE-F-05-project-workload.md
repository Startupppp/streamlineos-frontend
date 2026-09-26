# WAVE-F-05 — Project Workload

## Session: F-05 (2026-09-26)

### Scope
`docs/build-module/10-project-workload.md` box 3 — implement and test every core field, action, overlay, query parameter, shortcut, and state listed in the spec.

### Deliverables

**Files modified:**
- `frontend/features/build/views/workload-types.ts` — added `leaveDays: number` to `MemberCapacityData`
- `frontend/hooks/api/build/workload-capacity.ts` — extracts `leaveDays` from API response into the Map
- `frontend/features/build/views/workload-member-row.tsx` — added `focused` ring prop; added Leave and Actual column cells
- `frontend/features/build/views/workload-view.tsx` — added `focusedMemberId` prop; added Leave and Actual column headers

**Files created:**
- `frontend/features/build/workload/workload-board-page.tsx` — dedicated `WorkloadBoardPage` component with URL state management
- `frontend/features/build/workload/workload-board-page.test.tsx` — 18 tests, all passing

**Files updated:**
- `frontend/app/(authenticated)/build/[projectId]/workload/page.tsx` — now renders `WorkloadBoardPage` instead of `ProjectBoardPage`
- `docs/build-module/10-project-workload.md` — gaps section updated

### What was implemented

- `from`/`to` URL params forwarded to `useWorkloadCapacity(projectId, start, end)` — tested
- `memberId` URL param forwarded to `useProjectBoardTickets` as `assigneeId` — tested
- Changing assignee filter writes `memberId` to URL via `router.replace` — tested
- Clearing filters removes `memberId` from URL — tested
- `leave` field: `leaveDays` from backend capacity response displayed as `Nd` in member rows
- `actual` field: `loggedHours` from backend capacity response displayed as `Nh` in member rows
- `j/k`/`Enter` keyboard: `useBuildListKeyboard` with `enabled: true`, `itemCount = members.length`, `onOpen` navigates to focused member's filter
- `?` shortcut: `onShortcutHelp` opens `ShortcutHelpDialog` — tested
- `c` shortcut: `onCreate` opens `CreateTicketDialog` — tested
- Offline state: `useOnlineStatus` returns false → `EmptyState` renders, `WorkloadView` hidden — tested
- Loading: `KanbanBoardSkeleton` during project load — tested
- Error: `ProjectLoadFallback` on project fetch failure — tested
- Denied: `PageState` resolution with `usePageState({ error })` (FE-41) — tested
- Permission: `build:view` used as the `usePageState` permission key

### Previous agent error (E-03) corrected

E-03 incorrectly concluded `leave` and `actual` are "not in backend capacity schema." Both ARE present: `leaveDays` and `loggedHours` exist in `memberCapacityItemSchema` in `frontend/hooks/api/build/execution-schema.ts` and are returned by `workload-capacity.service.ts`.

### Why box 3 is NOT ticked

Three of the six spec URL params cannot be fully implemented:

| Param | Status | Reason |
|---|---|---|
| `from` | Forwarded to capacity | Done |
| `to` | Forwarded to capacity | Done |
| `memberId` | Forwarded to tickets | Done |
| `teamId` | Not forwarded | No backend capacity endpoint accepts a team filter |
| `projectId` | Not forwarded | Redundant with route path param |
| `group` | Not forwarded | `WorkloadView` has no grouping dimension |

Bulk actions: not applicable — workload surface shows members, not selectable tickets.
Conflict state: excused by CCG-1.

Box 3 remains unchecked pending `teamId`, `group`, and bulk implementation (P1 gap).

### Test results

```
PASS features/build/workload/workload-board-page.test.tsx
  18 passed, 0 failed
```
