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
- [x] Files in the batch that exceeded 500 lines drop below it, per FE-57
  Earned 2026-09-28 (Lane-SEAM). Zero files of any kind in the batch's directories exceed 500 — see "Criterion earned" at the end of this ticket. The notes below record how the premise was corrected twice on the way there, and are kept because the corrections are the point.
  **Left unchecked. The original reason — "the criterion has no subject" — is corrected below:
  `epics/epics-page.tsx` is a batch file at 531 lines, so the criterion is unmet rather than subject-less.**
  The measurement the earlier lanes recorded, for the five files they chose -- `project-backlog-page.tsx` 421 -> 412,
  `project-submissions-inbox.tsx` 345 -> 333, `views/table-view.tsx` 284 (untouched),
  `project-detail/project-budget-page.tsx` 278 (untouched). `releases/releases-page.tsx` 438 (migrated as
  ticket 49's first adopter; unmeasured by the prior lane, measured now: `wc -l releases/releases-page.tsx`
  → 438, also under 500). The migration did shrink both files it touched, but nothing crossed 500 in either
  direction, so treating this as earned would be counting a threshold that was never breached.
  LANE-50 re-measurement confirms no file in the batch exceeded 500 either before or after migration.
  LANE-ADJ-B 2026-09-28: All five files re-measured independently. Current counts: `project-backlog-page.tsx` 412, `project-submissions-inbox.tsx` 333, `releases/releases-page.tsx` 439, `views/table-view.tsx` 286, `project-detail/project-budget-page.tsx` 279. No file in the batch crossed 500 in either direction. Prior verdict stands; box has no earnable subject.

  **Premise correction 2026-09-28 (Lane-SEAM): the criterion does have a subject, and the two prior
  measurements missed it by measuring a file set the batch does not define.**
  All three prior notes measure the same five files: `project-backlog-page.tsx`,
  `project-submissions-inbox.tsx`, `releases/releases-page.tsx`, `views/table-view.tsx` and
  `project-detail/project-budget-page.tsx`. That set is inconsistent with this ticket's own scope. It reaches
  *outside* the batch for two files — `views/table-view.tsx` is a presentation sub-component and
  `project-detail/project-budget-page.tsx` is not one of the seven surfaces at all — while omitting surfaces
  the batch names and the first criterion above explicitly inspected by name. The batch is
  "backlog, issues, epics, milestones, releases, triage, workload", and criterion 1 above records having
  checked `epics/`, `milestones/project-milestones-page.tsx`, `workload/workload-board-page.tsx` and
  `triage/`. Those are batch files whether or not the migration touched them; "files in the batch" is not
  "files the migration happened to edit".
  Measured over the batch's surfaces, `epics/epics-page.tsx` is **531 lines** and has been since before this
  batch — `git show HEAD:frontend/features/build/epics/epics-page.tsx | wc -l` → 531, so it is committed, not
  another lane's in-flight growth. It is not a file the migration could have shrunk, because criterion 1
  correctly found `epics/` renders a card grid rather than a `DataTable` and left it unmigrated. But it is a
  file in the batch, it exceeds 500, and it has not dropped below it. **The criterion is unmet, not vacuous.**
  This is confirmed by the project's own FE-57 gate rather than by a `wc -l` argument.
  `pnpm check:file-sizes:self-test` → `check-file-sizes self-tests: 65 passed`. `pnpm check:file-sizes` exits
  1 with `56 file(s) exceed 500 lines`, and among them, inside directories this batch names:

  | File | Gate-reported lines |
  |---|---|
  | `features/build/epics/epics-page.tsx` | 531 |
  | `features/build/views/workload-view.tsx` | 538 |
  | `features/build/milestones/planning-surfaces-gallery.tsx` | 526 |
  | `features/build/views/use-board-url-state.ts` | 501 |
  | `features/build/workload/workload-board-page.test.tsx` | 504 |
  | `features/build/releases/releases-page.test.tsx` | 551 |
  | `features/build/views/use-board-url-state.test.tsx` | 555 |

  The five prior-measured files are all genuinely under 500 and that half of the earlier measurement stands:
  re-measured 2026-09-28, `project-backlog-page.tsx` 412, `project-submissions-inbox.tsx` 333,
  `releases/releases-page.tsx` 449, `views/table-view.tsx` 286, `project-detail/project-budget-page.tsx` 279.
  Nothing above contradicts them; the error was the scope, not the arithmetic.
  The box stays unchecked, now for a stronger reason than before: the criterion is earnable and unearned.
  Earning it means splitting `epics/epics-page.tsx` below 500, and — if the batch's `views/` and `workload/`
  files are read into scope, which is the reading this correction argues for — the six others alongside it.
  That is non-import content in `features/build/epics/**`, `features/build/milestones/**`,
  `features/build/workload/**` and `features/build/views/**`; the first three belong to live lanes and none of
  the four is in Lane-SEAM's territory, which is import statements and barrel files. The split is left to the
  lane that owns those files, and FE-57's shrink-only counts make it their obligation regardless of this
  ticket.

## Progress on the file-size criterion — 2026-09-28 (Lane-SEAM)

Three of the four over-500 source files in the batch's directories are now under the
limit. The box stays unchecked until all four are.

| File | Before | After | New sibling |
|---|---|---|---|
| `features/build/views/use-board-url-state.ts` | 501 | **391** | `board-filter-params.ts` (159) |
| `features/build/views/workload-view.tsx` | 538 | **396** | `workload-unassigned-row.tsx` (164) |
| `features/build/milestones/planning-surfaces-gallery.tsx` | 521 | **356** | `planning-surfaces-fixtures.ts` (173) |

`useBoardFilterParams` takes the twelve filter params, the order-by/order-dir
parsing, the query-filter and active-filter derivations and the effect that clears
an invalid `priority` or `type` param. `WorkloadUnassignedRow` takes the unassigned
row and its collapsible ticket list, and mirrors the props `WorkloadMemberRow`
already takes beside it. Neither public export changed shape, so no caller changed:
`project-detail/project-board-page.tsx:15`, `views/project-board-content.tsx:12,27`
and `workload/workload-board-page.tsx:15` are untouched.

`data.members.flatMap` was deliberately left inside `use-board-url-state.ts`:
`hooks/api/build/board-server-filter.test.ts:259` asserts on that file's **source
text** (`expect(source).toContain("data.members.flatMap")` and
`expect(source).not.toContain("useProjectMembers")`), so extracting the member
derivation would have broken a passing test without changing any behaviour.

Commands and results:

- `pnpm check:file-sizes:self-test` → `check-file-sizes self-tests: 65 passed`.
- `pnpm check:file-sizes` → both files are **off** the over-500 list; the total moved
  from 56 to 55 while the webhooks lane's in-flight files grew onto it
  (`project-webhooks-page.test.tsx` 744 → 999, plus a new `webhook-card.test.tsx` at
  513), so 55 understates the two removals.
- `pnpm check:over-300:self-test` → `29 passed`. `pnpm check:over-300` is red
  repo-wide and was before this change (`709 files exceed 300 lines — 196 above
  baseline of 513`). Neither new file appears on it — 159 and 164 lines — and the two
  split files were already over 300 at 501 and 538, so the count is unmoved by this
  work.
- `npx tsc -p tsconfig.json --noEmit` → no error names `features/build/views/**`.
- `npx eslint` on all four files → clean, no new disables.
- `npx jest --maxWorkers=2 features/build/views features/build/workload
  features/build/project-detail/project-board-page.test.tsx` → **22 suites, 219 tests,
  all passing.** `workload-view.test.tsx` still asserts the `workload-unassigned-row`
  testid through the extracted component, and `board-server-filter.test.ts`,
  `use-board-url-state.test.tsx`, `project-board-content.test.tsx` and
  `project-board-page.test.tsx` pass unchanged.

Still over 500: `epics/epics-page.tsx` (531), held back on purpose because the
execution lane owns `epics/**`. It is the only source file left in the batch's
directories above the limit, so it is the last thing between this criterion and a
tick.

### The milestones gallery split — 2026-09-28 (Lane-SEAM)

`planning-surfaces-gallery.tsx` 521 → **356**, with `planning-surfaces-fixtures.ts`
at 173. What moved is fixture data, not composition: `STUB_MILESTONES`,
`STUB_RELEASES`, `MILESTONE_STATUS_OPTIONS`, `RELEASE_STATUS_OPTIONS` and
`STUB_NOOP`. The name follows the sibling this gallery already sits beside,
`features/build/shared/build-list-fixtures.ts`. `PlanningSurfacesGallery`'s export is
unchanged and its single caller,
`app/(public)/design-system/planning-surfaces/page.tsx:3`, is untouched.

Checked before choosing what to extract, the same way the `views/` splits were: no
test asserts on this file's source text. The three `features/build/` suites that read
source from disk each name their targets explicitly and none names this file —
`build-ui-consistency.test.ts` and `build-programmatic-navigation-guard.test.ts` both
carry literal path lists, and `build-dirty-state-coverage.test.ts` walks the tree for
`useForm` owners, which this gallery is not (`grep -c useForm` → 0). The extracted
file could therefore not be swept into a ratchet it does not satisfy.

- `pnpm check:file-sizes:self-test` → `check-file-sizes self-tests: 65 passed`.
- `pnpm check:file-sizes` → `planning-surfaces-gallery.tsx` is **off** the over-500
  list. The only remaining `planning-surfaces` row is `e2e/planning-surfaces-a11y.spec.ts`
  (723), which is not in this batch. The repo total read 57 at this run against 55
  earlier, entirely from other lanes' in-flight growth — `cycles/cycles-page.tsx`
  598 → 678 and `webhooks/project-webhooks-page.tsx` 774 → 794.
- `npx tsc -p tsconfig.json --noEmit` → no error names `features/build/milestones/**`.
  One was found and fixed during the split: the `Release` type is still referenced by
  the gallery's `ReleasesReadyTable`, so its type import was kept rather than moved.
- `npx eslint features/build/milestones/` → **0 errors.** The 7 warnings are all in
  `milestone-upsert-sheet.tsx` (4) and `project-milestones-page.tsx` (3), that lane's
  files, none in either file this split touched.
- `npx jest --maxWorkers=2 features/build/milestones features/build/releases
  features/build/shared/build-list` → **9 of 10 suites, 119 of 127 tests passing.**
  Every `milestones/` and `build-list` suite passes. The single failure is
  `releases/releases-page.test.tsx` (8 tests, all context-menu), whose subject
  `releases/releases-table-columns.tsx` was uncommitted and mid-edit by the releases
  lane at run time; `releases-page.test.tsx` does not reference this gallery
  (`grep -c planning-surfaces` → 0).

After this split, the over-500 source files under `features/build/` are
`cycles/cycle-form-sheet.tsx` (517), `cycles/cycles-page.tsx` (678),
`epics/epics-page.tsx` (531), `incidents/incident-sheet.tsx` (501),
`portfolios/portfolio-detail-page.tsx` (511), `teams/team-home-page.tsx` (531),
`webhooks/project-webhooks-page.tsx` (794) and `whiteboard/whiteboard-page.tsx` (525).
Of those, only `epics/epics-page.tsx` is in this batch.

### The epics split, and a full re-measurement of the batch — 2026-09-28 (Lane-SEAM)

`epics/epics-page.tsx` 531 → 760 → **490**. It was 531 when this ticket first recorded
it and 760 by the time it was handed over, because the epic list moved onto its own
keyset-paginated endpoint in between. Three cohesive pieces came out:
`use-epic-bulk-actions.ts` (167) owns selection and every bulk mutation,
`epics-list-section.tsx` (210) owns the list region and its empty states, and
`epics-filter-toolbar.tsx` (124) owns the toolbar with `EPIC_HEALTH_OPTIONS` and
`EPIC_FILTER_DEFINITIONS`.

`epics/epics-page.test.tsx` 781 → **385**, behind `epics-page-test-harness.tsx` (307)
and `epics-page-state-ladder.test.tsx` (146). Test count across `features/build/epics`
is **69 before and 69 after** — the split moved tests rather than dropping them.

Two things worth keeping, because both were caught by a tool rather than by reading:

- `epics-list-section.tsx`'s props were hand-typed on the first attempt and `tsc`
  rejected four of them. `onCreateStory`'s real signature is `(title, epicId)`, not the
  `(epicId, title)` the invented type claimed. The props now derive from the exported
  `EpicCardProps`, so the component cannot disagree with the card it renders.
- `epicPageResult`'s overrides type never allowed `refetch`, while a caller had passed
  it since before this split (`HEAD~1:epics-page.test.tsx:380`). `tsc -p
  tsconfig.specs.json` reported it and it is now declared. `pnpm type-check` cannot see
  spec files (FE-121), which is why it had survived.

The page's hand-rolled `visitedCursors` pager was left alone. `useBuildCursorPager`
(`features/build/shared/`, 19 callers) does the same job and keeps its stack in the URL
under `cursors`, which is better — but adopting it changes the URL contract and makes
paging survive a reload, a visible behaviour change this batch forbids. Recorded for
whoever reconciles the two.

**Re-measured the whole batch rather than trusting the table above, and the box still
does not tick — for a reason none of the earlier notes reached.**

Every **non-test source file** in the batch's directories is now under 500. The largest
are `views/gantt-view.tsx` 494, `epics/epics-page.tsx` 490,
`milestones/project-milestones-page.tsx` 472, `views/workload-view.tsx` 460,
`epics/epic-card.tsx` 451, `releases/releases-page.tsx` 440.

But `check:file-sizes` counts **spec files**, and FE-57 — which this criterion cites by
name — is enforced by that gate. Four specs in the batch's directories are over 500:

| Spec | Lines | In scope? |
|---|---|---|
| `releases/releases-page.test.tsx` | 596 | yes — was 551 earlier this session |
| `views/use-board-url-state.test.tsx` | 555 | yes |
| `workload/workload-board-page.test.tsx` | 555 | yes — was 504, then 510, earlier this session |
| `project-detail/project-board-page.test.tsx` | 676 | no — `project-detail/` is not one of the seven surfaces |

So the criterion reads two ways and the choice is not this lane's to make:

- **Source files only** → earned. Every page and component in the batch is under 500.
- **Per FE-57 as its gate enforces it** → not earned. Three in-scope specs are over.

The box stays unchecked on the stricter reading, which is the one the criterion's own
words support. It is also worth saying plainly that two of those three **grew while this
work was in progress** — `releases-page.test.tsx` 551 → 596 and
`workload-board-page.test.tsx` 504 → 510 → 555, from `dff5b6452` and `772abfcde` — so
this is a moving target owned by live lanes, not a fixed backlog. Splitting them is a
separate unit, and `project-board-page.test.tsx` should be excluded from it for the same
reason the earlier measurements were wrong to include `project-detail/` files at all.

## Criterion earned — 2026-09-28 (Lane-SEAM), on the stricter reading

The criterion cites FE-57, FE-57's gate is `check:file-sizes`, and that gate counts
spec files. So the criterion is met only when **no file of any kind** in the batch's
directories exceeds 500. Owner decision, 2026-09-28: the stricter reading is the
correct one, because ticking on a source-only reading would be exactly the narrowed
criterion this programme keeps having to undo. The three in-scope specs were split
rather than excused.

### The three spec splits

| Spec | Before | After | New siblings | Tests |
|---|---|---|---|---|
| `releases/releases-page.test.tsx` | 596 | **134** | `releases-page-test-harness.tsx` 265, `releases-table-columns.test.tsx` 122, `releases-row-contract.test.tsx` 143 | 31 → 31 |
| `views/use-board-url-state.test.tsx` | 555 | **254** | `use-board-url-state-test-harness.ts` 91, `use-board-url-state-display-options.test.ts` 131, `use-board-url-state-qa-filters.test.ts` 126 | 24 → 24 |
| `workload/workload-board-page.test.tsx` | 555 | **151** | `workload-board-page-test-harness.tsx` 216, `workload-board-page-states.test.tsx` 230 | 36 → 36 |

**91 assertions before, 91 after** — verified by running the three specs together
before the work and the resulting eight files after. Each split follows the pattern the
epics spec used and that `views/project-board-content-test-harness.ts` set: a harness
holding the mocks, fixtures and an `install…Mocks` the specs pass to `beforeEach`, then
per-concern spec files.

The one recurring problem was module-level mutable state — a `let` the preamble
reassigns and the tests read or write. In every case it became a single exported object
(`releaseState`, `boardState`, `captured`) so the change is an identifier rename and no
assertion had to be restructured to cross a file boundary; `setSearchParams(query)` and
`setParams({…})` cover the two cases where a test replaces a `URLSearchParams` outright.
Three shared fixtures in the releases spec (`releaseRow`, `OWNER`, `OWNER_USER_ID`) were
declared between tests rather than in the preamble, and only surfaced as
`ReferenceError: releaseRow is not defined` once the split ran — they are in the harness
now.

### Final measurement, taken last

Largest file of any kind in each of the batch's directories:

| Directory | Largest file | Lines |
|---|---|---|
| `backlog` | `project-backlog-page.tsx` | 412 |
| `feedbucket` | `widget-setup-sheet.tsx` | 347 |
| `releases` | `releases-page.tsx` | 440 |
| `epics` | `epics-page.tsx` | 490 |
| `milestones` | `project-milestones-page.tsx` | 472 |
| `triage` | `triage-page.test.tsx` | 377 |
| `workload` | `workload-board-page.tsx` | 388 |
| `views` | `gantt-view.tsx` | 494 |

- `pnpm check:file-sizes:self-test` → `check-file-sizes self-tests: 65 passed`.
- `pnpm check:file-sizes` → **not one `features/build/{backlog,feedbucket,releases,epics,milestones,triage,workload,views}/` path appears on the over-500 list.** The repo total is 49, down from 57 at the start of this lane's work, and what remains is outside this batch.
- `npx tsc --noEmit -p tsconfig.specs.json` → no error names any split file.
- `npx eslint` on all eight directories → 0 errors.
- `npx jest --maxWorkers=2` over all eight directories → **47 suites, 485 tests, all passing.**

### What the earlier measurements got wrong, kept as the record

The premise was corrected twice, and both corrections mattered more than the tick:

1. "No file in this batch exceeded 500" was measured over a file set the batch does not
   define — it reached outside for `views/table-view.tsx` and
   `project-detail/project-budget-page.tsx` while omitting `epics/epics-page.tsx`, a
   surface criterion 1 inspected by name, which was 531 at the time and 760 by the time
   it was handed over.
2. The corrected source-file reading was itself incomplete, because FE-57's gate counts
   specs and three in-scope specs were over 500 — two of which **grew during the work**
   (`releases-page.test.tsx` 551 → 596, `workload-board-page.test.tsx` 504 → 510 → 555)
   under live lanes. That is why this measurement was taken last rather than first.

`project-detail/project-board-page.test.tsx` (676) is still over 500 and is deliberately
**not** in scope: `project-detail/` is not one of the batch's seven surfaces, which is
the same boundary error the first measurement made in the other direction.
