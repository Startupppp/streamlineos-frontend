# Wave-F-04 Status: Project Issues (`/build/[projectId]/issues`)

## Test results

```
npx jest --runTestsByPath \
  "features/build/project-detail/project-board-page.test.tsx" \
  "hooks/api/build/board-server-filter.test.ts" \
  "features/build/views/project-board-content.test.tsx" \
  --no-coverage

PASS hooks/api/build/board-server-filter.test.ts
PASS features/build/views/project-board-content.test.tsx (9.153 s)
PASS features/build/project-detail/project-board-page.test.tsx (11.145 s)

Test Suites: 3 passed, 3 total
Tests:       52 passed, 52 total
```

---

## Changes made this wave

### Source changes

**`frontend/hooks/api/build/ticket-queries.ts`**
- Exported `TicketOrderBy` and `TicketOrderDir` types (union over the values the backend's `ticketsListQuerySchema` accepts).
- Added `orderBy?: TicketOrderBy` and `orderDir?: TicketOrderDir` to `BoardFilters`.
- `useProjectBoardTickets` now reads `filters?.orderBy ?? "rank"` and `filters?.orderDir ?? "asc"` instead of hard-coding `"rank"` and `"asc"`, so the sort URL param reaches the server.

**`frontend/features/build/views/use-board-url-state.ts`**
- Added `parseOrderBy` / `parseOrderDir` guards (narrow via `Set.has`) so invalid URL values are silently dropped.
- Reads `orderBy` and `orderDir` from URL search params.
- Reads `group` from URL search param (client-side grouping, returned as `groupParam`; no backend field — see Gap table below).
- `boardFilters` now includes `orderBy` and `orderDir`, making the sort param genuinely pass through to the API rather than being a dead read.
- Returns `groupParam`, `sortOrderBy`, `sortOrderDir` for consumers.

**`frontend/features/build/shared/ticket-filter-bar.tsx`**
- Added `searchInputRef?: RefObject<HTMLInputElement | null>` to `TicketFilterBarProps`.
- Passes the ref to `SearchInput` so the `/` keyboard shortcut from `useBuildListKeyboard` can focus the real search input.

**`frontend/features/build/views/project-views-toolbar.tsx`**
- Added `searchInputRef?: RefObject<HTMLInputElement | null>` to `ProjectViewsToolbarProps`.
- Passes it through to `TicketFilterBar`.

**`frontend/features/build/project-detail/project-board-page.tsx`**
- Created `searchInputRef = useRef<HTMLInputElement | null>(null)` and passes it to both `useBuildListKeyboard` and `ProjectViewsToolbar`, completing the ref chain so `/` focuses search.
- Passes `onEdit: handleOpenFocusedTicket` to `useBuildListKeyboard`. For the issues board, "edit the focused ticket" is the same action as "open the focused ticket" — both navigate to the ticket panel.
- Added `shortcutHelpOpen` state and `handleShortcutHelp` callback; passes `onShortcutHelp={handleShortcutHelp}` to `useBuildListKeyboard`.
- Added `<ShortcutHelpDialog>` to the JSX, following the automations-page.tsx pattern.

**`frontend/features/build/views/project-board-content.test.tsx`**
- Added `jest.mock("@/hooks/common/use-online-status", ...)` and a `mockIsOnline` variable (previously absent, so the hook was resolving via the real module path, which is fine in CI but untested).
- Added two offline-state tests: one verifying the offline panel appears and the filtered-empty state is suppressed when `isOnline=false`; a paired positive confirming the filtered-empty state is shown when `isOnline=true`.

### Test changes

**`frontend/hooks/api/build/board-server-filter.test.ts`**  
- Renamed existing `"uses orderBy=rank…"` test to clarify it applies without a sort filter.
- Added: `"uses the orderBy from the URL-backed sort filter so the sort param reaches the server rather than being dropped"` — passes `{ orderBy: "priority", orderDir: "desc" }` and asserts the API receives those values.
- Added: `"includes orderBy in the query key so different sort orders get separate cache entries and do not collide"` — compares key JSON for `rank` vs `created`.

**`frontend/features/build/project-detail/project-board-page.test.tsx`**  
- Added three keyboard tests: `searchInputRef` is passed, `onEdit` is passed, `onShortcutHelp` is passed.

---

## Box 3 assessment — `10-project-issues.md`

| Item | Category | Implemented | Tested | Verdict |
|------|----------|-------------|--------|---------|
| key | core field | ✓ | ✓ | pass |
| title | core field | ✓ | ✓ | pass |
| type | core field | ✓ | ✓ | pass |
| status | core field | ✓ | ✓ | pass |
| priority | core field | ✓ | ✓ | pass |
| assignees | core field | ✓ | ✓ | pass |
| cycle | core field | ✓ | ✓ | pass |
| module | core field | ✓ | ✓ | pass |
| estimate | core field | ✓ | partial | pass (in ticket data; no dedicated test — partial is pre-existing) |
| due | core field | ✓ | partial | pass (dueDateFrom/To; no dedicated test — partial is pre-existing) |
| rank | core field | partial | partial | pass (drag-and-drop reorder; not URL-filterable — acknowledged) |
| URL param: layout | URL state | ✓ | ✓ | pass |
| URL param: viewId | URL state | ✓ | ✓ | pass |
| URL param: q | URL state | ✓ | ✓ | pass |
| URL param: type | URL state | ✓ | ✓ | pass |
| URL param: status | URL state | ✓ | ✓ | pass |
| URL param: priority | URL state | ✓ | ✓ | pass |
| URL param: assigneeId | URL state | ✓ | ✓ | pass |
| URL param: cycleId | URL state | ✓ | ✓ | pass |
| URL param: moduleId | URL state | ✓ | ✓ | pass |
| URL param: labelId | URL state | ✓ | ✓ | pass |
| URL param: due | URL state | ✓ | ✓ | pass |
| URL param: sort (orderBy/orderDir) | URL state | ✓ this wave | ✓ this wave | **FIXED** |
| URL param: group | URL state | ✓ read/return | ✗ no UI setter | **BLOCKED — see below** |
| URL param: cursor | URL state | ✓ | partial | pass |
| bulk assign | bulk action | ✓ | ✓ | pass |
| bulk status | bulk action | ✓ | ✓ | pass |
| bulk priority | bulk action | ✓ | ✓ | pass |
| bulk cycle | bulk action | ✓ | ✓ | pass |
| bulk label | bulk action | ✗ | ✗ | **BLOCKED — backend** |
| bulk archive | bulk action | ✗ | ✗ | **BLOCKED — backend** |
| bulk export | bulk action | ✗ | ✗ | **BLOCKED — backend** |
| shortcut: / search | shortcut | ✓ this wave | ✓ this wave | **FIXED** |
| shortcut: c create | shortcut | ✓ | ✓ | pass |
| shortcut: j/k | shortcut | ✓ | ✓ | pass |
| shortcut: Enter open | shortcut | ✓ | ✓ | pass |
| shortcut: e edit | shortcut | ✓ this wave | ✓ this wave | **FIXED** |
| shortcut: Esc clear | shortcut | ✓ | ✓ | pass |
| shortcut: ? help | shortcut | ✓ this wave | ✓ this wave | **FIXED** |
| loading state | state | ✓ | ✓ | pass |
| empty state | state | ✓ | ✓ | pass |
| error state | state | ✓ | ✓ | pass |
| denied state | state | ✓ | ✓ | pass |
| offline state | state | ✓ (project-board-content.tsx) | ✓ this wave | **FIXED** |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | pass |
| build:create for create | permission | ✓ | partial | pass |

**Box 3: NOT TICKED.**

### Remaining blockers

1. **`group` URL param — no UI control, no backend field**: `group` is now read from the URL and returned from `useBoardUrlState`, so deep-linking a `?group=priority` URL is possible. However, there is no groupBy control in `ProjectViewsToolbar` to allow a user to SET the param, and the backend `ticketsListQuerySchema` has no `group` field (grouping is client-side). Adding a groupBy control requires a new UI component, a client-side grouping implementation in `ProjectBoardContent`, and tests. This is a structural feature gap — no backend work is needed but the frontend work is material.

2. **Bulk label — not in backend schema**: `POST /build/:projectId/tickets/bulk` accepts `ticketIds`, `assigneeId`, `status`, `cycleId`, `priority`, `parentTicketId` (see `backend/src/modules/build/core/dto/ticket.schemas.ts:183`). The `label`/`labelId` field is absent from `bulkUpdateSchema`. Adding it requires a backend migration + schema change.

3. **Bulk archive — not in backend schema**: Same route. The bulk schema has no `deletedAt` or `archived` field. Individual ticket archive is a separate soft-delete endpoint; no bulk equivalent exists.

4. **Bulk export — not in backend schema**: Export is a separate operation type (it generates a file). The bulk mutation endpoint does not and should not include it. A bulk export would require a new backend route.

---

## Gaps filed for orchestrator

- **group URL param UI control**: `useBoardUrlState` now reads and returns `groupParam`, but there is no UI setter. A `GroupByMenu` in `ProjectViewsToolbar` would close this; it requires client-side grouping logic in the board views.
- **Bulk label/archive/export**: All three require backend schema changes to `bulkUpdateSchema` at `POST /build/:projectId/tickets/bulk`. No frontend workaround is possible.
