# Build — Next Phase Execution

Written 2026-09-22, re-measured the same day against root `f794b484a` and backend `de8ccd58a`
after the coordinator session landed most of Stage A. This is the runbook for the work that
begins **after** that session finishes. It does not describe, schedule or depend on anything the
session is still editing.

**State at re-measurement:** A1, A1b, A2 and A4 are done; A2 landed in `3d4e5a6a6` on
`build/a2-sprints-table-cutover`. **A5 is the one remaining migration blocker** and A3 is open
but gates nothing. None of the four destructive migrations has been applied.

**Production database state, read-only over IAM on 2026-09-22.** Every figure below was measured
inside a `SET TRANSACTION READ ONLY` transaction; nothing was written.

| Measure | Value | Why it matters |
|---|---|---|
| `tickets.sprint_id` non-null | 103 | all 103 are in `sprint_binding_archive`, so phase 04's guard returns `unarchived = 0` |
| FKs referencing `build.sprints` | 4 | `fk_tickets_org_sprint`, `fk_project_meetings_org_sprint`, `fk_test_runs_org_sprint`, `fk_sprint_scope_events_org_sprint` — phase 05's bare `DROP TABLE` fails `2BP01` until phase 04 removes them |
| `build.sprints` rows | 4 | every one has a cycle counterpart; **0 orphans** |
| `build.cycles` rows | 5, of which 4 carry `legacy_sprint_id` | the legacy endpoints resolve every real sprint id |
| `cycles.goal` populated | 4 of 4 | declaring this column was load-bearing, not cosmetic — without it the sprint contract would have returned `goal: null` for every sprint |
| `cycles.deleted_at` exists | yes | confirms the declaration this change adds matches the live column |
| `fk_cycles_org_legacy_sprint` exists | **no** | the Drizzle schema declared a constraint no migration ever created; removing the declaration corrects real drift |
| `build.bugs` rows | **0** | the QA Bug contraction is a no-op and its verification is vacuous |
| `sprint_scope_events` rows | 0 | no data at risk in the phase-05 rename, but a `SELECT` from a renamed table still fails |

Priority and estimates live in [`06-prioritized-backlog.md`](./06-prioritized-backlog.md). This
document is the how: entry conditions, exact commands, the census that Stage A has to drive to
zero, and the traps that have already cost this programme a session each.

## Where this picks up

Already merged into both repositories' `main` and out of scope here: the Sprint/Cycle backend
application cutover and writer freeze, the QA Bug application cutover, Change Request release and
client-visibility fields, Workload real capacity, Inbox project filtering, offline drafts and
reconnect, the authorization census, and migrations 1149–1151 applied to production.

Owned by the current coordinator session and **not to be touched**:
[`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md),
[`NEXT-CLOSURE-STATUS.md`](./NEXT-CLOSURE-STATUS.md),
[`NEXT-CLOSURE-BROWSER-QA.md`](./NEXT-CLOSURE-BROWSER-QA.md), and the notifications route
migration in progress in the shared working tree.

## The sequence, and why it cannot be reordered

```text
A. application code cutover   reversible, no data loss
B. verification               reversible, proves A is complete
C. deployment                 reversible by rollback
D. destructive migration      NOT reversible in practice
E. browser verification       confirms D changed nothing visible
```

D is the only irreversible stage, and its safety depends entirely on A being **deployed**, not
merely merged. Running D against a revision that is still serving the old code drops a column
that live handlers select, and every affected request returns PostgreSQL `42703` as a hard 500.
The migration will not warn you: its guard is a data check.

## Stage A — the census that must reach zero

### A1 — frontend `sprintId` — DONE

Landed in `36e7402ad`, merged as `f794b484a`. Re-measured at that revision, the census returns
**0** across the whole frontend, and `frontend/hooks/api/build/sprints.ts` and
`frontend/types/projects/sprints.ts` are deleted. Reproduce with:

```bash
cd frontend
grep -rn "sprintId" --include='*.ts' --include='*.tsx' . \
  | grep -v node_modules \
  | grep -vE '(\.test\.|\.spec\.|__tests__)'
```

### A1b — backend `tickets.sprint_id` — DONE

Landed in `e06314424` and `de8ccd58a`. `tickets`, `project_meetings`, `test_runs` and
`sprint_scope_events` no longer declare `sprint_id`. The only `sprint_id` remaining anywhere in
`backend/src/db/schema/` is `cycles.legacy_sprint_id` at `build/core.ts:165`, which phase 05
keeps. Reproduce with `grep -rn "sprint_id" backend/src/db/schema/ --include='*.ts'` — one hit.

Two traps that this cutover had to clear, recorded because they recur:

**Do not replace a value with `null` and keep the field.** That shipped once already. A Zod
contract that accepts `null` cannot tell you the value stopped arriving, and
`frontend/features/build/meetings/generate-agenda.ts` filtered on equality — agendas came back
empty with no error anywhere.

**Grep both forms.** An earlier invariant scanned for `tickets.sprintId` and reported clean while
three files selected the column through Drizzle's relational API as `sprintId: true`. The final
relational read was closed separately in `de8ccd58a` — "the relational sprint read the three
scanners could not see".

### A2 — the `sprints` table access path — DONE

Landed in `3d4e5a6a6`. All five live call sites are gone; every sprint endpoint is served from
`build.cycles` via `legacy_sprint_id`, so nothing reads the table phase 05 drops.

The endpoints were **kept rather than deleted**, because deleting them is a breaking contract
change and no consumer was proven absent beyond the frontend. `createSprint` stays frozen with
`GoneException`; the read and write verbs now operate on the bridged cycle.

Behaviour was preserved deliberately, including the `build.sprint.completed` outbox event and
the `sprint.started` / `sprint.completed` webhooks. Status is mapped through one bridge,
`backend/src/modules/build/core/sprint-cycle-status.ts`, which inverts the CASE expression in
`a-sprint-cycle-02-backfill.sql` exactly: `PLANNED ↔ draft`, `ACTIVE ↔ active`,
`COMPLETED ↔ completed`. A spec pins the bridge against that migration so the two cannot drift.

Two schema corrections came with it, both verified against the live database:

- `cycles.goal` and `cycles.deleted_at` are now declared. Both were applied by `a-sprint-cycle-01-expand.sql` and never declared. `goal` is populated for all 4 production cycles, so omitting it would have returned `goal: null` for every sprint — the same "backward compatible null" that already shipped once on `sprintId`.
- `fk_cycles_org_legacy_sprint` was removed from the schema. No migration ever created it, and production confirms it does not exist.

**A latent defect found and deliberately left alone.** `updateSprint` is the only emitter of
`build.sprint.completed` and of the `sprint.started` / `sprint.completed` webhooks.
`cycles.service.ts` `updateCycle` emits neither. Since the frontend drives cycles and never
calls the legacy sprint endpoint, **those notifications and webhooks never fire for any real
user today.** Moving the emission onto the canonical cycle path would change user-visible
notification behaviour, so it is a product decision rather than part of a behaviour-preserving
cutover. Recorded here rather than silently fixed or silently dropped.

### A5 — the phase-05 rename — OPEN, and the remaining blocker for D2

`a-sprint-cycle-05-drop.sql` does not only drop `build.sprints`. It also runs:

```sql
ALTER TABLE "build_events"."sprint_scope_events" RENAME TO "cycle_scope_events";
ALTER TYPE "sprint_scope_event_type" RENAME TO "cycle_scope_event_type";
```

The schema still declares the old physical names at
`backend/src/db/schema/build/sprint-events.ts:23-24` and `:15`, and
`backend/src/modules/build/core/projects-reports.service.ts:102` selects from that table for the
burnup report. A rename in the same phase as the drop would require the code rename to deploy at
the same instant, which cannot be arranged — the burnup report raises `42P01` the moment the
phase commits.

Settle open question 17 before running D2. Do not "fix" this by renaming the code first: that
breaks the report in the other direction, for the whole window before the migration runs.

### A3 — Change Request affected work

`backend/src/db/schema/build/change-requests.ts` carries `release_id` and `client_visible` and no
affected-work column. Open question 16 must be answered first: the cardinality decides the
composite foreign key, and the key cannot be changed cheaply afterwards.

Any new foreign key here is composite and tenant-keyed, `(org_id, …)`. A `SET NULL` action needs
an explicit column list — without one PostgreSQL nulls every column in the key including the
`NOT NULL` `org_id`, and the delete fails `23502` surfaced as a 500. That exact defect was caught
in migration 1150 before it was applied.

### A4 — invoice → timesheet pointer — DONE

Landed in `8bd5a84b4`. `invoice_items.timesheet_entry_id` is now written and read at
`backend/src/modules/invoices/invoices-write.service.ts:139`,
`invoices-update.service.ts:130,168` and `invoices.service.ts:121`. The column and its composite
FK were already applied to production; the FK was corrected from single-column to
`(org_id, timesheet_entry_id)` before it was applied, which is what prevents a cross-organization
reference.

## Stage B — verification

| Step | Command or artifact | Passing condition |
|---|---|---|
| B1 invariant | a spec that scans both `tickets.sprintId` and `sprintId: true` | empty allowlist, proven non-vacuous |
| B2 QA Bug data | `backend/migrations/sql/b-qa-bug-03-verify.sql` | all 14 checks return zero |
| B3 parity | `check:contract-parity` (frontend `package.json`) | runs to completion; compared against the `main` baseline of FAIL with 6 new required fields |
| gates | `check:route-census`, `check:build-execution-plan` (root); `check:permission-binding` (frontend); `check:list-projections`, `check:tenant-isolation`, `check:build-authz-census`, `check:migration-chain` (backend) | parity or better against a measured control |

Measure every "pre-existing" claim against an untouched checkout before making it. Three failures
in the last session were reported as pre-existing when another agent had caused them minutes
earlier.

`check:contract-parity` cannot be measured in a worktree whose `node_modules` is junctioned to
the main checkout — it resolves imports back to `main`'s source tree and fails with a spurious
missing-export error. Run it from a checkout with its own install.

## Stage C — deployment

Deploy every Stage A commit. Then smoke Cycles, Issues, ticket detail, Change Requests and
Workload in production and confirm no `42703` appears in logs before Stage D is considered.

**This stage is what makes D1 safe, and it has not happened.** The merged source no longer reads
`tickets.sprint_id`, but the revision production is currently serving still does. Dropping the
column before the deploy takes Build down; dropping it after is a no-op to every caller.

## Stage D — destructive migration

Run in this order, one per window, each preceded by a **fresh manual cluster snapshot** taken
before any DDL:

| # | Migration | Effect | Status |
|---|---|---|---|
| 1 | `backend/migrations/sql/a-sprint-cycle-04-detach.sql` | drops `sprint_id` from 4 tables, and the 4 FKs that block phase 05 | **NOT APPLIED** — needs the deploy |
| 2 | `backend/migrations/sql/a-sprint-cycle-05-drop.sql` | drops `build.sprints`, renames `sprint_scope_events` | **NOT APPLIED** — needs A5, then phase 1, then the deploy |
| 3 | `backend/migrations/sql/b-qa-bug-04-contract-freeze.sql` | revokes write on `build.bugs`, keeps `SELECT` | **APPLIED 2026-09-22**, snapshot `pre-qa-bug-freeze-20260922173910` |
| 4 | `backend/migrations/sql/b-qa-bug-05-contract-drop.sql` | drops `build.bugs` | **NOT APPLIED** — the deployed revision still reads the table |

**The deploy is the real gate, and it has not happened.** Production is live
(`https://api.streamlineos.in/health` → 200, 11 application backends), the backend has no deploy
workflow, and Actions billing lapsed around 2026-09-10 — so the running revision predates every
cutover commit from 2026-09-22. Cumulative `pg_stat_all_tables` counters, net of this session's
own queries, put `build.sprints` at 3024 index scans, `build.bugs` at 127, and `build.tickets` at
roughly 26k. Dropping any of those now breaks the deployed application the next time someone uses
the feature — a four-minute idle sample showed zero scans, so the breakage would surface later
rather than immediately, which is worse.

Phase 3 was applied because it is the one phase that removes nothing: it revokes a write grant
that has never been exercised (`n_tup_ins = n_tup_upd = n_tup_del = 0` for the table's whole
history), keeps `SELECT`, and reverses with
`GRANT INSERT, UPDATE, DELETE ON "build"."bugs" TO streamline_app;`. Full record in
[`P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md`](./P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md).

`build.bugs` has no non-test reader or writer left — `grep -rn "from(bugs)\|insert(bugs)\|update(bugs)\|delete(bugs)" backend/src --include='*.ts'` excluding specs returns nothing — and the
table is empty, so phases 3 and 4 remove an unused object rather than completing a migration.

**Phase 1 must precede phase 2 for a database reason, not a stylistic one.** Four foreign keys
reference `build.sprints` in production; phase 05 issues a bare `DROP TABLE` with no `CASCADE`
and fails `2BP01` while any of them exists. Phase 04 drops exactly those four.

### Hazards

**The phase-04 guard is not a precondition check.** Its DO block inspects whether each
`tickets.sprint_id` value has been archived in `sprint_binding_archive`. It has zero visibility
into application code. If any handler still selects the column, the migration **succeeds**, the
column disappears, and that handler starts raising `42703` on live traffic. Stage A and Stage C,
not the guard, are what make phase 04 safe.

**Read the backup posture from the cluster, not the instance.** Retention is 1 day and the
automatic restore window moves. The manual snapshot is the real recovery point.

**Phase `b-qa-bug-05-contract-drop.sql` has no `-rollback.sql`.** Every other phase in both
families has one. For this phase the snapshot is the only reversal.

**Production is the only reachable database.** `.env` and `.env.production` resolve to the same
RDS host. There is no staging rehearsal available; see open question 15.

## Stage E — browser verification

Execute [`NEXT-CLOSURE-BROWSER-QA.md`](./NEXT-CLOSURE-BROWSER-QA.md). Its preamble states that
migration 1149 is not yet applied and that sections 1 and 2 are therefore blocked. **That
preamble is superseded** — 1149, 1150 and 1151 were applied on 2026-09-22 behind snapshot
`pre-1149-20260922132524`, recorded in
[`P0-PRODUCTION-EXECUTION-1149-1151.md`](./P0-PRODUCTION-EXECUTION-1149-1151.md). Sections 1
and 2 are testable. Read the checklist, not its preamble, for what to check.

After Stage D, re-verify Cycles, Issues, ticket detail, meeting agenda generation, QA runs and
Bugs. Agenda generation is the surface where a silent Sprint/Cycle regression appears as an empty
result rather than an error.

## Observed but not owned

Three things found while measuring, all in files this lane does not own. Recorded so they are
not rediscovered, and deliberately not fixed here.

**`openapi.json` is stale on `main`.** Regenerating it with placeholder env — no database needed
— produces a file that differs from the committed one by `cycleId` additions on
`/build/{projectId}/meetings` and `/build/{projectId}/test-runs`. Those come from the merged
`e06314424` schema cutover, not from any sprint work: no path was added or removed. A stale
`openapi.json` disarms `check:permission-binding`, so this is worth regenerating deliberately
rather than incidentally. It is a coordinator-owned generated artifact, so the regenerated file
was discarded rather than committed here.

**`dashboard-project.service.spec.ts` fails at `de8ccd58a`.** `getActiveSprintSummary` now
selects from `cycles` with an `innerJoin`, and the spec's mock has no `innerJoin`, so it throws
`TypeError` rather than asserting. Reproduced with neither that service nor its spec in this
lane's diff, so it is pre-existing rather than caused here. The coordinator has uncommitted
edits in `src/modules/dashboard/` and may already be on it.

**Two seeded-e2e specs were already invalid before this change.**
`test/build/build-workflow-lifecycle.seeded-e2e-spec.ts` asserted `201` from a sprint create that
has thrown `GoneException` since the writer freeze, and
`test/build/build-report-bounds.seeded-e2e-spec.ts` parsed a `sprintId` field that the velocity
report stopped returning when it moved to `cycleId`. Both live under `test/build/`, which is
outside jest's `roots`, so they only ever typechecked — nothing ran them to notice. They were
converted to cycles here so they compile, but **they remain unexecuted: no seeded database
exists, so their assertions are unverified.**

## Standing constraints

- CI cannot run. GitHub Actions billing lapsed around 2026-09-10; `ci.yml` and `db-gates.yml` fail with 0 steps and no logs. A red workflow is not a code defect and is not evidence of one either way.
- No code comments, TODOs or commented-out code. Reasons belong in test names.
- Sessions share one working tree; `checkout -b` gives no isolation. Use a worktree.
- `git stash`, `reset`, `checkout` and `clean` destroy other sessions' tracked edits. Do not run them.
- Typechecks run serially, never while jest is running in the same repository.
- Frontend typecheck needs an 8 GB heap.

## Exit criteria for the next phase

- [x] The frontend `sprintId` census returns zero.
- [x] No table other than `cycles` declares `sprint_id`.
- [x] No non-schema read or write of the `sprints` table remains.
- [x] `b-qa-bug-03-verify.sql` returned zero on all 14 checks — with the vacuity caveat recorded.
- [ ] Open question 17 is answered, so the phase-05 rename cannot break the burnup report.
- [ ] Stage A is deployed and observed clean before any Stage D migration runs.
- [ ] All four contraction phases are applied, each behind its own fresh snapshot.
- [ ] `b-qa-bug-03-verify.sql` returned zero on all 14 checks before the freeze.
- [ ] The browser checklist is executed and every section is pass or filed.
- [ ] Open questions 14 and 15 are answered in writing before Stage D begins.
