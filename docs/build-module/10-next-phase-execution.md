# Build — Next Phase Execution

Written 2026-09-22, re-measured the same day against root `f794b484a` and backend `de8ccd58a`
after the coordinator session landed most of Stage A. This is the runbook for the work that
begins **after** that session finishes. It does not describe, schedule or depend on anything the
session is still editing.

**State, re-verified against the live catalog 2026-09-23.** Stages A through D are **complete**:
the code cutover, the deploy, and all five destructive migration phases have landed. The only
open item in this runbook is **Stage E, browser verification**, which has never been performed.

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

Resolved on `main` as a **freeze**, not a bridge. Every `SprintsService` verb throws
`GoneException`; `cycles.legacy_sprint_id` was removed from the schema; and `e48e4d139` deleted
the `sprints` and `bugs` table declarations outright. `backend/src/modules/build/execution/sprint-create-frozen.spec.ts`
pins that all five methods throw, touch no database and cover the whole prototype.

A parallel branch in this lane reached the same goal differently — keeping the endpoints alive and
serving them from `cycles` via `legacy_sprint_id`, so no client contract broke. **The freeze won**:
it is simpler, it is merged, and it is the module owner's call. The bridge was discarded rather
than forced in, and `cycles.legacy_sprint_id` stays removed.

What that branch contributed instead is the regression guard main lacked:
`backend/src/modules/build/phase-2/sprint-cycle-drop-invariant.spec.ts` scans the whole tree for
any read, write, relation or import of the `sprints` table, with ten non-vacuity tests proving
each matcher fires on the real pre-removal text and stays silent on the shapes that replaced it.

**A latent defect found on the way, and deliberately left alone.** `updateSprint` used to be the
only emitter of `build.sprint.completed` and of the `sprint.started` / `sprint.completed`
webhooks; `cycles.service.ts` `updateCycle` emits neither. The freeze makes that permanent: those
notifications and webhooks now fire for nobody. Wiring emission onto the canonical cycle path
changes user-visible notification behaviour, so it is a product decision, not cutover cleanup.

### A5 — the phase-05 rename — DONE

`1baada9ca` split the two `RENAME` statements out of `a-sprint-cycle-05-drop.sql` into
`backend/migrations/sql/a-sprint-cycle-06-rename-scope-events.sql`. The drop no longer demands a
code deploy at the same instant.

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

## Stage C — deployment — DONE

Backend and frontend shipped together. The contract change is breaking in both directions, so a
one-sided deploy would have failed either way round. The owner confirmed it before authorizing the
contraction; `https://api.streamlineos.in/health` returns 200 with database, cache and queue `up`.

## Stage D — destructive migration

Run in this order, one per window, each preceded by a **fresh manual cluster snapshot** taken
before any DDL:

| # | Migration | Status | Catalog evidence, read 2026-09-23 |
|---|---|---|---|
| 1 | `a-sprint-cycle-04-detach.sql` | **APPLIED** | `sprint_id` gone from all four tables; no FK references `build.sprints` |
| 2 | `a-sprint-cycle-05-drop.sql` | **APPLIED** | `build.sprints` dropped; `sprints_archive` holds 4 rows with RLS |
| 3 | `a-sprint-cycle-06-rename-scope-events.sql` | **APPLIED** | `cycle_scope_events` exists, old name resolves to nothing, enum is `cycle_scope_event_type` |
| 4 | `b-qa-bug-04-contract-freeze.sql` | **APPLIED** | `streamline_app` keeps `SELECT`, has no write grants |
| 5 | `b-qa-bug-05-contract-drop.sql` | **APPLIED** | `build.bugs` and `test_run_results.linked_bug_id` gone |

Ledger at 913. Post-state: 220 tickets, 103 with a cycle, 44 of type `BUG`, 5 cycles.

**This document previously recorded phase 3 as deliberately deferred, and
`FINAL-SPRINT-REMOVAL-STATUS.md` still does. Both were wrong** — the rename ran, and the code was
renamed in lockstep. Verified two ways: the catalog has `cycle_scope_events` and no
`sprint_scope_events`, and `backend/src/db/schema/build/cycle-events.ts:23-24` declares the new
physical name while `projects-reports.service.ts` imports `cycleScopeEvents`.

Two things that look like drift and are not:

- `cycles.legacy_sprint_id` survives as an unread column, left in place deliberately.
- Constraints and indexes on `cycle_scope_events` still carry `sprint_scope_events_*` names, because `ALTER TABLE … RENAME TO` does not rename them. The declarations match the live names exactly.

### Hazards — kept, because each applies again to any future contraction

**The phase-04 guard is not a precondition check.** Its DO block inspects whether each
`tickets.sprint_id` value has been archived in `sprint_binding_archive`. It has zero visibility
into application code. If any handler still selects the column, the migration **succeeds**, the
column disappears, and that handler starts raising `42703` on live traffic. Stage A and Stage C,
not the guard, are what made phase 04 safe. When it ran, the guard condition read **0** against
103 archived bindings, and **0** tickets would have lost their iteration — every one carrying
`sprint_id` also carried `cycle_id`.

**Read the backup posture from the cluster, not the instance.** Retention is 1 day and the
automatic restore window moves. The manual snapshot is the real recovery point.

**Phase `b-qa-bug-05-contract-drop.sql` has no `-rollback.sql`.** Every other phase in both
families has one. For this phase the snapshot is the only reversal.

**Production is the only reachable database.** `.env` and `.env.production` resolve to the same
RDS host. There is no staging rehearsal available; see open question 15.

## Stage E — browser verification — THE ONLY OPEN ITEM

Nothing in this programme has been confirmed in a browser. No screenshot was taken, no UI was
verified, and no such claim should be made on its behalf.

Run [`FINAL-BROWSER-QA.md`](./FINAL-BROWSER-QA.md) against the deployed build, at desktop width
and at 375 px. It names the two **deliberate** behaviour changes so neither is filed as a
regression: stale `?sprintId=` deep links (§1.8) and the Feedbucket cross-project 403 (§6).

Check these two first — both fail quietly rather than loudly:

- **Burnup report.** `cycle_scope_events` was renamed alongside its readers. A mismatch is a `42P01`, not a wrong number.
- **Meeting agenda generation.** It filtered on sprint equality; a bad cutover returns an **empty agenda with no error**. This programme has already shipped that failure once.

[`NEXT-CLOSURE-BROWSER-QA.md`](./NEXT-CLOSURE-BROWSER-QA.md) remains valid for the 1149–1151
surfaces. Disregard its "1149 NOT YET APPLIED" preamble — superseded by
[`P0-PRODUCTION-EXECUTION-1149-1151.md`](./P0-PRODUCTION-EXECUTION-1149-1151.md).

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

## Exit criteria

- [x] The frontend `sprintId` census returns zero.
- [x] No table declares `sprint_id`; `cycles.legacy_sprint_id` survives as an unread column.
- [x] No non-schema read or write of the `sprints` table remains, pinned by `sprint-cycle-drop-invariant.spec.ts`.
- [x] `b-qa-bug-03-verify.sql` returned zero on all 14 checks — with the vacuity caveat recorded.
- [x] The phase-05 rename was split into its own phase, then applied in lockstep with the code rename.
- [x] The cutover is deployed; backend and frontend shipped together.
- [x] All five contraction phases are applied, each behind a manual snapshot, with preconditions measured rather than assumed.
- [ ] **The browser checklist is executed and every section is pass or filed.** Nothing here has been seen in a browser.
- [ ] Open question 15 — whether a non-production PostgreSQL will ever exist — is answered. Until it is, `*.db.spec.ts` and `*.e2e-spec.ts` cannot run at all.
- [ ] Open question 17 — whether `build.bugs` being empty was intended — is confirmed, so the consolidation is not recorded as having migrated data it never had.
