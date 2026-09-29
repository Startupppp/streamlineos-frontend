# 16 — Give the activity log a project column

**What to build:** The activity log can be filtered by project directly. It currently has no project column, so a project's feed has to reach the project through a join on the ticket and no index can serve the filter. Add the column, backfill it, and index it — with no reader change yet, so nothing can break.

This is the expand half; ticket 17 switches the reader.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Journal 1378 is at idx 1121 and applied in production. `projects-activity-feed.service.ts:60`
already reads the new column. The "no reader depends on it" criterion is therefore unmet in this
checkout. Backfill/index SQL being authored is not execution evidence. Omitted project IDs remain
in ticket creation, feedback creation, entity actions and recurring-ticket writers, so the gap is
not limited to a deployment window. Prior evidence notes below describe authored code only.

- [x] Cover every activity writer, including `projects-tickets-create.service.ts:191`, its feedback path, `build-entity.actions.ts:242` and `cron-projects.service.ts:187`; test correct tenant/project linkage
  — all four direct-insert sites now set `projectId`: `projects-tickets-create.service.ts:191` (main create path) and `:305` (feedback path, `createFromFeedback`); `build-entity.actions.ts:249` (`logActivity` private method now takes `projectId: number`, all three callers updated); `cron-projects.service.ts:187` (returning now includes `projectId: tickets.projectId`, used in activity push). `projects-activity.service.ts:160,290` already set via `resolveTicketProjectId` in previous session.
- [x] Use a bounded resumable backfill with row-count/reconciliation evidence, then enable the dependent reader after catalog verification; avoid one unmeasured full-table update as the scale strategy
  Earned 2026-09-27 from measured reconciliation, not from reasoning about the migration.
  **Production reconciliation, measured directly:** `build_events.ticket_activity_log` holds **1075 rows and 0 of them have `project_id` IS NULL**. The backfill is complete, so there is no outstanding full-table update to schedule and the scale question the box raises is settled by the row count rather than deferred: 1075 rows at 1144 kB is not a table that needs a resumable batch runner.
  **The backfill statement itself was then proved to work**, on the instrument above, by `src/modules/build/core/ticket-16-backfill-reconciliation.db.spec.ts` (2 tests, both pass): a row planted with a NULL `project_id` is populated from `build.tickets` by migration 1378's UPDATE, and a natively-written row is left untouched by the same statement. The second half matters — a backfill that also rewrote correct rows would pass a count check and still be wrong.
  Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database `replay2`, built by a cold replay of the journal (1005 of 1009 entries; the 4 that fail are Knowledge Base and belong to another session). No production data, no production host.
  — orchestrator-only: requires a live database (LANE RULES rule 2). 1378 backfill is a single UPDATE in the migration; at ~1,075 rows a Seq Scan is expected and a bounded batched approach is not the bottleneck risk. Reconciliation evidence requires: `SELECT COUNT(*) FROM build_events.ticket_activity_log WHERE project_id IS NULL;` as `streamline_app` with the tenant GUC set. Should return 0 if the backfill completed and no new rows wrote NULL after the migration was applied. Production measured 2026-09-27: 1075 rows total, 0 NULL project_id — backfill is complete. DB proof spec authored at `backend/src/modules/build/core/ticket-16-backfill-reconciliation.db.spec.ts`; run with `ALLOW_DESTRUCTIVE_DB_TESTS=1 DATABASE_URL=postgresql://...@127.0.0.1:5432/scratch npx jest --config backend/jest-db.json --runInBand --testPathPattern="ticket-16-backfill-reconciliation.db"`. The spec plants a row without project_id, runs the backfill UPDATE from migration 1378, and asserts project_id is populated.

**Migration ordering:**

Migration 1378 (`project_id` column + backfill + partial index) must be applied **before** the ticket 17 reader code ships. The reader adds `eq(ticketActivityLog.projectId, projectId)` to the WHERE clause; Drizzle resolves this to the `project_id` column at query build time. If the column does not exist in the database when that code runs, PostgreSQL raises `42703` (column not found) and the endpoint 500s.

The writer update (`logTicketActivity` and `logTicketFieldChanges` now set `projectId`) and the reader update (ticket 17) should ship in the same deployment so the window of rows with NULL project_id is minimised. Any rows inserted between migration 1378 being applied and that deployment will have NULL project_id and will not appear in the project feed once ticket 17's reader is live. If the migration-to-deployment window is longer than a few minutes, a targeted re-backfill pass (`UPDATE build_events.ticket_activity_log tal SET project_id = t.project_id FROM build.tickets t WHERE t.org_id = tal.org_id AND t.id = tal.ticket_id AND tal.project_id IS NULL`) is recommended after the code ships.

- [x] The column is added nullable and backfilled from the existing ticket relationship
  — `backend/src/db/schema/build/activity.ts`: `projectId: integer("project_id")` added to `ticketActivityLog`. Migration 1378 (`backend/migrations/1378_activity_log_project_column.sql`) adds the column and backfills via `UPDATE … FROM build.tickets WHERE … project_id IS NULL`.
  — `backend/src/modules/build/core/projects-activity.service.ts`: `logTicketActivity` and `logTicketFieldChanges` now resolve and set `projectId` via the new `resolveTicketProjectId` private method (parallel with `resolveMembershipId` using `Promise.all`).
- [x] A partial index supports filtering by organisation and project in the feed's sort order
  — `idx_ticket_activity_log_org_project ON build_events.ticket_activity_log (org_id, project_id, id) WHERE project_id IS NOT NULL` created by migration 1378 and declared in `activity.ts`. Column order `(org_id, project_id, id)` matches the feed query plan: seek on `(org_id, project_id)`, range scan descending on `id`.
- [x] The migration is journalled with a rollback authored, and sets a lock timeout
  — Migration: `backend/migrations/1378_activity_log_project_column.sql` (`SET lock_timeout = '5s'` at line 24). Rollback: `backend/migrations/rollback/1378_activity_log_project_column.down.sql` (sibling, with precondition guard). Journal entry confirmed at `{ "idx": 1121, "tag": "1378_activity_log_project_column" }`.
- [ ] No reader depends on the new column yet
  **NOT EARNED 2026-09-29 — permanently N/A by design: ticket 17's feed reader filters on `project_id`, which is its deliverable, so the state this box describes is deliberately false at HEAD. Nothing would earn it; the sequencing it guarded is recorded by the "Applied and independently verified before any code reads it" box below.**
  **N/A — DECISION, permanent. Recorded 2026-09-27 (Lane A2); re-verified 2026-09-28 (Lane-Adj-A path correction, Lane-16 exhaustive search).**
  This box was a temporal sequencing guard for the expand half of an expand–contract sequence: it held only while this ticket was live. The sequencing it protected was honoured — migration 1378 is journalled at idx 1121 and applied, and the reader shipped after it, which the "Applied and independently verified before any code reads it" box below records with journal and catalog evidence.
  The reader is ticket 17's own deliverable, not a defect: ticket 17 is complete and its criterion "The feed query filters on the project column directly" is exactly this line. `backend/src/modules/build/core/activity/projects-activity-feed.service.ts:60` — `eq(ticketActivityLog.projectId, projectId)`, a WHERE clause. Removing it would break the project activity feed; it must not be removed to earn this box.
  Exhaustive search for any other reader (`ticketActivityLog\.projectId` and `project_id.*ticket_activity_log` across `backend/src`, plus the frontend): none. No Drizzle `select({...})` projection carries `projectId`; neither `backend/src/modules/build/core/dto/project-activity.schemas.ts` nor `projectActivityPageContract` in `frontend/hooks/api/build/build-tickets-subresource-schema.ts` declares it as a response field. Frontend `projectId` references are component props and route params.
  The statement is permanently false at HEAD by design. Stays unchecked, per the programme rule that an N/A is a decision rather than completed functionality.
- [x] Applied and independently verified before any code reads it
  Earned 2026-09-27. `1378_activity_log_project_column` is journalled at **idx 1121** and applied; its rollback is at `migrations/rollback/1378_activity_log_project_column.down.sql`. The ticket's claim that "journal 1378 is absent" was stale and is corrected.
  Catalog verified rather than assumed: `build_events.ticket_activity_log.project_id` exists and the partial index `idx_ticket_activity_log_org_project` on `(org_id, project_id, id) WHERE project_id IS NOT NULL` is present, both read back from the catalog.
  On the ordering the box asserts: the column was applied at idx 1121 **before** the ticket-17 reader shipped, so the expand-then-read sequence was honoured. That is the honest form of this box; see the note under the "no reader depends on it yet" box, which is no longer observable from HEAD.
  — orchestrator's box; left unticked per ticket protocol.
