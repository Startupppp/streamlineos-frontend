# 51 — Batch B: the project governance lists adopt the surface

**What to build:** The governance lists inside a project — risks, decisions, change requests, incidents, approvals, QA runs, forms, meetings — render through the list surface. Same contract as batch A: columns, key, permission, filters, empty copy, nothing else.

This batch holds the page the review singled out: a 545-line risks page with no test at all, because proving it shows a no-permission state rather than an empty list currently means mounting it with mocked access, mocked queries, a router and animation. After migration that proof is inherited.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [ ] Each page in the batch renders through the surface
- [ ] The risks page gains a test, and it is short because the branches are the module's
- [ ] No page in the batch changes visibly, including its empty and error states
- [ ] Each page's rows can be supplied as props, so its fixtures are shareable
- [ ] Files in the batch that exceeded 500 lines drop below it, per FE-57
