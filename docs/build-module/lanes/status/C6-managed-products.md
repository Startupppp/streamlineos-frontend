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

### After first session

| Page | 375 px | Screen-reader | Reduced motion | High-density | Keyboard |
|------|--------|---------------|----------------|--------------|----------|
| managed-products (list) | ✓ | ✓ | ✓ | ✓ | tab order ✓ |
| managed-products-product (overview) | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-feedback | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-goals | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-insights | ✓ | shimmer✓ | ✓ | ✓ | focusable |
| managed-products-product-projects | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-roadmap | ✓ | ✓ | ✓ | ✓ | focusable |
| project-feedbucket | ✓ | ✓ | ✓ | ✓ | focusable |
| project-feedbucket-submission | ✓ | ✓ | ✓ | ✓ | focusable |

### After second session (F-15)

| Page | 375 px | Screen-reader | Reduced motion | High-density | Keyboard |
|------|--------|---------------|----------------|--------------|----------|
| managed-products (list) | ✓ | ✓ | ✓ | ✓ | tab order ✓ |
| managed-products-product (overview) | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-feedback | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-goals | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-insights | ✓ | ✓ | ✓ | ✓ | focusable (loading) + tab order ✓ (ready) |
| managed-products-product-projects | ✓ | ✓ | ✓ | ✓ | focusable |
| managed-products-product-roadmap | ✓ | ✓ | ✓ | ✓ | focusable |
| project-feedbucket | ✓ | ✓ | ✓ | ✓ | focusable |
| project-feedbucket-submission | ✓ | ✓ | ✓ | ✓ | focusable |

**Keyboard column legend:**
- **tab order ✓** — test presses Tab and asserts `toBeFocused()` at each stop, proving order
  matches visual order.
- **focusable** — test calls `locator.focus()` + `toBeFocused()`. Proves the element is in the
  accessibility tree and is programmatically focusable; does not prove Tab order relative to
  surrounding elements.
- **focusable (loading) + tab order ✓ (ready)** — two gallery cases exist for this page. The
  loading case uses `.focus()`; the ready-state case (cache-seeded) presses Tab and asserts the
  Range filter is the first stop and that Tab exits the section thereafter.

### Notes on the matrix entries

**Screen-reader (insights) — now ✓:** The `insights-ready` gallery case mounts
`ProductInsightsPage` directly with stub data seeded into a TanStack Query client created via
`createAppQueryClient("insights-ready-gallery")`. The access response
(`platformCoreQueryKeys.access.me()`) is pre-seeded with `isOrgOwner: false` and
`"build:managed-products:view": "all"` in `scopes`, which satisfies `grantsPermission` and
unblocks `usePageState` into `{ kind: "ready" }`. The insights response
(`buildWorkQueryKeys.projects.managedProducts.insights(1)`) is pre-seeded with specific non-zero
values, so the ready branch renders three `StatCardGrid` sections with real `StatCard` components.
Two new spec tests assert: (1) three h2 section headings are present in the accessibility tree;
(2) stat card labels ("Linked projects", "Open", "Feedback votes") and their numeric values (42,
17, 38) are visible within the correct `[data-slot="stat-card-grid"]` scope, preventing collision
with any page-level text that shares the same string.

**Keyboard evidence per page:**
- list: Tab from search → Status → Sort (Tab-order ✓); Tab from name link → Actions button
  → second name link (Tab-order ✓); Enter opens menu, Escape closes and restores focus
- overview: `PageWrapper` Back link (`aria-label="Back"`) is keyboard-focusable via `.focus()`
- feedback: `EmptyState` "Clear filters" button is keyboard-focusable via `.focus()`
- goals: `EmptyState` "New goal" button is keyboard-focusable via `.focus()`
- insights-loading: Range filter `[data-slot=select-trigger]` is keyboard-focusable via `.focus()`
- insights-ready: Range filter is the first Tab stop; Tab exits the page section (Tab-order ✓)
- projects: `EmptyState` "Link project" button is keyboard-focusable via `.focus()`
- roadmap: `EmptyState` "Add item" button is keyboard-focusable via `.focus()`
- feedbucket: `EmptyState` "Create feedback widget" button is keyboard-focusable via `.focus()`
- submission: `PageWrapper` Back link is keyboard-focusable via `.focus()`

**Why seven sub-pages remain "focusable" rather than "tab order ✓":** Tab-order evidence requires
a ready-state gallery case with interactive toolbar elements. The seven sub-pages (overview,
feedback, goals, projects, roadmap, feedbucket, submission) have empty-state or loading-state cases
only — neither a populated DataTable nor a ready-state toolbar. Seeding those pages' hooks would
require mounting components whose ready states involve complex data structures (ticket rows, goal
cards, roadmap items) that differ from the insights case. A future session can add those cases
following the same pattern used for `insights-ready`.

---

## What was changed

### Session 1

#### `features/build/overview/managed-product-overview-page.tsx`

Added `export` to `ManagedProductOverviewSkeleton`. No other change.

#### `features/build/managed-products/managed-products-gallery.tsx` (session 1)

New imports: `Skeleton`, `StatCardGridSkeleton`, `ManagedProductOverviewSkeleton`, `GridSkeleton`.

New constants: `RANGE_OPTIONS` (insights filter options), `STUB_CHANGE` (no-op for static cases).

Updated three existing empty-state cases to add an `action` prop, giving keyboard tests a focus
target that matches what the real page would show:
- `feedback-empty` → `action={{ label: "Clear filters" }}`
- `goals-empty` → `action={{ label: "New goal" }}`
- `roadmap-empty` → `action={{ label: "Add item" }}`

Nine new gallery cases added (all skeleton or empty-state cases; see session 2 for the ready
state):

| Case ID | Real components used |
|---------|---------------------|
| `overview-loading` | `ManagedProductOverviewSkeleton` |
| `overview-empty` | `PageWrapper` + `EmptyState` |
| `insights-loading` | `PageWrapper` + `BuildListToolbar` + `BuildFilterSelect` + `StatCardGridSkeleton` |
| `projects-loading` | `GridSkeleton` |
| `projects-empty` | `EmptyState` |
| `feedbucket-loading` | `PmPageShell` + `Skeleton` |
| `feedbucket-empty` | `EmptyState` |
| `submission-loading` | `Skeleton` × 3 |
| `submission-empty` | `PageWrapper` + `EmptyState` |

#### `e2e/managed-products-a11y.spec.ts` (session 1)

Added `SUB_PAGE_LOADING_CASES` (8 items) and `SUB_PAGE_EMPTY_CASES` (7 items). Added five new
describe blocks covering 375 px, screen-reader, reduced-motion (paired), high-density, and
keyboard (`.focus()` only). Total tests added: approximately 19.

---

### Session 2 (F-15)

#### `features/build/managed-products/managed-products-gallery.tsx` (session 2)

New imports: `QueryClientProvider`, `createAppQueryClient`, `buildWorkQueryKeys`,
`platformCoreQueryKeys`, `ProductInsightsPage`, `ManagedProductInsights`, `AccessResponse`.

New constants: `STUB_INSIGHTS_ID` (1), `STUB_ACCESS` (grants `build:managed-products:view`),
`STUB_INSIGHTS_DATA` (non-zero values across all three stat sections).

New component: `InsightsReadyFrame` — creates a `QueryClientProvider` backed by a dedicated
`createAppQueryClient("insights-ready-gallery")` instance, pre-seeds the access key and insights
key via `setQueryData`, then mounts `ProductInsightsPage` with `managedProductId={1}`. Because the
scope segment lives in the key hash (not the array), the seed and the hook's `useQuery` call hash
identically. The access seed (with `"build:managed-products:view": "all"` in `scopes`) satisfies
`grantsPermission`, unblocking `usePageState` into `{ kind: "ready" }` and `canView = true`.
Since `staleTime: 2 * 60_000` and the seed was written moments before mount, no network request
fires.

New gallery case: `insights-ready` — wraps `InsightsReadyFrame`.

#### `e2e/managed-products-a11y.spec.ts` (session 2)

Eight keyboard tests renamed: "keyboard-reachable" → "keyboard-focusable" across all eight
sub-page keyboard tests, clarifying that they use `locator.focus()` not Tab press.

Three new tests in the 375 px describe: overflow assertion for `insights-ready`.

Three new tests in the high-density describe: overflow assertion for `insights-ready`.

Two new tests in the screen-reader describe:
1. `insights-ready — section headings 'Projects', 'Feedback submissions' and 'Roadmap outcomes' are
   present in the accessibility tree` — asserts three `role="heading" level=2` elements with
   `exact: true`.
2. `insights-ready — stat card labels and numeric values are readable within each grid, scoped to
   avoid page-level text collisions` — asserts labels and stub values within
   `[data-slot="stat-card-grid"]` scope; three grids × (label + value), using stub values that are
   numerically unique (42, 17, 38) to prevent false passes from unrelated occurrences.

One new test in the keyboard describe:
- `insights-ready — Tab order: Range filter is the first Tab stop in the toolbar; Tab moves past it
  leaving no focusable element in the section` — focuses the range select trigger, presses Tab,
  asserts the trigger is no longer focused and that `scope.locator(":focus")` has count 0 (no
  other interactive element in the stat-card body receives focus).

Total tests added in session 2: approximately 7.

---

## Remaining gaps

**Keyboard — Tab order for seven sub-page toolbars.** Overview, feedback, goals, projects,
roadmap, feedbucket, and submission-detail keyboard tests all use `locator.focus()` rather than
Tab-press navigation. Each of those sub-pages has loading or empty gallery cases only; a
Tab-order test requires a ready-state gallery case with interactive elements. Mounting a ready
state for each requires seeding more complex data (ticket rows, goal cards, roadmap items) beyond
what was attempted here. The insights page is now the sole sub-page with Tab-order evidence.

**Browser verification.** This report describes source changes, not drain output. C6 is not ticked
until a fresh serial drain confirms EXIT=0 for the expanded spec.
