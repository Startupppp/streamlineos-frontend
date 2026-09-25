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

- [ ] Measure the real cardinality: count `kb_pages` per org in production, read
      `MAX_TREE_NODES`, and record what a tenant at 2001+ pages actually loses today.
- [ ] `GET /kb/pages/tree` accepts `spaceId`, `parentId` and a stable keyset `cursor`; returns
      `{ items, nextCursor, hasMore }`. Cursor ordering must match the `ORDER BY` exactly.
- [ ] Root call returns only root-level nodes plus a `hasChildren` flag per node — never a
      recursive whole-tenant walk.
- [ ] Children load on expand only. `page-tree.tsx` fetches a node's children the first time it is
      expanded and caches per node.
- [ ] Every child request carries `spaceId`, tenant, `parentId`/`cursor`, and is re-authorized —
      a node the actor cannot reach is absent, not a 403.
- [ ] Delete the silent truncation. If a level exceeds the page size, `hasMore` is true and the UI
      offers "Show more" — nothing is dropped without a signal.
- [ ] `wiki-shell.tsx` no longer downloads the tenant tree; the sidebar renders from the lazy root.
- [ ] `move-page-dialog.tsx` and `import-page.tsx` pick a parent through a lazy picker, not a
      pre-downloaded tree.
- [ ] Composite index behind the children query, in `1205`, with a tenant-leading key. Capture
      `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the tenant GUC set, so RLS is armed.
- [ ] Tenant-isolation spec: a sibling org's page never appears at any level or cursor position.
- [ ] Cursor-stability spec: inserting a page mid-pagination neither duplicates nor skips a row.
- [ ] Acceptance spec at 100,000 nodes: the root render issues a bounded number of rows and the
      response is not a function of tenant size.
- [ ] Every new test verified to fail against the unfixed code and pass against the fixed code.
- [ ] `pnpm typecheck` (backend, under the lock) and frontend `type-check` clean for your files.

## Handoffs

_(append `HANDOFF: <file> — owned by SESSION-0N — <exact change needed>`)_

## Evidence

_(record command output, file:line, and EXPLAIN plans here as you close each box)_
