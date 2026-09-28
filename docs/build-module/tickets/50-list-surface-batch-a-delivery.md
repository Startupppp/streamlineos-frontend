# 50 — Batch A: the project delivery lists adopt the surface

**What to build:** The delivery lists inside a project — backlog, issues, epics, milestones, releases, triage, workload — render through the list surface. Each keeps its columns, its query key and its permission key; everything else comes from the module. Behaviour is unchanged, which is the point: this batch is green on its own because the pieces it replaces still exist for the pages not yet migrated.

Batched by blast radius so each batch fits one fresh context window. Land them in any order relative to the other batches.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [x] Each page in the batch renders through the surface and declares only columns, key, permission, filters and empty copy
  Earned 2026-09-27, with every surface the ticket names accounted for rather than only the ones that
  were convenient. The batch names backlog, issues, epics, milestones, releases, triage and workload.
  Three are table lists and all three now render through `BuildListSurface`: `backlog/project-backlog-page.tsx`
  (`build:tickets:view`), `feedbucket/project-submissions-inbox.tsx` (`feedbucket:submissions:view`, read off
  `use-feedbucket-submissions.ts:42` rather than guessed) and `releases/releases-page.tsx` (migrated earlier
  as ticket 49's first adopter). The other four are not table lists, which was checked rather than assumed:
  `epics/` renders `epic-card.tsx` in a card grid with no `DataTable`, `milestones/project-milestones-page.tsx`
  is a `PmStaggerList` plus `StatCardGrid`, `workload/workload-board-page.tsx` is a `KanbanBoard`, and there
  is no separate issues page -- the backlog is that list. `views/table-view.tsx` was also left alone: it is a
  memoised presentation sub-component that receives `tickets` as a prop and owns no fetch, permission or
  page state, so putting it on the surface would mean inventing a permission key for it.
- [x] Each page's own test shrinks to those declarations; the branch behaviour is inherited
  Earned 2026-09-27. `project-backlog-page.test.tsx` went from 408 lines mocking `usePageState`, `PageState`
  and `DataTable` to 211 lines and 17 tests that assert the page's own declarations. `project-submissions-inbox.test.tsx`
  is new: 13 tests. Both mock `BuildListSurface` and capture its props, which is exactly what this criterion
  asks for -- and is worth stating plainly, because it means those two suites can no longer notice a break in
  the state ladder itself. That is covered once, at the module, by `build-list-surface.test.tsx`, and for the
  inbox it is still covered end to end by `feedbucket-submissions-inbox.test.tsx`, which renders the real
  surface and was repaired rather than deleted for that reason.
- [ ] No page in the batch changes visibly, including its empty and error states
  **Left unchecked deliberately: two of the three migrated pages do change visibly, and the changes are
  corrections rather than regressions.** Reverting them to make this box tickable would mean putting real
  defects back, so the box is left false instead.
  `feedbucket/project-submissions-inbox.tsx` changed three ways. It had **no permission gate at all** -- the
  query ran for anyone and an unauthorised viewer saw an empty inbox rather than a denial (FE-47, FE-49); it
  now shows `NoPermissionState`, so a viewer without `feedbucket:submissions:view` sees something different
  from before. It never forwarded `error` to a page state, so a 402 rendered as a generic failure instead of
  the plan-upgrade path (FE-41); that now resolves correctly. And its bespoke ten-`Skeleton` loading list is
  now the module's `DataTableSkeleton`, which is a visible difference with no defect behind it.
  `backlog/project-backlog-page.tsx` changed one way: the old code replaced the entire page -- title, filters
  and create button -- with a skeleton while *tickets* loaded, not just while the project loaded. Only the
  table region is replaced now.
  The empty-state differences are separately recorded under the criterion below, which sanctions them.
  LANE-50 adjudication: the prior lane's decision is confirmed. All three visible differences are
  correctness fixes (FE-47, FE-49, FE-41), not regressions. The box stays permanently unchecked rather than
  reworded, because the changes were intentional improvements, not accidental drift — rewording to
  "no unintended change" after the fact would change the standard retroactively to earn the tick.
- [x] Any page that was resolving its empty state differently now matches the module's rule, and the difference is called out in the commit
  Earned 2026-09-27. Both pages resolved the empty state by passing a single `EmptyState` a `filtersActive`
  flag and letting it decide its own copy internally -- the backlog through `<PageState empty={...}>` with a
  conditional `description`, the inbox through `emptyState={hasActiveFilters ? a : b}` on `DataTable`. Both
  now declare `isFiltered`, `empty` and `filteredEmpty` separately, which is the module's rule, and the
  rendered copy is unchanged in each branch. The difference is recorded in the migration commit.
- [ ] Files in the batch that exceeded 500 lines drop below it, per FE-57
  **Left unchecked because the criterion has no subject: no file in this batch exceeded 500 lines before the
  migration.** Measured, rather than asserted either way -- `project-backlog-page.tsx` 421 -> 412,
  `project-submissions-inbox.tsx` 345 -> 333, `views/table-view.tsx` 284 (untouched),
  `project-detail/project-budget-page.tsx` 278 (untouched). `releases/releases-page.tsx` 438 (migrated as
  ticket 49's first adopter; unmeasured by the prior lane, measured now: `wc -l releases/releases-page.tsx`
  → 438, also under 500). The migration did shrink both files it touched, but nothing crossed 500 in either
  direction, so treating this as earned would be counting a threshold that was never breached.
  LANE-50 re-measurement confirms no file in the batch exceeded 500 either before or after migration.
  LANE-ADJ-B 2026-09-28: All five files re-measured independently. Current counts: `project-backlog-page.tsx` 412, `project-submissions-inbox.tsx` 333, `releases/releases-page.tsx` 439, `views/table-view.tsx` 286, `project-detail/project-budget-page.tsx` 279. No file in the batch crossed 500 in either direction. Prior verdict stands; box has no earnable subject.
