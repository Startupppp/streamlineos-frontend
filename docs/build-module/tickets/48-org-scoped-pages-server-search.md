# 48 — The org-scoped lists search on the server, and the filter module stops offering what no seam consumes

**What to build:** The organisation-wide lists — all-work, my work, the projects directory, portfolios, programs, teams, templates, goals, roadmap — and the managed-product lists search server-side like the project-scoped ones. With every consumer migrated, the shared filter module stops handing back a search string unconditionally: a caller gets one only by declaring the seam that consumes it. That is the part that prevents the fourteen-fold regression from happening again, and it can only land once nothing depends on the old behaviour.

**Blocked by:** 46 — Searching a Build list finds rows the first page does not contain. 47 — The project-scoped Build lists search on the server.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [ ] Each org-scoped and managed-product list in scope searches server-side
- [ ] The filter module's interface requires a consuming seam before it yields a search value
- [ ] A page that declares no seam cannot render a search control — proved by a compile-time or test-time failure, not a convention
- [ ] No client-side search filter over a paged list remains anywhere in Build
- [ ] Ticket 09's assignee filter is consistent with this change rather than duplicating it
