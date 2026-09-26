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
