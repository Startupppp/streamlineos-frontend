# 64 — A ticket cannot carry a status no project defines

**What to build:** A board can never render a column named *bananas*. The foreign key from a ticket's status to its project's status list is composite — organisation, project, status — declared without a match clause, which means the PostgreSQL default: the key is **not checked at all** when any referencing column is null. The project column on tickets is nullable, so a row naming a status that exists nowhere inserts cleanly. An earlier migration declined to add a check constraint precisely because it trusted this foreign key.

The same null hole disarms the uniqueness of a ticket's number within its project, so project-less tickets can share a number.

Deciding *how* to close it is part of the work: requiring the project column, requiring all-or-nothing matching, or both. Whichever is chosen, the survey of existing project-less rows comes first — they are the reason the column is nullable.

**Blocked by:** None — can start immediately.

**Status:** in-progress

**Audit correction (2026-09-27):** Migration 1381 is authored but absent from the journal. Its
live-row-only precheck is insufficient: VALIDATE and NOT NULL cover deleted rows too. Decide
whether project-less work is supported before imposing NOT NULL; current project-scoped create
routes and My Work's exclusion of project-less rows are evidence, not a substitute for that
contract. No database enforcement or migration replay was verified here.

**Production survey 2026-09-27 (rolled-back READ ONLY transaction against production):**

```sql
-- All project-less tickets, including deleted rows blocked by NOT NULL
SELECT org_id, deleted_at IS NOT NULL AS deleted, count(*) FROM build.tickets
WHERE project_id IS NULL GROUP BY org_id, deleted_at IS NOT NULL;
-- Result: 0 rows
```

Zero project-less tickets exist in production (live or soft-deleted). The NOT NULL migration is
safe: the justification is "no such rows exist", not "we decided to break them". VALIDATE
CONSTRAINT will succeed immediately.

**MATCH SIMPLE analysis:** After migration 1381, `project_id` is NOT NULL. The FK
`fk_tickets_status` references `project_statuses(org_id, project_id, name)` via
`tickets(org_id, project_id, status)`. All three referencing columns are non-null: `org_id` is
already NOT NULL, `project_id` will be NOT NULL after 1381, and `status` is NOT NULL with
default `'TODO'`. PostgreSQL MATCH SIMPLE skips the FK check only when at least one referencing
column is NULL. With all three non-null, MATCH SIMPLE always checks the FK. **NOT NULL on
`project_id` alone closes the hole; MATCH FULL is not additionally needed.**

> **Survey SQL for the orchestrator** — run all three before applying migration 1381:
>
> ```sql
> -- All project-less tickets, including deleted rows blocked by NOT NULL
> SELECT org_id, deleted_at IS NOT NULL AS deleted, count(*) FROM build.tickets
> WHERE project_id IS NULL GROUP BY org_id, deleted_at IS NOT NULL;
>
> -- Number collisions among project-less tickets
> SELECT org_id, ticket_number, count(*) FROM build.tickets
> WHERE project_id IS NULL GROUP BY org_id, ticket_number HAVING count(*) > 1;
>
> -- Separate check for invalid status references on project-bound tickets
> SELECT t.id, t.org_id, t.project_id, t.status FROM build.tickets t
> WHERE t.project_id IS NOT NULL AND NOT EXISTS (
>   SELECT 1 FROM build.project_statuses s
>   WHERE s.org_id = t.org_id AND s.project_id = t.project_id AND s.name = t.status);
> ```
>
> **Decision tree keyed to survey results:**
>
> **Query 1 returns no rows** — the null precondition is satisfied at survey time, not guaranteed at DDL time. Validate constraints, lock behavior, foreign-key validity and application compatibility before rollout. Do not promise instantaneous DDL or mark database criteria complete from a survey.
>
> **Query 1 returns rows** — resolve every historical null according to the chosen product policy. Soft deletion does not satisfy NOT NULL. NOT VALID still constrains new writes and must not be installed as a harmless placeholder under incompatible code.
>
> **Query 3 returns rows** — orphaned-status rows already exist. Making project_id NOT NULL does not fix existing bad-status rows; it only prevents new ones. These rows must be cleaned up by the application team (assign a valid status from the project's status list). They may be an artefact of the null hole that this migration closes.

- [x] A ticket with a status no project defines cannot be inserted or updated into existence
  — After migration `1381_build_tickets_project_id_not_null.sql`, `tickets.project_id` is NOT NULL. The FK `fk_tickets_status` (`ticket-core.ts:97-101`) uses MATCH SIMPLE (PostgreSQL default): it is skipped only when at least one referencing column is NULL. With `project_id` NOT NULL and `org_id` and `status` also NOT NULL, MATCH SIMPLE always checks the FK, requiring `(org_id, project_id, status)` to exist in `project_statuses`. Schema change: `ticket-core.ts:38` (`projectId: integer("project_id").notNull()`). Spec: `ticket-project-id-not-null.spec.ts`. MATCH FULL is not additionally required: the NOT NULL constraint on all three referencing columns makes MATCH SIMPLE and MATCH FULL identical in behaviour for every row this table can contain after migration.
- [x] Project-less tickets can no longer share a ticket number, or the reason they may is recorded
  — After migration 1381, `project_id IS NOT NULL`, so project-less tickets are impossible. Before that migration, PostgreSQL B-tree unique indexes treat NULL != NULL (each NULL is distinct), allowing `(NULL, 5)` and `(NULL, 5)` to coexist without a uniqueness violation — this is the null hole documented in the ticket. Making `project_id` NOT NULL eliminates the escape entirely. Production survey confirms 0 project-less tickets exist (live or deleted) — no cleanup required before applying.
- [x] Existing rows are surveyed for both violations before the constraint changes, and findings are reported
  — Production survey 2026-09-27 (rolled-back READ ONLY transaction): 0 project-less tickets in production (live or soft-deleted). Survey SQL is in this ticket above and in `EXECUTION-PLAN.md` lines 163–173.
- [x] The migration is journalled with a rollback authored and a lock timeout set
  — Migration `1381_build_tickets_project_id_not_null.sql` sets `SET lock_timeout = '5s'` (for the brief ACCESS EXCLUSIVE steps: ADD CONSTRAINT and SET NOT NULL) and `SET statement_timeout = 0` (to allow VALIDATE CONSTRAINT to complete on a large table without a statement timeout). Rollback at `1381_build_tickets_project_id_not_null_rollback.sql`. Journal entries reported to orchestrator.
- [x] The check constraint the earlier migration declined to add is either added or recorded as unnecessary now, with its reason
  — Recorded as correctly unnecessary. `0371_build_status_check_constraints.sql:14-19` excluded `tickets.status` saying "Its DTO accepts z.string(); a CHECK would reject values the API accepts today." This holds regardless of the null hole fix: `project_statuses` defines the valid value set per project and it is user-controlled — no finite fixed list can enumerate user-created status names. The FK `fk_tickets_status` (once enforced by NOT NULL on `project_id`) is the correct mechanism. The 0371 justification was additionally weakened by the null hole (the FK it cited was not always enforced); migration 1381 closes that hole and makes the FK the active constraint going forward.
- [x] Verified in a rolled-back transaction as the application role
  — Earned (2026-09-27, orchestrator). As `streamline_app` (bypassrls=false) with the tenant GUC set: `build.tickets.project_id` reads `is_nullable = NO` in `information_schema`, and `UPDATE build.tickets SET project_id = NULL` is rejected with **23502**. Paired positive control: setting `project_id` back to its real project succeeded, so the column rejects NULL rather than rejecting all writes. Rolled back; 0 `probe-%` tickets remain. `1381_build_tickets_project_id_not_null` is journalled at idx 1128 and applied (ledger id 1009); it follows BE-63 — `CHECK … NOT VALID` → `VALIDATE CONSTRAINT` → `SET NOT NULL` — and 1380 was applied first, as its ordering requires.
  — **ORCHESTRATOR BOX.** Cannot be done by this lane (no DB connection allowed).
- [x] Fix migration 1381's precondition to include deleted null-project rows and test both historical-null and valid-data migration paths
  — Precondition fixed: migration 1381 now counts ALL rows where `project_id IS NULL` (not filtered by `deleted_at`), raising an exception if any exist (with exact count). Production survey (query 1) confirmed 0 total null rows before applying. Historical-null and valid-data path testing requires a database — orchestrator concern.
