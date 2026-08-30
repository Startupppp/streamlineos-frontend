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
- [ ] Route classification proves every handler *declares* an exposure. It does **not** prove a permissioned handler is actually checked. Separately audit every Build and Workflows handler for `@RequirePermission` present **without** `@UseGuards(JwtAuthGuard, PermissionGuard)` — that combination is authenticated and module-gated but never permission-checked. Report the count.
- [ ] Unknown Workflow routes must fail **closed**, never inherit a broad module permission.

### 2. Ungated hooks — known gaps
- [ ] `frontend/hooks/api/automations.ts` has **no `useCan` gates on any hook**. Gate each one internally with its exact key (likely `settings:automations:view` / `:manage` — verify both catalogs before using; if a key is missing, report it to S01, do not add it).
- [ ] `frontend/hooks/api/build/workflow.ts` has **4 mutations with no gate**. Gate them (likely `build:workflow:manage` — verify verbatim in both catalogs first).
- [ ] Remove caller-provided authorization booleans wherever the hook can resolve the permission itself.

### 3. Bounded, indexed boards and lists
- [ ] Verify every board/list/backlog query uses server pagination, bounded allowlisted Zod-validated filters, stable cursor ordering with a unique id tie-breaker, and a tenant-leading index path.
- [ ] A previous pass concluded "board already uses cursor; other lists are offset with cap 100 — acceptable". That is **not** the PRD contract: every *growing* list must be cursor-paginated. Re-examine each offset list, migrate the growing ones, and record an explicit KEEP with a reason for any that is genuinely bounded (a fixed catalog, a per-project set with a hard ceiling).
- [ ] Delete legacy offset branches in the same pass and migrate every caller (in-place removal is authorized; no external consumers).

### 4. Query cost — measure, do not guess
- [ ] Replace in-browser counting of full card collections with **server aggregates**. Virtualize board columns past the documented threshold.
- [ ] An `OR` between an indexed predicate and a semi-join defeats both: `assignee_id = me OR EXISTS(participation)` scans the whole organization. Split into a `UNION` of independently-indexed branches carrying the total via `count(*) OVER ()`. **The winner flips once the outer set is narrowed to one project — measure both.**
- [ ] A covering index on an RLS table must **contain `org_id`**, or the planner refuses an index-only scan entirely.
- [ ] Measure in **buffers** as the `streamline_app` role with the tenant GUC set — never as the DB owner, which has `BYPASSRLS` and hides every problem.
- [ ] `pnpm db:check-build-reads` currently needs seed data (no build tickets for the configured `SEED_ORG_ID`). Seed a production-shaped dataset with `pnpm seed:build-load`, then capture the baseline with `pnpm baseline:build` and make the read-cost gate meaningful rather than vacuous.

### 5. Decomposition — coordinate the shared ones
Four files exceed the hard limit and each has callers outside Build. Splitting them changes a DI graph another session owns, so **report the required change under `OUT-OF-OWNERSHIP` and split what you can safely**:
- [ ] `modules/goals/goals.service.ts` (618) — consumed by `hr/performance`
- [ ] `modules/build/.../build-entity.adapter.ts` (598) — consumed by `entity-reference`
- [ ] `modules/build/.../projects-tickets-read.service.ts` (568) — all callers inside your ownership, so split this one outright
- [ ] `modules/tasks/tasks.service.ts` (547) — consumed by `surveys`
- [ ] `frontend/components/automations/automation-meta.ts` (693) and `frontend/app/(authenticated)/workflows/page.tsx` (543 — report to S09)
Decompose by project identity · ticket lifecycle · collaboration · approvals · reporting · product management. Report before/after line counts.

### 6. Tenant safety and invalidation
- [ ] Project membership queries include `org_id` **and** active status. Cross-tenant resource ids return 404, never 403.
- [ ] Bulk writes are transactional and idempotent; bulk operations are bounded.
- [ ] Mutation invalidation covers list, detail, board, counters, dashboard and realtime caches, with no cross-organization keys.
- [ ] Activity/comment/assignee relationships preserve historical identity (a departed member still renders) while granting no current authority.

### 7. Workflow specifics (§28.15)
- [ ] Map overview, templates, executions, approvals, scheduler, analytics, variables, secrets, access and builder routes to exact backend permissions. Secrets, variables, schedules, approvals and execution actions each use their **own** key, not one broad module key.
- [ ] Split the builder modules by definitions · executions · approvals · schedules · variables/secrets · builder state.
- [ ] Prove: module disabled, permission denied, own/team/all DataScope, cross-tenant resource id, and secret redaction. Secrets never enter logs, caches or client payloads.

### 8. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (bucket B04 plus the workflows slice of B08, ~60 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row.

### 9. Outbox consumers
- [ ] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees: register an idempotent consumer, or remove the emission with zero-consumer proof.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:scope-application` · `check:tenant-indexes` · `check:tenant-isolation` · `check:idempotent-commands` · `check:outbox-consumers` · `db:check-build-reads` · `db:check-read-budgets` · jest `--testPathPattern="build|project|ticket|goal|task|workflow|automation"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

## Definition of done

Build has separate deep modules for project delivery and product management; every board/list is bounded, indexed and measured on production-shaped data; every mutation control and hook carries its exact permission; no Workflow route renders and no Workflow request fires without its declared permission; no production file over 500 lines without an approved cohesive-exception record; isolation coverage complete.

Report to `architecture-refactor/session-tickets/reports/S04-report.md`.
