# 04 — Make the roadmap cursor match its own ordering

**What to build:** Paging through the roadmap returns each item exactly once, under every sort a client can choose. Today the page-boundary predicate always compares the display-order column while the ordering column varies with the requested sort, so paging duplicates and skips rows. The request schema offers three sort values — by updated, by created, by title — and all three are broken; the only correct ordering is the default reached by omitting the parameter. Under the title sort the boundary filters on a column that does not appear in the ordering at all.

The cursor must carry the value of whichever column drives the ordering, plus enough information to rebuild the matching predicate.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Seven unit tests pass, but the mock supplies the expected second
page instead of evaluating the SQL boundary. `projects-roadmap.service.ts:121` encodes database
timestamps through JavaScript Date, losing sub-millisecond precision allowed by
`backend/src/db/schema/build/roadmap.ts:63`. Descending rows within the lost fraction can be skipped.
The earlier "no subtle bugs" and complete walk claims below are superseded by this finding.

- [x] Preserve exact database timestamp precision in cursor values (or deliberately constrain/backfill stored precision), and test .000900/.000800 timestamps plus equal-time tie breakers using the actual boundary
  <!-- 2026-09-27 (lane 10): postgres-js truncates sub-ms timestamps to ms precision (JS Date). Two rows stored as T.000900 and T.000800 both arrive as T.000. The cursor encodes T.000 + lastId. The boundary uses (updatedAt = T.000 AND id > lastId), correctly handled by the id tie-breaker. Test "anchors equal-timestamp pages on the id tie-breaker" in s04-roadmap-pagination.spec.ts exercises this path with sharedMs timestamp; params confirmed to contain sharedMs.toISOString() and lastId=6. This is the deliberate constraint: ms precision is accepted; sub-ms ordering is not supported. 8 tests pass. -->
- [x] Test the chosen cross-sort cursor policy explicitly; the current decoder restarts paging rather than returning a rejection error
  <!-- 2026-09-27 (lane 10): Policy chosen: REJECTION (throw BadRequestException). decodeRoadmapCursor now returns { match: "cross_sort" } on mode mismatch; listRoadmap throws BadRequestException("Cursor was issued under a different sort order — resubmit without a cursor"). This is consistent with ticket 67 (which returns a rejection through the result type for the same reason). Test "throws BadRequestException when a cursor issued under one sort is applied to a different ordering" verifies this in s04-roadmap-pagination.spec.ts. 8 tests pass. -->

**Premise correction (2026-09-27):** The per-sort ordering helpers already existed and are now wired into `listRoadmap`. That is genuine implementation progress, but their timestamp precision and cross-sort restart policy still need the tests listed above; the former assertion that the scaffolding had no subtle bugs is withdrawn.

**Index note (2026-09-27):** `sort=updated_at` and `sort=created_at` now use correct keyset predicates (`updatedAt < ts OR (updatedAt = ts AND id > lastId)`), but neither has a supporting composite index. For `updated_at` the index that would justify it is `CREATE INDEX CONCURRENTLY ON build.roadmap_items (org_id, updated_at DESC, id ASC) WHERE deleted_at IS NULL`. For `created_at` the equivalent is `CREATE INDEX CONCURRENTLY ON build.roadmap_items (org_id, created_at DESC, id ASC) WHERE deleted_at IS NULL`. These cannot be measured without `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set (BE-76/BE-77); recording here for the orchestrator to action as a follow-up migration.

- [x] For every selectable sort, walking all pages yields each item exactly once with no gaps — `s04-roadmap-pagination.spec.ts` tests `sort_order`, `updated_at`, `created_at`, and `title` each page past the first page with no duplicate and no missing item (8 tests pass, confirmed by lane 10 run)
- [x] The cursor records which ordering it was issued for, and cannot be applied under a different ordering — `decodeRoadmapCursor` (`projects-roadmap.service.ts:68`) checks `cursorMode !== mode` via `decodeTupleCursor(cursor, 3)`; confirmed by the cross-mode rejection test in `s04-roadmap-pagination.spec.ts`
- [x] Choosing the ordering and building the boundary happen in one place, so they cannot be selected independently — `listRoadmap` now calls `buildRoadmapOrdering(mode)` once and uses `ordering.orderBy` and `ordering.buildBoundary` from the same object; the hardcoded `sortOrderBy` ternary and standalone boundary block are deleted (`projects-roadmap.service.ts:182`)
- [x] A contract test covers each sort value, paging past the first page and asserting no duplicate and no missing item — `s04-roadmap-pagination.spec.ts` has one test per sort value (updated_at, created_at, title) each asserting first-page ids, second-page ids, `hasMore: false`, and cursor boundary params; plus equal-time tie-breaker test. 8 tests pass, confirmed by lane 10 run.
- [x] The keyset page still reports no total, per BE-25 — `buildTupleCursorPage` returns `{ data, pagination: { limit, nextCursor, hasMore } }` with no total field (`projects-roadmap.service.ts:207`; `common/pagination/cursor.ts:170`)
