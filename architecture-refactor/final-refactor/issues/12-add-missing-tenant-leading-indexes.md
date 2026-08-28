# 12: Add the missing tenant-leading indexes

**What to build:** Candidate resume and Finance item queries can satisfy tenant predicates from leading organization indexes at production-shaped volume.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] All four currently failing tenant tables have indexes matching their real filters and sorts.
- [ ] The tenant-index structural check reports zero failures.
- [ ] Query plans under the application role and tenant context meet declared read budgets.
- [ ] Migration is journaled, lock-bounded and verified in the catalog.
