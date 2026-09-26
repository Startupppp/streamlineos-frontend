# 23 — Deep-import the Build hooks barrel, batch B (remaining callers)

**What to build:** The rest of the Build tree imports hooks by their owning module, finishing what batch A started. After this, the Build hooks barrel has no page-level or feature-level caller and exists only for tests and the rare cross-domain file.

**Blocked by:** None — can start immediately. (Independent of batch A, though sequencing them reduces review churn in a shared working tree.)

**Status:** ready-for-agent

- [ ] No Build feature file imports from the Build hooks barrel
- [ ] Remaining barrel importers are test files only, and that set is recorded
- [ ] No behaviour or rendering changes
