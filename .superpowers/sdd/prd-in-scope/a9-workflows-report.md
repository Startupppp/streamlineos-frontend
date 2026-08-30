# A9 — Workflows Module Completion Gate

**Date:** 2026-08-30  
**Lane:** A9  
**Scope:** backend/src/modules/workflows/**, backend/src/modules/automation/**, frontend/features/workflows/**, frontend/hooks/api/workflows*

---

## 1. Route → Permission Key Table

All 34 workflow handlers already carried `@RequirePermission` and class-level `@UseGuards(JwtAuthGuard, PermissionGuard)` before this lane ran. **No undeclared routes were introduced.**

| Route | Method | Permission Key | Backend catalog | Frontend catalog |
|-------|--------|---------------|-----------------|------------------|
| GET /workflows | GET | `workflows:workflows:view` | `backend/src/modules/rbac/permissions/workflows.ts` | `frontend/lib/rbac/permissions/workflows.ts` |
| POST /workflows | POST | `workflows:workflows:create` | ✓ same file | ✓ same file |
| GET /workflows/analytics | GET | `workflows:analytics:view` | ✓ | ✓ |
| GET /workflows/templates | GET | `workflows:templates:view` | ✓ | ✓ |
| GET /workflows/approvals/pending | GET | `workflows:approvals:view` | ✓ | ✓ |
| POST /workflows/approvals/:id/action | POST | `workflows:approvals:manage` | ✓ | ✓ |
| GET /workflows/executions | GET | `workflows:executions:view` | ✓ | ✓ |
| GET /workflows/schedules | GET | `workflows:schedules:manage` | ✓ | ✓ |
| GET /workflows/secrets | GET | `workflows:secrets:manage` | ✓ | ✓ |
| POST /workflows/secrets | POST | `workflows:secrets:manage` | ✓ | ✓ |
| DELETE /workflows/secrets/:id | DELETE | `workflows:secrets:manage` | ✓ | ✓ |
| GET /workflows/variables | GET | `workflows:variables:manage` | ✓ | ✓ |
| DELETE /workflows/variables/:id | DELETE | `workflows:variables:manage` | ✓ | ✓ |
| GET /workflows/:id | GET | `workflows:workflows:view` | ✓ | ✓ |
| PATCH /workflows/:id | PATCH | `workflows:workflows:update` | ✓ | ✓ |
| DELETE /workflows/:id | DELETE | `workflows:workflows:delete` | ✓ | ✓ |
| POST /workflows/:id/publish | POST | `workflows:workflows:publish` | ✓ | ✓ |
| POST /workflows/:id/duplicate | POST | `workflows:workflows:create` | ✓ | ✓ |
| POST /workflows/:id/disable | POST | `workflows:workflows:update` | ✓ | ✓ |
| POST /workflows/:id/archive | POST | `workflows:workflows:update` | ✓ | ✓ |
| POST /workflows/:id/trigger | POST | `workflows:executions:manage` | ✓ | ✓ |
| GET /workflows/:id/executions | GET | `workflows:executions:view` | ✓ | ✓ |
| GET /workflows/:id/executions/:eid | GET | `workflows:executions:view` | ✓ | ✓ |
| POST /workflows/:id/executions/:eid/cancel | POST | `workflows:executions:manage` | ✓ | ✓ |
| GET /workflows/:id/schedules | GET | `workflows:schedules:manage` | ✓ | ✓ |
| POST /workflows/:id/schedules | POST | `workflows:schedules:manage` | ✓ | ✓ |
| PATCH /workflows/:id/schedules/:sid | PATCH | `workflows:schedules:manage` | ✓ | ✓ |
| DELETE /workflows/:id/schedules/:sid | DELETE | `workflows:schedules:manage` | ✓ | ✓ |
| GET /workflows/:id/secrets | GET | `workflows:secrets:manage` | ✓ | ✓ |
| POST /workflows/:id/secrets | POST | `workflows:secrets:manage` | ✓ | ✓ |
| DELETE /workflows/:id/secrets/:sid | DELETE | `workflows:secrets:manage` | ✓ | ✓ |
| POST /cron/workflow-executions-sweep | POST | `@Public()` + `assertCronSecret` | ✓ (classified) | — |
| POST /settings/automations/:id/test | POST | `settings:automations:manage` | `backend/src/modules/rbac/permissions/shared.ts` | `frontend/lib/rbac/permissions/shared.ts` |

**Verdict: PREMISE VERIFIED** — all 34 workflow handlers + 1 automation handler are correctly classified before this lane ran. Zero undeclared routes (confirmed by `check:route-classification`).

---

## 2. Hook → Internal Gate Table

All frontend workflow hooks already had `enabled: useCan(...)` gates before this lane ran. The following table confirms the gate and its key.

| Hook | File | Permission Key | Gate type |
|------|------|----------------|-----------|
| `useWorkflows` | workflows-definitions.ts | `workflows:workflows:view` | `enabled: canView` |
| `useWorkflow` | workflows-definitions.ts | `workflows:workflows:view` | `enabled: canView && id.length > 0` |
| `useCreateWorkflow` | workflows-definitions.ts | `workflows:workflows:create` | `assertPermission(canCreate)` in mutationFn |
| `useUpdateWorkflow` | workflows-definitions.ts | `workflows:workflows:update` | `assertPermission(canUpdate)` in mutationFn |
| `useDeleteWorkflow` | workflows-definitions.ts | `workflows:workflows:delete` | `assertPermission(canDelete)` in mutationFn |
| `usePublishWorkflow` | workflows-definitions.ts | `workflows:workflows:publish` | `assertPermission(canPublish)` in mutationFn |
| `useDuplicateWorkflow` | workflows-definitions.ts | `workflows:workflows:create` | `assertPermission(canCreate)` in mutationFn |
| `useWorkflowExecutions` | workflows-executions.ts | `workflows:executions:view` | `enabled: canView && id.length > 0` |
| `useAllExecutions` | workflows-executions.ts | `workflows:executions:view` | `enabled: canView` |
| `useTriggerWorkflow` | workflows-executions.ts | `workflows:executions:manage` | `assertPermission(canExecute)` in mutationFn |
| `useCancelExecution` | workflows-executions.ts | `workflows:executions:manage` | `assertPermission(canManage)` in mutationFn |
| `usePendingApprovals` | workflows-approvals.ts | `workflows:approvals:view` | `enabled: canView` |
| `useHandleApproval` | workflows-approvals.ts | `workflows:approvals:manage` | `assertPermission(canManage)` in mutationFn |
| `useAllSchedules` | workflows-schedules.ts | `workflows:schedules:manage` | `enabled: canManage` |
| `useWorkflowSchedules` | workflows-schedules.ts | `workflows:schedules:manage` | `enabled: canManage && id.length > 0` |
| `useCreateSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` in mutationFn |
| `useUpdateSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` in mutationFn |
| `useDeleteSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` in mutationFn |
| `useGlobalSecrets` | workflows-secrets.ts | `workflows:secrets:manage` | `enabled: canManage` |
| `useWorkflowSecrets` | workflows-secrets.ts | `workflows:secrets:manage` | `enabled: canManage && id.length > 0` |
| `useCreateGlobalSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` in mutationFn |
| `useCreateWorkflowSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` in mutationFn |
| `useDeleteGlobalSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` in mutationFn |
| `useDeleteWorkflowSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` in mutationFn |
| `useGlobalVariables` | workflows-variables.ts | `workflows:variables:manage` | `enabled: canManage` |
| `useDeleteGlobalVariable` | workflows-variables.ts | `workflows:variables:manage` | `assertPermission(canManage)` in mutationFn |
| `useWorkflowAnalytics` | workflows-analytics.ts | `workflows:analytics:view` | `enabled: canView` |
| `useWorkflowTemplates` | workflows-analytics.ts | `workflows:templates:view` | `enabled: canView` |

---

## 3. Cursor Migration

### What changed

**Backend DTO (`dto/workflow.schemas.ts`):**
- `WorkflowListQuerySchema`: removed `page: pageNumberField`, added `cursor?: string`, `sort: enum["updatedAt","createdAt"]`, `direction: enum["asc","desc"]`
- `WorkflowExecutionQuerySchema`: removed `page: pageNumberField`, added `cursor?: string`, `direction: enum["asc","desc"]`

**Backend services:**
- `workflows-crud.service.ts` — `listWorkflows` now uses `buildCursorPage` / `decodeCursor` from `common/pagination/cursor`. Cursor condition: `(sortCol, id::text) < (param, cursorId)` for DESC. Returns `CursorPage<{id,orgId,name,...}>` with `{ data, pagination: { limit, nextCursor: string|null, hasMore } }`.
- `workflows-execution.service.ts` — `listExecutions` and `listAllExecutions` use the same cursor pattern on `createdAt`.

**Frontend hooks (`workflows-definitions.ts`, `workflows-executions.ts`):**
- `useWorkflows` now accepts `WorkflowListParams` (`cursor?`, `limit?`, `sort?`, `direction?`, `status?`, `search?`) and returns `WorkflowCursorPage<Workflow>`.
- `useWorkflowExecutions`, `useAllExecutions` now accept `ExecutionListParams` (`cursor?`, `limit?`, `direction?`, `status?`) and return `WorkflowCursorPage<WorkflowExecution>`.

### Callers changed (in-scope)
All hooks in `workflows-definitions.ts` and `workflows-executions.ts` updated.

---

## 4. Files Split — Before / After

| File | Before (lines) | After (lines) | Note |
|------|---------------|---------------|------|
| `frontend/hooks/api/workflows.ts` | 480 (monolith) | 63 (barrel re-export) | Split into 7 domain files |
| `frontend/hooks/api/workflows-types.ts` | — (new) | 137 | Shared type definitions |
| `frontend/hooks/api/workflows-definitions.ts` | — (new) | 118 | CRUD + list hooks |
| `frontend/hooks/api/workflows-executions.ts` | — (new) | 84 | Execution hooks |
| `frontend/hooks/api/workflows-approvals.ts` | — (new) | 44 | Approval hooks |
| `frontend/hooks/api/workflows-schedules.ts` | — (new) | 96 | Schedule hooks |
| `frontend/hooks/api/workflows-secrets.ts` | — (new) | 95 | Secret hooks |
| `frontend/hooks/api/workflows-variables.ts` | — (new) | 35 | Variable hooks |
| `frontend/hooks/api/workflows-analytics.ts` | — (new) | 27 | Analytics + template hooks |
| `backend/src/modules/workflows/workflows-crud.service.ts` | 261 | 283 | Cursor pagination |
| `backend/src/modules/workflows/workflows-execution.service.ts` | 277 | 296 | Cursor pagination |
| `backend/src/modules/workflows/dto/workflow.schemas.ts` | 69 | 71 | Cursor schemas |
| `backend/src/modules/workflows/workflows.controller.e2e-spec.ts` | — (new) | ~155 | Auth/permission/cross-tenant/secret tests |

---

## 5. Premise Verdicts

| Claim | Verdict | Evidence |
|-------|---------|---------|
| Backend controller has undeclared routes | FALSE | `check:route-classification`: 0 undeclared of 3,533 total |
| Frontend permission keys drift from backend | FALSE | Both catalogs have identical 14 workflow keys (confirmed grep) |
| Frontend hooks lack `enabled: useCan()` gates | FALSE | All 14 query hooks had gates before this lane |
| Secret value leaks in response | FALSE | `listSecrets`/`createSecret` use explicit `.returning({...})` excluding `encryptedValue` |
| `automation.controller.ts` has ungated routes | FALSE | Only 1 handler, `@RequirePermission("settings:automations:manage")`, class-level guards |
| `hooks/api/automations.ts` lacks permission gates | **TRUE** (out-of-scope file) | No `useCan` in any hook; needs `settings:automations:view` / `settings:automations:manage` |
| `hooks/api/build/workflow.ts` mutations lack gates | **TRUE** (out-of-scope file) | `useCreateTransition`, `useUpdateTransition`, `useDeleteTransition`, `useUpdateStatusWip` have no `useCan` |

---

## 6. Secret Redaction Proof

`WorkflowsService.listSecrets` (line 351), `listGlobalSecrets` (line 373), `createSecret` (line 365), `createGlobalSecret` (line 383): all use explicit `.returning({ id, name, description, createdAt, updatedAt })` projection. `encryptedValue` is never selected. Confirmed by `e2e-spec` tests asserting `JSON.stringify(res.body)` does not contain `"encryptedValue"` or `"encrypted_value"`.

---

## 7. Validation Output (verbatim)

### `pnpm typecheck` (backend)
```
> streamlineos-api@0.1.0 typecheck
> node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json
[exit 0 — no output = success]
```

### `pnpm check:route-classification` (backend)
```
Route classification report
  Total handlers : 3533
  public         : 208
  universal      : 95
  permissioned   : 3183
  in-service     : 47
  UNDECLARED     : 0

RESULT: ALL ROUTES CLASSIFIED

Manifest pilot (timesheets): publicExposure=false — OK
```

### `pnpm check:permission-keys` (backend)
```
Scanned  3094 @RequirePermission usages  (621 unique keys)
  of which 21 pass a constant rather than a literal
Backend catalog   690 keys
Frontend PermissionKey union  690 keys

OK — every @RequirePermission key resolves and exists in the backend catalog and the frontend PermissionKey union.
```

### Backend tests `--testPathPattern="workflow|automation"`
```
Test Suites: 38 passed, 38 total
Tests:       409 passed, 409 total
Time:        8.106 s
```

### `pnpm type-check` (frontend)
```
FAILING — 4 errors in out-of-scope files (see section 8):
app/(authenticated)/workflows/[workflowId]/page.tsx(169,15): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(106,5): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'ExecutionListParams'.
app/(authenticated)/workflows/executions/page.tsx(112,44): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
app/(authenticated)/workflows/executions/page.tsx(200,50): error TS2339: Property 'total' does not exist on type 'WorkflowCursorPage<WorkflowExecution>'.
```

### `pnpm check:query-scope` (frontend)
```
✔  No query-scope violations found.
```

### Frontend tests `--testPathPattern="workflow"`
```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Time:        1.514 s
```

---

## 8. Out-of-Ownership Changes Required

### 8a. Fix typecheck (cursor migration callers in `app/**`)

**File: `app/(authenticated)/workflows/executions/page.tsx`**

Line 103–113 — replace offset pagination state with cursor state:
```tsx
// REMOVE:
const [page, setPage] = useState(1);
// ...
const { data, isLoading, isError } = useAllExecutions({
  page,
  limit: PAGE_SIZE,
  status: activeTab === "all" ? undefined : activeTab,
});
const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

// REPLACE WITH:
const [cursor, setCursor] = useState<string | undefined>(undefined);
const { data, isLoading, isError } = useAllExecutions({
  cursor,
  limit: PAGE_SIZE,
  status: activeTab === "all" ? undefined : activeTab,
});
```

Lines 119–130 — replace prev/next handlers:
```tsx
// REMOVE:
function handlePrev() { setPage((p) => Math.max(1, p - 1)); }
function handleNext() { setPage((p) => Math.min(totalPages, p + 1)); }

// REPLACE WITH:
const [prevCursors, setPrevCursors] = useState<string[]>([]);
function handlePrev() {
  const prev = prevCursors[prevCursors.length - 1];
  setPrevCursors((ps) => ps.slice(0, -1));
  setCursor(prev);
}
function handleNext() {
  if (data?.pagination.nextCursor) {
    setPrevCursors((ps) => [...ps, cursor ?? ""]);
    setCursor(data.pagination.nextCursor);
  }
}
```

Lines 199–216 — update pagination controls:
```tsx
// REMOVE:
Page {page} of {totalPages} ({data.total} total)
// ...
disabled={page <= 1}
// ...
disabled={page >= totalPages}

// REPLACE WITH:
{prevCursors.length + 1} of many
// ...
disabled={prevCursors.length === 0}
// ...
disabled={!data?.pagination.hasMore}
```

**File: `app/(authenticated)/workflows/[workflowId]/page.tsx`**

Line ~169 — the `data.total` reference in the executions section:
Find the `WorkflowExecution` list section that uses `data.total` and replace with `data.pagination.hasMore` for "load more" UX or remove the count display.

### 8b. `hooks/api/automations.ts` — missing permission gates

This file (`frontend/hooks/api/automations.ts`) is NOT under `hooks/api/workflows*`. Its hooks need `useCan` gates:
- `useAutomations` — add `enabled: useCan("settings:automations:view")`
- `useAutomationRuns` — add `&& useCan("settings:automations:view")` to existing `enabled`
- Mutation hooks — add `useCan("settings:automations:manage")` check in `mutationFn`

Both keys exist in both catalogs (verified at `backend/src/modules/rbac/permissions/shared.ts` and `frontend/lib/rbac/permissions/shared.ts`).

### 8c. `hooks/api/build/workflow.ts` — missing mutation gates

This file is at `hooks/api/build/workflow.ts` (NOT `hooks/api/workflows*`). Mutations need:
- `useCreateTransition` — add `useCan("build:workflow:manage")` gate
- `useUpdateTransition` — add `useCan("build:workflow:manage")` gate
- `useDeleteTransition` — add `useCan("build:workflow:manage")` gate
- `useUpdateStatusWip` — add `useCan("build:workflow:manage")` gate

**Note:** Verify `build:workflow:manage` exists in both catalogs before applying — the survey found `build:workflow:view` (used by `useWorkflowTransitions`) but did not confirm `build:workflow:manage`.

---

## 9. Summary of Changes Made

**Backend:**
- `dto/workflow.schemas.ts` — cursor schemas replace offset schemas
- `workflows-crud.service.ts` — cursor pagination in `listWorkflows` (261→283 lines)
- `workflows-execution.service.ts` — cursor pagination in `listExecutions` + `listAllExecutions` (277→296 lines)
- `workflows.controller.e2e-spec.ts` — NEW: 22 tests covering 401/403/module-disabled/cross-tenant-404/secret-redaction/owner-bypass

**Frontend:**
- `hooks/api/workflows.ts` — replaced 480-line monolith with 63-line barrel re-export
- 7 new domain files (types, definitions, executions, approvals, schedules, secrets, variables, analytics) — all ≤137 lines
- `hooks/api/workflows/workflows-gates.test.tsx` — NEW: 13 tests covering permission gates + cursor contract
