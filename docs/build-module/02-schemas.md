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
- [ ] Every list has a measured composite index matching filters and cursor order.
  **NOT EARNED 2026-09-29 — production-shaped plans exist for the ticket list and the board only (`migrations/0575_ticket_list_sort_indexes.sql`, `1059_build_board_rank_sort_index.sql`); every other Build list is unmeasured, and no new plan can be taken from this checkout because every connection string here points at production. Earned by `EXPLAIN (ANALYZE, BUFFERS)` as the app role with the tenant GUC set, on a non-production database, for each remaining list.**

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

  **2026-09-28, third pass — STILL NOT EARNED. The named `package.json` defect is FIXED by this lane, one figure moved, and the recorded self-test evidence turns out to be false in a way that matters more than any of the numbers.**

  **THE DEFECT IS FIXED.** `backend/package.json` `db:check-read-budgets:build` named 6 of the 10 declared Build-scoped budget specs. It now names all 10 — `build-all-work`, `build-roadmap-list`, `build-feedback-list` and `build-changelog-list` have been added, in spec-declaration order. Verified:

  ```
  $ node -e "const p=require('./package.json'); const ids=p.scripts['db:check-read-budgets:build'].split('--ids=')[1].split(','); console.log(ids.length, ids.join(' '))"
  10 scoped-board-page my-work ticket-list-project ticket-org-assigned-to-me build-all-work build-roadmap-list build-org-project-health-summary build-resource-allocation build-feedback-list build-changelog-list
  ```

  So the Build alias now measures every Build ceiling that has been authored. **That closes the alias defect and does not close the box** — the coverage gap it sat inside is untouched.

  **FIGURE CORRECTED: 39 → 41 paginated Build list responses.** `grep -rhoE '@ResponseSchema\([a-zA-Z]*[Pp]age[A-Za-z]*\)' --include='*.controller.ts' src/modules/build | wc -l` → **41**. The spec total is unchanged at `grep -cE '^\s*id: "' src/scripts/read-cost-budgets.mjs` → **86**. So measured index coverage is now **10 of 41 Build lists (24%)**, down from 26% — not because anything regressed, but because two more Build lists gained a cursor envelope (one of them `GET /build/:projectId/automations`, see [`03-api-contracts.md`](./03-api-contracts.md) box 1) and neither carries a budget. **The denominator grows faster than the numerator, which is the shape of this box's real problem:** a list gains a page contract in an afternoon and a measured ceiling only with a fixture-shaped database.

  **THE RECORDED SELF-TEST EVIDENCE IS FALSE, AND THE HAZARD IS WORSE THAN THIS BOX HAS BEEN RECORDING.** Two previous entries quote `SELF-TEST PASS: all 6 breach types detected` and conclude that "the specs can be authored and their breach detection proven before any fixture exists". Run this lane, `backend/`, verbatim:

  ```
  $ node src/scripts/run-read-cost-budgets.mjs --self-test
  ◇ injected env (46) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
  RUNNER FAILED: PAM authentication failed for user "streamline_app"
  ```

  Then confirmed on disk rather than by a second run: `:317` reads `--self-test` into `SELF_TEST`, but the connection opens at `:359` and the connected role is queried at `:365-375`, **before any self-test branching**; the six synthetic breaching budgets are built at `:435-459` from a real base spec (`org-members-list`) and run as `EXPLAIN` against that same connection. **`--self-test` is the harness pointed at `.env`, not a dry run of it.** This lane's attempt failed at PAM authentication, so no `EXPLAIN` executed and no table was read — but it was a connection attempt to the production host and it must not be repeated. Note also that the env-injection count has moved from 61 to 46, which is a second reason not to trust a quoted figure from an earlier `.env`.

  **THE STANDING RULE HAS AN EXCEPTION HERE, AND IT SHOULD BE READ AS ONE.** The programme rule is to run a gate's `:self-test` before the gate, because a gate that resolves nothing reports zero vacuously. **That rule must not be applied to `db:check-read-budgets`.** For this one harness the self-test is a production connection, so the override has to be on the command line *for the self-test too*: `APP_DATABASE_URL='postgres://streamline_app:<pw>@127.0.0.1:5432/replay2' PGSSLMODE=disable node src/scripts/run-read-cost-budgets.mjs --self-test`.

  Everything else in the settling recipe stands: the unsuffixed alias for all 86 specs (or the now-complete `:build` alias for all 10 Build ones), an explicit `APP_DATABASE_URL` so the `.env` production value is overridden rather than inherited, `PGSSLMODE=disable` for a loopback target (`benchmark-role-guard.mjs:37-39`), the `streamline_app` non-BYPASSRLS role or the guard refuses, and a production-shaped fixture — on a zero-row database the planner picks a Seq Scan on every query and a run proves nothing. **31 of 41 Build lists still have no authored ceiling, so even a perfect fixture run settles 10 of 41 today.**

  **NOT A REQUIREMENT, unchanged:** the 31 unmeasured lists are unmeasured, not exempt. The alias repair means the Build gate no longer silently skips ceilings that were already written; it does not mean any Build list has been measured in this checkout, and none has.
- [x] Client and server validation constraints have automated parity evidence. `frontend/package.json:50` registers `check:contract-parity` which runs `scripts/check-contract-parity.mjs --backend-file contracts/openapi.json`; `check:contract-drift` at line 52 guards against in-flight drift. Per-entity schema tests live in `frontend/hooks/api/build/*-schema.test.ts`.
- [ ] Soft delete, restore, retention, audit, and outbox behavior is specified for every mutable entity.
  **NOT EARNED 2026-09-29 — ONE OF TWO CLAUSES SETTLED. The named defect is fixed: backend `629291664` puts `isNull(tickets.deletedAt)` into `listRelations`' shared `relatedTicketSelect`, so a soft-deleted ticket is no longer projected into the relations panel, and the same predicate went onto `addRelation`'s blocking-cycle `innerJoin`, which leaked the same way. Verified 2026-09-29 — `jest src/modules/build/core/tickets/projects-ticket-relations-soft-delete.spec.ts` (3 passed) — the three cases assert the rendered predicate on both relation endpoints, that a row whose endpoint the lateral dropped is not projected, and that the cycle scan joins only live tickets; reverting the fix in place killed all three (`Received: undefined`, `TypeError: Cannot destructure property 'assignee' of 'related' as it is null`, and the join SQL missing `"build"."tickets"."deleted_at" is null`). It proves those two reads filter the column; it does not prove *every* Build read does — `check:lifecycle-predicates` still reports 69 unfiltered primary reads and 88 unfiltered joins repository-wide, 1 and 5 above baseline, and those counts are byte-identical with and without this fix, so the overage is pre-existing and unattributed rather than cleared. **The second clause is untouched: retention, audit and outbox behaviour is still not named per mutable entity in this file.** Earned when that inventory is written and the lifecycle gate's Build share is at zero.**

  **2026-09-28 — one more unfiltered read found, while projecting the concurrency token onto
  relations.** `projects-ticket-relations.service.ts:97-110` (`listRelations`) filters only on
  `workItemRelations.orgId` and the two id columns. Neither the relation row nor the joined
  ticket is filtered on `tickets.deletedAt`, so a **soft-deleted** ticket still appears in the
  relations panel of every ticket that references it. Both FKs on `work_item_relations` are
  `ON DELETE CASCADE` (`ticket-core.ts:170-171`), so a *hard* delete removes the relation row and
  cannot leak — but a soft delete leaves the row intact and the `with:` join succeeds, which is
  exactly the BE-54 case where a soft-deleted parent never fires a child's cascade.

  Two consequences worth separating. The read is a BE-50 violation and shows retired work as live.
  Separately, the frontend contract declares `relatedTicket` **nullable** and carries a test named
  "still accepts a relation whose related ticket has been deleted (null relatedTicket)" — that
  state is unreachable under the cascade, so the test asserts a case that cannot occur. It is
  vacuous rather than wrong, and the backend's non-nullable declaration is the correct one.

  Not fixed here, because whether a relation to a soft-deleted ticket should vanish or render as
  a tombstone is a product decision, and the list is capped at 100 rows so post-filtering would
  silently shrink pages. Naming it rather than guessing.

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

  **2026-09-28, third pass — STILL NOT EARNED. Gate re-run by this lane; every figure reproduces, three line numbers drifted again, and the (C) repair is explicitly NOT attempted here for a reason this entry records rather than a deadline it misses.**

  Gate run, `backend/`, verbatim, self-test first:

  ```
  $ node src/scripts/check-lifecycle-predicates.mjs --self-test
    FAIL: the three-way filter keeps the primary-read candidate set actionable — a gate that flags hundreds gets switched off (found 75)
  check-lifecycle-predicates self-tests: 1 failed, 21 passed

  $ node src/scripts/check-lifecycle-predicates.mjs
  Tables 838  ·  with a lifecycle column 90  ·  read sites 2218 across 5161 files
    predicate in statement 1003  ·  built elsewhere in file 327  ·  dormant column 125  ·  primary-read candidates 75  ·  join candidates 94
  FAIL — 2 stale ACCEPTED entry(ies); the read is no longer a candidate. Remove them:
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbSources  (erasure deliberately sweeps deleted rows (report 06))
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbPages  (erasure deliberately sweeps deleted rows (report 06))
  FAIL — 75 primary reads of a lifecycle table carry no predicate, 6 above the recorded baseline of 69. Run with --list.
  FAIL — 94 joins onto a lifecycle table carry no predicate, 11 above the recorded baseline of 83. …
  ```

  **75 / 94 / 69 / 83 and the two stale gdpr entries all reproduce exactly.** The scanned surface grew (2208 → 2218 read sites, 5159 → 5161 files; `predicate in statement` 1005 → 1003, `built elsewhere in file` 321 → 327) without moving any of the four numbers the gate fails on — a peer lane's edits shifting reads between the two "has a predicate" buckets. The self-test's single red assertion is still the gate reporting on itself at 75, the same fact as the first FAIL rather than a second one.

  **BUILD-TERRITORY FIGURE HOLDS AT 23 SITES ACROSS 18 FILES, for the third consecutive pass.** `--list | grep -oE "modules/build/[^ :]+:[0-9]+" | sort -u | wc -l` → **23**; the same filtered on filename → **18**. **THREE LINE NUMBERS DRIFTED AGAIN** under concurrent sibling edits, and the previous pass's warning about exactly this is now a pattern rather than an anecdote: `core/project-crud/projects-query.service.ts` **:201 → :253** · `core/roadmap/projects-roadmap.service.ts` **:225 → :287** · `core/tickets/projects-tickets-read.query.ts` **:51 → :53**. The other twenty are byte-identical to the previous pass. **Treat every line number in this entry as re-derivable, never as a citation** — the file names and the count are the stable part.

  **THE (C) REPAIR WAS NOT ATTEMPTED BY THIS LANE, AND THAT IS A DECISION, NOT AN OMISSION.** Roughly twenty of the 23 sit outside the five peer lanes' territories and were technically editable here. They were left alone on three grounds, in order of weight:

  1. **Each repair is a product decision, not a mechanical filter, and the entry above already proved it on its own example.** It declined to fix `listRelations` because "whether a relation to a soft-deleted ticket should vanish or render as a tombstone is a product decision", and because the list is capped at 100 rows so post-filtering would silently shrink pages. That reasoning generalises to most of the twenty. `core/activity/projects-activity.service.ts:140` reading `tickets` is an activity feed — hiding a soft-deleted ticket's history is a different product than showing it struck through. `qa/test-runs.service.ts:422` reading `tickets` is a QA result set; dropping a retired defect silently changes a run's pass rate. Adding `isNull(deletedAt)` to twenty live reads on a judgement-free sweep is the kind of change that is small in diff and large in behaviour.
  2. **It cannot green the gate.** The two stale `ACCEPTED` entries in `modules/gdpr/gdpr-subject-erasure-authored-content.ts` fail this gate independently of anything Build does, and that file is out of lane. A Build-only repair leaves the gate red, so the repair buys no gate evidence.
  3. **The outbox clause fails on its own regardless**, and it is the shorter route to the verdict — see below.

  **THE OUTBOX CLAUSE, RE-MEASURED, AND IT HAS NOT MOVED.** Build still owns **no outbox table** (`grep -rn outbox src/db/schema/build/` → **0** hits; the shared table is `outbox_events`, `src/db/schema/common/outbox.ts:29`). It reaches the shared one through `OutboxWriter` at **5** production sites carrying **3** aggregate types, re-derived this lane:

  | Aggregate type | Emit site |
  |---|---|
  | `ticket` | `core/tickets/apply-ticket-change.ts:302` · `core/tickets/build-ticket-batch-workflow.ts:31` |
  | `release` | `core/releases/projects-releases.service.ts:169` |
  | `project_webhook_delivery` | `core/webhooks/projects-webhooks-dispatch.service.ts:191`, `:376` |

  `grep -rn 'OutboxWriter.emit' --include='*.ts' src/modules/build | grep -v spec | wc -l` → **5**; `grep -rn 'aggregateType: "' --include='*.ts' src/modules/build | grep -v spec` → 5 hits, 3 distinct values. Two line numbers moved (`releases` :145/:148 → :169, `webhooks` :186/:191 → :191 and :373/:376 → :376); the substance is identical. Set against the **15 entity rows** in § Canonical entities: exactly **one** of them emits a domain event. `release` and `project_webhook_delivery` are not rows in that table at all. And this document's § Migration order still carries "Introduce audit/outbox fields before moving writers" as step 7, unstarted.

  **THAT REMAINS THE SHORTEST ROUTE TO THE VERDICT, and it is independent of every count above:** outbox behaviour cannot be "specified for every mutable entity" while it exists for one canonical entity of fifteen and the plan still schedules its introduction as future work.

  **DECISION (C) as scoped stands unchanged** — one lifecycle spec entry per lifecycle-bearing table, repair of the 23 Build sites, then a baseline move from 69/83. What this pass adds is that the repair's cost was mis-stated as "23 query edits": it is 23 product judgements, of which the entry above made one (`listRelations`, deferred) and this one makes none. **SETTLES WHEN** each of the 23 has a recorded answer to "should this read see retired rows?", the ones answered *no* are fixed, the baselines move, the 2 gdpr entries are cleared by their owner, and the outbox clause has an implementation rather than a step 7.

  **NOT A REQUIREMENT, unchanged:** the 23 are defects awaiting a judgement and then a repair, not sanctioned exemptions. The 69/83 baselines are the sanctioned-exemption record and under BE-50 they may only shrink.

  **2026-09-28, fourth pass — THE SWEEP IS DONE, SITE BY SITE. All 23 judged individually, 11 repaired, 10 ruled correct-as-written and recorded in the gate itself, 2 read but not edited. Build sites fall 23 → 10 and the gate's primary ratchet moves 75 → 68. The box stays unchecked, and the table below is what it has instead of a tick.**

  **THE RULE APPLIED, stated first so the 23 judgements are legible as one decision rather than 23 opinions.** A read gets a lifecycle predicate when it produces something the user is **invited to act on** — a worklist, an inbox, a search result, a notification, a membership set, an authorization decision. A read must **not** get one when it produces a **number allocation** (a reused identifier collides with a restorable row), a **financial or effort aggregate** (money and hours already spent do not un-spend), or an **audit/activity record** (filtering loses the trail of the deletion itself). A **display-only left join supplying a label** must not get one either: filtering blanks the label instead of removing the row, which is the gate's own stated reason for excluding identity tables.

  ### The 23, one row each

  | # | Site | Table | Emits? | Judgement | Correct behaviour |
  |---|---|---|---|---|---|
  | 1 | `agent-pulse/agent-pulse.service.ts` overdue-approval, product branch | `projectApprovals` | no | **DEFECT — fixed** | a soft-deleted approval must not surface as an overdue nudge; predicate added to the shared `actorCond`, which both branches pass through |
  | 2 | same, unscoped branch | `projectApprovals` | no | **DEFECT — fixed by the same edit** | as above |
  | 3 | `core/due-sweep/build-due-sweep.service.ts:82` due-soon | `projects` (join) | **yes — notification** | **DEFECT — fixed** | `tickets.deletedAt` was filtered, the project join was not, so a live ticket in a retired project produced a notification. The sharpest of the 23: a child emitting on a retired parent is BE-54's shape |
  | 4 | same `:98` overdue | `projects` (join) | **yes — notification** | **DEFECT — fixed** | as above |
  | 5 | `approvals/approvals-read.service.ts:72` org approvals inbox | `projects` (join) | no | **DEFECT — fixed** | a pending approval on a soft-deleted project was decidable from the inbox |
  | 6 | `core/project-crud/projects-search.service.ts:68` ticket search | `projects` (join) | no | **DEFECT — fixed** | search returned live work inside retired projects |
  | 7 | `execution/whiteboards.service.ts:211` `listAllWhiteboards` | `projects` (join) | no | **DEFECT — fixed** | org-wide list the user opens; board's own `deletedAt` was filtered, its project's was not |
  | 8 | `core/roadmap/projects-roadmap.service.ts:287` managed-product filter | `projects` (subquery) | no | **DEFECT — fixed** | outer query filtered `roadmapItems.deletedAt`; the project id subquery did not, so a retired project's roadmap items surfaced under the product |
  | 9 | `core/project-crud/projects-query.service.ts:253` team-name rollup | `projectTeams` (join) | no | **DEFECT — fixed** | produces a **set** of team names per project, so a deleted team is a wrong set, not a blanked label |
  | 10 | `entity/build-entity-action-helpers.ts:19` `isProjectMember` | `projects` | no | **DEFECT — fixed** | gates `build-entity-ticket-create.ts:27` and `build-entity.actions.ts:73`, so it authorised writing a **new live ticket into a soft-deleted project** |
  | 11 | `core/settings/projects-retention-settings.service.ts` `updateRetentionPolicy` | `projects` | no | **DEFECT — fixed** | configuring retention on a project that is itself retired is meaningless config drift; restoring the project restores the ability to edit |
  | 12 | same file, `getSettings` | `projects` | no | **DELIBERATE** | a soft-deleted project's policy stays inspectable so an operator can see what applies before a restore — the surveys precedent already in `ACCEPTED` ("an archived survey must stay inspectable to be restored") |
  | 13 | same file, `setLegalHold` | `projects` | no | **DELIBERATE, and the asymmetry with #11 is the judgement** | a legal hold **must** be placeable on a soft-deleted project: suspending a purge is exactly what a hold is for, and refusing it could destroy evidence |
  | 14 | `client-portal/change-request-number-counter.ts:13` | `changeRequests` | no | **DELIBERATE** | `MAX(cr_number)` must see soft-deleted rows or a restored CR collides with a reissued number and the audit trail breaks |
  | 15 | `qa/test-runs.service.ts:422` | `tickets` | no | **DELIBERATE** | `MAX(ticket_number)` under an advisory lock, same class. This is the **correct** shape of an allocator and is the contrast case for #16 |
  | 16 | `core/project-crud/projects-templates.service.ts:232` | `tickets` | no | **DELIBERATE** | allocator on a project created in the same transaction, so the count is always zero. See the separate defect note below — it uses `count()` where #15 uses `MAX()`, and it omits `orgId` |
  | 17 | `core/activity/projects-activity.service.ts:140` `resolveTicketProjectId` | `tickets` | records audit | **DELIBERATE** | resolves a ticket's project in order to **write** its activity row; filtering would return null and silently drop the audit trail of the deletion itself |
  | 18 | same `:316` author display names | `organizationPeople` | no | **DELIBERATE** | filtering blanks the name on every record a departed colleague touched — verbatim the gate's own reason for excluding identity tables |
  | 19 | `core/budget/projects-budget.service.ts:139` billable cost rollup | `tickets` (join) | no | **DELIBERATE** | money already spent does not un-spend when a ticket is retired; filtering would understate actuals and break reconciliation against Accounting |
  | 20 | `execution/timesheets.service.ts:401` per-project hours | `projects` (join) | no | **DELIBERATE** | same reasoning as #19: excluding retired projects makes per-project hours stop summing to the org total |
  | 21 | `comment-drafts/comment-drafts.service.ts:53` | `projects` (leftJoin) | no | **DELIBERATE** | supplies `projectKey`/`projectName` only; filtering blanks the label rather than removing the row. If a draft on a retired project should vanish, the predicate belongs in the `where`, and that is a product question |
  | 22 | `core/tickets/projects-tickets-read.query.ts:53` | `tickets` | no | **DELIBERATE — read, not edited** (`core/tickets/**` is a peer lane's) | `queryTickets(db, where, orderBy, limit)` takes its `where` **from the caller** and cannot carry a predicate without breaking its contract. Structurally invisible to this gate, which is a real weakness: a caller that forgets the predicate is not detectable here |
  | 23 | `core/tickets/projects-ticket-comments.service.ts:101` | `organizationPeople` (leftJoin) | no | **DELIBERATE — read, not edited** (peer lane's) | comment-author display join, same class as #18 |

  **WHERE THE JUDGEMENTS NOW LIVE.** All ten deliberate rulings are recorded in the gate's own `ACCEPTED` list in `src/scripts/check-lifecycle-predicates.mjs`, each with its reason, so the judgement sits next to the rule rather than only in this document — and a stale entry fails the gate, so a ruling cannot outlive the read it describes. That required one gate repair: `ACCEPTED`'s stale check iterated **only** `candidates` (primary reads), so an entry for a **join** was always reported stale and could never be recorded. It now iterates `[...candidates, ...joinCandidates]`. Note what `ACCEPTED` does **not** do: it is documentary, and does not remove a site from either count — so nothing below is hidden by it.

  **GATE MOVEMENT, verbatim, `backend/`, self-test first:**

  ```
  $ node src/scripts/check-lifecycle-predicates.mjs --self-test
  check-lifecycle-predicates self-tests: 22 passed

  $ node src/scripts/check-lifecycle-predicates.mjs
  Tables 838  ·  with a lifecycle column 90  ·  read sites 2219 across 5161 files
    predicate in statement 1012  ·  built elsewhere in file 332  ·  dormant column 125  ·  primary-read candidates 68  ·  join candidates 88
  FAIL — 2 stale ACCEPTED entry(ies); the read is no longer a candidate. Remove them:
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbSources  (erasure deliberately sweeps deleted rows (report 06))
    modules/gdpr/gdpr-subject-erasure-authored-content.ts::kbPages  (erasure deliberately sweeps deleted rows (report 06))
  FAIL — 88 joins onto a lifecycle table carry no predicate, 5 above the recorded baseline of 83.
  ```

  **The self-test now passes 22 of 22.** Its one previously-failing assertion was its own actionability guard — "the three-way filter keeps the primary-read candidate set actionable … (found 75)" — and at 68 it holds. That assertion and the old primary FAIL were the same fact, and both are gone.

  Primary candidates **75 → 68**, and the baseline is lowered 69 → 68 in the same change to hold the gain, per the gate's own "it may only go down". Joins **94 → 88**, which is exactly the six join repairs above; 88 is still 5 over the baseline of 83, and **none of those 5 is Build's** — Build's remaining four join sites are #19, #20, #21, #23, all recorded deliberate. Build cannot lower the join baseline alone.

  **HONEST NOTE ON THE COUNT: 11 edits cleared 13 flagged sites, and the extra two are gate leniency, not repairs.** The gate's second-chance verdict is `OK-FILE`, "predicate built elsewhere in file", which rose 327 → 332. Adding the predicate to `updateRetentionPolicy` reclassified the *other two* reads in `projects-retention-settings.service.ts` — #12 and #13 — as satisfied-by-file, so they vanished from the list while remaining unfiltered in source. **That is correct behaviour by my judgement and silence by the gate's, and the two are not the same thing.** Rows #12 and #13 are recorded above precisely so the ruling survives the gate no longer asking.

  **AN ADJACENT DEFECT FOUND WHILE JUDGING #16, reported rather than fixed.** `projects-templates.service.ts:229-232` allocates `ticketNumber` with `count(tickets.id)` where `qa/test-runs.service.ts:420-423` correctly uses `COALESCE(MAX(ticket_number), 0)`, and the templates read filters **`projectId` only, with no `orgId`**. Both are harmless today because the project is created in the same transaction so the result is always zero — but the shape is a collision waiting for a caller that applies a template to an existing project, and the missing tenant predicate is a BE-01 gap. Routed rather than changed: altering number allocation is a data-integrity change that wants its own ticket. Separately, `approvals-read.service.ts:72`'s join carries **no `orgId` predicate** either (it relies on RLS and the approval's own org condition); only the lifecycle predicate was added there, to keep the diff on-topic.

  **2026-09-28, fifth pass — BOTH TENANCY DEFECTS ARE NOW FIXED, and two claims in the paragraph above are corrected by the work.**

  **`approvals-read.service.ts` — the join now pairs the tenant column.** `getInbox`'s `projects` join is `and(eq(projects.orgId, orgId), eq(projects.id, projectApprovals.projectId), isNull(projects.deletedAt))`. Swept the rest of the file as asked: it holds **exactly two queries**, and the other one, `listApprovals`, already carries `eq(projectApprovals.orgId, orgId)` on a plain `from()` and needed nothing. There is no third join.

  **SEVERITY CORRECTED — it was not a cross-tenant leak, and the new spec does not claim one.** `projects.id` is `integer("id").primaryKey().generatedAlwaysAsIdentity()` (`src/db/schema/build/core.ts:32`) — a **global** identity, so an id resolves to exactly one project in exactly one org and the unfiltered join could not select another tenant's row. `projects` is also under RLS. What the missing predicate actually cost: the query's correctness rested on a global-uniqueness invariant two tables away rather than on the query itself, and it joined on the PK rather than the `uniq_projects_org_id` composite (`core.ts:63`) that `fk_project_approvals_org_project` already pairs on. This repo already has a file that names exactly this class and refuses to overstate it — `src/modules/build/core/build-cross-tenant-lookup.spec.ts`, whose docblock reads "Neither missing predicate was an exploitable cross-tenant read, and this file should not be read as claiming one … What they were is *unstated* — correctness resting on an invariant two tables away rather than on the query, which is the shape that becomes a leak the first time a caller passes ids from somewhere less constrained." That is the right reading here too.

  **A CONSEQUENCE FOR THE TEST THAT WAS ASKED FOR, and it is worth stating plainly.** The requested shape was a test that fails without the predicate by seeding a row from a second org. **That test cannot be written for this join**: `projects.id` is globally unique, so no second-org row with a colliding id can exist, and a spec that appeared to prove tenancy by seeding one would be proving nothing — the fixture would have to invent a collision the schema forbids. So `approvals-read-tenant-isolation.spec.ts` follows the house pattern instead and asserts on the **join condition's bound values and columns**, which is a real discriminating assertion: **two of its four cases fail when the predicate is removed**, verified by reverting it in a scratch copy. Verbatim:

  ```
  $ nice -n 10 npx jest --maxWorkers=2 src/modules/build/approvals/approvals-read-tenant-isolation.spec.ts
  ✓ binds the caller's organisation into the projects join, so the join does not rest on projects.id being globally unique
  ✓ pairs the tenant column with the id it joins on, which is the composite the project FK already uses
  ✓ still excludes a soft-deleted project, so a retired parent's approval stays out of the inbox
  ✓ does not reach a second organisation's value, so the bound list is the caller's org alone
  Tests: 4 passed

  (with eq(projects.orgId, orgId) reverted)
  ✕ binds the caller's organisation into the projects join …
  ✕ pairs the tenant column with the id it joins on …
  Tests: 2 failed, 2 passed
  ```

  **`projects-templates.service.ts` — the allocation is now `COALESCE(MAX(ticket_number), 0)` with `eq(tickets.orgId, orgId)`**, matching `qa/test-runs.service.ts:420`. Two corrections to the paragraph above, both from actually reading the caller:

  1. **"a collision waiting for a caller that applies a template to an existing project" — no such caller can exist.** `applyTemplate` takes `(orgId, userId, templateId, input)` and **always inserts a new project** (`:200-212`); there is no parameter for a target project. The path is unreachable **by construction**, not by luck. The defect is that the arithmetic is wrong, not that a caller is one argument away — which lowers the urgency and does not change the fix.
  2. **"a soft-deleted row makes it collide silently" was wrong, and the truth is sharper.** A soft-deleted row is still a row, so `count()` is unaffected by soft deletion; what breaks `count()` is a **hard** delete or any gap in the sequence. The real soft-delete hazard runs the other way: **`count()` is only correct while it deliberately omits a lifecycle predicate.** Row #16 was judged "deliberate" for exactly that reason — and it means the obvious BE-50 repair, adding `isNull(tickets.deletedAt)` to that count, would have dropped the count below the highest number issued and started **reissuing live ticket numbers**. `MAX(ticket_number)` is correct with or without the predicate, so the fix removes the trap rather than documenting it. **This is the clearest vindication in the sweep of judging site by site: the mechanical lifecycle fix on row #16 would have created a data-integrity bug.**

  Five cases in `projects-templates-ticket-number.spec.ts`. Two discriminate — the org predicate and the MAX-not-COUNT projection — and fail when the old implementation is restored; three pin the arithmetic on an empty project, on a project already holding tickets, and on a sequence whose highest number exceeds its row count. Which cases discriminate is recorded because the other three pass against both implementations: they test the arithmetic, not the SQL, and citing them as proof of the fix would be the "specs that agree with the bug" failure.

  ```
  $ nice -n 10 npx jest --maxWorkers=2 src/modules/build/core/project-crud
  Test Suites: 17 passed, 17 total
  Tests:       87 passed, 87 total
  ```

  **Row #16's judgement is unchanged and is now safer.** The allocator still deliberately sees soft-deleted rows — `MAX(ticket_number)` over every row, live or retired, is what prevents a retired number being reissued — so its `ACCEPTED` entry stands. What changed is that it is no longer one careless edit away from a collision.

  **A GATE-SCOPE WANT, not taken.** `organization_people` behaves exactly like the four tables in `GLOBAL_IDENTITY_TABLES` (`users`, `organizations`, `accounts`, `sessions`) — rows #18 and #23 are display joins whose filtering would blank a departed colleague's name, which is the gate's own printed justification for that exclusion. Adding it would be correct **and** would silently lower candidate counts across every module, so it is an exclusion-widening change and this lane did not make it. Routed as a decision.

  **THE OUTBOX CLAUSE IS UNCHANGED AND STILL FAILS ON ITS OWN.** Re-measured this lane: 5 `OutboxWriter.emit` sites under `src/modules/build`, **3** distinct aggregate types (`ticket`, `release`, `project_webhook_delivery`), and Build owns no outbox table. Of the **15** rows in § Canonical entities, exactly **one** emits — WorkItem, as `ticket`. The `Emits?` column above is the per-site form of the same fact: only the two due-sweep rows emit anything at all, and what they emit is a notification, not a domain event. Audit coverage is patchy on the same surfaces — `grep -rl "audit\."` finds no audit call under `comment-drafts/`, `core/budget/`, `core/roadmap/`, `core/settings/`, `execution/` or `agent-pulse/`. And § Migration order still carries "Introduce audit/outbox fields before moving writers" as **step 7**, unstarted.

  **WHY THE BOX IS STILL UNCHECKED, in one sentence per noun.** *Soft delete* — specified for all 23 reads, and now enforced at 11 of them. *Restore* — the judgements at #12 and #14 turn on restore semantics and are recorded, but no entity has a specified restore path. *Retention* — specified in a contract and enforced nowhere (the only Build retention job prunes `webhookDeliveries` on a hard-coded 90 days), which is also a silent answer to open question 10. *Audit* — present on some surfaces, absent on six named directories. *Outbox* — one canonical entity of fifteen, with its introduction still scheduled as a future step. **The criterion asks for all five, "for every mutable entity". The table above is the specification for the soft-delete clause across this lane's read surface, and it is the artifact this box has instead of a tick; the other four clauses are not specified and one of them is scheduled for later, so ticking would be a claim about four nouns this pass did not earn.**

  **SETTLES WHEN** retention has an enforcing job or the contract is narrowed to what exists, audit covers the six named directories, and the outbox's step 7 lands for the remaining fourteen canonical entities. The 2 stale gdpr `ACCEPTED` entries fail this gate independently of all of that and belong to their owner; they are left in place and named rather than removed, because removing another lane's judgement is not this lane's call.

  **NOT A REQUIREMENT:** the ten deliberate rulings above are judgements with stated reasons, re-checkable against their reads and failing the gate if the read changes shape — not exemptions. The 68/83 baselines remain the sanctioned-exemption record and under BE-50 may only shrink.
