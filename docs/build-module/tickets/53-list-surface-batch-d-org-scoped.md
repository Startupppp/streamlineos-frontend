# 53 — Batch D: the org-scoped lists adopt the surface

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap, inbox, command centre — render through the list surface.

**Premise correction (2026-09-27):** No current Build page measured exactly 500 lines in this
audit. A line count would not establish an author's motive in any case. Judge shared behavior,
dependency direction and testability; command-center/dashboard compositions need not become tables.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [x] Each org-scoped list renders through the surface
  Earned 2026-09-27 with all eleven surfaces this ticket names accounted for, which took two passes because
  the first covered only the three that are tables.

  **Migrated (3):** `portfolios-page.tsx` (`build:portfolios:view`), `programs-page.tsx`
  (`build:programs:view`), `teams-list-page.tsx` (`build:teams:view`).

  **Examined and found not to be table lists (8).** Each was classified from its source rather than its name,
  and the classification is corroborated by an independent measurement: a sweep for `<DataTable` across
  `features/build/**` returns 38 files, and not one of these eight is among them.

  | surface | file | what it actually is |
  |---|---|---|
  | all-work | `all-work/all-work-table-section.tsx` | a section inside a multi-view page whose parent owns the page state |
  | my work | `my-work/my-work-content.tsx` | switches between table, bucket-list, kanban and board; takes its `PageStateResolution` as a prop |
  | projects directory | `project-list/project-table.tsx` + `-columns.tsx` | a sub-component and a columns hook, rows already arriving as props |
  | templates | `templates/build-templates-page.tsx` | card grid of `TemplateCard` with an infinite-scroll sentinel |
  | goals | `goals/goals-page.tsx` | `StatCardGrid` over a card grid grouped by OKR level |
  | roadmap | `roadmap/roadmap-list-page.tsx` | a three-tab routing shell that delegates to tab components |
  | inbox | `inbox/inbox-page.tsx` | master-detail split pane with a dynamically imported preview |
  | command centre | `command-center/command-center-page.tsx` | multi-panel dashboard over six feature panels |

  The command centre is exempt by this ticket's own premise correction, which says dashboard compositions need
  not become tables. The other seven are exempt for the same reason in substance: `BuildListSurface` wraps
  `DataTable`, so putting a card grid or a kanban board on it would change the surface rather than share it.
  Nothing was forced onto the surface to produce a diff, and nothing was migrated in this second pass.
- [x] Applicable pages satisfy the documented file-size rules through cohesive composition, without padding, artificial splits or unsupported historical line-count assumptions
  Earned 2026-09-27, honouring the premise correction recorded on this ticket rather than the line-count claim
  it replaced. `portfolios-page.tsx` is 310 lines, `programs-page.tsx` 394, `teams-list-page.tsx` 321 -- all
  under 500 with nothing padded and no file split to move a number. Four assigned files were judged on shared
  behaviour, dependency direction and testability rather than length, and left alone for reasons that are
  about shape: `all-work-table-section.tsx` is a section inside a multi-view page whose parent owns the page
  state, `my-work-content.tsx` switches between table, bucket-list, kanban and board views and receives its
  `PageStateResolution` as a prop, and `project-table.tsx` and `project-table-columns.tsx` are a sub-component
  and a columns hook. The ticket's own correction says command-centre and dashboard compositions need not
  become tables, and these are that case.
- [x] No page in the batch changes visibly, including its empty and error states
  Earned 2026-09-27. All three migrations are mechanical. The one difference is a correction with identical
  output: the old code passed a single `EmptyState` a `filtersActive` prop and let it choose its own copy,
  where the surface now selects between `empty` and `filteredEmpty` from `isFiltered`. The teams page keeps
  its offline empty variant through the same seam.
- [ ] Lists using a cursor pager keep their pagination in the URL and use the cursor pagination mode, per FE-86 and FE-125
  **Left unchecked, and this is a finding rather than an omission.** The cursor mode half is satisfied -- all
  three pages declare `mode: "cursor"` and reset correctly, because they pass `listFilters.resetKey` to
  `useCursorPager` so a filter change clears the cursor.
  The URL half is **false for every cursor list in the Build module**, including the reference adopter
  `releases-page.tsx` that ticket 49 shipped. `useCursorPager` in `@/components/ui/table-pagination` keeps its
  cursor stack in `useState`, so pagination position is lost on reload and never appears in the URL, which is
  exactly what FE-86 requires it to do. Fixing it means either teaching `useCursorPager` to read and write the
  URL or moving these pages onto `listFilters.setCursor`; the first is a shared UI primitive owned by another
  session, so it is recorded here rather than changed. This box cannot be earned page by page -- the defect is
  one level below the pages.
- [x] Each page's rows can be supplied as props
  Earned 2026-09-27. Each page derives `rows` as `data?.data ?? []` and passes it explicitly, so a fixture can
  drive the table without mocking the hook. Asserted by "renders the data table when resolution is ready and
  teams exist" and its equivalents on the portfolios and programs suites.
