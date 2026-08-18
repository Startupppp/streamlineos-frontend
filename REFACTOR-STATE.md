# REFACTOR-STATE

> Concurrent programs keep separate trackers. CRM lives in `REFACTOR-STATE-CRM.md`. This file is Build only.

**Module:** Build (all four areas — PM core, time/capacity, product management, reporting/portfolio)
**Phase:** Phase 0 complete; six fix batches + approved Phase 1 (SCH-001, SCH-002) landed.
**Status:** All user-listed flows verified over HTTP against the running API — create project, create ticket, change status, assign, AI suggest-title, AI improve-description. AI is plan-gated (needs PROFESSIONAL; orgs are STARTER). Remaining approved work: build + build_events schema split.
**Updated:** 2026-08-11

## Closed this session (see `docs/refactor/build-changelog.md`)

| ID | What | Verified |
|---|---|---|
| SEC-002 | Ticket list now applies DataScope in SQL; `none` short-circuits; COUNT uses the same predicate | BE tsc 0 |
| API-002/007 | `idx_tickets_org_project_order`, `idx_tickets_org_assignee_status`, partial `idx_tickets_org_assignee_due_open`; dropped non-org-led `idx_tickets_assignee` | **Board 3,345→55 blocks; My Work 11,477→53 blocks** |
| API-001 | Board hook → `useInfiniteQuery`, real envelope, `isTruncated` exposed, sequential not 5-way burst | FE tsc 0 (partial — see below) |
| TIME-001/002 | `projectId` + `timesheetPeriodId` now written, insert+period in one txn; `recomputeTimeSpent` org-scoped | BE tsc 0 |
| SCH-003b | `epicId` cycle guard added, silent 100-hop escape fixed, blocking-edge cycle detection added | BE tsc 0 |
| UI-001 | All 9 workspace routes de-re-exported; 5 inline page components extracted to `features/` (max 452 lines) | FE tsc 0, zero `…/page` imports remain |
| TIME-003 | `listTimeEntries` filtered by project *after* pagination → SQL predicate | BE tsc 0 |

### Batch 2 — sub-domain sweep

| ID | What |
|---|---|
| **PM-005** | `roadmapItems.isPublic` defaulted **true** — every item was on the public feed by default. Now `false`; migration `0127` applied and verified. 0 existing rows, so no backfill decision needed |
| **PM-006** | 3 public roadmap endpoints had no rate limiting. Guards added **and** the three `TIERS` entries registered — without them `RateLimitService` fails open and the guard is a no-op |
| **BE-001** | Approvals notification fired on a committed ALS handle (`42501`, silently swallowed). Now `registerAfterCommit` + `runInNewTenantTransaction`, failures logged |
| BE-010/011/012 | 3 non-transactional FK-nullify-then-delete pairs wrapped in transactions |
| BE-018 / BE-015 | `updateIntake` gained `pg_advisory_xact_lock` (duplicate ticket numbers) + explicit `orgId` on all writes |
| BE-013 | Meetings filtered after pagination → correlated `EXISTS` in the WHERE. **Third instance of this defect class** (see TIME-003) |
| BE-002/016 | QA `caseIds` accepted unvalidated → cross-**project** test-case injection (RLS blocks cross-tenant only). Now validated |
| BE-003..009,014,017 | 9 unbounded reads capped; `teamTimesheets` `limit:500` → real `page`/`limit` pagination |
| PM-010 | 3 roadmap hooks ungated against `build:roadmap:view` → 403 spam. Now `enabled: useCan(...)` |
| Nav/routes | `/build/page.tsx` still re-exported `./all/page` (**my batch-1 grep missed same-dir paths**); module mislabelled "Product Management" vs §16 "Build"; deleted 2 banned legacy redirect routes |

**Verification:** backend `pnpm typecheck` exit 0 / 0 errors; frontend `pnpm type-check` exit 0 /
0 errors. Exit codes checked directly, not through a pipe. Migrations `0126` + `0127` applied and
verified against the DB. Lint and tests NOT run (not requested).

**Standing footgun found:** `RateLimitService.check()` does `if (!TIERS[tier]) return { allowed: true }`
— a `@UseRateLimit("key")` with no `TIERS` entry looks protected in review and silently isn't.

### Batch 9 — temporal types, aggregates, PM schema

| ID | What | Verified |
|---|---|---|
| **API-008** | Portfolio rollup reads `project_daily_snapshots` instead of recomputing | **142.8ms/1,478 → 0.64ms/364 blocks (~190×)**, 36 real rows. I populated the snapshot table first — a snapshot-backed query against an EMPTY table would have reported a fake win |
| **API-005** | Assessed, **left as-is with evidence** — 37 blocks on an `Index Only Scan`; not worth complicating | measured |
| **SCH-007** | `tickets.created_at`/`updated_at` → `timestamptz` with an explicit `AT TIME ZONE 'UTC'`. Sprint bounds left `timestamp` — narrowing loses the time component irreversibly | migration `0158` |
| **SCH-008** | Canonical estimate column designated; **no column dropped** (irreversible) | — |
| **PM-001/002/003/013** | CRM linkage on feedback, RICE **inputs** (not a computed score), `managed_product_releases`, product linkage on feedback widgets | 4/4 RICE columns; all 5 new FKs `convalidated = true`; 204k tickets / 500k comments intact |

**Pass 3 caught two more regressions here:** the list `COUNT(*)` went 37 → 3,340 blocks and `ANALYZE`
did **not** fix it — a rewrite also empties the visibility map, downgrading `Index Only Scan` to
`Index Scan`; only `VACUUM` restores it. And the comment thread went 5 → 13,520 blocks, the same
partial-index-predicate trap, in the harness only — the app query was always fine.

### Batch 8 — reproducibility, billing, soft delete

| ID | What | Verified |
|---|---|---|
| **RPT-001** | Append-only `sprint_scope_events` (migration `0156`) — pgEnum type, org-led composite index, no `updated_at`/soft-delete | Backfill first returned 0 rows because my seed never set `sprint_id`; I fixed the seed, assigned 200,000 tickets to sprints, re-ran → **200,000 events**, point-in-time reconstruction verified |
| **TIME-004** | Rates snapshotted at **approval** (B-19), the point the entry becomes immutable. `billing.service.ts` prefers the stored rate, falls back to live resolution only for pre-change entries | No figure invented — 0 invoices ever issued |
| **SCH-006c** | Soft delete for `roadmap_items`, `feedback_posts`, `okr_goals` (migration `0155`) | The `@Public()` roadmap feed filters deleted items — republishing a deleted item to the internet would be worse than an internal leak |

**Not mine (now resolved):** `nest build` briefly failed on 1 error in
`inventory/products/inv-products.controller.ts` — unstaged WIP from the concurrent Inventory program.
That session has since finished; `nest build` is exit 0 again.

### Batch 7 — scheduling + soft delete

| ID | What | Verified |
|---|---|---|
| **RPT-002** | Daily snapshot sweep at `GET/POST /cron/build-daily-snapshots`. **I had wrongly called this blocked** — `@nestjs/schedule` is absent but HTTP cron controllers already exist (`@Public()` + `assertCronSecret` + `forEachOrg`). Caps 200 projects/org with overflow **logged, not silently truncated** | `pnpm build` exit 0 — needed because I had to add the missing `ProjectsReportsService` export, without which NestJS throws at **runtime** while typecheck passes |
| **SCH-006b** | Soft delete for `projects`, `sprints`, `ticket_comments`. `deleteProject` stamps children in ONE transaction, closing §19's orphaned-but-visible cascade hazard | 92 `isNull` filters across 50+ files; 5 partial indexes incl. `uniq_projects_org_key` so a deleted project releases its key; 64 projects intact |

**Unblocked by RPT-002:** API-005 and API-008 — the maintained aggregate now exists.

### Batch 6 — approved Phase 1 work

| ID | What | Verified |
|---|---|---|
| **SCH-001** | **Ranking, the headline Phase 1 item.** `tickets.order` (integer) → `tickets.rank` (`numeric`), server-authoritative. A drag now sends two neighbour ids and updates **one row**, instead of the client renumbering both columns and the server writing them all via `CASE`. Design in `docs/refactor/sch-001-ranking-design.md` | 0 ordering violations across 200k tickets; ranks exact multiples of 1000; 30 successive midpoints still strictly between neighbours at 13 dp; board **54 blocks** vs 55 before |
| **SCH-009** | 17 timesheets enums applied (migration `0143`), 18 columns converted | 150,150 rows intact, 0 nulls; `timesheet_exceptions.status` correctly left as `text` |

**Blocker found before writing the enum SQL:** my own seed had written `'DRAFT'`/`'SUBMITTED'` into
`timesheets.status` (75,075 rows), values absent from `timesheet_entry_status`, so the `USING` cast
would have failed. Fixed the seed script and normalised the rows first.

**Debt this created:** `generate --custom` copies the previous snapshot rather than diffing, so
`migrations/meta` is now behind reality. DB and migration files are right; Drizzle's model isn't.
Resync instructions are in `PAGES.md`.

### Batch 5 — pagination envelopes + measurement-driven triage

| ID | What | Verified |
|---|---|---|
| **PM-008/009** | 4 list endpoints returned bare arrays (callers couldn't detect truncation). Portfolios had no `page`/`offset` at all, just a hardcoded `.limit(100)`. All four now return `{data, pagination}` with a parallel `COUNT`; frontend hooks + all 4 surfaces wired to the shared `TablePagination` | Both repos 0 errors; all **7** consumer call sites updated; the new `useCan("build:portfolios:view")` confirmed a real key in **both** catalogs |
| **API-009** | Escalated out of Build — see "Blocked" below. Not a code fix | measured across roles |
| **API-003** | **Downgraded P1 → P3 on measurement.** Offset 0 = 0.43ms/108 blocks; offset 400 (the board's real ceiling) = 1.05ms/508. Offset 3000 is unreachable in the app. Keyset would break the `page`/`limit` contract for ~0.6ms — **deliberately not done** | depth sweep 0→3000 |
| Harness | `pnpm -C backend seed:build-load` and `baseline:build` added so the seed and EXPLAIN capture are discoverable | both run |

### Batch 4 — remaining security/integrity findings

| ID | What | Verified |
|---|---|---|
| **API-012** | My batch-1 regression closed. Benchmarked 6 shapes; shipped a 2-branch UNION (per-branch `LIMIT = offset+limit`, `UNION` not `UNION ALL`). **49.31ms/2,914 → 1.20ms/354** | Partition unchanged 2,858/476/3,334 **and** page-1 id sequence byte-identical, both re-checked by me |
| **SEC-001** | Public whiteboard: TOCTOU between the token SELECT and the UPDATE (admin could revoke sharing mid-window and the write still landed) → UPDATE now re-asserts all 4 sharing conditions atomically; GET fetched `orgId`/`projectId`/`createdBy`/`shareToken` before projecting → explicit `columns`. Expiry, rotation, allowlisted write, rate tiers and RLS `WITH CHECK` were all already correct | BE tsc 0 |
| **PM-007** | `voterIpHash` (HMAC) + partial unique indexes, migration `0137`. **I had to wire the controller myself** — the agent left `voterIp` unpassed, so the whole binding was inert — and replace an empty-string HMAC key with the startup-validated `BACKEND_JWT_SECRET` | BE tsc 0 |
| **PM-012** | Owner FK `restrict` → `set null` (column confirmed nullable) so member removal stops 500ing | BE tsc 0 |
| API-008 | **Analysed, deliberately not fixed** — plan already index-optimal; real fix is a materialised aggregate, blocked on RPT-002 (no scheduler) | measured |

### Batch 3 — §9 file splits

All three oversized Build files split; **no Build file in either repo now exceeds 500 lines**.
`tasks.ts` 607 → barrel + 4 schema files (zero pgTable renames, verified all 43 tables still present
in the live DB); `iterations.service.ts` 533 → barrel + 4 single-class services;
`projects-tickets.controller.ts` 518 → 185 + 3 sub-controllers (41 routes before and after, identical
URLs). Each keeps its original filename as a barrel so no outside consumer needed editing.

## Corrections to the Phase 0 audit

- **TIME-001 overstated.** The core writer does not snapshot rates either — `bill_rate` is NULL at
  insert on both paths and resolved live by `RateResolverService` at billing time. The real gaps were
  `project_id` and `timesheet_period_id`. Rate snapshotting is now logged separately as **TIME-004**.
- **UI-001/002 mischaracterised.** The workspace routes are not dead duplicates —
  `build/[projectId]/layout.tsx:62` redirects projects with a `pmWorkspaceId` to them, so they are
  canonical. The layout validates the workspace; it just doesn't scope data.
- **API-004 is a no-change.** `triage-row.tsx:70-72` renders `description` from the list.
- **API-007's first fix was insufficient** — the `(org_id, assignee_id, status)` composite moved
  My Work by 4 blocks. The inequality + `due_date` sort needed a partial index.
- **API-006 RETRACTED.** The `Seq Scan on users` is correct behaviour on a **7-row** table with a
  valid PK index — an artifact of seeding 204k tickets against the 4 existing org members. Not a
  defect. Re-test only with a realistic user count.
- **TIME-003 added** (not in the original audit): `listTimeEntries` filtered by project *after*
  pagination, so filtered pages came back short. Now a SQL predicate.

## Decisions taken

| Question | Decision |
|---|---|
| Baseline strategy | Seed production-scale data, then measure. Done. |
| Scope | Full Build module, all four areas (breadth risk flagged and accepted) |
| Environments | Dev only, no production tenants — no expand-contract obligation, no customer-visible figures to preserve |
| Branch / commits | Stay on `main`, no commits until asked (CLAUDE.md §0.11; prior program precedent) |
| RBAC | Module entitlement **and** org role/permission/DataScope treated as a first-class audit dimension throughout |

## Environment (verified, not assumed)

- Backend `backend/src/modules/build/` — 16 sub-domains, 39 controllers
- Schema `backend/src/db/schema/build/` — 26 files, 2,857 lines
- Frontend `frontend/app/(authenticated)/build/**` (21 routes) + `features/build/**` (48 folders)
- Migrations: drizzle-kit; `db:push` guarded. Redis: `@upstash/redis`. Queue: **no BullMQ**, custom outbox at `common/outbox/`
- Real-time: **Ably** (chat/notifications/support; Build's only surface is `build/[projectId]/chat`)
- Tests: 395 backend `.spec.ts` (19 under `build/`), 6 e2e, 56 frontend. No coverage gate
- RLS is live. App connects as `streamline_app` (no BYPASSRLS); tenant GUC is **`app.organization_id`**, policy predicate `org_id = app.current_org_id()`

## Baseline

Seeded via `backend/src/scripts/seed-build-load.mjs` (idempotent, `--reset`): 60 projects, 204k tickets,
500k comments, 400k activity rows, 171k assignees, 150k timesheets, 60k dependency edges — 1.53M rows, ~590MB.
Second org seeded small as a cross-tenant isolation probe.

Measured by `backend/src/scripts/capture-build-baseline.mjs` as `streamline_app` with RLS enforced →
`docs/refactor/baseline/baseline.{md,json}`.

| Query | Exec | Blocks | Note |
|---|---:|---:|---|
| Board page 1 | 10.7ms | 3,345 | reads the whole project, then sorts |
| Board offset 3000 | 6.0ms | 3,339 | offset buys nothing |
| Board + assignees/labels | 7.3ms | 3,675 | Seq Scan on `users` |
| My Work | 45.7ms | 11,477 | non-org-led index |
| Portfolio rollup | 142.8ms | 1,478 | seq scan |
| Billing rollup | 44.7ms | 4,474 | |

## Findings — open

### Schema
| ID | Evidence | Problem |
|---|---|---|
| SCH-001 | `schema/build/tasks.ts:60`; `use-kanban-drag.ts:211-241`; `projects-tickets-query.service.ts:353-368` | `tickets.order` is `integer`. One drag renumbers both columns client-side; server writes them all via `CASE`. No rank, no version → concurrent drags are last-writer-wins, and a stale client reorders cards it never saw move |
| SCH-002 | `tasks.ts:41` vs `tasks.ts:68` vs `project_statuses` | Three competing status systems: free-text `status`, `stateId`→`custom_states`, and `project_statuses`. Nothing forces agreement on "done" |
| SCH-003 | `tasks.ts:50,61,88`; `tasks.ts:278` | `epicId` + `parentTicketId` are two independent parent pointers. No cycle prevention on either, nor on `work_item_relations` |
| SCH-004 | `tasks.ts:34` | `serial` (int4) PKs against a 100M-row target; violates CLAUDE.md §19 (UUID or `generatedAlwaysAsIdentity`) |
| SCH-005 | schema-wide | No `version` column anywhere in Build — no optimistic locking |
| SCH-006 | `tasks.ts` | No `deleted_at` on `tickets` |
| SCH-007 | `tasks.ts:93`; live DDL | `timestamp` without timezone on tickets/comments/activity; `sprints.start_date`/`end_date` are `timestamp`, not `date` |
| SCH-008 | `tasks.ts:57,58,78` | Three estimate columns: `points`, `storyPoints`, `estimate` |
| SCH-009 | live DDL vs `schema/timesheets/` | Drizzle declares pgEnums; live columns are still `text`. Migration never applied — code/DB drift |
| SCH-010 | `pg_stat_user_tables` | `ticket_comments` 160MB / `ticket_activity_log` 157MB at seed scale, unpartitioned |

### Performance
| ID | Evidence | Problem |
|---|---|---|
| PERF-001 | baseline Q1 | No index serves `ORDER BY "order"`; board reads every ticket in the project then sorts |
| PERF-002 | baseline Q2 | Offset pagination — deep page costs the same as page 1 |
| PERF-003 | `projects-tickets-read.service.ts:216` | `description` selected on the list endpoint |
| PERF-004 | baseline Q5 | `Seq Scan on users` inside assignee hydration |
| PERF-005 | baseline Q6 | `idx_tickets_assignee` is not org-led (CLAUDE.md §19) |
| PERF-006 | baseline Q11 | Portfolio rollup seq-scans |
| PERF-007 | `projects-tickets-read.service.ts:269` | `COUNT(*)` fires on every list request |
| PERF-008 | baseline Q4 | `idx_tickets_title_trgm` never chosen; search degrades to ILIKE filter over the project |

### Security
| ID | Evidence | Problem |
|---|---|---|
| **SEC-002** | `projects-tickets-read.service.ts:104-187` vs `:327-345` | **P0.** `getTicket` enforces DataScope and audit-logs `RESTRICTED_SCOPE`; `listTickets` applies none. The list leaks title + description of tickets the detail endpoint forbids |
| SEC-001 | `execution/whiteboard-sharing.controller.ts:95,103,115` | `@Public()` controller exposing token-based `GET` and **`PATCH`**. Needs expiry, revocation and response-field review |
| SEC-003 | `core/tickets-scope.ts:6` | `TICKETS_PERMISSION = "build:manage"` is two-segment (§21 wants three); `resource` still `"projects"`. Behaviour correct today — cosmetic |

`applyScope` is called in **one** Build service (timesheets) across **70** collection endpoints. Scope resolvers exist only for projects, tickets, timesheets.

### API
| ID | Evidence | Problem |
|---|---|---|
| **API-001** | `hooks/api/build/ticket-queries.ts:36-61` (`BOARD_PAGE_SIZE=100`, `BOARD_MAX_PAGES=5`) | **P0.** Board hook fans out 5 parallel paginated requests and concatenates, stripping the envelope (§14 violation). **Silently truncates at 500 tickets** — a 3,333-ticket project renders 15% of its board. Cost: 5 × (full-project scan + `COUNT(*)`) ≈ 16,725 blocks/load |

### Time & billing
| ID | Evidence | Problem |
|---|---|---|
| **TIME-001** | `timesheets/core/entries.service.ts:162` vs `build/execution/timesheets.service.ts:300` | **P0.** Two writers on one table. Build's omits `project_id`, all rate columns and `timesheet_period_id` → billing rollup drops those entries and values them at zero; invisible to approval |
| TIME-002 | `build/execution/timesheets.service.ts:38-40` | `SUM(hours)` filtered on `ticketId` only, no `orgId`. RLS covers it today; fails as an owner/bypass role |

### Reporting
| ID | Evidence | Problem |
|---|---|---|
| RPT-001 | `schema/build/reporting.ts:6-19` | No sprint dimension on snapshots, no sprint scope-event log → sprint burndown/velocity **not reproducible**; scope creep unmeasurable |
| RPT-002 | `projects-reports.service.ts:228-270`, `.controller.ts:114` | Snapshot is an on-demand endpoint with **no scheduler** → history gaps; late calls stamp today, not the missed day |
| RPT-003 | `projects-reports.service.ts:240` | Snapshot `COALESCE`s the two status systems; fixing SCH-002 moves historical numbers |

### UI
| ID | Evidence | Problem |
|---|---|---|
| UI-001 | 9 files under `build/workspaces/**` | 1-line `export { default } from "…/page"` — §17 forbids importing one `app/**/page.tsx` from another |
| UI-002 | `build/all-work/page.tsx` took no params | `pmWorkspaceId` was never read → workspace scoping was a no-op. **FIXED** — threaded to the SQL `WHERE` as an additive optional filter; `pm-workspaces` intentionally stays org-wide (B-21) |

## Non-findings — verified, do not re-raise

- **`ModuleGuard` is global** (`app.module.ts:176`), so `@RequireModule("build")` on all 39 controllers **is** enforced despite not appearing in `@UseGuards`. Supersedes the older "ModuleGuard is not global" note.
- **`org_modules` already stores `build`**, not `projects` — the module-rename gate hazard is resolved.
- **Every controller carrying `@RequirePermission` also has `PermissionGuard`** — repo-wide, zero inert permission metadata.
- **`build:access:view` / `build:access:manage` are generated** in `permissions/module-access.ts:19,25`. Catalogs are in parity (67 literal + 2 generated = 69). Not drift.
- `project_webhooks.events` and `project_custom_fields.options` are deliberate bounded value lists — not array anti-patterns.
- **All list DTOs cap at `max(100)`**; **frontend has zero files >500 lines**; **the five board views share one data layer** (none fetches independently); **project-level sidebar has zero orphans**; **`users` relations use explicit column projections**.
- **Approved time entries are immutable in both writers** (`build/execution:87-90,124-127`; `timesheets/core:222-231`) and `timesheets.status` defaults to `'PENDING'`, so Build-created entries stay editable by their author.
- **`build:manage` is catalogued and `scopable: true`** — ticket scoping does not degrade to `all`.

## Phase 0 status — COMPLETE

Full audit: `docs/refactor/build-phase0-audit.md` — **56 findings** across schema, API, security, UI,
time/billing, reporting, the 15 non-core sub-domains and the product-management side, plus **14
verified non-findings** that should not be re-raised.

All four previously-outstanding items are now closed:
- **15 non-core sub-domains** — audited, 18 findings (BE-001..BE-018).
- **Product-management side** — audited, 14 findings (PM-001..PM-014).
- **Dead code** — **knip v6.31.0** run on both repos (a real module-graph proof per §25).
  Backend: zero unused files. Frontend: 5 unused files, **all HR, none in Build**.
  **The Build module has no dead code.** HR findings left alone — out of scope, concurrent session.
- **Module-level sidebar↔persona matrix** — 20 Build nav entries mapped against 78 routes. Project-level
  nav has zero orphans. Found and fixed: `/build/page.tsx` still re-exported `./all/page`; the module
  was labelled "Product Management" against §16; two banned legacy redirect routes.

## Next action

### Not mine — concurrent session

`frontend/features/settings/webhooks/webhook-create-sheet.tsx` currently fails `tsc` with 5 errors
(a react-hook-form `Resolver` generic mismatch — the Zod schema makes `events` optional on input and
required on output, so `Resolver<In, any, Out>` doesn't line up). The whole `features/settings/webhooks/`
folder is **untracked, in-flight work from a concurrent session**, not part of this refactor. I did not
touch it: unlike the Ably fix earlier (which was *staged*, i.e. finished work regressing the build),
this is someone mid-edit and changing it would conflict.

**Every one of those 5 errors is in that single file. Zero errors anywhere in Build scope** — verified
by filtering the tsc output for `features/build`, `app/(authenticated)/build` and `hooks/api/build`.
Backend is 0 errors outright.

### Blocked on someone with more privilege than I have

1. **⚠️ PLATFORM-WIDE — RLS makes every text search a full table scan.** `app.current_org_id()` is
   `STABLE` but not `LEAKPROOF`, so under RLS the planner cannot use any GIN/trigram/FTS index. Same
   query and data: owner (BYPASSRLS) `Bitmap Index Scan`, **1.73ms / 336 blocks**; `streamline_app`
   (what the app uses) `Seq Scan`, **~80ms / 11,665 blocks**. **16 of 17 GIN indexes have `idx_scan = 0`.**
   Fix is one superuser-only statement — `neondb_owner` has `rolsuper = false`, so it needs
   `neon_superuser` or Neon support:
   `ALTER FUNCTION app.current_org_id() LEAKPROOF;`
   Safe (reads a GUC, returns it, cannot leak row data). **Expected, not proven — re-measure with
   `capture-build-baseline.mjs` after applying.** Not a code change and not Build-specific.
2. **`db:generate` needs a TTY *and* a decision on SCH-009** — 17 timesheets pgEnums are declared in
   code but were never migrated, so drizzle-kit's `enumsResolver` prompts and aborts. Use
   `generate --custom` meanwhile (migrations `0126`, `0127`, `0137` were authored that way and applied).

### Needs your decision before work starts

3. SCH-001 (ranking) and SCH-002 (three competing status systems) cascade across schema, API and UI.
   RPT-001 (sprint scope-event log) changes what every historical report means. PM-001/002/003/013
   (no customer linkage, no RICE inputs, no product-releases entity, feedback linked to project not
   product) are the product-management schema gaps. These are the Phase 1 gated items.

### Next code fixes, by value

4. **Nothing left that is both unblocked and worth doing.** Every remaining Phase 0 finding is now
   either closed, blocked on an operator/decision above, or explicitly downgraded with measurements:
   - **API-003** downgraded P1→P3 (1.05ms at the app's real max depth; keyset would break the
     `page`/`limit` contract for ~0.6ms).
   - **API-008 / API-005** blocked on RPT-002, not on effort — the rollup plan is already index-optimal,
     so the only fix is a materialised aggregate and there is no scheduler to refresh one.
   - **API-009** is the LEAKPROOF operator action above, not a code change.
Remaining P3s are cosmetic (SEC-003 two-segment key name, PM-011/014 `serial` PKs and PK naming,
UI-004 a BOM) and not worth a change on their own.

## HRMS core review (merged 2026-08-18)

The HRMS core schema, API/security, caching, UI, pagination, hierarchy, attendance, leave,
onboarding, lifecycle, and file-cap refactors from the review worktree are merged into the
primary repositories. Production databases and migrations were not executed.

Remaining gates are intentionally explicit: disposable production-size clone rehearsal and
approval manifests; managed-KMS ADR/activation; signed leave-opening classifications; and
activation of canonical APIs only after the catalog/RLS/tenant/security canary gates pass.
Termination email delivery still needs durable deduplication/claim semantics with a truthful
SENT transition, and onboarding reminders still need a durable resumable job/status boundary.
