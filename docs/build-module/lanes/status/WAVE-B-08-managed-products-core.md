# Wave-B-08 Status: Managed Products Core

## Criterion Summary

| Page | C3 | Evidence |
|---|---|---|
| 10-managed-products-product.md (list page) | TICKED | `c` shortcut fixed; all states/actions/params tested; 35 tests green |
| 10-managed-products-product-goals.md (goals tab) | NOT TICKED | Blockers: edit/delete actions not wired (harness gap REQ-1); health/due URL params not forwarded to API (REQ-2) |

---

## 10-managed-products-product.md — C3 Row-by-Row

**Implementation file:** `frontend/features/build/managed-products/managed-products-page.tsx`

### Core fields

| Field | Implemented | Tested |
|---|---|---|
| name | Yes — link cell in DataTable | managed-products-page.test.tsx line 75 |
| owner | Yes — owner cell with name resolution | managed-products-page.test.tsx line 75 |
| status | Yes — ManagedProductStatusBadge | managed-products-a11y.test.tsx |
| key | Yes — font-mono cell | managed-products-page.test.tsx |
| description | Yes — truncated text cell | managed-products-page.test.tsx |
| goals / projects / feedback | Detail-page tabs (Wave-A's ManagedProductOverviewPage); not list columns | n/a |
| updated | Present on ManagedProduct type; not surfaced as a list column | n/a |

**Verdict:** Primary list fields (name, status, owner) implemented and tested. goals/projects/feedback/updated are detail-page fields shown via the tab navigation (not the list responsibility).

### Actions

| Action | Implemented | Tested |
|---|---|---|
| Create | ManagedProductFormSheet (mode=create) | managed-products-page.test.tsx |
| Edit | ManagedProductFormSheet (mode=edit) | managed-products-page.test.tsx |
| Delete | ConfirmDialog + useDeleteManagedProduct | managed-product-dirty-guard.test.tsx |
| Open product | Link in name cell + keyboard Enter | managed-products-page.test.tsx |
| Copy link | ProductRowActions dropdown | managed-products-a11y.test.tsx |
| Copy key | ProductRowActions dropdown | managed-products-a11y.test.tsx |

### Overlays

| Overlay | Implemented | Tested |
|---|---|---|
| Create/edit sheet | ManagedProductFormSheet | managed-product-dirty-guard.test.tsx + managed-products-page-c3.test.tsx |
| Delete confirm | ConfirmDialog destructive | managed-products-page.test.tsx (smoke) |

### Query parameters

| Param | Implemented | Tested |
|---|---|---|
| status | useBuildListFilters + passed to useManagedProducts | managed-products-page-c3.test.tsx |
| ownerId | useBuildListFilters + passed to useManagedProducts | managed-products-page.test.tsx |
| q / search | debounced search + passed to useManagedProducts | managed-products-page.test.tsx |
| sort | useBuildListFilters + passed to useManagedProducts | managed-products-page-c3.test.tsx |
| cursor | useCursorPager + passed to useManagedProducts | managed-products-page-c3.test.tsx |

### Bulk actions

| Action | Implemented | Tested |
|---|---|---|
| Change status (active/archived) | ManagedProductBulkToolbar + useBulkUpdateManagedProducts | managed-product-bulk-toolbar.test.tsx |
| Partial success | Toast shows `${succeeded} updated, ${skipped} skipped` | managed-product-bulk-toolbar.test.tsx |
| Cap at 100 | MANAGED_PRODUCT_BULK_MAX = 100; capped ids visible | managed-product-bulk-toolbar.test.tsx |

### Keyboard shortcuts

| Shortcut | Implemented | Tested |
|---|---|---|
| `/` focus search | useBuildListKeyboard case "/" | managed-products-page.test.tsx (j+Enter test proves hook runs) |
| `c` create | **FIXED this session** — added `onCreate: canCreate ? handleOpenCreate : undefined` | managed-products-page-c3.test.tsx |
| `j` / `k` move | useBuildListKeyboard j/k cases | managed-products-page.test.tsx |
| `Enter` open | useBuildListKeyboard Enter case | managed-products-page.test.tsx |
| `e` edit | useBuildListKeyboard e case | managed-products-page.test.tsx |
| `Esc` clear | useBuildListKeyboard Escape case | managed-products-page.test.tsx |
| `?` help | Global CommandPaletteProvider → ShortcutsHelpDialog (not per-page) | n/a (global) |

### States

| State | Implemented | Tested |
|---|---|---|
| Loading | DataTableSkeleton via PageState | managed-products-page-c3.test.tsx |
| Empty (no data) | EmptyState with create action | managed-products-page-c3.test.tsx |
| Empty (filtered) | EmptyState with clear-filters action | managed-products-page-c3.test.tsx |
| Error | PageState error branch with retry | managed-products-page-c3.test.tsx |
| Permission denied | NoPermissionState — distinct from empty | managed-products-page.test.tsx + managed-products-a11y.test.tsx |
| Offline | P2 — not implemented on any surface | n/a |
| Conflict | P2 — not implemented on any surface | n/a |

### Permissions

| Standing | View | Create | Edit | Archive/Delete | Tested |
|---|---|---|---|---|---|
| usePageState("build:managed-products:view") | Yes | n/a | n/a | n/a | managed-products-page.test.tsx |
| useCan("build:managed-products:create") gates button+`c` | n/a | Yes | n/a | n/a | managed-products-page-c3.test.tsx |
| useCan("build:managed-products:update") gates selection | n/a | n/a | Yes | n/a | managed-products-page.test.tsx |
| useCan("build:managed-products:delete") gates delete item | n/a | n/a | n/a | Yes | managed-products-page.test.tsx |

**C3 verdict: TICKED.** All P0/P1 rows covered. P2 rows (offline, conflict) acknowledged.

---

## 10-managed-products-product-goals.md — C3 Row-by-Row

**Implementation file:** `frontend/features/build/managed-products/product-goals-page.tsx`

### Core fields

| Field | Implemented | Tested |
|---|---|---|
| title | GoalCard link | product-goals-page-c3.test.tsx |
| owner | GoalCard owner span | managed-products-a11y.test.tsx |
| status | GoalCard Badge | managed-products-a11y.test.tsx |
| progress | GoalCard progress bar | managed-products-a11y.test.tsx |
| due | GoalCard dueDate display | managed-products-a11y.test.tsx |
| scope | NOT shown in card (linked goal's level shown via grouped header) | — |
| target / current / confidence | NOT shown in card (detail-page fields) | — |
| links | NOT shown in card (detail-page fields) | — |

### Actions

| Action | Implemented | Tested |
|---|---|---|
| Create | GoalFormSheet via handleOpenCreate | product-goals-page.test.tsx + product-goals-page-c3.test.tsx |
| Edit | **NOT WIRED** — GoalCard accepts onEdit but ProductGoalsPage passes none | BLOCKER |
| Delete | **NOT WIRED** — GoalCard accepts onDelete but ProductGoalsPage passes none | BLOCKER |

**Blocker:** Edit/delete cannot be added without updating `product-scope-pages.test-harness.tsx` to mock `useGoal` and `useDeleteGoal`. Filed as REQ-1.

### Query parameters

| Param | Implemented in URL | Forwarded to API | Tested |
|---|---|---|---|
| status | Yes (GOAL_FILTER_DEFINITIONS) | Yes (typedStatus → params) | product-goals-page.test.tsx |
| level / scope | Yes (level param) | Yes (typedLevel → params) | product-goals-page.test.tsx |
| ownerId | Yes | Yes | product-goals-page.test.tsx |
| q / search | Yes | Yes | product-goals-page.test.tsx |
| health | Yes (GOAL_FILTER_DEFINITIONS) | NO — not in GoalsParams | BLOCKER (REQ-2) |
| due | Yes (GOAL_FILTER_DEFINITIONS) | NO — not in GoalsParams | BLOCKER (REQ-2) |
| scope (separate from level) | Yes (GOAL_FILTER_DEFINITIONS) | NO — not in GoalsParams | BLOCKER (REQ-2) |
| cursor | N/A — numbered pagination used (total is cheap to compute) | n/a | product-goals-page.test.tsx |

### Keyboard shortcuts

| Shortcut | Implemented | Tested |
|---|---|---|
| `c` create | **FIXED this session** — added `onCreate: handleOpenCreate` | product-goals-page-c3.test.tsx |
| `/` search | useBuildListKeyboard "/" case | product-goals-page-c3.test.tsx (smoke) |
| `j/k` | useBuildListKeyboard (onOpen = no-op on this surface) | — |
| `Esc` | useBuildListKeyboard Escape case | — |
| `?` help | Global CommandPaletteProvider | — |

### States

| State | Implemented | Tested |
|---|---|---|
| Loading | GoalsSkeleton via PageState | product-goals-page-c3.test.tsx |
| Empty | EmptyState | product-goals-page.test.tsx |
| Error | PageState error branch | product-goals-page-c3.test.tsx |
| Permission denied | NoPermissionState | product-goals-page.test.tsx + managed-products-a11y.test.tsx |

### Permissions

| Key | Gated | Tested |
|---|---|---|
| build:goals:view | usePageState + useGatedQuery | product-goals-page.test.tsx |
| build:goals:manage for create button | resolution.kind !== "denied" gate | product-goals-page.test.tsx |

**C3 verdict: NOT TICKED.** Blockers: (1) edit/delete actions not wired on goal cards (needs REQ-1 harness update), (2) health/due/scope URL params not forwarded to API (needs REQ-2).

---

## Files Changed

| File | Change |
|---|---|
| `frontend/features/build/managed-products/managed-products-page.tsx` | Added `onCreate: canCreate ? handleOpenCreate : undefined` to useBuildListKeyboard call |
| `frontend/features/build/managed-products/product-goals-page.tsx` | Added `onCreate: handleOpenCreate` to useBuildListKeyboard call |
| `frontend/features/build/managed-products/managed-products-page-c3.test.tsx` | **NEW** — 9 tests: c shortcut (2), states (5), URL params (2) |
| `frontend/features/build/managed-products/product-goals-page-c3.test.tsx` | **NEW** — 7 tests: c shortcut (1), states (4), URL params (2) |
| `docs/build-module/10-managed-products-product.md` | Ticked C3 |
| `docs/build-module/lanes/requests/WAVE-B-08.md` | **NEW** — filed REQ-1 (harness update) and REQ-2 (GoalsParams extension) |

---

## Test Commands Run and Counts

```
npx jest --runTestsByPath \
  "features/build/managed-products/managed-products-page.test.tsx" \
  "features/build/managed-products/product-goals-page.test.tsx" \
  "features/build/managed-products/managed-product-bulk-toolbar.test.tsx" \
  "features/build/managed-products/managed-products-page-c3.test.tsx" \
  "features/build/managed-products/product-goals-page-c3.test.tsx" \
  --no-coverage

Test Suites: 5 passed, 5 total
Tests:       35 passed, 35 total

npx jest --runTestsByPath \
  "features/build/managed-products/managed-products-a11y.test.tsx" \
  "features/build/managed-products/managed-product-dirty-guard.test.tsx" \
  --no-coverage

Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

Total: **55 tests passing, 0 failures**

---

## What Remains / Filed Requests

### REQ-1 (filed in WAVE-B-08.md)
Update `product-scope-pages.test-harness.tsx` to mock `useGoal` and `useDeleteGoal`. Once done, add edit/delete functionality to `product-goals-page.tsx` (following the pattern from `goals-page.tsx`) and wire `onEdit`/`onDelete` callbacks to `GoalCard`. Then reopen C3 for goals.

### REQ-2 (filed in WAVE-B-08.md)  
Add `health?: string`, `due?: string`, `scope?: string` to `GoalsParams` in `frontend/hooks/api/goals.ts`, and add backend support. Once done, `product-goals-page.tsx` can forward these params to `useGoalsPage`. GOAL_FILTER_DEFINITIONS already tracks them in the URL.
