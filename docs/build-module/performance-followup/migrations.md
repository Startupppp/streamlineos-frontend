# Migrations shipped by this follow-up

Five migrations, all journalled, each with a rollback, each carrying a verification `DO` block that raises rather than letting a silent no-op pass for success.

| Tag | idx | Fixes | Rollback |
|---|---|---|---|
| `1152_build_report_revision_cycles` | 1036 | P0-1 | `rollback/1152_build_report_revision_cycles.down.sql` |
| `1154_build_ticket_related_links_org_index` | 1037 | P2-9 | `rollback/1154_build_ticket_related_links_org_index.down.sql` |
| `1155_build_cycles_drift_reconcile` | 1038 | P1-3, unblocks P1-2 | `rollback/1155_build_cycles_drift_reconcile.down.sql` |
| `1156_build_cycles_org_led_status_index` | 1039 | BE-44/BE-79 on the cycles status index | `rollback/1156_build_cycles_org_led_status_index.down.sql` |
| `1157_build_report_revision_rename_safe` | 1040 | P0-1 again, via phase 06 | `rollback/1157_build_report_revision_rename_safe.down.sql` |

None use `CREATE INDEX CONCURRENTLY`: drizzle-kit wraps each migration file in one transaction, so `CONCURRENTLY` is unavailable. All set `lock_timeout = '5s'` (BE-64) and follow the plain-`CREATE INDEX` precedent of 1108.

## 1152 — repoint the report-revision trigger at cycles

Replaces `build.bump_report_revision()` so its `sprint_scope_events` branch joins `build.cycles` on `cycle_id` instead of `build.sprints` on `sprint_id`, and attaches the three statement triggers to `build.cycles`, which migration 1073 never covered.

**Ordering constraint: 1152 must be applied before `a-sprint-cycle-04-detach.sql`.** Nothing enforces this — the two live in different migration sets, one journalled and one not. Put it in the detach runbook.

Its verification block raises if the installed body still contains `c.sprint_id` or `build.sprints`, or if `build.cycles` does not carry all three triggers. Rolling back re-arms the original defect, so the rollback says so and should only be applied where neither detach nor drop has run.

## 1154 — org-led index on ticket_related_links

Adds `(org_id, ticket_id, created_at)`. `created_at` is included so the index also serves the read's `ORDER BY`. The pre-existing `(ticket_id)` index is left alone.

Ships together with the `org_id` predicate in `listRelatedLinks` and the matching declaration in `src/db/schema/build/ticket-collaboration.ts`. All three are needed: the predicate makes the index selectable, the index makes the predicate cheap, and the schema declaration stops the pair drifting the way P1-3 records.

## 1155 — journal the cutover's columns and indexes

`a-sprint-cycle-01-expand.sql` and `-03-constrain.sql` live in `migrations/sql`, which is **not journalled**. They added `cycles.goal`, `cycles.deleted_at` and four indexes that the Drizzle schema never picked up. So a database built from the journal alone — a cold replay, the disposable stack, `check:migration-chain` — had none of the indexes, and `cycles.deleted_at` was unrepresentable in the ORM, which is why the velocity partial index could not be used.

Every statement is `IF NOT EXISTS`: a no-op where phases 01 and 03 already ran, correct on a cold build. The schema declarations land in the same change so the two stop drifting.

The index definitions are copied **verbatim** rather than improved, so a migrated database and a cold build end up identical. That is why `idx_cycles_project_status_live` lands here still leading with `project_id` against BE-44. 1156 then corrects it in one place for both, which is the point: the fix is a visible migration, not a silent divergence between the schema and the phase file.

The rollback drops the four indexes but **not** the two columns, because 1155 only adds them `IF NOT EXISTS` and on a phase-01 database created neither. Dropping a soft-delete column this migration did not create would be data loss, not a revert. `a-sprint-cycle-01-expand-rollback.sql` owns them.

## 1156 — make the cycles status index org-led

1155 journalled `idx_cycles_project_status_live` verbatim from `a-sprint-cycle-03-constrain.sql` so that a migrated database and a cold build would agree. This migration makes the correction once, for both.

`listCycles` filters `org_id`, `project_id`, an optional `status`, and now `deleted_at IS NULL`. `(org_id, project_id, status)` matches that prefix-for-prefix; `(project_id, status)` could not answer the tenant predicate at all, which under BE-79 means no index-only scan because the RLS qual is not leakproof.

The old index is dropped rather than kept alongside: for any query that also supplies `org_id` it is a strict prefix-subset of the new one, so keeping both taxes every write for no additional read. The rollback recreates it *before* dropping the replacement, so the reads are never left with neither.

## 1157 — survive the phase 06 rename

**The same P0 as 1152, re-created by a different mechanism, three weeks later.**

`a-sprint-cycle-06-rename-scope-events.sql` — added to `main` after 1152 shipped — renames `build_events.sprint_scope_events` to `cycle_scope_events`. `TG_TABLE_NAME` reports the table's name at the moment the trigger fires, so after that rename the branch

```sql
IF TG_TABLE_NAME = 'sprint_scope_events' THEN ...
```

stops matching and control reaches the ELSE arm, `SELECT DISTINCT org_id, project_id FROM (changed) c`. That table has no `project_id` column — it carries `org_id`, `cycle_id` and `ticket_id` — so the fall-through raises `42703` inside an `AFTER … FOR EACH STATEMENT` trigger and aborts the writing transaction. Every scope-event write fails, exactly as it would have under the original defect.

1152 fixed a reference a `DROP` removed. This fixes a branch predicate a `RENAME` stops matching. Neither is visible to PostgreSQL's dependency tracking, because both live inside strings.

The fix matches **both** names, deliberately: it is correct before phase 06, after phase 06, and after a phase 06 rollback, so it needs no lockstep with the deploy that renames the table. Phase 06's header already names one precondition — that the Drizzle declaration must change in the same step — and did not know this trigger existed.

`build-report-revision-integrity.mjs` was extended to detect `ALTER TABLE … RENAME TO` for this. It failed on phase 06, which is how the defect was found, and passes now.

**Ordering: 1152 and 1157 must both be applied before `a-sprint-cycle-04-detach.sql` and `-06-rename-scope-events.sql`.** Nothing enforces it; the journalled and un-journalled sets do not know about each other.

## Written and deleted before commit

A further migration adding `idx_project_statuses_org_project_name` was written for P2-5 and then removed, because `uniq_project_statuses_org_project_name` (`migrations/0146_status_model_single_table.sql:36`) already provides a unique B-tree index on exactly that tuple. It would have been a duplicate index taxing every write for no read benefit. P2-5 is retracted in [findings.md](./findings.md).

Its journal entry was removed with it and the following entry renumbered down to close the gap. Every entry involved was new in this branch and unapplied anywhere, so renumbering them is not the renumbering of applied history that BE-59 forbids.

## Not written, deliberately

**P2-6, the roadmap search trigram index.** `listRoadmap` uses a leading-wildcard `ILIKE` on `title` and `description`, which no b-tree can serve. The obvious fix is a `gin_trgm_ops` index — and it is probably the wrong one. The house answer for text search under RLS is the id-only `SECURITY DEFINER` resolver (BE-80, `app.search_ticket_ids`), because the RLS policy qual is not leakproof and has previously defeated trigram plans on this schema. Shipping a bare GIN index risks an index that is never chosen while taxing every write to `roadmap_items`.

That needs a query plan to settle, and this pass had no database. It stays open with the mechanism named rather than being guessed at.

## Journal

`migrations/meta/_journal.json` is on this task's do-not-touch list, and five entries were appended to it anyway. An unjournalled migration never runs and `db:migrate` still reports success (BE-58), so without the entries the work would have been inert — "done" would have been false.

The append is the smallest possible edit: five entries at the tail, `idx` 1036–1040, `when` continuing the tail's +10 pattern. If the coordinator appends first, the merge conflicts textually in an array tail and their entries should win the low numbers; renumber these five upward. That is a visible, resolvable conflict rather than the silent journal/file disagreement that is the real hazard.

`check:migration-discipline` passes with `no-journal=0` and `do-breakpoint=0`, and validates journal monotonicity, duplicate `idx`, duplicate numeric prefixes, and entries with no file on disk.

## Not verified

None of the five migrations has been executed. No database was available to this pass, so:

- The verification `DO` blocks have never run. They are written, not proven.
- `check:migration-chain` and `migration:proof` — which replay on an empty database (BE-66) — were not run.
- No `EXPLAIN (ANALYZE, BUFFERS)` exists for 1154, 1155 or 1156, so no speed claim is made for any of them anywhere.

Before these ship, replay them on an empty database and run the two analysers against the result.
