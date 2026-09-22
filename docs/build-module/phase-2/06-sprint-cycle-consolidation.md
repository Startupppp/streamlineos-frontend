# P0 #6 — Sprint/Cycle consolidation

Workstream A, Build Phase 2. Static design and tests only. No database was reached while writing this: the
only Postgres this machine can see is the production Aurora cluster named in `backend/.env`, so every claim
below is anchored to a file and line that was read, and every SQL file is unapplied and unverified.

Artefacts:

| Artefact | Path |
|---|---|
| SQL, phases 01–05 and their rollbacks | `backend/docs/phase-2/sql/a-sprint-cycle-*.sql` |
| Tests | `backend/src/modules/build/phase-2/sprint-cycle-consolidation.spec.ts` |

---

## 1. Source verification

Every claim carried into this workstream from `docs/build-module/PHASE-1-STATUS.md` lines 92–115 and
`docs/build-module/02-schemas.md`, checked against source.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `build.sprints` exists with text status PLANNED/ACTIVE/COMPLETED, goal, dates | TRUE | `backend/src/db/schema/build/core.ts:98-130`; status is `text` defaulting `PLANNED` at `:111`, `chk_sprints_status` at `:125-128` |
| 2 | `build.cycles` exists with a pg enum, description, `createdBy` NOT NULL | TRUE | `backend/src/db/schema/build/core.ts:154-183`; enum at `:165`, description `:164`, `createdBy … .notNull()` `:168-170` |
| 3 | Tickets carry both `sprintId` and `cycleId` with separate composite FKs | TRUE | `backend/src/db/schema/build/ticket-core.ts:40` and `:59`; `fk_tickets_org_cycle` `:85`, `fk_tickets_org_sprint` `:87` |
| 4 | Two live controllers, `SprintsController` and `CyclesController` | TRUE | `backend/src/modules/build/execution/iterations.controller.ts:62-64` and `:132-134` |
| 5 | Frontend `/cycles` is wired | PARTIALLY TRUE | routes exist at `frontend/app/(authenticated)/build/[projectId]/cycles/page.tsx` and `.../[cycleId]/page.tsx`, but only list and create hooks exist (`frontend/hooks/api/build/advanced.ts:85-102`). There is no update or delete hook, and the detail page resolves a cycle by scanning the list (`frontend/features/build/cycles/cycle-detail-page.tsx:65,81`) |
| 6 | "~40 frontend files still use `sprintId`/`useSprints`" | FALSE — undercount | 67 files by that exact criterion, 72 across the whole sprint surface. Enumerated in §7 |
| 7 | Board reads both `?cycle=` and `?sprint=` | TRUE | `frontend/features/build/views/use-board-url-state.ts:66-67`, cleared together at `:378-379` |
| 8 | `02-schemas.md:39` targets "no Sprint table after migration" | TRUE | verbatim in the Cycle row of the canonical-entity table |
| 9 | `02-schemas.md:82` makes Sprint/Cycle reconciliation step 2 of the migration order | TRUE | "Reconcile Sprint/Cycle records into one Cycle identity; migrate ticket references, permissions, events, saved views, reports, and URLs" |

### Claims the existing docs get wrong

- **The "~40 files" estimate is low by roughly 70%.** 67 frontend files reference `sprintId` or a sprint hook.
- **PHASE-1-STATUS lists the ticket FK as the dominant cost.** Tickets are one of *four* tables pointing at
  `build.sprints`; `build_events.sprint_scope_events.sprint_id` is `NOT NULL`
  (`backend/src/db/schema/build/sprint-events.ts:22-23`) and is the only one that cannot be nulled out.
- **PHASE-1-STATUS omits the two hardest asymmetries**: `cycles` has no `deleted_at` while `sprints`
  soft-deletes, and `cycles.created_by` is `NOT NULL` with no sprint-side source.
- **Declaration/migration constraint-name drift.** The Drizzle declarations name the sprint FKs
  `fk_tickets_org_sprint`, `fk_project_meetings_org_sprint`, `fk_test_runs_org_sprint`,
  `fk_sprint_scope_events_org_sprint`. None of those names appears in any file under `backend/migrations/`.
  What the applied migrations created is `fk_tickets_sprint_id_org`, `fk_project_meetings_sprint_id_org`,
  `fk_test_runs_sprint_id_org` (`backend/migrations/0579_tenant_fks_build_schemas.sql:1201` and siblings)
  plus the Drizzle-generated `*_sprint_id_sprints_id_fk` family. Phase 04 drops all three name families.

### Column inventory

`build.sprints` — `backend/src/db/schema/build/core.ts:98-130`

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | integer identity, PK | no | generated always |
| `org_id` | text → `organizations.id` cascade | no | — |
| `project_id` | integer | no | — |
| `name` | text | no | — |
| `start_date` | timestamp (no tz) | no | — |
| `end_date` | timestamp (no tz) | no | — |
| `goal` | text | yes | — |
| `status` | text | no | `'PLANNED'` |
| `deleted_at` | timestamptz | yes | — |
| `created_at` | timestamp | no | `now()` |
| `updated_at` | timestamp | no | `now()` |

`build.cycles` — `backend/src/db/schema/build/core.ts:154-183`

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | integer identity, PK | no | generated always |
| `project_id` | integer | no | — |
| `org_id` | text → `organizations.id` cascade | no | — |
| `name` | text | no | — |
| `description` | text | yes | — |
| `status` | `cycle_status` enum | no | `'draft'` |
| `start_date` | **date** | no | — |
| `end_date` | **date** | no | — |
| `created_by` | text → `users.id` | **no** | — |
| `created_at` | timestamp | no | `now()` |
| `updated_at` | timestamp | no | `now()` |

Four asymmetries fall out: no `goal` on cycles, no `description` on sprints, no `deleted_at` on cycles,
no sprint source for `created_by`. Plus the `timestamp` → `date` width change on both date columns.

### Status vocabularies, read from source

- `build.sprints.status`: `text`, `NOT NULL`, default `'PLANNED'`, constrained to
  `('PLANNED','ACTIVE','COMPLETED')` by `chk_sprints_status` (`core.ts:125-128`). Same three values in the
  request contract at `backend/src/modules/build/execution/dto/iterations.schemas.ts:40`.
- `build.cycles.status`: pg enum `cycle_status`, values `['draft','active','completed']`
  (`backend/src/db/schema/common/enums.ts:25`), `NOT NULL`, default `'draft'`. Same three values in the
  request contracts at `iterations.schemas.ts:90` and `:105`.

The enum is lowercase and the text column is uppercase. Nothing in the codebase compares them.

### Every FK involving `sprint_id` or `cycle_id` in the Build schemas

| Constraint (declaration name) | Table | Columns | Target | On delete |
|---|---|---|---|---|
| `fk_tickets_org_sprint` | `build.tickets` | `(org_id, sprint_id)` | `build.sprints(org_id, id)` | set null |
| `fk_tickets_org_cycle` | `build.tickets` | `(org_id, cycle_id)` | `build.cycles(org_id, id)` | set null |
| `fk_project_meetings_org_sprint` | `build.project_meetings` | `(org_id, sprint_id)` | `build.sprints(org_id, id)` | set null |
| `fk_test_runs_org_sprint` | `build.test_runs` | `(org_id, sprint_id)` | `build.sprints(org_id, id)` | set null |
| `fk_sprint_scope_events_org_sprint` | `build_events.sprint_scope_events` | `(org_id, sprint_id)` | `build.sprints(org_id, id)` | cascade |
| `fk_sprints_org_project` | `build.sprints` | `(org_id, project_id)` | `build.projects(org_id, id)` | cascade |
| `fk_cycles_org_project` | `build.cycles` | `(org_id, project_id)` | `build.projects(org_id, id)` | cascade |

Sources: `ticket-core.ts:85,87`, `meetings.ts:46`, `qa.ts:95`, `sprint-events.ts:35`, `core.ts:120,178`.
There is no `cycle_id` on `project_meetings`, `test_runs` or `sprint_scope_events` today. All `cycle_id`
columns elsewhere in the repo (`hr/performance.ts`, `hr/feedback.ts`, `hr/enterprise-comp.ts`) belong to HR
review/comp/feedback cycles and are unrelated.

### Sprint references, counted

**Backend: 121 `.ts` files** contain the string `sprint` (case-insensitive) under `backend/src/`. The ones
that carry behaviour rather than a passing mention:

- Schema: `build/core.ts`, `build/ticket-core.ts`, `build/meetings.ts`, `build/qa.ts`,
  `build/sprint-events.ts`, `build/relations.ts` (`:56-57`, `:88`, `:234`), `build/index.ts`.
- Execution module: `iterations.controller.ts`, `sprints.service.ts`, `dto/iterations.schemas.ts`,
  `dto/execution-response.schemas.ts`, `build-sprint-completed-consumer.service.ts`,
  `dto/build-sprint-completed-payload.schema.ts`.
- Core module: `projects-velocity-report.ts`, `projects-burnup.util.ts`, `projects-reports.service.ts`,
  `projects-tickets-read.query.ts` (`:25`), `projects-tickets-update.service.ts`, `dto/ticket.schemas.ts`
  (`:69-71`, `:115-116`, `:163-165`, `:192-199`, `:219-227`), `dto/analytics.schemas.ts`.
- Cross-module: `dashboard/dashboard-project.service.ts`, `dashboard/dashboard-section-registry.ts`,
  `ai/core/tools/work-actions-tools.ts`, `ai/core/confirm-actions/build-confirm-actions.ts`,
  `notifications/notification-events-build.catalog.ts`, `rbac/permissions/shared.ts:98-105`,
  `rbac/role-templates-build.constants.ts:15,79-80`, `common/slo/slo-modules.ts`.

**Frontend: 72 files.** Classified in §7.

---

## 2. Canonical identity: Cycle

Confirmed, and the source agrees with the doc rather than contradicting it.

- `02-schemas.md:39` already names Cycle canonical and Sprint absent after migration; `:82` makes the
  reconciliation step 2 of the ordered plan; the acceptance criterion at the bottom of that file reads
  "Cycle and BUG have one canonical identity each".
- Only Cycle has a typed status. `sprints.status` is `text` guarded by a CHECK; `cycles.status` is a real
  `pg_enum`. Collapsing onto the enum removes a `z.string()`-over-a-text-column class of contract defect.
- Only Cycle has a frontend route. There is no `/build/[projectId]/sprints` page anywhere under
  `frontend/app/`; `/cycles` and `/cycles/[cycleId]` both exist.
- Cycle is the newer identity: `build.cycles` participates in the composite-FK convention and carries an
  authorship column; `build.sprints` predates it.

The one argument for Sprint is that it is the better-used identity — it has a velocity report, a burnup
report, an outbox event, a scope-event ledger and nine frontend consumers, where Cycle has a list, a create
and a progress percentage. That is an argument for *carrying Sprint's capabilities onto Cycle*, which §3 and
the expand phase do, not for keeping the Sprint table.

### Merged column set for `build.cycles`

| Column | Source | Disposition |
|---|---|---|
| `id` | cycles | keep; sprints ids are **not** carried across (see §5, collision rule) |
| `org_id` | both | keep |
| `project_id` | both | keep |
| `name` | both | carry |
| `description` | cycles only | keep, left NULL for migrated sprints |
| `goal` | sprints only | **carry as a new `goal text` column**, not folded into `description` |
| `status` | both | carry through the §3 mapping |
| `start_date` | both | carry, `timestamp → date` |
| `end_date` | both | carry, `timestamp → date` |
| `created_by` | cycles only | keep NOT NULL; derive for migrated sprints (§5) |
| `deleted_at` | sprints only | **add to cycles**; carry |
| `created_at` | both | carry |
| `updated_at` | both | carry |
| `legacy_sprint_id` | new | provenance; the only durable link between a cycle and the sprint it came from |

Per-column decision for every `sprints` column: `id` → **drop** (replaced, mapped); `org_id` → **carry**;
`project_id` → **carry**; `name` → **carry**; `start_date` → **map** (cast to date); `end_date` → **map**
(cast to date); `goal` → **carry** into a new column; `status` → **map** (§3); `deleted_at` → **carry** into
a new column; `created_at` → **carry**; `updated_at` → **carry**.

`goal` is kept separate from `description` deliberately. Merging them would make the split irreversible and
would silently change what the cycle detail page renders as a description.

The `timestamp → date` cast discards the time-of-day component of every sprint boundary. This is a real
loss. It is accepted because `02-schemas.md` fixes date-only values at `YYYY-MM-DD`, because `cycles` is the
canonical target and is already `date`, and because `build.sprints_archive` (phase 05) retains the original
timestamps. Widening `cycles` to `timestamp` instead would break every existing cycle consumer.

---

## 3. Status mapping

Total, deterministic, and derived from the vocabularies read in §1 rather than from memory.

| `sprints.status` | `cycle_status` | Why |
|---|---|---|
| `PLANNED` | `draft` | both are the pre-start state and both are the column default |
| `ACTIVE` | `active` | 1:1 |
| `COMPLETED` | `completed` | 1:1 |
| `NULL` | `draft` | the column is NOT NULL in the declaration, but a migration must be total; `draft` matches the target column default |
| `''` or whitespace | `draft` | same |
| any other string | `draft` | fail toward the least-progressed state; never invent `active` or `completed` |

Matching is on `upper(btrim(coalesce(status,'')))`, so case and surrounding whitespace do not change the
result. The mapping is injective over the three declared values — no two sprint states collapse into one
cycle state — and idempotent under repeated evaluation.

`draft` rather than `completed` is the fallback because the wrong `completed` is the more damaging error:
`build.sprint.completed` consumers, the velocity report and the burnup report all key on the completed
state, and a spurious completion would emit user-visible notifications.

The mapping lives in exactly one place — the `CASE` expression in `a-sprint-cycle-02-backfill.sql` — and the
spec parses that expression out of the file, so the SQL and the documented table cannot drift apart silently.

---

## 4. Migration plan

Five phases. Each is one file, individually applicable and individually reversible by the sibling
`-rollback.sql`.

| Phase | File | Effect | Reversible by |
|---|---|---|---|
| 01 EXPAND | `a-sprint-cycle-01-expand.sql` | adds `cycles.legacy_sprint_id`, `cycles.goal`, `cycles.deleted_at`; adds `cycle_id` to the three satellites; creates `build.sprint_cycle_migration_map` and `build.sprint_binding_archive` with RLS and grants; adds the three new FKs `NOT VALID` | drop the objects; no existing row changed |
| 02 BACKFILL | `a-sprint-cycle-02-backfill.sql` | inserts one cycle per sprint, populates the map, archives every pre-migration binding, rebinds pointers | restore pointers from the archive, delete cycles `WHERE legacy_sprint_id IS NOT NULL` |
| 03 CONSTRAIN | `a-sprint-cycle-03-constrain.sql` | validates the three FKs, promotes `sprint_scope_events.cycle_id` to NOT NULL through the two-step, adds the cycle-side indexes, `ANALYZE` | drop NOT NULL and the indexes, re-add the FKs `NOT VALID` |
| 04 DETACH | `a-sprint-cycle-04-detach.sql` | drops the four `sprint_id` columns and all three constraint-name families | re-add the columns, restore from the archive, re-add FKs and indexes |
| 05 DROP | `a-sprint-cycle-05-drop.sql` | copies `build.sprints` to `build.sprints_archive`, drops `build.sprints`, renames `sprint_scope_events` → `cycle_scope_events` and its enum | recreate the table from the archive with `OVERRIDING SYSTEM VALUE`, `setval` the identity above the restored max, reverse both renames |

Phases 04 and 05 are the only destructive ones and `02-schemas.md:88` already gates them: "remove duplicate
tables/columns only after parity reports and rollback windows close". Run them in a separate release.

### Gate the repo enforces

`backend/src/scripts/check-migration-discipline.mjs`, wired as `pnpm check:migration-discipline`
(`backend/package.json`). Seven checks; the four that bind here:

- **lock_timeout** — `checkLockTimeout`, line 496. Every migration must `SET lock_timeout`. All ten files
  set `'5s'`, the value the recent house migrations use (`migrations/1137_employee_support_queues.sql:12`).
- **FK NOT VALID** — `checkFkNotValid`, line 501. `ADD CONSTRAINT … FOREIGN KEY` must carry `NOT VALID`.
  All FK additions here do; `VALIDATE CONSTRAINT` is a separate statement in a later phase.
- **NOT NULL two-step** — `checkSetNotNullTwoStep`, line 512. `SET NOT NULL` must be preceded by
  `CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE`. Phase 03 does exactly that for
  `sprint_scope_events.cycle_id` and drops the scaffold CHECK afterwards.
- **validate-before-backfill** — `checkValidateBeforeBackfill`, line 536, the 0665 defect. The backfill
  `UPDATE` must precede the first `VALIDATE CONSTRAINT` *in the same file*. Phase 03 therefore opens with a
  defensive re-run of the phase 02 backfill before its first `VALIDATE`, so it cannot abort on a database
  where phase 02 was interrupted.

Two more apply mechanically: no `--> statement-breakpoint` inside a `DO $$ … $$` block
(`checkDoBlockBreakpoint`, line 551) and no `CREATE INDEX CONCURRENTLY` (`checkConcurrently`, line 569 —
drizzle-kit wraps migrations in a transaction). All ten files comply and the spec asserts each of the six.

The gate only scans `backend/migrations/`. These files live under `backend/docs/phase-2/sql/`, so the gate
does not see them; the spec is what holds them to the same rules until the coordinator promotes them,
renumbers them and adds their `_journal.json` entries (check 6).

One more requirement the gate does not check but the repo does: a composite `ON DELETE SET NULL` foreign key
needs an explicit column list, `ON DELETE SET NULL ("cycle_id")` — the house form at
`migrations/0607_vault_access_logs_survive_document_deletion.sql:53`. Without it Postgres tries to null the
tenant column too. The spec asserts this for every composite SET NULL FK in these files.

---

## 5. Backfill, and the conflict rule for every case

`a-sprint-cycle-02-backfill.sql`. Idempotent — re-running leaves every table byte-identical — and
order-independent: every statement is set-based, no statement reads a clock or a random source, and every
tie-break names a full key.

### ID collisions between the two tables

`build.sprints.id` and `build.cycles.id` are independent `GENERATED ALWAYS AS IDENTITY` sequences, so
sprint 5 and cycle 5 both exist and mean different things. **Rule: sprint ids are not preserved.** Each
sprint gets a freshly generated cycle id. The correspondence is recorded twice — in
`build.cycles.legacy_sprint_id` (unique per org, partial index) and in `build.sprint_cycle_migration_map`
`(org_id, sprint_id) → cycle_id`. Re-running is guarded by
`NOT EXISTS (SELECT 1 FROM cycles WHERE org_id = s.org_id AND legacy_sprint_id = s.id)`, so a second run
inserts nothing. The map is the durable, queryable translation table for any consumer that still holds a
sprint id — a saved view, a bookmarked URL, a webhook payload.

### `cycles.created_by` is NOT NULL and sprints has no equivalent

Dropping the NOT NULL would be a wire-contract break: `cycleListItemSchema.createdBy` and
`cycleRowSchema.createdBy` are both `z.string()`, non-nullable
(`backend/src/modules/build/execution/dto/execution-response.schemas.ts:64` and `:81`).

**Rule: keep NOT NULL and derive, with a three-step deterministic chain.**

1. the project's manager, `organization_members.user_id` for `projects.manager_membership_id`;
2. else the organization's owner, via `organizations.owner_membership_id` — `NOT NULL` at
   `backend/src/db/schema/common/auth.ts:28`, with a single-owner unique index at `:104`;
3. else `min(organization_members.user_id)` for the org — deterministic, and non-null for any org that owns
   a project.

If all three yield NULL the row is not inserted and the closing assertion raises, so the phase fails loudly
rather than committing a partial merge.

The derived value is attribution, not recorded authorship. `legacy_sprint_id IS NOT NULL` marks every row
where that is true, and the API should not render "created by X" for those rows without qualification.

### Tickets with both `sprint_id` and `cycle_id`

Four cases, resolved before any pointer moves and recorded in `build.sprint_binding_archive`:

| Case | Rule | Archive `resolution` |
|---|---|---|
| `sprint_id` set, `cycle_id` NULL | `cycle_id := map(sprint_id)` | `mapped` |
| both set, `cycle_id = map(sprint_id)` | no change | `agreed` |
| both set, `cycle_id <> map(sprint_id)` | **`cycle_id` wins, unchanged** | `cycle_wins` |
| `sprint_id` set, no map row | leave `cycle_id` as it is | `orphan_sprint` |
| both NULL | no change, not archived | — |

`cycle_id` wins on disagreement because Cycle is canonical, because the board already drives off `?cycle=`,
and because the cycle binding is the one a user set through the surviving UI. The rule is expressed
structurally, not procedurally: the rebinding `UPDATE` carries `AND t."cycle_id" IS NULL`, so a disagreeing
row is untouched by construction and a re-run cannot flip it. The discarded sprint binding is preserved in
the archive, so the decision is auditable and reversible.

### Orphan rows

- **Soft-deleted sprints are migrated too.** A ticket can point at a soft-deleted sprint — the composite FK
  checks existence, not `deleted_at`. Skipping them would strand those tickets when the column is dropped.
  The new `cycles.deleted_at` carries the flag across, so they stay invisible to live reads.
- **A `sprint_id` with no sprint row** would require an unvalidated FK. The backfill LEFT JOINs the map,
  leaves such a ticket's `cycle_id` untouched and records it as `orphan_sprint`.
- **`sprint_scope_events`** has `sprint_id NOT NULL`, so every row must resolve. The closing assertion
  raises if any `cycle_id` is still NULL after the run, and phase 03 promotes the column to NOT NULL.

### The two invariants this backfill will violate, by design

`CyclesService` enforces two rules that `SprintsService` never did, and both are service-level only — there
is no exclusion constraint and no partial unique index backing either:

- **No overlapping cycle date ranges per project** — `cycles.service.ts:73-90`. Sprints overlap freely.
- **At most one `active` cycle per project** — `cycles.service.ts:110-121`.

The backfill cannot enforce either without discarding data, so it does not try. Both will therefore be false
for historical rows after the merge. The consequence is bounded and specific: a `PATCH` that sets a cycle to
`active` in a project that already has two or more active cycles returns 409 and the user cannot proceed.

Do not paper over this in the backfill. Either relax the check to "at most one active cycle created after
the migration", or run a separate, explicitly optional reconciliation: within each `(org_id, project_id)`,
keep `active` on the row with the greatest `start_date` (tie-break greatest `id`) and demote the rest to
`completed` if their `end_date` precedes the kept row's `start_date`, else to `draft`. That rule is
deterministic and row-order independent, but it rewrites pre-existing cycles, so it needs its own decision
and its own snapshot. It is deliberately not part of phase 02.

---

## 6. API compatibility

### `SprintsController` — `backend/src/modules/build/execution/iterations.controller.ts:62-129`

| Route | Permission | Disposition |
|---|---|---|
| `GET /build/:projectId/sprints` | `build:sprints:view` | keep as a deprecated alias delegating to `CyclesService.listCycles`, then remove with the Sprint table |
| `POST /build/:projectId/sprints` | `build:sprints:manage` | **remove at phase 01.** A write that creates a new `build.sprints` row during the migration window creates a row the backfill may already have walked past |
| `GET /build/:projectId/sprints/:sprintId` | `build:sprints:view` | translate `sprintId` through `sprint_cycle_migration_map`, serve the cycle, then remove |
| `PATCH /build/:projectId/sprints/:sprintId` | `build:sprints:manage` | translate and delegate to `updateCycle`, mapping the request status through §3 |
| `DELETE /build/:projectId/sprints/:sprintId` | `build:sprints:manage` | translate and delegate; note the semantic change below |

Sequencing: freeze writes to `build.sprints` (drop `POST`, route `PATCH`/`DELETE` to the cycle) **before**
phase 02, keep the reads alive as translating aliases through phases 02–04, delete the controller with
phase 05.

### `CyclesController` — `:132-188`, gaps to close first

- **No `GET /build/:projectId/cycles/:cycleId`.** Sprint has a detail route with hydrated tickets and
  assignees (`sprintDetailSchema`); Cycle has none. The frontend detail page compensates by scanning the
  list (`cycle-detail-page.tsx:81`), and `listCycles` is capped at `.limit(100)` (`cycles.service.ts:35`),
  so the 101st cycle in a project is unreachable by URL today. **Add the detail route before consolidating**,
  or every migrated sprint past the cap becomes a 404.
- **Permission asymmetry.** `listCycles` requires `build:sprints:view` (`:138`) while create, update and
  delete require `build:workspace:manage` (`:151`, `:164`, `:177`). Sprint's equivalents require
  `build:sprints:manage`. Pick one vocabulary — `build:sprints:*` is already in the permission catalogue
  (`backend/src/modules/rbac/permissions/shared.ts:98-105`) and in two role templates
  (`role-templates-build.constants.ts:15,79-80`) — and keep both keys granted for one release.
- **Delete semantics differ.** `deleteSprint` soft-deletes (`sprints.service.ts:165-173`). `deleteCycle`
  nulls every ticket's `cycle_id` and then hard-deletes the row (`cycles.service.ts:133-143`). Once
  `cycles.deleted_at` exists, switch `deleteCycle` to a soft delete; otherwise deleting a migrated sprint
  destroys history that used to be recoverable.

### Zod contracts

- `createSprintSchema` / `updateSprintSchema` (`iterations.schemas.ts:17-50`) stay as the alias request
  shapes. `updateSprintSchema.status` accepts `PLANNED|ACTIVE|COMPLETED` and must pass through the §3
  mapping before touching a cycle.
- `createCycleSchema` (`:63-81`) has no `goal`. Add `goal: z.string().optional()` when `cycles.goal` lands,
  and add it to `cycleRowSchema`/`cycleListItemSchema`, otherwise `z.object()` strips the field from every
  response and the sprint goal becomes invisible the moment the alias route is retired.
- `cycleRowSchema` and `cycleListItemSchema` need `deletedAt: wireDate().nullable()` once the column exists.
- `cycleListQuerySchema` (`:104-106`) accepts only `draft|active|completed`. If the deprecated
  `?status=ACTIVE` spelling must keep working, widen it and normalise; do not silently 400.

### The `?sprint=` query parameter

Backend: the ticket list query accepts `sprintId`, `sprintIds` and `cycleId`
(`backend/src/modules/build/core/dto/ticket.schemas.ts:69-71`, `:115-116`). Keep `sprintId`/`sprintIds`
accepted for one release, translate each value through `sprint_cycle_migration_map` and OR it into the
`cycleId` predicate. All three schemas are `.strict()`, so removing the key is a hard 400 for any client
still sending it — the deprecation window is not optional.

Frontend: `?sprint=` is read at `use-board-url-state.ts:67` and declared as a filter category at
`use-ticket-filter-params.ts:20`. Keep reading it, map it onto the cycle filter, stop writing it.

### Events and webhooks

- Outbox `build.sprint.completed` is emitted at `sprints.service.ts:125-139` and consumed by
  `BuildSprintCompletedConsumerService` (`build-sprint-completed-consumer.service.ts:21`). Its payload
  carries `sprintId`. Introduce `build.cycle.completed` with `cycleId`, emit both for one release, and keep
  the sprint consumer registered until no unprocessed `build.sprint.completed` rows remain in the outbox.
- Project webhooks `sprint.started` and `sprint.completed` are dispatched at `sprints.service.ts:144-160`
  and are an external contract. Keep emitting both names alongside `cycle.started`/`cycle.completed`.
- `build_events.sprint_scope_events` is append-only. Phase 04 drops its `sprint_id`, phase 05 renames the
  table to `cycle_scope_events` and the enum `sprint_scope_event_type` to `cycle_scope_event_type`.

---

## 7. Frontend compatibility — 72 files, enumerated

Not "~40". Counted with ripgrep over `frontend/` excluding `node_modules`.

**Group A — call the sprints API or define its contracts (13).** These change when the routes change.

`hooks/api/build/sprints.ts`, `hooks/api/build/execution-schema.ts`,
`hooks/api/build/execution-schema.test.ts`, `hooks/api/build/mutation-invalidation.test.ts`,
`features/build/backlog/project-backlog-page.tsx`, `features/build/backlog/project-backlog-page.test.tsx`,
`features/build/meetings/meetings-list-page.tsx`, `features/build/meetings/meetings-list-page.test.tsx`,
`features/build/project-detail/project-board-page.tsx`,
`features/build/ticket-details/use-ticket-detail.ts`,
`features/build/ticket-details/use-ticket-detail.test.tsx`,
`features/build/views/card-inline-extra-fields.tsx`, `features/build/views/workload-filter-bar.tsx`.

**Group B — carry `sprintId` as a ticket field, filter key, query key or type (54).** These change when the
ticket response contract drops `sprintId`.

`features/build/all-work/{all-work-access-gate.test.tsx, all-work-list-section.tsx, all-work-ticket-utils.ts}`,
`features/build/cycles/cycle-detail-page.tsx`, `features/build/epics/epic-rollup.test.ts`,
`features/build/meetings/{generate-agenda.ts, meetings-columns.tsx}`,
`features/build/my-tickets/{map-board-ticket.ts, map-board-ticket.test.ts, my-tickets-page.tsx, my-tickets-page.test.tsx}`,
`features/build/my-work/{map-all-work-ticket.ts, use-my-work-data.ts}`,
`features/build/reports/burnup-section.tsx`,
`features/build/shared/{filter-category-submenu.tsx, filter-flat-search.tsx, types.ts, use-ticket-filter-params.ts, use-ticket-filter-params.test.ts}`,
`features/build/ticket-details/{sidebar-select-fields.tsx, ticket-detail-right-panel.tsx, ticket-sidebar.tsx}`,
`features/build/views/{calendar-view.tsx, list-view-shared.ts, project-board-content.test.tsx, table-view.tsx, table-view-types.ts, workload-filter-menu.tsx, workload-filter-submenu.tsx, workload-filter-types.ts, workload-types.ts, workload-view.tsx}`,
`hooks/api/build/{__tests__/ticket-detail-comments-contract.test.ts, board-server-filter.test.ts, build-tickets-core-schema.ts, build-tickets-subresource-schema.ts, meetings-schema.ts, optimistic-create.test.ts, qa-schema.ts, reports.ts, reports-schema.ts, ticket-cache.ts, ticket-create-rank-mutations.ts, ticket-detail-assignees-contract.test.ts, ticket-list-contract.test.ts, ticket-queries.ts, ticket-update-mutation.ts}`,
`lib/query-keys/{accounting-and-support.ts, build-work.ts}`, `lib/validation/projects.ts`,
`types/projects/{meetings.ts, qa.ts, sprints.ts, tasks.ts}`.

**Group C — barrels, labels and copy (5).** `hooks/api/build/index.ts:7` (`export * from "./sprints"`),
`types/projects/index.ts:3`, `features/build/overview/project-overview-page.test.tsx`,
`features/build/project-create/steps/step-toggles.tsx` (the per-project `settings.modules.sprints` toggle,
declared at `backend/src/db/schema/build/core.ts:52`), `lib/build/build-project-catalog.test.ts`.

A further 92 files match `sprint` case-insensitively but are marketing copy, blog posts, illustrations and
unrelated fixtures. They are not part of this migration.

**Order.** Group A first, behind the alias routes. Group B only after the backend stops returning `sprintId`
on tickets — a projection that omits a field the client still destructures renders as an empty state rather
than an error. Group C last. Leave `?sprint=` readable throughout; bookmarked board URLs outlive releases.

---

## 8. Rollback

Every phase has a sibling `-rollback.sql`. Reverse order, and note where reversibility is qualified.

| Phase | Rollback | Data loss on rollback |
|---|---|---|
| 01 | `a-sprint-cycle-01-expand-rollback.sql` | none — phase 01 changed no existing row |
| 02 | `a-sprint-cycle-02-backfill-rollback.sql` | none for pre-migration data. Cycles created by the backfill are deleted, keyed on `legacy_sprint_id IS NOT NULL`, never on an id range or a timestamp. Pre-existing cycles carry `legacy_sprint_id IS NULL` and are untouched. Any edit a user made to a *migrated* cycle during the window is lost with it |
| 03 | `a-sprint-cycle-03-constrain-rollback.sql` | none. A validated constraint cannot be un-validated in place, so each FK is dropped and re-added `NOT VALID` |
| 04 | `a-sprint-cycle-04-detach-rollback.sql` | none, provided `build.sprint_binding_archive` is intact — it holds every dropped `sprint_id`. Refuses to run if the archive is short, by the assertion at the head of the forward file |
| 05 | `a-sprint-cycle-05-drop-rollback.sql` | none, provided `build.sprints_archive` is intact. Recreates the table with `OVERRIDING SYSTEM VALUE` and `setval`s the identity above the highest restored id so new inserts cannot collide |

Ordering constraint: `05-rollback` recreates `build.sprints`, and `04-rollback` re-adds foreign keys that
reference it, so 05 must be rolled back before 04, not after.

Neither archive table may be dropped while a rollback window is open. Both carry RLS and a tenant policy.

The window to hold open is at least one full release plus the outbox drain for `build.sprint.completed`.

---

## 9. Tests

`backend/src/modules/build/phase-2/sprint-cycle-consolidation.spec.ts` — 99 tests, 1 suite, no database.

Placed under `src/` rather than `test/phase-2/` because the backend jest config (`backend/package.json`,
key `jest`) sets `roots` to `src`, `evals`, `test/security`, `test/perf`. A spec under `test/phase-2/`
matches zero suites and reports success while running nothing.

Three groups:

1. **Vocabulary and mapping.** Parses the `cycle_status` members out of `enums.ts`, the
   `chk_sprints_status` vocabulary out of `core.ts`, both column defaults, and the `CASE` arms out of the
   backfill SQL. Then asserts the mapping is total (every source value has an arm, an `ELSE` exists, NULL is
   routed through `coalesce`), that its targets are all real enum members, that it is injective over the
   declared vocabulary, that it is case- and whitespace-insensitive, and that repeated evaluation returns
   the same target. Also asserts the Zod request contracts agree with the schema vocabularies. Nothing here
   is hardcoded against a remembered value: change the enum and the tests move with it.
2. **SQL discipline.** Re-implements the six checks of `check-migration-discipline.mjs` that apply to a
   file and runs them over all ten SQL files, plus the composite-`SET NULL`-column-list rule the gate does
   not cover. Plus idempotence and determinism shape assertions on the backfill: no clock or random source,
   every `INSERT` guarded, the archive inserts `DO NOTHING`, every `cycle_id` assignment gated on
   `IS NULL`, `org_id` in every predicate that touches the map, and a `RAISE EXCEPTION` on an incomplete run.
   Every loop-based assertion carries a match count so it cannot pass vacuously.
3. **Dual-identity tripwire.** Seven assertions that the *current* split state still holds — both tables
   declared, both ticket columns, both ticket FKs, both controllers mounted, all three satellite FKs, no
   cycle detail route, no `cycles.deleted_at`. Each fails the moment consolidation lands. Each test name
   carries the instruction: delete this assertion in the same change that lands
   `a-sprint-cycle-05-drop.sql`.

Not covered, and not coverable without a database: that the SQL parses, that the backfill produces the row
counts it should, that the FKs validate, and that the `timestamp → date` cast behaves as intended on real
data. Nothing here has been applied anywhere.
