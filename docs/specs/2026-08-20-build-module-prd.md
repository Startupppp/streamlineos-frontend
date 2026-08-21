# PRD — Build module: make the scoped read cheap and correct

Status: ready-for-agent
Date: 2026-08-20
Scope: the Build module (projects, tickets, sprints, QA, product management)
Evidence: measured against 200,001 tickets as `streamline_app` under RLS with the tenant GUC set

## Problem Statement

Build is well organised. 186 files, 26,224 lines, seventeen sub-modules nested by domain, and **not one file over the 500-line limit**. The ticket table carries fifteen indexes, most of them tenant-leading composites with partial predicates. Where those indexes match the query, performance is excellent: the project-scoped ticket list returns in **1.2ms reading 25 buffers** on a 200,001-row table.

The problem is narrow and specific: **two queries do not match any index, and one of them is also wrong.**

For a member opening a project board, the scoped ticket list reads roughly **723 MB per page view**. Not because the table is large — the project in question holds 3,335 tickets — but because the permission clause asks the database a question no index can answer, and the pagination count then asks it a second time.

For a member opening My Work, the list is silently incomplete. A hard cap of 500 participation rows is applied with no ordering, so anyone working across more than 500 tickets sees an arbitrary and unstable subset, with nothing in the interface indicating that rows are missing. One seeded user participates on 42,857 tickets.

For a developer, `GET /build/anything` returns `400 Validation failed (numeric string is expected)` rather than a 404, because a numeric route parameter sits at the module root and swallows every sibling path.

None of this is visible in typechecks, tests, or code review. It surfaces only under `EXPLAIN` against a populated organisation, as the RLS-enforced role.

## Solution

Three changes, none of them structural.

**Make the permission clause answerable.** Constrain the participation subquery to the same project the outer query is already filtered by, so the database stops hashing a user's entire organisation-wide participation set to filter one project.

**Make My Work complete.** Replace the unordered 500-row cap with a bounded, ordered lookup that returns a correct page and reports honestly when more exists.

**Make unknown Build paths 404.** Constrain the project parameter so a non-numeric segment does not match it.

The module keeps its shape. No new tables, no new indexes, no restructuring.

## Goals

- The scoped ticket read stops scanning; page cost becomes proportional to the page, not to the user's participation history.
- My Work returns a correct, ordered, complete-or-honestly-truncated result.
- Unknown paths under the module return 404.
- No regression to the project-scoped list, which is already excellent.

## Non-Goals

- Restructuring the module. It is already compliant with the layout rules and under the size limits.
- Adding indexes. Three were trialled and measured; all were rejected (see Appendix A).
- Introducing a participation relation. Measurement showed the fix is in the query, not the schema.
- Partitioning the ticket table. It is 234 MB; the row-count trigger has not been reached.
- Changing the Build Postgres schema arrangement (see Further Notes).

## User Stories

1. As a member, I want a project board to open quickly, so that I can start work without waiting.
2. As a member, I want My Work to show every item assigned to me, so that I do not miss work.
3. As a member, I want My Work to be ordered predictably, so that the same items appear in the same place each visit.
4. As a member working across many projects, I want My Work to remain correct, so that scale does not silently degrade my view.
5. As a member, I want to be told when a list is truncated, so that I know to filter rather than assume I have seen everything.
6. As a member with restricted scope, I want to see exactly the tickets I am entitled to, so that the scoping is accurate as well as fast.
7. As a project lead, I want ticket counts on a board to be correct, so that pagination and totals can be trusted.
8. As a project lead, I want board performance to hold as a project grows, so that success does not degrade the product.
9. As an organisation owner, I want ticket reads to stay tenant-isolated, so that scope changes never widen visibility.
10. As an organisation owner, I want database cost to scale with usage rather than with history, so that the bill stays predictable.
11. As a developer, I want an unknown Build URL to return 404, so that I can tell a missing route from a bad parameter.
12. As a developer, I want to add a new path under the module without it being shadowed, so that the namespace stays open.
13. As a developer, I want the permission clause expressed so that it can be indexed, so that the next scope change does not reintroduce a scan.
14. As a developer, I want a regression test that fails if the scoped read starts scanning again, so that the fix cannot silently rot.
15. As a security reviewer, I want the participation lookup filtered by organisation in the query as well as by policy, so that isolation does not rest on a single mechanism.
16. As a security reviewer, I want scope resolution to remain server-side, so that a client cannot widen its own view.
17. As an operator, I want these changes to require no migration, so that they ship without a maintenance window.
18. As an operator, I want the improvement measured in buffers rather than milliseconds, so that a warm cache cannot disguise a regression.

## Implementation Decisions

**Constrain the participation subquery by project.** The project-scoped read already filters on `project_id`. The `EXISTS` over the participation table does not, so the planner builds a hash of every participation row the user has in the organisation — measured at 42,857 rows and 42,937 buffers — in order to filter 2,858 project rows. Adding the same project constraint to the subquery makes it proportional to the project.

**Add the tenant predicate to the participation lookup.** It currently filters on user alone and relies on row-level security to supply the tenant restriction. The policy does catch it, so this is defence in depth rather than a live defect — but the house rule is that application predicates and policy both apply.

**Replace the My Work cap with an ordered, bounded read.** The current lookup takes 500 participation rows with no `ORDER BY`, then feeds them into the main query as an id list. It must instead order by the same key the final result is ordered by, take one more row than the page needs, and report whether more exists. A cap that silently changes results is worse than a smaller cap that admits it.

**Report truncation rather than hiding it.** Where a bound is applied, the response says so, and the interface can offer filtering. A silent cap reads as "this is everything."

**Constrain the project route parameter to digits.** A non-numeric segment then fails to match and falls through to a 404, which both fixes the misleading error and reopens the namespace for future paths.

**No new indexes.** Three were created, measured and reverted. Their failure is documented in Appendix A so the next person does not repeat the experiment.

**Measure in buffers, as the application role, with the tenant GUC.** The owner role holds `BYPASSRLS` and its plans hide exactly the costs that matter. Wall-clock time is not the metric: one rejected index was 1.8× faster in wall-clock while doing 7.3× more I/O, because the data was cache-resident.

## Testing Decisions

**A good test here asserts what the caller receives and what the database was asked to do** — not how the query is composed. The query shape is precisely what this work changes.

**Correctness, at the controller seam.** This is the highest available seam and the codebase has extensive prior art in controller end-to-end specs.
- A member sees every ticket they are assigned, report, or participate in — and no others.
- A member participating in more tickets than the page bound still receives a correct first page, correctly ordered.
- Where a bound is applied, the response indicates it.
- Pagination totals agree with the rows returned.
- Cross-tenant isolation: a ticket or project id from another organisation returns not-found, never forbidden.
- Scope allow and deny for each of `all`, `team`, `own` and `none`.
- An unknown path under the module returns 404, not 400.

**Cost, as a regression guard.** A test asserts the scoped read stays under an agreed buffer ceiling on a seeded organisation. This is the only test that would have caught the original defect, and the only one that will catch its return. It measures buffers, not milliseconds.

**Two traps already hit in this repository.** A transaction mock must invoke its callback, or assertions inside it never run. End-to-end specs are excluded from the default test run, so adding a case there is not the same as adding executed coverage.

## Out of Scope

- The Person Directory seam, which has its own spec.
- The module access ladder, which has its own PRD.
- Chat, notifications and calendar work.
- Any change to the fifteen existing ticket indexes, which are well matched to the queries they serve.
- Full-text ticket search, which already has an index-backed helper.

## Further Notes

**What is healthy, and should not be touched.** The project-scoped list is 1.2ms and 25 buffers on 200,001 rows — the partial `(org_id, project_id, rank) WHERE deleted_at IS NULL` index does exactly its job. Row-level security failed closed with `42501` the moment a query ran without the tenant GUC. Seventeen sub-modules, no file over the size limit, zero circular dependencies. This module has been built carefully; the defects are two query shapes, not the design.

**Appendix A — three indexes, measured and rejected.** Recorded so the experiment is not repeated.

| Attempt | Result |
|---|---|
| `(org_id, assignee_id, created_at DESC)` and `(org_id, reporter_id, created_at DESC)` | No change on the OR: 14,994 buffers versus 14,883. The planner used the `org_id` prefix only, pulled all 200,001 rows and applied the OR as a heap filter. |
| Rewriting the OR as `UNION ALL` | No change: 14,895 buffers. The cost is concentrated in one branch, so merging the branches does not help. |
| Denormalising the ticket timestamp onto the participation row, plus `(org_id, user_id, ticket_created_at DESC)` | **Actively harmful.** 46,282 buffers versus 6,338 without it — 7.3× worse. It converted a batched bitmap scan into 42,857 random heap fetches. It appeared 1.8× *faster* because the pages were cached. |

A fourth observation: the existing `(org_id, assignee_id, due_date) WHERE status <> 'DONE'` index cannot serve My Work, because that query does not filter on status and a partial index is invisible to a query omitting its predicate.

**Appendix B — the measurements.** All as `streamline_app`, RLS enforced, tenant GUC set.

| Query | Time | Buffers |
|---|---|---|
| Project-scoped list, ranked | 1.2ms | 25 |
| Pagination count, project-scoped | 21.0ms | 104 |
| **Scoped read (OR), project-scoped, 3,335-ticket project** | **60.4ms** | **46,282** |
| **Its pagination count** | **44.6ms** | **46,282** |
| Participation subquery alone | 136.9ms | 42,937 |

The scoped read and its count together are roughly 92,500 buffers, about 723 MB, per page view.
