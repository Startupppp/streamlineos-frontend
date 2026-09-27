# 17 — Read the project activity feed by project

**What to build:** Opening a project's activity feed reads only that project's events. Today the query filters by organisation and pushes the project constraint into a join, so the planner scans the organisation's entire event log to assemble one page — the cost grows with every other project in the organisation, not with the project being viewed.

**Blocked by:** 16 — Give the activity log a project column.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** The direct WHERE predicate is source-tested, but ticket 16's missing
writer/backfill coverage means some activity can disappear from this read. Six mock/SQL-structure
tests pass; none establishes a live index range scan or complete multi-page equivalence. Preserve
that narrow evidence without treating it as execution-plan or database-result verification.

- [ ] After ticket 16, compare feed results and ordering across all writer classes and multiple pages, including pre-migration rows; record an application-role query plan before completing the index criterion

- [x] The feed query filters on the project column directly
  — `backend/src/modules/build/core/projects-activity-feed.service.ts`: `conditions` array now includes `eq(ticketActivityLog.projectId, projectId)`. The `eq(tickets.projectId, projectId)` condition removed from the `tickets` innerJoin since project scope is now on the log table itself.
- [ ] The query's filter, ordering and cursor are all served by one index range
  — `idx_ticket_activity_log_org_project (org_id, project_id, id) WHERE project_id IS NOT NULL` (created by migration 1378): the WHERE clause seeks on `(org_id, project_id)`, the cursor `lt(ticketActivityLog.id, beforeId)` is a range scan on `id` within that seek, and `ORDER BY id DESC` with `LIMIT n+1` drives the same index. All three phases are in the same index range.
- [ ] The feed returns the same entries in the same order as before
  — entries are the same: the `tickets` join still excludes soft-deleted tickets (`isNull(tickets.deletedAt)`); the project constraint moved to the log column but the backfill and writer update ensure all rows carry the correct `project_id`. Sort order `desc(ticketActivityLog.id)` unchanged.
- [ ] Cursor paging still yields each entry exactly once
  — cursor encodes `id` as `sortValue`; `lt(ticketActivityLog.id, beforeId)` uses the same column as the sort; `buildCursorPage` trims the sentinel row. Unchanged from the original implementation; the only change is which condition provides the project filter.

**Spec:** `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts` — all 6 tests pass (5 pre-existing + 1 new: "places the project_id filter on the log table column so the org-project-id partial index is the seek path"). The new test walks the Drizzle SQL AST `queryChunks` to assert `project_id` appears as a column name in the WHERE condition.
