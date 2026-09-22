# P0 #7 — QA Bug → canonical BUG work item

Workstream B, Phase 2. Static design only: no database was reachable, so nothing
in this note has been applied or measured. Every claim is anchored to a
`path:line` in `backend/` (worktree `slos-be-phase-2-data`) or `frontend/`
(worktree `slos-phase-2-data`) that was read while writing it.

Executable artefacts:

| Artefact | Path |
|---|---|
| Mapping functions | `backend/src/modules/build/qa/phase-2/bug-consolidation-mapping.ts` |
| Regression tests | `backend/src/modules/build/phase-2/qa-bug-consolidation.spec.ts` |
| Expand / rollback | `backend/docs/phase-2/sql/b-qa-bug-01-expand{,-rollback}.sql` |
| Backfill / rollback | `backend/docs/phase-2/sql/b-qa-bug-02-backfill{,-rollback}.sql` |
| Verify | `backend/docs/phase-2/sql/b-qa-bug-03-verify.sql` |
| Contract freeze / rollback | `backend/docs/phase-2/sql/b-qa-bug-04-contract-freeze{,-rollback}.sql` |
| Contract drop | `backend/docs/phase-2/sql/b-qa-bug-05-contract-drop.sql` |

---

## 1. Source verification

### 1.1 Claims from PHASE-1-STATUS.md:119-142 and 02-schemas.md

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | Separate `build.bugs` table exists | TRUE | `backend/src/db/schema/build/qa.ts:138` |
| 2 | …with **10** columns the canonical ticket lacks | **FALSE** | 15, not 10. `bugs` has 27 columns (`qa.ts:138-165`), `tickets` has 38 (`ticket-core.ts:29-82`); 15 `bugs` column names have no `tickets` counterpart. Asserted in the spec, derived from the schema, not typed by hand. |
| 3 | 9-value `bug_status` enum | TRUE | `qa.ts:136` — `new, triaged, assigned, in_progress, fixed, ready_for_qa, verified, reopened, closed` |
| 4 | `bug_status` "maps onto nothing" | **PARTIALLY TRUE** | There is no target *enum*, because the canonical status model is not an enum (§1.3). It maps cleanly onto `state_group` (`common/enums.ts:24`) and from there onto a project's `project_statuses` rows. "Maps onto nothing" overstates it. |
| 5 | `bugs.linkedTestCaseId` and other QA-only fields exist | TRUE | `qa.ts:161`; full inventory in §1.2 |
| 6 | No `bug_comments` table | TRUE | Zero hits for `bug_comments`/`bugComments` across `backend/src` and `backend/migrations` |
| 7 | Consolidation gains comment/attachment/label/watcher for defects | TRUE | `ticket_comments` `ticket-collaboration.ts:55`, `ticket_attachments` `:85`, `ticket_labels` `:111`, `ticket_label_mappings` `:128`, `ticket_watchers` `:152`, `ticket_checklists` `:176`, `ticket_custom_field_values` `:230`, `ticket_comment_reactions` `:259`, `ticket_related_links` `:292`; activity `activity.ts:35`. All are keyed on `ticket_id`, none has a `bugs` equivalent. |
| 8 | Test runs insert straight into `bugs`, bypassing tickets | TRUE | `backend/src/modules/build/qa/test-runs.service.ts:392` inside `createBugFromResult` (`:355`), then writes the evidence pointer back at `:413-416` |
| 9 | Target: `WorkItem.type=BUG` is one canonical identity | Feasible | `ticket_type` already has `BUG` (`common/enums.ts:17`) and the create path already emits it (`projects-tickets-create.service.ts:275`, `forms/submissions.service.ts:109`) |

Additional finding not in the Phase-1 note: `bugs` has **no `version` column**, while
`tickets` does (`ticket-core.ts:76`). Bug updates therefore have no
optimistic-concurrency guard today; consolidation silently *adds* one.

Second finding: `bugs.created_at/updated_at/deleted_at` are `timestamp` **without**
time zone (`qa.ts:163-165`) while the ticket equivalents are `timestamptz`
(`ticket-core.ts:77-82`). Every backfill copy needs an explicit
`AT TIME ZONE 'UTC'`; an implicit cast would apply the server `TimeZone` GUC and
shift historical timestamps.

### 1.2 Full column inventory of `build.bugs` (`qa.ts:138-165`)

27 columns. `*` marks the 15 with no `tickets` counterpart.

| # | Column | Type | Notes |
|---:|---|---|---|
| 1 | `id` | integer identity | PK |
| 2 | `org_id` | text NOT NULL | FK organizations, CASCADE |
| 3 | `project_id` | integer NOT NULL | composite FK `fk_bugs_org_project`, CASCADE (`:169`) |
| 4 | `bug_number` * | integer NOT NULL | `uq_bugs_project_number` (`:174`) |
| 5 | `title` | text NOT NULL | |
| 6 | `description` | text | |
| 7 | `severity` * | `bug_severity` NOT NULL default `major` | `qa.ts:134` |
| 8 | `priority` | `bug_priority` NOT NULL default `medium` | `qa.ts:135` |
| 9 | `status` | `bug_status` NOT NULL default `new` | `qa.ts:136` |
| 10 | `steps_to_reproduce` * | text | |
| 11 | `expected_result` * | text | |
| 12 | `actual_result` * | text | |
| 13 | `environment` * | text | |
| 14 | `browser_device` * | text | |
| 15 | `affected_release_id` * | integer | composite FK → `project_releases`, SET NULL (`:167`) |
| 16 | `fixed_release_id` * | integer | composite FK → `project_releases`, SET NULL (`:168`) |
| 17 | `assignee_membership_id` | integer | composite FK → `organization_members`, SET NULL (`:178`) |
| 18 | `reporter_id` | text | FK users, SET NULL |
| 19 | `qa_owner_id` * | text | FK users, SET NULL |
| 20 | `qa_owner_membership_id` * | integer | composite FK → `organization_members`, SET NULL (`:183`) |
| 21 | `reopen_count` * | integer NOT NULL default 0 | incremented in `bugs.service.ts:164` |
| 22 | `linked_ticket_id` * | integer | composite FK → `tickets`, SET NULL (`:171`) |
| 23 | `linked_test_case_id` * | integer | composite FK → `test_cases`, SET NULL (`:170`) |
| 24 | `created_by` * | text | FK users, SET NULL |
| 25 | `created_at` | timestamp (no tz) | |
| 26 | `updated_at` | timestamp (no tz) | |
| 27 | `deleted_at` | timestamp (no tz) | soft delete |

Indexes: `idx_bugs_org_project_status` and `idx_bugs_org_project_severity`, both
partial on `deleted_at IS NULL` (`:172-173`); `idx_bugs_assignee` (`:175`);
`idx_bugs_org_qa_owner_membership` (`:176`); `uniq_bugs_org_id` (`:177`).

### 1.3 The canonical status model is **not** an enum

`tickets.status` is `text NOT NULL DEFAULT 'TODO'` (`ticket-core.ts:36`) with a
composite foreign key:

```
fk_tickets_status (org_id, project_id, status)
  → project_statuses (org_id, project_id, name) ON UPDATE CASCADE
```
(`ticket-core.ts:95-99`)

`build.project_statuses` (`build/core.ts:132-152`) is a **per-project configurable
custom-state table**: `name`, `order`, `color`, `wip_limit`, and
`type` typed by the `state_group` pg enum — `backlog, unstarted, started,
completed, cancelled` (`common/enums.ts:24`). `type` is **nullable**
(`core.ts:141` declares `.default("unstarted")` with no `.notNull()`), so a custom
state can carry a NULL group. Uniqueness is
`uniq_project_statuses_org_project_name` on `(org_id, project_id, name)`
(`core.ts:150`).

Every project is seeded from `DEFAULT_PROJECT_STATUSES`
(`modules/build/core/lib/default-statuses.ts:1-6`): `TODO/unstarted/0`,
`IN_PROGRESS/started/1`, `IN_REVIEW/started/2`, `DONE/completed/3`. Three call
sites seed it: `projects-provision.service.ts:126`, `:228`, and
`projects-templates.service.ts:178`. Users can add, rename and delete states via
`projects-custom-states.service.ts:145,199`.

Consequence for the backfill: a migrated work item's `status` must name an
**existing row** of *that project's* `project_statuses`, or the insert raises
23503. Any "pick a constant like `TODO`" plan is wrong for renamed projects.

Other canonical vocabularies: `ticket_type` = `EPIC, STORY, TASK, BUG`
(`common/enums.ts:17`); `ticket_priority` = `LOW, MEDIUM, HIGH, URGENT`
(`common/enums.ts:19`); `work_item_relation_type` = `blocks, blocked_by,
duplicate_of, relates_to` (`common/enums.ts:29`).

### 1.4 Key allocation: how `ticket_number` is assigned

A **counter table plus a self-healing upsert**, not a sequence and not a trigger.

`build.project_ticket_counters (org_id, project_id, next_ticket_number bigint,
updated_at)`, PK `(org_id, project_id)` (`build/ticket-counters.ts:6-26`).
`allocateTicketNumbers` (`modules/build/core/lib/allocate-ticket-number.ts:14-26`)
does one `INSERT … SELECT COALESCE(MAX(ticket_number),0)+count+1 … ON CONFLICT DO
UPDATE SET next_ticket_number = GREATEST(existing, EXCLUDED - count) + count
RETURNING next_ticket_number - count`. It is the only allocator, used at
`projects-tickets-create.service.ts:114` and `leads/lead-conversion.service.ts:307`.
Uniqueness is enforced by `uniq_tickets_project_number (project_id,
ticket_number)` (`ticket-core.ts:100`).

`bug_number` is allocated **differently**: `SELECT COALESCE(MAX(bug_number),0)+1`
under `pg_advisory_xact_lock(projectId)` (`bugs.service.ts:59-64` and
`test-runs.service.ts:385-390`). Two independent numbering schemes, one
per-project namespace each — this is the dual identity in its most concrete form.

### 1.5 Every writer of `build.bugs`

Complete for `backend/src`, excluding `*.spec.ts`/`*.e2e-spec.ts`.

| # | Site | Operation |
|---|---|---|
| 1 | `modules/build/qa/bugs.service.ts:76` (`createBug`) | INSERT, number from MAX+1 at `:60-64` |
| 2 | `modules/build/qa/bugs.service.ts:144` (`updateBug`) | UPDATE, incl. `reopen_count` bump at `:164` |
| 3 | `modules/build/qa/bugs.service.ts:196` (`deleteBug`) | UPDATE — soft delete |
| 4 | `modules/build/qa/test-runs.service.ts:392` (`createBugFromResult`) | INSERT, number from MAX+1 at `:386-390`, then UPDATE of `test_run_results.linked_bug_id` at `:413-416` |

Readers: `bugs.service.ts:36,62`, `test-runs.service.ts:388`, plus
`db.query.bugs.findFirst` at `bugs.service.ts:44,120,185`.

Indirect writers (database-driven, no application code):
`fk_bugs_assignee_actor` and `fk_bugs_qa_owner_actor` null their membership
pointers on member removal. Both are ruled in the membership artifact catalog:
`modules/organization/core/membership-artifact-catalog/build.artifacts.ts:114-123`
(`bugs` / `assignee_membership_id`) and `:194-203` (`bugs_qa_owner_membership` /
`qa_owner_membership_id`). **Both entries must move with the columns**; I do not
own that file, so it is listed as an impacted file in §9.

No migration, script or `.mjs` under `backend/scripts` or `backend/src/scripts`
writes `build.bugs`. `src/scripts/check-lifecycle-predicates.mjs:124` allowlists
the `MAX(bug_number)` read as one that must see soft-deleted rows.

---

## 2. Model decision for every `bugs` column

Three destinations. `build.work_item_qa_details` is a **sidecar keyed on the work
item**, PK `(org_id, work_item_id)`; `build.bug_work_item_map` is a permanent
identity ledger. Nothing goes to JSONB: `02-schemas.md:61` forbids query-critical
relationship data there, and four of these columns are foreign keys.

| `bugs` column | Destination | Justification |
|---|---|---|
| `id` | identity map `bug_id` | Legacy surrogate. Kept so the backfill is resumable and auditable, and so a post-mortem can answer "which work item was bug 412". |
| `org_id` | `tickets.org_id` | Identical |
| `project_id` | `tickets.project_id` *and* sidecar `project_id` | The sidecar copy is not denormalisation drift: it is part of the composite FK `(org_id, project_id, work_item_id) → tickets(org_id, project_id, id)`, so Postgres makes disagreement impossible. It also reproduces the exact shape of the two existing partial indexes (`qa.ts:172-173`) so QA-board read cost cannot regress. |
| `bug_number` | identity map `legacy_bug_number` | The canonical human key becomes `tickets.ticket_number` from the counter (§1.4). A second per-project number on the work item would be a second identity, which is the defect being closed. Old deep links resolve through the map. |
| `title` | `tickets.title` | Identical |
| `description` | `tickets.description` | Identical |
| `severity` | sidecar `severity` (`bug_severity` enum reused) | No canonical counterpart. It is a filter today (`bugs.service.ts:28`, index `qa.ts:173`), so it must stay an indexed column. Reusing the existing pg enum avoids a redundant type. |
| `priority` | `tickets.priority` | Total 1:1 onto `ticket_priority` (§4) |
| `status` | `tickets.status` (mapped) **and** sidecar `qa_state` (verbatim) | The canonical status is what the board, WIP limits and workflow transitions read. The verbatim `bug_status` is retained so the nine-state QA lifecycle survives the lossy 9→5 projection, so QA can keep distinguishing `fixed` from `ready_for_qa` from `verified`, and so the cutover stays reversible. |
| `steps_to_reproduce` | sidecar | Defect-only narrative |
| `expected_result` | sidecar | Defect-only narrative |
| `actual_result` | sidecar | Defect-only narrative |
| `environment` | sidecar | Reproduction context; mirrors `test_runs.environment` (`qa.ts:80`) |
| `browser_device` | sidecar | Reproduction context; mirrors `test_runs.browser_device` (`qa.ts:81`) |
| `affected_release_id` | sidecar, composite FK SET NULL | Relationship data → column, never JSONB |
| `fixed_release_id` | sidecar, composite FK SET NULL | Relationship data → column, never JSONB |
| `assignee_membership_id` | `tickets.assignee_membership_id` | Same column, same composite actor FK (`ticket-core.ts:144-148`) |
| `reporter_id` | `tickets.reporter_id` | Identical |
| `qa_owner_id` | sidecar `qa_owner_user_id` | QA ownership is a QA concern with no canonical counterpart. The legacy user id is carried so nothing is lost; the actor contraction retires it later. |
| `qa_owner_membership_id` | sidecar `qa_owner_membership_id`, composite FK SET NULL | Moves with its field. Requires a **new** membership-artifact-catalog entry (§8). |
| `reopen_count` | sidecar `reopen_count` | Not reconstructable from the activity log for pre-cutover rows: `ticket_activity_action` (`activity.ts:18-33`) has `status_changed` but the log has never been written for bugs. |
| `linked_ticket_id` | `work_item_relations` row, `relation_type = 'relates_to'` | Converted, not dropped. Once the defect *is* a work item, a bug↔ticket link is an ordinary work-item relation (`ticket-core.ts:157-181`). `relates_to` is the only honest choice of the four values: `blocks`/`blocked_by` assert a dependency the old column never carried, `duplicate_of` asserts identity. |
| `linked_test_case_id` | sidecar, composite FK SET NULL | Evidence link. Query-critical (the QA page joins on it), so a column. |
| `created_by` | sidecar `created_by_user_id` + replayed `ticket_activity_log` `created` row | `tickets` has no `created_by`; it models authorship as `reporter_id`/`reporter_membership_id`. Overwriting `reporter_id` with `created_by` would lose a distinct fact, so provenance is preserved on the sidecar and surfaced as activity. |
| `created_at` | `tickets.created_at` | Explicit `AT TIME ZONE 'UTC'` cast (§1.1) |
| `updated_at` | `tickets.updated_at` | Same cast |
| `deleted_at` | `tickets.deleted_at` | Same cast |

27 of 27 covered. `qa-bug-consolidation.spec.ts` enumerates
`getTableColumns(bugs)` at runtime and fails if the design misses a column or
names a column that does not exist, so this table cannot silently rot.

### 2.1 Structural additions outside `bugs`

- `build.tickets`: new `UNIQUE (org_id, project_id, id)` so the sidecar FK can be
  three-column. Additive; one index.
- `build.test_run_results`: new nullable `linked_work_item_id` with composite FK
  SET NULL, beside the existing `linked_bug_id` (`qa.ts:119`) until the drop
  phase.

---

## 3. Deterministic lifecycle mapping

Two stages. Stage 1 is a total function on the enum; stage 2 resolves a group to
a concrete state of one project.

### Stage 1 — `bug_status` → `state_group`

| `bug_status` | `state_group` | Reasoning |
|---|---|---|
| `new` | `backlog` | Reported, not committed |
| `triaged` | `unstarted` | Accepted, not started |
| `assigned` | `unstarted` | Owned, not started |
| `in_progress` | `started` | |
| `fixed` | `started` | Dev-complete but unverified is still in flight |
| `ready_for_qa` | `started` | |
| `verified` | `completed` | |
| `reopened` | `started` | |
| `closed` | `completed` | |
| **NULL** | `backlog` | |
| **any unrecognised string** | `backlog` | |

Total over 9 + NULL + unknown. `cancelled` is never a target: no `bug_status`
value means "won't fix", and inventing one would silently close defects.
`verified` and `closed` both land on `completed`; that projection is lossy by
construction, which is exactly why `qa_state` keeps the original value (§2).

### Stage 2 — `state_group` → a row of that project's `project_statuses`

1. Candidates = `project_statuses` for `(org_id, project_id)`.
2. Each candidate's effective group is `COALESCE(type, 'unstarted')` — the column
   is nullable (`core.ts:141`).
3. Walk a fixed chain for the target group and take the **first** group that has
   any candidate. Within that group, order by `("order" ASC, id ASC)` and take the
   first row. Ordering on `id` after `order` is what makes this deterministic
   rather than "pick the first": two states may share an `order`.

| Target | Chain |
|---|---|
| `backlog` | backlog → unstarted → started → completed → cancelled |
| `unstarted` | unstarted → backlog → started → completed → cancelled |
| `started` | started → unstarted → backlog → completed → cancelled |
| `completed` | completed → started → unstarted → backlog → cancelled |
| `cancelled` | cancelled → completed → started → unstarted → backlog |

Each chain is a total permutation of `state_group`, so step 3 always terminates.
`cancelled` is last for every non-cancelled target: degrade toward "still open",
never toward a terminal state the project did not ask for.

4. If the project has **zero** `project_statuses` rows, the backfill inserts
   `DEFAULT_PROJECT_STATUSES` for it first
   (`b-qa-bug-02-backfill.sql`, statement 1, `ON CONFLICT DO NOTHING`) and
   re-resolves. This makes the resolver total even for projects created by a path
   that never seeded states.

Implemented twice, once per medium, and pinned against each other by the spec:
`resolveWorkItemStatus` in `bug-consolidation-mapping.ts`, and the
`status_group`/`group_chain`/`array_position` CTEs in `b-qa-bug-02-backfill.sql`.

---

## 4. Severity and priority mapping

Both vocabularies were read from the schema, not from a doc.

### Priority — `bug_priority` (`qa.ts:135`) → `ticket_priority` (`common/enums.ts:19`)

| `bug_priority` | `ticket_priority` |
|---|---|
| `low` | `LOW` |
| `medium` | `MEDIUM` |
| `high` | `HIGH` |
| `urgent` | `URGENT` |
| NULL / unknown | `MEDIUM` |

Total, injective, and case-normalising only. `MEDIUM` is the column default
(`ticket-core.ts:37`), so the fallback introduces no new value.

### Severity — `bug_severity` (`qa.ts:134`)

`tickets` has **no** severity column, and none is being added: severity is a QA
grading, not a scheduling signal, and the canonical board has no place for it.
Severity is preserved verbatim on the sidecar.

A total `severity → ticket_priority` function is still defined, used **only** as
the UI pre-fill when a user files a new BUG work item:

| `bug_severity` | suggested `ticket_priority` |
|---|---|
| `blocker` | `URGENT` |
| `critical` | `HIGH` |
| `major` | `MEDIUM` |
| `minor` | `LOW` |
| `trivial` | `LOW` |
| NULL / unknown | `MEDIUM` |

The **backfill does not use it**. Escalating a `severity=blocker,
priority=low` bug to `URGENT` would rewrite a deliberate triage decision under
the guise of a migration. Migrated priority comes from `bugs.priority` alone.

---

## 5. Migration plan

Five files. Each is individually safe, and each of the first four has a stated
reversal. The repo's enforced gate is
`backend/src/scripts/check-migration-discipline.mjs` — seven rules documented at
`:8-29`, implemented at `:496` (lock_timeout), `:501` (FK `NOT VALID`), `:512`
(NOT NULL two-step), `:536` (validate-before-backfill), `:551` (DO-block
breakpoint), `:563` (journal entry) and `:569` (no `CONCURRENTLY`). All five files
comply: every one opens with `SET lock_timeout = '5s'`, every
`ADD CONSTRAINT … FOREIGN KEY` carries `NOT VALID` followed by a separate
`VALIDATE`, no file uses `SET NOT NULL` or `CONCURRENTLY`, no file has a `DO $$`
block, and no file places a `VALIDATE` before a backfill `UPDATE`.

They live under `backend/docs/phase-2/sql/`, **not** `backend/migrations/`, so
they carry no `meta/_journal.json` entry and cannot be applied by `db:migrate`.
Rule 6 is the reason: promoting them into `migrations/` is a separate, deliberate
act by whoever owns the journal.

| Phase | File | Effect | Reversal |
|---|---|---|---|
| 1 Expand | `b-qa-bug-01-expand.sql` | Creates `work_item_qa_details`, `bug_work_item_map`, `tickets` unique index, `test_run_results.linked_work_item_id` + FK left `NOT VALID`. RLS `tenant_isolation` policy and `streamline_app` grants on both new tables. | `b-qa-bug-01-expand-rollback.sql` |
| 2 Backfill | `b-qa-bug-02-backfill.sql` | Seeds missing project states, creates one BUG work item per bug, populates the map, sidecar, relations, evidence pointers and activity. Reads `bugs`, never writes it. | `b-qa-bug-02-backfill-rollback.sql` |
| 3 Verify | `b-qa-bug-03-verify.sql` | 14 read-only assertions, each expecting 0, plus a legacy→canonical status distribution for the change record. | n/a |
| 4 Freeze | `b-qa-bug-04-contract-freeze.sql` | `VALIDATE` the evidence FK; `REVOKE INSERT, UPDATE, DELETE ON build.bugs`. Applied **after** the application cutover deploy, so any surviving legacy writer raises 42501 instead of re-forking the identity. | `b-qa-bug-04-contract-freeze-rollback.sql` |
| 5 Drop | `b-qa-bug-05-contract-drop.sql` | Drops `test_run_results.linked_bug_id`, `build.bugs`, and the now-unused `bug_priority` type. Destructive; needs a dump. | Restore from dump only |

`bug_status` and `bug_severity` are deliberately **not** dropped in phase 5: the
sidecar still uses both.

Lock exposure. The only statement that touches a large existing table under
`ACCESS EXCLUSIVE` for more than a moment is the new
`uniq_tickets_org_project_id` unique index in phase 1. `lock_timeout = '5s'`
bounds the *wait*, not the build; rule 7 (`:573`) forbids `CONCURRENTLY` because
drizzle-kit wraps migrations in a transaction. Phase 1 should therefore be
applied in a low-traffic window, or the index promoted as a standalone
`CONCURRENTLY` step run outside the migration runner — a decision for whoever
holds the apply window, and one that needs a live database to size.

---

## 6. Deterministic backfill

`b-qa-bug-02-backfill.sql`. Run the whole file in **one** transaction.

**Number allocation without collision.** For each `(org_id, project_id)` with
pending bugs, the start number is
`GREATEST(project_ticket_counters.next_ticket_number, MAX(tickets.ticket_number)+1, 1)`
— the same self-healing rule `allocateTicketNumbers` uses
(`allocate-ticket-number.ts:16-23`), so an out-of-date counter cannot hand out a
number an existing ticket already holds. Each pending bug gets
`start + row_number() OVER (PARTITION BY org_id, project_id ORDER BY bugs.id) - 1`.
Statement 3 then raises the counter to `MAX(ticket_number)+1` with `GREATEST`,
so subsequent application inserts never collide. `uniq_tickets_project_number`
(`ticket-core.ts:100`) is the backstop; a collision aborts the transaction rather
than corrupting the namespace.

**Identity-mapping table.** `build.bug_work_item_map(org_id, bug_id, project_id,
legacy_bug_number, work_item_id, ticket_number, migration_batch, migrated_at)`,
PK `(org_id, bug_id)`, unique `(org_id, work_item_id)` and
`(project_id, legacy_bug_number)`. It has a foreign key to `organizations` and to
`tickets` but **deliberately none to `bugs`**, so the ledger survives phase 5 and
remains the permanent answer to "what did bug N become". Every later statement in
the backfill is keyed off it, which is what makes the run resumable.

**Idempotence.** Statement 2 selects only bugs with no map row, so a completed run
leaves nothing pending. Statements 3-7 use `GREATEST`, `ON CONFLICT … DO NOTHING`,
`IS DISTINCT FROM` and `NOT EXISTS`. Running the file twice is a no-op. Statement
2 has **no** `ON CONFLICT` on the map insert on purpose: a conflict there means
the invariant broke, and the transaction must abort loudly rather than skip a row.

**Order independence.** Every ticket number comes from a `row_number()` over a
fixed `ORDER BY bugs.id`; every status comes from `array_position` over a fixed
chain with an `("order", id)` tie-break; every membership lookup is
`ORDER BY organization_members.id LIMIT 1`. No result depends on physical row
order, batch split, or which project runs first.

**Evidence links preserved.** `linked_test_case_id` → sidecar column with a
composite FK. `test_run_results.linked_bug_id` → new `linked_work_item_id`
(statement 6), both columns live until phase 5. `linked_ticket_id` → a
`work_item_relations` row (statement 5), self-links filtered out, `ON CONFLICT
(work_item_id, related_work_item_id) DO NOTHING` because
`uniq_work_item_relation` is a unique *index*, not a constraint
(`ticket-core.ts:174`).

**Activity.** Statement 7 writes one `ticket_activity_log` `created` row per
migrated work item, actor resolved from `created_by` then `reporter_id`, stamped
with the bug's original `created_at`. Guarded by `NOT EXISTS` on
`(org_id, ticket_id, action='created')`. The nine-state history itself was never
recorded — `bugs` has no activity table — so there is no per-transition history
to preserve; §7 covers how new transitions are logged.

**Bugs whose project no longer exists.** Structurally impossible while
`fk_bugs_org_project` (`qa.ts:169`) is `VALID`, because it is `ON DELETE CASCADE`.
The backfill still inner-joins `build.projects`, so such rows are skipped rather
than crashing the run, and `b-qa-bug-03-verify.sql` counts them explicitly. A
non-zero count means that FK is `NOT VALID` with legacy violators — a finding to
escalate, not to migrate around.

**Known bypass.** The backfill inserts into `tickets` directly and therefore does
not call `reserveTicketCapacity` (`projects-tickets-create.service.ts:113`), so
`project_statuses.wip_limit` (`core.ts:142`) is not enforced for migrated rows. A
project with a WIP limit of 5 can finish the migration over its limit. This is
correct — refusing to migrate a defect because a board column is full would lose
data — but the limit will read as breached on the first post-cutover board load.

---

## 7. Ticket/bug compatibility after cutover

| Route | Behaviour after cutover |
|---|---|
| `GET /build/:projectId/bugs` | Serves the same `bugRowSchema` shape (`dto/qa-response.schemas.ts:108-136`) projected from `tickets JOIN work_item_qa_details`, filtered to `type='BUG'`. `id` and `bugNumber` are served from `bug_work_item_map` for migrated rows and from `ticket_number` for new ones, so existing clients keep working unchanged. |
| `GET /build/:projectId/bugs/:bugId` | Same projection. `:bugId` is resolved through the map first, then falls back to `ticket_number`, so old bookmarks keep resolving. |
| `POST /build/:projectId/bugs` | Creates a `type='BUG'` work item through the canonical path — `allocateTicketNumbers`, `reserveTicketCapacity`, `ticket_activity_log` — plus one sidecar row. `bugNumber` in the response becomes the ticket number. |
| `PATCH /build/:projectId/bugs/:bugId` | Splits: canonical fields update `tickets`, QA fields update the sidecar, both in one transaction. A `status` change writes both `qa_state` verbatim and the mapped `tickets.status`, and emits a `status_changed` activity row — a capability bugs never had. `reopen_count` keeps incrementing on the transition into `reopened` (today `bugs.service.ts:130,164`). |
| `DELETE /build/:projectId/bugs/:bugId` | Soft-deletes the work item (`tickets.deleted_at`). The sidecar row stays; the read path filters on the ticket. |
| `POST …/runs/:runId/results/:resultId/bug` | `createBugFromResult` (`test-runs.service.ts:355`) creates a canonical work item and sets `test_run_results.linked_work_item_id`. |
| `GET /build/:projectId/tickets` and the board | Now return BUG work items that were previously invisible. **This is a visible behaviour change**: board counts, `all-work`, My Work, saved views and analytics all grow by the migrated defect count on cutover day. It needs an announcement, not a silent deploy. |

The physical `/bugs` route is retired only in the frontend step
(`build-route-manifest.ts:41-45` already records `CONSOLIDATE` →
`/build/[projectId]/issues?type=BUG`). The backend routes stay as a compatibility
shim for at least one release; removing them is a separate ticket.

---

## 8. Authorization matrix

Real keys, read from the catalog.

| Operation | Gate today | Gate on canonical work items | Delta |
|---|---|---|---|
| List/read defects | `build:bugs:view` (`bugs.controller.ts:48,60`) | `build:tickets:view` (`shared.ts:68`) | **Silent gain** for anyone holding `build:tickets:view` without `build:bugs:view` |
| Create defect | `build:bugs:create` (`:73`) | `build:tickets:create` (`shared.ts:74`) | Same |
| Update defect | `build:bugs:update` (`:85`) | `build:tickets:update` (`shared.ts:80`) | Same |
| Delete defect | `build:bugs:delete` (`:98`) | `build:tickets:delete` (`shared.ts:86`) | Same |
| Assign defect | `build:bugs:update` (assignee is part of the patch) | `build:tickets:assign` (`shared.ts:92`) exists as a *separate* key | **Silent loss** for anyone with `build:bugs:update` but not `build:tickets:assign` |
| Create defect from a failed test result | `build:bugs:create` (`test-runs.controller.ts:162`, mirrored in the UI at `run-execution-page.tsx:108`) | `build:tickets:create` | Same gain/loss profile. Note the surrounding run routes are gated on `build:qa:*` (`:71-147`), so this one route mixes two catalogs |
| Module gate | `@RequireModule("build")` (`bugs.controller.ts:41`) | `@RequireModule("build")` (`projects-tickets.controller.ts:66`) | None |
| Record scope | `assertProjectAccess` (`bugs.service.ts:21,43,57,119,184`) | `resolveProjectAccess` / `assertProjectInOrg` family in `modules/build/core/project-access.ts:17,83,164` | Must be re-asserted per route; the bug service calls it on every method today |

All four `build:bugs:*` keys are defined in
`QA_BUGS_PERMISSIONS`, `modules/rbac/permissions/build.ts:56-78`, alongside
`build:qa:view/manage/execute` at `:38-53`. None of them appears in
`role-defaults.ts`, so grants are per-role data, not code — the blast radius of
a key swap cannot be determined statically and needs a query against
`role_permissions` before cutover.

Recommendations (report only — I did not edit shared RBAC):

1. **Do not retire `build:bugs:*`.** Keep them as the gate on the `/bugs`
   compatibility routes for the deprecation window, and add them as an *alternative*
   accept on the canonical BUG paths, so no one loses access on cutover day.
2. **Resolve the assign asymmetry explicitly.** Either accept
   `build:bugs:update` as sufficient for assigning a BUG work item, or grant
   `build:tickets:assign` to every role that holds `build:bugs:update`. Doing
   neither takes assignment away from QA roles silently.
3. **Add a membership-artifact-catalog entry** for
   `work_item_qa_details.qa_owner_membership_id` in
   `modules/organization/core/membership-artifact-catalog/build.artifacts.ts`,
   mirroring `bugs_qa_owner_membership` at `:194-203`, and retire the two `bugs`
   entries at `:114-123` and `:194-203` in phase 5. A membership pointer with no
   catalog ruling is an unaudited removal path.
4. **Frontend `PERMISSIONS` union.** `build:bugs:*` are declared in
   `frontend/lib/rbac/permission-key-business.ts:88-91`; they must stay while the
   compatibility routes stay.

---

## 9. Frontend workflow impact

All paths relative to `frontend/`.

| File | Change |
|---|---|
| `app/(authenticated)/build/[projectId]/bugs/page.tsx` | Becomes a redirect to `/build/[projectId]/issues?type=BUG`, or keeps rendering the compatibility page during the window |
| `app/(authenticated)/build/[projectId]/bugs/loading.tsx` | Deleted with the route |
| `app/(authenticated)/build/[projectId]/bugs/error.tsx` | Deleted with the route |
| `features/build/bugs/bugs-page.tsx` (383 lines) | Retired. `useCan` calls at `:126-128` and the `usePageState({ permission: "build:bugs:view" })` at `:149` move to the issues board's existing gate |
| `features/build/bugs/bug-sheet.tsx` (455 lines) | Becomes the QA detail panel of the issue sheet: severity, steps, expected/actual, environment, browser/device, releases, QA owner, linked test case |
| `features/build/bugs/bug-schema.ts` | Folded into the issue form schema. **Pre-existing defect:** it declares `linkedTicketId` but **not** `linkedTestCaseId`, although the backend accepts it (`dto/bugs.schemas.ts` `createBugSchema`) — the evidence link can be set by the API and never by the UI |
| `features/build/bugs/bugs-page.test.tsx` (138 lines) | Rewritten against the issues board |
| `hooks/api/build/bugs.ts` (84 lines) | `useBugs`/`useCreateBug`/`useUpdateBug`/`useDeleteBug` re-point at the canonical endpoints; `useCan("build:bugs:view")` at `:29` follows the §8 decision |
| `hooks/api/build/qa-schema.ts` | `bugListContract`/`bugRowContract` must track the new response shape or the envelope decode fails |
| `lib/query-keys/build-work.ts:89-95` | `projects.bugs.list/detail` keys either alias the ticket keys or are removed; leaving both means two caches for one record |
| `lib/build/build-route-manifest.ts:41-45` | Already records `CONSOLIDATE` → `/build/[projectId]/issues?type=BUG`; flip when the route actually goes |
| `lib/build/nav/build-project-catalog.ts:169-175` | The `project-bugs` nav entry (`requiredPermission: "build:bugs:view"`) is removed or re-pointed. **Owned by another workstream — report only** |
| `lib/rbac/route-access/route-access-extension-entries.ts:209-213` | The `/build/[projectId]/bugs` entry maps to `build:bugs:view` and `GET /build/{projectId}/bugs`; must match whatever the route becomes. The `/build/[projectId]/issues` entry at `:374-377` already maps to `build:tickets:view`. **Report only** |
| `lib/rbac/permissions/permission-key-business.ts:88-91` | The four `build:bugs:*` keys; keep for the window |
| `features/build/qa/runs/result-row.tsx:101-106` | "Linked bug" link hardcodes `/build/${projectId}/bugs`; re-point to the issue detail |
| `features/build/qa/runs/result-row.tsx:140-148` | "Create Bug" affordance; keep the label, change the target |
| `features/build/qa/runs/run-execution-page.tsx:108,253` | `useCan("build:bugs:create")` feeding `canCreateBug` |
| `types/projects` | The `Bug` type used by `hooks/api/build/bugs.ts:8` |

Three of these — the nav catalog, the route-access entries, and shared RBAC — are
explicitly out of this workstream's edit scope and are listed for the coordinator.

---

## 10. Regression tests

`backend/src/modules/build/phase-2/qa-bug-consolidation.spec.ts`, with pure
functions in `backend/src/modules/build/qa/phase-2/bug-consolidation-mapping.ts`.
No database, no network, no fixtures.

Placement note: the backend jest config (`package.json`, key `jest`) sets
`roots` to `src`, `evals`, `test/security`, `test/perf`. A spec under
`test/phase-2/` would match **zero** suites and report success while running
nothing, so the spec lives under `src/` where `testRegex` reaches it.

| Requirement | Tests |
|---|---|
| (a) Status mapping total + deterministic over the real enum read from source | 6 tests over `bugStatusEnum.enumValues`: every value mapped, no extra keys, every target a real `state_group`, NULL and unknown resolve to a non-terminal group, repeated calls agree, only `verified`/`closed` reach `completed`. Plus 3 tests on the fallback chains (defined for every group, a total permutation, `cancelled` last) and 7 on the per-project resolver (order-independent, `id` tie-break, NULL `type` treated as `unstarted`, chain fallback, empty-project seeding, total over every group). |
| (b) Severity/priority mappings total | 4 priority tests (total over `bugPriorityEnum`, targets within `ticketPriorityEnum`, injective, NULL/unknown → the column default) and 4 severity tests (total over `bugSeverityEnum`, valid targets, NULL/unknown deterministic, severity is a suggestion and does not override `bugs.priority`). |
| (c) Tripwire on the current dual-identity state | 8 tests that pass today and fail once consolidation lands: `build.bugs` is declared, `bug_number` coexists with `ticket_number`, both bug writers still use `MAX+1` under an advisory lock and never `allocateTicketNumbers`, `test-runs.service.ts` still inserts straight into `bugs`, there is no `bug_comments`/`bug_attachments`/`bug_watchers`, `test_run_results` has `linked_bug_id` and no `linked_work_item_id`, no `work_item_qa_details`/`bug_work_item_map`, and the bug controller's permission keys are disjoint from `build:tickets:*`. |
| (d) No column silently dropped | 6 tests: every real `bugs` column has a disposition, no disposition names a non-existent column, every disposition carries a destination and a reason, no disposition is `drop`, every shared column other than the surrogate key routes to the work item, and all four relationship-bearing QA columns route to sidecar **columns** rather than JSONB. |
| Recorded premises | 4 tests pinning the facts the design rests on: the exact 9-value `bug_status` list, that `tickets.status` is `text` with `fk_tickets_status` onto `project_statuses.name`, the exact 15-column difference (which is what refutes the "10 columns" claim), and that `bugs` has no `version` column while `tickets` does. |

43 tests, 1 suite.

---

## 11. Open items needing a database

1. Whether `build.bugs`, `build.tickets` and the rest of `build.*` have RLS
   enabled. `migrations/1126_build_project_updates.sql` creates a `build.*` table
   with grants and **no** `ENABLE ROW LEVEL SECURITY`, while
   `migrations/1137_employee_support_queues.sql:98-107` does enable it on a
   `public` table. The expand file follows the 1137 pattern for both new tables;
   if `build.*` turns out to be uniformly RLS-free, the policy must be dropped for
   consistency rather than left as a lone enforcement point. `pnpm db:verify-rls`
   answers this and needs a connection.
2. Actual row counts, so the phase-1 unique-index build can be sized against the
   lock window.
3. Whether `fk_bugs_org_project` is `VALID` in production, which decides whether
   the orphan branch in §6 is dead code or a real case.
4. The `role_permissions` distribution behind §8 — how many principals hold
   `build:bugs:update` without `build:tickets:assign`.
