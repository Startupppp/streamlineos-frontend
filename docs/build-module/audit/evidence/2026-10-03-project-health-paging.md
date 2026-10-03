# Project health filtering and cursor evidence

Package: `BLD-PROJECT-HEALTH-PAGING-01` under `ARCH-07-COLLECTION-QUERIES`.

Status: Current verified for the focused tests, real Drizzle compilation, and the read-only database observations below. Current unverified for browser acceptance, deployed application parity, large-data performance, and complete role/tenant acceptance.

## Source identity

Captured on 2026-10-03. The query source was uncommitted during measurement. Backend HEAD was `0c4b33141419fd1f2f3222eca1c5ffe4eeb98767`; outer repository HEAD was `1e4ce6dfca65af69049db79075188a61f46989b9`. These hashes identify the shared checkout base, rather than claiming that the working implementation was already in those commits.

The reviewed source was subsequently committed as backend `91eb81f46`. Final backend production typecheck and the scoped dependency graph for all seven relevant query suites exited zero after the severity and request-validation changes.

| Working path, relative to backend | SHA-256 |
|---|---|
| `src/modules/build/core/dto/project-core.schemas.ts` | `41e87e3314c0be1e2af7fdb18817b239f86afd39bf0458a9ea5b14b8949b931b` |
| `src/modules/build/core/project-crud/projects-query.service.ts` | `78a53d6e9b7c611da2fb0d7de2843ac2bc37eedac762a7e781ae6927b5871d94` |
| `src/modules/build/core/project-crud/project-health.ts` | `6ab448ffa0d36d26f9e74a73f0d8531e13cc4000a85aa28421da9de962e91d11` |
| `src/modules/build/core/project-crud/projects-query-health-sort.spec.ts` | `d8553209018b94635dce51ad340b00fca9f318d26200917906482d08d53733cd` |
| `src/modules/build/core/project-crud/project-health-query.spec.ts` | `682bce0a0549be503b077731a033b97f9963e83ffbc74bf17ab9fcd01eb303d4` |
| `src/modules/build/core/project-crud/projects-query-keyset.spec.ts` | `bfe94c9cb43b1a3279b43daab48fe0e8ea4489296536973a06313264ecff0e05` |
| `src/modules/build/core/project-crud/projects-view-scope.spec.ts` | `eae16b36ffd8e04f75892e8710bc11d35d0b35d5d0f1830303ded28abe351176` |

## Changes and compatibility

The health predicate runs before `limit + 1`, using the same actor-scoped lateral ticket aggregate as the returned progress fields. A single SQL statement supplies its health selection and projected progress. Status joins include tenant, project, and status-name equality. Deleted tickets do not contribute; a denied ticket scope compiles to `where false`. Existing project reachability remains in the outer predicate.

Completed and archived projects remain on track. Other overdue projects remain off track. Positive ticket completion percentage is rounded before the existing 30/70 thresholds; zero tickets yield zero percent. One sentinel determines `hasMore`, and the next cursor comes from the last returned row.

Due cursors retain the full timestamp, including six microsecond digits, through the canonical shared timestamp helpers. Existing date-only cursor values and old encoded empty-string null values are accepted. New null cursors use `__null__` inside the unchanged base64url sort-value/NUL/integer-ID envelope. Undated projects appear last in both due sorts. Due ascending breaks ties by ascending ID; due descending breaks ties by descending ID.

Priority sorting uses severity ranks: Urgent 4, High 3, Medium 2, Low 1, unknown persisted values 0, then null. Ties use descending ID. Both ordering and seek use the same generated rank expression. Unknown persisted values retain their original displayed value and receive an opaque `__unknown__` cursor token; business records are not rewritten. DTO writes still accept the four established priorities.

The request DTO rejects an orphaned composite cursor, invalid base64url characters, invalid integer IDs, malformed dates, and unsupported priority cursor values. Valid name cursors retain compatibility with existing long project names. Errors remain ordinary Zod validation errors mapped to HTTP 400.

## Focused verification

The first regression run failed 16 health/cursor cases. Further negative-first cases exposed malformed envelope acceptance, an introduced length-limit compatibility regression, lexical priority ordering, and missing request-boundary validation. Each was repaired before the final focused run.

```powershell
pnpm exec jest src/modules/build/core/project-crud/projects-query-health-sort.spec.ts src/modules/build/core/project-crud/project-health-query.spec.ts src/modules/build/core/project-crud/projects-query-keyset.spec.ts src/modules/build/core/project-crud/projects-view-scope.spec.ts src/modules/build/core/project-crud/projects-none-scope.spec.ts src/modules/build/core/project-crud/projects-query-tenant-isolation.spec.ts src/modules/build/core/project-crud/projects-query-get-project.spec.ts --runInBand
```

Result: seven suites, 67 tests passed. The real Drizzle compilation suite verifies one correlated aggregate, shared projection/filter fields, tenant/status joins, the own predicate, and the denied predicate. Existing list scope, keyset, tenant isolation, and detail tests also pass. Scoped ESLint reports zero errors or warnings on the seven changed backend files.

- [x] Focused negative-first tests and established adjacent suites pass.
- [x] Real Drizzle SQL compiles with one progress aggregate before the limit.
- [x] Scoped lint and diff whitespace checks pass.
- [x] Target application-role read-only EXPLAIN succeeds.
- [x] Final production typecheck passes after the severity-rank/request-validation revisions.
- [x] Final scoped source/test dependency-graph typecheck passes.
- [x] Independent source review is complete.
- [ ] Browser filtering, pagination, refresh, and access acceptance are evidenced.
- [ ] Representative larger-data query cost is evidenced.

## Target database method

The existing IAM-capable `src/scripts/lib/script-sql-client.mjs` helper opened `APP_DATABASE_URL`. The measurement checked `current_user = streamline_app`, opened a `READ ONLY` transaction, set the actual selected organization's `app.organization_id`, set `app.audience = INTERNAL`, and applied a 20-second statement timeout. No fixture, account, grant, or business data was mutated. No URL, token, real identifiers, or record payload is retained here.

The main SQL was captured from the actual `ProjectsQueryService` with real Drizzle builders. Its query execution was intercepted solely to retrieve `.toSQL()` and avoid a separate service read. Fixed `scopeFor` results selected the all/own branches for measurement; this proves the generated scope predicates and application-role RLS execution, not the live permission engine's grant resolution. Each captured main query then ran as `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` under the read-only tenant transaction.

### Observed plans

| Query case | Returned rows | Planning ms | Execution ms | Shared hits | Shared reads | Aggregate nodes / loops | Largest memory sort KB |
|---|---:|---:|---:|---:|---:|---|---:|
| All, default | 2 | 13.853 | 1.607 | 151 | 0 | 1 / 2 | 25 |
| All, on track | 1 | 0.818 | 0.472 | 142 | 0 | 1 / 2 | 25 |
| All, at risk | 0 | 0.713 | 0.489 | 147 | 0 | 1 / 2 | 25 |
| All, off track | 1 | 0.720 | 0.499 | 147 | 0 | 1 / 2 | 25 |
| Own, off track | 1 | 3.377 | 1.939 | 56 | 0 | 1 / 1 | 25 |
| All, due ascending | 2 | 0.691 | 0.476 | 145 | 0 | 1 / 2 | 25 |
| All, microsecond due cursor | 2 | 0.728 | 0.494 | 142 | 0 | 1 / 2 | 25 |
| All, null due cursor | 1 | 0.698 | 0.428 | 123 | 0 | 1 / 1 | 25 |
| All, priority descending | 2 | 0.712 | 0.481 | 142 | 0 | 1 / 2 | 25 |
| All, unknown priority cursor | 2 | 0.720 | 0.467 | 142 | 0 | 1 / 2 | 25 |

All-scope plans selected `idx_tickets_org_project_rank_covering` and `uniq_org_members_org_id`. The own-scope plan selected `idx_tickets_org_project_status`, `idx_project_team_members_org_membership`, `uniq_project_team_assignments_org_id`, and `uniq_org_members_user_org`, in addition to the manager-membership index. The single aggregate node executes once per candidate project as a lateral subquery; it is not a second independently scoped aggregate.

A separate read-only SELECT over inline constant VALUES reused the ORDER BY expression extracted from the generated priority query, including its bound rank parameters. It returned Urgent → High → High → Medium → Low → unknown → null and checked descending IDs for the two equal High values. These rows existed only inside the SELECT.

The selected tenant currently exposes two projects. These results confirm SQL validity and current small-data read cost. They do not establish production p95, cold I/O, large-tenant throughput, or scaling behavior when health selection must inspect many candidate projects.

### Generated on-track SQL

Whitespace is formatted for reading; identifiers, projections, predicates, joins, ordering, and binds are the generated main query.

```sql
select "build"."projects"."id", "build"."projects"."name",
  "build"."projects"."description", "build"."projects"."key",
  "build"."projects"."status", "build"."projects"."priority",
  "build"."projects"."start_date", "build"."projects"."end_date",
  to_char("build"."projects"."end_date", 'YYYY-MM-DD"T"HH24:MI:SS.US'),
  "total", "done", "percentage", "build"."projects"."managed_product_id",
  "organization_members"."user_id", "users"."first_name",
  "users"."last_name", "users"."image"
from "build"."projects"
left join "organization_members" on (
  "organization_members"."org_id" = "build"."projects"."org_id"
  and "organization_members"."id" = "build"."projects"."manager_membership_id")
left join "users" on "organization_members"."user_id" = "users"."id"
inner join lateral (
  select count(*) as "total",
    count(*) filter (where "build"."project_statuses"."type" = 'completed') as "done",
    coalesce(round(100.0 * count(*) filter (
      where "build"."project_statuses"."type" = 'completed')
      / nullif(count(*), 0)), 0) as "percentage"
  from "build"."tickets"
  left join "build"."project_statuses" on (
    "build"."project_statuses"."org_id" = "build"."tickets"."org_id"
    and "build"."project_statuses"."project_id" = "build"."tickets"."project_id"
    and "build"."project_statuses"."name" = "build"."tickets"."status")
  where ("build"."tickets"."org_id" = $1 and true
    and "build"."tickets"."project_id" = "build"."projects"."id"
    and "build"."tickets"."deleted_at" is null)
) "project_ticket_progress" on true
where ("build"."projects"."org_id" = $2 and true
  and "build"."projects"."deleted_at" is null
  and ("build"."projects"."status" in ($3, $4)
    or (("build"."projects"."end_date" is null
      or "build"."projects"."end_date" >= $5) and "percentage" >= $6)))
order by "build"."projects"."id" desc limit $7
```

`$1/$2` bind the tenant; `$3/$4` bind Completed/Archived; `$5` binds the shared request clock; `$6` binds 70; `$7` binds the requested page size plus one. The derived `percentage` column is unique in these joined relations, so Drizzle's unqualified alias resolves to the lateral projection.
