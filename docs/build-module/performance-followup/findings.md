# Build performance and caching — findings

Severity is blast radius, not effort. P0 breaks a write path or serves wrong data. P1 costs real work on a hot path or disarms a gate. P2 is debt with a bounded cost.

Every row cites source. No latency, buffer or row-count figure is claimed anywhere — none was measured.

---

## P0-1 · Pending Sprint/Cycle DDL silently breaks the report-revision trigger

**Owner: Sprint/Cycle lane. Not actioned by this pass.**

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

**Recommendation.** Ship a migration that replaces `build.bump_report_revision()` before `04-detach` runs, rewriting the branch against `cycle_id` and `build.cycles`:

```sql
affected := 'SELECT DISTINCT c.org_id, y.project_id FROM (' || changed || ') c
             JOIN build.cycles y ON y.org_id = c.org_id AND y.id = c.cycle_id';
```

Sequence it as a phase `03b` so it lands between `constrain` and `detach`. Add the integrity check to the detach runbook.

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

**Recommendation.** Decide one way and make the code say it. Either inject `CacheService` and wrap `computeProjectAnalytics` in `cachedVersioned` under namespace `build:analytics:<orgId>` — at which point the nine evictions become `invalidateNamespace` and start working — or delete all nine `del` calls. Leaving them is the worst of both: the cost of invalidation with none of the benefit.

Prefer the first. The read is the heaviest uncached aggregate in the module and the invalidation sites already exist at exactly the right places.

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

**Recommendation.** Drop the casts. `date` ordering and `timestamp` ordering agree, so `orderBy(desc(cycles.startDate), desc(cycles.id))` is equivalent and sargable. Add `isNull(cycles.deletedAt)` to the `WHERE` once P1-3 makes the column representable. Both changes together make the existing index usable with no new DDL.

Needs measurement before and after: `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set (BE-76).

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

**Recommendation.** Reconcile `src/db/schema/build/core.ts` and `sprint-events.ts` with the four indexes and two columns, then add `isNull(cycles.deletedAt)` to every Build read of `cycles`. This is a Sprint/Cycle lane change; it is recorded here because the caching consequence is P1-2.

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

**Recommendation.** Classify the sixteen Build sites so the gate goes green on the strength of the caps named above, not on a raised ceiling. Then add a staleness signal for `FALSE-POSITIVE`: record the file hash alongside the justification and re-flag when it moves. The classification file is a shared ledger and was not edited by this pass.

---

## P2-2 · Two org-wide Build reads have no pagination

Both are in `backend/src/modules/build/core/projects-analytics.service.ts`:

- **`resourceAllocation`** backs `GET /build/resource-allocation` (`projects-reports.controller.ts:55`). It reads every `ACTIVE` project in the org with no limit, runs an org-wide `UNION` over `tickets` and `ticket_assignees`, reads every distinct assignee from `users`, and returns `[...byMember.values()]` — an unbounded array, sorted in JS. `@ResponseSchema(z.array(...))` confirms there is no envelope and no cursor. This violates BE-24 and BE-132.
- **`getOrgProjectHealthSummary`** aggregates `tickets` and `cycles` across the whole org with no project predicate and no limit, then reads every project row.

**Recommendation.** Give `resource-allocation` the standard cursor envelope with `PAGE_SIZE_CAP`, keyed on `(org_id, member)`. `getOrgProjectHealthSummary` returns five scalars, so bound it instead: the two aggregates are already grouped, but the `projects` read should be capped and the summary computed in SQL.

---

## P2-3 · `check:cache-invalidation`'s three Build findings are false

The gate reports three MEDIUM `namespace-mismatch` findings against `timesheets.service.ts:185, :221, :493`, claiming the `build:billing-summary:*` bump reaches no reader.

It does. `timesheets.service.ts:372` binds `const billingSummaryNs = \`build:billing-summary:${orgId}\`` and `:375` passes that name to `cachedVersioned`. The gate's resolver matches literal arguments only, so the indirection hides the reader.

Confirmed by `build-cache-key-readers.mjs`, which resolves single-assignment `const` bindings and reports zero orphans for this shape.

**Recommendation.** Teach the gate's resolver the same single-assignment resolution. Until then the gate is red for a non-defect, which is how a real namespace mismatch gets ignored.

---

## P2-4 · Report-revision invalidation is far coarser than the reports depend on

`1073_build_report_revision.sql` attaches `FOR EACH STATEMENT` triggers to `build.tickets`, `build.project_statuses`, `build.sprints`, `build.work_item_relations` and `build_events.sprint_scope_events`. Any statement touching any of them bumps `projects.report_revision`, which is in the cache key of **all five** reports.

A rank change on one backlog ticket therefore invalidates cycle-time, lead-time, critical-path, burnup and velocity — none of which read rank. Cycle-time and lead-time only consider completed tickets in the last twelve weeks; critical-path only reads relations and story points.

The bump also runs `UPDATE build.projects … FOR UPDATE OF p` on the project row. Two concurrent ticket writes in the same project serialise on that row lock for the remainder of their transactions.

**Recommendation.** Needs measurement before change — the write-amplification cost and the cache hit rate are both plan-dependent. Once measured, the shape is a per-report revision column or a revision keyed on the subset each report reads, so a rank change stops evicting cycle-time.

---

## P2-5 · `project_statuses` carries no org-led index for the join four reports use

`src/db/schema/build/core.ts:148` declares one index: `idx_project_statuses_project` on `(project_id)`.

Four Build reads join it on `(org_id, project_id, name)` — cycle-time (`projects-reports.service.ts:302-306`), lead-time (`:338-342`), `snapshot` (`:236-243`) and velocity's stats query (`projects-velocity-report.ts:34-36`).

Under RLS the policy qual on `org_id` is not leakproof, so `org_id` must be inside the covering index for an index-only scan (BE-79). It is not. BE-44 also requires the composite to lead with `org_id`.

Per-project status counts are small, so the cost is bounded — this is P2, not P1.

**Recommendation.** `index("idx_project_statuses_org_project_name").on(orgId, projectId, name)`, declared in the schema and shipped as a journalled migration.

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

**Recommendation.** Move `projectReports` into `build-work.ts`, rename the parameter to `cycleId`, and update the importers. Shared frontend components were out of scope for this pass; the key factory is not a component, but the move touches `ticket-cache.ts`, so it belongs with the Build coordinator's frontend lane.

---

## P2-8 · The velocity report shows one page and does not say so

`GET /build/:projectId/reports/velocity` is cursor-paginated. The controller advertises `Link`, `X-Next-Cursor` and `X-Has-More` (`projects-reports.controller.ts:125-131`) and returns `page.data`.

`useVelocityReport` (`frontend/hooks/api/build/reports.ts:85-92`) sends no `limit` or `cursor`, reads no header, and offers no way to fetch older cycles. Its query key `projectReports.velocity(projectId)` has no cursor segment, so it could not hold a second page if one were fetched (FE-31).

The default `limit` is 100 (`dto/analytics.schemas.ts:12`), so the truncation only bites on projects past 100 cycles. Real, bounded, and silent when it happens.

**Recommendation.** Either declare the cap in the UI, or move the hook to `useInfiniteQuery` with the cursor in the key.

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

## Not verified

- Whether the `1073` triggers and the `a-sprint-cycle-01/03` indexes are installed in any given database. The repository defines them; deploy state needs a live connection and none was used.
- Every plan-dependent claim above. Nothing here rests on a measured query plan, and no figure is quoted as if it were.
