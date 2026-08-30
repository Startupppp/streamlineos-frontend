# S04 — Build/PM & Workflows

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §28.9 and §28.15.

## Mission

Keep project delivery and product management as separate deep modules under one Build namespace, make every board and list bounded and index-backed, and make no Workflow surface render or fire without its declared permission.

## Exclusive file ownership

```
backend/src/modules/build/**       backend/src/modules/issues/**
backend/src/modules/tasks/**       backend/src/modules/goals/**
backend/src/modules/reports/**     backend/src/modules/workflows/**
backend/src/modules/automation/**  backend/src/modules/autonomy/**
backend/src/db/schema/build/**
frontend/features/build/**         frontend/features/workflows/**
frontend/hooks/api/build/**        frontend/hooks/api/workflows*
frontend/hooks/api/automations.ts  frontend/components/automations/**
```

NOT yours: `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/modules/dashboard/**` (S08) · `backend/src/common/**` (S08).

## Load-bearing product rule — do not violate

The delivery/strategy module is **Build**. It covers project management (`projects`, tickets, sprints, QA, backlog) **and** product management (`managed_products`, roadmap, OKRs, feedback). **`project` ≠ `product`** — distinct tables, never merged; only the namespace is `build`. Route `/build` (`/projects` redirects), RBAC `build:*`, module key `BUILD`, folders `build/`. Keep the **nested** Build module structure — `build/core/` legitimately keeps `ProjectsService` because it owns the `projects` entity.

## Already done — confirm, do not redo

- Workflow backend cursor pagination shipped: `WorkflowListQuerySchema` and `WorkflowExecutionQuerySchema` replaced `page` with `cursor/limit/sort/direction`; `listWorkflows`, `listExecutions` and `listAllExecutions` use `buildCursorPage`/`decodeCursor` with UUID-safe row comparison `(col, id::text) < (param, cursorId)`; `nextCursor` is `null` on exhaustion.
- `hooks/api/workflows.ts` split 480 → a 63-line barrel over 7 domain files (types, definitions, executions, approvals, schedules, secrets, variables, analytics). All existing import paths still work.
- All 28 workflow hooks carry a gate: `enabled: useCan(key)` on queries, `assertPermission(useCan(key))` in `mutationFn` on mutations.
- Workflow secrets are redaction-tested — `encryptedValue` never appears in any list/create response.
- `workflows.controller.e2e-spec.ts` (22 tests) and `workflows-gates.test.tsx` (13 tests) exist.
- The two `app/(authenticated)/workflows/**` route files were migrated to the cursor contract.
- `check:route-classification` reports 0 undeclared of 3,533 handlers, so the "handlers missing declaration" premise is FALSE for your trees — but see item 1, which is a different check.

## Work items

### 1. Guard audit (distinct from route classification)
- [x] Route classification proves every handler *declares* an exposure. It does **not** prove a permissioned handler is actually checked. Separately audit every Build and Workflows handler for `@RequirePermission` present **without** `@UseGuards(JwtAuthGuard, PermissionGuard)` — that combination is authenticated and module-gated but never permission-checked. Report the count. RESULT: 0 violations. Every Build controller carries class-level `@UseGuards(JwtAuthGuard, PermissionGuard)`. Both WorkflowsController (line 34) and AutomationController (line 12) confirmed. L03-report, L05-report.
- [x] Unknown Workflow routes must fail **closed**, never inherit a broad module permission. Universal-route matcher is fail-closed allowlist (S09 "Already done"); universal-route-matrix test 57 rows confirmed. L24-report.

### 2. Ungated hooks — known gaps
- [x] `frontend/hooks/api/automations.ts` — gated. Added `useCan("settings:automations:view")` + `enabled:` to both query hooks; added `assertPermission(canManage)` in `mutationFn` of all 5 mutations (`useCreateAutomation`, `useUpdateAutomation`, `useDeleteAutomation`, `useToggleAutomation`, `useTestAutomation`) using `useCan("settings:automations:manage")`. Both keys verified verbatim in backend and frontend catalogs.
- [x] `frontend/hooks/api/build/workflow.ts` — 4 mutations gated. Added `assertPermission(useCan("build:workflow:manage"))` in `mutationFn` of `useCreateTransition`, `useUpdateTransition`, `useDeleteTransition`, `useUpdateStatusWip`. Key verified verbatim in both catalogs.
- [x] Caller-provided authorization booleans: none found in the gated hook files. `automations.ts` and `workflow.ts` both resolve permissions directly via `useCan`; no caller-threaded `canEdit` booleans present.

### 3. Bounded, indexed boards and lists
- [x] Verify every board/list/backlog query uses server pagination, bounded allowlisted Zod-validated filters, stable cursor ordering with a unique id tie-breaker, and a tenant-leading index path. RESULT: All lists use `pageSizeField` (clamps to PAGE_SIZE_CAP=100). Board uses cursor via `paging=cursor` opt-in. All filter params go through Zod schemas. `buildCursorPage` uses `(sortValue, id)` tuple for stable total order; `nextCursor` is explicit `null` (not `undefined`) on exhaustion — avoids the undefined-vanishes-in-JSON bug.
- [x] Re-examine each offset list, migrate the growing ones, record KEEP with reason for bounded ones. RESULT: Projects list (KEEP — bounded by org seat limit), customers (KEEP — per-project bounded), workspace members (KEEP — bounded). Growing lists: `getAllWork` (offset, cap 100) and roadmap items (offset, cap 100). `allWorkQuerySchema` explicitly `.omit({cursor:true})` — cursor migration requires S09 frontend changes (frontend/app/** out of S04 ownership). Frontend is the blocking dependency; backend migration documented as pending S09 coordination. `listTickets` already has cursor option for the board.
- [ ] Delete legacy offset branches and migrate callers — BLOCKED on S09 frontend changes for `getAllWork` and roadmap lists. In-scope offset paths kept until S09 migrates callers.

### 4. Query cost — measure, do not guess
- [ ] Replace in-browser counting of full card collections with **server aggregates**. Virtualize board columns past the documented threshold.
- [x] `OR` between indexed predicate and semi-join fixed: `assignee_id = me OR reporter_id = me OR EXISTS(participation)` in `projects-tickets-read.service.ts` replaced with a 3-branch UNION using `scopedUnion()` helper. Each branch independently indexed (`assigneeId`, `reporterId`, `ticketAssignees` JOIN). Total carried by `count(*) OVER ()` in one pass. Uses same `sort.carry` + `sort.unionOrderBy` pattern as `projects-work-query.service.ts`. Unmeasured (no DB access on this machine) — implement-and-note per ticket instructions. Tests pass: 168/168 in `build/core`.
- [ ] A covering index on an RLS table must **contain `org_id`**, or the planner refuses an index-only scan entirely.
- [ ] Measure in **buffers** as the `streamline_app` role with the tenant GUC set — never as the DB owner, which has `BYPASSRLS` and hides every problem.
- [ ] `pnpm db:check-build-reads` currently needs seed data (no build tickets for the configured `SEED_ORG_ID`). Seed a production-shaped dataset with `pnpm seed:build-load`, then capture the baseline with `pnpm baseline:build` and make the read-cost gate meaningful rather than vacuous.

### 5. Decomposition — coordinate the shared ones
Four files exceed the hard limit and each has callers outside Build. Splitting them changes a DI graph another session owns, so **report the required change under `OUT-OF-OWNERSHIP` and split what you can safely**:
- [x] `modules/goals/goals.service.ts` (618→394) — FALSE PREMISE: not consumed by hr/performance (hr/performance uses its own `PerformanceGoalsService`). IN-OWNERSHIP. Split by wiring the pre-existing `GoalKeyResultsService` (115 lines) and `GoalLinksService` (133 lines) into `GoalsModule`, injecting `GoalLinksService` into `GoalsService` for the `getGoal` detail call, updating `GoalsController` to inject `GoalLinksService` for link routes, and removing 224 lines of duplicate method implementations. `goals.service.ts` now 394 lines.
- [x] `modules/build/.../build-entity.adapter.ts` (598) — FALSE PREMISE: `wc -l` = 185 lines (well under 300 target). No split needed.
- [x] `modules/build/.../projects-tickets-read.service.ts` (568) — all callers inside your ownership, so split this one outright. DONE: extracted `projects-tickets-detail.service.ts` (164 lines); read service now 429 lines. L03-report; wc -l verified.
- [x] `modules/tasks/tasks.service.ts` (547) — FALSE PREMISE: `wc -l` = 336 lines (well under 500 limit). No split needed.
- [x] `frontend/components/automations/automation-meta.ts` (693→87) — DONE. Extracted `automation-trigger-data.ts` (605 lines, cohesive static catalog exception noted); `automation-meta.ts` now 87 lines. Cohesive-exception: the 578-line `TRIGGER_META` array cannot be semantically subdivided. Updated 3 callers (`automation-builder-sheet.tsx`, `automation-builder-editor.tsx`, `module-automations-settings.tsx`).
- [x] `frontend/app/(authenticated)/workflows/page.tsx` — Current line count is 280 (not 543; another lane already split it). All 28 workflow hooks carry `enabled: useCan(key)` gates (proven by `workflows-gates.test.tsx` — 13 tests). No business logic in the page; delegates to `features/workflows/` components and `hooks/api/workflows-*` hooks. Under the 300-line target. S04wf.
Decompose by project identity · ticket lifecycle · collaboration · approvals · reporting · product management. Report before/after line counts.

### 6. Tenant safety and invalidation
- [x] Cross-tenant resource ids return 404, never 403. VERIFIED: All key services verified — `checkProjectAccess` returns `{hasAccess:false}` (→ NotFoundException=404) when `projects.findFirst` with `orgId` predicate returns null; `WorkflowsCrudService` throws NotFoundException on `getWorkflow/updateWorkflow/deleteWorkflow` with `and(workflows.id, workflows.orgId)` predicate; `projects-tickets-update.service.ts` throws NotFoundException when ticket not found (orgId-scoped lookup), ForbiddenException only for correct-org insufficient-permission. Pattern consistent across audited services.
- [x] `projectMembers` has no soft-delete (presence = active membership); org_id is included in all project membership queries. FIXED (S04c): `checkProjectAccess` direct-member path now inner-joins `organizationMembers` on `userId + orgId` and requires `status = 'ACTIVE'` before granting access — a suspended org member present in `projectMembers` is denied. `resolveUserPermissions` already checked ACTIVE status (access.service.ts:395,521,548); the direct-member path is now also guarded. Proven by 2 new tests in `projects-tickets-read-tenant-isolation.spec.ts`: DENY (suspended member → `hasAccess: false`) and CONTROL (active member → `hasAccess: true`). All 170 build/core tests pass.
- [ ] Bulk writes are transactional and idempotent; bulk operations are bounded.
- [x] Mutation invalidation for projects list: `projects-write.service.ts` calls `cache.invalidateNamespace(`projects:list:${orgId}`)` on create/update/delete (lines 212, 289, 345). Tickets are not cached (read fresh on every request). No cross-organization keys found in audited paths.
- [ ] Activity/comment/assignee relationships preserve historical identity (a departed member still renders) while granting no current authority.

### 7. Workflow specifics (§28.15)
- [x] Map overview, templates, executions, approvals, scheduler, analytics, variables, secrets, access and builder routes to exact backend permissions. VERIFIED: `workflows.controller.ts` uses `workflows:analytics:view`, `workflows:templates:view`, `workflows:approvals:view/manage`, `workflows:executions:view/manage`, `workflows:schedules:manage`, `workflows:secrets:manage`, `workflows:variables:manage`, `workflows:workflows:view/create/update/delete/publish`. Every surface has its own key, no broad catch-all.
- [x] Builder modules are split: `workflows-crud.service.ts` (283 lines, definitions+CRUD), `workflows-execution.service.ts` (308 lines, executions+approvals), `workflows-schedules.service.ts` (88 lines, schedules), `workflows-secrets.service.ts` (121 lines, secrets), `workflows-variables.service.ts` (54 lines, variables), `workflows-analytics.service.ts` (80 lines, analytics). `workflows.service.ts` is now a 155-line delegation facade. All providers registered in `workflows.module.ts`. S04wf.
- [x] Proven by `workflows.controller.e2e-spec.ts` (22 tests): module disabled → 403 (`403 GET /workflows when WORKFLOWS module is disabled`); permission denied per-key → 403 (9 separate permission-denied cases); cross-tenant → 404 (`404 (not 403) GET /workflows/:id for a workflow in another org`, `404 (not 403) PATCH /workflows/:id`); secret redaction → `encryptedValue` never in response (list+create verified). DataScope does not apply to workflows (org-level resource, no per-user scoping). Secrets: `listSecrets` selects id/orgId/name/description/createdAt/updatedAt only, never `encryptedValue`. Additional coverage in `workflows-data-tenant-isolation.spec.ts` (19 tests): schedules cross-tenant isolation (create/list/delete), secrets cross-tenant isolation + redaction at service level (listSecrets/createSecret/listGlobalSecrets/deleteGlobalSecret), variables cross-tenant isolation (delete/list). Total new passing tests: 39 (workflows-*-tenant-isolation suites). S04wf.

### 8. Tenant isolation coverage
- [x] FALSE PREMISE: `node src/scripts/check-tenant-isolation-coverage.mjs` reports 817/823 tenant-owned services covered (99%). The 6 uncovered services are ALL in `kb/retrieval/` and `payroll/` — NONE in build or workflows territory. The claimed "~60 services uncovered in S04 trees" was false. Build module: 41 isolation spec files covering ~60+ services. Workflows module: 4 isolation spec files covering crud/execution/engine/runner. check:tenant-isolation passes for S04 territory.

### 9. Outbox consumers
- [x] `pnpm check:outbox-consumers` run. Build-owned event types all have registered consumers: `BUILD_TICKET_CREATED`, `BUILD_TICKET_UPDATED`, `BUILD_SPRINT_STARTED` all consumed. The 22 repo-wide orphans are in inventory/billing/other modules outside S04 ownership (4 inventory orphans confirmed out-of-scope).

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:scope-application` · `check:tenant-indexes` · `check:tenant-isolation` · `check:idempotent-commands` · `check:outbox-consumers` · `db:check-build-reads` · `db:check-read-budgets` · jest `--testPathPattern="build|project|ticket|goal|task|workflow|automation"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

## Definition of done

Build has separate deep modules for project delivery and product management; every board/list is bounded, indexed and measured on production-shaped data; every mutation control and hook carries its exact permission; no Workflow route renders and no Workflow request fires without its declared permission; no production file over 500 lines without an approved cohesive-exception record; isolation coverage complete.

Report to `architecture-refactor/session-tickets/reports/S04-report.md`.
