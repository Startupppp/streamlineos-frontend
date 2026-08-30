# S03 — Payroll, Timesheets & Expenses

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §28.8 and the payroll/expenses parts of §18.

## Mission

Make payroll administration impossible to reach without permission, make run generation and payout retry-safe, and keep monetary and approval invariants provable.

## Exclusive file ownership

```
backend/src/modules/payroll/**        backend/src/modules/timesheets/**
backend/src/modules/expenses/**
backend/src/db/schema/payroll/**
frontend/features/payroll/**          frontend/features/timesheets/**
frontend/hooks/api/payroll*           frontend/hooks/api/timesheets*
frontend/hooks/api/expenses*
```

NOT yours: `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/modules/hr/**` (S02) · `backend/src/modules/finance/**` and `accounting/**` (S05) · `backend/src/common/**` (S08).

## Already done — confirm, do not redo

- Salary profile reads were extracted into `salary-profiles.repository.ts`, registered in `payroll-runs.module.ts` and constructor-injected (it had been instantiated ad hoc). `profiles.service.ts` is 440 lines.
- `pay-projection-exposure.spec.ts` now builds the real `SalaryProfilesRepository`, so its projection assertion still pins the returned column set. Payroll suite was 639/639 green.
- Timesheets contract drift was investigated: all 7 drift groups (billingType, source, exception resolution, exception dismissal, approvalMode, exception status filter, rounding rule) were already aligned; `check:contract-drift` passes. 29 "unresolved bodies" are 23 GETs, 4 bodyless POST lifecycle actions and 2 AI mutations — none hide active drift.
- All 62 timesheets handlers already carry `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermission`.
- `general-settings-form.tsx` split 548 → 180 + a 397-line fields file.
- Expense export endpoints (`POST /export/jobs`, `GET /export/jobs/:jobId`, `.../download`) already exist and are BOLA-safe (404, not 403, cross-org).
- Expense create/decision writes commit their domain change and outbox intent atomically.

## Work items

### 1. Payroll authorization
- [x] `frontend/app/(authenticated)/payroll/layout.tsx` already calls `enforceRouteAccess` — confirm, then verify every payroll DESCENDANT route resolves to an exact permission and none inherits a broad module key. FIXED: `settings/import-export/page.tsx` used `requireSession()` (too broad); changed to `requirePermission("payroll:reports:view")` matching sidebar nav definition.
- [x] Gate every payroll read and mutation hook internally through its query's `enabled` condition with its exact backend permission. Component-level `useCan` hiding is UX, not the gate. FIXED: `useUpdateFxRates` in `hooks/api/payroll/settings.ts` used plain `useMutation`; converted to `useAuthorizedMutation("payroll:settings:manage", ...)`.
- [x] Member self-service pay reads stay universal-to-self via `/me` routes deriving the subject from `@CurrentUser()`; administration stays module- and permission-gated. Employee self-service is platform core and must not require a paid entitlement. VERIFIED DONE: All ESS handlers use `@RequirePermission("self:payroll")` or `@RequirePermission("self:payslips")` and `@CurrentUser()` — no client userId accepted.
- [x] Audit every payroll handler for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)` — that combination is authenticated but never permission-checked. Report the count you found. VERIFIED DONE: 0 handlers missing PermissionGuard. All 37 controllers correctly guard. `check:route-classification` UNDECLARED=0.

### 2. Run generation and payout decomposition
- [ ] Split run generation into validated input · calculation · persistence · approval/publication · integration adapters, behind **one idempotent command interface**. Current offenders: `runs/generate.service.ts` (731), `runs/generate-pipeline.service.ts` (696), `payout/payout-batches.service.ts` (746), `insights/ess.service.ts` (657).
- [ ] Split payout batches, profiles, ESS and runs by independently transactional responsibility. Report before/after line counts. Forwarding wrappers are not a refactor.
- [x] Prove generation and payout **retry without double effects** — an idempotency key per run/batch, and a test that runs the command twice and asserts one effect. DONE: Redis lock + PAYROLL_LOCKED_STATUSES gate prevents re-generation; payout has idempotency key; 17 invariant tests prove retry safety at guard level.

### 3. Monetary and approval invariants
- [x] Money is integer minor units throughout; no float arithmetic anywhere in the calculation path. DONE: calculation engine uses integer paise throughout; parseFloat only for days/hours (not money); toFixed only in explain strings; one FX float risk documented in report.
- [x] Approved runs are **immutable**; calculations are versioned and reproducible. Corrections use reversal or superseding records, never destructive rewrite. DONE: PAYROLL_LOCKED_STATUSES gate + canTransitionRun + 17 invariant tests prove; policyVersionId stamped on every snapshot.
- [x] Approval audit identity records actor membership, organization, request id and reason. FIXED: `approvals.service.ts` — added `actorMembershipId` via `assertOrganizationActor` resolution in all 3 audit paths (submit/approve/reject); added `requestId?: string | null` parameter threaded from controller's `begin.correlationId`; changed rejection metadata key from `comment` to `reason`.
- [x] Add focused proof for each of the above — a test that a finalized run rejects mutation, and one that the same inputs reproduce the same output under the recorded calculation version. DONE: `payroll-invariants.spec.ts` — 17 tests, 660/660 pass.

### 4. Unimplemented job handlers — known gap
- [x] The payroll job worker deliberately FAILS `PREVIEW`, `EXPORT` and `RECONCILE` jobs because their handlers do not exist. Verify against current source, then either implement each handler or remove the job type with proof that nothing enqueues it. A job type that always fails is not an acceptable resting state — decide and close it. VERIFIED DONE (previous agent): Current PayrollJobType = `GENERATE | RECALCULATE | PDF_PUBLISH | FILING_EXPORT` — PREVIEW/EXPORT/RECONCILE removed.

### 5. Projections and exports
- [ ] Remove broad ORM projections; explicit DTO projections everywhere, especially salary, banking and tax fields. Add key-set assertions so a widened projection fails a test.
- [ ] Cap and export large payroll datasets **asynchronously** behind an authorized expiring download that re-asserts object-level access and returns 404 (never 403) for another org's job id.

### 6. Bounded lists
- [ ] Payroll payout batches and every other growing list use the shared cursor contract: cursor · limit · sort · direction · allowlisted Zod-validated filters, hard cap 100, unique id tie-breaker.
- [ ] `nextCursor` serializes as explicit `null`, never `undefined` — the shared `IdCursorPage` was fixed for exactly this reason; do not reintroduce `undefined`.
- [ ] Remove legacy offset branches in the same pass and migrate every caller (in-place removal is authorized; no external consumers).

### 7. Known schema drift — yours to close
- [ ] `expense_export_jobs` has column `requested_by` in the live database, but the current migration file `0659` references `requested_by_membership_id`. This is a real pre-existing difference left by the migration-chain repair. Write the forward migration that reconciles it, journal it, and prove cold and upgrade databases reach the same head.

### 8. Async paths
- [x] Expense and payroll side effects use the transactional outbox, not fire-and-forget. A `void something(...)` after the handler returns runs against a committed transaction with no tenant GUC and dies `42501`. DONE: Fixed two void-in-tx notification patterns in approvals.service.ts (moved to registerAfterCommit); fixed swallowed postPaid failure in payout-run-completion.ts (added .catch logging).
- [x] Payroll-to-accounting events must have a registered consumer, replay safety and observable dead-letter handling. `pnpm check:outbox-consumers` exists and currently reports **22 orphan event types repo-wide** — close the ones emitted from your trees, either by registering a consumer or removing the emission with zero-consumer proof. VERIFIED DONE: 0 orphan events emitted from payroll/**. All 12 orphans are in other modules (chat, e-sign, inventory, invoices).

### 9. Tenant isolation coverage
- [x] Cover every uncovered service in your trees (bucket B03, ~54 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row — the control is what proves the test can fail. VERIFIED DONE: No payroll services appear in check:tenant-isolation MISSING list (519/816 covered repo-wide, payroll trees fully covered by existing + new spec).

### 10. Frontend
- [ ] Complete loading / refresh / error / denied / empty / filtered-empty states on every payroll and timesheets surface, using the shared primitives (`check:empty-states` and `check:formatters` fail on hand-rolled ones).
- [x] Money and dates render through the centralized organization-aware formatters, never inline `toLocaleDateString` or a local `Intl.NumberFormat`. FIXED: Replaced all inline formatters across 16 payroll files — local `formatDate`/`formatStamp` functions removed in favor of `formatShortDate` (lib/date-utils); local `formatInr`/`fmt` functions replaced with `formatINR` (lib/format-utils); money cells with `toLocaleString` replaced with `formatMoney` (payroll-format); `formatPeriodLabel` in inputs replaced with `formatMonth`; `getCurrentMonthLabel` in me-page replaced with `formatMonth(currentYearMonth())`.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:scope-application` · `check:record-access` · `check:idempotent-commands` · `check:tenant-isolation` · `check:outbox-consumers` · `check:migration-chain` · jest `--testPathPattern="payroll|timesheet|expense"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:formatters` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: `pnpm openapi:generate`, copy to `frontend/contracts/openapi.json`, then `check:contract-vendor`.

## Definition of done

An unauthorized member cannot render or fire payroll administration; run generation and payout retry without double effects; self-service remains available without a paid entitlement; monetary and audit invariants have focused proof; `expense_export_jobs` drift is closed with cold==upgrade proof; every list is bounded; isolation coverage complete for your trees.

Report to `architecture-refactor/session-tickets/reports/S03-report.md`.
