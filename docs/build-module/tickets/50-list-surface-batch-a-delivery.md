# 50 — Batch A: the project delivery lists adopt the surface

**What to build:** The delivery lists inside a project — backlog, issues, epics, milestones, releases, triage, workload — render through the list surface. Each keeps its columns, its query key and its permission key; everything else comes from the module. Behaviour is unchanged, which is the point: this batch is green on its own because the pieces it replaces still exist for the pages not yet migrated.

Batched by blast radius so each batch fits one fresh context window. Land them in any order relative to the other batches.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each page in the batch renders through the surface and declares only columns, key, permission, filters and empty copy
- [ ] Each page's own test shrinks to those declarations; the branch behaviour is inherited
- [ ] No page in the batch changes visibly, including its empty and error states
- [ ] Any page that was resolving its empty state differently now matches the module's rule, and the difference is called out in the commit
- [ ] Files in the batch that exceeded 500 lines drop below it, per FE-57
