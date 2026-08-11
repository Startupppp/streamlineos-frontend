# Build module — Phase 0 audit

Read-only. No application code changed. Baseline: `docs/refactor/baseline/baseline.md`.
Measured against a seeded 1.53M-row dataset as `streamline_app` with RLS enforced.

---

## Schema findings

| ID | Table/Column | Evidence | Problem | Impact | Sev | Fix | Migration risk |
|---|---|---|---|---|---|---|---|
| SCH-001 | `tickets.order` | `schema/build/tasks.ts:60`, `use-kanban-drag.ts:211-241`, `projects-tickets-query.service.ts:353-368` | `integer` position. Client renumbers both columns `0..n-1` and server writes all via `CASE`. No rank, no version | One drag rewrites a whole column; concurrent drags silently clobber; a stale client reorders cards it never saw move | **P0** | Fractional/lexicographic rank, server-authoritative, scoped per board/sprint/parent + rebalance job | Backfill ranks from current `order` |
| SCH-002 | `tickets.status` / `stateId` / `project_statuses` | `tasks.ts:41`, `tasks.ts:68`, `project_statuses` table | **Corrected on mapping — see below.** Three status systems exist in the schema, but one is dead code, not a competing system | No consistent definition of "done" → every status report is unreliable | **P0** | One status table (`project_statuses`) + typed lifecycle group + FK from `tickets.status`; delete the orphan | Backfill unconfigured statuses before adding the FK |

### SCH-002 correction — one of the "three systems" is orphaned

Calling this "three competing status systems" was literally true of the schema and misleading about the
codebase. The usage mapping found:

| System | Reality |
|---|---|
| `tickets.status` (free text) | **The real system** — 68 read/write sites |
| `project_statuses` | **The live config table** — 11 files: WIP limits, ordering, workflow transitions, provisioning, templates, git integration, cron. Already carries `name`, `order`, `color`, **`type`**, `wip_limit` |
| `custom_states` | **Orphaned** |

Proof `custom_states` is orphaned: **zero write sites** anywhere in `src/modules/`; exactly **one** read
site (a `leftJoin` at `projects-reports.service.ts:80`); and `tickets.state_id` is **NULL on 100% of
204,000 rows**, so that join has never once returned a value — the burndown's
`COALESCE(custom_states.group, …)` fallback is always taken. Compounding the confusion, the service
named `projects-custom-states.service.ts` actually operates on `project_statuses`.

The fix is therefore much smaller than the P0 framing implied: type `project_statuses.type` as the
existing `state_group` enum, repoint the burndown at it (**which closes RPT-003**), FK-constrain
`tickets.status` to `project_statuses(org_id, project_id, name)`, and delete the orphan. Design and
migration order in `docs/refactor/sch-002-status-model-design.md`.
| SCH-003 | `tickets.epicId` / `parentTicketId`; `work_item_relations` | `tasks.ts:50,61,88`, `tasks.ts:278` | Two independent parent pointers, no cycle prevention on either or on the dependency edge table | Circular blockers make critical-path non-terminating | **P1** | One hierarchy pointer; cycle check at write time on both | Detect existing cycles first |
| SCH-004 | `tickets.id` and siblings | `tasks.ts:34` | `serial` = int4, ceiling 2.1B; CLAUDE.md §19 mandates UUID/identity | Ceiling vs 100M-row target; violates house rule | **P1** | `generatedAlwaysAsIdentity()` | Large; sequence + FK rewrite |
| SCH-005 | Build-wide | no `version` column anywhere | No optimistic locking on concurrently-edited entities | Lost updates on ticket edit, not just drag | **P1** | `version` + conditional update | Additive |
| SCH-006 | `tickets` | no `deleted_at` | No soft delete despite house rule §19 | Hard deletes lose history | **P2** | `deleted_at` + partial indexes | Additive |
| SCH-007 | `tickets.createdAt`, comments, activity, `sprints.start_date/end_date` | `tasks.ts:93`; live DDL | `timestamp` **without** timezone; sprint bounds are `timestamp` not `date`. `project_webhooks` correctly uses `withTimezone` | Deadlines shift across midnight for distributed teams; burndown off by a day | **P1** | `timestamptz` for events, `date` for deadlines/sprint bounds | Type change, needs care |
| SCH-008 | `tickets.points` / `storyPoints` / `estimate` | `tasks.ts:57,58,78` | Three estimate columns | Velocity ambiguous — which one counts? | **P2** | Collapse to one, document | Backfill |
| SCH-009 | `timesheets.*` | live DDL vs `schema/timesheets/` | Drizzle declares 17 pgEnums; live columns are still `text` | Code/DB drift; enum guarantees are fictional | **P1** | Generate + apply the migration | Enum cast with `USING` |
| SCH-010 | `ticket_comments`, `ticket_activity_log` | `pg_stat_user_tables` | 160MB / 157MB at seed scale, unpartitioned, append-only | Largest tables, never read beyond a recent window | **P2** | RANGE partition on `created_at` | Partition key must enter PK |

---

## API findings

| ID | Endpoint | Evidence | Problem | Queries/req | Sev | Fix |
|---|---|---|---|---|---|---|
| **API-001** | `GET /build/:projectId/tickets` (board) | `hooks/api/build/ticket-queries.ts:36-61`, `BOARD_PAGE_SIZE=100`, `BOARD_MAX_PAGES=5` | Hook fans out **5 parallel paginated requests** and concatenates, stripping the envelope. Violates CLAUDE.md §14 ("never hardcode pagination params"). **Silently truncates at 500 tickets** | **10** (5 list + 5 `COUNT`) | **P0** | Real server-side board endpoint, keyset-paginated, or virtualised infinite scroll returning the envelope |
| API-002 | same | baseline Q1 | No index serves `ORDER BY "order"` → Index Scan → **Sort** over the whole project | 3,345 blocks/req | **P0** | Composite index `(org_id, project_id, "order")` |
| API-003 | same | baseline Q2 + depth sweep | **Downgraded P1 → P3 on measurement.** Offset cost is linear, as expected — but at the depths this app actually reaches it is negligible: offset 0 = 0.43ms/108 blocks, offset 400 (the board's hard autoload ceiling of 5×100) = **1.05ms/508 blocks**. Offset 1000 = 2.42ms, offset 3000 = 6.88ms — depths only reachable by manual deep paging in a list view | Real, but ~0.6ms at realistic usage today. Matters at the 100M-row target, not now | **P3** | Keyset/cursor — **deliberately not done**: it breaks the `page`/`limit` contract for every caller in exchange for a measured sub-millisecond gain. Revisit when a single project exceeds ~50k tickets |
| API-004 | same | `projects-tickets-read.service.ts:216` | `description` selected on a list endpoint | +bytes/row | **P1** | Drop from list projection; load on demand |
| API-005 | same | `projects-tickets-read.service.ts:269` | `COUNT(*)` on every list request | 1 extra/req | **P1** | Maintained counters or cached approximation |
| ~~API-006~~ | board hydration | baseline Q5 | **RETRACTED — seed artifact, not a defect.** The `Seq Scan on users` is Postgres correctly choosing a sequential scan over a **7-row** table that has a valid PK index (`users_pkey`) plus 8 others. My seed created 204k tickets but reused the 4 existing org members, so `users` never grew. Re-test this only against a dataset with a realistic user count | — | — | No change |
| API-007 | `GET /build/my-work` | baseline Q6 | `idx_tickets_assignee` is not org-led (CLAUDE.md §19) → 11,477 blocks, 45.7ms | — | **P1** | `(org_id, assignee_id, status)` |
| API-008 | portfolio dashboard | baseline Q11 | 147ms per request. **Re-measured: the plan is already optimal** — `Index Only Scan using idx_tickets_org_project_status` + Hash Join, and the `Seq Scan` is on `projects` (60 rows, correct for a tiny table). 1,311 blocks is good I/O; the cost is aggregation CPU over 200k index entries. **No index fix exists.** The only real fix is to stop recomputing per request | — | **P1** | Read from a materialised aggregate. `project_daily_snapshots` already holds per-project per-state counts — but it is on-demand and gappy, so **this is coupled to RPT-002** (no scheduler exists; there is no BullMQ). Implementing a matview nothing refreshes would be worse than leaving it |
| **API-009** | ticket search — **and every other text search on the platform** | measured, see below | **RLS defeats every GIN/trigram index for the real application role.** Org-wide ticket search seq-scans: **81.55ms / 11,665 blocks**. The same query as the owner (RLS bypassed) uses `idx_tickets_title_trgm`: **1.73ms / 336 blocks** — *including* the `org_id` filter. **16 of the platform's 17 GIN indexes have never been scanned once** | Platform-wide. Every trigram/FTS search degrades to a full table scan under the role the app actually uses | **P1** | Operator action — see below |

### API-009 detail — this is not a Build problem

Measured, as `streamline_app` (RLS enforced) vs `neondb_owner` (`rolbypassrls`), same query, same data:

| Role | Plan | Exec | Blocks |
|---|---|---:|---:|
| `neondb_owner` (RLS bypassed) | `Bitmap Index Scan using idx_tickets_title_trgm` | **1.73ms** | **336** |
| `streamline_app` (RLS enforced) | `Seq Scan` | **74.8–81.6ms** | **11,665** |

Confirmed it is not a data-selectivity artifact: titles are 200,000 distinct, a zero-match rare term
(`'%zzqqxx%'`) still seq-scans under RLS, and `SET enable_seqscan=off` makes the planner pick a *btree*
bitmap rather than the GIN.

**Root cause:** `app.current_org_id()` is `STABLE` but **not `LEAKPROOF`** (verified via `pg_proc`).
Under RLS a non-leakproof security qual must be evaluated before user quals, which blocks the plan that
would satisfy the `ILIKE` from the trigram index first.

**Blast radius:** 733 tables have RLS enabled. 16 of 17 GIN indexes show `idx_scan = 0` — the only
non-zero count is `idx_tickets_title_trgm`, and those 3 scans are my own owner-role probes. The dead
indexes include `idx_kb_articles_fts`, `idx_kb_pages_fts`, `idx_users_{name,email,first_name}_trgm`,
`idx_inv_{products,vendors,lots,serials}_*_trgm`, `idx_leads_company_trgm`, `idx_projects_name_trgm`.
They are small today only because those tables are near-empty in dev; the cost arrives with real data.

**Remedy — requires an operator, I could not apply it:**
```sql
ALTER FUNCTION app.current_org_id() LEAKPROOF;
```
`ALTER FUNCTION … LEAKPROOF` is superuser-only and `neondb_owner` has `rolsuper = false`, so this needs
Neon's `neon_superuser` or support. The function only reads a GUC and returns it — it cannot leak row
data — so marking it leakproof is the standard, safe remedy. **Not proven, because I could not run it:**
expected to restore the index path, and should be re-measured with the harness immediately after.
| API-010 | `projects-analytics.service.ts:239`, `projects-budget.service.ts:79` | code | `findMany` with no limit (bounded per-org/per-project in practice, cached) | — | **P3** | Add explicit caps |

**Combined board cost today:** 5 × (full-project scan + `COUNT(*)`) ≈ **16,725 buffer blocks (~130MB) per board load**, returning at most 500 of the project's tickets.

---

## Security & visibility findings

| ID | Location | Evidence | Problem | Sev | Fix |
|---|---|---|---|---|---|
| **SEC-002** | ticket list vs detail | `projects-tickets-read.service.ts:104-187` (no scope) vs `:327-345` (scope enforced) | `getTicket` denies non-assignees under `own` scope and audit-logs `RESTRICTED_SCOPE`; `listTickets` applies **no** DataScope. The list returns title **and description** of tickets the detail endpoint forbids | **P0** | Apply `resolveTicketsScope` in the list `where`, not after fetch |
| SEC-001 | `execution/whiteboard-sharing.controller.ts:95,103,115` | code | `@Public()` controller exposing token-based `GET` and **`PATCH`** (public write) | **P1** | Verify expiry, revocation, per-field payload |
| SEC-003 | `core/tickets-scope.ts:6` | code | `TICKETS_PERMISSION = "build:manage"` is a **two-segment** key; §21 mandates `module:resource:action`. Its `resource` is still `"projects"` | **P3** | Rename to three-segment; it *is* catalogued and `scopable: true`, so behaviour is correct today |

**DataScope coverage is the systemic gap:** `applyScope` is called in **one** Build service (`execution/timesheets.service.ts:57,207`) across **70 collection endpoints**. Scope resolvers exist for projects, tickets and timesheets only.

---

## UI findings

| ID | Route/Component | Evidence | Problem | Sev | Fix |
|---|---|---|---|---|---|
| **UI-001** | `build/workspaces/[pmWorkspaceId]/**` | 9 files are 1-line `export { default } from "…/page"` | Re-exporting one `app/**/page.tsx` from another — explicit CLAUDE.md §17 violation | **P1** | One component under `features/`, thin permission-checked adapters with base-path props |
| **UI-002** | `/build/workspaces/[pmWorkspaceId]/{all,all-work,my-work,pm-workspaces}` | `workspaces/[pmWorkspaceId]/layout.tsx` vs `all-work/page.tsx` | The layout **validates** `pmWorkspaceId` (fetches it, 404s or redirects) but only returns `children` — it does not scope data, and the page components take no workspace prop. So the URL promises workspace scoping it does not deliver: these routes show **org-wide** work | **P1** | Product decision: either thread workspace scope into the feature components, or stop prefixing these four |
| UI-003 | `/build/workspaces/[pmWorkspaceId]/pm-workspaces` | route list | A workspace-scoped route listing all workspaces — incoherent nesting | **P3** | Reachable only via the workspace context chip's path rewrite; decide with UI-002 |
| UI-004 | `app/(authenticated)/build/all-work/page.tsx:1` | file | UTF-8 BOM before `import` | **P3** | Strip |

---

## Time, capacity & billing findings

| ID | Location | Evidence | Problem | Sev | Fix |
|---|---|---|---|---|---|
| **TIME-001** | two writers to `timesheets` | `modules/timesheets/core/entries.service.ts:162` and `modules/build/execution/timesheets.service.ts:300` | **Two independent time-entry writers on one table.** The Build writer set only `orgId, userId, ticketId, date, hours, description, imageUrl, workLink` — omitting `project_id` and `timesheet_period_id` | Entries logged from a Build ticket had `project_id = NULL`, so the billing rollup (`group by project_id`) **dropped them**, and with no `timesheet_period_id` they were invisible to period approval | **P0** | One write path, or populate both fields via the core services |
| TIME-004 | rate snapshotting, system-wide | `timesheets/core/entries.service.ts:152-176` vs `billing.service.ts:83,436` | **Neither writer snapshots a rate onto the entry.** `bill_rate`/`cost_rate`/`currency` are left NULL at insert and resolved **live** at billing time by `RateResolverService`. The brief requires the applied rate to be snapshotted onto the entry, with versioned effective-dated rate cards | A rate-card change in June retroactively alters what March's work is worth. No historical invoice can be reproduced. Currently harmless only because no invoice has ever been issued (no production tenants) | **P1** | Snapshot the resolved rate onto the entry at approval time; version rate cards |
| **TIME-003** | `modules/build/execution/timesheets.service.ts` `listTimeEntries` | code | The `projectId` filter was applied **after** pagination — `entries.filter(e => e.ticket?.projectId === …)` on the already-limited page. So a filtered request returned fewer than `limit` rows, and the filter only ever saw the current page's slice | A project filter over a user with entries across many projects returns near-empty pages and appears to lose data | **P1** | Pushed into the SQL `WHERE` as `eq(timesheets.projectId, …)` — possible now that `projectId` is populated (TIME-001) |
| TIME-002 | `modules/build/execution/timesheets.service.ts:38-40` | code | `SUM(hours)` filtered on `ticketId` only — **no explicit `orgId` predicate**. RLS currently prevents cross-tenant reads, so this is a defence-in-depth failure rather than an active leak, but it violates §19/§20 and breaks the moment it runs as an owner/bypass role (as migrations and scripts do) | **P2** | Add `eq(timesheets.orgId, …)` |

## Reporting & reproducibility findings

| ID | Location | Evidence | Problem | Sev | Fix |
|---|---|---|---|---|---|
| **RPT-001** | `project_daily_snapshots` | `schema/build/reporting.ts:6-19` | Snapshots are keyed `(project_id, snapshot_date, state_group)` — there is **no sprint dimension**, and grep finds **no sprint scope-event log** anywhere in `schema/build/` | Sprint burndown and velocity **cannot be reconstructed**. A closed sprint's numbers change whenever someone edits an old ticket, and scope creep is unmeasurable | **P1** | Append-only sprint scope-event log (item added/removed/estimate changed/completed) + sprint dimension on snapshots |
| **RPT-002** | `projects-reports.service.ts:228-270`, `projects-reports.controller.ts:114` | code | `snapshot()` is exposed as an **on-demand endpoint with no scheduler** (no `@Cron`/`@Interval`; no BullMQ in the repo). It computes from *current* state and upserts under **today's** date | Burndown history has holes for every day nobody calls the endpoint, and a late call records today rather than the missed day. The chart silently interpolates over gaps | **P1** | Scheduled daily capture; backfill is impossible for missed days, so state this explicitly |
| RPT-003 | `projects-reports.service.ts:240` | code | Groups by `COALESCE(custom_states.group, CASE WHEN status = 'DONE' …)` — bridging SCH-002's two status systems inside the aggregate | Snapshot correctness depends on the dual-status fallback; fixing SCH-002 changes historical numbers | **P2** | Resolve SCH-002 first, then recompute |

---

## Non-core sub-domain findings (15 sub-domains)

| ID | Sub-domain | file:line | Problem | Sev |
|---|---|---|---|---|
| **BE-001** | approvals | `approvals/approvals.service.ts:191` | `void notifyProjectChannel(...).catch(() => undefined)` — post-request side effect on the committed ALS transaction handle. Dies `42501`, silently swallowed. The §20 zero-rows-in-notifications pattern | **P1** |
| BE-018 | execution | `execution/workspace.service.ts:136-158` | `updateIntake` accepted-path does `MAX(ticketNumber)` + insert with **no `pg_advisory_xact_lock`**, unlike every other ticket-creating service → duplicate ticket numbers under concurrency | P2 |
| BE-010/011/012 | execution | `iterations.service.ts:303,416,521` | `deleteCycle`/`deleteModule`/`deleteEpic` each nullify a ticket FK then delete the parent as **two statements outside a transaction** → dangling FK on partial failure | P2 |
| BE-013 | meetings | `meetings/meetings.service.ts:162-163` | `.limit(100)` then `.filter()` in JS for `hasActionItems` — filtered pages silently shrink | P2 |
| BE-002 | qa | `qa/test-runs.service.ts:133-135` | `input.caseIds` inserted verbatim, never validated against `(orgId, projectId)` → cross-**project** test-case injection (RLS blocks cross-tenant, not cross-project) | P2 |
| BE-008/009 | execution | `iterations.service.ts:48-57,96-103` | `listSprints` hydrates all tickets for up to 100 sprints (20k rows); `getSprint` hydrates unbounded tickets — §11 bans collection hydration via parent-detail | P2 |
| BE-003..007, BE-017 | workflow, client-portal, comment-drafts, execution, portfolios | see changelog | Six unbounded reads with no `.limit()` | P2 |
| BE-014 | execution | `execution/timesheets.service.ts:286` | `limit: 500` — 5× the §19 hard cap, no pagination | P2 |
| BE-015/016 | execution, qa | `workspace.service.ts:164,176,187`; `test-runs.service.ts:285` | Writes/reads missing an explicit `orgId` predicate. RLS blocks it today; fails as an owner/bypass role | P3 |

**Clean across all 15:** object-level BOLA guards on every resource loader; auth guards on every controller; cross-tenant misses return 404 not 403; explicit `users` column projections; approval inbox and comment drafts correctly self-scoped; client-portal gates on `projects.clientId`.

## Product-management findings

| ID | Area | Evidence | Problem | Sev |
|---|---|---|---|---|
| **PM-005** | public roadmap | `schema/build/roadmap.ts:18` | `roadmapItems.isPublic` defaulted to **`true`** — every item any user created was externally visible on the unauthenticated feed unless someone remembered to toggle it off | **P1** |
| PM-006 | public roadmap | `modules/public/public.controller.ts:227+` | `GET /public/roadmap`, `POST …/vote`, `POST …/feedback` had **no rate limiting**, while `POST /public/contact` does → scraping, vote stuffing, feedback spam | P2 |
| PM-007 | public roadmap | `public/roadmap.service.ts:82-162` | `voterKey` is entirely client-supplied with no IP binding; dedup is per `(itemId, voterKey)` and the key is trivially rotatable → vote scores are manipulable | P2 |
| PM-001 | schema | `roadmap.ts:54-55`, `feedback.ts:147-148` | Feature requests store only free-text `submittedByEmail`/`reporterEmail` — no FK to CRM. Revenue-weighted prioritisation is impossible | P1 |
| PM-002 | schema | `roadmap.ts:11-30` | No RICE inputs anywhere — only a `votes` counter. No score is explainable or recomputable | P1 |
| PM-003 | schema | `managed-products.ts`, `tasks.ts:385` | `project_releases` is a proper lifecycle entity, but `managed_products` has **no releases table** — the product side has only `changelogEntries.version text` | P1 |
| PM-013 | schema | `feedback.ts:102` | `feedbucketWidgets.projectId` links feedback to a *project*, never to a product — can't aggregate requests per product | P1 |
| PM-004 | schema | `roadmap.ts:43-60` | No dedup or merge for feedback intake — duplicates inflate vote counts | P2 |
| PM-010 | frontend | `hooks/api/build/roadmap.ts:123,163,193` | `useRoadmapItems`/`useFeedbackPosts`/`useChangelog` fired unconditionally against `build:roadmap:view`-gated endpoints → 403 spam for every user without the permission | P2 |
| PM-008/009 | API | `portfolios.service.ts:49`, `projects-roadmap.service.ts:22,88,152` | Hardcoded `limit(100)` / `page`+`limit` inputs but a raw array returned — no `{data, pagination}` envelope, so callers can't detect truncation | P2 |
| PM-012 | schema | `managed-products.ts:53-58` | Owner FK is `onDelete("restrict")` — deleting a member who owns a product throws an FK violation instead of nulling the owner | P2 |
| PM-011/014 | schema | PM tables | `serial` PKs (§19 wants identity); `managedProductId` PK naming inconsistent with `id` elsewhere | P3 |

**Public roadmap projection itself is correctly narrow** — `public/roadmap.service.ts:20-79` uses explicit `columns:` projections that exclude `submittedByName`, `submittedByEmail`, `createdBy`, `epicTicketId`, `projectId`. **OKR progress is correctly derived**, recomputed in-transaction on every check-in/KR change, and `progress` is absent from the PATCH schema so clients cannot override it.

---

## Verified non-findings — do not re-raise

These were checked against source and disproved. Several are things the brief predicts will be broken here; they are not.

1. **`ModuleGuard` is global** (`app.module.ts:176`). All 39 Build controllers carry `@RequireModule` without listing it in `@UseGuards` — still enforced. Supersedes the older "ModuleGuard is not global" note.
2. **`org_modules` already stores `build`**, not `projects` — the module-rename gate hazard is resolved.
3. **Zero inert permission metadata repo-wide** — every controller carrying `@RequirePermission` also has `PermissionGuard`.
4. **Permission catalogs are in parity.** `build:access:view/manage` are generated in `permissions/module-access.ts:19,25` (67 literal + 2 generated = 69 both sides). The apparent drift is a grep artifact.
5. **`build:manage` is catalogued and `scopable: true`** (`permissions/shared.ts:60`) — ticket scoping does not silently degrade to `all`.
6. **All list DTOs cap at `max(100)`** — the 100/page rule is respected.
7. **Frontend has zero files over 500 lines.** Prior oversized files (`list-view.tsx` 889, board page 707) were already split.
8. **The five board views share one data layer.** `kanban/list/table/calendar/gantt` receive tickets as props; none fetch independently. Shared `card-inline-fields`, `list-view-shared`, `use-board-url-state`, `use-display-options`, `view-switcher`. The brief's "four views reimplementing the same logic" problem does not exist here.
9. **Project-level sidebar has no orphans** — all 34 `[projectId]` nav entries map to real routes and vice versa.
10. **`users` relations use explicit column projections** (`projects-analytics.service.ts:292-295`) — §19's users-projection rule is respected.
11. **`project_webhooks.events` / `project_custom_fields.options`** are deliberate bounded value lists, not array anti-patterns.
12. **Approved time entries are immutable — in both writers.** `build/execution/timesheets.service.ts:87-90,124-127` blocks payroll-exported and non-`PENDING` entries on update *and* delete; `timesheets/core/entries.service.ts:222-231` additionally blocks voided, locked and invoiced. The brief's "approved entries must become immutable" requirement is already met.
13. **`timesheets.status` defaults to `'PENDING'`**, so entries created by the Build writer (which does not set `status`) are editable by their author. Not a lockout bug.
14. **`build:manage` resource naming is legacy but harmless** — two-segment key with `resource: "projects"`, yet catalogued and `scopable: true`, so scope resolution is correct today (logged as SEC-003, cosmetic).

---

## Dead code — knip result (module-graph proof, per §25)

Run with **knip v6.31.0**, which is installed in both repos with a `knip.json` config. This satisfies
§25's requirement that dead-code claims be proven by a module-graph tool rather than grep.

- **Backend: exit 0, ZERO unused files.**
- **Frontend: 5 unused files — all HR, none in Build**
  (`components/hr/request-wfh-dialog.tsx`, `features/hr/attendance/attendance-heatmap.tsx`,
  `features/hr/attendance/wfh-balances-card.tsx`, `features/hr/employees/hr-employee-table.tsx`,
  `features/hr/hr-dashboard-overview.tsx`). Plus 19 unused exports and one unused dependency
  (`@reactour/tour`) — again none Build-scoped. **Left alone: out of this refactor's scope, and a
  concurrent HR session is active in this tree.**

**Conclusion: the Build module contains no dead files.** Nothing to delete.

Also noted: `hooks/api/build/index.ts` omits 12 modules from its barrel (`ticket-mutations`,
`ticket-queries`, `customers`, `releases`, `reports`, `roadmap`, `workspace-members`, …). All are
imported directly by name, so nothing is broken, but §9 says to import through the barrel — a
consistency gap, not dead code.

## Code & structure

| Item | Status |
|---|---|
| Files > 500 lines | 3 backend: `schema/build/tasks.ts` (607), `execution/iterations.service.ts` (533), `core/projects-tickets.controller.ts` (518). Frontend: **none** (highest is `filter-command-menu.tsx` at 494) |
| Backend controllers | 39, all permission- and module-gated |
| Build routes | 78 (`app/(authenticated)/build/**`) |
| Build tests | 19 `.spec.ts` under `modules/build/` + 2 e2e (`projects-access`, `projects-team-access`) |

---

## Not yet audited (Phase 0 remainder)

- Module-level Build sidebar ↔ persona matrix (`components/layout/sidebar/sidebar-nav-items.ts`) — project-level nav is done and clean
- Per-subdomain API audit for the 15 non-core sub-domains (qa, forms, governance, incidents, meetings, portfolios, teams, approvals, workflow, client-portal, managed-products, pm-workspaces, comment-drafts, execution, core partially)
- Dead-code pass (requires `knip` + a real `next build`/`nest build` per §25 — grep is not sufficient)
- Product-management side: RICE inputs, release lifecycle, feedback dedup, public-roadmap field visibility
- Sprint reproducibility: whether an append-only scope-event log exists for burndown
- Time-entry immutability and rate snapshotting

---

## Prioritised fix order

1. **SEC-002** — ticket list ignores DataScope while detail enforces it. Security, contained fix.
2. **API-001 + API-002** — board fanout + missing sort index. Together they are the entire board cost, and API-001 silently drops 85% of a 3,333-ticket project.
3. **SCH-001** — ranking. Everything about drag correctness depends on it.
4. **SCH-002** — status model. Every report depends on it; do before any reporting work.
5. **API-004/005/006/007** — projection, count, users seq scan, org-led index. Cheap, measurable.
6. **UI-001/UI-002** — route duplication and dead workspace scoping.
7. **SCH-003/005/007** — cycles, optimistic locking, temporal types.
8. Remainder.
