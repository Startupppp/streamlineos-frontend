# L05 Workflows Report

## Status: DONE (items within L05 ownership)

## Guard audit
VERIFIED DONE — 0 handlers with `@RequirePermission` but without `@UseGuards(JwtAuthGuard, PermissionGuard)`. Both `WorkflowsController` (line 34) and `AutomationController` (line 12) carry class-level `@UseGuards(JwtAuthGuard, PermissionGuard)` and every handler has `@RequirePermission`. `WorkflowsCronController` is correctly `@Public()` and validates via `assertCronSecret`.

## Permission keys mapped (both catalogs)
VERIFIED DONE — 14 workflow keys confirmed in `backend/src/modules/rbac/permissions/workflows.ts` AND `frontend/lib/rbac/permissions/workflows.ts`: `workflows:workflows:{view,create,update,delete,publish}`, `workflows:executions:{view,manage}`, `workflows:approvals:{view,manage}`, `workflows:templates:view`, `workflows:schedules:manage`, `workflows:secrets:manage`, `workflows:variables:manage`. Automation keys `settings:automations:{view,manage}` confirmed in `backend/src/modules/rbac/permissions/shared.ts` and `frontend/lib/rbac/permissions/permission-key-foundation.ts`.

## File split before/after
- `workflows-crud.service.ts`: 283 lines (under 300 — no split needed)
- `workflows-execution.service.ts`: 296 lines (under 300 — no split needed)
- `workflows.service.ts`: 457 lines (facade/delegate only — under 500)
- `automation.service.ts`: 499 lines (under 500 — no split needed)

## Isolation tests added (24 tests, all green)
- `src/modules/workflows/workflows-crud-tenant-isolation.spec.ts`: cross-tenant deny + same-tenant control for listWorkflows, getWorkflow, deleteWorkflow, updateWorkflow
- `src/modules/workflows/workflows-execution-tenant-isolation.spec.ts`: cross-tenant deny + same-tenant control for getExecution, cancelExecution, triggerWorkflow, listExecutions
- `src/modules/automation/automation-tenant-isolation.spec.ts`: cross-tenant deny + same-tenant control for testRule, updateRule, deleteRule, listRules
- `check:tenant-isolation` confirms neither module appears in UNCOVERED list

## Outbox consumers
VERIFIED DONE — neither `backend/src/modules/workflows/**` nor `backend/src/modules/automation/**` emit any outbox events. Zero orphan contributions from my trees. All 19 orphaned event types come from other modules (accounting, build, chat, sign, finance, hr, inventory, invoices, organization, support).

## Validation results
- `check:route-classification`: PASS — 3533 handlers, 0 undeclared
- `check:permission-keys`: PASS — 690 keys, all `@RequirePermission` usages resolve
- `check:log-secrets`: PASS — no plaintext secret logging found
- `check:outbox-consumers`: FAIL (19 orphans — all outside my ownership)
- `check:tenant-isolation`: workflows and automation trees COVERED; 383 missing are outside my ownership
- `pnpm typecheck`: 10 errors in `billing/` and `finance/tax/` — none in my trees
- `jest --testPathPattern="workflow|automation"`: 445 passed, 6 failed (failures in `crm/crm-automation-studio-tenant-isolation.spec.ts` — outside my ownership)

## OUT-OF-OWNERSHIP
- `backend/src/modules/crm/crm-automation-studio-tenant-isolation.spec.ts` line 120: `CrmSequencesRunnerService` is not provided in the test module — the spec fails with DI error. Needs `CrmSequencesRunnerService` added to `providers` in the failing test's `buildSvc` helper or the module mock updated.
