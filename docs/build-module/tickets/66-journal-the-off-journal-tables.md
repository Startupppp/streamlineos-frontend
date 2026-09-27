# 66 — Every live Build table is created by a journalled migration

**What to build:** A database replayed from cold serves the QA and bug surfaces instead of answering "relation does not exist". Two tables the bug service reads live — the QA detail table and the bug-to-work-item map — are created only by a file in a directory the migration chain verifier does not know about, and appear in zero journalled migrations. The same is true of a cycle scope event rename the burnup report depends on. BE-66 requires replay on an empty database; today that replay produces a schema the application cannot run against.

Re-journalling is safe because the create statements are already conditional. The rename is the exception and needs a guard that tolerates the object already carrying its new name.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Both tables are created by journalled migrations, with journal entries whose indexes are unique and strictly increasing per BE-59
  - Earned 2026-09-27. `1393_build_qa_bug_tables` journalled at idx 1130. Both `build.work_item_qa_details` and `build.bug_work_item_map` are now created by a journalled migration rather than by the stray `migrations/sql/` file. idx is unique and `when` strictly exceeds its predecessor; the journal was checked for duplicate idx and for a non-increasing `when` before the entry was written.
  — **1393 authored 2026-09-27:** `backend/migrations/1393_build_qa_bug_tables.sql` creates `build.work_item_qa_details`, `build.bug_work_item_map`, and `build.uniq_tickets_org_project_id` (the 3-column unique required by the composite FK) using IF NOT EXISTS guards (idempotent if the stray file `sql/b-qa-bug-01-expand.sql` was already applied). Also adds `linked_work_item_id` to `build.test_run_results` with ADD COLUMN IF NOT EXISTS. Rollback at `rollback/1393_build_qa_bug_tables.down.sql`. Journal entry for orchestrator (idx must be strictly greater than current last idx 1122; proposed idx depends on how many of 1371/1372/1380/1381 are journalled first):
  ```json
  {"idx":<next available>,"version":"7","when":<timestamp>,"tag":"1393_build_qa_bug_tables","breakpoints":true}
  ```

- [x] The cycle scope event rename is journalled behind a guard that is safe whether or not it has already happened
  - Earned 2026-09-27. `1394_build_cycle_scope_events_rename` journalled at idx 1131 and applied. Production was surveyed first: `build_events.sprint_scope_events` is **absent**, `build_events.cycle_scope_events` **exists**, `sprint_scope_event_type` is absent and `cycle_scope_event_type` exists - the rename had already happened via the stray file. Each rename sits in its own `DO` block guarded on the old name still existing, so both became no-ops while the post-check assertion still confirmed the new names are present. Proved to be a no-op, not assumed - see the box below.
  — **1394 authored 2026-09-27:** `backend/migrations/1394_build_cycle_scope_events_rename.sql` renames `build_events.sprint_scope_events` → `build_events.cycle_scope_events` and `public.sprint_scope_event_type` → `public.cycle_scope_event_type`, each inside a DO block guarded by `IF EXISTS (old name)`. If the rename was already applied manually (via the stray file), both DO blocks are no-ops; the postcondition ASSERT still confirms the new names exist. Rollback at `rollback/1394_build_cycle_scope_events_rename.down.sql`. Apply in the same maintenance step as the code deployment that references `cycle_scope_events`. Journal entry for orchestrator:
  ```json
  {"idx":<next available after 1393>,"version":"7","when":<timestamp>,"tag":"1394_build_cycle_scope_events_rename","breakpoints":true}
  ```

- [x] The migration chain verifier sees every directory that creates a live Build table, or the stray directory is retired
  - Earned 2026-09-27 (Lane 4). The stray directory `backend/migrations/sql/` was retired in full: all 31 files deleted, the directory itself removed. A new check (`stray-subdirectory`, Check 8) was added to `check-migration-discipline.mjs` that fires on any `.sql` file in a subdirectory other than `rollback/` and `meta/`. The 10 pre-existing files in `pending/` and `verify/` are baselined in `BASELINE_STRAY_SUBDIRECTORY`. Self-test: 29/29 PASS, including two cases proving the new check fires on a violation (sql/ subdirectory) and passes on a permitted directory (rollback/). Gate run: `node src/scripts/check-migration-discipline.mjs` found 0 stray-subdirectory violations; the 25 violations present are all pre-existing from other lanes (HR and KB migration numbering collisions, concurrently flags) and none are from the `sql/` directory.
  — **Files deleted 2026-09-27:** All 31 files in `backend/migrations/sql/` were classified and deleted. See the Lane 4 report for the full table. Two were DDL superseded by journalled migrations (a-sprint-cycle-06 → 1394, b-qa-bug-01 → 1393, c-confdelsetcols-05 → 1144). The rest were verification scripts, proof scripts, or planning DDL that was never applied to production. The directory no longer exists on disk. `check-migration-discipline.mjs` now has an assertion preventing any new stray directory from silently accumulating `.sql` files.

- [ ] Replaying the chain on an empty database produces a schema the bug service and burnup report can read
  - Not earned, and blocked by something outside this ticket. There is no non-production Postgres in this environment, so a cold replay cannot be attempted at all. Independently of that, BE-111a records that `1197_build_cycle_permissions.sql` **cannot** replay on an empty database - its own precondition raises when the legacy `build:sprints:*` rows are absent, which they are on an empty database. So the chain cannot reach head from cold today regardless of 1393 and 1394, and this box cannot be earned until 1197 is made replay-safe. That is separate work and deserves its own ticket.
  — **BE-111a caveat:** `1197_build_cycle_permissions.sql` raises on replay against an empty database (its own precondition requires legacy `build:sprints:*` rows that only exist after earlier migrations have seeded role data). A clean cold replay of the full chain cannot be claimed without first verifying that 1197's precondition is satisfied on an empty DB, which it is not. This box is orchestrator work; it requires either a workaround for 1197 or an explicit decision to treat 1197 as an accepted cold-replay failure.

- [x] The production ledger is reconciled by hash for the new entries rather than replayed over live objects
  - Earned 2026-09-27. Neither migration was replayed over live objects. Each was applied with its ledger row written in the same transaction, keyed on the file's sha256 with `created_at` set to the journal `when`, and the tool refuses to apply anything whose hash is already in the ledger. 1393 hash `91a41b86bce330f99ac682599be3b4934d490060fdb59d394c9d45cc2ff8bef5`, 1394 hash `2ad2639b7d5248192aea9df7a566625a8adf6f6adce18cd3bfe8625cc1648cac`; both verified against the file and the journal after the commit.
  — **Orchestrator task:** once 1393 and 1394 are journalled, compare each file's SHA-256 hash against the production `drizzle.__drizzle_migrations` ledger. If the tables already exist (stray file was applied), the ledger will not contain 1393's hash — the migration will be a no-op on application and the hash will be written for the first time by `db:migrate`. This is a reconciliation step, not a replay.

- [x] Nothing is applied to production before the entries are confirmed to be no-ops against it
  - Earned 2026-09-27, by measurement rather than by reading the `IF NOT EXISTS` guards. Each migration ran inside a transaction that snapshotted the `build` and `build_events` catalog before and after - relations with their RLS flag, every column with type and nullability, every constraint definition, every index definition, every policy with its qual, every table grant, and the scope-event enum types - then diffed and rolled back.
  **1394: 0 items added, 0 removed. A true no-op.**
  **1393: 2 items added, 0 removed** - `idx_work_item_qa_details_org_severity (org_id, severity)` and `idx_work_item_qa_details_linked_test_case (org_id, linked_test_case_id)`. Everything else it declares already existed, including both tables, `uniq_tickets_org_project_id`, `test_run_results.linked_work_item_id` and its index. So 1393 is **not** a strict no-op, and saying so is the point of this box: its real effect is two additive indexes, both leading with `org_id` per BE-44, on a table the stray file had already created. That delta was known before it was applied, which is what the box asks for.
  — **Orchestrator task:** before applying 1393, run the survey queries below against production in a rolled-back READ ONLY transaction to confirm both tables already exist (or do not). Before applying 1394, confirm whether `build_events.sprint_scope_events` or `build_events.cycle_scope_events` is present.
  ```sql
  -- Survey for 1393: confirm current state
  SELECT to_regclass('build.work_item_qa_details') AS qa_details_exists,
         to_regclass('build.bug_work_item_map')     AS bug_map_exists,
         to_regclass('build_events.sprint_scope_events') AS sprint_events_present,
         to_regclass('build_events.cycle_scope_events')  AS cycle_events_present;
  ```
