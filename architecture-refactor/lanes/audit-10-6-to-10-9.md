# Audit: PRD-10-10 Subsections 10.6 – 10.9

**Auditor territory:** 10.6 HRMS · 10.7 Payroll · 10.8 Build/PM · 10.9 Workflows and automation
**Date:** 2026-09-02

---

## Summary

| Classification | Count |
|---|---|
| VERIFIED DONE | 2 |
| STILL PENDING | 18 |
| REGRESSED | 0 |
| NEW FINDING | 2 |

**Spot-checked `[x]` bullet:** 10.7 crash-consistency — passes.

**Ranked NEW FINDINGS:**
1. (P2) Payroll schema uses `decimal(15,2)` for all financial columns — deviates from "Money as integer cents" rule in `backend/CLAUDE.md §3`. Not a floating-point risk, but an exact-decimal deviation that creates inconsistency and arithmetic risk in application-layer aggregations.
2. (P2) Four local Build query-key factories remain in the frontend hooks directory, not mirrored in the canonical `queryKeys` factory — mutations in other files cannot correctly invalidate these reads by prefix.

**Coverage note:** The broad bullets in 10.6–10.9 each span dozens of files. I audited key representative paths — named below per bullet. Bullets I could not audit fully are marked STILL PENDING; I name the sample I checked and what remains unverified.

---

## 10.6 HRMS

### Bullet 1 — Architecture/schema: people/employment, leave, attendance, recruitment, onboarding, performance, benefits, documents and approval lifecycles
**Classification: STILL PENDING**

Checked: `db/schema/hr/` is frozen at 170+ tables per `backend/CLAUDE.md §1`; the person seam at `modules/directory/person-seam.ts` discriminates `user|worker|person` and returns `{ status: "unresolved" }` for cross-tenant subjects; `organization_people` / `organization_members` / `workers` / `hr_people` / `hr_employments` facets are documented as distinct. `leave_balances` exists and is written transactionally in `comp-off-grant.service.ts`.

Not checked: full normalization of benefits, performance, recruitment, and document approval relation tables; correct `org_id` FK cascade on all 170+ tables; absence of JSONB arrays masking list data.

---

### Bullet 2 — Routes/contracts: resource-specific controllers, strict Zod, self vs administration routes, bounded bulk, no client actor/current-org
**Classification: STILL PENDING**

Checked: Self-service separation confirmed — `employee-time-off.controller.ts` uses `self:leaves` / `self:attendance`; `employee-attendance.controller.ts` uses `self:attendance`; `onboarding.controller.ts` uses `self:onboarding-tasks`; `employee-recruitment.controller.ts` uses `self:recruitment`. Administrative routes use `hr:leaves:*`, `hr:employees:*`. Route classifier gate reports 0 undeclared handlers across all 3,518 handlers (`backend/CLAUDE.md §2`). `body.userId` in assets / background-verification is a **target** employee id (legitimate, not the caller actor). `u.orgId` is always derived from the token (`@CurrentUser()`), never from the body.

Not checked: all ~200 HR controller methods for strict Zod schema presence (`@Validate({ body })`); all bulk-operation caps.

---

### Bullet 3 — Authorization/privacy: own/team/department/branch/org DataScope, sensitive projections, candidate/employee separation, approvals, cross-tenant denial
**Classification: STILL PENDING**

Checked: `applyScope` is imported and applied in `hr-custom-fields.service.ts`, `hr-employee-record-lists.service.ts`, `hr-core-list-cursors.ts`. `hr-permission-boundaries.spec.ts` proves background verification requires `hr:sensitive:view/manage`; proxy delegation cannot be derived from employee permissions; org structure gates on `settings:*`. `hr-core-employee-scope.spec.ts` verifies `applyScope` is called for list queries. Cross-tenant: `payslip-download.service.ts` returns 404 (not 403) for a cross-org publicationId.

Not checked: recruitment/candidate/employee separation in all recruitment-stage controllers; team/department DataScope for HR leave approvals; full cross-tenant denial tests for every HR sub-module.

---

### Bullet 4 — Queries/cache/workers: cursors, filters, exports, leave balances, attendance and review paths; tenant-leading indexes; cache invalidation; bounded reminders/imports/exports
**Classification: STILL PENDING**

Checked: `hr-read-limits.ts` provides `boundHrReadLimit(value, cap = 100)` capping at 100; tested in `hr-read-limits.spec.ts`. `hr-lifecycle-read-caps.spec.ts` caps department analytics (≥2× `.limit(1_000)`), dashboard export (`.limit(10_000)`), probation resolution, onboarding template selection and payroll snapshot reads. `hr-unbounded-read-batch-s02.spec.ts` covers 30+ specific service/query pairs asserting a `.limit(...)` call near each query anchor. Import batch uses `IMPORT_ROW_BATCH_SIZE = 500` with ascending cursor (`gt(id, afterId)`), verified in `hr-actionable-read-batches.spec.ts`. Leave balance reads use `limit(200)` in `comp-off-grant.service.ts`.

Not checked: all HR cache invalidation after mutations (HR module has no server-side Redis cache — invalidation is entirely TanStack Query on the frontend); all tenant-leading composite index presence; all reminder sweep bounds.

---

### Bullet 5 — Frontend/TanStack/tests: canonical HR routes, form parity, self/admin separation, all UI states, responsive tables/forms and full CRUD/approval/cross-tenant E2E
**Classification: STILL PENDING**

Checked: `features/hr/` directory exists with sub-features. `hooks/api/hr/` has 40+ hook files. `hooks/api/hr/attendance.ts` uses `useCan("self:attendance")` and `useCan("hr:attendance:view")` gating reads. Mutations in `hooks/api/hr/announcements.ts` have no `useCan` check (announcements mutation is not gated on the hook — backend RBAC is the gate).

Not checked: canonical HR route structure completeness; form parity for all HR sub-domains; loading/empty/error states for all pages; responsive tables; E2E tests for CRUD, approval, cross-tenant.

---

### Bullet 6 — Classify every HR mutation hook as universal/self or permissioned; route non-universal leave, attendance, recruitment, onboarding, performance, benefits and document commands through the exact authorized-mutation interface and prove in-flight revocation behavior
**Classification: STILL PENDING**

Checked: `hr-command-safety.spec.ts` classifies and verifies idempotency + rate-limit for exactly 4 commands: `hr.people.backfill-from-members`, `hr.employees.onboard-bulk`, `hr.effective-changes.apply-due`, `hr.onboarding.send-reminders`. These verify `@Idempotent`, `@UseRateLimit` and `RateLimitGuard` on those 4 handlers. This is insufficient — the bullet requires **every** HR mutation hook to be classified. No comprehensive enumeration of the full set exists. In-flight revocation behavior (permission removed between the read and the mutation) is not proved across HR sub-domains.

---

## 10.7 Payroll

### Bullet 1 — Architecture/schema: payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history; normalized, tenant-safe, immutable where financial
**Classification: STILL PENDING**

Checked: `db/schema/payroll/` contains 18 schema files: `runs.ts`, `claims-and-settlements.ts`, `entities-periods.ts`, `payslip-publications.ts`, `payout.ts`, `tax-windows.ts`, `policies.ts`, `workforce.ts`, etc. All run-modifying operations go through `canTransitionRun` in `payroll.types.ts` (state machine: `PENDING_APPROVAL → APPROVED → LOCKED → PAID → PAYSLIPS_PUBLISHED → CLOSED`); `CLOSED` has no outbound transitions (immutable terminal state). Payslip publications exist as a separate `payslip_publications` table.

**IMPORTANT schema deviation (see NEW FINDING 1):** Financial columns use `decimal("col", { precision: 15, scale: 2 })` across all tables (runs, components, snapshots, claims). This is exact (`NUMERIC(15,2)`) but not integer cents as required by `backend/CLAUDE.md §3`.

Not checked: full normalization of tax/deduction component tables; reconciliation history table existence; all org_id FK cascade correctness.

---

### Bullet 2 — Routes/contracts: calculation, lock, approve, publish, reverse and export operations; strict schemas, idempotency, explicit state transitions
**Classification: STILL PENDING**

Checked: Lock transitions are guarded by `canTransitionRun` in `locking.service.ts`. Approval actions in `payout/insights/` carry `@Idempotent("payroll.incentive.approve")`, `@Idempotent("payroll.reimbursement.approve")`, etc. State machine prevents invalid transitions. Payroll runs E2E spec (`payroll-runs.controller.e2e-spec.ts`) and payout E2E spec (`payroll-payout.controller.e2e-spec.ts`) exist.

Not checked: Zod schema completeness on all payroll DTOs; the reversal endpoint and its idempotency; export contract (format/version stability).

---

### Bullet 3 — Authorization/privacy: payroll owner/admin/member, approver, self-payslip, separation-of-duties, sensitive projections and every mutation hook
**Classification: STILL PENDING**

Checked: `payslip-download.service.ts:61-79` — self-payslip check uses `callerMembershipId === publication.userMembershipId`; admin access requires `payroll:payslips:view`; cross-tenant returns 404. `publishing.controller.ts` uses both `payroll:payslips:view` (admin) and `self:payslips` (employee). `payroll-payout.controller.e2e-spec.ts` verifies 403 for approve-only caller on lock/reopen/bank/payslip routes, and 200 for correctly-permissioned callers.

Not checked: separation-of-duties enforcement (can the same person both approve and post?); sensitive projection controls (who can see salary components vs net pay); all mutation hook permission keys.

---

### Bullet 4 — Queries/cache/workers: bounded run/item reads, indexed paths, no N+1, asynchronous exports, correct invalidation after lock/publish/reversal
**Classification: STILL PENDING**

Checked: Asynchronous export via `payroll-export-worker.service.ts` — uses `forEachOrg` pattern with `claim(orgId)`, keyset-paged rows, progress tracking, `complete`/`fail` states. Payroll cursor spec verifies stable cursor round-trip. Frontend payroll approval hooks invalidate `queryKeys.payroll.run(runId)` and `queryKeys.payroll.all + "runs"` on all approval mutations.

Not checked: N+1 absence in `generate-pipeline.service.ts`; all indexed query paths (especially run+employee+period composites); server-side Redis cache invalidation (payroll has no Redis cache — confirmed by absence of any Redis import in the module).

---

### Bullet 5 — Frontend/TanStack/tests: run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E
**Classification: STILL PENDING**

Checked: `hooks/api/payroll/` has 30+ hook files all using `useCan` gates. `payslip-download.service.ts` streams the PDF directly (no presigned URL; access gate at the API layer). Frontend payroll approval hooks correctly invalidate run and run-list cache after mutations.

Not checked: run-state UI completeness for all states; conflict/retry/partial-failure UI; E2E test existence for calculation, locking, reconciliation flows.

---

### Bullet — [x] Make Payroll finalization and Accounting posting crash-consistent (SPOT-CHECK)
**Classification: VERIFIED DONE**

Evidence: `backend/src/modules/payroll/payout/locking.service.ts:94` — `await OutboxWriter.emit(tx, { eventType: PAYROLL_RUN_POSTING_INTENT_EVENT, ... })` is called inside the same `db.transaction(async (tx) => { ... })` block that sets `status: "LOCKED"` and `postingState: "pending"`. The intent rolls back with the lock if the outer transaction fails. `payroll-posting-intent.consumer.ts:49` — `inbox.claim(CONSUMER_NAME, ...)` atomically claims the outbox row; `postingState: "posted"` is set after successful posting. `posting_state` column exists on `payrollRuns` per the update at line 82 (`postingState: "pending"` written in the lock transaction).

---

## 10.8 Build/PM

### Bullet 1 — Architecture/schema: keep project and product entities distinct; verify workspaces, projects, products, tickets, boards, sprints, roadmaps, OKRs, feedback and QA relations
**Classification: STILL PENDING**

Checked: `db/schema/build/core.ts:28` — `projects` table (`"projects"`). `db/schema/build/managed-products.ts:20` — `managed_products` table (`"managed_products"`). These are DISTINCT tables in separate schema files; no merge or conflation detected. `modules/build/core/` handles projects; `modules/build/managed-products/` handles products. Tickets, boards (via `project_statuses`), sprints exist in `build/` schema. Roadmap in `build/roadmap.ts`; OKRs/goals schema exists (`build/goals.ts`); QA schema in `build/qa.ts`.

Not checked: all FK relationship correctness; change-requests, incidents, sprint-event normalization; full relation graph for managed products (releases, roadmap entries).

---

### Bullet 2 — Routes/contracts: canonical `/build` resources, strict schemas, stable cursors/filter/sort contracts, idempotent mutations and bounded bulk
**Classification: STILL PENDING**

Checked: `build-route-order.spec.ts` verifies no bare `:param` route shadows a literal sibling under `/build`. Route classifier gate at 0 undeclared handlers. Ticket sort uses composite `[primary, createdAt DESC, id ASC]` for stable ordering.

Not checked: Zod DTO completeness for all Build controllers; idempotency on build mutations; bulk operation caps.

---

### Bullet 3 — Authorization: workspace/project/product membership, module roles, record scope, private resources, watchers/assignees and cross-tenant identifiers
**Classification: STILL PENDING**

Checked: `build-uncovered.controller.e2e-spec.ts` verifies 403 for: workspace create without `build:workspaces:create`; team create without `build:teams:create`; QA test-case create without `build:qa:manage`; bug create without `build:bugs:create`. Cross-tenant workspace returns 404 not 403. `hr-permission-boundaries.spec.ts` pattern does not cover Build (separate spec exists for Build).

Not checked: private resource (private boards, watchers-only visibility) access control; watcher/assignee implicit access patterns; project membership vs workspace membership hierarchy.

---

### Bullet 4 — Queries/cache/events: board/backlog/search plans, ordering tie-breakers, counters, cache invalidation and duplicate-safe activity/notification events
**Classification: STILL PENDING**

Checked: Ticket ordering in `projects-tickets-read.service.ts:328-333` — `sortExpr` always ends with `[desc(createdAt), asc(id)]` ensuring stable total order. Board keyset spec (`board-keyset.spec.ts`) and board cursor paging spec exist. Board-column aggregate spec exists.

Not checked: search query plan verification; counter correctness and atomic updates; cache invalidation scope for board/backlog mutations; duplicate-safe activity event emission.

---

### Bullet 5 — Frontend/TanStack/tests: drag/reorder concurrency, optimistic rollback, filter/cursor reset, route/action parity, responsive boards and CRUD/cross-scope E2E
**Classification: STILL PENDING**

Checked: `features/build/views/use-kanban-drag.ts` uses `useReorderCustomStates` for column reorder. Optimistic rollback exists in `useReorderCustomStates` (snapshot captured in `snapshotRef`, restored in `onError`). Kanban uses virtualization via `features/build/views/kanban-virtual-ticket-list.tsx`.

Not checked: filter/cursor reset on navigation; route/action parity across all Build pages; responsive board behavior; cross-scope E2E test existence.

---

### Bullet 6 — Replace `Promise.all` per-row custom-state reorder calls with one bounded bulk command
**Classification: VERIFIED DONE**

Evidence:
- **Backend:** `backend/src/modules/build/core/projects-custom-states.service.ts:205-258` — `bulkReorderCustomStates` method. Takes a `BulkReorderStatesInput` with `items[]`. Expected-version check (lines 230-238) returns 409 with `{ error: "conflict", conflicts }` if any `expectedOrder` mismatches. Single `db.transaction(async (tx) => { ... })` wrapping all updates (lines 240-256) — complete rollback on any failure.
- **Frontend:** `frontend/hooks/api/build/custom-states.ts:110-151` — `useReorderCustomStates` calls `apiClient.put("/build/${projectId}/custom-states", { items })` (one bulk PUT). `MAX_BULK_REORDER = 50` bound enforced client-side. `snapshotRef` captures the pre-mutation state; `onError` restores the full snapshot. `onSettled` invalidates via canonical `queryKeys.projects.customStates(projectId)`.
- **Spec:** `backend/src/modules/build/core/projects-custom-states-bulk-reorder.spec.ts` verifies idempotency, cross-project denial, expected-order conflict, schema limit enforcement.

---

### Bullet 7 — Remove local Build query-key factories such as `stateKeys`; all Build reads/mutations must use the canonical factory
**Classification: STILL PENDING**

Checked: The original `stateKeys` factory is no longer present. However, four local factories remain in `frontend/hooks/api/build/`:

| File | Local factory | Base key |
|---|---|---|
| `customers.ts:18` | `projectCustomersQueryKeys` | `["streamlineos","projects","customers"]` |
| `roster.ts:30` | `rosterQueryKeys` | (similar prefix) |
| `teams.ts:26` | `teamQueryKeys` | `["streamlineos","projects","teams"]` |
| `workspace-members.ts:34` | `projectWorkspaceMembersQueryKeys` | (similar prefix) |

None of these entities have entries in `frontend/lib/query-keys/build-work.ts` or any other canonical factory file. The mutations in each file correctly invalidate using the same local factory (self-consistent), but cross-file invalidation is impossible without importing the local factory. This is the defect class the bullet targets.

---

## 10.9 Workflows and Automation

### Bullet 1 — Architecture/schema: definitions, immutable versions, triggers, schedules, secrets references, runs, steps, approvals and execution attempts
**Classification: STILL PENDING**

Checked: `db/schema/common/workflow.ts` contains: `workflows` (with `version` field), `workflowVersions` (immutable, FK `workflowId`), `workflowExecutions` (FK `workflowVersionId`), `workflowExecutionSteps`, `workflowApprovals` (FK `step_id`), `workflowSchedules`, `workflowVariables` (FK `workflowVersionId` — version-scoped), `workflowSecrets` (org-level, no `workflowId` FK), `workflowAuditLogs`. Versions are append-only (no update after publish is validated by service logic). Secrets are AES-GCM encrypted at rest via `common/security/secret-encryption.util`.

Not checked: tenant FK completeness for all 9 workflow tables; execution attempt count column existence; version number uniqueness constraint (`uniq_workflow_versions_workflow_version` exists on `(workflowId, version)` — confirmed in schema).

---

### Bullet 2 — Routes/contracts: create/version/publish/pause/run/cancel/retry/approve operations; strict schemas, idempotency, explicit state transitions
**Classification: STILL PENDING**

Checked: `workflows.controller.ts` has `@RequirePermission` on all 30+ handlers. Trigger/cancel/approve paths exist. `claimExecution` uses an atomic status transition `pending|waiting → running` so two concurrent callers cannot both claim the same execution (`execution-claim.ts:24-43`).

Not checked: Zod DTO coverage of all payloads; pause operation existence; retry API (vs internal retry); version publish immutability enforcement; explicit state machine for `workflowExecutions.status`.

---

### Bullet 3 — Authorization/security: authoring vs execution/approval permissions, secret non-disclosure, module/record scope and cross-tenant trigger targets
**Classification: STILL PENDING**

Checked:
- **Secret non-disclosure:** `SECRET_COLUMNS` in `workflows-secrets.service.ts:9-16` explicitly excludes `encryptedValue`. `listGlobalSecrets` and `listSecrets` return only id, name, description, timestamps. `createGlobalSecret`/`createSecret` return the same projected columns.
- **Secret sinks:** `workflows-secret-sinks.spec.ts` proves: execution context schema strips a `secrets` field; `writeRunState` never emits a `secrets` key; `NotFoundException` messages are static (never embed submitted values); `createGlobalSecret` returns projected columns without `encryptedValue`; service has no Logger (no accidental secret log).
- **Encryption:** `workflows-secrets.service.spec.ts` verifies AES-GCM round-trip, random IV per encrypt call, auth-tag integrity check, fail-closed when `ENCRYPTION_KEY` absent.
- **Frontend gates:** `hooks/api/workflows/workflows-gates.test.tsx` proves `useWorkflows` does not call the API when `workflows:workflows:view` is absent, does call it when granted, and org-owner bypasses.
- Permission separation: `workflows:secrets:manage` gates create/delete; `workflows:workflows:view/update/delete/publish` gates authoring; `workflows:executions:manage` gates trigger/cancel.

Not checked: cross-tenant trigger target validation (can a workflow in org A trigger a webhook at org B's resource?); module scope (does `@RequireModule("WORKFLOWS")` gate all workflow routes?); record-level scope for workspace-scoped workflows.

---

### Bullet 4 — Queries/cache/workers: leases, concurrency limits, retries/backoff, cancellation, DLQ, schedule deduplication, bounded histories and consumer registration
**Classification: STILL PENDING**

Checked:
- **Schedule deduplication:** `workflow-schedule-tick.service.ts:112-123` — `triggerSchedule` uses an optimistic UPDATE with the same `lte(nextRunAt, now)` condition used by the read; at READ COMMITTED isolation the second concurrent UPDATE finds `nextRunAt` already advanced (committed by the first) and returns 0 rows (`claimed = undefined`). Double-firing is prevented without `FOR UPDATE SKIP LOCKED`.
- **Retry/backoff:** `workflow-runner.service.ts:176-187` — `isTransientInfraError` detected; `backoffMs(attempt)` computes delay; `releaseToWaiting` reschedules; `OUTBOX_MAX_RETRIES` enforced. After max retries, status becomes `"failed"`.
- **Bounded lists:** `listSchedules` `.limit(100)`; `listAllSchedules` `.limit(200)`; `listGlobalSecrets` `.limit(200)`; `workflowAuditLogs` not checked.
- **Claim:** Execution claim is a status transition (`pending|waiting → running`); no explicit lease TTL.

Not checked: concurrency cap (max concurrent executions per org or workflow); DLQ (failed executions are marked `failed` in DB; no separate DLQ queue — this may be by design); cancellation propagation to in-flight steps; consumer registration completeness; schedule deduplication at creation time (no unique constraint on `(workflowId, cronExpression)`).

---

### Bullet 5 — Frontend/TanStack/tests: editor/run-history state, version conflicts, permission gates, polling/subscription cleanup and deterministic execution/recovery tests
**Classification: STILL PENDING**

Checked:
- **Permission gates:** `workflows-gates.test.tsx` (10 tests) verifies `useWorkflows` is gated on `workflows:workflows:view`; org-owner bypasses; `useTriggerWorkflow` assertion fires correctly with permission.
- **Polling cleanup:** `hooks/api/workflows-executions.ts:41-47` — `refetchInterval` returns `10_000` when any execution has `status === "running" || "waiting"`, and `false` otherwise. Polling stops automatically when no running executions.
- **Frontend hooks gating:** `workflows-definitions.ts` gates all create/update/delete/publish mutations on their exact backend permission keys.

Not checked: editor/builder state management; version conflict UI; deterministic execution/recovery tests; subscription cleanup on unmount.

---

## NEW FINDINGS

### NF-1 (P2) — Payroll financial columns use `decimal(15,2)` not integer cents

**Affected files:** `backend/src/db/schema/payroll/runs.ts:30-34`, `claims-and-settlements.ts` (18 `decimal` columns), `entities-periods.ts`, `payout.ts`, `policies.ts`.

**Rule violated:** `backend/CLAUDE.md §3`: "Money as integer cents."

**Concrete failure scenario:** `decimal(15,2)` in PostgreSQL is `NUMERIC(15,2)` — exact decimal, not floating point. There is no precision loss from storage. However: (1) application-layer code that reads these columns as TypeScript `string` (Drizzle returns `NUMERIC` as `string`) must parse them before arithmetic, and a `parseFloat` call would introduce floating-point imprecision; (2) any future migration that joins payroll amounts with accounting amounts (which may use integer cents) requires an explicit conversion layer, and absent documentation this is easy to miss. Smallest safe fix: document the intentional exception in `backend/CLAUDE.md §1` or migrate all payroll columns to integer paisa/cents in a phased migration.

---

### NF-2 (P2) — Four local Build query-key factories not in the canonical `queryKeys` factory

**Affected files:**
- `frontend/hooks/api/build/customers.ts:18` — `projectCustomersQueryKeys`
- `frontend/hooks/api/build/roster.ts:30` — `rosterQueryKeys`
- `frontend/hooks/api/build/teams.ts:26` — `teamQueryKeys`
- `frontend/hooks/api/build/workspace-members.ts:34` — `projectWorkspaceMembersQueryKeys`

**Rule violated:** `frontend/CLAUDE.md §2`: "one `queryKeys` object in `lib/query-keys.ts`…Never hand-type a key array."

**Concrete failure scenario:** A mutation in a different file (e.g., a project mutation that also affects team membership) invalidates using the canonical prefix. But reads from `useProjectTeams` use `teamQueryKeys.list(params)` — the canonical `invalidateQueries({ queryKey: queryKeys.projects.all })` does NOT match `["streamlineos","projects","teams",...]`. Team list reads go stale after project-level mutations because the canonical invalidation path cannot reach a key it does not define. Smallest safe fix: add `teams`, `customers`, `roster`, `workspaceMembers` factories to `frontend/lib/query-keys/build-work.ts` and migrate the four hook files.

---

## Spot-check of `[x]` items

Only one `[x]` bullet exists in sections 10.6–10.9: the 10.7 Payroll crash-consistency bullet. It passes (see VERIFIED DONE for Bullet 10.7.6 above). No other pre-checked bullets exist in this territory.
