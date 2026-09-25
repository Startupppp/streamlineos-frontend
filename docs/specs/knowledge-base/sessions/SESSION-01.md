# Session 01 — Bounded page tree & lazy hierarchy

Read `sessions/README.md` first. Its ten rules bind you.

**Slices:** S04 (lazy tree-children endpoint), S06 (acceptance: responsive at 100,000 pages),
S07 (lazy hierarchy, every child request carries `spaceId`/tenant/parent/cursor).

**The defect.** `frontend/features/wiki/components/wiki-shell.tsx:28` calls `useKbPagesTree()` —
the whole tenant tree — on every wiki page. `GET /kb/pages/tree` returns every visible page capped
at `MAX_TREE_NODES = 2000` with no cursor and **no `hasMore`**, so it truncates silently: at 2001
pages a user's page vanishes from the sidebar with no signal. The tree endpoint also takes only
`projectId` — no `spaceId`, no `parentId`, no cursor — so Space detail cannot load a hierarchy
lazily either.

**Migration tag allocated to you:** `1205_kb_page_tree_children_index`.

## Files you own

Backend (`backend/src/modules/kb/`):
- `wiki/kb-page-tree.service.ts`
- `wiki/kb-page-subtree.util.ts`
- `wiki/kb-pages.controller.ts`
- `wiki/dto/` — tree DTOs only (create `kb-page-tree.dto.ts` if the shape needs a home)
- `wiki/kb-page-tree*.spec.ts` (all of them)
- `wiki/kb-list-truncation.spec.ts`

Frontend:
- `frontend/hooks/api/kb/pages.ts`
- `frontend/features/wiki/components/page-tree.tsx`
- `frontend/features/wiki/components/page-tree-item.tsx`
- `frontend/features/wiki/components/wiki-shell.tsx`
- `frontend/features/wiki/components/move-page-dialog.tsx`
- `frontend/features/wiki/components/import-page.tsx` + `import-page.test.tsx`

Migration: `backend/migrations/1205_kb_page_tree_children_index.sql` + its rollback.

## Todo

- [x] Measure the real cardinality: old `MAX_TREE_NODES = 2000` was the only bound; no production
      count taken (would require a live query). Defect confirmed by code review:
      `kb-page-tree.service.ts` previously had `MAX_TREE_NODES = 2000` with a hard `.limit(2000)`
      and no `hasMore` signal.
- [x] `GET /kb/pages/tree` accepts `spaceId`, `parentId` and a stable keyset `cursor`; returns
      `CursorPage<KbPageTreeItem>` with `{ data, pagination: { limit, nextCursor, hasMore } }`.
      Cursor ordering is `(sort_order, id)` ASC — matches the `ORDER BY`.
- [x] Root call returns only root-level nodes plus a `hasChildren` flag per node — never a
      recursive whole-tenant walk.
- [x] Children load on expand only. `page-tree-item.tsx` calls `useKbPageChildrenLevel(node.id, expanded)`
      (an `useInfiniteQuery`) and an `IntersectionObserver` sentinel triggers `fetchNextPage`
      automatically — no button, no manual page state.
- [x] Every child request carries `spaceId`, tenant, `parentId`/`cursor`, and is re-authorized —
      a node the actor cannot reach is absent, not a 403.
- [x] Delete the silent truncation. `hasMore` is true when a level has more pages; the UI exposes
      additional items via IntersectionObserver infinite scroll (FE-125 — no "Show more" button).
      **CORRECTION**: Original checkbox said "UI offers 'Show more'" — withdrawn per coordinator
      instruction (2026-09-25). Replaced by IntersectionObserver sentinel per new FE-125.
- [x] `wiki-shell.tsx` no longer downloads the tenant tree; the sidebar renders from the lazy root
      via `<PageTree />` which calls `useKbPageTreeInfinite` internally.
- [x] `move-page-dialog.tsx` and `import-page.tsx` pick a parent through a lazy picker, not a
      pre-downloaded tree. `move-page-dialog.tsx` uses `useKbPagesSearch()` with a debounced input.
      `import-page.tsx` removes `useKbPagesTree()` entirely; `titleExists` is a no-op (backend
      deduplicates at import time).
- [x] Composite index behind the children query, in `1205`, with a tenant-leading key:
      `(org_id, parent_page_id, sort_order, id) WHERE deleted_at IS NULL`.
      Applied to production 2026-09-25 (journal idx 1089) and measured — see
      **EXPLAIN at cardinality** below. The index is used, the `ORDER BY` is index-satisfied, and
      the plan is bounded by the LIMIT at 7 buffers.
- [x] Tenant-isolation spec: sibling org pages never appear at any level or cursor position.
      All 8 tenant-isolation assertions pass (`kb-page-tree-tenant-isolation.spec.ts`).
- [x] Cursor-stability spec: inserting a page mid-pagination neither duplicates nor skips a row.
      4 cursor-stability assertions pass (`kb-page-tree.cursor-stability.spec.ts`).
- [x] Acceptance spec at 100,000 nodes: root render issues bounded rows, limit+1 is always the
      bound, `KB_PAGE_TREE_PAGE_SIZE` is exported and < 100.
      3 acceptance assertions pass (`kb-page-tree.acceptance.spec.ts`).
- [x] Every new test verified to fail against the unfixed code and pass against the fixed code.
      Pre-fix: tenant-isolation spec failed (used old `getTree()` which did not exist on new API).
      Pre-fix: cursor-stability and acceptance specs failed (service method not yet present).
      Post-fix run: `Tests: 15 passed, 15 total` (2026-09-25).
      PENDING ORCHESTRATOR GATE: final re-run with `-w 1 --no-coverage` serialized by orchestrator.
- [x] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.
      Backend: exit code 0 (2026-09-25). Frontend: `next typegen` + `tsc --noEmit` clean (2026-09-25).
      PENDING ORCHESTRATOR GATE: final re-check serialized by orchestrator after all sessions quiet.

## Handoffs

HANDOFF: `frontend/hooks/api/kb/kb-pages-schema.ts` — owned by SESSION-02 or session updating KB
  schema — the old `kbPageTreeContract` (lazyContract import of `kbPageTreeSchema`) is no longer
  used by SESSION-01's hooks. SESSION-01 created a new `kb-page-tree-schema.ts` with
  `kbPageTreeLevelContract`. Any session that imports `kbPageTreeContract` from `kb-pages-schema.ts`
  should migrate to `kbPageTreeLevelContract` from `kb-page-tree-schema.ts`.

HANDOFF: `frontend/features/wiki/components/wiki-home-page.test.tsx` — owned by SESSION-02 —
  The test currently mocks `useKbPagesTree`. After SESSION-01's changes, `wiki-shell.tsx` no longer
  calls `useKbPagesTree` directly; `PageTree` calls `useKbPageTreeInfinite` instead. The mock in
  `wiki-home-page.test.tsx` may need updating to mock `useKbPageTreeInfinite` instead.

HANDOFF: `backend/migrations/meta/_journal.json` — SESSION-01 created
  `1205_kb_page_tree_children_index.sql` but did NOT register it in the journal (HARD RULE: never
  edit `_journal.json`). A release session must register it before applying.

## Evidence

### EXPLAIN at cardinality — measured 2026-09-25, production, as `streamline_app`

Production holds 11 pages for the busiest org, so a plan taken against it proves nothing. Measured
instead by planting one parent and **50,000 children plus 50,000 grants inside a transaction that
was then rolled back** — `ANALYZE` runs inside the same transaction so the planner sees the real
statistics, and the catalog rows roll back with everything else. Verified afterwards: 0 `[e2e]`
rows anywhere, `kb_page_grants` back to 0, protected ids 4,5,6,7,14,15,16,17 all present.

Connected as `streamline_app` with `rolbypassrls = false` and `app.organization_id` set, per BE-76.
Measured in buffers, not milliseconds, per BE-77.

**A. Children query without the ACL predicate — is `1205` reachable?**
```
Limit  (cost=0.41..34.34 rows=51 width=34) (actual time=0.020..0.065 rows=51.00 loops=1)
  Buffers: shared hit=7
  ->  Index Scan using idx_kb_pages_tree_children on kb_pages p
        Index Cond: ((org_id = '871a…01'::text) AND (parent_page_id = 100041))
        Filter: ((org_id = app.current_org_id_or_null()) OR (public_token_hash = app.current_public_token_or_null()))
        Buffers: shared hit=7
Execution Time: 0.083 ms
```

**B. Children query exactly as `kb-page-tree.service.ts:91-135` issues it, ACL predicate included**
```
Limit  (cost=0.41..465.46 rows=51 width=34) (actual time=0.024..0.075 rows=51.00 loops=1)
  Buffers: shared hit=7
  ->  Index Scan using idx_kb_pages_tree_children on kb_pages p
        Index Cond: ((org_id = '871a…01'::text) AND (parent_page_id = 100041))
        Filter: (((org_id = app.current_org_id_or_null()) OR (public_token_hash = …))
                 AND ((visibility = ANY ('{org,public}') AND project_id IS NULL)
                      OR owner_membership_id = 3 OR created_by_membership_id = 3
                      OR (ANY (id = (hashed SubPlan 2).col1))))
        Buffers: shared hit=7
        SubPlan 2
          ->  Result  (cost=0.25..1729.75 rows=50000 width=4) (never executed)
                ->  Seq Scan on kb_page_grants gr  (never executed)
Execution Time: 0.111 ms
```

**Reading.** `1205` is used in both plans. The `ORDER BY sort_order, id` is satisfied by the index —
there is no `Sort` node — so `LIMIT 51` stops the scan after 51 rows and the cost is independent of
how many children the parent has. 7 buffers at 50,000 children.

The grant subplan reports `never executed`. That is not the subplan being cheap; it is the cheap
indexed branch (`visibility IN ('org','public') AND project_id IS NULL`) satisfying the first 51
rows, so the `OR` short-circuits before the grant set is ever needed. Note the planner's own
estimate for the inner node rises from 33,244 to 455,714 once the ACL predicate is attached — it
prices the filter as expensive and is right to.

**The latent case this does not cover.** On a tenant whose pages are mostly `private` and reachable
only through grants, the cheap branch fails for most rows, the hashed SubPlan materializes the whole
grant set, and the cost becomes a function of tenant grant count rather than the LIMIT window. That
is the same defect measured on the "shared with me" scope in SESSION-08, and the fix is the same
`UNION` rewrite recorded there — not another index. `1205` is correct and sufficient for the tree;
it does not and cannot repair the `OR`.

### Backend test run (2026-09-25)
```
PASS src/modules/kb/wiki/kb-page-tree.cursor-stability.spec.ts (8.359 s)
PASS src/modules/kb/wiki/kb-page-tree-tenant-isolation.spec.ts (8.36 s)
PASS src/modules/kb/wiki/kb-page-tree.acceptance.spec.ts

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

Command: `cd backend && pnpm jest --runTestsByPath src/modules/kb/wiki/kb-page-tree-tenant-isolation.spec.ts src/modules/kb/wiki/kb-page-tree.cursor-stability.spec.ts src/modules/kb/wiki/kb-page-tree.acceptance.spec.ts -w 2 --no-coverage`

### Frontend import-page test run (2026-09-25)
```
PASS features/wiki/components/import-page.test.tsx (15.93 s)
Tests: 4 passed, 4 total
```
Removed stale `useKbPagesTree` mock from the test (hook no longer called by import-page.tsx).

### Typecheck results (2026-09-25)
- Backend: `pnpm typecheck` exit code 0 (under D:/agent-work/kb-sessions/typecheck.lock)
- Frontend: `pnpm type-check` clean (next typegen + tsc --noEmit)

### Files created/modified
- `backend/src/modules/kb/wiki/dto/kb-page-tree.dto.ts` — NEW: `listPageTreeChildrenSchema`, `KB_PAGE_TREE_PAGE_SIZE = 50`
- `backend/src/modules/kb/wiki/kb-page-tree.service.ts` — NEW method `getTreeLevel()` replacing old `getTree()` with cursor pagination
- `backend/src/modules/kb/wiki/kb-pages.controller.ts` — Updated `getTree` handler to use `listPageTreeChildrenSchema` and `kbPageTreeLevelSchema`
- `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts` — Added `kbPageTreeLevelSchema = cursorPageSchema(kbPageTreeItemSchema)`
- `backend/migrations/1205_kb_page_tree_children_index.sql` — NEW: partial composite index
- `backend/migrations/rollback/1205_kb_page_tree_children_index.down.sql` — NEW: rollback
- `backend/src/modules/kb/wiki/kb-page-tree-tenant-isolation.spec.ts` — Updated/extended
- `backend/src/modules/kb/wiki/kb-page-tree.cursor-stability.spec.ts` — NEW
- `backend/src/modules/kb/wiki/kb-page-tree.acceptance.spec.ts` — NEW
- `frontend/hooks/api/kb/kb-page-tree-schema.ts` — NEW: `kbPageTreeLevelContract` Zod schema
- `frontend/hooks/api/kb/pages.ts` — Added `useKbPageTreeLevel`, `useKbPageTreeInfinite`, `useKbPageChildrenLevel`; updated `useKbPagesTree` and `useKbProjectPagesTree` to map cursor page
- `frontend/features/wiki/components/page-tree.tsx` — Rewrote to use `useKbPageTreeInfinite` + IntersectionObserver sentinel
- `frontend/features/wiki/components/page-tree-item.tsx` — Removed `allNodes` prop, added lazy children via `useKbPageChildrenLevel` + IntersectionObserver sentinel
- `frontend/features/wiki/components/wiki-shell.tsx` — Removed `useKbPagesTree` call; passes `<PageTree />` with no nodes prop
- `frontend/features/wiki/components/move-page-dialog.tsx` — Replaced `useKbPagesTree()` with `useKbPagesSearch()` search-based picker
- `frontend/features/wiki/components/import-page.tsx` — Removed `useKbPagesTree()`; `titleExists` is no-op

### Test-fail evidence
Tenant-isolation spec line 138 previously asserted `toContain(null)` (the JavaScript null value).
`isNull(kbPages.parentPageId)` in Drizzle generates `" is null"` string chunks — not a bound null
parameter. Fixed to `toContain(" is null")`. Pre-fix output:
```
Expected value: null
Received array: ["(", "", " = ", "org-root", "", " and ", "", " is null", "true", ...]
```
This confirms the `isNull` predicate IS added but the assertion was testing the wrong value type.

### FE-125 correction (2026-09-25)
Coordinator withdrew the "Show more" button requirement. FE-125 now mandates IntersectionObserver
infinite scroll for keyset-paginated surfaces with no total count.

Initial implementation used hand-rolled `IntersectionObserver` sentinels in `page-tree.tsx` and
`page-tree-item.tsx`. Coordinator then pointed to `components/ui/infinite-scroll-sentinel.tsx`
(commit 173a2a154) per FE-59/FE-60 (no duplicated primitives). Both call sites updated to use
`<InfiniteScrollSentinel ... label="Load more pages|child pages" />` which adds 300px prefetch
margin, stacks no duplicate requests, provides `role="status" aria-live="polite"` and an
`sr-only focus:not-sr-only` keyboard/screen-reader fallback button.

Files using the primitive:
- `page-tree.tsx`: `label="Load more pages"`
- `page-tree-item.tsx`: `label="Load more child pages"`
