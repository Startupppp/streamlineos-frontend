# 17: Cursor-page HR performance reviews

**What to build:** Performance review lists use validated filters and stable cursors while preserving own/team/all DataScope behavior.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Primitive limit/offset inputs are replaced by a Zod list contract.
- [x] Cursor order includes the requested sort and unique tie-breaker.
- [x] Optional employee filtering cannot widen the caller's DataScope.
- [x] Pagination stability, scope denial and query-plan tests pass.

## Changes

- `backend/src/modules/hr/performance/dto/performance.schemas.ts` — `listPerformanceReviewsSchema`: `userId`, `cycleId`, `status`, `sortField` (`createdAt` | `periodStart`), `sortDir`, `limit` (`pageSizeField(50)`, cap 100), `cursor`.
- `backend/src/modules/hr/performance/performance.controller.ts` — `GET /hr/performance/reviews` takes one `ZodValidationPipe(listPerformanceReviewsSchema)` query instead of four raw `@Query` strings.
- `backend/src/modules/hr/performance/performance-reviews.service.ts` — `listReviews` keysets on `(sort, id)` via `buildCursorPage`/`decodeCursor`, projects explicit columns instead of `with: { cycle: true }`, and pushes the `userId` filter as an ordinary AND beside the scope predicate. `createReview` awaits `notifyReviewAssigned` instead of `void`-ing it.
- `backend/src/common/pagination/keyset.ts` — added `keysetBeforeValue`, `keysetAfterId`, `keysetBeforeId`. The pre-existing helpers bind the tie-breaker verbatim, which is correct only for a text id; `performance_reviews.id` is an integer.
- `backend/src/db/schema/hr/performance.ts` + `backend/migrations/0639_perf_reviews_cursor_indexes.sql` — three tenant-leading keyset indexes.
- Frontend: `hooks/api/hr/hr-settings.ts` (params + `PerformanceReviewPage` + `keepPreviousData`), `features/hr/performance/reviews-tab.tsx` (server-side status filter, cursor-history stack, shared `CursorPageControls`), `types/hr/performance.ts` (`PerformanceReviewListItem`, `PerformanceReviewPage`), `lib/query-keys/human-resources.ts` (`performanceReviews(params)` + `performanceReviewsAll` prefix).

## Findings

- The employee filter was applied only when `scope === "all"`, so a manager on `team` scope who filtered to one report silently got the whole team. Narrowing cannot widen, so the gate was both useless and wrong; the filter is now unconditional and the scope predicate is always ANDed.
- `createReview` fired `void this.notifyReviewAssigned(...)` with a `try/catch` that logged "Failed to send review assigned email". That continuation runs after the request transaction has committed, so under RLS its reads die `42501` and the log line blamed mail for a notification that was never written.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/hr/performance/performance-reviews-list.spec.ts` (backend):

```
PASS src/modules/hr/performance/performance-reviews-list.spec.ts (45.5 s)
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

Covers: `none` scope emits `false` in SQL; `own` scope binds the actor; the employee filter keeps the scope predicate; org predicate always present; `limit + 1` over-fetch; `ORDER BY created_at desc, id desc`; the cursor is one row-comparison tuple with no bare `Date` parameter; the date sort binds as a string; `nextCursor` comes from the last kept row, not the sentinel; end-of-list; and the schema caps at 100, rejects an unlisted sort field and defaults to newest-first.

`node ./node_modules/jest/bin/jest.js features/hr/performance/reviews-tab-pagination.test.tsx` (frontend):

```
Tests:       3 passed, 3 total
```

Query plans, measured as `streamline_app` (non-BYPASSRLS) with `app.organization_id` set, against 203,000 seeded reviews in one organization plus 20,000 in a second — `node src/scripts/check-hr-list-read-cost.mjs`:

```
org aa5627a2-a7de-4dca-97d2-135f3a5f801b · 203000 performance reviews · cursor at row 5000
reviews-page-1               blocks=     294 (ceiling 2000) Index Scan using idx_perf_reviews_org_created_id
reviews-page-deep-cursor     blocks=     415 (ceiling 2000) Index Scan using idx_perf_reviews_org_created_id
reviews-own-scope-cursor     blocks=     186 (ceiling 2000) Index Scan using idx_perf_reviews_org_user_created_id SORT
reviews-offset-baseline      blocks=   14301 (baseline)
OK
```

The offset baseline is the query this ticket replaced, at the same depth: 14,301 blocks against 415, and the offset cost grows with depth while the cursor cost does not.

Two measurement notes, both recorded because they nearly produced a false result:

1. The first run reported 6,075 blocks with `Rows Removed by Filter: 24820` — the row comparison had been demoted from an Index Cond to a Filter. The cause was the harness, not the application: it bound the cursor timestamp as a JS `Date`, which postgres-js sends as `timestamptz`, and a cross-type row comparison is not indexable. Drizzle binds through the column encoder, which produces the text form for a `timestamp` column. The harness now binds the way the application does.
2. `reviews-own-scope-cursor` shows a `Sort` node. It is the planner choosing a merge join for the reviewer join on a 31-row result and re-sorting those 31 rows, not a missing index — the `performance_reviews` access is still an Index Scan on the tenant-leading index and the whole query is 186 blocks. The check fails on a sort only when it is large enough to matter.

Fixture: `node src/scripts/seed-hr-list-read-scale.mjs --seed|--purge|--count` (`VACUUM ANALYZE` included, because a bulk load leaves stale statistics and an empty visibility map).

## Not done

- `db:migrate` was not run. `0639` was applied with `scripts/apply-migration-file.mjs` and verified against `pg_indexes`, because the shared journal currently carries several other sessions' in-flight entries and running the migrator would apply their work to the dev database. The entry is stamped above the live watermark so the migrator will apply it.
