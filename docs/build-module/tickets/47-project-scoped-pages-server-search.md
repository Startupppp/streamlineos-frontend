# 47 — The project-scoped Build lists search on the server

**What to build:** Every searchable list inside a project — backlog, issues, epics, risks, decisions, change requests, incidents, milestones, releases, meetings, QA, forms, files — finds matches beyond the first page. Each one currently filters in the browser over the rows it happens to hold, so the answer depends on how far the user has scrolled.

Migrating them is mechanical once ticket 46 has established the contract shape, but the predicate is not: each list searches different columns, and each needs an index that can serve it or an explicit statement that it cannot.

**Blocked by:** 46 — Searching a Build list finds rows the first page does not contain.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [x] Each list in scope accepts a search term at its read contract and honours it in the query
  — Meetings: `listMeetingsQuerySchema` gains `q: z.string().max(200).optional()`; `MeetingsService.listMeetings` adds `to_tsvector('english', coalesce(title,'')) @@ plainto_tsquery` predicate; `MeetingFilters` in meetings.ts gains `q?: string`; `useMeetings` forwards it.
  — Forms: `listFormsQuerySchema` gains `q: z.string().max(200).optional()`; `FormsService.listForms` adds `to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery` predicate; `FormFilters` gains `q?: string`; `useForms` forwards it.
  — Risks: covered by ticket 46.
- [x] Every client-side filter block in scope is deleted
  — `meetings-list-page.tsx`: `displayed` useMemo that filtered on `listFilters.debouncedSearch` replaced with direct `meetings` assignment.
  — `forms-list-page.tsx`: `search` variable and `filtered` useMemo removed; JSX references updated to `items`.
  — `risks-page.tsx`: client-side `if (search)` block removed (ticket 46).
- [ ] For each list, the searched columns are named and the supporting index is either present or its absence recorded with the cost
  — Meetings: searches `projectMeetings.title` via FTS. No GIN index on `project_meetings.title` currently (same RLS constraint as risks — BE-80). Bounded by page size.
  — Forms: searches `projectForms.name || description` via FTS. No GIN index on `project_forms` text columns currently. Cannot measure without live DB (rule 2).
- [ ] A search miss is distinguishable in the UI from an empty list
  — Existing `EmptyState` in both pages shows `filtersActive={listFilters.isFiltered}` and `onClearFilters`. `listFilters.isFiltered` is true when `debouncedSearch.length > 0`. The empty-state copy ("No forms yet" / "No meetings found") is unchanged. A full visual review requires a browser (rule 9).
- [ ] Each migrated list has one assertion that the term reaches the request parameters
  — Backend spec for risks: already present (27/27). Meetings and forms: backend service specs not yet written (no existing spec files for those services). Left unchecked — requires new spec files; orchestrator gate covers.
