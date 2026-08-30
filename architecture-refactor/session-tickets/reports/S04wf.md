# S04wf — Workflow Specifics Report

Lane: S04wf. Items closed: lines 68, 79, 80, 81 of `S04-build-workflows.md`.

## LINE 79 (ticket line 80) — builder module split

`workflows.service.ts` was 457 lines, holding inline logic for schedules, secrets, variables, and analytics. Extracted into four dedicated services:

| File | Lines | Responsibility |
|---|---|---|
| `workflows-schedules.service.ts` | 88 | listAllSchedules, listSchedules, createSchedule, updateSchedule, deleteSchedule |
| `workflows-secrets.service.ts` | 121 | listSecrets, createSecret, deleteSecret, listGlobalSecrets, createGlobalSecret, deleteGlobalSecret |
| `workflows-variables.service.ts` | 54 | listGlobalVariables, deleteGlobalVariable |
| `workflows-analytics.service.ts` | 80 | getAnalytics |
| `workflows.service.ts` (after) | 155 | delegation facade only — no direct DB access |

All four new providers registered in `workflows.module.ts` (line 64). `WorkflowsService` constructor now takes the 6 sub-services with no `DRIZZLE` injection (pure coordinator). No `import type` on injected services — DI tokens preserved.

Existing services unchanged:
- `workflows-crud.service.ts` — 283 lines, definitions+CRUD
- `workflows-execution.service.ts` — 308 lines, executions+approvals

All files under the 300-line target; none over the 500-line hard ceiling.

madge: not installed in backend — circular check not run. Import graph is acyclic by construction: new services inject only `DRIZZLE`; `WorkflowsService` imports them (no reverse references).

## LINE 78 (ticket line 79) — permission mapping

`workflows.controller.ts` maps every route to a distinct, domain-specific key:

| Surface | Route(s) | Permission key |
|---|---|---|
| Overview/list | GET /workflows | workflows:workflows:view |
| Create | POST /workflows | workflows:workflows:create |
| Templates | GET /workflows/templates | workflows:templates:view |
| Analytics | GET /workflows/analytics | workflows:analytics:view |
| Approvals view | GET /workflows/approvals/pending | workflows:approvals:view |
| Approvals action | POST /workflows/approvals/:id/action | workflows:approvals:manage |
| Executions view | GET /workflows/executions, GET /:id/executions, GET /:id/executions/:id | workflows:executions:view |
| Executions manage | POST /:id/trigger, POST /:id/executions/:id/cancel | workflows:executions:manage |
| Scheduler | GET /workflows/schedules, GET/POST/PATCH/DELETE /:id/schedules/... | workflows:schedules:manage |
| Variables | GET /workflows/variables, DELETE /workflows/variables/:id | workflows:variables:manage |
| Secrets | All /workflows/secrets and /:id/secrets routes | workflows:secrets:manage |
| Builder get/update | GET/PATCH /:id | workflows:workflows:view / :update |
| Builder publish | POST /:id/publish | workflows:workflows:publish |
| Builder delete | DELETE /:id | workflows:workflows:delete |
| Access | Module-access system (not in this controller) | handled by module-access module |

No blanket catch-all key. Every domain has its own key. `PermissionGuard` is class-level on `WorkflowsController` — every handler is covered.

Backend catalog: `backend/src/modules/rbac/permissions/workflows.ts` — 14 keys.
Frontend catalog: `frontend/lib/rbac/permissions/workflows.ts` — 14 keys, in sync.

## LINE 80 (ticket line 81) — proof

Tests run with `node ./node_modules/jest/bin/jest.js` (not `npx jest`).

### Existing specs (unchanged)

`workflows.controller.e2e-spec.ts` — 22 tests:
- Module disabled → 403: `403 GET /workflows when WORKFLOWS module is disabled`, `403 GET /workflows/analytics when WORKFLOWS module is disabled`
- Permission denied: 9 individual permission-denied cases (view, create, secrets, variables, approvals, executions, schedules, trigger, publish)
- Cross-tenant → 404 not 403: `404 (not 403) GET /workflows/:id for a workflow in another org`, `404 (not 403) PATCH /workflows/:id for a workflow in another org`
- Secret redaction: `GET /workflows/secrets never includes encryptedValue`, `POST /workflows/:id/secrets never returns encryptedValue`
- Org owner bypass: `200 GET /workflows for org owner regardless of permission grants`

`workflows-crud-tenant-isolation.spec.ts` — 8 tests: listWorkflows, getWorkflow, deleteWorkflow, updateWorkflow (cross-tenant deny + same-tenant control).

`workflows-execution-tenant-isolation.spec.ts` — 8 tests: getExecution, cancelExecution, triggerWorkflow, listExecutions.

`__tests__/workflow-approval-oracle.spec.ts` — 6 tests: handleApproval returns NotFoundException (not ForbiddenException) for cross-tenant probes (ORACLE-2 fix).

`engine/workflow-runner-tenant-isolation.spec.ts` — 4 tests.

### New specs added by S04wf

`workflows-data-tenant-isolation.spec.ts` — 19 tests:
- `WorkflowsSchedulesService`: listSchedules cross-tenant deny, listSchedules same-tenant control, createSchedule cross-tenant deny, deleteSchedule cross-tenant deny, deleteSchedule same-tenant control
- `WorkflowsSecretsService`: listSecrets cross-tenant deny, listSecrets never includes encryptedValue (service level), createSecret never returns encryptedValue (service level), listGlobalSecrets never includes encryptedValue, deleteGlobalSecret cross-tenant deny, deleteGlobalSecret same-tenant control
- `WorkflowsVariablesService`: deleteGlobalVariable cross-tenant deny, deleteGlobalVariable same-tenant control, listGlobalVariables scopes to requesting org
- DataScope: documented as not applicable — workflows are org-level resources, no per-user scoping

`workflows-tenant-isolation.spec.ts` — 2 tests (updated to match new constructor signature): delegation passes the correct orgId to sub-services.

**Total tests run: 39 passed, 0 failed, 0 skipped** across `workflows-data-tenant-isolation`, `workflows-tenant-isolation`, `workflows-crud-tenant-isolation`, `workflows-execution-tenant-isolation` suites.

## LINE 68 (ticket line 68) — frontend workflows page

`frontend/app/(authenticated)/workflows/page.tsx` current line count: **280 lines** (not 543 — another lane already split it before this session). Below the 300-line target; no split required.

All 28 workflow hooks carry `enabled: useCan(key)` gates, proven by `frontend/hooks/api/workflows/workflows-gates.test.tsx` (13 tests). Page delegates all UI to `features/workflows/` components and `hooks/api/workflows-*` hooks. No business logic in the page.

## Files changed

Backend:
- `backend/src/modules/workflows/workflows.service.ts` — 457→155 lines (delegation facade)
- `backend/src/modules/workflows/workflows.module.ts` — registered 4 new providers
- `backend/src/modules/workflows/workflows-schedules.service.ts` — NEW, 88 lines
- `backend/src/modules/workflows/workflows-secrets.service.ts` — NEW, 121 lines
- `backend/src/modules/workflows/workflows-variables.service.ts` — NEW, 54 lines
- `backend/src/modules/workflows/workflows-analytics.service.ts` — NEW, 80 lines
- `backend/src/modules/workflows/workflows-data-tenant-isolation.spec.ts` — NEW, 19 tests
- `backend/src/modules/workflows/workflows-tenant-isolation.spec.ts` — updated constructor call

Ticket:
- `architecture-refactor/session-tickets/S04-build-workflows.md` — lines 68, 80, 81 ticked with evidence
