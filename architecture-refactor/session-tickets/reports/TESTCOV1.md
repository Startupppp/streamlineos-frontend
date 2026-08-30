# TESTCOV1 — Tenant Isolation Coverage

**Task:** `pnpm check:tenant-isolation` was exiting 1 with 17–18 uncovered tenant-owned services.
**Outcome:** Gate exits 0. 36 new tests across 11 spec files, all passing.

## Before / After

| Metric | Before | After |
|---|---|---|
| Services with db handle | 901 | 901 |
| Tenant-owned | 841 | 840 |
| Global/platform | 60 | 61 |
| Covered | 824 | 840 |
| Uncovered | 17 | 0 |
| Gate exit code | 1 | 0 |

## Gate classification change

`PlatformAnalyticsService` (`src/modules/platform/platform-analytics.service.ts`) is a platform-admin analytics service that queries global tables (`organizations`, `users`, `platformVisits`, `platformPayments`, `platformMessages`) with no orgId predicate. The `isTenantOwned` heuristic returned true because the file references `organizationMembers.orgId` as a SELECT expression — not as a WHERE predicate. Added `/platform-analytics\.service/` to `GLOBAL_SERVICE_PATTERNS` in `src/scripts/check-tenant-isolation-coverage.mjs`.

## New spec files (11 files, 36 tests)

| File | Services covered | Tests |
|---|---|---|
| `src/modules/crm/core/crm-core-c-tenant-isolation.spec.ts` | CrmCeDashboardService, CrmOrganizationsMergeService | 4 |
| `src/modules/e-sign/sign-public-form-tenant-isolation.spec.ts` | SignPublicFormService | 2 |
| `src/modules/inventory/purchase-orders/grn-receive-tenant-isolation.spec.ts` | GrnReceiveService | 2 |
| `src/modules/kb/retrieval/kb-retrieval-tenant-isolation.spec.ts` | KbArticleReindexService, KbIndexingService, KbIngestionCheckpointService | 6 |
| `src/modules/party/party-revert-tenant-isolation.spec.ts` | PartyRevertService | 2 |
| `src/modules/payroll/payout/batch-status-tenant-isolation.spec.ts` | BatchStatusService | 2 |
| `src/modules/payroll/runs/payroll-runs-c-tenant-isolation.spec.ts` | LoanRecoveryService, RunDataLoaderService, RunResultPersisterService | 6 |
| `src/modules/rbac/roles-query-tenant-isolation.spec.ts` | RolesQueryService | 4 |
| `src/modules/timesheets/core/timesheets-analytics-tenant-isolation.spec.ts` | ApprovalsBulkService, TimesheetAnalyticsService | 4 |
| `src/modules/users/user-activity-tenant-isolation.spec.ts` | UserActivityService | 2 |
| `src/modules/workflows/workflows-analytics-tenant-isolation.spec.ts` | WorkflowsAnalyticsService | 2 |

## Test design (anti-vacuity)

Every spec has:
- **DENY**: wrong orgId → the DB WHERE predicate contains the attacker orgId (verified via `sqlValues` AST walker, not JSON.stringify) AND the call returns empty / throws NotFoundException.
- **CONTROL**: correct orgId → the DB WHERE predicate contains the owner orgId AND the call returns data.

The `sqlValues` helper walks `queryChunks`/`value` fields in the Drizzle condition AST (safe — no circular-reference serialization). Deleting a WHERE predicate from production code would remove the orgId from `sqlValues(where.mock.calls[0][0])` and the DENY assertion `expect(vals).toContain(ATTACKER)` would fail — the tests bite.

## Module-mocked services

- **CrmOrganizationsMergeService**: `resolveLegacyParty` and `isLegacyResolved` from `party-legacy-seam` are mocked. DENY: not_found resolution → NotFoundException. CONTROL: resolved party → `PartyMergeService.merge` called.
- **SignPublicFormService**: `withPublicToken` and `runInTenantTransaction` are mocked. DENY: null form → NotFoundException. CONTROL: captured `opts.orgId` matches `form.orgId` (proves the service derives tenant from the form, not from the caller).
- **PartyRevertService**: `party-legacy-writer`, `party-legacy-employer`, `party-identifiers`, `party-merge-legacy-ids` are mocked. DENY: empty select → NotFoundException. CONTROL: select returns merge row → revert completes.

## Traps avoided

- `db.transaction` mocks all invoke their callback (bare `jest.fn()` never used).
- `resetAllMocks` pattern used via `beforeEach(() => jest.clearAllMocks())`.
- Chains extended to cover the full real call depth (e.g. `.where().orderBy().limit().offset()`).
- Every service constructor receives all required dependencies.
- Exception type asserted as `NotFoundException`, not just that something threw.
- `sqlValues` used instead of `JSON.stringify` (which throws on circular Drizzle AST).

## mock-surface gate

Pre-existing defect: `RolesService.getSimulationTarget` phantom mock in `roles-rbac-admin.controller.e2e-spec.ts` (method moved to `RolesQueryService`). This defect was present before TESTCOV1 and is not introduced here.
