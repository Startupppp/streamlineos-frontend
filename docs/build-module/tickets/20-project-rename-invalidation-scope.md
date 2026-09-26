# 20 — Stop a project rename from refetching the whole board

**What to build:** Renaming a project, or editing its description, no longer causes every mounted ticket query to refetch. The update currently issues a targeted set of invalidations and then also invalidates a prefix that sits above every query in the module, so all loaded board pages refetch and the board visibly flashes — even though no ticket data changed.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Renaming a project invalidates project metadata and membership, not ticket collections
- [ ] The board does not refetch or flash on a project rename
- [ ] Project detail and the project list still update immediately
- [ ] A test asserts no ticket-collection query is invalidated by a project metadata update
