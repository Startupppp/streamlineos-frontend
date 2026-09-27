# 17 — Read the project activity feed by project

**What to build:** Opening a project's activity feed reads only that project's events. Today the query filters by organisation and pushes the project constraint into a join, so the planner scans the organisation's entire event log to assemble one page — the cost grows with every other project in the organisation, not with the project being viewed.

**Blocked by:** 16 — Give the activity log a project column.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** The direct WHERE predicate is source-tested, but ticket 16's missing
writer/backfill coverage means some activity can disappear from this read. Six mock/SQL-structure
tests pass; none establishes a live index range scan or complete multi-page equivalence. Preserve
that narrow evidence without treating it as execution-plan or database-result verification.

- [ ] After ticket 16, compare feed results and ordering across all writer classes and multiple pages, including pre-migration rows; record an application-role query plan before completing the index criterion
  — requires a live database (LANE RULES rule 2). Orchestrator must run as `streamline_app` with tenant GUC set: `EXPLAIN (ANALYZE, BUFFERS) SELECT tal.id FROM build_events.ticket_activity_log tal WHERE tal.org_id = '<org_id>' AND tal.project_id = <project_id> AND tal.id < <cursor_id> ORDER BY tal.id DESC LIMIT 21;` and verify the plan uses `idx_ticket_activity_log_org_project`. Pre-migration rows (backfilled `project_id`) and natively-written rows must both appear.

- [x] The feed query filters on the project column directly
  — `backend/src/modules/build/core/projects-activity-feed.service.ts`: `conditions` array now includes `eq(ticketActivityLog.projectId, projectId)`. The `eq(tickets.projectId, projectId)` condition removed from the `tickets` innerJoin since project scope is now on the log table itself.
- [ ] The query's filter, ordering and cursor are all served by one index range
  — static shape is correct: `idx_ticket_activity_log_org_project (org_id, project_id, id) WHERE project_id IS NOT NULL` covers the seek `(org_id, project_id)`, the cursor range `lt(id, beforeId)`, and the `ORDER BY id DESC` within a single index range. However the actual query plan cannot be verified without a live database (LANE RULES rule 2). At ~1,075 rows the planner may choose a Seq Scan regardless of index shape. Orchestrator must obtain EXPLAIN per the box above before ticking this.
- [ ] The feed returns the same entries in the same order as before
  — cannot be proven without a live database (LANE RULES rule 2). Static evidence: the `tickets` inner join still applies `isNull(tickets.deletedAt)`, sort is `desc(ticketActivityLog.id)` unchanged, and the project filter moved from `eq(tickets.projectId, projectId)` on the join to `eq(ticketActivityLog.projectId, projectId)` in WHERE. Equivalence depends on the backfill being complete (ticket 16 box). Orchestrator must compare page-1 results before and after the deploy against a project with known activity.
- [x] Cursor paging still yields each entry exactly once
  — `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts`: new describe block "ProjectsActivityFeedService — cursor paging yields each entry exactly once (ticket 17)" — 3 passing tests: (1) `nextCursor` encodes the last returned row's `id` as `sortValue` (verified by calling `decodeCursor` on the returned cursor and asserting `sortValue === "9"` when page 1 returns ids [10, 9]); (2) page 2 WHERE clause contains an `id` predicate when a cursor is supplied (AST walk via `hasColumnName`); (3) no id from page 1 ([10, 9]) appears in page 2 ([8, 7]) when the cursor from page 1 is passed. All 9 tests in that file pass. The keyset invariant holds: cursor encodes `id` of last page-1 row; `lt(ticketActivityLog.id, beforeId)` excludes that row and all earlier ones; `buildCursorPage` trims the sentinel so the page boundary row is never returned twice.

**Spec:** `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts` — all 6 tests pass (5 pre-existing + 1 new: "places the project_id filter on the log table column so the org-project-id partial index is the seek path"). The new test walks the Drizzle SQL AST `queryChunks` to assert `project_id` appears as a column name in the WHERE condition.
