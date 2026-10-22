# Audit L6 — Docs / Knowledge Base / Ask OS
Date: 2026-10-22 · Scope: all files under `frontend/features/wiki`, `frontend/features/help-centre`, `frontend/hooks/api/kb`, `frontend/app/(authenticated)/knowledge/**`, `backend/src/modules/kb/**`, `backend/src/common/cache/cache-keys.ts`, `backend/src/common/cache/cache-invalidation-matrix.ts`

---

## LEDGER SUMMARY

| Category | Rule | Count |
|---|---|---|
| Manual memoization (useMemo/useCallback removals) | FE-114 | 36 |
| Load More button (not sentinel) | FE-125 | 1 |
| Missing server prefetch | FE-145 | 20 pages |
| PageState missing | FE-40 | 1 |
| URL → state in effect | FE-138 | 1 |
| Pass-through type re-exports | FE-128 | 4 |
| Broad query invalidation | FE-133 | 1 |
| Truncated list (no hasMore guard) | FE-146 | 1 |
| Missing BE cache (hot reads) | BE-159 | 3 call sites |
| Missing cache matrix entries | BE-159 | 0 KB entries in matrix |
| Loading.tsx coverage | FE-144 | PASS — all 20 pages have sibling |
| Dead files / duplicate controllers | — | 0 found |
| Duplicate DTOs / type definitions | — | 0 found |

---

## 1 — Manual Memoization (FE-114)

React Compiler is enabled (`reactCompiler: true`). All `useMemo`, `useCallback`, and `React.memo` in scope are redundant and must be removed.

### FE Lane 1 — component strip

- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:92` — `useCallback` for `setConversation` — delete wrapper, use inline arrow
- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:115` — `useMemo` for `persisted` — inline the expression
- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:131` — `useMemo` for `rows` — inline
- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:132` — `useMemo` for `questionByAssistantId` — inline
- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:166` — `useMemo` for `sources` — inline
- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:172` — `useMemo` for `allConversations` — inline
- [ ] `frontend/features/wiki/components/wiki-home-page.tsx:67` — `useCallback` for `resolveHref` — delete wrapper
- [ ] `frontend/features/wiki/components/wiki-home-page.tsx:104` — `useCallback` for `handleShortcutHelp` — delete wrapper
- [ ] `frontend/features/wiki/components/wiki-home-page.tsx:108` — `useCallback` for `handleClearSelection` — delete wrapper
- [ ] `frontend/features/wiki/components/wiki-home-page.tsx:110` — `useCallback` for `handleOpenPage` — delete wrapper
- [ ] `frontend/features/wiki/components/wiki-home-page.tsx:119` — `useCallback` for `handleRowsChange` — delete wrapper
- [ ] `frontend/features/help-centre/components/kb-analytics-tab.tsx:32` — `useMemo` for `stats` — inline derivation
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:76` — `useMemo` for `cursorTrail` — inline
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:102` — `useMemo` for `rows` — inline
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:112` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:119` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:126` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:130` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:131` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-documents-page.tsx:132` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-document-detail-page.tsx:104` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/company-document-detail-page.tsx:109` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-version-sheet.tsx:52` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-version-sheet.tsx:64` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-version-sheet.tsx:138` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-version-sheet.tsx:139` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:47` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:75` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:84` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:93` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:97` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/files/kb-file-viewer.tsx:113` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/import-page.tsx:112` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/import-page.tsx:168` — `useMemo` — inline
- [ ] `frontend/features/wiki/components/import-page.tsx:176` — `useCallback` — delete wrapper
- [ ] `frontend/features/wiki/components/import-page.tsx:181` — `useCallback` — delete wrapper

---

## 2 — Load More Button (FE-125)

`InfiniteScrollSentinel` is already in use across analytics lists and gaps list — those are compliant. One location still uses a plain `<Button>`.

### FE Lane 2 — hooks & query correctness

- [ ] `frontend/features/wiki/components/knowledge-analytics-page.tsx:373` — `<Button onClick={() => void fetchNextCitationReuse()}>Load more citation results</Button>` is a manual button, not a sentinel — replace with `<InfiniteScrollSentinel hasNextPage={!!hasNextCitationReuse} isFetchingNextPage={isFetchingNextCitationReuse} onLoadMore={() => void fetchNextCitationReuse()} label="Load more citation results" />`

---

## 3 — Missing Server Prefetch (FE-145)

Every knowledge `page.tsx` calls `requireSession()` / `requirePermission()` / `enforceRouteAccess()` then renders the client component directly. None uses `createServerQueryClient` + `prefetchQuery` + `HydrationBoundary`. Until prefetch is added, every navigation to these routes starts with a spinner.

### FE Lane 3 — server prefetch (all 20 pages)

- [ ] `frontend/app/(authenticated)/knowledge/chat/page.tsx` — add `createServerQueryClient` + `prefetchQuery(kbConversationsOptions)` + wrap `<KnowledgeBasePage>` in `<HydrationBoundary>`
- [ ] `frontend/app/(authenticated)/knowledge/wiki/page.tsx` — prefetch recent pages + spaces list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/analytics/page.tsx` — prefetch analytics overview
- [ ] `frontend/app/(authenticated)/knowledge/research-briefs/page.tsx` — prefetch briefs list
- [ ] `frontend/app/(authenticated)/knowledge/research-briefs/[briefId]/page.tsx` — prefetch single brief by `briefId`
- [ ] `frontend/app/(authenticated)/knowledge/wiki/company-documents/page.tsx` — prefetch linked docs list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/company-documents/[linkedDocumentId]/page.tsx` — prefetch doc detail
- [ ] `frontend/app/(authenticated)/knowledge/wiki/doc/[pageId]/page.tsx` — prefetch page content
- [ ] `frontend/app/(authenticated)/knowledge/wiki/doc/[pageId]/history/page.tsx` — prefetch page history
- [ ] `frontend/app/(authenticated)/knowledge/wiki/import/page.tsx` — prefetch spaces list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/manage/page.tsx` — prefetch spaces list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/manage/sharing/page.tsx` — prefetch sharing settings
- [ ] `frontend/app/(authenticated)/knowledge/wiki/private/page.tsx` — prefetch private pages
- [ ] `frontend/app/(authenticated)/knowledge/wiki/reviews/page.tsx` — prefetch review queue
- [ ] `frontend/app/(authenticated)/knowledge/wiki/search/page.tsx` — prefetch spaces list (for filter)
- [ ] `frontend/app/(authenticated)/knowledge/wiki/shared/page.tsx` — prefetch shared pages
- [ ] `frontend/app/(authenticated)/knowledge/wiki/spaces/page.tsx` — prefetch spaces list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/spaces/[spaceId]/page.tsx` — prefetch space detail
- [ ] `frontend/app/(authenticated)/knowledge/wiki/templates/page.tsx` — prefetch templates list
- [ ] `frontend/app/(authenticated)/knowledge/wiki/trash/page.tsx` — prefetch trash list

---

## 4 — PageState Missing (FE-40)

### FE Lane 2 — hooks & query correctness (continued)

- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx` (Ask OS chat) — no `usePageState` / `<PageState>` wrapper; the component renders directly without resolving loading/denied/error states via the standard pattern — add `usePageState({ permission: "kb:ask:view" })` and wrap content in `<PageState state={pageState}>`

---

## 5 — URL Mirrored into State via Effect (FE-138)

### FE Lane 1 — component strip (continued)

- [ ] `frontend/features/wiki/components/knowledge-base-page.tsx:105-113` — `useEffect` reads `window.location.search` and calls `setActiveConversationId(params.get("conversationId"))` — window access in effect violates FE-138; replace with `const searchParams = useSearchParams(); const activeConversationId = searchParams.get("conversationId");` derived directly (no `useState`, no effect)

---

## 6 — Pass-Through Type Re-Exports (FE-128)

Re-exports from hook modules are banned; importers must point at the source schema file.

### FE Lane 2 — hooks & query correctness (continued)

- [ ] `frontend/hooks/api/kb/spaces.ts:18` — `export type { KbSpaceListItem }` from `kb-spaces-settings-schema` — delete; update all importers to import from `@/features/wiki/schema/kb-spaces-settings-schema` (or equivalent source path)
- [ ] `frontend/hooks/api/kb/spaces.ts:19` — `export type { KbSpaceListPage }` — same: delete, redirect importers
- [ ] `frontend/hooks/api/kb/spaces.ts:20` — `export type { KbSpaceArchiveImpact }` — same: delete, redirect importers
- [ ] `frontend/hooks/api/kb/spaces.ts:22` — `export type { KbSpaceMember }` — same: delete, redirect importers

---

## 7 — Broad Query Invalidation (FE-133)

### FE Lane 2 — hooks & query correctness (continued)

- [ ] `frontend/hooks/api/kb/research-briefs.ts:137` — `useConvertResearchBriefToPage` calls `qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.pageCollection() })` with no filter args; this prefix-invalidates ALL page-collection queries on every convert action — fix: use `qc.setQueryData` to insert the new page into the "recent pages" list, or narrow the invalidation to the specific collection the user is currently viewing; at minimum add `exact: true` to scope to just the parameterless key

---

## 8 — Silent List Truncation (FE-146)

### FE Lane 2 — hooks & query correctness (continued)

- [ ] `frontend/features/wiki/components/knowledge-analytics-page.tsx:101` — `const { data: spacesPage } = useKbSpaces()` fetches default limit=20 spaces; `const spaces = spacesPage?.data ?? []` is used as-is in the filter `<Select>` — if the org has >20 spaces, extra spaces silently disappear from the filter; fix: check `spacesPage?.pagination.hasMore` and either (a) show a "and N more" label in the select, or (b) switch to an infinite-fetch pattern that loads all spaces in batches before rendering

---

## 9 — Missing Backend Cache (BE-159)

KB hot-read paths bypass `CacheService.cachedVersioned` entirely. There are zero KB namespace entries in `cache-invalidation-matrix.ts` and only one KB key in `cache-keys.ts` (the embedding key, which is unrelated).

### BE Lane 1 — cache infrastructure (coordinator-owned; see coordinator section)

- [ ] `backend/src/common/cache/cache-keys.ts` — add `kbSpacesList`, `kbAnalyticsOverview` keys alongside the existing `kbQueryEmbedding` key
- [ ] `backend/src/common/cache/cache-invalidation-matrix.ts` — add KB namespace entries: space writes (create/archive/delete) must invalidate `kbSpacesList`; page creation must invalidate `kbAnalyticsOverview` (article-count sub-key); analytics-override writes must invalidate `kbAnalyticsOverview`
- [ ] `backend/src/modules/kb/wiki/kb-spaces.service.ts:list()` — wrap the list DB query with `CacheService.cachedVersioned(cacheKey, version, ttl, () => <current body>)`; version must be bumped by space mutations (wire through invalidation matrix)
- [ ] `backend/src/modules/kb/help-centre/kb-analytics.service.ts:overview()` — wrap with `CacheService.cachedVersioned`; TTL = 60 s is reasonable for analytics; version key is `kbAnalyticsOverview`

---

## 10 — Loading.tsx Coverage (FE-144)

PASS. All 20 `page.tsx` files under `app/(authenticated)/knowledge` have a sibling `loading.tsx`. No action required.

---

## Dead / Duplicate Findings

- `KbWikiAnalyticsController` (referenced in memory note `kb-has-two-analytics-controllers-one-unreachable.md`) — **no longer exists** in the codebase. Already cleaned up. No action required.
- `backend/src/modules/kb/files/kb-sources-adapter.controller.ts` — marked `@Deprecated`; all 3 endpoints are backwards-compat pass-throughs to current endpoints. Legitimate adapter; not dead.
- No duplicate DTOs or type definitions found in scope.
- `views` vs `totalViews` in `kbAnalyticsOverviewContract` — confirmed different data sources (`kbPages.views` column sum vs `kbEvents` stream count); not aliases.

---

## Fix Lanes (Disjoint File Sets)

### FE Lane 1 — memoization strip + ask-os correctness
Files: `knowledge-base-page.tsx`, `wiki-home-page.tsx`, `company-documents-page.tsx`, `company-document-detail-page.tsx`, `kb-file-version-sheet.tsx`, `kb-file-viewer.tsx`, `import-page.tsx`, `kb-analytics-tab.tsx`
Work: delete all `useMemo`/`useCallback` wrappers (36 items); convert FE-138 effect to `useSearchParams`; add FE-40 `usePageState`/`PageState`

### FE Lane 2 — hooks correctness + analytics UX
Files: `hooks/api/kb/spaces.ts`, `hooks/api/kb/research-briefs.ts`, `features/wiki/components/knowledge-analytics-page.tsx`
Work: delete 4 pass-through re-exports (FE-128); narrow invalidation in `useConvertResearchBriefToPage` (FE-133); replace citation-reuse `<Button>` with `<InfiniteScrollSentinel>` (FE-125); add `hasMore` guard to spaces filter dropdown (FE-146)

### FE Lane 3 — server prefetch
Files: all 20 `page.tsx` files under `app/(authenticated)/knowledge/**`
Work: add `createServerQueryClient` + `prefetchQuery` + `HydrationBoundary` to each page; lane is fully independent of Lanes 1 and 2

### BE Lane 1 — cache infrastructure
Files: `backend/src/common/cache/cache-keys.ts`, `backend/src/common/cache/cache-invalidation-matrix.ts`, `backend/src/modules/kb/wiki/kb-spaces.service.ts`, `backend/src/modules/kb/help-centre/kb-analytics.service.ts`
Work: add KB cache keys; add invalidation matrix entries for KB namespace; wrap `list()` and `overview()` with `cachedVersioned`

---

## Coordinator-Owned Items

All BE Lane 1 items above are coordinator-owned because they require coordinating the cache key naming with the invalidation matrix before any service-level wrapping can be written correctly. Proposed steps:

1. Add to `cache-keys.ts`:
   ```ts
   kbSpacesList: (orgId: number) => `kb:spaces:list:org${orgId}`,
   kbAnalyticsOverview: (orgId: number) => `kb:analytics:overview:org${orgId}`,
   ```
2. Add invalidation matrix entries mapping space-write events → `kbSpacesList` and page-create / analytics-write events → `kbAnalyticsOverview`.
3. In `kb-spaces.service.ts:list()` — wrap with `cachedVersioned(keys.kbSpacesList(orgId), versionTag, 60, fn)`.
4. In `kb-analytics.service.ts:overview()` — wrap with `cachedVersioned(keys.kbAnalyticsOverview(orgId), versionTag, 60, fn)`.

No migration SQL required for this audit.

---

## Contract Changes the Frontend Must Mirror

None required for the cache and memoization fixes. The `InfiniteScrollSentinel` swap (FE-125 fix) and `hasMore` guard (FE-146 fix) are purely frontend-local — the backend contracts are unchanged. The `useSearchParams`-based fix (FE-138) replaces a runtime window read with a proper React hook; no contract change. The FE-128 re-export deletions require importers to update their import paths but the types themselves are unchanged.
