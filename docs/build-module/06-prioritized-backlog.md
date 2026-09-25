# Build Prioritized Backlog

Reconciled 2026-09-24 against `codex/build-final-completion` and the paired backend worktree.

This is the durable product backlog, not a release-completion claim. The Sprint/Cycle and QA Bug contraction is complete. Canonical Build migrations `1185_roadmap_search_id_probe`, `1186_project_programs_list_indexes`, and `1197_build_cycle_permissions` are verified in production. The production journal still reports unrelated mixed-module backlog entries, so zero repository-wide pending migrations is not currently true. Current release truth lives in [RELEASE-STATUS.md](./RELEASE-STATUS.md).

Order remains **dependency order, not wish order**: application code → focused verification → deployment → migration → browser verification. A later stage cannot be inferred complete from an earlier test result.

Effort is engineering days for one experienced engineer with existing repository context. It
excludes migration observation windows and security review. Every figure is an estimate.

Evidence paths are repository-relative. `backend/` is a separate git repository from the root
checkout. The current backend Build fixes are on backend `origin/main` at `2f26c9841`; the
current frontend fixes are on frontend `origin/main` at `eb34196e3`. Deployment rollout
identity remains an explicit release check in [RELEASE-STATUS.md](./RELEASE-STATUS.md).

Migration execution rules live in [MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md).

## Completed — historical

These items were on the previous backlog as pending. Each is disproven as pending by current
code. They are kept for audit history and must not be re-opened without new evidence.

| Previous item | Disproving evidence |
|---|---|
| Fix Cycles navigation `/sprints` → `/cycles` | No `/sprints` route exists. Nav points at `${basePath}/cycles` in `frontend/lib/build/nav/build-project-catalog.ts:76-81`, pinned by `frontend/lib/build/build-project-catalog.test.ts:58` |
| Establish route manifest tests for keep/move/consolidate/delete | `frontend/lib/build/build-route-manifest.ts` and `frontend/lib/build/build-route-manifest.test.ts` cover exactly **65 `KEEP` routes**, matching the 65 physical authenticated Build pages. The root `check:route-census` gate owns drift detection |
| Make project workspace optional | Superseded — PM Workspace was removed outright by migration `1159_build_remove_pm_workspaces`; see the row below |
| Remove PM Workspace entirely | Migration `1159_build_remove_pm_workspaces` drops `build.pm_workspaces`, `build.pm_workspace_memberships`, and every `pm_workspace_id` column; `build.project_workspace_members` renamed to `build.build_members`. All 9 `/build/workspaces*` endpoints and routes deleted; deep links redirect to `/build` and its scoped pages. See [`99-kill-list.md`](./99-kill-list.md) |
| Close authorization gaps for lists, details, projections, mutations | `check:build-authz-census` covers 49 controllers and 325 handlers: `VULNERABLE=0`, `NEEDS-REVIEW=0`, `CLOSED=42`, `VERIFIED=283`. The generated evidence is under `backend-docs/`. |
| Workload with HR leave/capacity and Timesheets actuals | `backend/src/modules/build/execution/workload-capacity.service.ts` reads `leaveRequests` filtered to `APPROVED`, `timesheetSettings.expectedDailyHours` and `timesheets`; served at `/build/:projectId/workload/capacity`, consumed by `frontend/hooks/api/build/workload-capacity.ts` and wired at `frontend/features/build/project-detail/project-board-page.tsx:96` |
| Add project filtering to Inbox | `frontend/features/build/inbox/inbox-filter-bar.tsx:23,95-102`; index applied by `backend/migrations/1151_notifications_metadata_project_id_index.sql` |
| Change Request release, client visibility, and affected-ticket linkage | `backend/src/db/schema/build/change-requests.ts`, `backend/src/modules/build/client-portal/change-request-affected-items.service.ts`, and `frontend/hooks/api/build/change-request-affected-items.ts` |
| Sprint/Cycle and QA Bug **application** cutover (backend) | Cycle-only and canonical BUG invariant specs under `backend/src/modules/build/phase-2/` |
| **A1 — frontend Sprint→Cycle read cutover** | Landed `36e7402ad` / `f794b484a`. Re-measured at `f794b484a`: the `sprintId` census returns **0** across the whole frontend. `frontend/hooks/api/build/sprints.ts` and `frontend/types/projects/sprints.ts` are deleted |
| **A1b — backend `tickets.sprint_id` removal** | Landed `e06314424`, `de8ccd58a`. `tickets`, `project_meetings`, `test_runs` and `sprint_scope_events` no longer declare `sprint_id`; the only remaining `sprint_id` in the schema is `cycles.legacy_sprint_id` (`backend/src/db/schema/build/core.ts:165`) |
| **A4 — invoice → timesheet pointer** | Landed `8bd5a84b4`. `invoice_items.timesheet_entry_id` is written and read — `backend/src/modules/invoices/invoices-write.service.ts:139`, `invoices-update.service.ts:130,168`, `invoices.service.ts:121` |
| QA Bug legacy writer | Deleted `06b398ec8`. No non-test `from(bugs)`, `insert(bugs)`, `update(bugs)` or `delete(bugs)` remains |
| **A2 — retire the `build.sprints` access path** | Landed on `main` as the coordinator's **freeze**: every `SprintsService` verb throws `GoneException`, `cycles.legacy_sprint_id` was removed from the schema, and `e48e4d139` deleted the `sprints` and `bugs` table declarations outright. A parallel branch in this lane reached the same goal by bridging the endpoints through `cycles` instead; **the freeze is the winner** and the bridge was discarded. Guarded going forward by `backend/src/modules/build/phase-2/sprint-cycle-drop-invariant.spec.ts` |
| **A5 — the phase-05 rename** | Resolved on `main` in `1baada9ca`: the two `RENAME` statements were split out into `migrations/sql/a-sprint-cycle-06-rename-scope-events.sql`, so the drop no longer requires a same-instant code deploy |
| Build search migrations `1185` and `1186`, historically `1177` and `1178` | Applied to production Aurora PostgreSQL after snapshot `streamlineos-pre-build-1177-1178-20260924-1` reached `AVAILABLE`; ledger `created_at` values are `1803000010691` and `1803000010701`, exact local SHA-256 hashes match, all 11 expected indexes and both search functions exist, both functions are `SECURITY DEFINER`, executable by `streamline_app`, scoped through `app.current_org_id()`, and the cross-tenant probe returned `0`. Build-specific migration evidence is complete; unrelated mixed-module journal backlog remains. |

Nine physical route removals are recorded in [`99-kill-list.md`](./99-kill-list.md) and are not
repeated here.

---

## Stage A — application code cutover

Nothing in Stage D may run until every Stage A task is deployed. Dropping a column that live
code still reads raises PostgreSQL `42703` on production traffic with no warning.

A1 through A5 have landed and moved to the historical table above. **No application-code or production-migration blocker remains for the contraction.**

#### A3 — Change Requests: affected-work linkage — **DONE IN CURRENT BRANCH**

- **User job:** see which tickets a change request actually changes, so scope impact is reviewable.
- **Owner:** backend, then frontend
- **Depends on:** none
- **Acceptance:** a tenant-safe link from change requests to work items exists with bounded list, link, and unlink operations.
- **Evidence:** `backend/src/modules/build/client-portal/change-request-affected-items.controller.ts`, `change-request-affected-items.service.ts`, and `frontend/hooks/api/build/change-request-affected-items.ts`.
- **Effort:** spent

## Stage B — verification

#### B1 — Prove the Sprint/Cycle detach precondition in code, not only in data

- **User job:** none directly — this is the guard that stops A1/A2 shipping half-done.
- **Owner:** backend
- **Depends on:** nothing further
- **Acceptance:** an invariant spec fails if any non-schema reference to `tickets.sprint_id` or to the `sprints` table reappears, in string, Drizzle relational (`sprintId: true`) and query-builder form, with an empty allowlist.
- **Evidence:** the `tickets.sprint_id` half is `backend/src/modules/build/phase-2/sprint-cycle-detach-invariant.spec.ts`; the table half is `backend/src/modules/build/phase-2/sprint-cycle-drop-invariant.spec.ts`. The migration guard is a data check and the invariant specs own application-code coverage.
- **Effort:** spent

#### B2 — Run the QA Bug contract verification — **DONE 2026-09-22**

- **User job:** none directly — it is the precondition for freezing `build.bugs`.
- **Owner:** repo owner (needs a database)
- **Depends on:** nothing further
- **Acceptance:** all 14 checks in `b-qa-bug-03-verify.sql` return zero. **Met.**
- **Evidence:** executed against the production Aurora cluster over a read-only IAM connection inside a `SET TRANSACTION READ ONLY` transaction on 2026-09-22. All 14 named checks returned 0. **Read the vacuity caveat in Stage D before treating this as a successful migration:** `build.bugs` has 0 rows, so the checks passed over an empty table.
- **Effort:** spent

#### B3 — Measure `check:contract-parity` outside a junctioned worktree — **DONE FOR THE PREVIOUS RELEASE**

- **User job:** none directly — it is the only unmeasured gate in the closure set.
- **Owner:** coordinator
- **Depends on:** none
- **Acceptance:** the gate runs to completion from a checkout with its own dependencies.
- **Evidence:** [RELEASE-STATUS.md](./RELEASE-STATUS.md) section 6 records the previous-release result. The current branch must rerun it before release.
- **Effort:** spent for the previous release

## Stage C — deployment — DONE

Backend and frontend were deployed together, which was not optional: the contract change is
breaking in **both** directions — the frontend stopped sending and reading `sprintId`, and the
backend now rejects it with a 400. The repo owner confirmed the deploy before authorizing the
contraction.

`https://api.streamlineos.in/health` returns 200 with database, cache and queue `up`.

**The ordering rule that nearly went the wrong way.** An earlier cutover plan said not to
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

The contraction is **complete**. It was executed on 2026-09-22 against production over IAM auth after the merged code was deployed. The durable postconditions are summarized in [RELEASE-STATUS.md](./RELEASE-STATUS.md) and the procedure is retained in [MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md).

**Re-verified independently here on 2026-09-23** over a read-only IAM connection inside a
`SET TRANSACTION READ ONLY` transaction: 13 catalog assertions confirmed the applied state, including the phase 06 rename. Post-state: 220 tickets, 103 with a
cycle, 44 of type `BUG`, 5 cycles, 4 archived sprints, migration ledger at 913.

Two details worth keeping, because they look like drift and are not:

- `cycles.legacy_sprint_id` still exists as a column. Nothing reads it; it was left in place deliberately.
- Every constraint and index on `cycle_scope_events` still carries a `sprint_scope_events_*` name. `ALTER TABLE … RENAME TO` does not rename them, and the Drizzle declarations match the live names exactly. This is correct, not drift.

The per-phase task blocks that used to sit here are retired. Each phase ran with a manual cluster
snapshot taken first, its own preconditions measured rather than assumed, and its postconditions
read back from the catalog. The one deviation worth carrying forward: `b-qa-bug-05-contract-drop.sql`
had **no `-rollback.sql`**, so its snapshot was the only reversal — that asymmetry is a property of
the file, not of the run, and would apply again to any re-use.

## Stage E — browser verification — DONE FOR THE CURRENT WORKTREE

E1 completed. Every authenticated parent route was exercised in a real browser. Focused desktop, 375 px mobile, URL-state, focus-refresh, and data-backed cycle/ticket detail checks passed with no current console errors. Exact route evidence and the production-fixture limitation are recorded in [RELEASE-STATUS.md](./RELEASE-STATUS.md).

Two surfaces deserve attention first, because a defect there fails quietly rather than loudly:

- **Burnup report.** `cycle_scope_events` was renamed in the same window its readers were renamed. A mismatch surfaces as `42P01`, not as a wrong number.
- **Meeting agenda generation.** It used to filter on sprint equality; an incorrect cutover returns an **empty agenda with no error**, which is the failure mode this programme has already shipped once.

Browser evidence is release-specific and must be recorded in [RELEASE-STATUS.md](./RELEASE-STATUS.md), not carried forward from a previous branch.

---

## P1 — competitive daily workflow, after closure

Ordered by dependency on the closure stages above.

#### P1-1 — Canonical route consolidation — **DONE**

- **User job:** reach each job at one canonical destination instead of two.
- **Owner:** frontend
- **Depends on:** complete
- **Acceptance:** each removed page has one canonical owner and a compatibility redirect where required.
- **Evidence:** the manifest contains 65 entries, all `KEEP`; removed aliases and destinations are tabulated in [99-kill-list.md](./99-kill-list.md).
- **Effort:** spent

#### P1-2 — Shared URL-state, filter, sort and cursor contract

- **User job:** share a filtered list by copying the URL and get the same view back.
- **Owner:** frontend
- **Depends on:** none
- **Acceptance:** every Build list route reads and writes state through the shared hook; keyset cursors match their `ORDER BY`.
- **Evidence:** `frontend/features/build/shared/use-build-list-url-state.ts` is the canonical serializer used by the shared filter hook and its existing consumers; the organization project directory uses it in `frontend/features/build/project-list/projects-page.tsx` (pushed in `92e278a23`), Roadmap tab pagination writes the shared `cursor` parameter through `frontend/features/build/shared/use-build-list-filters.ts`, project Triage uses the same hook for search and cursor pagination in `frontend/features/build/triage/triage-page.tsx`, and Intake now persists its tab in the shared `tab` parameter in `frontend/features/build/intake/intake-page.tsx`. Focused URL-state, roadmap, cursor-history, Triage, and Intake coverage passes 72 tests. Domain-specific state remains intentionally separate for Inbox, Cycles, Feedbucket, Reports, and detail overlays; the remaining collection audit is still open.
- **Effort:** 4–6 d

#### P1-3 — Canonical Issues explorer residual — **DONE FOR CURRENT RELEASE**

- **User job:** run board, list, table and timeline from one screen with saved views and bulk actions.
- **Owner:** frontend
- **Depends on:** P1-2
- **Acceptance:** `view=timeline`, `type=BUG` and saved-view management all work from `/build/[projectId]/issues`, which is what P1-1 needs before three of its removals can run.
- **Evidence:** the view ladder is the exhaustive switch in `frontend/features/build/views/project-board-content.tsx`; timeline and BUG aliases redirect into Issues; `use-board-url-state.test.tsx`, `saved-views-menu.test.tsx`, and `build-redirect-route-removal.test.ts` pass 107 tests together; local port `1000` browser verification rendered `/build/6/issues?view=timeline&type=BUG` with zero browser error logs.
- **Effort:** spent

#### P1-4 — One guided freelancer flow

- **User job:** carry one engagement from deal to quote to signed agreement to project to approved time to invoice to payment without re-keying.
- **Owner:** backend, then frontend
- **Depends on:** none — the invoice → timesheet pointer is merged
- **Acceptance:** each handoff is one action with the prior record's identity carried forward; no step requires retyping a value the previous step already holds.
- **Evidence:** every screen exists today and the complete guided handoff does not — `/crm/quotes`, `/sign/envelopes`, `/timesheets/billing`, `/accounting/invoices` and `/accounting/payments-received` all resolve. Build preserves the existing deal-to-project identity on retries in `backend/src/modules/build/core/projects-provision.service.ts`; accepted quote conversion now carries `clientId`, `dealId`, and an existing deal-linked `projectId` into the invoice in `backend/src/modules/quotes/quotes-lifecycle.service.ts`; the accepted quote page now opens the existing Sign envelope flow with `sourceModule=crm`, `sourceEntityType=quote`, and the quote ID; and the merged `invoice_items.timesheet_entry_id` pointer carries approved-time traceability. The completed e-sign event now marks the tenant-scoped CRM quote signed and provisions its deal-linked Build project through `backend/src/modules/e-sign/sign-envelope-completed-consumer.service.ts`, covered by `backend/src/modules/e-sign/sign-envelope-completed-consumer.service.spec.ts`. Project-to-time and payment handoffs remain open because the current surfaces still require separate navigation and do not preserve a single guided continuation.
- **Effort:** 10–15 d

#### P1-5 — Feedbucket bulk actions and server-side filters — **DONE FOR CURRENT RELEASE**

- **User job:** triage a backlog of submissions without opening each one.
- **Owner:** backend, then frontend
- **Depends on:** P1-2 contract primitives; Feedbucket implementation is independently complete.
- **Acceptance:** owner, linked, duplicate, date and cursor filters are evaluated on the server; bulk actions are bounded and idempotent.
- **Evidence:** `backend/src/modules/feedbucket/feedbucket-submissions.service.ts` evaluates predicates in SQL; `feedbucket-submissions-bulk.ts` re-evaluates the supplied filters inside a transaction and bounds the mutation; `feedbucket-list-filters.spec.ts`, `feedbucket-list-predicate.spec.ts`, `feedbucket-submissions-bulk.spec.ts`, and `feedbucket-bulk-route-contract.spec.ts` pass 76 tests; the frontend sends the URL filters in `frontend/features/build/feedbucket/project-submissions-inbox.tsx`.
- **Effort:** spent

#### P1-6 — Realtime version gaps and conflict recovery — **DONE FOR CURRENT RELEASE**

- **User job:** recover cleanly when two people edit the same record, or when a tab reconnects after losing the network.
- **Owner:** frontend
- **Depends on:** none
- **Acceptance:** a version conflict is surfaced and resolvable; a reconnect replays without duplicating a mutation.
- **Evidence:** ticket edits send `expectedUpdatedAt` and surface a `Reapply` action in `frontend/features/build/ticket-details/use-ticket-detail.ts`; `frontend/lib/build-cache-sync.ts` refreshes active Build queries on focus/visibility and invalidates peer tabs through BroadcastChannel or storage fallback; focused frontend tests pass 20/20 across `use-ticket-detail.test.tsx`, `build-cache-sync.test.tsx`, and optimistic/offline mutation coverage.
- **Effort:** spent

#### P1-7 — Import with preview, validation, mapping and rollback — **DONE FOR CURRENT RELEASE**

- **User job:** move an existing Jira, ClickUp, Linear, Trello or CSV backlog in without losing history.
- **Owner:** backend, then frontend
- **Depends on:** C1
- **Acceptance:** a dry run reports what will be created before anything is written; a failed import rolls back completely and reports why.
- **Evidence:** Backend controller and service are implemented in `backend/src/modules/build/import-export/`, including permission checks, project scoping, CSV/JSON parsing, preview-only validation, confirmation-token enforcement, bounded writes, atomic rollback, partial-mode reporting, and idempotency. The frontend flow is implemented in `frontend/features/build/import-export/` and mounted from `frontend/features/build/project-detail/project-board-page.tsx`. Focused verification passes 9 backend suites / 121 tests and 7 frontend suites / 80 tests.
- **Effort:** spent

#### P1-8 — Product prioritization inputs — **PARTIAL**

- **User job:** decide what to build next using customer revenue and tier, not opinion.
- **Owner:** backend, then frontend
- **Depends on:** P1-4
- **Acceptance:** feedback carries CRM-sourced revenue and tier; a scoring frame is applied on the roadmap; adoption outcomes return to the insight.
- **Evidence:** Roadmap RICE scoring and CRM tier/revenue weighting are implemented in `backend/src/modules/build/core/projects-roadmap.service.ts` and `backend/src/modules/build/core/roadmap-accounts.ts`. Managed-product insights expose tenant-scoped roadmap status, linked feedback status, and feedback-vote outcome aggregates through `backend/src/modules/build/managed-products/managed-products.service.ts`, with the frontend rendered in `frontend/features/build/managed-products/product-insights-page.tsx`. Feedback creation and CRM reassignment now persist tenant-validated `accountTierSnapshot` and `accountValueSnapshot` through `backend/src/modules/build/core/projects-feedback.service.ts`; migration `backend/migrations/1204_build_feedback_account_snapshots.sql` is applied to production RDS and its column, index, and ledger hash were read back. Focused backend verification passes 50 tests and frontend roadmap verification passes 40 tests. The remaining gap is an authenticated browser run with a real managed-product fixture; the local tenant has no managed-product fixture row.
- **Effort:** in progress

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
