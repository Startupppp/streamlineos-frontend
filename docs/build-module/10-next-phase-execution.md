# Build — Next Phase Execution

Written 2026-09-22, re-measured the same day against root `f794b484a` and backend `de8ccd58a`
after the coordinator session landed most of Stage A. This is the runbook for the work that
begins **after** that session finishes. It does not describe, schedule or depend on anything the
session is still editing.

**State at re-measurement:** A1, A1b and A4 are done. **A2 and A3 are open.** Of the four
destructive migrations, one is blocked on code (A2) and three are blocked only on deployment or
data verification. None has been applied.

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

### A2 — the `sprints` table access path — OPEN, and the only blocker for D2

Re-measured at backend `de8ccd58a`: **five live non-test call sites, three of them writes.**

| Site | Operation |
|---|---|
| `backend/src/modules/build/core/projects-write.service.ts:289` | `update(sprints)` |
| `backend/src/modules/build/entity/build-entity-reads.service.ts:355` | `from(sprints)` |
| `backend/src/modules/build/execution/sprints.service.ts:32` | `from(sprints)` |
| `backend/src/modules/build/execution/sprints.service.ts:122` | `update(sprints)` |
| `backend/src/modules/build/execution/sprints.service.ts:181` | `update(sprints)` soft delete |

Plus `backend/src/db/schema/build/relations.ts:56` (`sprintsRelations`) and the live route
`GET /build/:projectId/sprints` at
`backend/src/modules/build/execution/iterations.controller.ts:62-92`.

Phase 05 deletes that table. Either derive the responses from `cycles.legacy_sprint_id` — which
`listSprints` already joins — or remove the route together with its route-manifest entry, never
one without the other. Until all five sites are gone, `a-sprint-cycle-05-drop.sql` raises
`42P01` on live traffic.

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

| # | Migration | Effect | Code ready at `de8ccd58a`? | Blocked on |
|---|---|---|---|---|
| 1 | `backend/migrations/sql/a-sprint-cycle-04-detach.sql` | drops `sprint_id` from 4 tables | **Yes** | Stage C |
| 2 | `backend/migrations/sql/a-sprint-cycle-05-drop.sql` | drops `build.sprints` | **No** | A2 — five live call sites |
| 3 | `backend/migrations/sql/b-qa-bug-04-contract-freeze.sql` | makes `build.bugs` unwritable | **Yes** | B2 — 14 verify checks |
| 4 | `backend/migrations/sql/b-qa-bug-05-contract-drop.sql` | drops `build.bugs` | **Yes**, after 3 | phase 3 observed clean |

`build.bugs` has no non-test reader or writer left — `grep -rn "from(bugs)\|insert(bugs)\|update(bugs)\|delete(bugs)" backend/src --include='*.ts'` excluding specs returns nothing — so
phases 3 and 4 are gated on data verification, not on code.

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
- [ ] No non-schema read **or write** of the `sprints` table remains — five sites open.
- [ ] Stage A is deployed and observed clean before any Stage D migration runs.
- [ ] All four contraction phases are applied, each behind its own fresh snapshot.
- [ ] `b-qa-bug-03-verify.sql` returned zero on all 14 checks before the freeze.
- [ ] The browser checklist is executed and every section is pass or filed.
- [ ] Open questions 14 and 15 are answered in writing before Stage D begins.
