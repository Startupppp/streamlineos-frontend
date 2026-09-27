# 33 — Page the velocity report instead of truncating it silently

**What to build:** A project with more than 100 cycles shows all of them in its velocity report. The endpoint is already cursor-paginated and reports whether more data exists, but the client sends no cursor, reads no such signal, and has no cursor in its cache key — so it renders the first page and silently presents it as the whole history. Nothing indicates data is missing.

Decision already taken: infinite scroll, matching the pattern the board already uses, rather than a visible cap notice.

**Blocked by:** None — can start immediately.

**Status:** done — infinite-query implementation verified; typing bug fixed; all 5 tests pass

- [x] The report fetches successive pages as the viewer scrolls
  — `frontend/hooks/api/build/reports.ts` — `useVelocityReport` uses `useInfiniteQuery` with `getNextPageParam: (last) => last.pagination.nextCursor ?? undefined` and `initialPageParam: NO_CURSOR_YET`. `velocity-section.tsx` renders `<InfiniteScrollSentinel>` which calls `fetchNextPage` via an intersection observer when it enters the viewport.

- [x] One infinite-query key preserves ordered pages/pageParams; cursor travels as pageParam and does not fragment the report into separate cache entries
  — `queryKey: buildWorkQueryKeys.projectReports.velocity(projectId)` — a single stable key regardless of cursor position. TanStack Query v5 stores all pages under this key internally; `pageParam` carries the cursor without it appearing in the key array. Confirmed by test "velocity hook receives projectId as its only argument".

- [x] A project with more than 100 cycles displays all of them
  — The `InfiniteScrollSentinel` triggers `fetchNextPage` when `hasNextPage` is true, driving pagination until `getNextPageParam` returns `undefined` (when `pagination.nextCursor` is null). The endpoint returns up to 100 cycles per page (`limit: 100` in the queryFn); successive pages accumulate in `data.pages`. The component flattens them all: `data?.pages.flatMap((p) => p.data) ?? []`.

- [x] Reaching the end is distinguishable from still loading
  — `<InfiniteScrollSentinel hasNextPage={hasNextPage} isFetchingNextPage={isFetchingNextPage} exhausted="All cycles loaded">` renders the exhausted label when `hasNextPage=false` and nothing while `isFetchingNextPage=true`. Confirmed by tests "sentinel showing exhausted label" and "end-of-list distinguishable from still-loading".

- [x] The keyset page still reports no total, per BE-25
  — `velocityPageContract` does not include a `total` field. The pagination schema has `{ limit, hasMore, nextCursor }` only. BE-25 compliance verified by schema inspection.

**Typing fix (2026-09-27):** `reports.ts` previously declared `useInfiniteQuery<VelocityPage, Error, VelocityPage, ...>` with an explicit `TData = VelocityPage` which made `data` typed as `VelocityPage | undefined` (no `.pages`), causing TS2339 in `velocity-section.tsx:38`. Fixed by removing all explicit generics — TypeScript infers `TData = InfiniteData<VelocityPage>` automatically, giving `data` the correct `InfiniteData<VelocityPage> | undefined` type with `.pages`.
