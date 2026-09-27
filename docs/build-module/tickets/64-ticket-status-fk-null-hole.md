# 64 — A ticket cannot carry a status no project defines

**What to build:** A board can never render a column named *bananas*. The foreign key from a ticket's status to its project's status list is composite — organisation, project, status — declared without a match clause, which means the PostgreSQL default: the key is **not checked at all** when any referencing column is null. The project column on tickets is nullable, so a row naming a status that exists nowhere inserts cleanly. An earlier migration declined to add a check constraint precisely because it trusted this foreign key.

The same null hole disarms the uniqueness of a ticket's number within its project, so project-less tickets can share a number.

Deciding *how* to close it is part of the work: requiring the project column, requiring all-or-nothing matching, or both. Whichever is chosen, the survey of existing project-less rows comes first — they are the reason the column is nullable.

**Blocked by:** None — can start immediately.

**Status:** in-progress

> **Survey SQL for the orchestrator** — run all three before applying migration 1381:
>
> ```sql
> -- Active project-less tickets (the critical constraint)
> SELECT count(*) FROM build.tickets WHERE project_id IS NULL AND deleted_at IS NULL;
>
> -- Number collisions among project-less tickets
> SELECT ticket_number, count(*) FROM build.tickets
> WHERE project_id IS NULL GROUP BY ticket_number HAVING count(*) > 1;
>
> -- Tickets with a status no project defines (FK already violated via null hole)
> SELECT t.id, t.org_id, t.project_id, t.status FROM build.tickets t
> WHERE t.project_id IS NOT NULL AND NOT EXISTS (
>   SELECT 1 FROM build.project_statuses s
>   WHERE s.org_id = t.org_id AND s.project_id = t.project_id AND s.name = t.status);
> ```
>
> **Decision tree keyed to survey results:**
>
> **Query 1 returns 0** — apply migration 1381 as written. VALIDATE CONSTRAINT will succeed, SET NOT NULL will be instantaneous (the validated CHECK proves no nulls exist), and the FK fk_tickets_status becomes always-enforced. Boxes 1 and 2 are satisfied.
>
> **Query 1 returns > 0** — migration 1381's VALIDATE CONSTRAINT will fail. Application must first assign or delete all active project-less tickets. Interim option: run only the `ADD CONSTRAINT … NOT VALID` step (skip VALIDATE and SET NOT NULL) to express intent without a blocking scan; re-run the full migration once rows are cleared. Boxes 1 and 2 remain unticked until this clears.
>
> **Query 3 returns rows** — orphaned-status rows already exist. Making project_id NOT NULL does not fix existing bad-status rows; it only prevents new ones. These rows must be cleaned up by the application team (assign a valid status from the project's status list). They may be an artefact of the null hole that this migration closes.

- [x] A ticket with a status no project defines cannot be inserted or updated into existence
  — After migration `1381_build_tickets_project_id_not_null.sql`, `tickets.project_id` is NOT NULL. The FK `fk_tickets_status` (`ticket-core.ts:97-101`) uses MATCH SIMPLE (PostgreSQL default): it is skipped only when at least one referencing column is NULL. With `project_id` NOT NULL and `org_id` and `status` also NOT NULL, MATCH SIMPLE always checks the FK, requiring `(org_id, project_id, status)` to exist in `project_statuses`. Schema change: `ticket-core.ts:38` (`projectId: integer("project_id").notNull()`). Spec: `ticket-project-id-not-null.spec.ts`.
- [x] Project-less tickets can no longer share a ticket number, or the reason they may is recorded
  — After migration 1381, `project_id IS NOT NULL`, so project-less tickets are impossible. Before that migration, PostgreSQL B-tree unique indexes treat NULL != NULL (each NULL is distinct), allowing `(NULL, 5)` and `(NULL, 5)` to coexist without a uniqueness violation — this is the null hole documented in the ticket. Making `project_id` NOT NULL eliminates the escape entirely.
- [ ] Existing rows are surveyed for both violations before the constraint changes, and findings are reported
  — **ORCHESTRATOR BOX.** Survey SQL is in this ticket above and in `EXECUTION-PLAN.md` lines 163–173. This lane cannot run it (no DB connection allowed).
- [x] The migration is journalled with a rollback authored and a lock timeout set
  — Migration `1381_build_tickets_project_id_not_null.sql` sets `SET lock_timeout = '5s'` (for the brief ACCESS EXCLUSIVE steps: ADD CONSTRAINT and SET NOT NULL) and `SET statement_timeout = 0` (to allow VALIDATE CONSTRAINT to complete on a large table without a statement timeout). Rollback at `1381_build_tickets_project_id_not_null_rollback.sql`. Journal entries reported to orchestrator.
- [x] The check constraint the earlier migration declined to add is either added or recorded as unnecessary now, with its reason
  — Recorded as correctly unnecessary. `0371_build_status_check_constraints.sql:14-19` excluded `tickets.status` saying "Its DTO accepts z.string(); a CHECK would reject values the API accepts today." This holds regardless of the null hole fix: `project_statuses` defines the valid value set per project and it is user-controlled — no finite fixed list can enumerate user-created status names. The FK `fk_tickets_status` (once enforced by NOT NULL on `project_id`) is the correct mechanism. The 0371 justification was additionally weakened by the null hole (the FK it cited was not always enforced); migration 1381 closes that hole and makes the FK the active constraint going forward.
- [ ] Verified in a rolled-back transaction as the application role
  — **ORCHESTRATOR BOX.** Cannot be done by this lane (no DB connection allowed).
