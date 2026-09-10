# RBAC and tenant isolation

The authorization boundary is implemented. Current verification found schema-declaration drift and unused access-service re-exports; both are included in the repair below.

## Completed: RBAC-003 — Tenant declarations and access exports

Scope: Remove seven redundant single-column tenant foreign-key declarations whose composite replacements and removal migrations already exist, and four unused re-exports from `access.service.ts`. Preserve the composite constraints and their existing migrations.

Completion: Static tenant analysis reports zero actionable declaration findings, dead-code and access policy checks pass, and source/test typechecks remain clean. The tenant gate intentionally exits 2 without authoritative database verification; this local repair does not substitute for RBAC-001.

Verified 2026-09-10: backend source build and spec-inclusive typecheck passed;
access policy tests passed 21/21; dead-code gate exited 0 with no unclassified debt.
The extracted magic-link service's global identity classification was also corrected
without changing auth behavior: detector self-tests 11/11 and four security suites /
32 tests passed. Declaration coverage is 943/943 tenant-owned services, with 71 global
services explicitly distinguished. Commits `0eafe232e` and `d4fcbe5b3`; shared evidence
is in [the integration record](overall-release.md#current-integration-evidence--2026-09-10).

## RBAC-001 — Run the final executable tenant-isolation sweep
Status: FINAL-INTEGRATION
Maps to: PRD-C043, PRD-C044, PRD-C045, PRD-C046
Parallel group: 4
Depends on: CHAT-002, RBAC-004
Owner: security release agent

Scope: Run permission, scope, record authorization, tenant-relationship, migration, and cross-tenant negative suites against the final backend revision.

Completion: All executable checks pass at one recorded backend revision with zero actionable tenant findings.

Source-prerequisite verification (2026-09-11): [the former tenant-integrity spec](../../backend/src/db/tenant-relationship-integrity.spec.ts) contained an always-null adapter and an early return. With deliberately unseeded `TENANT_A_ORG_ID`/`TENANT_B_ORG_ID`, it incorrectly reported 5/5 passes, including a purported `23503` database rejection. That path is removed. Ordinary execution now passes only four explicitly labeled unit design checks; requesting legacy live mode exits 1 before executing tests and directs the operator to `tenant-relationship-integrity.db.spec.ts`. No external database was contacted. Actual FK verification remains required against an approved disposable database and is not established by these unit results.

The removed false-green registration lowered the vacuous-assertion `EARLY_RETURN` ratchet from 5 to 4. Removing its conditional suite lowered the test-suppression conditional ratchet from 20 to 19; corresponding records in `baselines/ratchets.json` match. Both gates passed after these reductions, without increasing any allowance. The three AI-project E2E TODO registrations were replaced with executable HTTP cases. Three further red cases proved partial, decimal and unsafe-integer IDs reached the service; the strict numeric guard now rejects them. The final isolated mocked HTTP suite passes 23/23, including 401/403 denials, the owner-independent 402 plan gate before LLM/service use, and unconfigured-LLM 503. Commit `40662d224`; full release aggregation belongs to REL-001.

The dedicated real-FK probe is implemented in that commit but **has not run on a
database**. It requires an explicitly approved disposable target and seven seeded
tenant/project/ticket identifiers. It updates only the named child, proves a valid
same-tenant EPIC control, requires the exact `fk_tickets_org_epic` / `23503` error
inside a savepoint, always rolls back, then checks the original null-EPIC state.
Guard/helper unit tests pass; selecting the DB suite without approval refuses
before connection. This distinguishes a prepared probe from passed SQL acceptance.

## RBAC-002 — Capture deployed revocation and isolation proof
Status: BLOCKED-EXTERNAL
Maps to: PRD-C162, PRD-C185
Parallel group: 3
Depends on: RBAC-001
Owner: security operator

Scope: Exercise deployed role revocation, session invalidation, cross-tenant denial, and audit visibility.

Completion: Deployed evidence records principals, tenant boundaries, timestamps, expected denials, and audit events without exposing secrets.

## Completed: RBAC-005 — Honor the authorized payroll payee filter

Scope: `InputsService.listInputs` permits an all-scope caller to request another
payee, but its SQL substitutes the caller's membership instead of the requested
user. Correct the filter while preserving the organization and own-scope predicates.

Completion: A regression through the existing service interface inspects the
parameterized SQL for the requested payee and tenant; own-scope cross-payee denial,
membership denial and cursor binding remain covered and pass.

Verified 2026-09-11, commit `e815466c8`: two SQL-predicate cases failed before the
fix because the actual parameters contained the caller's membership instead of
the requested user. The existing service interface now has nine passing cases,
including all-scope payee selection, own-scope membership/tenant restrictions,
missing-membership denial, and rejecting a cursor for another tenant, payee,
scope or membership. The broader payroll selection passes four suites / 22 tests,
including bounded attendance reimport and scoped cursor controls. No live payroll
data was read or modified.

## RBAC-004 — Enforce Support automation ownership at every operation
Status: FINAL-INTEGRATION
Maps to: PRD-C043, PRD-C044, PRD-C045, PRD-C046
Parallel group: 1
Depends on: none
Owner: chat/security repair agent

Scope: Close the verified same-tenant cross-module permission gap in Support automation update, delete, test and run-history operations. Bind Support operations to `ticket.*` triggers in the service's SQL predicates, reject trigger ownership changes, and preserve the general automation endpoints.

Completion: Focused regression tests prove same-organization non-Support automations cannot be read, updated, deleted or tested through the Support controller; Support updates cannot change the trigger to another module; legitimate Support and general automation operations remain supported. Record the red/green command and final regression totals before removing this task.

Local verification (2026-09-10): the [controller/service regression](../../backend/src/modules/support/core/support-automations-ownership.spec.ts) exercises the real [Support controller](../../backend/src/modules/support/core/support-automations.controller.ts) and [Automation service](../../backend/src/modules/automation/automation.service.ts), with an in-memory fixture at the database seam and independent assertions on parameterized SQL predicates. Before the fix, 13 of 15 tests failed: invoice run history leaked, same-org invoice rules could be updated/deleted/tested, and trigger ownership could be changed. The minimized `--testNamePattern='cannot update rule 7'` reproduced the failure separately. Initial fixture boot failure (guard dependencies) was corrected before counting the actual red result.

After the fix and follow-up, **8 backend suites / 115 tests pass**, including all 22 ownership/target regressions. Support's `ticket.` scope is applied inside each read/write query, so mutations check ownership atomically instead of relying on a prior lookup. Updates reject a new trigger outside that prefix before any database write. Manual tests containing `support_*` actions validate a positive safe-integer ticket ID and resolve the projected ticket by tenant and ID before any action runs; six invalid/missing/cross-tenant target cases and the valid control went red before this second fix and now pass. `support_tickets` has no soft-delete column; no lifecycle policy was invented. Cross-tenant negatives, legitimate Support operations and unchanged general-automation behavior pass. The generic action catalog was inspected and intentionally retained: shared notifications/email/webhooks/tasks and charged AI do not grant arbitrary access to another module's rules. Existing ticket-note/tag composite tenant FKs remain unchanged. No temporary instrumentation or external database writes were used. This is not live SQL execution or deployed HTTP proof; RBAC-001/002 remain separate. Shared final source/test typechecks and revision binding are coordinator-owned and pending.

The [Support editor](../../frontend/features/support/settings/automations/support-automations-settings.tsx) now supplies the same ticket-only options to create and edit. Its [rendered regression](../../frontend/features/support/settings/automations/support-automations-settings.test.tsx) failed both cases before the fix: edit offered other modules, while create also offered `sla.breached`, which the existing ticket-only API never accepted. **1 frontend suite / 2 tests pass** after the two-line alignment; the shared trigger catalog and generic automation flows are unchanged.

Reproduce from `backend/`:

```powershell
node --max-old-space-size=6144 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/support/core/support-automations-ownership.spec.ts src/modules/automation/automation.service.spec.ts src/modules/automation/automation-update-trigger.spec.ts src/modules/automation/automation-trigger-vocabulary.spec.ts src/modules/automation/automation-tenant-isolation.spec.ts
node --max-old-space-size=6144 ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/automation/__tests__/automation-action-schema.spec.ts src/modules/automation/__tests__/automation-ssrf.spec.ts src/modules/automation/ai-workflow-nodes/ai-node-executor.service.spec.ts
```

Reproduce the frontend regression from `frontend/`:

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath features/support/settings/automations/support-automations-settings.test.tsx
```
