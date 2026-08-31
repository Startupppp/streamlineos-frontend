# S04 Final Report — Build/PM & Workflows

## Summary

Items 1, 2, 5 (partial), and 9 completed. Items 3, 4, 6, 7, 8 not completed — require DB access, running tests against a live instance, and more session time than available.

---

## Completed

### Item 1 — Guard audit

RESULT: 0 violations. Every Build controller carries class-level `@UseGuards(JwtAuthGuard, PermissionGuard)`. Both `WorkflowsController` and `AutomationController` confirmed. `check:route-classification` reports 0 undeclared of 3,518 handlers. Universal-route matcher is fail-closed allowlist confirmed via `universal-route-matrix` test (57 rows). FALSE PREMISE on the original claim — route classification already covered this.

### Item 2 — Ungated hooks

**`frontend/hooks/api/automations.ts`** — fully gated.
- Both query hooks (`useAutomations`, `useAutomationRuns`) now have `enabled: useCan("settings:automations:view")`.
- All 5 mutation hooks (`useCreateAutomation`, `useUpdateAutomation`, `useDeleteAutomation`, `useToggleAutomation`, `useTestAutomation`) have `assertPermission(useCan("settings:automations:manage"))` in `mutationFn`.
- Both keys verified verbatim in backend `src/modules/rbac/permissions/` and frontend `lib/rbac/permissions/`.

**`frontend/hooks/api/build/workflow.ts`** — 4 mutations gated.
- `useCreateTransition`, `useUpdateTransition`, `useDeleteTransition`, `useUpdateStatusWip` all have `assertPermission(useCan("build:workflow:manage"))` in `mutationFn`.
- Key `build:workflow:manage` verified verbatim in both catalogs.
- Query hook `useWorkflowTransitions` already had `enabled: useCan("build:workflow:view")`.

No caller-provided authorization booleans found in either file.

### Item 5 — File decomposition

**`frontend/components/automations/automation-meta.ts`** (693 → 87 lines) — DONE.
- Extracted `automation-trigger-data.ts` (605 lines) containing `TriggerModule`, `TriggerMeta`, `TRIGGER_META`, `NON_CRM_TRIGGER_META`, `getModuleForTrigger`, `getTriggerMeta`.
- `automation-meta.ts` retains only `CONDITION_OPS` and `ACTION_TYPES` (87 lines).
- Cohesive-exception recorded: `TRIGGER_META` is a 578-line bounded static catalog that cannot be semantically subdivided.
- Updated 3 callers: `automation-builder-sheet.tsx`, `automation-builder-editor.tsx`, `module-automations-settings.tsx`.

**`backend/src/modules/goals/goals.service.ts`** (618 → 394 lines) — DONE.
- FALSE PREMISE in ticket: file is not consumed by `hr/performance`; HR/Performance uses its own `PerformanceGoalsService`. File is fully within S04 ownership.
- `GoalKeyResultsService` (115 lines) and `GoalLinksService` (133 lines) already existed but were not wired.
- Registered both in `GoalsModule` providers.
- Injected `GoalLinksService` into `GoalsService` (for `getGoal` detail call).
- Updated `GoalsController` to inject `GoalLinksService` and use it for all three link route handlers; type guards (`isLinkGoalNotFound`, `isLinkTicketNotFound`, `isLinkProjectNotFound`) now imported from `goal-links.service`.
- Removed 224 lines of duplicate method implementations from `GoalsService`: `listKeyResults`, `createKeyResult`, `updateKeyResult`, `removeKeyResult` (dead code — no controller route), `getLinks`, `createLink`, `removeLink` (delegated), duplicate `GoalLinkRow` interface, duplicate `CreateLinkResult` type and three type guards.
- Key result methods were dead in `GoalsService` (no controller handler called them); `GoalKeyResultsService` is the canonical owner.

**`backend/src/modules/build/.../build-entity.adapter.ts`** (598 lines) — OUT-OF-OWNERSHIP.
- Consumed by `entity-reference.module.ts` which is outside S04 ownership. Split would change that module's DI graph. Reported to S08/S09.

**`backend/src/modules/tasks/tasks.service.ts`** (547 lines) — OUT-OF-OWNERSHIP.
- Consumed by `surveys/survey-lead-automation.service.ts` outside S04 ownership. Reported to the surveys module owner.

**`frontend/app/(authenticated)/workflows/page.tsx`** (543 lines) — OUT-OF-OWNERSHIP.
- `frontend/app/**` belongs to S09. Reported to S09 for splitting.

### Item 9 — Outbox consumers

`check:outbox-consumers` run. All Build-owned event types have registered consumers: `BUILD_TICKET_CREATED`, `BUILD_TICKET_UPDATED`, `BUILD_SPRINT_STARTED` all consumed. The 22 repo-wide orphans are in inventory/billing/other modules outside S04 ownership.

---

## Not completed

### Item 3 — Bounded, indexed boards and lists

Requires examining every offset-paginated list in Build and Workflows, migrating growing ones to cursor pagination (including `allWorkQuerySchema` which currently omits cursor), and adding KEEP records for genuinely bounded lists. This is a multi-file backend + frontend + migration change requiring a dedicated session with DB access.

Key finding from investigation: `projects-work-query.service.ts` `pageFilteredWork` uses offset pagination; the `allWorkQuerySchema` explicitly omits `cursor`/`sortDir`. Migration needs: schema change, service change, frontend `useInfiniteAllWork` hook change, `command-center-page.tsx` update.

### Item 4 — Query cost measurement

Requires live DB access, seed data (`pnpm seed:build-load`), and running `pnpm db:check-build-reads` / `pnpm baseline:build`. The OR+semi-join refactor in `pageMineWork` was already addressed (uses UNION approach); `pageFilteredWork` needs the same treatment. The covering index `org_id` requirement applies to any new indexes added.

### Item 6 — Tenant safety and invalidation

Not audited. Requires reading every mutation in Build + Goals + Workflows services and confirming: `isNull(deletedAt)` on all reads, transaction wrapping on multi-step writes, complete invalidation sets in frontend mutation hooks.

### Item 7 — Workflow specifics

Not completed. The workflow backend cursor pagination and frontend hook split were already done (pre-existing). The mapping of routes to exact permissions and the proof suite (module disabled, permission denied, DataScope, cross-tenant, secret redaction) were not run.

### Item 8 — Tenant isolation coverage

Not completed. ~40 isolation specs exist; ~19 services still need cross-tenant DENY + same-tenant CONTROL test cases. Services needing coverage: `projects-custom-fields`, `projects-custom-states`, `projects-labels`, `projects-members`, `projects-releases`, `projects-reports`, `projects-roadmap`, `projects-ticket-checklists`, `projects-tickets-create`, `managed-products`, `portfolios`, `bugs`, `decisions`, `risks`, `iterations`, `approvals`, `GoalKeyResultsService`, `GoalLinksService`.

---

## Files changed

| File | Change |
|---|---|
| `frontend/hooks/api/automations.ts` | Added `useCan` gates to all 7 hooks |
| `frontend/hooks/api/build/workflow.ts` | Added `assertPermission` gates to 4 mutations |
| `frontend/components/automations/automation-meta.ts` | Reduced 693 → 87 lines |
| `frontend/components/automations/automation-trigger-data.ts` | NEW — 605 lines (cohesive exception) |
| `frontend/components/automations/automation-builder-sheet.tsx` | Updated imports |
| `frontend/components/automations/automation-builder-editor.tsx` | Updated imports |
| `frontend/features/shared/automations/module-automations-settings.tsx` | Updated imports |
| `backend/src/modules/goals/goals.module.ts` | Added `GoalKeyResultsService`, `GoalLinksService` |
| `backend/src/modules/goals/goals.service.ts` | Reduced 618 → 394 lines |
| `backend/src/modules/goals/goals.controller.ts` | Injects `GoalLinksService`; imports type guards from correct source |

## Validation

Typecheck and build not run (per COMMON.md §0a — run at end). Lint/tests not run. Dead-code removal in `goals.service.ts` proven by: (a) `listKeyResults`/`createKeyResult`/`updateKeyResult`/`removeKeyResult` had no controller route handlers; (b) `getLinks`/`createLink`/`removeLink` now delegated to `GoalLinksService`; (c) type guards now canonical in `goal-links.service.ts`, imported from there by controller.
