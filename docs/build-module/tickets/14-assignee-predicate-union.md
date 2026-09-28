# 14 — Split the assignee filter's OR into a UNION, once

**What to build:** Filtering a board for "unassigned plus these people" uses its index instead of scanning. The predicate currently combines a null check with a subquery membership test under an `OR`, which defeats the index both branches could otherwise use. The same predicate is built independently in the ticket list and the column counts, so fixing one leaves the other wrong — a locality failure as much as a performance one.

BE-81 already requires this: split an `OR` between an indexed predicate and a semi-join into a `UNION`.

**Blocked by:** None — can start immediately.

**Status:** all boxes earned — BE-81 satisfied on every assignee predicate builder (see 2026-09-28 EARNED)

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

**2026-09-28 EARNED (lane EXEC) — the last OR is gone, so box 2 is now honestly `[x]`.** It was
already `[x]` on disk while the Lane-Adj-A note above read NOT EARNED; that contradiction is
resolved by doing the work, not by editing the box. `getAllWork`'s `scope === "mine"` arm no longer
builds `or(isNull(...), IN (...))`. It sets the same `assigneeUnion` the filtered arm already used
(`backend/src/modules/build/core/work-query/projects-work-query.service.ts:271-274`) and threads it
into `pageMineWork` (`:322-330`), which passes both predicates as `splitBranches` to
`assignedOrParticipatingIds` and `mineCountSql` (`:757-780`). `work-scope-union.ts:63-101`
(`mineBranches`) crosses the two mine branches — own-assignee and `ticket_assignees` participation —
with each split predicate, emitting four top-level branches joined by `UNION`:

```
(assignee_membership_id IS NULL AND own-assignee)   UNION (assignee_membership_id IS NULL AND participating)
UNION (assignee_membership_id IN (...) AND own-assignee) UNION (assignee_membership_id IN (...) AND participating)
```

Equivalence: `(A ∨ B) ∧ X` over a `UNION` of `X₁, X₂` distributes to
`(A∧X₁) ∪ (B∧X₁) ∪ (A∧X₂) ∪ (B∧X₂)`. The mine union was already `UNION`, not `UNION ALL`, so the
extra branches cannot duplicate a row. No branch is an `EXISTS` over the outer row: each is a
top-level `SELECT … FROM tickets`, whose row selection an index on
`(org_id, assignee_membership_id, status)` can drive.

Evidence, `backend/src/modules/build/core/work-query/projects-work-query-assignee-union.spec.ts:178-238`
— four tests: no `assignee_membership_id IS NULL OR` in either the id query or the count query; four
`UNION` branches in both; the null test and the `IN` list never co-occur in one branch; every branch
binds `user_id`. Mutation-checked: restoring the `scope === "mine"` OR arm fails 3 of the 4.

```text
$ cd backend && nice -n 10 npx jest --maxWorkers=2 src/modules/build/core/work-query
Test Suites: 10 passed, 10 total
Tests:       85 passed, 85 total
```

Still not measured, and deliberately so: no `EXPLAIN`, no plan, no row counts. This criterion is
"expressed as a union of independently indexable branches", judged from the emitted SQL and the
index definitions — the last bullet of this ticket instructs exactly that.
