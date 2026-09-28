# Build Canonical Schemas

## Evidence and authority

- Drizzle schema: `backend/src/db/schema/build/`.
- Schema barrel: `backend/src/db/schema/build/index.ts`.
- Relations: `backend/src/db/schema/build/relations.ts`.
- Common actors/tenancy: `backend/src/db/schema/common/auth.ts`.
- Request/response Zod schemas: `backend/src/modules/build/**/dto/*.schemas.ts`.
- Client schemas: `frontend/hooks/api/build/*-schema.ts`.

Database migrations remain authoritative for storage. Zod schemas are authoritative at network and form interfaces. A client schema may not silently diverge from its server counterpart.

## Scope hierarchy

PM Workspace is removed. Migration `1159_build_remove_pm_workspaces` dropped `build.pm_workspaces`, `build.pm_workspace_memberships`, and every `pm_workspace_id` column (`build.projects`, `build.managed_products`, `build.project_teams`, `build.project_workspace_members`, `public.project_client_grants`). The rollback at `migrations/rollback/1159_build_remove_pm_workspaces.down.sql` restores shape only — the rows are gone.

```text
Organization
├── Products
├── Projects
├── Teams
├── Programs
├── Portfolios
└── Goals, roadmaps, reports and work
```

`orgId` is mandatory on every tenant-owned table and participates in foreign keys or verified lookup predicates. `managedProductId` is an optional project grouping; a project without a product is an organization-level project.

## Canonical entities

| Entity | Required identity and fields | Key relations | Lifecycle |
|---|---|---|---|
| Project | `id`, `orgId`, `key`, `name`, `status`, dates | optional product/deal; manager/client memberships | soft delete |
| WorkItem | `id`, `orgId`, `projectId`, number/key, type, title, status, priority, rank, reporter | parent, assignees, cycle, module, release, labels, relations | soft delete + version |

**`WorkItem.version` is maintained by the database, in exactly one place.** The trigger
`build.trg_tickets_version_bump` (migration 1373, journal idx 1123, applied 2026-09-27) is
`BEFORE UPDATE … FOR EACH ROW` and assigns `NEW.version := OLD.version + 1`. No application code
increments it, and none may — the assignment overwrites whatever the statement set, so a `SET
version = version + 1` in a handler is silently discarded rather than doubling the token, and a
client-supplied absolute version cannot take effect. Every update advances the token exactly once,
including a soft delete, so a tombstoning write is never mistaken for no change.
| Cycle | `id`, `orgId`, `projectId`, name, start/end, status | work items | archive/complete; no Sprint table after migration |
| ManagedProduct | `id`, `orgId`, name, status | projects, feedback, goals | soft delete |
| Portfolio/Program | `id`, `orgId`, name, status | projects or portfolios through mapping tables | soft delete |
| Team | `id`, `orgId`, name | membership actors and projects | soft delete |
| BuildMember | `id`, `orgId`, `membershipId`, `role`, `addedAt` | organization membership | roster row; no workspace relationship |
| Goal | `id`, `orgId`, scope discriminator, title, status, target | products/projects/work items | archive |
| Form | `id`, `orgId`, `projectId`, version, publication state, schema | immutable submission snapshots | archive |
| IntakeSubmission | provenance, form/version, status, assignee, mapped fields | optional accepted work item | retain/audit |
| Risk/Decision/Approval/ChangeRequest | project identity, typed state, owner/actors, dates | work items/releases/files | state-machine + audit |
| Incident | project identity, severity/status/commander/times | append-only events, actions, files, releases | resolve/archive |
| QA Case/Run/Result | project identity, version, environment/status | canonical BUG work item | archive/evidence retention |
| SavedView | owner, scope, visibility, layout, versioned filters | fields/statuses/users | archive |
| ActivityEvent | org/scope/record/actor/type/time, redacted payload | source record | append-only |

## Index rules

- Every list begins with `org_id` and its parent scope, then active predicate, filter/sort columns, and stable tie-breaker ID.
- Soft-deleted rows use partial indexes: `WHERE deleted_at IS NULL`.
- Cursor ordering is deterministic: requested sort plus `id` in the same direction.
- Human keys are unique within organization or project only while active.
- Text search uses measured trigram/FTS indexes; `projects.name` already uses `idx_projects_name_trgm` in `backend/src/db/schema/build/core.ts`.
- Composite tenant foreign keys prevent cross-organization references even when numeric IDs collide.
- JSONB stores bounded configuration or immutable snapshots, never query-critical relationship data.

## Soft delete and audit

- Soft delete fields: `deletedAt`, `deletedByMembershipId`, optional `deleteReason` where regulated or externally visible.
- Restore revalidates parent existence, unique keys, permissions, and retention windows.
- Permanent purge runs only through a bounded retention job and separately handles Files-owned objects.
- Activity is append-only and records actor membership, source, request/idempotency ID, before/after field diff, and timestamp. Secrets and rich content are redacted.

## Validation contract

- One server-owned Zod input schema per command and one response schema per wire representation.
- Frontend forms import or vendor the same contract through generated/OpenAPI parity; no hand-maintained alternative field constraints.
- IDs and route params are coerced and bounded once at the controller interface.
- Date-only values use `YYYY-MM-DD`; instants use UTC ISO-8601.
- Money uses integer minor units plus ISO currency; no floating-point arithmetic.
- Clearing an optional field is explicit `null`; omission means unchanged in patch commands.

## Migration order

1. **Done.** `1159_build_remove_pm_workspaces` dropped `build.pm_workspaces`, `build.pm_workspace_memberships`, every `pm_workspace_id` column, and renamed `build.project_workspace_members` to `build.build_members`.
2. **Done.** Reconcile Sprint/Cycle records into one Cycle identity; migrate ticket references, permissions, events, saved views, reports, and URLs.
3. **Done.** Migrate independent QA bugs to canonical `WorkItem.type=BUG`, preserving evidence links and activity.
4. Version saved-view filters and rewrite removed route/layout references.
5. Keep the Intake queue while normalizing request provenance across published Forms, public Intake, and Triage.
6. Add missing composite tenant foreign keys and partial indexes online.
7. Introduce audit/outbox fields before moving writers.
8. Remove duplicate tables/columns only after parity reports and rollback windows close.

## Cross-module references

- HRMS: store organization membership IDs, not mutable employment labels; leave/capacity is projected by HRMS.
- CRM: projects may reference a deal/customer through tenant-safe keys; CRM remains source of truth.
- Timesheets: work items are references; entries and approvals remain Timesheets-owned.
- Accounting: Build stores budget intent; recognized cost/revenue remains Accounting-owned.
- Knowledge: project Wiki stores links/projections to Knowledge pages; Library remains organization-owned.
- Files: Build stores attachment references and metadata, never duplicate blobs.

## Acceptance criteria

- [x] Every tenant-owned relation is protected by `orgId` in schema and query predicates. **2026-09-27:** Schema half verified: `build-tenant-fk-invariant.spec.ts:94-97` — all 80+ build tables carry `org_id`; 100+ FKs pair the tenant column. Query-predicate half verified 2026-09-27 against `replay2` (`127.0.0.1:5432`) as `streamline_app` with `SET app.organization_id = 'org_test_1'; SET app.membership_id = '1'`. RLS policies: `SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'build'` → **92 policies**; representative sample (`projects`, `tickets`, `cycles`, `managed_products`) all show `policyname=tenant_isolation, cmd=ALL, qual=(org_id = current_org_id())`. EXPLAIN (BUFFERS) `SELECT … FROM build.projects WHERE org_id = app.current_org_id() AND deleted_at IS NULL ORDER BY name, id LIMIT 50` → `Filter: ((deleted_at IS NULL) AND (org_id = current_org_id()))`. EXPLAIN (BUFFERS) `SELECT … FROM build.tickets WHERE org_id = app.current_org_id() AND project_id = 1 AND deleted_at IS NULL ORDER BY rank, id LIMIT 50` → `Filter: ((deleted_at IS NULL) AND (project_id = 1) AND (org_id = current_org_id()))`. Both plans are Seq Scans due to zero rows in replay2 — index-usage evidence requires production-shaped data. `check:tenant-indexes` self-test passed; gate: 939/940 tenant tables have a leading tenant index; the sole failure is `impersonation_sessions` (common schema, `src/db/schema/common/impersonation-sessions.ts`) — no Build table fails.
- [x] Standalone projects work with no product: `managedProductId = null` makes the project organization-level. PM Workspace and `pmWorkspaceId` no longer exist.
- [x] Cycle and BUG have one canonical identity each. `build.bugs` is absent from all build schema files; defect detail lives on `build.work_item_qa_details` (`backend/src/db/schema/build/qa.ts:141`) with a composite FK to `build.tickets`. `build.cycles` remains the only iteration table (`backend/src/db/schema/build/core.ts:123`); no `build.sprints` table exists in the Drizzle schema.
- [ ] Every list has a measured composite index matching filters and cursor order. **2026-09-28 NOT EARNED — but the previous verdict's *reason* was wrong, and it is corrected here.**

  **The previous verdict said no measurement is possible in this environment. That is false.** Production-shaped `EXPLAIN (ANALYZE, BUFFERS)` measurements for the ticket list and the board already exist, recorded in the repository, taken as `streamline_app` with the tenant GUC set (BE-76), after `ANALYZE`:

  - `migrations/0575_ticket_list_sort_indexes.sql:23-30` — measured as `streamline_app` with the tenant GUC on a **200,002-row org**. A 50-row page cost **16,725 shared blocks** for four of the five sortable columns, because no index carried the whole ORDER BY tuple; `count(*) OVER ()` in the SELECT forces the planner to read the entire filtered set, so an uncovered sort means a heap fetch per row. One index per sortable column carrying `(org_id, project_id, <sort col>, created_at, id)` in the query's own directions turned all five into Index Only Scans at **180–220 blocks**.
  - `migrations/1059_build_board_rank_sort_index.sql:24-41` — measured on `scratch_perf_seed`, project 21, **1,850 live tickets**, `LIMIT 101` (the API's `limit+1` probe). Page 1 before: `Incremental Sort`, `Presorted Key: rank`, `Full-sort Groups: 1`, Index Only Scan on `idx_tickets_org_project_rank_sort` rows=1850, `Buffers: shared hit=16 read=33`. Page 1 after: `Index Only Scan idx_tickets_org_project_rank_id` rows=101, **no sort node**, `Buffers: shared hit=15 read=4`. Page N before: the keyset predicate `(rank, id) > (1000, 19001)` was a `Filter`, not an `Index Cond`, reading 1,850 index rows to return 101 — 18.3×. After: same Filter, but the scan runs in `(rank, id)` order and stops at the LIMIT, `Buffers: shared hit=5 read=5`.

  Migration 1059 also embeds a runtime assertion that `RAISE EXCEPTION`s if the created index does not lead `(rank, id)` (`:104-115`), and the same change added a `forbidSort` assertion to the read-cost harness (`src/scripts/check-build-read-cost.mjs:87-92`, consumed at `:198`) so a regression to a sort node fails a gate rather than only a buffer ceiling.

  **The real blocker is COVERAGE, not measurability.** Measured this lane, statically: Build controllers declare **39** paginated list responses (`grep -c '@ResponseSchema([a-zA-Z]*[Pp]age[A-Za-z]*)' backend/src/modules/build/**/*.controller.ts` → 39). `backend/src/scripts/read-cost-budgets.mjs` declares **10** Build-scoped read-cost budget specs: `scoped-board-page` (:61), `my-work` (:83), `ticket-list-project` (:108), `ticket-org-assigned-to-me` (:124), `build-all-work` (:1331), `build-roadmap-list` (:1361), `build-org-project-health-summary` (:1380), `build-resource-allocation` (:1446), `build-feedback-list` (:1485), `build-changelog-list` (:1505). So measured index coverage is at best **10 of 39 Build lists (26%)**, and the box says *every* list.

  **DEFECT FOUND — the Build alias measures only 6 of the 10.** `backend/package.json` defines `db:check-read-budgets:build` as `--ids=scoped-board-page,my-work,ticket-list-project,ticket-org-assigned-to-me,build-org-project-health-summary,build-resource-allocation`. Four declared Build budgets — `build-all-work`, `build-roadmap-list`, `build-feedback-list`, `build-changelog-list` — are **omitted from the alias**, so running the Build gate never measures them even though their ceilings are authored. Routed to the orchestrator as a one-line `package.json` fix.

  **PRODUCTION HAZARD IN THE SETTLING COMMAND — read this before running it.** `db:check-read-budgets:build` does **not** merely "require `APP_DATABASE_URL`" as the previous verdict claimed. `src/scripts/run-read-cost-budgets.mjs:3` imports `dotenv` and autoloads `backend/.env`; a run in this checkout printed `injected env (61) from .env`. `backend/.env` **defines `APP_DATABASE_URL`, and its host is `streamlineos-instance-1.…ap-south-1.rds.amazonaws.com`** — production. `src/scripts/benchmark-role-guard.mjs` refuses a BYPASSRLS or superuser role, and refuses a target where a no-GUC read does not raise `42501`, but it contains **no check on the target host**. So the guard protects plan *validity* and not the *target*: `pnpm db:check-read-budgets:build` with no override runs `EXPLAIN (ANALYZE, BUFFERS)` against **production**. This lane did not run it (rule 6).

  **WHAT WOULD SETTLE IT.** Command: `APP_DATABASE_URL='postgres://streamline_app:<pw>@127.0.0.1:5432/replay2' PGSSLMODE=disable pnpm db:check-read-budgets` — note the *unsuffixed* alias, which runs all 86 specs, and an **explicit** `APP_DATABASE_URL` on the command line so the `.env` production value is overridden rather than inherited. `PGSSLMODE=disable` is required because `resolveSsl` defaults to `"require"`, which cannot reach a loopback target (`benchmark-role-guard.mjs:36-38`). The role must be `streamline_app` (non-BYPASSRLS) or the guard refuses. The fixture must be production-shaped: on a zero-row database the planner chooses a Seq Scan on every query regardless of index coverage, so a zero-row run proves nothing — that is the one part of the previous verdict that was right. The result that settles the box is: for each of the 39 Build list endpoints, an `EXPLAIN (ANALYZE, BUFFERS)` plan showing an Index Scan or Index Only Scan on an index whose leading columns are `org_id` then the parent scope, with **no sort node above it**, at a buffer count inside the declared ceiling. Recording that for all 39 requires 29 new budget specs first; `db:check-read-budgets --self-test` passes with no database (verified this lane: `SELF-TEST PASS: all 6 breach types detected — ceiling, plan-assertion, scan-rows, seed-floor, vacuous-result, hashed-subplan`) so the specs can be authored and their breach detection proven before any fixture exists.

  **NOT A REQUIREMENT:** the 29 unmeasured lists are unmeasured, not exempt. Nothing here licenses shipping a Build list without a composite index; it records that only 10 have authored ceilings and only 6 of those are reachable through the Build alias.

  **RE-VERIFIED 2026-09-28, second pass.** Every figure above was re-derived independently and all hold. `grep -rhoE '@ResponseSchema\([a-zA-Z]*[Pp]age[A-Za-z]*\)' src/modules/build --include=*.controller.ts | wc -l` → `39`. `grep -cE '^\s*id: "' src/scripts/read-cost-budgets.mjs` → `86` specs in total, and the 10 Build-scoped IDs sit at the exact lines cited. The alias still names 6 — `db:check-read-budgets:build = node src/scripts/run-read-cost-budgets.mjs --ids=scoped-board-page,my-work,ticket-list-project,ticket-org-assigned-to-me,build-org-project-health-summary,build-resource-allocation`.

  The production hazard is now confirmed on disk rather than inferred. `src/scripts/run-read-cost-budgets.mjs:3` is `import * as dotenv from "dotenv";`. `backend/.env` holds `APP_DATABASE_URL='postgresql://streamline_app@streamlineos-instance-1.<id>.ap-south-1.rds.amazonaws.com:5432/streamlineos?sslmode=require'`. `resolveSsl` (`src/scripts/benchmark-role-guard.mjs:37-39`) returns `"require"` unless `PGSSLMODE=disable`, and its own comment says a hardcoded `require` "is how a harness ends up only ever being pointed at the remote (owner-credentialled) database". The self-test needs no database and prints its own env injection, verbatim:

  ```
  $ node src/scripts/run-read-cost-budgets.mjs --self-test
  ◇ injected env (61) from .env
  SELF-TEST PASS: all 6 breach types detected — ceiling, plan-assertion, scan-rows, seed-floor, vacuous-result, hashed-subplan
  ```

  `injected env (61) from .env` on a run that was given no connection string is the evidence that the alias inherits the production target. The self-test passing is not evidence for this box: it proves the harness detects breaches, not that any Build list was measured.
- [x] Client and server validation constraints have automated parity evidence. `frontend/package.json:50` registers `check:contract-parity` which runs `scripts/check-contract-parity.mjs --backend-file contracts/openapi.json`; `check:contract-drift` at line 52 guards against in-flight drift. Per-entity schema tests live in `frontend/hooks/api/build/*-schema.test.ts`.
- [ ] Soft delete, restore, retention, audit, and outbox behavior is specified for every mutable entity. **2026-09-28 NOT EARNED. Re-measured this lane; the Build-territory figure was wrong and is corrected.**

  Gate run, `backend/`, verbatim:

  ```
  $ node src/scripts/check-lifecycle-predicates.mjs --self-test
    FAIL: the three-way filter keeps the primary-read candidate set actionable — a gate that flags hundreds gets switched off (found 75)
  check-lifecycle-predicates self-tests: 1 failed, 21 passed

  $ node src/scripts/check-lifecycle-predicates.mjs
  Tables 838  ·  with a lifecycle column 90  ·  read sites 2208 across 5159 files
    predicate in statement 1005  ·  built elsewhere in file 321  ·  dormant column 125  ·  primary-read candidates 75  ·  join candidates 94
  FAIL — 2 stale ACCEPTED entry(ies); the read is no longer a candidate. Remove them:
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbSources  (erasure deliberately sweeps deleted rows (report 06))
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbPages  (erasure deliberately sweeps deleted rows (report 06))
  FAIL — 75 primary reads of a lifecycle table carry no predicate, 6 above the recorded baseline of 69. Run with --list.
  FAIL — 94 joins onto a lifecycle table carry no predicate, 11 above the recorded baseline of 83. Four of ticket 06's eleven defects were exactly this shape — an ON condition on an aliased self-join, which no statement scanner can see. Run with --list.
  ```

  Note the self-test failure is the gate reporting on *itself*: its own guard asserts the primary-read candidate set stays small enough to act on, and at 75 it does not. So the one red self-test assertion and the first FAIL are the same fact, not two.

  **FIGURE CORRECTED: "20 Build files flagged" → 23 Build-territory sites across 18 distinct files.** Re-derived via `--list`: 13 primary-read candidates and 10 join candidates carry `modules/build/`; `grep -oE "modules/build/[^:]+" | sort -u` → 18 files. The named sites are:

  *Primary reads (13):* `agent-pulse/agent-pulse.service.ts:73,:79` (projectApprovals) · `client-portal/change-request-number-counter.ts:13` (changeRequests) · `core/project-crud/projects-templates.service.ts:232` (tickets) · `core/activity/projects-activity.service.ts:140` (tickets), `:316` (organizationPeople) · `core/settings/projects-retention-settings.service.ts:74,:116,:185` (projects) · `core/roadmap/projects-roadmap.service.ts:225` (projects) · `core/tickets/projects-tickets-read.query.ts:51` (tickets) · `entity/build-entity-action-helpers.ts:19` (projects) · `qa/test-runs.service.ts:422` (tickets).

  *Joins (10):* `approvals/approvals-read.service.ts:72` · `comment-drafts/comment-drafts.service.ts:53` · `core/due-sweep/build-due-sweep.service.ts:82,:98` · `core/project-crud/projects-query.service.ts:201` (projectTeams) · `core/project-crud/projects-search.service.ts:68` · `core/budget/projects-budget.service.ts:139` (tickets) · `core/tickets/projects-ticket-comments.service.ts:101` (organizationPeople) · `execution/timesheets.service.ts:401` · `execution/whiteboards.service.ts:211` — all on `projects` except where noted.

  **PATHS CORRECTED 2026-09-28:** four of the sites above were recorded at pre-split paths. `core/projects-activity.service.ts` → `core/activity/`, `core/projects-retention-settings.service.ts` → `core/settings/`, `core/build-due-sweep.service.ts` → `core/due-sweep/`, `core/projects-budget.service.ts` → `core/budget/`. The counts are unchanged: re-running `--list` and filtering on `modules/build/` returns **23 sites across 18 distinct files**, identical to the previous pass, so the figure is stable under concurrent sibling edits even though four of its paths were not.

  All 23 are source sites and out of this lane's write scope; routed to the orchestrator. Note `core/projects-retention-settings.service.ts` accounts for 3 of the 13 and is a *retention* service reading `projects` without a lifecycle predicate — that is the one worth looking at first, because a retention sweep that sees soft-deleted parents is the shape BE-54 warns about.

  **THE OUTBOX CLAUSE HAD NEVER BEEN MEASURED, AND IT FAILS ON ITS OWN.** Every previous pass measured soft delete, restore, retention and audit through `check:lifecycle-predicates` and left the box's fourth noun untested. Measured this lane. The outbox is a single shared table, `outbox_events` (`backend/src/db/schema/common/outbox.ts:29`); `grep -rn outbox src/db/schema/build/` returns nothing, so Build owns no outbox table. Build reaches the shared one through `OutboxWriter` at five production sites carrying exactly **three** aggregate types:

  | Aggregate type | Emit site (`src/modules/build/`) |
  |---|---|
  | `ticket` | `core/tickets/apply-ticket-change.ts:299` (type at `:302`) · `core/tickets/build-ticket-batch-workflow.ts:31,:36` |
  | `release` | `core/releases/projects-releases.service.ts:145` (type at `:148`) |
  | `project_webhook_delivery` | `core/webhooks/projects-webhooks-dispatch.service.ts:186` (`:191`), `:373` (`:376`) |

  Command: `grep -rn 'OutboxWriter.emit' src/modules/build --include=*.ts | grep -v spec` (5 hits) and `grep -rn 'aggregateType: "' src/modules/build --include=*.ts | grep -v spec` (5 hits, 3 distinct values). Every other `outbox` mention under `src/modules/build/` is in a `*.spec.ts`.

  Set that against the § Canonical entities table above, which has **15 entity rows**. Exactly **one** of them emits a domain event: WorkItem, as `ticket`. `release` and `project_webhook_delivery` are not rows in that table at all. Cycle, ManagedProduct, Portfolio/Program, Team, BuildMember, Goal, Form, IntakeSubmission, Risk/Decision/Approval/ChangeRequest, Incident, QA Case/Run/Result, SavedView and Project itself emit nothing. And this document's own § Migration order lists "Introduce audit/outbox fields before moving writers" as **step 7**, unstarted — so the box asks for behaviour the plan schedules for later.

  **That is the shortest route to the verdict, and it is independent of the lifecycle-predicate count:** outbox behaviour cannot be "specified for every mutable entity" while it exists for one canonical entity of fifteen and the plan still carries its introduction as a future step.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether this box requires a lifecycle spec for every mutable Build entity, or only for the entities that actually carry a lifecycle column.

  - **(A) Full audit.** Enumerate all Build tables lacking `deleted_at` and require a spec entry per table. Cost: the schema has 838 tables of which only 90 carry a lifecycle column at all, so most Build tables would get an entry saying "no lifecycle column, by design" — high volume, low signal, and it does not make the 23 live violations go away.
  - **(B) Accept core coverage.** `deletedAt`/`deletedByMembershipId` are verified present on tickets, projects, cycles, members, teams; governance/forms/QA/meetings deferred under BE-50's open question 2. Cost: zero now, but the 23 flagged sites stay red and the box can never be ticked honestly, so this is really a decision to leave the box open indefinitely.
  - **(C) Gate it — RECOMMENDED.** Fix the 23 Build-territory sites, then re-baseline. Cost: 23 query edits plus a baseline update (69 → whatever remains, 83 → likewise). This is the only option that both ticks the box and keeps it ticked, because `check:lifecycle-predicates` already runs on `modules/build/**` and ratchets.

  **DECISION RESOLVED 2026-09-28 — (C), scoped to the 90 lifecycle-bearing tables.** The criterion's verb is *specified*, so the specification reading governs; but a specification that 23 live reads contradict is not one any reader can rely on, which makes (C)'s repair a precondition rather than an alternative. (A) is rejected on the measurement it depends on: the gate reports `Tables 838 · with a lifecycle column 90`, so a per-table entry would be ~748 rows reading "no lifecycle column, by design" — exactly the high-volume, low-signal outcome the gate's own actionability assertion exists to prevent. (B) is rejected because it is a decision to leave the box open indefinitely. **(C) as scoped:** one lifecycle spec entry per lifecycle-bearing table, repair of the 23 Build-territory sites, then a baseline move from 69/83 to whatever remains.

  Resolving the decision does not tick the box, and the reasons are now three and separable: the 23 Build sites are unrepaired; the outbox clause fails on its own evidence above; and the gate cannot go green on Build action alone. The last of those is the out-of-lane part — the 2 stale ACCEPTED entries in `modules/gdpr/gdpr-subject-erasure-authored-content.ts` fail the gate independently of anything Build does, so a Build-only fix still leaves it red.

  **NOT A REQUIREMENT:** the 23 sites are defects awaiting repair, not sanctioned exemptions. The gate's own baselines (69/83) are the sanctioned-exemption record, and BE-50 says such a list may only shrink.
