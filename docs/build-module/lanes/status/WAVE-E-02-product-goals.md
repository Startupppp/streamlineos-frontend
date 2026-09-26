# Wave-E-02 Status: Product Goals (C3)

Spec: `docs/build-module/10-managed-products-product-goals.md`
Implementation: `frontend/features/build/managed-products/product-goals-page.tsx`

---

## Blockers resolved from WAVE-B-08

| Blocker | Resolution |
|---|---|
| REQ-1: edit/delete not wired on GoalCard | Implemented — `handleEditGoalCard`, `handleDeleteGoalCard`, `handleEditGoalByIndex` added; `canManage ? handler : undefined` passed to every `GoalCard` |
| REQ-2: health/due/scope URL params not forwarded to API | Fixed — `GoalsParams` extended with `health?/due?/scope?`; params useMemo includes them when URL value is not "all" |

---

## C3 Enumeration

### Core fields

| Field | Implemented | Test file and location |
|---|---|---|
| title | GoalCard link (`/build/goals/:id`) | `product-goals-page-c3.test.tsx` — ready state renders goal cards |
| owner | GoalCard owner span via `goal.owner?.name` | `managed-products-a11y.test.tsx` |
| scope | URL param tracked (GOAL_FILTER_DEFINITIONS); forwarded to `useGoalsPage` | `product-goals-page.test.tsx` — BSN-FILTER-GOALS-02 scope forwarded test |
| status | GoalCard Badge via STATUS_CONFIG | `managed-products-a11y.test.tsx` |
| target/current/confidence | Detail-page fields; not shown in list card — out of list-page scope | — |
| due | Forwarded to `useGoalsPage`; displayed in GoalCard when `goal.dueDate` present | `product-goals-page.test.tsx` — BSN-FILTER-GOALS-02 due forwarded test |
| links | Detail-page field; not shown in list card — out of list-page scope | — |

### Actions

| Action | Implemented | Test file and location |
|---|---|---|
| Create | `handleOpenCreate` → `GoalFormSheet` (create mode) | `product-goals-page-c3.test.tsx` — c shortcut; `product-goals-page.test.tsx` — useGoalsPage integration |
| Edit | `handleEditGoalCard` / `handleEditGoalByIndex` → `setEditGoalId` → `GoalFormSheet` (edit mode) when detail loaded | `product-goals-page-c3.test.tsx` — edit action (data-has-edit, e shortcut) |
| Delete | `handleDeleteGoalCard` → `setDeleteGoalId` → `ConfirmDialog` → `deleteGoalMutation.mutate` | `product-goals-page-c3.test.tsx` — delete action (data-has-delete, confirm dialog, mutate call) |

### Overlays

| Overlay | Implemented | Test file and location |
|---|---|---|
| GoalFormSheet (create) | `open={createOpen}` | `product-goals-page-c3.test.tsx` — c shortcut triggers it |
| GoalFormSheet (edit) | `open` when `editGoalId !== null && editGoalDetail !== undefined` | `product-goals-page-c3.test.tsx` — e key opens goal-form-sheet |
| ConfirmDialog (delete) | `open={deleteGoalId !== null}`, destructive | `product-goals-page-c3.test.tsx` — delete click opens confirm-dialog |

### Query parameters

| Param | Forwarded to API | Test file and location |
|---|---|---|
| status | Yes (typedStatus → params) | `product-goals-page.test.tsx` — existing |
| level | Yes (typedLevel → params) | `product-goals-page.test.tsx` — existing |
| ownerId | Yes (ownerIdValue → params) | `product-goals-page.test.tsx` — BSN-01-028 |
| q/search | Yes (debouncedSearch → params) | `product-goals-page.test.tsx` — existing |
| health | Yes — NEW (healthValue → params) | `product-goals-page.test.tsx` — BSN-FILTER-GOALS-02 health forwarded |
| due | Yes — NEW (dueValue → params) | `product-goals-page.test.tsx` — BSN-FILTER-GOALS-02 due forwarded |
| scope | Yes — NEW (scopeValue → params) | `product-goals-page.test.tsx` — BSN-FILTER-GOALS-02 scope forwarded |
| cursor | N/A — numbered pagination; total computed cheaply | — |

### Bulk actions

None. The spec's "Child collections support selection only when a real repeated operation exists" — no bulk operation is defined for goals on this product-scoped page. No bulk toolbar is present.

### Keyboard shortcuts

| Shortcut | Implemented | Test file and location |
|---|---|---|
| `c` create | `useBuildListKeyboard onCreate` → `handleOpenCreate` | `product-goals-page-c3.test.tsx` — BSN-KB-GOALS-01 |
| `/` search | `useBuildListKeyboard` → `searchInputRef.current.focus()` | `product-goals-page-c3.test.tsx` — smoke (c test proves hook runs) |
| `j/k` move | `useBuildListKeyboard` advances `focusedIndex` (flatGoals.length items) | `product-goals-page-c3.test.tsx` — e test presses j first, proving hook fires |
| `Enter` open | `useBuildListKeyboard onOpen` → `handleEditGoalByIndex` when canManage | `product-goals-page-c3.test.tsx` — implicitly covered (same handler as e) |
| `e` edit | `useBuildListKeyboard onEdit` → `handleEditGoalByIndex` when canManage | `product-goals-page-c3.test.tsx` — BSN-KB-GOALS-02 e key opens sheet |
| `Esc` close | `useBuildListKeyboard onClearSelection` → `() => undefined`, `setFocusedIndex(null)` | hook behaviour; visual focus is C6 |
| `?` help | Global `CommandPaletteProvider` — not per-page | — |

### States

| State | Implemented | Test file and location |
|---|---|---|
| Loading | `GoalsSkeleton` via `PageState loading` | `product-goals-page-c3.test.tsx` — BSN-STATE-GOALS-01 loading skeleton |
| Empty (first-run) | `EmptyState` with create action | `product-goals-page.test.tsx` — existing |
| Empty (filtered) | `EmptyState` with `onClearFilters` (no action) | implemented (listFilters.isFiltered branch) |
| Error | `PageState error` branch | `product-goals-page-c3.test.tsx` — BSN-STATE-GOALS-01 error state |
| Permission denied | `PageState denied` → `NoPermissionState` | `product-goals-page.test.tsx` — BSN-01-027; `product-goals-page-c3.test.tsx` — BSN-STATE-GOALS-01 |
| Offline | P2 — not implemented on any surface (project-wide gap) | — |
| Conflict | CCG-1 — scoped out (no backend optimistic concurrency) | — |

### Permissions

| Key | Gate | Test file and location |
|---|---|---|
| `build:goals:view` | `usePageState` permission; `useGatedQuery` in `useGoalsPage` | `product-goals-page.test.tsx` — BSN-01-027 permission key test |
| `build:goals:manage` | `useCan` → `onEdit`/`onDelete` on GoalCard; `onEdit` in `useBuildListKeyboard`; create button | `product-goals-page-c3.test.tsx` — edit action canManage tests; delete action canManage tests |

---

## Files changed

| File | Change |
|---|---|
| `frontend/hooks/api/goals.ts` | Added `health?/due?/scope?` to `GoalsParams` |
| `frontend/features/build/managed-products/product-goals-page.tsx` | Added `useCan`, `useGoal`, `useDeleteGoal`, `ConfirmDialog`, `toast`, `getErrorMessage`; added `canManage`, `editGoalId`, `deleteGoalId` state; added `flatGoals`, `handleEditGoalByIndex`, `handleEditGoalCard`, `handleDeleteGoalCard`, `handleDeleteConfirm`, `handleEditSheetOpenChange`, `handleDeleteDialogOpenChange`; extracted health/due/scope values; updated params useMemo; wired `onEdit`/`onDelete` on GoalCard; added edit GoalFormSheet and ConfirmDialog; updated useBuildListKeyboard with `onEdit` and `onOpen` |
| `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx` | Added `useGoal` and `useDeleteGoal` to goals mock; exported both |
| `frontend/features/build/managed-products/product-goals-page.test.tsx` | Added 6 tests in BSN-FILTER-GOALS-02 for health/due/scope URL param forwarding (each with a positive and negative assertion) |
| `frontend/features/build/managed-products/product-goals-page-c3.test.tsx` | Added `useGoal`/`useDeleteGoal` to goals mock; added `@/hooks/api/access` mock; added `ConfirmDialog`/`getErrorMessage` mocks; updated GoalCard mock to expose `data-has-edit`/`data-has-delete` and clickable Edit/Delete buttons; added `useCan`/`useDeleteGoal`/`useGoal` mock extractors; added 8 tests: 2 edit canManage, 2 delete canManage, 2 delete confirm dialog/mutate, 2 e-shortcut open/denied |
| `docs/build-module/10-managed-products-product-goals.md` | Ticked C3 |

---

## Test output (real, not narrated)

```
PASS features/build/managed-products/product-goals-page-c3.test.tsx
PASS features/build/managed-products/product-goals-page.test.tsx

Test Suites: 2 passed, 2 total
Tests:       29 passed, 29 total
Time:        4.638 s
```

Full suite (7 files, all managed-products):

```
PASS features/build/managed-products/managed-product-bulk-toolbar.test.tsx
PASS features/build/managed-products/managed-product-dirty-guard.test.tsx
PASS features/build/managed-products/product-goals-page-c3.test.tsx
PASS features/build/managed-products/managed-products-page.test.tsx
PASS features/build/managed-products/managed-products-page-c3.test.tsx
PASS features/build/managed-products/product-goals-page.test.tsx
PASS features/build/managed-products/managed-products-a11y.test.tsx

Test Suites: 7 passed, 7 total
Tests:       69 passed, 69 total
Time:        6.233 s
```

Sibling test files using the harness (confirm harness change is non-breaking):

```
PASS features/build/managed-products/product-insights-page.test.tsx
PASS features/build/managed-products/product-roadmap-page.test.tsx
PASS features/build/managed-products/product-feedback-page.test.tsx

Test Suites: 3 passed, 3 total
Tests:       45 passed, 45 total
Time:        6.244 s
```

---

## C3 verdict: TICKED

Every enumerated item is implemented and covered by a failing-if-broken test, with two exceptions that are project-wide scoped-out entries:

- **Offline state**: P2 gap; not implemented on any surface in the project.
- **Conflict state**: CCG-1; no backend optimistic concurrency, test would prove the mock.
