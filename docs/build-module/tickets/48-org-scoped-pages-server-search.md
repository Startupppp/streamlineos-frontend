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
  — Risks, meetings, forms client-side filters deleted. Other Build lists (decisions, backlog, QA, incidents, milestones, releases, files, change requests) not in this lane's scope. Not fully verified.
- [x] Ticket 09's assignee filter is consistent with this change rather than duplicating it
  — `AssigneeFilterSubmenu` owns its own search state, debounces at 300ms, calls `useBuildMembers({ search: debouncedSearch })` server-side. No client-side `.filter()` applied to the list. Consistent with the server-search pattern.
