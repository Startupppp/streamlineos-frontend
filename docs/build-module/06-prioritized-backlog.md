# Build Prioritized Backlog

Reconciled against the repository on 2026-09-22. First pass at root `e70089d85`; re-measured at
root `f794b484a` and backend `de8ccd58a` after the coordinator session landed most of Stage A.

Order is **dependency order, not wish order**: application code cutover → verification →
deployment → destructive migration → browser verification. A stage cannot start before the
stage above it is complete, because each later stage is irreversible in a way the earlier one
is not.

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

## Stage C — deployment

#### C1 — Deploy Stage A before any contraction

- **User job:** keep Build working while the data model contracts underneath it.
- **Owner:** repo owner
- **Depends on:** nothing further in code. B1 and B3 remain as verification, and A3 does not gate any migration.
- **Acceptance:** the deployed revision contains every Stage A commit; a production smoke of Cycles, Issues, Change Requests and Workload returns 200 with no `42703` in logs.
- **Evidence:** the ordering hazard is `lane-1-cycle-cutover.md:82`; the same class already bit Change Requests, recorded at `NEXT-CLOSURE-STATUS.md:160-162`.
- **Effort:** 0.5 d plus an observation window

## Stage D — destructive migration

Every task here is irreversible in practice. The Aurora cluster has **1-day backup retention**,
so a manual snapshot is the only recovery point — read the posture from the cluster, not the
instance. Each phase below must be preceded by a fresh manual snapshot.

Readiness re-measured at root `f794b484a`, backend `35549635b`, and against the live production
database over a read-only IAM connection on 2026-09-22:

| Phase | Code ready? | Data precondition | Status |
|---|---|---|---|
| D1 detach | **Yes** | **Met** — 103 tickets carry `sprint_id`, all 103 in `sprint_binding_archive`, so the guard returns `unarchived = 0` | **NOT APPLIED** — blocked on Stage C |
| D2 drop `sprints` | **Yes** | 4 sprints, all 4 with a cycle counterpart, 0 orphans | **NOT APPLIED** — needs D1 first (FK order), then Stage C |
| D3 QA freeze | **Yes** | All 14 checks return 0, but **vacuously**: `build.bugs` holds **0 rows** and has never received a write | **APPLIED 2026-09-22** behind snapshot `pre-qa-bug-freeze-20260922173910`. See [`P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md`](./P0-PRODUCTION-EXECUTION-QA-BUG-FREEZE.md) |
| D4 drop `bugs` | **Yes**, after D3 | Table is empty | **NOT APPLIED** — the deployed revision still reads it; **no rollback file exists** |

**Why three of the four did not run.** Production is a live deployment —
`https://api.streamlineos.in/health` returns 200 with the database up, and the cluster carried 11
application backends. The backend has **no deploy workflow**, and GitHub Actions billing lapsed
around 2026-09-10, so the running revision predates the 2026-09-22 cutover commits. Cumulative
`pg_stat_all_tables` counters, excluding this session's own queries, show `build.sprints` at 3024
index scans, `build.bugs` at 127 scans, and `build.tickets` at 26k scans. Dropping any of those
objects now breaks the deployed application the next time the feature is used. D3 was applied
because it only revokes a write grant that no writer has ever exercised, retains `SELECT`, and
reverses with a single `GRANT`.

"Code ready" means the merged source no longer touches the object. It does **not** mean the
running production revision no longer touches it — that is what Stage C establishes, and it is
the difference between a clean drop and a site-wide `42703`.

**D2 cannot run before D1, and this is a hard database constraint rather than a preference.**
Four foreign keys still reference `build.sprints` in production — `fk_tickets_org_sprint`,
`fk_project_meetings_org_sprint`, `fk_test_runs_org_sprint` and
`fk_sprint_scope_events_org_sprint`. `a-sprint-cycle-05-drop.sql` issues a bare
`DROP TABLE "build"."sprints"` with no `CASCADE`, so it fails `2BP01` while any of them exists.
Phase 04 drops exactly those four. The ordering is therefore already correct — but only in that
order.

**The QA Bug checks pass because there is nothing to check.** `build.bugs` has 0 rows,
`bug_work_item_map` has 0 rows, and the file's own informational lifecycle distribution returns
no rows at all. The 14 zeroes are therefore evidence that the freeze and drop are *harmless*,
not evidence that a migration was performed correctly. Treat D3 and D4 as removing an unused
table. 44 tickets already carry `type = 'BUG'`, and `work_item_qa_details` is empty.

#### D1 — `a-sprint-cycle-04-detach.sql`

- **User job:** none — removes the retired Sprint binding.
- **Owner:** repo owner
- **Depends on:** C1
- **Acceptance:** a manual snapshot reaches `available`; the migration's own DO-block guard passes; `tickets.sprint_id` is gone from 4 tables; no `42703` appears in the following hour.
- **Evidence:** `backend/migrations/sql/a-sprint-cycle-04-detach.sql`, rollback at `-rollback.sql`.
- **Effort:** 0.5 d plus observation

#### D2 — `a-sprint-cycle-05-drop.sql`

- **User job:** none — deletes the `sprints` table.
- **Owner:** repo owner
- **Depends on:** D1
- **Acceptance:** D1 succeeded and observed clean; the phase copies `build.sprints` before dropping it; post-drop smoke of Cycles passes.
- **Evidence:** `backend/migrations/sql/a-sprint-cycle-05-drop.sql`; the copy-before-drop behaviour is recorded at `NEXT-CLOSURE-STATUS.md:144-145`.
- **Effort:** 0.5 d plus observation

#### D3 — `b-qa-bug-04-contract-freeze.sql`

- **User job:** none — makes `build.bugs` unwritable.
- **Owner:** repo owner
- **Depends on:** B2 returning zero on all 14 checks
- **Acceptance:** `build.bugs` rejects writes; QA bug create, update, reopen and delete still succeed through `tickets` + `work_item_qa_details`.
- **Evidence:** `backend/migrations/sql/b-qa-bug-04-contract-freeze.sql`, rollback at `-rollback.sql`.
- **Effort:** 0.5 d plus observation

#### D4 — `b-qa-bug-05-contract-drop.sql`

- **User job:** none — deletes `build.bugs`.
- **Owner:** repo owner
- **Depends on:** D3 observed clean
- **Acceptance:** a manual snapshot exists; the drop completes; QA flows unaffected.
- **Evidence:** `backend/migrations/sql/b-qa-bug-05-contract-drop.sql`. **This phase has no `-rollback.sql` file** — the snapshot is the only reversal.
- **Effort:** 0.5 d plus observation

## Stage E — browser verification

#### E1 — Execute the prepared browser QA checklist

- **User job:** confirm a real person can complete each changed journey in a real browser.
- **Owner:** Codex
- **Depends on:** C1
- **Acceptance:** every section of the checklist is marked pass or filed as a defect. Sections 1 and 2 are no longer blocked: migration 1149 is applied.
- **Evidence:** [`NEXT-CLOSURE-BROWSER-QA.md`](./NEXT-CLOSURE-BROWSER-QA.md). Its "1149 NOT YET APPLIED" preamble is superseded by [`P0-PRODUCTION-EXECUTION-1149-1151.md`](./P0-PRODUCTION-EXECUTION-1149-1151.md) and by blocker 1 in `NEXT-CLOSURE-STATUS.md:168`.
- **Effort:** 1–2 d

#### E2 — Post-contraction browser re-verification

- **User job:** confirm the contraction changed nothing a user can see.
- **Owner:** Codex
- **Depends on:** D2, D4
- **Acceptance:** Cycles, Issues, ticket detail, meeting agenda generation, QA runs and Bugs all render and mutate correctly after the drops.
- **Evidence:** the agenda-generation regression class is recorded at `NEXT-CLOSURE-STATUS.md:104-107`; the caller is `frontend/features/build/meetings/generate-agenda.ts`.
- **Effort:** 1 d

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
