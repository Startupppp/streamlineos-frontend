# Build — Next Phase Execution

Written 2026-09-22 against root `e70089d85` and backend `main`. This is the runbook for the work
that begins **after** the current coordinator session finishes. It does not describe, schedule or
depend on anything that session is still editing.

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

### A1 — frontend `sprintId`

Reproduce the count:

```bash
cd frontend
grep -rn "sprintId" --include='*.ts' --include='*.tsx' . \
  | grep -v node_modules \
  | grep -vE '(\.test\.|\.spec\.|__tests__)'
```

Measured 2026-09-22: **85 occurrences across 48 non-test files.**

| Area | Files | Occurrences | Note |
|---|---|---|---|
| `frontend/features/build/views/` | 12 | 21 | Workload filter chain is the largest single cluster |
| `frontend/hooks/api/build/` | 10 | 16 | Contains the projection that must go first |
| `frontend/types/projects/` | 4 | 11 | `sprints.ts` is the legacy type surface |
| `frontend/features/build/shared/` | 5 | 11 | Shared filter and URL-state plumbing |
| `frontend/features/build/all-work/` | 3 | 5 | |
| `frontend/features/build/ticket-details/` | 3 | 5 | |
| `frontend/lib/query-keys/` | 2 | 5 | |
| `frontend/features/build/meetings/` | 2 | 3 | `generate-agenda.ts` is the silent-failure site |
| `frontend/features/build/project-detail/` | 1 | 2 | |
| `frontend/features/build/my-work/` | 2 | 2 | |
| `frontend/features/build/backlog/`, `cycles/`, `my-tickets/`, `lib/validation/` | 4 | 4 | one each |

Order of work within A1:

1. `frontend/hooks/api/build/build-tickets-core-schema.ts:24` — stop projecting `sprintId`. Everything else is downstream of this one line.
2. The Workload filter chain in `frontend/features/build/views/`, which is the widest blast radius.
3. Shared filter and URL-state plumbing in `frontend/features/build/shared/`.
4. `frontend/hooks/api/build/sprints.ts` and `frontend/types/projects/sprints.ts` last — deleting the legacy surface before its callers only moves the error.

**Do not replace a value with `null` and keep the field.** That shipped once already. A Zod
contract that accepts `null` cannot tell you the value stopped arriving, and
`frontend/features/build/meetings/generate-agenda.ts` filters on equality — agendas come back
empty with no error anywhere.

**Grep both forms.** An earlier invariant scanned for `tickets.sprintId` and reported clean while
three files selected the column through Drizzle's relational API as `sprintId: true`.

### A2 — the `sprints` table read path

`backend/src/modules/build/execution/sprints.service.ts:19-34` still selects eight columns
`.from(sprints)`, reached through
`backend/src/modules/build/execution/iterations.controller.ts:71-75`. Phase 05 deletes that
table. Either derive the response from `cycles.legacy_sprint_id` — which the same method already
joins — or remove the route together with its route-manifest entry, never one without the other.

### A3 — Change Request affected work

`backend/src/db/schema/build/change-requests.ts` carries `release_id` and `client_visible` and no
affected-work column. Open question 16 must be answered first: the cardinality decides the
composite foreign key, and the key cannot be changed cheaply afterwards.

Any new foreign key here is composite and tenant-keyed, `(org_id, …)`. A `SET NULL` action needs
an explicit column list — without one PostgreSQL nulls every column in the key including the
`NOT NULL` `org_id`, and the delete fails `23502` surfaced as a 500. That exact defect was caught
in migration 1150 before it was applied.

### A4 — invoice → timesheet pointer

`invoice_items.timesheet_entry_id` and its composite FK are applied to production and **no code
writes the column**. `backend/src/db/schema/crm/invoicing.ts` and the invoicing service are the
targets. Ship a cross-tenant negative test alongside the positive control; the original 1150 FK
was single-column and would have permitted a cross-organization reference.

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

## Stage D — destructive migration

Run in this order, one per window, each preceded by a **fresh manual cluster snapshot** taken
before any DDL:

1. `backend/migrations/sql/a-sprint-cycle-04-detach.sql` — drops `sprint_id` from 4 tables
2. `backend/migrations/sql/a-sprint-cycle-05-drop.sql` — drops `build.sprints`
3. `backend/migrations/sql/b-qa-bug-04-contract-freeze.sql` — makes `build.bugs` unwritable
4. `backend/migrations/sql/b-qa-bug-05-contract-drop.sql` — drops `build.bugs`

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

- [ ] The `sprintId` census returns zero outside deliberately retained legacy types.
- [ ] No non-schema read of the `sprints` table remains.
- [ ] Stage A is deployed and observed clean before any Stage D migration runs.
- [ ] All four contraction phases are applied, each behind its own fresh snapshot.
- [ ] `b-qa-bug-03-verify.sql` returned zero on all 14 checks before the freeze.
- [ ] The browser checklist is executed and every section is pass or filed.
- [ ] Open questions 14 and 15 are answered in writing before Stage D begins.
