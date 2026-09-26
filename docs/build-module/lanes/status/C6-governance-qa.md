# C6 — Governance & QA surfaces (governance-qa-a11y)

## Drain result (2026-09-26, pre-fix)

EXIT=1 · 3 failed · 31 passed · 34 total

All three failures were in `test.describe("keyboard reachability — 1280x800")`.

---

## Failure classification

### Failure 1 — select-all checkbox never becomes checked after Space press (line 231)

Test: "pressing Space on the select-all checkbox in risks-with-selection checks it"

Drain log: `aria-checked="false"` after 21 retries (~10 s). The select-all header
read `checked={table.getIsAllPageRowsSelected()}` from TanStack Table. With
`manualPagination: true` the gallery passes a cursor-mode `STATIC_PAGINATION`, which
forces `isServerPagination = true`, which sets `manualPagination: true` on the table
instance. Under that flag `getIsAllPageRowsSelected()` calls
`getPaginationRowModel().flatRows`, which resolves via `getPrePaginationRowModel()` to
`getCoreRowModel()`. Although all 8 rows exist there, the function also reads
`table.getState().rowSelection` through the `options.state` override. In a real React
19 browser the external `selection.selected` update and the TanStack internal state
reconciliation are not synchronised tightly enough for the computed prop to stabilise
before Playwright's 10 s timeout.

Classification: **(a) product defect** — `data-table.tsx` relied on a TanStack
accessor that does not correctly reflect externally-controlled selection state in a
live browser. The gallery is wired correctly; the spec assertion is correct.

### Failure 2 — bulk action bar not found after Space press (line 243)

Test: "the bulk action bar appears after pressing Space on the select-all checkbox"

Direct cause: the `RisksWithSelection` gallery component renders
`<div role="region" aria-label="Bulk actions">` only when `selectedIds.size > 0`. The
select-all checkbox never became checked (Failure 1), so no rows were selected, so
the region never rendered.

Classification: **(a) product defect** — same root cause as Failure 1.

### Failure 3 — bulk action bar not found after Escape press (line 255)

Test: "Escape clears the selection and hides the bulk action bar"

The `toBeVisible()` pre-assertion for the bulk action bar failed because Failure 1
meant no selection was ever established.

Classification: **(a) product defect** — same root cause.

---

## Fix applied

File: `frontend/components/ui/data-table.tsx`

The `__select__` column's header function was changed from reading
`table.getIsAllPageRowsSelected()` / `table.toggleAllPageRowsSelected()` to computing
state directly from the externally-managed `selection.selected` Set:

- `allSelected = pageRowIds.every(id => selection.selected.has(id))` — pure React
  state, no TanStack intermediary.
- `handleSelectAllChange` adds/removes `pageRowIds` from the Set and calls
  `selection.onChange(next)` directly.

This change is correct regardless of `manualPagination` flag: the displayed rows come
from `table.getRowModel().rows` (which is always `getPaginationRowModel()` → correct
page), and the checked state reflects the canonical external Set that `RisksWithSelection`
manages with `useState`.

---

## Per-page × per-check matrix

Legend: `✓` = covered by a test in this spec · `gap` = missing test · `–` = no gallery
case exists for this page

| Page | 375 px mobile | Screen-reader | Reduced motion | Keyboard | High-density |
|---|---|---|---|---|---|
| risks (governance-risks) | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| QA test-cases (qa-test-cases) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| incidents (incidents) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| decisions (decisions) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| approvals (approvals) | gap | ✓ | ✓ (shared) | ✓ | ✓ |
| budget | – | – | – | – | – |
| incidents-incident (detail) | – | – | – | – | – |
| qa-runs-run (detail) | – | – | – | – | – |
| reports | – | – | – | – | – |

### Notes on coverage claims

**Screen-reader:** The spec runs a loop over all 13 CASES asserting
`getByRole("row").toHaveCount(9)` (8 data rows + 1 header) at 1280x800. This covers
row-level ARIA roles for risks, QA, incidents, decisions, approvals. New tests add the
same assertion individually for QA, incidents, decisions, approvals in the keyboard
describe (confirming real row counts at the interactive viewport).

**Reduced motion:** The reduced-motion describe tests the `loading-governance` shimmer,
paired with a `no-preference` control. All five loading skeletons share the same
`skeleton-shimmer animate-pulse` class and the same `@media (prefers-reduced-motion:
reduce)` CSS rule, so the single paired assertion covers the CSS mechanism for all
pages whose skeleton uses that class. The assertion is not vacuous because the
`no-preference` control proves `animationName` is not `none` without the media query.

**High-density:** A single `no case frame overflows its own width at scale 2` test
iterates over all 13 CASES including QA, incidents, decisions, approvals. The
`qa-test-cases` case additionally has its own rightmost-column-header assertion.

---

## Gaps closed (2026-09-26)

| Gap | Closed by |
|---|---|
| Select-all `aria-checked` never `"true"` | Fix in `data-table.tsx` |
| Bulk action bar assertion (2 tests) | Fixed by same root-cause fix |
| Keyboard: incidents, decisions, approvals had no tests | Added search-focus tests (3) |
| Row ARIA role count: QA, incidents, decisions, approvals | Added per-surface row-count tests (4) |
| Pagination reachability: QA, incidents, decisions, approvals | Added pagination-present tests (4) |
| Mobile layout: QA, incidents, decisions | Added `table` hidden tests (3) |

---

## Remaining gaps

- **approvals mobile:** no test that `table` is hidden at 375px. The approvals case
  uses the same responsive class set (`sm:hidden` mobile cards, `hidden sm:block`
  table) so the behaviour is present, but the assertion is absent.
- **budget, incidents-incident, qa-runs-run, reports:** no gallery cases exist.
  These four pages need their own gallery or their C6 evidence must be provided via
  the shared build-list gallery (if they use the standard `BuildHeaderActions` +
  `BuildListToolbar` + `DataTable` pattern).
- **C6 box:** remains unticked. A fresh serial drain confirming EXIT=0 is required
  before ticking.

---

## F-12 session (2026-09-26) — four new cases + approvals mobile gap

### Surface analysis

**budget** — `ProjectBudgetPage` uses `StatCardGrid` + `DataTable` for member breakdown
but does NOT use `BuildHeaderActions` or `BuildListToolbar`. Needs its own gallery case.

**incidents-incident** — `IncidentDetailPage` is a pure detail page with no `BuildHeaderActions`,
`BuildListToolbar`, or `DataTable`. Key gallery-mountable surface: `IncidentSlaPanel` (purely
prop-driven). `IncidentTimeline`, `IncidentFollowUps`, `IncidentDecisions` all make API calls
and are excluded from the gallery.

**qa-runs-run** — `RunExecutionPage` uses `BuildListToolbar` (with a status filter) and
`DataTable` with `buildResultColumns` + `ResultRow` as the mobile card. Does NOT use
`BuildHeaderActions`. Needs its own gallery case.

**reports** — `ReportsTabs` is entirely chart-based (`ReportsAgileTab`, `ReportsOverviewTab`
both use Recharts + API hooks). The gallery mounts only the `Tabs/TabsList/TabsTrigger`
navigation shell with static h3 headings. The real Recharts charts are not mounted.

**Recharts / reduced-motion note:** The reports page uses Recharts SVG animations which do
NOT respond to `prefers-reduced-motion: reduce` via the shared `skeleton-shimmer` CSS rule.
This parallels FE-108 (`.animate-spin` has no media-query override). The gallery static
placeholders emit no animation, so the chart animation gap cannot be tested via gallery — it
requires a live-browser capture with the real `ReportsAgileTab` mounted. Logged as a
C6 finding; the reports reduced-motion row is marked `gap` in the matrix below.

### Approvals mobile gap

Root cause confirmed: the gallery's `ApprovalsTable` passed no `mobileCard` prop to `DataTable`,
so the table was never hidden at 375px (`hidden sm:block` only applies when a `mobileCard` is
provided). Fix: `renderMobileCard` added to `ApprovalsTable`, passing `BuildMobileCard` with
title, `ApprovalStatusBadge`, requester, and meta (Type, Due).

### New gallery cases added

| Case ID | Component | Mobile card |
|---|---|---|
| `budget-overview` | `BudgetOverview` | `BuildMobileCard` (hours + cost) |
| `incident-detail` | `IncidentDetailCase` | n/a (detail page, no list) |
| `qa-run-execution` | `QaRunExecutionCase` | `ResultRow` |
| `reports-tabs` | `ReportsTabsCase` | n/a (tab navigation + static headings) |

### New spec tests added (governance-qa-a11y.spec.ts)

**ARIA / screen-reader:**
- Budget member table has column headers Member, Hours, Cost
- Incident detail case exposes severity badge text "critical", status "Investigating", and "SLA Status" heading
- QA run result table has column headers TC#, Title, Priority, Status
- Reports case exposes a tablist with "Agile Reports" and "Overview" tab triggers
- Reports agile tab has named h3 headings for Velocity and Burnup chart sections

**Keyboard:**
- Update Budget button in budget case is keyboard reachable
- Edit button in incident detail case is keyboard reachable
- Search input in qa-run-execution case is keyboard reachable
- Agile Reports tab trigger in reports case is keyboard focusable

**375px mobile:**
- approvals list shows mobile cards not a desktop table (closes the gap noted in previous session)
- budget member breakdown shows mobile cards not a desktop table
- qa run execution list shows mobile cards not a desktop table

**High-density / reduced-motion:** All 17 CASES now pass through the overflow loop at
1920×1080 scale 2. Reduced-motion paired assertion remains on `loading-governance` (skeleton
shimmer), covering all list pages. Reports charts have no coverage (see Recharts note above).

---

## Updated per-page × per-check matrix

Legend: `✓` = covered · `gap` = known gap with explanation · `–` = no gallery case

| Page | 375 px mobile | Screen-reader | Reduced motion | Keyboard | High-density |
|---|---|---|---|---|---|
| risks (governance-risks) | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| QA test-cases (qa-test-cases) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| incidents (incidents) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| decisions (decisions) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| approvals (approvals) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| budget (budget-overview) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| incidents-incident (incident-detail) | – | ✓ | ✓ (shared) | ✓ | ✓ |
| qa-runs-run (qa-run-execution) | ✓ | ✓ | ✓ (shared) | ✓ | ✓ |
| reports (reports-tabs) | – | ✓ | gap (Recharts, see note) | ✓ | ✓ |

**Notes on remaining gaps:**

- **incidents-incident 375px mobile:** The detail page has no list/table — there is no
  mobile-card vs table layout to assert. The row is marked `–` (not applicable).
- **reports 375px mobile:** The tab navigation and static heading gallery case has no table
  or list component, so there is nothing to assert about table visibility. Marked `–`.
- **reports reduced motion:** Recharts SVG animations do not use `skeleton-shimmer
  animate-pulse` and are not covered by the shared CSS rule. This gap requires a
  live browser capture with the real chart components mounted and `prefers-reduced-motion`
  set. Registered as a finding parallel to FE-108.
- **C6 box:** remains unticked. A fresh serial drain confirming EXIT=0 is required
  before ticking.
