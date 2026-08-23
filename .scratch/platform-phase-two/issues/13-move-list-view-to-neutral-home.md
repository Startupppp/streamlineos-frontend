# 13 — Give the list-view module an address any module can reach

**What to build:** Move the filter machinery out of Build and rename its public surface off ticket vocabulary.

The module is good. It is also invisible: files outside Build importing any part of it number **zero**, and the only two importers live in Build's own views folder. A well-built module filed under a product name is invisible to exactly the search that would want it — nobody looking for a shared list abstraction searches inside a product module, which is why the architecture review's first pass recommended building one from scratch.

By this point the type layer is open (ticket 08), so this is relocation and naming. Build's imports change path; nothing else in Build changes.

**Blocked by:** 08 — Filters take a description of what a page filters by.

**Status:** ready-for-agent

- [ ] The machinery lives in a shared location named for lists rather than for a product module, following the repository's kebab-case file and folder convention.
- [ ] No exported name mentions tickets, sprints, cycles or projects.
- [ ] Build's imports change path and nothing else in Build changes.
- [ ] The fence from ticket 03 passes unchanged.
- [ ] The module **composes** the existing shared table, table pagination, cursor page controls, search input, filter pill and page wrapper primitives rather than reimplementing any of them. If it ends up reimplementing one, the boundary is drawn in the wrong place and that is worth stopping for.
- [ ] Build's list screens behave identically — verified by running them.
- [ ] Nothing is left behind at the old location. A moved surface deletes its old home rather than re-exporting from it.
