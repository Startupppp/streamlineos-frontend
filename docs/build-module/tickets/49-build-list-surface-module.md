# 49 — A Build list surface exists, and a list can be rendered without fetching

**What to build:** One module owns the assembly every Build list page repeats. The *pieces* are already extracted and heavily reused — the toolbar at 45 sites, the filter hook at 44, the page-state hook at 152, the cursor pager at 18. What is not extracted is the assembly: branch order, the retry callback, wiring the reset key into the pager, which empty state to show when filters are active, and where the fill panel goes. 73 files restate it, and the cost of getting one input wrong is already visible — two adjacent pages resolve their empty state differently because one passes an is-empty flag and the other does not.

The module takes what differs — read hook, query key, permission key, columns, filter definitions, empty copy — and owns what never differs: gate, toolbar, state branch, table, pager. It must also accept its rows directly, so a list can be rendered from fixtures without a fetch. That second property is what makes both the tests and the visual harness cheap.

Nine things an author must currently get right in order: the permission key matching the route's requirement, which access hook feeds the enabled flag, a stale-time band, a mutation key, forwarding the abort signal, attaching a contract, feeding the reset key to the pager, passing the error to the state hook, and deciding whether is-empty belongs there. Nine remembered steps is nine chances to ship a 402 as "Something went wrong".

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Architecture constraint (2026-09-27):** Start with two genuinely similar cursor-table pages, not all 73 pages. Keep data fetching in a typed page hook/container and make the rendered surface accept parsed rows and explicit state. Do not dynamically invoke a hook supplied as a prop, duplicate query-key ownership, or create one configuration language for boards, editors, charts and detail pages. Use composition for page-specific controls and keep denied/loading/402/error decisions explicit. Batch tickets 50-54 must list compatible adopters and document justified exclusions; a fixed migration count is not a design goal.

- [x] The module owns gate, toolbar, state branch, table and pager, and callers supply only what differs
- [x] A list renders from rows passed as props, with no fetch
- [x] The branch-order test is written once at the module: no-permission, loading, error, 402, empty, filtered-empty, rows
- [x] Two pages adopt it with no visible change, one of them a page that currently has no test
  Fully earned 2026-09-27. `releases-page.tsx` and `change-requests-page.tsx` supply the first adopter
  pair (pre-existing tests pass unchanged). `approvals/project-approvals-page.tsx` supplies the
  "no prior test" half: it had zero tests before this session. It now renders through `BuildListSurface`
  and has 10 new tests (`project-approvals-page.test.tsx`, all passing). The migration removes the
  manual `usePageState` + `PageState` + `DataTable` assembly and replaces it with `BuildListSurface`;
  the permission key (`build:approvals:view`), columns, `empty` copy ("No approvals yet"), and
  `filteredEmpty` copy ("No approvals match your filters") are each covered by at least one paired
  positive/negative assertion. One pre-migration behavioral difference is noted: the old page called
  `usePageState` without `isEmpty`, so the `PageState.empty` slot was never reached and the empty
  state was never shown. The migration fixes this as a side-effect; that correction is observable
  but is not a regression — it is the correct behavior the surface enforces.

  **"No visible change" was not true when this migration was first written, and the box is ticked only
  because the gap was closed rather than accepted.** The first pass dropped three capabilities the old
  `DataTable` call site had: `minWidth="720px"`, `isLoading={isFetchingNextPage}` (the in-table
  next-page indicator), and `selection.isRowSelectable` — the last replaced by omitting `selection`
  entirely when the viewer lacks `build:approvals:manage`, which removes the whole checkbox column
  instead of making its rows unselectable. All three already existed on `DataTable`; the surface simply
  did not forward them. It now does, via `minWidth`, `isFetchingMore` and `selection.isRowSelectable`,
  and the page passes all three again. `isFetchingMore` is deliberately not named `isLoading`: on the
  surface `isLoading` means the initial load and drives the skeleton, so forwarding a next-page fetch
  into it would replace the table with a skeleton on every page turn.

  The prop set was widened once, from measurement rather than anticipation: across the 38 Build files
  that render a `DataTable`, the props actually passed are `minWidth` (26 call sites), `isLoading` (27),
  `selection` (21), `onRowClick` (9), `footer` (5), `rowClassName` (3) and `sortState` (2). All are now
  forwarded. `emptyState` is deliberately **not** forwarded — the surface owns the empty branch through
  `PageState`, which is the defect this module exists to fix.
- [x] A 402 surfaces as the upgrade path per FE-41, and pagination state stays in the URL per FE-86
- [x] Query keys come from the single factory per FE-18
- [x] The two adopters retain their domain-specific interactions and focused integration tests; shared state tests do not replace tests that each page wires the right permission, contract, filters and actions
