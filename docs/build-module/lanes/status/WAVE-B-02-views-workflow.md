# Wave-B-02 — Views & Workflow Status

Agent: Wave-B-02 · Date: 2026-09-26

## Criterion table

| Page | Box | Ticked | Evidence |
|---|---|---|---|
| 10-project-settings-views.md | C3 | ✅ | See below |
| 10-project-settings-workflow.md | C3 | ✅ | See below |

Neither C6 nor C7 was touched (orchestrator-only).

---

## 10-project-settings-views.md — C3

**Was PARTIAL.** The only remaining blocker was: bulk delete not implemented (no checkbox selection, no bulk bar).

**Implemented:**
- `frontend/features/build/views/saved-views/view-card.tsx`: added optional `isSelected?: boolean` and `onToggleSelect?: (viewId: number, selected: boolean) => void` props; imports `Checkbox`; renders a `Checkbox` with `aria-label="Select <name>"` at the end of the action row, after `ArrowRight`. Existing `aria-label="Rename saved view"` and `aria-label="Delete saved view"` preserved exactly. Tab order preserved (title button stays next focusable after search input).
- `frontend/features/build/settings/project-settings-views-page.tsx`: added `selectedIds: Set<number>` and `confirmBulkDeleteOpen: boolean` state; `handleToggleSelect`, `handleClearSelection`, `handleBulkDeleteConfirm` handlers; bulk bar rendered when `selectedIds.size > 0` ("N selected · Delete N views · Clear"); `ConfirmDialog destructive` gated on confirm; checkboxes gated on `canManage`; `deleteView.mutate` called once per selected id on confirm.

**Tests (all 15 passing):**

```
npx jest --runTestsByPath features/build/settings/project-settings-views-page.test.tsx
  15 passed, 0 failed
```

New tests added:
- shows a checkbox for each view when canManage is true
- does not show checkboxes when the user cannot manage views
- shows the bulk delete bar when a view is selected
- hides the bulk delete bar after clearing the selection
- fires delete mutation for every selected view when confirmed

Row-by-row audit:

| Spec item | Status |
|---|---|
| Core fields: name, layoutType, isPinned, filters, visibility | ✅ ViewCard shows all |
| Action: create view | ✅ CreateViewSheet, gated on canManage |
| Action: rename view | ✅ RenameViewDialog, `e` key wired |
| Action: delete single view | ✅ AnimatedIconButton with ConfirmDialog in ViewCard |
| Action: bulk delete | ✅ Implemented this session |
| Action: pin/unpin view | ✅ toggle pin button |
| Action: navigate to view | ✅ title button + `Enter` key |
| Overlay: create sheet | ✅ CreateViewSheet |
| Overlay: rename dialog | ✅ RenameViewDialog |
| Overlay: bulk delete confirm | ✅ ConfirmDialog destructive |
| Query param: `q` search | ✅ URL-backed via useBuildListFilters |
| Bulk action: delete selected | ✅ Implemented this session |
| Shortcut: `/` search | ✅ useBuildListKeyboard + searchInputRef |
| Shortcut: `c` create | ✅ useBuildListKeyboard onCreate |
| Shortcut: `j/k` navigate | ✅ useBuildListKeyboard |
| Shortcut: `Enter` open | ✅ handleKeyboardOpen → router.push |
| Shortcut: `e` edit (rename) | ✅ handleKeyboardEdit → setRenameTarget |
| Shortcut: `Esc` clear | ✅ handleKeyboardClear → setRenameTarget(null) |
| State: loading | ✅ Skeleton x2 |
| State: empty (no views) | ✅ EmptyState + create action for managers |
| State: empty (filtered) | ✅ EmptyState without create action when search active |
| State: error | ✅ PageState onRetry |
| State: denied | ✅ PageState permission="build:view" |
| Permission: build:view (read) | ✅ usePageState |
| Permission: build:workspace:manage (mutations) | ✅ useCan gates all write controls |
| Pagination: cursor | ✅ TablePagination mode="cursor" |

---

## 10-project-settings-workflow.md — C3

**Was fully open.**

**Implemented:**
- `frontend/features/build/workflow/wip-row.tsx`: added `Badge` import; added inline `CATEGORY_LABEL` lookup; renders a read-only category badge (Backlog/Unstarted/In Progress/Completed/Cancelled) next to the status name.
- `frontend/features/build/workflow/transitions-table.tsx`: added optional props `transitions?`, `isTransitionsLoading?`, `sheetOpen?`, `editTarget?`, `onSheetOpenChange?`, `onEditTargetChange?`; uses controlled/uncontrolled pattern (external props take precedence over internal state when provided; `useWorkflowTransitions` still runs for deduplication).
- `frontend/features/build/workflow/workflow-page.tsx`: lifted `useWorkflowTransitions`; added `useBuildListFilters`, `BuildListToolbar` (URL-backed `q`), `useBuildListKeyboard`, `searchInputRef`; lifted `transitionSheetOpen` and `transitionEditTarget` state; filters both WIP rows and transitions by `debouncedSearch`; wires `onCreate` (gated on canManage), `onOpen`, `onEdit`, `onClearSelection` to keyboard hook; passes lifted state down to `TransitionsTable`.

**Tests (all 12 passing):**

```
npx jest features/build/workflow/workflow-page.test.tsx
  12 passed, 0 failed
```

New tests added:
- renders the loading state with skeletons
- renders the error state without leaking workflow data
- renders all wip rows when statuses are present
- renders the search toolbar
- does not pass onCreate to keyboard hook when user cannot manage workflow
- passes onCreate to the keyboard hook when canManage is true
- passes onOpen and onEdit to the keyboard hook for transition navigation
- passes searchInputRef to the keyboard hook for the / shortcut
- passes the correct itemCount matching the transitions list

Row-by-row audit:

| Spec item | Status |
|---|---|
| Core field: status identity (name, color) | ✅ WipRow shows name + color dot |
| Core field: category | ✅ WipRow shows read-only badge this session |
| Core field: order | ✅ Displayed in API order (backend-managed) |
| Core field: transitions (from/to/name/approval/requiredFields/allowedRoles) | ✅ TransitionsTable |
| Core field: WIP limit | ✅ WipRow input/display |
| Core field: required fields per transition | ✅ TransitionFormSheet |
| Core field: version | Not displayed (internal optimistic-lock field; no UI surface needed) |
| Action: create transition | ✅ TransitionsTable + `c` keyboard shortcut |
| Action: edit transition | ✅ TransitionFormSheet + `e`/`Enter` keyboard shortcut |
| Action: delete transition | ✅ ConfirmDialog in TransitionsTable |
| Action: update WIP limit | ✅ WipRow Save button + Enter key |
| Overlay: TransitionFormSheet (create/edit) | ✅ |
| Overlay: ConfirmDialog for delete | ✅ |
| Query param: `q` search (status/transition filter) | ✅ URL-backed via useBuildListFilters |
| Bulk action: (no repeated operation applies to settings rows) | N/A — no bulk action warranted per spec rule "selection only when a real repeated operation exists" |
| Shortcut: `/` search | ✅ useBuildListKeyboard + searchInputRef |
| Shortcut: `c` create transition | ✅ handleKeyboardCreate → setTransitionSheetOpen |
| Shortcut: `j/k` navigate transitions | ✅ useBuildListKeyboard itemCount = filteredTransitions.length |
| Shortcut: `Enter`/`e` open/edit focused transition | ✅ handleKeyboardOpen/handleKeyboardEdit → setTransitionEditTarget + setTransitionSheetOpen |
| Shortcut: `Esc` clear | ✅ handleKeyboardClear → setTransitionEditTarget(null) |
| State: loading | ✅ DataTableSkeleton x2 + test |
| State: empty | ✅ EmptyState (no statuses) + test |
| State: error | ✅ PageState onRetry + test |
| State: denied | ✅ PageState permission="build:workflow:view" + test |
| Permission: build:workflow:view (read) | ✅ usePageState |
| Permission: build:workflow:manage (mutations) | ✅ useCan gates all write controls in WipRow + TransitionsTable |

---

## Files changed

- `frontend/features/build/views/saved-views/view-card.tsx` — added optional checkbox selection props
- `frontend/features/build/settings/project-settings-views-page.tsx` — bulk delete bar + ConfirmDialog
- `frontend/features/build/settings/project-settings-views-page.test.tsx` — 5 new bulk delete tests
- `frontend/features/build/workflow/wip-row.tsx` — category badge
- `frontend/features/build/workflow/transitions-table.tsx` — optional controlled-state props
- `frontend/features/build/workflow/workflow-page.tsx` — search + keyboard + lifted state (full rewrite)
- `frontend/features/build/workflow/workflow-page.test.tsx` — 9 new tests (loading, error, search, permissions, keyboard)
- `docs/build-module/10-project-settings-views.md` — C3 ticked
- `docs/build-module/10-project-settings-workflow.md` — C3 ticked

## Requests filed

None. All required changes were within owned files.

## Pinned selector note

`aria-label="Rename saved view"` (view-card.tsx ~line 125) and `aria-label="Delete saved view"` (~line 131) are preserved exactly. The new `Checkbox` is appended AFTER the existing ArrowRight in the action div, so the title button remains the first focusable element in the card — the `Engineering backlog` → next-Tab-stop invariant is unaffected.
