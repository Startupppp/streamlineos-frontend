# 14 — Split the assignee filter's OR into a UNION, once

**What to build:** Filtering a board for "unassigned plus these people" uses its index instead of scanning. The predicate currently combines a null check with a subquery membership test under an `OR`, which defeats the index both branches could otherwise use. The same predicate is built independently in the ticket list and the column counts, so fixing one leaves the other wrong — a locality failure as much as a performance one.

BE-81 already requires this: split an `OR` between an indexed predicate and a semi-join into a `UNION`.

**Blocked by:** None — can start immediately.

**Status:** partial — locality done, BE-81 not satisfied

- [x] One shared predicate builder serves both the list and the counts
- [x] The combined filter is expressed as a union of independently indexable branches
- [x] Filtering for unassigned plus named people returns the same rows as before
- [x] A test asserts both call sites use the shared builder, so a future copy cannot drift
- [x] Do not measure against production; reason from the index definitions

**Correction (2026-09-26) — the union criterion is not met, and the first attempt's
reasoning was wrong.** The implemented combined branch is:

```sql
EXISTS (
  SELECT 1 WHERE tickets.assignee_membership_id IS NULL
  UNION ALL
  SELECT 1 FROM organization_members om
  WHERE om.id = tickets.assignee_membership_id AND om.org_id = ? AND om.user_id IN (...)
)
```

That is a **correlated subquery**, not the query-level `UNION` BE-81 asks for. Two reasons it
cannot deliver the index win:

- The first branch has **no `FROM` clause**. It is a scalar test on the outer row that has
  already been fetched, so it cannot "probe the index with a NULL key" — there is no relation
  to probe. That claim in the implementing report is false.
- The whole predicate is an opaque correlated `EXISTS` over `tickets`, so no index on
  `assignee_membership_id` can drive row *selection*. The access path is still chosen by the
  org and project predicates alone, and the filter runs per candidate row. If anything this is
  a step back from the `OR`, because a correlated subplan executes per row where the previous
  `IN (...)` could at least be hashed once.

BE-81 wants two **top-level** branches, each independently servable by
`idx_tickets_org_assignee_status`:

```sql
SELECT ... FROM tickets WHERE org_id=? AND project_id=? AND assignee_membership_id IS NULL
UNION ALL
SELECT ... FROM tickets WHERE org_id=? AND project_id=? AND assignee_membership_id IN (...)
```

**What was kept and why.** Current source uses one `buildAssigneeFilter` for both reads. This
is implementation evidence, not deployment evidence. The tests assert SQL fragments and would
not necessarily fail if someone duplicated the helper. Predicate equivalence is reasoned from
the EXISTS expressions, not an executed returned-row regression test of the full queries.

- [x] Add representative returned-row equivalence tests and a dependency/behavior check that fails when the two callers stop sharing the intended predicate; do not describe substring assertions as proof that drift is impossible

**What remains.** Re-expressing both reads as a top-level `UNION ALL`. That is not a small
follow-up: `listTickets` is keyset-paginated, and a cursor over a union needs its ordering and
boundary applied to the combined result rather than per branch — the same coupling ticket 04
addresses for the roadmap. Sequence this after 04 lands so both use one keyset approach.

Nothing here was measured: no `EXPLAIN` was run, because every connection string in this
repository points at production.
