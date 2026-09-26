# C6 — Build List Gallery (build-list-responsive)

## Pre-session state — what 36 green tests proved

The drain run (2026-09-26, EXIT=0) had five describe blocks:

| Describe | C6 check covered |
|---|---|
| `375x812` / `768x1024` / `1280x800` shared loop | 375 px mobile (partial) |
| `375 x 812` | 375 px mobile (full) |
| `768 x 1024` | Desktop table layout |
| `1280 x 800` | Desktop wide layout |
| `reduced motion — loading skeleton shimmer stops` | Reduced motion (paired) |
| `high-density desktop — 1920 × 1080 at scale 2` | High-density desktop |

**No keyboard describe existed.** There was also no dedicated screen-reader describe. The
pre-existing tests inside `375 x 812` asserting `getByRole("status")` for empty states and
`getByRole("columnheader")` for the skeleton are valid evidence, but they live inside
viewport blocks, not a screen-reader block, and the skeleton column-header test covers only the
loading state — not the ready table.

Two of C6's five checks were therefore unmet: keyboard and screen-reader.

---

## Gallery is cross-cutting, not per-page

`/design-system/build-list` mounts the shared chrome components used by every build-module list
page:

- `PageWrapper` — the page shell (title, subtitle, header band, filters band, content region)
- `BuildHeaderActions` — the header action buttons with mobile/desktop overflow plan
- `BuildListToolbar` — the search-plus-filters toolbar with responsive drawer collapse
- `BuildFilterSelect` — the per-filter select trigger
- `BuildMobileCard` — the mobile card component for list rows
- `DataTable` — the real TanStack-backed desktop table
- `DataTableSkeleton` — the loading skeleton (mobileCards variant)
- `EmptyState` — true-empty and filtered-empty states
- `ErrorState` — error state

All of these are real components mounted with static stub data, not lookalikes. This means the
gallery's C6 evidence covers these shared parts for any page that composes itself from them.
A page that uses `BuildHeaderActions + BuildListToolbar + DataTable + BuildMobileCard` can cite
this gallery for the shared-chrome portion of its keyboard / screen-reader evidence. The
page-specific portion (its own columns, filter IDs, empty-state copy, permission gate) still
requires per-page tests.

### Pages in the 83-page spec set that use the full pattern

The following pages import both `BuildHeaderActions` and `BuildListToolbar` (the two components
that define the gallery's layout contract). They are the strongest candidates for citing this
gallery.

| Feature file | Likely spec |
|---|---|
| `features/build/managed-products/managed-products-page.tsx` | 10-managed-products.md |
| `features/build/releases/releases-page.tsx` | 10-project-releases.md |
| `features/build/governance/decisions-page.tsx` | 10-project-decisions.md |
| `features/build/teams/teams-list-page.tsx` | 10-teams.md |
| `features/build/governance/risks-page.tsx` | 10-project-risks.md |
| `features/build/change-requests/change-requests-page.tsx` | 10-project-change-requests.md |
| `features/build/incidents/incidents-page.tsx` | 10-project-incidents.md |
| `features/build/forms/forms-list-page.tsx` | 10-project-forms.md |
| `features/build/members/members-page.tsx` | 10-project-settings-access.md (settings access tab) |

An additional ~20 pages import only `BuildListToolbar` (no `BuildHeaderActions`). They use the
toolbar with a custom header pattern and benefit from the toolbar-and-filter coverage here, but
not from the overflow-menu or header-action tests.

---

## What was added (2026-09-26)

### `test.describe("keyboard — tab order at 1280 px")`

Three tests, all using `toBeFocused()` on real focus stops:

1. **"action buttons then toolbar controls are reached in visual DOM order"** — focuses the
   Import button via `.focus()`, then presses Tab five times asserting `toBeFocused()` on
   Export → New project → More actions → search input in that order. Confirms the visual
   DOM order (header actions before toolbar) is also the tab order.

2. **"filter select triggers are reachable in order after search"** — focuses the search input
   directly, then presses Tab three times asserting Status → Health → Lead select triggers
   are focused in left-to-right DOM order.

3. **"opening the overflow dropdown and pressing Escape returns focus to its trigger"** — opens
   the desktop overflow dropdown with a click, asserts the `role="menu"` appears, presses
   Escape, asserts the menu is gone and the trigger is focused again.

All three press real keys. None counts roles as a proxy for reachability.

### `test.describe("screen reader — roles and accessible names")`

Five tests across two nested viewport describes:

**768 × 1024 sub-describe:**

4. **"the ready table exposes role table with all six column headers named"** — at 768px the
   desktop table is shown. Asserts `getByRole("table")` is visible, then iterates
   `["Key", "Name", "Status", "Owner", "Progress", "Target"]` asserting each
   `getByRole("columnheader", { name: header, exact: true })` is visible. This covers the
   ready table; the pre-existing skeleton test covered only the loading state.

5. **"the table container is a labelled region that can receive keyboard focus"** — asserts
   `getByRole("region", { name: "Table", exact: true })` is visible and has `tabindex="0"`.
   The `Table` component always wraps its scroll container as `role="region" aria-label="Table"
   tabIndex={0}` when `containerFocusable` is true (the gallery's default).

6. **"the search input carries its accessible label"** — asserts
   `getByRole("searchbox", { name: "Search projects", exact: true })` is visible. The gallery
   passes `label: "Search projects"` to `BuildListToolbar`, which forwards it as `aria-label`.

7. **"each filter select trigger is named by its visual label"** — asserts
   `getByRole("combobox", { name: label, exact: true })` for Status, Health, Lead. The
   `BuildFilterSelect` passes `aria-label={label}` to `SelectTrigger`, which renders
   `role="combobox"` (confirmed in `select.tsx` JSDoc).

**375 × 812 sub-describe:**

8. **"the true-empty status landmark contains its heading"** — asserts `getByRole("status")` is
   visible and that `status.getByRole("heading", { name: "No projects yet", exact: true })`
   is visible within it. The `EmptyState` component renders `role="status"` on its root div
   and an `h2` with the title. This is an extension of the pre-existing viewport test which
   checked layout dimensions but not accessible content.

---

## What each page still needs for C6

The gallery covers the shared chrome for all pages listed above. What it cannot cover:

- **Page-specific column headers** — the gallery uses stub columns (Key, Name, Status, Owner,
  Progress, Target). A page whose table has different columns must assert those column names.
- **Page-specific filter IDs and labels** — Status/Health/Lead are gallery stubs. Pages with
  different filters must assert their own filter accessible names.
- **Page-specific empty-state copy** — the gallery uses "No projects yet" / "No results match
  your filters." Pages with different copy must assert their own text.
- **Page-specific permission gates** — the gallery is public-route (no auth). Each page's
  `usePageState` permission key and denied-state rendering must be tested per-page.
- **The `/` keyboard shortcut** — `useBuildListKeyboard` is wired only in `projects-page.tsx`,
  not in the gallery. Pages that wire this hook must test it per-page.
- **Row keyboard navigation (j/k/Enter)** — same reason: hook wired at call site, not in gallery.

C6 remains unticked on all 83 pages until a fresh serial drain confirms the new tests pass.
