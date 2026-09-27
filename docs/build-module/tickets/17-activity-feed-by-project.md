# 17 — Read the project activity feed by project

**What to build:** Opening a project's activity feed reads only that project's events. Today the query filters by organisation and pushes the project constraint into a join, so the planner scans the organisation's entire event log to assemble one page — the cost grows with every other project in the organisation, not with the project being viewed.

**Blocked by:** 16 — Give the activity log a project column.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** The direct WHERE predicate is source-tested, but ticket 16's missing
writer/backfill coverage means some activity can disappear from this read. Six mock/SQL-structure
tests pass; none establishes a live index range scan or complete multi-page equivalence. Preserve
that narrow evidence without treating it as execution-plan or database-result verification.

- [x] After ticket 16, compare feed results and ordering across all writer classes and multiple pages, including pre-migration rows; record an application-role query plan before completing the index criterion
  Earned 2026-09-27 on a real database. Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay2`, built by a cold replay of the journal (1005 of 1009 entries; the 4 that fail are Knowledge Base and belong to another session). No production data, no production host.
  `src/modules/build/core/ticket-17-activity-feed-plan.db.spec.ts` (2 tests, both pass) plants rows for **all eight writer actions** (`created`, `status_changed`, `assignee_changed`, `due_date_changed`, `estimate_changed`, `priority_changed`, `cycle_changed`, `type_changed`) plus one row inserted with a NULL `project_id` and then backfilled, which is what stands in for a pre-migration row. It pages the real `getProjectActivity` at limit 5: page 1 returns 5 rows in descending id order with `hasMore=true`, page 2 returns the remaining 4 with `hasMore=false` and **no overlap** between pages. A backfilled row appearing on neither page is the specific failure this catches, and it does not occur.
  The application-role plan the box requires before the index criterion is recorded under box 2 below.
  — requires a live database (LANE RULES rule 2). Orchestrator must run as `streamline_app` with tenant GUC set: `EXPLAIN (ANALYZE, BUFFERS) SELECT tal.id FROM build_events.ticket_activity_log tal WHERE tal.org_id = '<org_id>' AND tal.project_id = <project_id> AND tal.id < <cursor_id> ORDER BY tal.id DESC LIMIT 21;` and verify the plan uses `idx_ticket_activity_log_org_project`. Pre-migration rows (backfilled `project_id`) and natively-written rows must both appear. DB proof spec: `backend/src/modules/build/core/ticket-17-activity-feed-plan.db.spec.ts`; run with `ALLOW_DESTRUCTIVE_DB_TESTS=1 DATABASE_URL=postgresql://...@127.0.0.1:5432/scratch npx jest --config backend/jest-db.json --runInBand --testPathPattern="ticket-17-activity-feed-plan.db"`. The claim for box 2 is "the index can serve it" (demonstrated via `SET enable_seqscan = off`), not "the planner chooses it" — at 1075 rows the planner prefers a seq scan even when the index is available.

- [x] The feed query filters on the project column directly
  — `backend/src/modules/build/core/projects-activity-feed.service.ts`: `conditions` array now includes `eq(ticketActivityLog.projectId, projectId)`. The `eq(tickets.projectId, projectId)` condition removed from the `tickets` innerJoin since project scope is now on the log table itself.
- [x] The query's filter, ordering and cursor are all served by one index range
  Earned 2026-09-27 from a measured plan, as `streamline_app` under the tenant GUC (BE-76), reporting buffers rather than milliseconds (BE-77). 20,200 activity rows across 20 projects, the target project holding about 5% of them.
  ```
  Limit (actual rows=21) Buffers: shared hit=19
    One-Time Filter: (current_org_id() = 'org-plan-17'::text)
    ->  Index Only Scan Backward using idx_ticket_activity_log_org_project
          Index Cond: ((org_id = 'org-plan-17') AND (project_id = 10) AND (id < 30314))
          Buffers: shared hit=7
  ```
  All three parts of the box are in that single `Index Cond`: the filter (`org_id`, `project_id`), the ordering (a backward scan on `id`), and the cursor (`id < 30314`). There is **no `Sort` node and no heap `Filter` line**, and it is an **Index Only Scan** -- so the RLS qual did not force a heap fetch, because `org_id` sits inside the index, which is what BE-79 asks for. The tenant predicate appears as a `One-Time Filter`, evaluated once rather than per row.
  This is the **planner's own choice** with `enable_seqscan = on`, which is the stronger of the two claims available; forcing `enable_seqscan = off` selects the same index at 4 buffers.
  **Recorded because it qualifies the result:** with a *non-selective* filter -- a single project holding every row -- the planner instead picks `ticket_activity_log_pkey` and applies `org_id` and `project_id` as a heap `Filter`, which is *not* one index range. The index earns its place because production has 10 projects, not one; a measurement against a single-project fixture would have reported the opposite and been useless.
  — static shape is correct: `idx_ticket_activity_log_org_project (org_id, project_id, id) WHERE project_id IS NOT NULL` covers the seek `(org_id, project_id)`, the cursor range `lt(id, beforeId)`, and the `ORDER BY id DESC` within a single index range. However the actual query plan cannot be verified without a live database (LANE RULES rule 2). At ~1,075 rows the planner may choose a Seq Scan regardless of index shape. Orchestrator must obtain EXPLAIN per the box above before ticking this.
- [x] The feed returns the same entries in the same order as before
  Earned 2026-09-27 by the same spec as box 1. Across two pages the feed returned every planted row exactly once, in strict descending id order, with no duplicate and no omission -- including the backfilled row that carried a NULL `project_id` at insert time. Ordering is unchanged because the project predicate was added to the `WHERE` clause and the `ORDER BY id DESC` cursor was not touched; the plan above confirms the index supplies that order rather than a `Sort` re-imposing it.
  — cannot be proven without a live database (LANE RULES rule 2). Static evidence: the `tickets` inner join still applies `isNull(tickets.deletedAt)`, sort is `desc(ticketActivityLog.id)` unchanged, and the project filter moved from `eq(tickets.projectId, projectId)` on the join to `eq(ticketActivityLog.projectId, projectId)` in WHERE. Equivalence depends on the backfill being complete (ticket 16 box). Orchestrator must compare page-1 results before and after the deploy against a project with known activity.
- [x] Cursor paging still yields each entry exactly once
  — `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts`: new describe block "ProjectsActivityFeedService — cursor paging yields each entry exactly once (ticket 17)" — 3 passing tests: (1) `nextCursor` encodes the last returned row's `id` as `sortValue` (verified by calling `decodeCursor` on the returned cursor and asserting `sortValue === "9"` when page 1 returns ids [10, 9]); (2) page 2 WHERE clause contains an `id` predicate when a cursor is supplied (AST walk via `hasColumnName`); (3) no id from page 1 ([10, 9]) appears in page 2 ([8, 7]) when the cursor from page 1 is passed. All 9 tests in that file pass. The keyset invariant holds: cursor encodes `id` of last page-1 row; `lt(ticketActivityLog.id, beforeId)` excludes that row and all earlier ones; `buildCursorPage` trims the sentinel so the page boundary row is never returned twice.

**Spec:** `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts` — all 6 tests pass (5 pre-existing + 1 new: "places the project_id filter on the log table column so the org-project-id partial index is the seek path"). The new test walks the Drizzle SQL AST `queryChunks` to assert `project_id` appears as a column name in the WHERE condition.
