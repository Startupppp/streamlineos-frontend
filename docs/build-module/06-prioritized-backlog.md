# Build Prioritized Backlog

Reconciled 2026-09-22, re-verified against the live production catalog 2026-09-23 at root
`ca83cb100` / backend `7d27370e8`.

**Stages A through D are complete.** The code cutover, its verification, the deployment and all
five destructive migration phases have landed. **Stage E — browser verification — is the only
thing still open**, and nothing in this programme has been confirmed in a browser.

Order is **dependency order, not wish order**: application code cutover → verification →
deployment → destructive migration → browser verification. A stage cannot start before the
stage above it is complete, because each later stage is irreversible in a way the earlier one
is not. That ordering held: the deploy preceded the drops, and phase 04 preceded phase 05
because four foreign keys would otherwise have failed it `2BP01`.

Effort is engineering days for one experienced engineer with existing repository context. It
excludes migration observation windows and security review. Every figure is an estimate.

Evidence paths are repository-relative. `backend/` is a separate git repository from the root
checkout; both are on `main` and both carry the merged closure work.

Execution detail for stages A–E lives in
[`10-next-phase-execution.md`](./10-next-phase-execution.md).

## Completed — historical

These items were on the previous backlog as pending. Each is disproven as pending by current
code. They are kept for audit history and must not be re-opened without new evidence.

| Previous item | Disproving evidence |
|---|---|
| Fix Cycles navigation `/sprints` → `/cycles` | No `/sprints` route exists. Nav points at `${basePath}/cycles` in `frontend/lib/build/nav/build-project-catalog.ts:76-81`, pinned by `frontend/lib/build/build-project-catalog.test.ts:58` |
| Establish route manifest tests for keep/move/consolidate/delete | `frontend/lib/build/build-route-manifest.ts` holds 79 typed entries (72 KEEP, 6 CONSOLIDATE, 1 DELETE) with `frontend/lib/build/build-route-manifest.test.ts`. Independently re-measured 2026-09-22: `app/(authenticated)/build` contains exactly **79 `page.tsx` files**, one per manifest entry. Gate `check:route-census` (root `package.json`) is recorded PASS with 0 drift in `NEXT-CLOSURE-STATUS.md:42` |
| Make project workspace optional | BLD-003 in `IMPLEMENTATION-STATUS.md:304`; migration 1141 applied per `P0-PRODUCTION-EXECUTION-2026-09-22.md` |
| Close authorization gaps for lists, details, projections, mutations | `check:build-authz-census` (`backend/package.json`) reports `VULNERABLE = 0`. The named Releases escalation is closed: every method in `backend/src/modules/build/core/projects-releases.service.ts` now takes `u` and calls `assertProjectAccess` (lines 30, 58, 70, 109, 121, 140) |
| Workload with HR leave/capacity and Timesheets actuals | `backend/src/modules/build/execution/workload-capacity.service.ts` reads `leaveRequests` filtered to `APPROVED`, `timesheetSettings.expectedDailyHours` and `timesheets`; served at `/build/:projectId/workload/capacity`, consumed by `frontend/hooks/api/build/workload-capacity.ts` and wired at `frontend/features/build/project-detail/project-board-page.tsx:96` |
| Add project filtering to Inbox | `frontend/features/build/inbox/inbox-filter-bar.tsx:23,95-102`; index applied by `backend/migrations/1151_notifications_metadata_project_id_index.sql` |
| Change Request release and client-visibility fields | `client_visible` and `release_id` exist in `backend/src/db/schema/build/change-requests.ts:36-37`, read and filtered in `backend/src/modules/build/client-portal/change-requests.service.ts:57-58,117-121`; applied to production per `P0-PRODUCTION-EXECUTION-1149-1151.md` |
| Sprint/Cycle and QA Bug **application** cutover (backend) | `NEXT-CLOSURE-STATUS.md:20-24`; commits merged into backend `main` |
| **A1 — frontend Sprint→Cycle read cutover** | Landed `36e7402ad` / `f794b484a`. Re-measured at `f794b484a`: the `sprintId` census returns **0** across the whole frontend. `frontend/hooks/api/build/sprints.ts` and `frontend/types/projects/sprints.ts` are deleted |
| **A1b — backend `tickets.sprint_id` removal** | Landed `e06314424`, `de8ccd58a`. `tickets`, `project_meetings`, `test_runs` and `sprint_scope_events` no longer declare `sprint_id`; the only remaining `sprint_id` in the schema is `cycles.legacy_sprint_id` (`backend/src/db/schema/build/core.ts:165`) |
| **A4 — invoice → timesheet pointer** | Landed `8bd5a84b4`. `invoice_items.timesheet_entry_id` is written and read — `backend/src/modules/invoices/invoices-write.service.ts:139`, `invoices-update.service.ts:130,168`, `invoices.service.ts:121` |
| QA Bug legacy writer | Deleted `06b398ec8`. No non-test `from(bugs)`, `insert(bugs)`, `update(bugs)` or `delete(bugs)` remains |
| **A2 — retire the `build.sprints` access path** | Landed on `main` as the coordinator's **freeze**: every `SprintsService` verb throws `GoneException`, `cycles.legacy_sprint_id` was removed from the schema, and `e48e4d139` deleted the `sprints` and `bugs` table declarations outright. A parallel branch in this lane reached the same goal by bridging the endpoints through `cycles` instead; **the freeze is the winner** and the bridge was discarded. Guarded going forward by `backend/src/modules/build/phase-2/sprint-cycle-drop-invariant.spec.ts` |
| **A5 — the phase-05 rename** | Resolved on `main` in `1baada9ca`: the two `RENAME` statements were split out into `migrations/sql/a-sprint-cycle-06-rename-scope-events.sql`, so the drop no longer requires a same-instant code deploy |

Nine physical route removals are recorded in [`99-kill-list.md`](./99-kill-list.md) and are not
repeated here.

---

## Stage A — application code cutover

Nothing in Stage D may run until every Stage A task is deployed. Dropping a column that live
code still reads raises PostgreSQL `42703` on production traffic with no warning.

A1, A1b, A2, A4 and A5 have all landed and moved to the historical table above. **No code
blocker remains for any contraction phase.** A3 is open but gates nothing — the only thing
standing between the repository and the three unapplied migrations is a **deploy**.

#### A3 — Change Requests: affected-work linkage

- **User job:** see which tickets a change request actually changes, so scope impact is reviewable.
- **Owner:** backend, then frontend
- **Depends on:** none
- **Acceptance:** a tenant-safe link from `build.change_requests` to work items exists with a composite `(org_id, …)` foreign key; the list projection and filter cover it; `check:list-projections` stays PASS.
- **Evidence:** `backend/src/db/schema/build/change-requests.ts:19-58` has `release_id` and `client_visible` but **no affected-work column**; `grep -rni affectedWork` returns nothing in either repository.
- **Effort:** 3–5 d

## Stage B — verification

#### B1 — Prove the Sprint/Cycle detach precondition in code, not only in data

- **User job:** none directly — this is the guard that stops A1/A2 shipping half-done.
- **Owner:** backend
- **Depends on:** nothing further
- **Acceptance:** an invariant spec fails if any non-schema reference to `tickets.sprint_id` or to the `sprints` table reappears, in string, Drizzle relational (`sprintId: true`) and query-builder form, with an empty allowlist.
- **Evidence:** the `tickets.sprint_id` half is `backend/src/modules/build/phase-2/sprint-cycle-detach-invariant.spec.ts`; the table half is `backend/src/modules/build/phase-2/sprint-cycle-drop-invariant.spec.ts`, added in `35549635b` with ten non-vacuity proofs for each scanner form. The DO-block guard in `backend/migrations/sql/a-sprint-cycle-04-detach.sql` is a **data** check over `sprint_binding_archive` and has zero visibility into application code — stated at `lane-1-cycle-cutover.md:82`.
- **Effort:** spent

#### B2 — Run the QA Bug contract verification — **DONE 2026-09-22**

- **User job:** none directly — it is the precondition for freezing `build.bugs`.
- **Owner:** repo owner (needs a database)
- **Depends on:** nothing further
- **Acceptance:** all 14 checks in `b-qa-bug-03-verify.sql` return zero. **Met.**
- **Evidence:** executed against the production Aurora cluster over a read-only IAM connection inside a `SET TRANSACTION READ ONLY` transaction on 2026-09-22. All 14 named checks returned 0. **Read the vacuity caveat in Stage D before treating this as a successful migration:** `build.bugs` has 0 rows, so the checks passed over an empty table.
- **Effort:** spent

#### B3 — Measure `check:contract-parity` outside a junctioned worktree

- **User job:** none directly — it is the only unmeasured gate in the closure set.
- **Owner:** coordinator
- **Depends on:** none
- **Acceptance:** the gate runs to completion from a checkout with its own installed `node_modules` and its result is compared against the `main` baseline of FAIL with 6 new required fields.
- **Evidence:** `NEXT-CLOSURE-STATUS.md:82-89` records the junction artifact and the `main` baseline.
- **Effort:** 0.5 d

## Stage C — deployment — DONE

Backend and frontend were deployed together, which was not optional: the contract change is
breaking in **both** directions — the frontend stopped sending and reading `sprintId`, and the
backend now rejects it with a 400. The repo owner confirmed the deploy before authorizing the
contraction.

`https://api.streamlineos.in/health` returns 200 with database, cache and queue `up`.

**The ordering rule that nearly went the wrong way.** `lane-1-cycle-cutover.md:82` said not to
remove a Drizzle declaration until phase 05 was applied. That is backwards, and was disproved by
rendering real SQL: Drizzle names every **declared** column in its INSERT list, so a declaration
that outlives its column raises `42703` on every insert and bare select. Declarations had to be
removed **and deployed** before phase 04 ran. After the drop the rule inverts again — any
surviving declaration becomes a query against something that no longer exists, which is what
broke `test-runs.service.ts` on `linked_bug_id`.

## Stage D — destructive migration

Every task here is irreversible in practice. The Aurora cluster has **1-day backup retention**,
so a manual snapshot is the only recovery point — read the posture from the cluster, not the
instance. Each phase below must be preceded by a fresh manual snapshot.

Readiness re-measured at root `f794b484a`, backend `35549635b`, and against the live production
database over a read-only IAM connection on 2026-09-22:

| Phase | Status | Verified against the live catalog 2026-09-23 |
|---|---|---|
| D1 `a-sprint-cycle-04-detach` | **APPLIED** | `sprint_id` gone from `tickets`, `project_meetings`, `test_runs` and `sprint_scope_events`; no FK references `build.sprints` |
| D2 `a-sprint-cycle-05-drop` | **APPLIED** | `build.sprints` dropped; `build.sprints_archive` holds all 4 rows with RLS enabled |
| D2b `a-sprint-cycle-06-rename-scope-events` | **APPLIED** | `build_events.cycle_scope_events` exists, the old name resolves to nothing, and the enum is `cycle_scope_event_type` |
| D3 `b-qa-bug-04-contract-freeze` | **APPLIED** | `streamline_app` retains `SELECT`, has no INSERT/UPDATE/DELETE |
| D4 `b-qa-bug-05-contract-drop` | **APPLIED** | `build.bugs` and `test_run_results.linked_bug_id` both gone |

The contraction is **complete**. It was executed on 2026-09-22 against production over IAM auth
with the repo owner's explicit authorization, after they confirmed the merged code was deployed
and that they are the only user of the database. Full record in
[`FINAL-SPRINT-REMOVAL-STATUS.md`](./FINAL-SPRINT-REMOVAL-STATUS.md); the freeze phase has its own
record in [`P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md`](./P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md).

**Re-verified independently here on 2026-09-23** over a read-only IAM connection inside a
`SET TRANSACTION READ ONLY` transaction: 13 catalog assertions, 11 confirming the applied state and
2 correcting this document — `FINAL-SPRINT-REMOVAL-STATUS.md` records phase 06 as "deliberately NOT
run", but it **has** run, and the code was renamed in lockstep. Post-state: 220 tickets, 103 with a
cycle, 44 of type `BUG`, 5 cycles, 4 archived sprints, migration ledger at 913.

Two details worth keeping, because they look like drift and are not:

- `cycles.legacy_sprint_id` still exists as a column. Nothing reads it; it was left in place deliberately.
- Every constraint and index on `cycle_scope_events` still carries a `sprint_scope_events_*` name. `ALTER TABLE … RENAME TO` does not rename them, and the Drizzle declarations match the live names exactly. This is correct, not drift.

The per-phase task blocks that used to sit here are retired. Each phase ran with a manual cluster
snapshot taken first, its own preconditions measured rather than assumed, and its postconditions
read back from the catalog. The one deviation worth carrying forward: `b-qa-bug-05-contract-drop.sql`
had **no `-rollback.sql`**, so its snapshot was the only reversal — that asymmetry is a property of
the file, not of the run, and would apply again to any re-use.

## Stage E — browser verification — THE ONLY THING STILL OPEN

Code, contract and database are all cut over. Nothing has been confirmed in a browser.

#### E1 — Execute the post-contraction browser checklist

- **User job:** confirm a real person can still complete every changed journey.
- **Owner:** whoever can open a browser against the deployed build
- **Depends on:** nothing — the deploy and the contraction are both done
- **Acceptance:** every section of [`FINAL-BROWSER-QA.md`](./FINAL-BROWSER-QA.md) is marked pass or filed as a defect, at desktop width and at 375 px.
- **Evidence:** the checklist names the two **deliberate** behaviour changes so neither is misread as a regression — stale `?sprintId=` deep links (§1.8) and the Feedbucket cross-project 403 (§6).
- **Effort:** 1–2 d

Two surfaces deserve attention first, because a defect there fails quietly rather than loudly:

- **Burnup report.** `cycle_scope_events` was renamed in the same window its readers were renamed. A mismatch surfaces as `42P01`, not as a wrong number.
- **Meeting agenda generation.** It used to filter on sprint equality; an incorrect cutover returns an **empty agenda with no error**, which is the failure mode this programme has already shipped once.

The earlier checklist, [`NEXT-CLOSURE-BROWSER-QA.md`](./NEXT-CLOSURE-BROWSER-QA.md), is still valid
for the 1149–1151 surfaces. Ignore its "1149 NOT YET APPLIED" preamble — that was superseded by
[`P0-PRODUCTION-EXECUTION-1149-1151.md`](./P0-PRODUCTION-EXECUTION-1149-1151.md).

---

## P1 — competitive daily workflow, after closure

Ordered by dependency on the closure stages above.

#### P1-1 — Kill-list execution: the seven remaining consolidations

- **User job:** reach each job at one canonical destination instead of two.
- **Owner:** frontend
- **Depends on:** C1
- **Acceptance:** each target behaviour ships first, then the source route and its manifest entry are removed together; `check:route-census` stays at 0 drift.
- **Evidence:** the seven routes and their targets are the non-KEEP entries in `frontend/lib/build/build-route-manifest.ts`, tabulated in [`99-kill-list.md`](./99-kill-list.md).
- **Effort:** 12–18 d for all seven

#### P1-2 — Shared URL-state, filter, sort and cursor contract

- **User job:** share a filtered list by copying the URL and get the same view back.
- **Owner:** frontend
- **Depends on:** none
- **Acceptance:** every Build list route reads and writes state through the shared hook; keyset cursors match their `ORDER BY`.
- **Evidence:** `frontend/features/build/shared/use-build-list-url-state.ts` exists with **7 consumers** measured 2026-09-22; the remaining list surfaces are unconverted.
- **Effort:** 4–6 d

#### P1-3 — Canonical Issues explorer residual

- **User job:** run board, list, table and timeline from one screen with saved views and bulk actions.
- **Owner:** frontend
- **Depends on:** P1-2
- **Acceptance:** `layout=timeline`, `type=BUG` and saved-view management all work from `/build/[projectId]/issues`, which is what P1-1 needs before three of its removals can run.
- **Evidence:** the view ladder is `frontend/features/build/views/project-board-content.tsx:168` (now an exhaustive `switch`); BLD-V06 in `IMPLEMENTATION-STATUS.md` re-estimated this from 12–20 d to ~2–4 d residual.
- **Effort:** 2–4 d

#### P1-4 — One guided freelancer flow

- **User job:** carry one engagement from deal to quote to signed agreement to project to approved time to invoice to payment without re-keying.
- **Owner:** backend, then frontend
- **Depends on:** none — the invoice → timesheet pointer is merged
- **Acceptance:** each handoff is one action with the prior record's identity carried forward; no step requires retyping a value the previous step already holds.
- **Evidence:** every screen exists today and the handoffs do not — `/crm/quotes`, `/sign/envelopes`, `/timesheets/billing`, `/accounting/invoices` and `/accounting/payments-received` all resolve; the merged `invoice_items.timesheet_entry_id` pointer is the first real link.
- **Effort:** 10–15 d

#### P1-5 — Feedbucket bulk actions and server-side filters

- **User job:** triage a backlog of submissions without opening each one.
- **Owner:** backend, then frontend
- **Depends on:** P1-2
- **Acceptance:** owner, linked, duplicate, date and cursor filters are evaluated on the server; bulk actions are bounded and idempotent.
- **Evidence:** `frontend/features/build/feedbucket/`; the a11y and mobile work on this surface is already merged and is a different concern.
- **Effort:** 5–8 d

#### P1-6 — Realtime version gaps and conflict recovery

- **User job:** recover cleanly when two people edit the same record, or when a tab reconnects after losing the network.
- **Owner:** frontend
- **Depends on:** none
- **Acceptance:** a version conflict is surfaced and resolvable; a reconnect replays without duplicating a mutation.
- **Evidence:** offline drafts and reconnect are merged with last-write-wins per ticket (`NEXT-CLOSURE-STATUS.md:29`); **version conflict and realtime gap recovery are the untouched half**.
- **Effort:** 5–8 d

#### P1-7 — Import with preview, validation, mapping and rollback

- **User job:** move an existing Jira, ClickUp, Linear, Trello or CSV backlog in without losing history.
- **Owner:** backend, then frontend
- **Depends on:** C1
- **Acceptance:** a dry run reports what will be created before anything is written; a failed import rolls back completely and reports why.
- **Evidence:** [`lane-4-import-export.md`](./lane-4-import-export.md) is **design only — nothing is implemented** (`NEXT-CLOSURE-STATUS.md:34`).
- **Effort:** 10–15 d

#### P1-8 — Product prioritization inputs

- **User job:** decide what to build next using customer revenue and tier, not opinion.
- **Owner:** backend, then frontend
- **Depends on:** P1-4
- **Acceptance:** feedback carries CRM-sourced revenue and tier; a scoring frame is applied on the roadmap; adoption outcomes return to the insight.
- **Evidence:** the discovery chain exists end to end (`PHASE-4-STATUS.md`); the CRM value input and scoring do not.
- **Effort:** 10–15 d

## P2 — differentiation, after the core is dependable

Order-of-magnitude only. None of these is scoped, and none has implementation evidence today.
Do not start one before Stage E is complete.

| ID | User job | Owner | Depends on | Acceptance | Evidence | Effort |
|---|---|---|---|---|---|---|
| P2-1 | Accept or reject an AI proposal and see exactly what it would change | backend + frontend | Stage E | Every proposal carries citations, a diff, an approver and a budget; run history is durable | `docs/build-module/08-build-os-flowcharts.md` P2 §1; no durable proposal store exists | 12–20 d |
| P2-2 | Build an automation without writing code and see why a run failed | backend + frontend | P2-1 | Run history, retries, loop protection and rate guards are all observable | flowcharts P2 §2; `/build/[projectId]/settings/automations` is configuration only today | 12–20 d |
| P2-3 | Compare delivery scenarios across people, money, dependencies and dates | backend + frontend | P1-8 | A scenario can be saved, compared and discarded without mutating live plans | flowcharts P2 §3 | 12–20 d |
| P2-4 | Produce a postmortem linked to its service, release, owner and follow-up work | backend | Stage E | An incident closes with linked follow-up work items | `/build/[projectId]/incidents` exists; correlation does not | 8–15 d |
| P2-5 | Produce an audit-ready evidence pack under retention and legal hold | backend | Stage E | Retention, hold and export are enforced at the query layer, not the UI | flowcharts P2 §5; open question 9 must be answered first | 10–18 d |

## Acceptance criteria for this document

- [x] Order is dependency order: code cutover, verification, deployment, destructive migration, browser verification.
- [x] Every task states a one-line user job, owner, dependency, acceptance criteria, evidence path and estimated effort.
- [x] Every claim of completion cites code or committed production evidence rather than a status assertion.
- [x] Historical items are retained and labelled as historical rather than deleted.
- [ ] Effort is recalibrated after Stage A lands and after the first contraction phase is observed.
