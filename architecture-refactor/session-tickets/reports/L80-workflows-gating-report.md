# L80 — Workflows Permission Gating Report

## Route → Permission Map

Every key exists verbatim in `backend/src/modules/rbac/permissions/workflows.ts` and generated `MODULE_ACCESS_PERMISSIONS` (delegable module).

| Route | HTTP | Permission key | Gate mechanism |
|---|---|---|---|
| `/workflows` (overview) | GET | `workflows:workflows:view` | `@RequirePermission` + class-level `@UseGuards(JwtAuthGuard, PermissionGuard)` |
| `/workflows/:workflowId` | GET | `workflows:workflows:view` | same |
| `/workflows` create | POST | `workflows:workflows:create` | same |
| `/workflows/:workflowId` update | PATCH | `workflows:workflows:update` | same |
| `/workflows/:workflowId` delete | DELETE | `workflows:workflows:delete` | same |
| `/workflows/:workflowId/publish` | POST | `workflows:workflows:publish` | same |
| `/workflows/:workflowId/duplicate` | POST | `workflows:workflows:create` | same |
| `/workflows/:workflowId/disable` | POST | `workflows:workflows:update` | same |
| `/workflows/:workflowId/archive` | POST | `workflows:workflows:update` | same |
| `/workflows/templates` | GET | `workflows:templates:view` | same |
| `/workflows/:workflowId/builder` (read) | GET (via `useWorkflow`) | `workflows:workflows:view` | hook `enabled: canView` |
| `/workflows/executions` | GET | `workflows:executions:view` | same |
| `/workflows/:workflowId/executions` | GET | `workflows:executions:view` | same |
| `/workflows/:workflowId/executions/:id` | GET | `workflows:executions:view` | same |
| `/workflows/:workflowId/trigger` | POST | `workflows:executions:manage` | same |
| `/workflows/:workflowId/executions/:id/cancel` | POST | `workflows:executions:manage` | same |
| `/workflows/approvals/pending` | GET | `workflows:approvals:view` | same |
| `/workflows/approvals/:id/action` | POST | `workflows:approvals:manage` | same |
| `/workflows/schedules` | GET | `workflows:schedules:manage` | same |
| `/workflows/:workflowId/schedules` | GET/POST | `workflows:schedules:manage` | same |
| `/workflows/:workflowId/schedules/:id` | PATCH/DELETE | `workflows:schedules:manage` | same |
| `/workflows/analytics` | GET | `workflows:analytics:view` | same |
| `/workflows/secrets` | GET/POST | `workflows:secrets:manage` | same |
| `/workflows/secrets/:id` | DELETE | `workflows:secrets:manage` | same |
| `/workflows/:workflowId/secrets` | GET/POST | `workflows:secrets:manage` | same |
| `/workflows/:workflowId/secrets/:id` | DELETE | `workflows:secrets:manage` | same |
| `/workflows/variables` | GET | `workflows:variables:manage` | same |
| `/workflows/variables/:id` | DELETE | `workflows:variables:manage` | same |
| `/workflows/access` | GET (page) | `workflows:access:view` | `requirePermission()` server-side + `@AuthorizedInService` on backend via `assertModuleAccessPolicy` |
| Cron sweep | POST `/cron/workflow-executions-sweep` | `@Public()` + `assertCronSecret(authorization)` | shared-secret gate (not user auth) |

## Hooks Gated

**14 hooks across 6 files — all already properly gated before this session.**

| Hook | File | Key | Gate type |
|---|---|---|---|
| `useWorkflows` | workflows-definitions.ts | `workflows:workflows:view` | `enabled: canView` |
| `useWorkflow` | workflows-definitions.ts | `workflows:workflows:view` | `enabled: canView && workflowId.length > 0` |
| `useCreateWorkflow` | workflows-definitions.ts | `workflows:workflows:create` | `assertPermission(canCreate)` in mutationFn |
| `useUpdateWorkflow` | workflows-definitions.ts | `workflows:workflows:update` | `assertPermission(canUpdate)` |
| `useDeleteWorkflow` | workflows-definitions.ts | `workflows:workflows:delete` | `assertPermission(canDelete)` |
| `usePublishWorkflow` | workflows-definitions.ts | `workflows:workflows:publish` | `assertPermission(canPublish)` |
| `useDuplicateWorkflow` | workflows-definitions.ts | `workflows:workflows:create` | `assertPermission(canCreate)` |
| `useWorkflowExecutions` | workflows-executions.ts | `workflows:executions:view` | `enabled: canView` |
| `useAllExecutions` | workflows-executions.ts | `workflows:executions:view` | `enabled: canView` |
| `useTriggerWorkflow` | workflows-executions.ts | `workflows:executions:manage` | `assertPermission(canExecute)` |
| `useCancelExecution` | workflows-executions.ts | `workflows:executions:manage` | `assertPermission(canManage)` |
| `usePendingApprovals` | workflows-approvals.ts | `workflows:approvals:view` | `enabled: canView` |
| `useHandleApproval` | workflows-approvals.ts | `workflows:approvals:manage` | `assertPermission(canManage)` |
| `useAllSchedules` | workflows-schedules.ts | `workflows:schedules:manage` | `enabled: canManage` |
| `useWorkflowSchedules` | workflows-schedules.ts | `workflows:schedules:manage` | `enabled: canManage` |
| `useCreateSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` |
| `useUpdateSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` |
| `useDeleteSchedule` | workflows-schedules.ts | `workflows:schedules:manage` | `assertPermission(canManage)` |
| `useGlobalSecrets` | workflows-secrets.ts | `workflows:secrets:manage` | `enabled: canManage` |
| `useWorkflowSecrets` | workflows-secrets.ts | `workflows:secrets:manage` | `enabled: canManage` |
| `useCreateGlobalSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` |
| `useCreateWorkflowSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` |
| `useDeleteGlobalSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` |
| `useDeleteWorkflowSecret` | workflows-secrets.ts | `workflows:secrets:manage` | `assertPermission(canManage)` |
| `useGlobalVariables` | workflows-variables.ts | `workflows:variables:manage` | `enabled: canManage` |
| `useDeleteGlobalVariable` | workflows-variables.ts | `workflows:variables:manage` | `assertPermission(canManage)` |
| `useWorkflowAnalytics` | workflows-analytics.ts | `workflows:analytics:view` | `enabled: canView` |
| `useWorkflowTemplates` | workflows-analytics.ts | `workflows:templates:view` | `enabled: canView` |

28 hooks, 0 ungated.

## `@RequirePermission` Without `PermissionGuard` — Live Holes Found

**None.** `WorkflowsController` applies `@UseGuards(JwtAuthGuard, PermissionGuard)` at the class level (line 44). Every one of the 30 handler endpoints carries `@RequirePermission`. The cron endpoint is `@Public()` with `assertCronSecret(authorization)` as its gate. No handler is ungated.

## Layout Enforcement

`frontend/app/(authenticated)/workflows/layout.tsx` calls `enforceRouteAccess("/workflows")`, which resolves via `resolveNavRouteAccess` to `{ permission: "workflows:workflows:view", orgModuleKey: null }` (null because `planGated: false`). Unregistered sub-routes return `{ kind: "unknown" }` → redirect to `/access-denied`. The coordinator confirmed this covers the layout — not redone here.

## Unknown Routes Fail Closed

`enforceRouteAccess` redirects any `{ kind: "unknown" }` decision to `/access-denied?required=route:unregistered`. Since every Workflow sub-route is registered in `WORKFLOWS_NAV_GROUPS` with its own `requiredPermission`, an unlisted route falls through to `unknown` and is denied.

## Caller-Provided Auth Booleans

No `canManage` / `canView` props are threaded from parent to child in any of the `/workflows/**` page components. Each page resolves its own permission gate directly via `useCan`. The only `canManage` usage in files matching `workflows` is in `hr/settings/workflows/page.tsx`, which is the HR workflow admin page — a separate module, correctly using `useCan("hr:workflows:manage")` locally.

## Secret Redaction

`check:log-secrets` — PASS. No plaintext secret values in logs. Secrets endpoints return name, description, and creation timestamp only — never the secret value — confirmed in `WorkflowsService.listGlobalSecrets` and `listSecrets`.

## Verification Checks

| Check | Result |
|---|---|
| `backend check:permission-keys` | PASS — 3,095 `@RequirePermission` usages, 621 unique keys, all in backend catalog and frontend union |
| `backend route-classification-report` | PASS — 3,534 handlers, 0 undeclared |
| `backend check:log-secrets` | PASS — no plaintext secrets, all `@UseRateLimit` keys in TIERS |
| `backend check:scope-application` | PASS — 124 DataScope resolutions, all reach a predicate |
| `backend check:navigation-permissions` | PASS — `workflows:access:view` resolved via `@AuthorizedInService` |
| `frontend catalog-sync.test.ts` | PASS — no phantom keys, no union-only ghosts |
| `frontend sidebar-permission-coverage.test.ts` | PASS |
| `frontend workflows-gates.test.tsx` | 13/13 PASS (was 1 OOM pre-existing failure — fixed) |

## Pre-existing Failure Fixed

`hooks/api/workflows/workflows-gates.test.tsx` — test 1 OOMed because `apiClient.get` mock returned `{ data: [], pagination: ... }` for ALL calls, including `/me/access`. `useAccess` has `refetchOnWindowFocus: "always"`, so it refetched and overwrote the seeded valid `AccessResponse` with invalid data. `data.scopes` became `undefined`, causing `"key" in undefined` TypeError → infinite React re-render loop → heap exhaustion.

Fix: URL-aware mock (`/me/access` → valid empty `AccessResponse`, everything else → empty list). Assertions updated from `not.toHaveBeenCalled()` to `not.toHaveBeenCalledWith(specificWorkflowUrl)` since `/me/access` is legitimately called by `useAccess`. Pagination tests updated to use `mockImplementationOnce` that is also URL-aware.

## Files Changed

- `frontend/hooks/api/workflows/workflows-gates.test.tsx` — fixed OOM (URL-aware mock + scoped assertions)
