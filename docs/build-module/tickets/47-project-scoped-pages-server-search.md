# 47 — The project-scoped Build lists search on the server

**What to build:** Every searchable list inside a project — backlog, issues, epics, risks, decisions, change requests, incidents, milestones, releases, meetings, QA, forms, files — finds matches beyond the first page. Each one currently filters in the browser over the rows it happens to hold, so the answer depends on how far the user has scrolled.

Migrating them is mechanical once ticket 46 has established the contract shape, but the predicate is not: each list searches different columns, and each needs an index that can serve it or an explicit statement that it cannot.

**Blocked by:** 46 — Searching a Build list finds rows the first page does not contain.

**Status:** ready-for-agent

- [ ] Each list in scope accepts a search term at its read contract and honours it in the query
- [ ] Every client-side filter block in scope is deleted
- [ ] For each list, the searched columns are named and the supporting index is either present or its absence recorded with the cost
- [ ] A search miss is distinguishable in the UI from an empty list
- [ ] Each migrated list has one assertion that the term reaches the request parameters
