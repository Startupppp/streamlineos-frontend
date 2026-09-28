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

**Box 2 unticked 2026-09-27.** It was marked `[x]` while this ticket's own correction above
states "the union criterion is not met", its **Status** line reads "BE-81 not satisfied", and
its **What remains** section describes the top-level `UNION ALL` rewrite as still outstanding.
The three statements cannot all be true. The box is the one that was wrong, so it is now `[ ]`:
a ticked box that contradicts its own evidence is worse than an unchecked one, because it reads
as proof to the next person. Nothing regressed — this corrects the record, it does not undo work.
The remaining criterion is unchanged and still sequenced after ticket 04, because a keyset cursor
over a union needs its ordering and boundary applied to the combined result rather than per branch.

One premise in the paragraph above is now stale, though it does not change the deferral. A local
PostgreSQL 18 on `127.0.0.1` with full-chain replay databases does exist, so "every connection
string points at production" is no longer true and an `EXPLAIN` is now physically possible. It
would still not settle this criterion: the replays hold **zero rows**, so the planner would choose
from default statistics and the resulting plan would say nothing about which branch wins on real
data. Measuring this honestly needs a seeded dataset, not merely a reachable database.

**2026-09-28 NOT EARNED (Lane-Adj-A) — OR survives in `getAllWork`.** Read every assignee predicate builder. `buildAssigneeFilter` (`backend/src/modules/build/core/tickets/assignee-filter.ts:8`) returns `{ kind: "union" }` when both unassigned and named IDs are requested; `listTicketsByCursor` consumes that result as a top-level `UNION ALL` at `projects-tickets-read.service.ts:309`; `getColumnCounts` does likewise at `:431`; `personCountByProjectAndStatusSql` (`projects-work-query.service.ts:81`) and `assignedOrParticipatingIds` (`work-scope-union.ts:57`) also use top-level UNIONs. The remaining blocker: `getAllWork` at `backend/src/modules/build/core/work-query/projects-work-query.service.ts:265` uses `or(isNull(tickets.assigneeMembershipId), sql\`… IN …\`)` for the unassigned-plus-named case — an OR, not a union. That path was not converted. Criterion cannot be earned until `getAllWork` is rewritten to a top-level `UNION ALL`.
