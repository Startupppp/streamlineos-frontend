# 14 — Split the assignee filter's OR into a UNION, once

**What to build:** Filtering a board for "unassigned plus these people" uses its index instead of scanning. The predicate currently combines a null check with a subquery membership test under an `OR`, which defeats the index both branches could otherwise use. The same predicate is built independently in the ticket list and the column counts, so fixing one leaves the other wrong — a locality failure as much as a performance one.

BE-81 already requires this: split an `OR` between an indexed predicate and a semi-join into a `UNION`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One shared predicate builder serves both the list and the counts
- [ ] The combined filter is expressed as a union of independently indexable branches
- [ ] Filtering for unassigned plus named people returns the same rows as before
- [ ] A test asserts both call sites use the shared builder, so a future copy cannot drift
- [ ] Do not measure against production; reason from the index definitions
