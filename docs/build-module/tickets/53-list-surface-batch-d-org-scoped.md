# 53 — Batch D: the org-scoped lists adopt the surface

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap, inbox, command centre — render through the list surface.

**Premise correction (2026-09-27):** No current Build page measured exactly 500 lines in this
audit. A line count would not establish an author's motive in any case. Judge shared behavior,
dependency direction and testability; command-center/dashboard compositions need not become tables.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each org-scoped list renders through the surface
  **Left unchecked: three of the eleven surfaces this ticket names are migrated.** Done:
  `portfolios-page.tsx` (`build:portfolios:view`), `programs-page.tsx` (`build:programs:view`),
  `teams-list-page.tsx` (`build:teams:view`). Judged not to be table lists and left alone with reasons
  recorded under the criterion below: all-work, my work and the projects directory.
  **Not yet examined at all: templates, goals, roadmap, inbox and the command centre.** They were outside the
  files this lane held, so nothing is claimed about them either way -- they are neither migrated nor shown to
  be unsuitable, and that is the honest state of this box.
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
