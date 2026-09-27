# 51 — Batch B: the project governance lists adopt the surface

**What to build:** The governance lists inside a project — risks, decisions, change requests, incidents, approvals, QA runs, forms, meetings — render through the list surface. Same contract as batch A: columns, key, permission, filters, empty copy, nothing else.

This batch holds the page the review singled out: a 545-line risks page with no test at all, because proving it shows a no-permission state rather than an empty list currently means mounting it with mocked access, mocked queries, a router and animation. After migration that proof is inherited.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [x] Each page in the batch renders through the surface
  Earned 2026-09-27 across two lanes, because this ticket names eleven surfaces. Ten now render through
  `BuildListSurface`: `governance/risks-page.tsx`, `governance/decisions-page.tsx`, `incidents/incidents-page.tsx`,
  `meetings/meetings-list-page.tsx`, `forms/forms-list-page.tsx`, `forms/components/form-submissions-tab.tsx`,
  `approvals/approvals-inbox-page.tsx`, `qa/test-runs-tab.tsx`, `qa/test-cases-tab.tsx` and the inner results
  table of `qa/runs/run-execution-page.tsx`.
  `incidents/incident-follow-ups.tsx` is deliberately not migrated and it is not a page: it is a sub-component
  handed `canManage: boolean` and `actions: IncidentFollowUpAction[]` by its parent. The surface takes a
  `PermissionKey` and runs its own access check, so putting it there would mean checking a permission a second
  time in a component that has already been told the answer.
  One nesting hazard was checked rather than waved through: `qa/runs/run-execution-page.tsx` keeps an outer
  `usePageState` with three early returns, so the surface's inner page state can only ever resolve to `empty`
  or `ready` -- a denial cannot render inside a permitted shell. `qa-page.tsx`, the parent of the two tabs,
  has no `PageState` of its own, so the tabs carry no double gate either. `run-execution-page` also mutates
  rows in place as a tester works, and it passes `isLoading={false}` explicitly rather than the mutation's
  `isPending`, so an inline result edit cannot replace the table with a skeleton.
- [x] The risks page gains a test, and it is short because the branches are the module's
  Earned 2026-09-27. `governance/risks-page.test.tsx` is new: **294 lines, 9 tests, all passing.** The ticket
  singled this page out because proving it shows a no-permission state rather than an empty list previously
  meant mounting 535 lines with mocked access, mocked queries, a router and animation. The new suite asserts
  the page's own declarations and inherits the ladder, so access-loading, denied, loading, error, the 402
  upgrade path, ready, empty and filtered-empty all fit in under 300 lines.
  Its neighbour `risks-page-aggregates.test.tsx` was red after the migration and is now green (4 tests). That
  suite is the load-bearing one: it pins that the stat tiles and the risk matrix keep describing the whole
  register when a status filter narrows the server-filtered rows. It was failing on a stale mock rather than
  on the migration, and was repaired without touching a single assertion.
- [ ] No page in the batch changes visibly, including its empty and error states
  **Left unchecked deliberately, for one page.** Nine of the ten migrations are mechanical and the rendered
  output is unchanged; the empty-state split from one `EmptyState` carrying `filtersActive` into the surface's
  `empty` and `filteredEmpty` produces identical copy in both branches.
  `forms/forms-list-page.tsx` is the exception: it gated its own toolbar with `filters={isReady ? toolbar :
  undefined}`, so the filter bar vanished for anyone whose access was still resolving. That is an FE-40
  violation that pre-dated this ticket, the migration removed it, and the toolbar is now visible as soon as
  access resolves. It is a visible change, so this box cannot be honestly ticked -- and putting the bug back
  to earn the tick would be the wrong trade.
- [x] Each page's rows can be supplied as props, so its fixtures are shareable
  Earned 2026-09-27, checked per page rather than claimed for the batch. All ten migrated surfaces feed a
  plain array into the surface's `rows` prop: `risks`, `displayed`, `displayed`, `meetings`, `items`, `items`,
  `filteredItems` and the three QA collections. Seven of them flatten infinite-query pages first, so what the
  surface receives is an array and not an `InfiniteData`. `incident-follow-ups.tsx` already took its rows as
  a prop before this ticket and still does.
- [ ] Files in the batch that exceeded 500 lines drop below it, per FE-57
  **Left unchecked: measured, and two files in the batch are still above 500.** Before -> after:
  `risks-page.tsx` **535 -> 524**, `incident-follow-ups.tsx` **558 -> 558** (not migrated, see box 1),
  `decisions-page.tsx` 391 -> 385, `incidents-page.tsx` 387 -> 381, `meetings-list-page.tsx` 465 -> 457,
  `forms-list-page.tsx` 259 -> 239, `form-submissions-tab.tsx` 323 -> 308, `approvals-inbox-page.tsx` 418 -> 411,
  `test-runs-tab.tsx` 422 -> 415, `test-cases-tab.tsx` 348 -> 342, `run-execution-page.tsx` 483 -> 499.
  Adopting the surface reclaims about ten lines per page, which is not enough to bring the risks page under
  the threshold: that needs the risk matrix, the stat tiles or the bulk bar extracted into siblings, which is
  a separate change from adopting a list surface.
  `run-execution-page.tsx` **grew** 483 -> 499 and is recorded here rather than presented as a pass. Its first
  draft landed at exactly 500 and a prop was trimmed to reach 499. A file that ends one line under a
  shrink-only threshold after a refactor meant to simplify it should be read as unfinished, not as compliant.
