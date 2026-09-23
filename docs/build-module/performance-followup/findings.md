# Build performance and caching — findings

Severity is blast radius, not effort. P0 breaks a write path or serves wrong data. P1 costs real work on a hot path or disarms a gate. P2 is debt with a bounded cost.

Every row cites source. No latency, buffer or row-count figure is claimed anywhere — none was measured.

## Coverage

115 GET handlers across 48 Build controllers, from `docs/build-module/authorization-census.json` (322 handlers total). Each of the seven risk classes was swept mechanically, then every hit was read against source.

| Risk class | How it was swept | Result |
|---|---|---|
| Missing tenant predicate | census `orgScoping` over all 115 GETs | 114 `BOUND`, 1 `N/A` — the `@Public` whiteboard token route, sound by design. One gap the census missed: **P2-9** |
| Missing project predicate | census `parentScoping` | 2 `PASSED-UNBOUND`; both read directly — one sound, one real (**P2-9**) |
| N+1 queries | `check:n1-growing-loops --list` | 0 confirmed growing loops in Build, against 90 repo-wide. The single unresolved site is sound — see below |
| Unbounded reads | `check:unbounded-reads` | 16 unclassified Build sites, all input-bounded (**P2-1**); 2 genuinely unbounded endpoints (**P2-2**) |
| Missing indexes | schema read + `check:tenant-indexes` | **P1-2**, **P1-3**, **P2-9** (**P2-5** retracted — the index exists) |
| Incorrect cache keys | `build-cache-key-readers.mjs` | **P1-1** |
| Unsafe invalidation | both new analysers | **P0-1**, **P1-1**, **P2-3**, **P2-4** |

Tenant scoping is the module's strongest dimension: one omission in 115 handlers, and RLS still fences that one. Caching and the Sprint/Cycle seam are where the defects are.

## Status

| Finding | State |
|---|---|
| P0-1 report-revision trigger | **fixed twice** — `1152` for the DROP, `1157` for the phase-06 RENAME |
| P1-1 analytics cache | **fixed** — read cached, nine evictions repointed |
| P2-3 false `check:cache-invalidation` findings | **fixed** — gate now passes |
| P2-9 `listRelatedLinks` | **fixed** — predicate + migration `1154` |
| P1-2 velocity index unusable | **fixed** — casts dropped, soft-delete predicate added |
| P1-3 schema/migration drift | **fixed** — migration `1155_build_cycles_drift_reconcile` + schema |
| P2-7 report keys in the wrong domain module | **fixed** — moved to `build-work.ts` |
| P2-1 unbounded-reads ledger | open — **blocked on a ratchet decision**, see below |
| P2-2 unpaginated org-wide reads | open — `resource-allocation` turns out to have **no caller**; see below |
| P2-4, P2-6, P2-8 | open — each needs a measurement or a product decision, see each |
| P2-5 | retracted |

Also landed: all fourteen cycle reads carry the soft-delete predicate, `idx_cycles_project_status_live` was replaced with an org-led index by `1156`, and `1157` re-fixes P0-1 against a rename that `main` introduced after `1152` shipped.

**P0-1 came back.** `a-sprint-cycle-06-rename-scope-events.sql` renames the scope-events table, and `TG_TABLE_NAME` then stops matching the branch, falling through to an arm that selects a column the table does not have. Same outage, different mechanism: `1152` fixed a reference a DROP removed, `1157` fixes a predicate a RENAME stops matching. Neither is visible to PostgreSQL's dependency tracking because both live inside strings. The analyser was extended to detect renames — it caught this one, which is how it was found.

---

## P0-1 · Pending Sprint/Cycle DDL silently breaks the report-revision trigger

**Fixed twice: `1152` for the DROP below, `1157` for the RENAME that arrived later. See the note after the status table.**

`build.bump_report_revision()` is the sole invalidation mechanism behind all five cached Build reports. It is defined once, in `backend/migrations/1073_build_report_revision.sql`, and no later migration replaces it.

Its `sprint_scope_events` branch assembles this statement as **text** and runs it through `EXECUTE`:

```sql
affected := 'SELECT DISTINCT c.org_id, s.project_id FROM (' || changed || ') c
             JOIN build.sprints s ON s.org_id = c.org_id AND s.id = c.sprint_id';
```

Two of those references are removed by migrations already staged in `backend/migrations/sql/`:

| Reference | Removed by |
|---|---|
| `build_events.sprint_scope_events.sprint_id` | `a-sprint-cycle-04-detach.sql` — `DROP COLUMN IF EXISTS "sprint_id"` |
| `build.sprints` | `a-sprint-cycle-05-drop.sql:46` — `DROP TABLE "build"."sprints"` |

Because the reference lives inside a dynamic SQL string, PostgreSQL records **no dependency** between the function and either object. The `DROP` succeeds with no warning. The failure appears later, at runtime, as `42703 column c.sprint_id does not exist` raised inside an `AFTER … FOR EACH STATEMENT` trigger — which **aborts the writing transaction**.

Everything that records a sprint-scope event fails: adding or removing a ticket from a cycle, an estimate change, a completion, a reopen.

The guard at the top of `a-sprint-cycle-04-detach.sql` is a data check — it counts unarchived `build.tickets.sprint_id` values. It cannot see the trigger body, and no static gate in the repository reads inside a plpgsql string.

The Drizzle model already moved: `src/db/schema/build/sprint-events.ts:31` declares `cycleId: integer("cycle_id")` with `fk_sprint_scope_events_org_cycle`. The trigger did not move with it.

**Detected by** `node src/scripts/build-performance/build-report-revision-integrity.mjs` (exit 1, 2 findings).

**FIXED — `migrations/1152_build_report_revision_cycles.sql`.** It replaces the function, repointing the branch at `cycle_id` and `build.cycles`, and additionally attaches the triggers to `build.cycles`, which 1073 never covered — burnup reads a cycle's dates and velocity reads its status, so a cycle edit must bump the revision.

The migration carries a verification `DO` block that raises if the installed body still contains `c.sprint_id` or `build.sprints`, or if `build.cycles` does not end up with all three triggers. `build-report-revision-integrity.mjs` now exits 0.

**It must be applied before `a-sprint-cycle-04-detach.sql`.** Add that ordering to the detach runbook; nothing in the repository enforces it, because the two live in different migration sets.

---

## P1-1 · `projects:analytics:*:*` has nine invalidators and no reader

Nine Build mutation paths evict this key:

| Site |
|---|
| `backend/src/modules/build/core/projects-tickets-create.service.ts:270, :318` |
| `backend/src/modules/build/core/projects-tickets-query.service.ts:45` |
| `backend/src/modules/build/core/projects-tickets-rank-utils.ts:76` |
| `backend/src/modules/build/core/projects-tickets-transfer.service.ts:204` |
| `backend/src/modules/build/core/projects-tickets-update.service.ts:406` |
| `backend/src/modules/build/core/projects-tickets.service.ts:228` |
| `backend/src/modules/build/entity/build-entity.actions.ts:50, :85` |

Nothing writes the key. `ProjectsAnalyticsService` (`backend/src/modules/build/core/projects-analytics.service.ts:9-12`) injects only `DRIZZLE`; it has no `CacheService` at all.

Two consequences, both real:

1. Every ticket create, update, rank, transfer, bulk mutation and delete pays an awaited Redis `DEL` round trip that reaches nothing. It is on the mutation acknowledgement path the plan budgets at P95 under 500 ms.
2. `GET /build/:projectId/analytics` is uncached on every call. `computeProjectAnalytics` issues seven reads, two of them raw `db.execute` with a `UNION` and joins to `organization_members` and `users`.

**Detected by** `node src/scripts/build-performance/build-cache-key-readers.mjs`.

**FIXED.** `ProjectsAnalyticsService` now injects `CacheService` and reads through `cachedVersioned("build:analytics:<orgId>", "<projectId>", …, CACHE_TTL.SHORT)`; all nine `del` sites became `invalidateNamespace(\`build:analytics:${orgId}\`)`. The namespace is per-org rather than per-project, matching the `billingSummary` precedent: invalidation is an O(1) counter bump with no SCAN (BE-122), and at a 30 s TTL the cost of also expiring sibling projects is trivial.

The key literal is passed inline rather than through a local `const`, because `check:cache-invalidation` resolves literal arguments only — binding it to a name would have reproduced exactly the blind spot recorded as P2-3.

The four specs that construct this service were updated with a cache double that invokes the fetcher. A double that returned a canned value instead would have made the cross-tenant 404 assertions in `build-project-scoped-lists-404.spec.ts` vacuous — that spec pairs each negative with a positive control asserting the aggregate is actually reached.

---

## P1-2 · The velocity cursor index cannot serve the velocity query

`a-sprint-cycle-03-constrain.sql:46` creates the index the keyset page needs:

```sql
CREATE INDEX idx_cycles_org_project_velocity_cursor
  ON build.cycles (org_id, project_id, start_date DESC, id DESC)
  WHERE deleted_at IS NULL AND status IN ('active','completed');
```

`queryVelocityReport` (`backend/src/modules/build/core/projects-velocity-report.ts:19-27`) cannot use it, for two independent reasons:

1. **The query never filters `deleted_at`.** Its `WHERE` is `org_id`, `project_id`, `status IN (…)` and the cursor predicate. PostgreSQL uses a partial index only when it can prove the query predicate implies the index predicate. Without `deleted_at IS NULL` in the query, it cannot.
2. **The sort key is an expression, not a column.** `cycles.startDate` is `date` (`src/db/schema/build/core.ts:168`), so the query casts on both the ordering and the cursor comparison: `desc(sql\`${cycles.startDate}::timestamp\`)` and `lt(sql\`${cycles.startDate}::timestamp\`, …)`. `date → timestamp` is a conversion, not a binary coercion. An index on the bare `date` column cannot answer `ORDER BY (start_date::timestamp) DESC`, and the cursor comparison is not sargable.

The keyset page therefore degrades to a sort of every matching cycle row, per page — the thing BE-25 keyset pagination exists to avoid.

The predecessor did not have this problem: `sprints.startDate` was `timestamp` (`core.ts:108`) and `idx_sprints_org_project_velocity_cursor` (`core.ts:122`) matched the old query exactly. The column type changed in the cutover; the query grew a cast to compensate; the index was copied across without either change being reflected.

**FIXED.** `queryVelocityReport` now orders by the bare column, `orderBy(desc(cycles.startDate), desc(cycles.id))`, and filters `isNull(cycles.deletedAt)`. The `WHERE` is now `org_id`, `project_id`, `status IN ('active','completed')`, `deleted_at IS NULL` — an exact match for the partial index's predicate, with the sort key a plain column the index can serve.

The cursor wire format is deliberately unchanged. `cursorStartDate` still emits `start_date::timestamp::text`, so `velocityCursorPositionSchema`'s regex still validates and cursors already in flight keep working; the predicate casts that value back with `::date` instead of casting the column. Casting the parameter is sargable, casting the column is not — that asymmetry is the whole fix.

Still needs `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set (BE-76) to confirm the index is actually chosen. No speed claim is made here.

---

## P1-3 · The Drizzle schema is missing columns and indexes the cutover created

`a-sprint-cycle-01-expand.sql` and `-03-constrain.sql` add objects that `src/db/schema/build/` never picked up:

| Object | Created by | In Drizzle schema |
|---|---|---|
| `cycles.goal` | `01-expand.sql:55` | no |
| `cycles.deleted_at` | `01-expand.sql:57` | no |
| `idx_sprint_scope_events_org_cycle_created` | `01-expand.sql:97` | no |
| `idx_cycles_project_status_live` | `03-constrain.sql:42` | no |
| `idx_cycles_org_project_velocity_cursor` | `03-constrain.sql:46` | no |
| `idx_tickets_org_cycle_live` | `03-constrain.sql:50` | no |

Three consequences:

1. **`check:tenant-indexes` fails on `build_events.sprint_scope_events`** — the gate reads schema files, where the only declared index is `idx_sprint_scope_events_ticket` on `ticket_id`. It is one of just two failures across 924 tenant tables, so the gate is red for a drift artefact rather than a real missing index.
2. **`cycles` soft delete is unrepresentable.** The table has `deleted_at` in the database and no `deletedAt` in the model, so no Build read filters it and none can. `queryVelocityReport`, the burnup cycle lookup (`projects-reports.service.ts:61-79`) and `projects-analytics.service.ts` `cycleVelocity` all read soft-deleted cycles as live. This violates BE-50 and is why P1-2's partial index is unusable.
3. **A database built from the schema loses all four indexes.** Any cold rebuild — the disposable stack, `check:migration-chain` replay — produces a `cycles` and `sprint_scope_events` without them. Benchmarks taken there under-report.

**FIXED.** `migrations/1155_build_cycles_drift_reconcile.sql` journals the two columns and four indexes, every statement `IF NOT EXISTS` so it is a no-op where phases 01 and 03 already ran and correct on a cold build. `core.ts`, `ticket-core.ts` and `sprint-events.ts` now declare them.

`check:tenant-indexes` went from 2 failures to 1 — `sprint_scope_events` is resolved, and the remaining `impersonation_sessions` is not a Build table.

Two deliberate choices:

- The index definitions are copied **verbatim** from the phase files rather than improved, so an already-migrated database and a cold build end up identical. `idx_cycles_project_status_live` therefore leads with `project_id`, not `org_id`, which is against BE-44. Rewriting it here would make the two diverge silently; it is recorded as open instead.
- The rollback drops the four indexes but **not** the two columns. 1155 only adds them `IF NOT EXISTS`, so on any database where phase 01 ran it created nothing — dropping them would destroy columns this migration did not create, and on a soft-delete column that is data loss, not a schema revert. `a-sprint-cycle-01-expand-rollback.sql` owns them.

`cycles.deleted_at` is never written today: `deleteCycle` (`cycles.service.ts:133`) is a hard delete. So the predicates added in P1-2 are inert on current data and exist to make the partial indexes usable. Nine other cycle reads still lack the predicate — harmless while nothing soft-deletes, and listed under Still open.

---

## P2-1 · The unbounded-reads ledger is red on Build files, and its suppressions are unverified

`pnpm check:unbounded-reads` fails today. Sixteen of the unclassified sites are Build files:

| File | Sites | Verdict this pass reached |
|---|---|---|
| `build/scope-directory/scope-directory.service.ts` | 13 | bounded — every read is `inArray` over ids parsed from `keys`, capped at `z.array(...).min(1).max(26)` (`dto/scope-directory.schemas.ts:12`) |
| `build/core/projects-roadmap.service.ts` | 2 | bounded — `:45` and `:52` are Drizzle sub-selects passed to `inArray`; they render as SQL subqueries and never materialise rows in JS |
| `build/core/project-access.ts` | 1 | bounded — `resolveProjectAssignableMemberships` is `inArray` over a caller-supplied, de-duplicated id list |

Separately, the ledger suppresses 642 unbounded reads against a ceiling of 650 on free-text `FALSE-POSITIVE` justifications dated 2026-09-01. Those justifications are not re-validated, and at least one is now false:

`/build/core/projects-analytics.service.ts` is justified as *"All reads are count/sum/groupBy aggregates … L179 reads projects by inArray(memberProjectIds)"*. There is no `inArray(memberProjectIds)` anywhere in the current file, and the file contains the genuinely unbounded reads listed in P2-2. The gate detects a stale entry only when the **file** disappears, and a regression only for `BOUNDED`/`KEYSET-MIGRATED`/`AGGREGATE`/`STREAM`. A wrong `FALSE-POSITIVE` justification is invisible to it — and that verdict carries 347 of the classified files.

`/build/core/projects-reports.service.ts` is in the same state: its justification describes sprint reads at line numbers that no longer exist. The verdict happens to remain correct; the evidence for it does not.

**Attempted and deliberately reverted. This one needs an owner decision, not a patch.**

All five Build files were verified against source and classified with evidence — `project-access.ts` (bounded by a de-duplicated caller id list), `projects-roadmap.service.ts` (Drizzle sub-selects that never materialise), `scope-directory.service.ts` (the `.max(26)` DTO cap), `ticket-import-reads.ts` (per-project status config set plus a guarded `inArray`), `bugs.service.ts` (`eq(tickets.id, bugId)` plus the same config-set shape).

The gate then failed differently: **`11 newly suppressed unbounded read(s)`**. `FALSE-POSITIVE` is the only verdict that fits a read the detector still sees but which is genuinely bounded, and that verdict is ceiling-capped at 650 against a current 642. Eleven more takes it to 653.

`BOUNDED` is not an escape: the gate treats a `BOUNDED` file that is still detected as a *regression* and fails on that instead.

So classifying these correctly is impossible without raising the ceiling, and this repository's own rule is that raising a ratchet to go green is the defect the ratchet exists to catch. The edit was reverted; the ledger is untouched.

**The decision belongs to whoever owns that ledger**, and it is one of:

1. Raise the ceiling to 653 deliberately, with these eleven named in the commit — the evidence above is ready to paste.
2. Teach the detector to see a `z.array(...).max(n)` DTO cap and an `inArray` over a caller-supplied list, which would stop it flagging four of the five files at all and need no suppression.

Option 2 is the better one and retires a suppression class rather than repricing it.

Separately, the stale-justification problem stands: 642 reads are suppressed on free text dated 2026-09-01, and `projects-analytics.service.ts`'s justification describes an `inArray(memberProjectIds)` read that no longer exists. Recording the file hash beside each justification and re-flagging when it moves would catch that.

---

## P2-2 · Two org-wide Build reads have no pagination

Both are in `backend/src/modules/build/core/projects-analytics.service.ts`:

- **`resourceAllocation`** backs `GET /build/resource-allocation` (`projects-reports.controller.ts:55`). It reads every `ACTIVE` project in the org with no limit, runs an org-wide `UNION` over `tickets` and `ticket_assignees`, reads every distinct assignee from `users`, and returns `[...byMember.values()]` — an unbounded array, sorted in JS. `@ResponseSchema(z.array(...))` confirms there is no envelope and no cursor. This violates BE-24 and BE-132.
- **`getOrgProjectHealthSummary`** aggregates `tickets` and `cycles` across the whole org with no project predicate and no limit, then reads every project row.

**`GET /build/resource-allocation` has no caller.** An exhaustive search across `backend/src` and `frontend` finds the controller, the service, three spec files and the census — and nothing else. No frontend hook, no AI tool, no internal service. It is live, permissioned, module-gated, unbounded, and dead.

That changes the recommendation. Paginating an endpoint nothing calls is contract churn for no reader; the question is whether it should exist. It belongs in the dead-surface process alongside `docs/build-module/DEAD-BUILD-SURFACE-INVENTORY.md`, not in a pagination change.

It was **not** deleted here: removing a Build route trips three disk-bound gates — the route manifest, the authorization census and module-access — all of which read the live tree and all of which are on this task's do-not-touch list.

**Recommendation.** Route `resource-allocation` to dead-surface removal. If it is kept, give it the standard cursor envelope with `PAGE_SIZE_CAP`, keyed on `(org_id, member)`.

`getOrgProjectHealthSummary` does have a caller — `executive-brief.service.ts:175`. It returns five scalars, so bound it rather than paginate: the two aggregates are already grouped, but the `projects` read is uncapped and the summary is assembled in JS rather than SQL.

---

## P2-3 · `check:cache-invalidation`'s three Build findings are false

The gate reports three MEDIUM `namespace-mismatch` findings against `timesheets.service.ts:185, :221, :493`, claiming the `build:billing-summary:*` bump reaches no reader.

It does. `timesheets.service.ts:372` binds `const billingSummaryNs = \`build:billing-summary:${orgId}\`` and `:375` passes that name to `cachedVersioned`. The gate's resolver matches literal arguments only, so the indirection hides the reader.

Confirmed by `build-cache-key-readers.mjs`, which resolves single-assignment `const` bindings and reports zero orphans for this shape.

**FIXED, by moving the code to the gate rather than the gate to the code.** `timesheets.service.ts` now passes the namespace literal inline to `cachedVersioned`. `check:cache-invalidation` went from `FAIL — 3 medium` to `LOW-only — 0 documentation gaps`.

Teaching the resolver single-assignment resolution is still the better long-term fix — the next author to bind a namespace to a name will re-create the false positive. The inline literal is the cheap half; the resolver is the durable half.

---

## P2-4 · Report-revision invalidation is far coarser than the reports depend on

`1073_build_report_revision.sql` attaches `FOR EACH STATEMENT` triggers to `build.tickets`, `build.project_statuses`, `build.sprints`, `build.work_item_relations` and `build_events.sprint_scope_events`. Any statement touching any of them bumps `projects.report_revision`, which is in the cache key of **all five** reports.

A rank change on one backlog ticket therefore invalidates cycle-time, lead-time, critical-path, burnup and velocity — none of which read rank. Cycle-time and lead-time only consider completed tickets in the last twelve weeks; critical-path only reads relations and story points.

The bump also runs `UPDATE build.projects … FOR UPDATE OF p` on the project row. Two concurrent ticket writes in the same project serialise on that row lock for the remainder of their transactions.

**Recommendation.** Needs measurement before change — the write-amplification cost and the cache hit rate are both plan-dependent. Once measured, the shape is a per-report revision column or a revision keyed on the subset each report reads, so a rank change stops evicting cycle-time.

---

## ~~P2-5 · `project_statuses` carries no org-led index~~ — RETRACTED, the index exists

**This finding was wrong and is withdrawn.** It is kept here rather than deleted so the next reader does not rediscover it.

The claim was that `build.project_statuses` declares only `idx_project_statuses_project` on `(project_id)`, leaving the `(org_id, project_id, name)` report join unindexed.

`src/db/schema/build/core.ts:150` declares:

```ts
unique("uniq_project_statuses_org_project_name").on(table.orgId, table.projectId, table.name)
```

applied by `migrations/0146_status_model_single_table.sql:36`. A unique constraint is backed by a unique B-tree index, so `(org_id, project_id, name)` is already indexed — exactly the tuple the four report joins key on. BE-44 and BE-79 are satisfied.

**How the error happened, because it generalises.** The finding came from grepping the schema for `index(` and `uniqueIndex(`. That pattern does not match `unique(`, which is how this index is declared. A text scan for index declarations must cover all three spellings or it under-reports — the same class of blind spot as P2-3 and the census resolver in P2-9.

A migration adding a duplicate index was written and deleted before commit. Nothing shipped.

---

## P2-6 · `listRoadmap` searches with a leading-wildcard `ILIKE`

`backend/src/modules/build/core/projects-roadmap.service.ts:38-41` builds `` `%${query.search}%` `` and applies `ilike` to `roadmapItems.title` and `.description`. A leading wildcard cannot use a b-tree index, and BE-49 requires `to_tsvector` + GIN or `pg_trgm`.

`roadmap_items` has no trigram index today, so this is a scan of the org's roadmap on every search keystroke. `SearchInput` does not debounce for the caller (FE-87), so the caller must.

**Recommendation.** Add a `gin_trgm_ops` index on `title`, and route the search through it. Note that a trigram index under RLS needs `org_id` supplied (BE-79) — and that RLS has previously defeated trigram plans on this schema, so verify the plan rather than assuming the index is used.

---

## P2-7 · Build report query keys live in the accounting domain module

`frontend/hooks/api/build/reports.ts` imports `accountingAndSupportQueryKeys` and reads `projectReports.*` from `frontend/lib/query-keys/accounting-and-support.ts:27-45`. Build's own domain module is `build-work.ts`.

FE-18 exists so a consumer pulls one domain, not the aggregate; importing the wrong domain defeats it in the same way, and couples Build report invalidation to an unrelated file.

The factory is also stale: `burnup: (projectId: number, sprintId?: number)` (`:31`) while the endpoint's query parameter is `cycleId` and the hook passes `cycleId` (`reports.ts:95-98`). The value is right and the name is wrong, which is how the next reader gets it backwards.

**FIXED.** `projectReports` now lives in `build-work.ts`, and the five importers — `reports.ts`, `ticket-cache.ts`, `build-cache-sync.ts` and two tests — read it from there. `ticket-cache.ts` keeps its `accountingAndSupportQueryKeys` import for `ticketActivity`, which genuinely belongs to that domain.

Both modules spread the same `queryKeyBase`, so every key array is **byte-identical** before and after. This is a pure relocation: no cache identity changes, no invalidation prefix moves, nothing to migrate at runtime.

The `sprintId` → `cycleId` rename landed upstream in main's legacy-sprint purge before this change, so only the move remained.

Verified: frontend `type-check` and `type-check:specs` both 0 errors, `check:query-scope` clean over 7,193 files, and 45 suites / 273 tests pass — including `aggregate-import-boundary.test.ts` and `dead-key-factory.test.ts`, which would have caught an orphaned factory.

---

## P2-8 · The velocity report shows one page and does not say so

`GET /build/:projectId/reports/velocity` is cursor-paginated. The controller advertises `Link`, `X-Next-Cursor` and `X-Has-More` (`projects-reports.controller.ts:125-131`) and returns `page.data`.

`useVelocityReport` (`frontend/hooks/api/build/reports.ts:85-92`) sends no `limit` or `cursor`, reads no header, and offers no way to fetch older cycles. Its query key `projectReports.velocity(projectId)` has no cursor segment, so it could not hold a second page if one were fetched (FE-31).

The default `limit` is 100 (`dto/analytics.schemas.ts:12`), so the truncation only bites on projects past 100 cycles. Real, bounded, and silent when it happens.

**Recommendation.** Either declare the cap in the UI, or move the hook to `useInfiniteQuery` with the cursor in the key.

---

## P2-9 · `listRelatedLinks` is the one Build read with no tenant predicate

`backend/src/modules/build/core/projects-ticket-links.service.ts:110-123`:

```ts
.from(ticketRelatedLinks)
.where(eq(ticketRelatedLinks.ticketId, ticketId))
.orderBy(ticketRelatedLinks.createdAt)
.limit(50);
```

The `WHERE` carries `ticket_id` only. Every sibling read in the module supplies `org_id`; this one does not, although the projection selects it and the table declares it.

**This is not a tenant leak.** `assertTicketAccess(u, projectId, ticketId)` runs first and 404s a ticket outside the caller's org, and RLS fences the table independently. It is a performance finding:

- The supporting index is `idx_ticket_related_links_ticket` on `(ticket_id)` alone (`src/db/schema/build/ticket-collaboration.ts:311`) — not org-led, against BE-44.
- BE-79: the RLS policy qual is not leakproof, so with `org_id` absent from both the query and the index, every candidate row is heap-fetched to evaluate `app.current_org_id()`. No index-only scan is possible.

Per-ticket link counts are small, so the cost is bounded — P2, not P1.

Separately, `.limit(50)` with no cursor silently truncates a ticket's related links at 50, the same shape as P2-8.

**FIXED.** `listRelatedLinks` now filters `eq(ticketRelatedLinks.orgId, u.orgId)` alongside the ticket predicate, and `migrations/1154_build_ticket_related_links_org_index.sql` adds `(org_id, ticket_id, created_at)` — `created_at` included so the index also serves the `ORDER BY`. The schema declaration was added in the same change, so schema and database do not drift apart the way P1-3 records.

The two halves only help together: the predicate without the index still cannot do an index-only scan, and the index without the predicate cannot be chosen.

The `.limit(50)` truncation is untouched and remains open.

---

## Verified as sound

Recorded so the next pass does not re-open them.

- **Report cache keys include their response-shaping inputs.** Velocity keys on `limit` and `cursor` (`projects-reports.service.ts:223`); burnup keys on the resolved `cycleId`. BE-120 holds.
- **Report caches are not shared across tenants or scopes.** Every key leads with `orgId`; the payloads are project-wide aggregates behind `assertProjectAggregateAccess`, not actor-scoped projections, so sharing between actors is correct.
- **`billingSummary` keys on the actor and the resolved admin standing** (`timesheets.service.ts:373`), so a permission change moves the key rather than serving another scope's totals.
- **`idx_tickets_org_cycle_live`** is usable by the velocity stats query: it filters `isNull(deletedAt)` and `inArray(cycleId, …)`, and an `IN` list of non-null integers implies `cycle_id IS NOT NULL`.
- **Critical-path is project-scoped.** `workItemRelations` carries no project predicate in its own `WHERE`, but both `INNER JOIN`s pin `tickets.projectId` (`projects-reports.service.ts:387-397`). The project predicate is present, via the join.
- **`resolveScopeDirectory` is input-bounded** at 26 keys and issues a fixed number of queries regardless of input size — it is not an N+1.
- **The velocity response contract matches.** The controller returns an array and puts pagination in headers; `velocityContract` is `z.array(...)`. No drift.
- **Build has no N+1.** The only Build site in the growing-loop detector's list is `build-ticket-batch-workflow.ts:20-21`, flagged because the helper call could not be resolved in-file. `validateBatchTransition` reads the workflow once before the loop and passes `prefetched`, and `assertTransitionAllowed` consults `prefetched.ticketFields` before falling back to a per-ticket read (`projects-tickets-workflow-utils.ts:161-163`). The batch path issues no per-row query. The fallback is correct for single-ticket callers.
- **`listTicketTimeEntries` carries both predicates.** The census marks it `PASSED-UNBOUND` because `projectId` is forwarded through an options spread the resolver does not follow. `listTimeEntries` pushes `eq(timesheets.orgId, …)` and `eq(timesheets.projectId, query.projectId)` (`timesheets.service.ts:87, :108-109`) and pre-validates that the ticket belongs to the project (`:77-79`).
- **`GET /public/whiteboard-links/:token` needs no `orgId`.** The hashed token is the capability, the row must be public and unexpired, and the read runs under the `app.public_token` GUC.

## Still open

Each of these is open for a stated reason, not because it was missed.

- **`deleteCycle` is still a hard delete** (`cycles.service.ts:133`), so `cycles.deleted_at` is never written and all fourteen predicates are inert. Converting it is *not* a one-line change: `tickets.cycle_id` and `sprint_scope_events.cycle_id` are `ON DELETE SET NULL`, so a hard delete currently clears them. A soft delete would leave tickets pointing at an invisible cycle and `projects-activity.service.ts` resolving no name for it. Doing this properly means clearing `tickets.cycle_id` in the same transaction — a data-lifecycle change, not a performance one.
- **P2-4** — the report-revision trigger set is coarser than the reports depend on, and the bump takes `FOR UPDATE` on the project row. Both the write-amplification cost and the cache hit rate are plan-dependent; changing the trigger set on a guess could easily be worse. Needs measurement first.
- **P2-6** — roadmap search. The house answer for text search under RLS is the id-only `SECURITY DEFINER` resolver (BE-80), not a bare trigram index that may never be chosen while taxing every write. Needs a query plan to settle.
- **P2-8** — the velocity chart shows one page of 100 cycles and does not say so. Surfacing it means either a UI cap notice or `useInfiniteQuery`; the hook currently discards the `X-Has-More` header `apiClient.get` does not expose. A product decision, not a defect to patch silently.
- **`listRelatedLinks` truncates at 50** with no cursor — same shape as P2-8.
- **P2-1** — blocked on the ratchet decision above.

## Not verified

- Whether the `1073` triggers and the `a-sprint-cycle-01/03` indexes are installed in any given database. The repository defines them; deploy state needs a live connection and none was used.
- Every plan-dependent claim above. Nothing here rests on a measured query plan, and no figure is quoted as if it were.
- The 25 GET handlers the authorization census marks `NEEDS-REVIEW`. Their open questions are authorization, not performance; this pass read the two whose lead was a scoping gap and left the rest to that lane.

## Observed in passing

`docs/build-module/authorization-census.json` is stale against current source: regenerating it moves 14 `orgEvidence` and `parentEvidence` line numbers in `qa/test-runs.service.ts`, a file the QA lane is actively changing. The verdicts are unaffected — only the line references drift. Noted rather than regenerated, because the census belongs to the authorization lane and a regenerated artefact in this branch would collide with theirs.
