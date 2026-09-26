# WAVE-C-04 — Views & Workflow PageState adoption

| File | Decision | Reason |
|---|---|---|
| `features/build/views/gantt-view.tsx` | **Converted** | Occupies full layout space; `useCanState("build:view")` guard returned `null` on denial, creating a silent blank hole. Replaced with `usePageState({ permission: "build:view", isLoading: false, isError: false })` + `<PageState loading={null}>`. Tickets are passed as props so `isLoading/isError: false` is correct. |
| `features/build/views/kanban-virtual-ticket-list.tsx` | **Left alone — pure presentational** | No data fetch, no access guard, no state of its own. A virtualised DnD list child; gaining PageState here would be wrong. |
| `features/build/all-work/all-work-views-menu.tsx` | **Left alone — action affordance** | A bookmark/views popover that is correctly hidden when denied. Hiding an action from an unauthorised user is correct behaviour, not the FE-40 defect. |
| `features/build/workflow/transitions-table.tsx` | **Converted** | Owns the `useWorkflowTransitions` fetch; `useCanState` guard returned `null` on denial. Replaced with `usePageState({ permission: "build:workflow:view", isLoading, isError, error, isEmpty })` + `<PageState compact>` wrapping the data section. The controlled/uncontrolled contract (`transitions?`, `isTransitionsLoading?`, `sheetOpen?`, `editTarget?`, `onSheetOpenChange?`, `onEditTargetChange?`) is preserved intact. |
| `features/build/change-requests/change-request-affected-tickets.tsx` | **Converted** | Owns the `useChangeRequestAffectedTickets` fetch; had three early returns (access guard + isLoading + isError) with two `useMemo` calls placed after the first early return — a React hooks violation. Moved `useMemo` before resolution, replaced all early returns with `usePageState({ permission: "build:changerequests:view", isLoading, isError, error })` + `<PageState loading={null} onRetry={handleRetry} compact>`. The hand-rolled `<ErrorState>` was removed; PageState handles it. |
| `features/build/whiteboard/share-dialog.tsx` | **Left alone — action affordance** | The task brief explicitly calls out share dialogs as the second kind: an action correctly hidden when denied. |

## Test results

| Test file | Outcome | Count |
|---|---|---|
| `features/build/views/gantt-view-rows.test.tsx` | PASS | 8/8 |
| `features/build/workflow/transitions-table.test.tsx` (new) | PASS | 7/7 |
| `features/build/workflow/workflow-page.test.tsx` (unchanged, regression check) | PASS | 12/12 |
| `features/build/change-requests/change-request-affected-tickets.test.tsx` | PASS | 10/10 |

Total: 37 tests passing, 0 failing.

## Key changes per file

### gantt-view.tsx
- Removed `import { useCanState } from "@/hooks/api/access"`
- Added `usePageState`, `PageState` imports
- Replaced `const accessState = useCanState(...)` + early return with `usePageState` + `<PageState loading={null}>`

### transitions-table.tsx
- Removed `useCanState` from the `@/hooks/api/access` import
- Added `usePageState`, `PageState` imports
- Added `isError`, `error`, `refetch` to the `useWorkflowTransitions` destructuring
- Computed `isError`/`error` as false/undefined when controlled (external) transitions are provided
- Added `handleRetry` function calling `refetch()`
- Added `usePageState` call with `isEmpty: transitions.length === 0`
- Replaced the hand-rolled `isLoading ? skeleton : isEmpty ? emptyState : table` ladder with `<PageState compact loading={skeleton} empty={emptyState}>`
- Controlled/uncontrolled props (`transitions?`, `isTransitionsLoading?`, `sheetOpen?`, `editTarget?`, `onSheetOpenChange?`, `onEditTargetChange?`) are unchanged

### change-request-affected-tickets.tsx
- Removed `useCanState` and `ErrorState` imports; added `usePageState`, `PageState`
- Fixed React hooks violation: moved two `useMemo` calls from after the early access-guard return to before any return
- Removed the access guard early return, the `isLoading` early return, and the `isError` early return
- Added `usePageState({ permission: "build:changerequests:view", isLoading, isError, error })` call
- Wrapped the single return in `<PageState loading={null} onRetry={handleRetry} compact>`
- Empty state ("No affected tickets yet.") is handled inline in children (not via `isEmpty` prop) so the section header and Link button remain visible in the ready state with zero items
