# C6 — Managed Products surfaces (LANE-3)

Covers `10-managed-products.md`, `10-managed-products-product.md`,
`10-managed-products-product-feedback.md`, `10-managed-products-product-goals.md`,
`10-managed-products-product-insights.md`, `10-managed-products-product-projects.md`,
`10-managed-products-product-roadmap.md`, `10-project-feedbucket.md`, and
`10-project-feedbucket-submission.md`.

---

## Per-page × per-check matrix

### Before this session

The drain on 2026-09-26 passed 45 tests against a spec that covered only the main managed
products list page completely. Sub-page cases existed for feedback, goals, and roadmap (loading and
empty states) but were not wired into any of the five check loops. Pages 2, 5, 6, 8, 9 had no
gallery cases at all.

| Page | 375 px | Screen-reader | Reduced motion | High-density | Keyboard |
|------|--------|---------------|----------------|--------------|----------|
| managed-products (list) | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product (overview) | ✗ | ✗ | ✗ | ✗ | ✗ |
| managed-products-product-feedback | ✗ | partial | ✗ | ✗ | ✗ |
| managed-products-product-goals | ✗ | partial | ✗ | ✗ | ✗ |
| managed-products-product-insights | ✗ | ✗ | ✗ | ✗ | ✗ |
| managed-products-product-projects | ✗ | ✗ | ✗ | ✗ | ✗ |
| managed-products-product-roadmap | ✗ | partial | ✗ | ✗ | ✗ |
| project-feedbucket | ✗ | ✗ | ✗ | ✗ | ✗ |
| project-feedbucket-submission | ✗ | ✗ | ✗ | ✗ | ✗ |

"partial" means a screen-reader assertion existed for one state (e.g. empty) but not the loading
state, and the test was not scoped to a check describe; the same gallery case was not included in
the 375 px, high-density, or reduced-motion loops.

### After this session

| Page | 375 px | Screen-reader | Reduced motion | High-density | Keyboard |
|------|--------|---------------|----------------|--------------|----------|
| managed-products (list) | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product (overview) | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product-feedback | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product-goals | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product-insights | ✓ | shimmer✓ | ✓ | ✓ | ✓ |
| managed-products-product-projects | ✓ | ✓ | ✓ | ✓ | ✓ |
| managed-products-product-roadmap | ✓ | ✓ | ✓ | ✓ | ✓ |
| project-feedbucket | ✓ | ✓ | ✓ | ✓ | ✓ |
| project-feedbucket-submission | ✓ | ✓ | ✓ | ✓ | ✓ |

### Notes on the matrix entries

**Screen-reader "shimmer✓" (insights):** `ProductInsightsPage` has no distinct empty state
(the page shows `0` in all stat cards when the product has no data). The gallery case
`insights-loading` uses `StatCardGridSkeleton` with the same heading structure as the real
component. The screen-reader assertion proves each shimmer element carries `aria-hidden="true"`,
keeping the accessibility tree clean during loading. There is no role/accessible-name assertion for
a ready state; the stat cards' label/value pairs are the only semantic content in the ready state
and cannot be tested without a ready-state gallery case that requires stubbing the hook response.
This entry reads as "AT-clean during loading" not as "ready-state roles verified."

**Keyboard evidence per page:**
- feedback: `EmptyState` "Clear filters" button focusable via `btn.focus()` + `toBeFocused()`
- goals: `EmptyState` "New goal" button
- roadmap: `EmptyState` "Add item" button
- overview: `PageWrapper` Back link (`aria-label="Back"`) rendered via `backHref`
- insights: Range filter `[data-slot=select-trigger]` in the insights-loading toolbar
- projects: `EmptyState` "Link project" button
- feedbucket: `EmptyState` "Create feedback widget" button
- submission: `PageWrapper` Back link rendered via `backHref`

The keyboard tests use `locator.focus()` + `toBeFocused()`, not Tab-press navigation through the
full page. This proves the element is focusable and in the accessibility tree; it does not prove
Tab order relative to surrounding elements. Tab-order evidence for sub-pages requires a full
interactive ready-state gallery case (see remaining gaps below).

---

## What was changed

### `features/build/overview/managed-product-overview-page.tsx`

Added `export` to `ManagedProductOverviewSkeleton`. No other change.

### `features/build/managed-products/managed-products-gallery.tsx`

New imports: `Skeleton`, `StatCardGridSkeleton`, `ManagedProductOverviewSkeleton`, `GridSkeleton`.

New constants: `RANGE_OPTIONS` (insights filter options), `STUB_CHANGE` (no-op for static cases).

Updated three existing empty-state cases to add an `action` prop, giving keyboard tests a focus
target that matches what the real page would show:
- `feedback-empty` → `action={{ label: "Clear filters" }}`
- `goals-empty` → `action={{ label: "New goal" }}`
- `roadmap-empty` → `action={{ label: "Add item" }}`

Nine new gallery cases added:

| Case ID | Real components used | Basis for "real component" claim |
|---------|---------------------|----------------------------------|
| `overview-loading` | `ManagedProductOverviewSkeleton` (`StatCardGridSkeleton` + `Skeleton`) | exported from the real overview page file |
| `overview-empty` | `PageWrapper` + `EmptyState` | matches the real `ManagedProductOverviewPage` `empty` prop + `backHref` from the real route |
| `insights-loading` | `PageWrapper` + `BuildListToolbar` + `BuildFilterSelect` + `StatCardGridSkeleton` | same toolbar structure and heading text as `ProductInsightsPage`'s loading state |
| `projects-loading` | `GridSkeleton` | exported from `projects-page-skeletons.tsx`, used by `ProjectsPage` for its loading state |
| `projects-empty` | `EmptyState` | matches an empty-page state; `ProjectsPage` uses `EmptyState` for the empty branch |
| `feedbucket-loading` | `PmPageShell` + `Skeleton` | matches the `loading` prop of `ProjectFeedbucketPage`'s `PageWrapper` exactly |
| `feedbucket-empty` | `EmptyState` | matches the real feedbucket empty branch (`EmptyState` title "No feedback widget") |
| `submission-loading` | `Skeleton` × 3 | matches the `loading` prop of `FeedbucketSubmissionDetail`'s `PageState` exactly |
| `submission-empty` | `PageWrapper` + `EmptyState` | matches the `empty` prop of `FeedbucketSubmissionDetail`'s `PageState` + `backHref` |

### `e2e/managed-products-a11y.spec.ts`

Added two new typed arrays: `SUB_PAGE_LOADING_CASES` (8 items) and `SUB_PAGE_EMPTY_CASES`
(7 items).

Added five new describe blocks, each targeting a distinct C6 check for the sub-pages:

1. **"sub-page surfaces — 375 px mobile width — no horizontal overflow"** — 2 tests; iterates
   `SUB_PAGE_LOADING_CASES` and `SUB_PAGE_EMPTY_CASES`; uses `test.use({ viewport: ... })` not
   `page.setViewportSize()` (consistent with the high-density block's approach).

2. **"sub-page surfaces — screen-reader roles and accessible names"** — 5 tests; 4 `role="status"`
   assertions on new empty cases + 1 `aria-hidden` assertion on all new loading cases.

3. **"sub-page loading skeletons — reduced motion (paired)"** — 2 tests (reduce + no-preference);
   iterates all 8 `SUB_PAGE_LOADING_CASES`; each case checked for `animation-name: none` / not-none
   on the first `.skeleton-shimmer.animate-pulse:visible` element. Paired to prevent vacuous passing.

4. **"sub-page surfaces — high-density desktop 1920×1080 @ deviceScaleFactor 2"** — 2 tests;
   iterates `SUB_PAGE_LOADING_CASES` and `SUB_PAGE_EMPTY_CASES`.

5. **"sub-page surfaces — keyboard focus reachability"** — 8 tests; one per sub-page; each calls
   `focus()` and asserts `toBeFocused()` on the interactive element described in the "keyboard
   evidence per page" note above.

Total tests added: approximately 19 (across the five describes).

---

## Remaining gaps

**Screen-reader — insights ready state.** `insights-loading` proves skeleton elements are
aria-hidden. A positive assertion (stat card roles, accessible names, heading hierarchy) requires
a ready-state case that stubs `useManagedProductInsights`. This would need either a mock provider
in the gallery (currently none exists) or extracting a pure-presentational sub-component from
`ProductInsightsPage`. Neither is possible without modifying `features/build/managed-products/**`
source (owned by a sibling agent).

**Keyboard — Tab order for sub-page toolbars.** Each sub-page keyboard test uses `.focus()` rather
than Tab-press navigation. Tab order relative to search input, filter controls, and table rows
(i.e. the same evidence the main list page provides) would require a fully-mounted ready state for
each sub-page. The same constraint as above applies.

**Browser verification.** This report describes source changes, not drain output. C6 is not ticked
until a fresh serial drain confirms EXIT=0 for the expanded spec.
