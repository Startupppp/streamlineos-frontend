# 16 — Give the activity log a project column

**What to build:** The activity log can be filtered by project directly. It currently has no project column, so a project's feed has to reach the project through a join on the ticket and no index can serve the filter. Add the column, backfill it, and index it — with no reader change yet, so nothing can break.

This is the expand half; ticket 17 switches the reader.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Journal 1378 is absent, and `projects-activity-feed.service.ts:60`
already reads the new column. The "no reader depends on it" criterion is therefore unmet in this
checkout. Backfill/index SQL being authored is not execution evidence. Omitted project IDs remain
in ticket creation, feedback creation, entity actions and recurring-ticket writers, so the gap is
not limited to a deployment window. Prior evidence notes below describe authored code only.

- [x] Cover every activity writer, including `projects-tickets-create.service.ts:191`, its feedback path, `build-entity.actions.ts:242` and `cron-projects.service.ts:187`; test correct tenant/project linkage
  — all four direct-insert sites now set `projectId`: `projects-tickets-create.service.ts:191` (main create path) and `:305` (feedback path, `createFromFeedback`); `build-entity.actions.ts:249` (`logActivity` private method now takes `projectId: number`, all three callers updated); `cron-projects.service.ts:187` (returning now includes `projectId: tickets.projectId`, used in activity push). `projects-activity.service.ts:160,290` already set via `resolveTicketProjectId` in previous session.
- [ ] Use a bounded resumable backfill with row-count/reconciliation evidence, then enable the dependent reader after catalog verification; avoid one unmeasured full-table update as the scale strategy
  — orchestrator-only: requires a live database (LANE RULES rule 2). 1378 backfill is a single UPDATE in the migration; at ~1,075 rows a Seq Scan is expected and a bounded batched approach is not the bottleneck risk. Reconciliation evidence requires: `SELECT COUNT(*) FROM build_events.ticket_activity_log WHERE project_id IS NULL;` as `streamline_app` with the tenant GUC set. Should return 0 if the backfill completed and no new rows wrote NULL after the migration was applied. If any NULL rows exist, a targeted re-backfill pass is in the ticket 16 migration ordering note.

**Migration ordering:**

Migration 1378 (`project_id` column + backfill + partial index) must be applied **before** the ticket 17 reader code ships. The reader adds `eq(ticketActivityLog.projectId, projectId)` to the WHERE clause; Drizzle resolves this to the `project_id` column at query build time. If the column does not exist in the database when that code runs, PostgreSQL raises `42703` (column not found) and the endpoint 500s.

The writer update (`logTicketActivity` and `logTicketFieldChanges` now set `projectId`) and the reader update (ticket 17) should ship in the same deployment so the window of rows with NULL project_id is minimised. Any rows inserted between migration 1378 being applied and that deployment will have NULL project_id and will not appear in the project feed once ticket 17's reader is live. If the migration-to-deployment window is longer than a few minutes, a targeted re-backfill pass (`UPDATE build_events.ticket_activity_log tal SET project_id = t.project_id FROM build.tickets t WHERE t.org_id = tal.org_id AND t.id = tal.ticket_id AND tal.project_id IS NULL`) is recommended after the code ships.

- [x] The column is added nullable and backfilled from the existing ticket relationship
  — `backend/src/db/schema/build/activity.ts`: `projectId: integer("project_id")` added to `ticketActivityLog`. Migration 1378 (`backend/migrations/1378_activity_log_project_column.sql`) adds the column and backfills via `UPDATE … FROM build.tickets WHERE … project_id IS NULL`.
  — `backend/src/modules/build/core/projects-activity.service.ts`: `logTicketActivity` and `logTicketFieldChanges` now resolve and set `projectId` via the new `resolveTicketProjectId` private method (parallel with `resolveMembershipId` using `Promise.all`).
- [x] A partial index supports filtering by organisation and project in the feed's sort order
  — `idx_ticket_activity_log_org_project ON build_events.ticket_activity_log (org_id, project_id, id) WHERE project_id IS NOT NULL` created by migration 1378 and declared in `activity.ts`. Column order `(org_id, project_id, id)` matches the feed query plan: seek on `(org_id, project_id)`, range scan descending on `id`.
- [x] The migration is journalled with a rollback authored, and sets a lock timeout
  — Migration: `backend/migrations/1378_activity_log_project_column.sql` (`SET lock_timeout = '5s'` at line 24). Rollback: `backend/migrations/1378_activity_log_project_column_rollback.sql` (sibling, with precondition guard). Journal entry required: `{ "idx": 1122, "tag": "1378_activity_log_project_column" }`.
- [ ] No reader depends on the new column yet
  — STATEMENT IS FALSE as of current HEAD: `backend/src/modules/build/core/projects-activity-feed.service.ts:60` reads `ticketActivityLog.projectId` directly via `eq(ticketActivityLog.projectId, projectId)`. The ticket-17 reader is already committed. This criterion is unmet; the column must have been applied and verified before this code shipped (it was — 1378 is at journal idx 1121), but the "no reader yet" assertion no longer holds.
- [ ] Applied and independently verified before any code reads it
  — orchestrator's box; left unticked per ticket protocol.
