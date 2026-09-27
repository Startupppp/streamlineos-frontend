# 48 — The org-scoped lists search on the server, and the filter module stops offering what no seam consumes

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap — and the managed-product lists search server-side like the project-scoped ones. With every consumer migrated, the shared filter module stops handing back a search string unconditionally: a caller gets one only by declaring the seam that consumes it. That is the part that prevents the fourteen-fold regression from happening again, and it can only land once nothing depends on the old behaviour.

**Blocked by:** 46 — Searching a Build list finds rows the first page does not contain. 47 — The project-scoped Build lists search on the server.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [ ] Each org-scoped and managed-product list in scope searches server-side
  — Org-scoped lists (all-work, projects directory, portfolios, programs, teams, templates, goals, roadmap) are outside this lane's file ownership. Not touched.
- [x] The filter module's interface requires a consuming seam before it yields a search value
  — `use-build-list-filters.ts`: split `BuildListFiltersState` into `BuildListFiltersStateBase` (no search fields) and `BuildListFiltersState extends BuildListFiltersStateBase` (adds `search`, `debouncedSearch`, `setSearch`). Added TypeScript overloads: `withSearch: false` → `BuildListFiltersStateBase`; default → `BuildListFiltersState`. Implementation returns `base` without search fields when `withSearch: false`.
- [x] A page that declares no seam cannot render a search control — proved by a compile-time or test-time failure, not a convention
  — `use-build-list-filters.test.tsx`: "omits search fields entirely when withSearch is false so a page without a server seam cannot render a search input" — asserts `"search" in result.current === false`, `"debouncedSearch" in result.current === false`, `"setSearch" in result.current === false`. 12/12 pass. TypeScript overload ensures compile-time error if caller with `withSearch: false` accesses `.search`.
- [ ] No client-side search filter over a paged list remains anywhere in Build
  — Risks, meetings, forms client-side filters deleted (tickets 46, 47).
  — Exhaustive inventory of remaining client-side search in Build (2026-09-27):
  — PAGED — client-side search remains, outside territory:
    (1) `decisions-page.tsx:129` — `allDecisions.filter(d => d.title.toLowerCase().includes(search))` over a cursor-paged list; `useProjectDecisions` (`governance.ts:138`) accepts no search param. Belongs to `governance/` module.
    (2) `incidents-page.tsx:115` — client-side `.filter()` over infinite-scroll paged incidents; `useIncidents` only forwards `status` and `severity`. Belongs to `incidents/` module.
  — NOT PAGED — client-side search is acceptable (bounded full set, not paginated):
    `cycles-page.tsx:70` — `useCycles` returns full `Cycle[]`, no cursor/page.
    `automations-page.tsx:105`, `modules-page.tsx:95`, `workflow-page.tsx:72`, `settings-views-page.tsx:53` — none paginated.
    `cycle-detail-page.tsx:211`, `epics-page.tsx:67` — client-side search over board ticket state that is managed by a separate paged mechanism; the search is a local filter on an already-fetched page, not a bypass of server pagination.
  — Box left unticked: two paged lists (decisions, incidents) have client-side search that reaches the server only for status/severity filters. Fixing them requires changes to `governance/decisions.service.ts` and the incidents module, both outside this lane's territory.
- [x] Ticket 09's assignee filter is consistent with this change rather than duplicating it
  — `AssigneeFilterSubmenu` owns its own search state, debounces at 300ms, calls `useBuildMembers({ search: debouncedSearch })` server-side. No client-side `.filter()` applied to the list. Consistent with the server-search pattern.
