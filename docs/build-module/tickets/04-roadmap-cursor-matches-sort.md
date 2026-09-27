# 04 — Make the roadmap cursor match its own ordering

**What to build:** Paging through the roadmap returns each item exactly once, under every sort a client can choose. Today the page-boundary predicate always compares the display-order column while the ordering column varies with the requested sort, so paging duplicates and skips rows. The request schema offers three sort values — by updated, by created, by title — and all three are broken; the only correct ordering is the default reached by omitting the parameter. Under the title sort the boundary filters on a column that does not appear in the ordering at all.

The cursor must carry the value of whichever column drives the ordering, plus enough information to rebuild the matching predicate.

**Blocked by:** None — can start immediately.

**Status:** done

**Premise correction (2026-09-27):** The ticket describes building keyset logic from scratch. That logic already existed and was never called. `projects-roadmap.service.ts` contained `RoadmapSortMode`, `RoadmapPageKey`, `RoadmapOrdering`, `sortModeFromQuery`, `decodeRoadmapCursor`, and `buildRoadmapOrdering` (complete per-mode `orderBy` plus matching `buildBoundary`). The work was to wire these into `listRoadmap` and delete the hardcoded path, not to write new logic. The dead scaffolding was correct as found — no subtle bugs.

**Index note (2026-09-27):** `sort=updated_at` and `sort=created_at` now use correct keyset predicates (`updatedAt < ts OR (updatedAt = ts AND id > lastId)`), but neither has a supporting composite index. For `updated_at` the index that would justify it is `CREATE INDEX CONCURRENTLY ON build.roadmap_items (org_id, updated_at DESC, id ASC) WHERE deleted_at IS NULL`. For `created_at` the equivalent is `CREATE INDEX CONCURRENTLY ON build.roadmap_items (org_id, created_at DESC, id ASC) WHERE deleted_at IS NULL`. These cannot be measured without `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set (BE-76/BE-77); recording here for the orchestrator to action as a follow-up migration.

- [x] For every selectable sort, walking all pages yields each item exactly once with no gaps — `s04-roadmap-pagination.spec.ts` tests `sort_order`, `updated_at`, `created_at`, and `title` each page past the first page with no duplicate and no missing item (7 tests pass)
- [x] The cursor records which ordering it was issued for, and cannot be applied under a different ordering — `decodeRoadmapCursor` (`projects-roadmap.service.ts:68`) checks `cursorMode !== mode` via `decodeTupleCursor(cursor, 3)`; confirmed by the cross-mode rejection test in `s04-roadmap-pagination.spec.ts`
- [x] Choosing the ordering and building the boundary happen in one place, so they cannot be selected independently — `listRoadmap` now calls `buildRoadmapOrdering(mode)` once and uses `ordering.orderBy` and `ordering.buildBoundary` from the same object; the hardcoded `sortOrderBy` ternary and standalone boundary block are deleted (`projects-roadmap.service.ts:182`)
- [x] A contract test covers each sort value, paging past the first page and asserting no duplicate and no missing item — `s04-roadmap-pagination.spec.ts` has one test per sort value (updated_at line 79, created_at line 107, title line 133) each asserting first-page ids, second-page ids, `hasMore: false`, and cursor boundary params
- [x] The keyset page still reports no total, per BE-25 — `buildTupleCursorPage` returns `{ data, pagination: { limit, nextCursor, hasMore } }` with no total field (`projects-roadmap.service.ts:207`; `common/pagination/cursor.ts:170`)
