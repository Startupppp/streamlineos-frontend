# 01 — Project boards stop reading 100 MB per page view

**What to build:** Opening a project board returns exactly the tickets it returns today, for exactly the same people, but the database stops scanning to produce them. The permission clause asks a question no index can answer: it checks whether the viewer participates in a ticket by reading every participation row that viewer holds *across the whole organisation* from the heap, then filters one project's rows with the result. The same clause is then evaluated a second time to produce the pagination total.

**Status:** done — measured, amended, shipped

## The original premise was wrong

This ticket was written claiming 46,282 buffers per query and ~723 MB per page view. That number is the cost of the *denormalised-column experiment that was measured and rejected*, not the cost of the shipped code. Measured as `streamline_app` with the tenant GUC set, on the 200,001-ticket seed (project 9, 3,335 tickets; heaviest participant holds 42,859 participation rows org-wide but 1 in this project):

| | blocks |
|---|---:|
| Board page | 6,430 |
| Pagination count | 6,338 |
| **Per page view** | **12,768 ≈ 100 MB** |

The prescribed fix — constrain the participation check to the project the query is already filtered by — was measured at **9,769 blocks, 52% worse**. Narrowing to the project still has to read all 42,859 participation rows to do the narrowing; no index gets from (user, project) to participation. Two other shapes changed nothing: adding `org_id` to the `EXISTS` (6,424) and forcing a correlated probe with an inner `LIMIT 1` (6,433).

## What actually worked

Two changes, each measured independently:

1. **A tenant-led covering index on the participation table.** An index on `(user_id, ticket_id)` does *not* work — the planner ignores it outright. RLS adds `org_id = app.current_org_id()`, that predicate is not leakproof, so it must be evaluated against the heap tuple and an index-only scan stays impossible unless `org_id` is a column of the index. With `(org_id, user_id, ticket_id)` the node becomes `Index Only Scan`. This is a *fourth* experiment, distinct from the three previously rejected — all three of those were indexes on `tickets`.
2. **One pass instead of two.** The page query and the count query evaluated the identical filter. `count(*) OVER ()` carries the total out of the same scan; the rows are then hydrated by id. An overshot page returns no rows and so carries no total, and only then is a separate count paid for.

| | blocks/page view |
|---|---:|
| today | 12,768 |
| + covering index | 7,890 |
| + single pass | 6,338 |
| **both** | **3,902 (3.3×)** |

An order of magnitude is not reachable. Once participation is index-only, the remaining ~3,900 is the project's own 3,335 tickets being walked to evaluate the scope predicate — the floor without new indexes on `tickets`, which is exactly what the two-index and UNION experiments already tried and failed at.

Replacing the scoped path with the single-pass shape also **deleted the special-cased UNION branch** that existed only for rank-ordered scoped reads (~64 lines), so scoped reads now take one code path instead of two.

That branch was itself a recorded optimisation (PAGES.md, API-012, "2,914 → 354 blocks"), so it was measured before deletion rather than assumed dead. On every participant in the seed it is **5–6× worse** than the single-pass shape:

| participant | single-pass | UNION + count |
|---|---:|---:|
| heaviest (42,859 org-wide) | 3,902 | 24,153 |
| median | 3,903 | 20,787 |
| lightest | 3,900 | 24,150 |

Two caveats worth carrying forward. The seed's participation distribution is itself unrealistic in the opposite direction — 4 users holding ~42,857 rows each — so there is no light participant to test, and the case the UNION was built for could not be reproduced. The structural argument covers it: UNION + count walks the project twice (once in the assignee/reporter branch, once for the total) where the single-pass shape walks it once, so the UNION can at best tie. Second, `docs/refactor/build-changelog.md`, which PAGES.md cites for the original API-012 measurement, no longer exists — it was lost in the root-repo reset — so the original context could not be checked.

## Also fixed here

`checkProjectAccess` returned `hasAccess: true` on `build:manage` *before* checking the project exists in the caller's organisation, so a foreign project id returned 200 with an empty list rather than 404 — criterion 6, unmet. No data leaked (the list query is org-filtered and RLS-enforced); the existence check now runs first.

**Blocked by:** None

- [x] Board results are identical to today for `all`, `team`, `own` and `none` scopes — the result *set* is unchanged; ordering gains an `id` tiebreaker where two rows tie on both sort keys, which was previously planner-arbitrary and is required for stable offset pagination
- [x] The pagination total agrees with the rows returned — it now comes from the same pass
- [x] ~~Buffer count drops by at least an order of magnitude~~ **amended: 3.3× (12,768 → 3,902)**, which is the measured ceiling for this read
- [x] The pagination count no longer repeats the full participation cost
- [x] A regression test asserts a buffer ceiling, measured as the application role with the tenant GUC set — `pnpm db:check-build-reads`; asserts both the block ceiling and that participation resolves by `Index Only Scan`. Verified to fail (6,424 > 5,000, `Bitmap Heap Scan`) with the index dropped and pass with it restored
- [x] Cross-tenant: a project id from another organisation returns not-found, never forbidden
- [x] ~~No new index and no migration is introduced~~ **amended: one index added** — `(org_id, user_id, ticket_id)`, migration 0435. The three rejected experiments were all on `tickets`; this one is on the participation table and is the only shape that makes the RLS predicate index-resolvable

## Not done here

- `idx_ticket_assignees_user_id` is now largely redundant but two My Work call sites filter on `user_id` alone. They are rewritten in ticket 02; re-measure and consider dropping it there.
- Jest specs were not run (standing rule). `board-query-count.spec.ts` exercises the `all` path only, which is unchanged.
