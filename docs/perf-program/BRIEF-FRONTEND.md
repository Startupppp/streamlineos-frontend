# Frontend fix-lane brief (shared by every Wave B lane)

Repo: `D:\projects\personal\Streamlineos\frontend`. Next.js 16 App Router, React 19.2 with the React Compiler ON, TanStack Query 5.

## Hard bans
- No git commands of any kind. The coordinator owns git.
- No `pnpm type-check`, `type-check:specs`, `tsc`, `next build`, `openapi:generate`, repo-wide `pnpm lint` or whole-suite jest. RAM is limited; the coordinator runs these once per wave.
- Never connect to a database or a running backend; `.env` points at PRODUCTION.
- Edit only the files your lane owns. A needed edit outside them goes under "Needs coordinator" in your report.
- Do not change backend contracts or request params. Contract changes are a separate paired lane.
- No code comments. Do not add any.
- Never weaken a gate, ratchet, allowlist, `*.known.json` or test to get green (FE-136). Fix the code.
- No redirect-only pages, no single-button components (FE-140), no pass-through wrappers or re-export files (FE-126).

## Read first
`frontend/CLAUDE.md` in full; the new rules are FE-114 (React Compiler) and FE-142..147. Then your lane's audit ledger(s) in `docs/perf-program/` and these two:
- `audit-L7-shared.md` → the "Server prefetch recipe" and "Skeleton primitives" sections
- `audit-L8-loading.md` → the per-page loading table for your routes, and the skeleton inventory

## What every lane does, for every page.tsx and feature it owns
1. **Fast first paint (FE-145).** Server-prefetch the page's primary reads with the L7 recipe: `lib/prefetch/<your-area>.ts` (a NEW file owned by your lane; never edit another lane's prefetch file), `createServerQueryClient`, `Promise.all`, `dehydrate`, `<HydrationBoundary>` inside `<Suspense fallback={<ThisPageLoading/>}>`. Server and client must produce the IDENTICAL query key and the same params and contract. Export a `queryOptions` factory from the hook module and use it on both sides, so they cannot drift. Gate prefetches with `lib/prefetch/prefetch-gate.ts` the way `lib/prefetch/hr.ts`/`settings.ts` do: never prefetch a read the viewer lacks permission or module access for (FE-147). Read `lib/prefetch/*contract*.test.ts`, `hydration-contract.test.ts` and `prefetch-gate.ts` first and satisfy what they enforce. Dynamic-route pages prefetch with their awaited params. Kill fetch waterfalls: independent queries run in parallel; dependent ones read the parent's cached data. Lazy-load heavy components (editors, charts, kanban, gantt, dialogs, sheets) with `next/dynamic` (FE-113).
2. **Per-page loading (FE-144/FE-142).** Every page.tsx gets its own sibling `loading.tsx` that renders an exact skeleton clone of that page's ready layout, built from the existing primitives (`Skeleton`, `DataTableSkeleton`, `StatCardGridSkeleton`, `KanbanBoardSkeleton`, `SurfaceBodySkeleton`, feature skeletons listed in L8). The page's `PageState` loading branch renders the SAME skeleton component. Put the skeleton component in the feature folder and import it from both places. No generic spinners, `LoadingState variant="page"`, or `AppLoadingScreen`. No `key={i}`.
3. **Caching and mutations (FE-24, FE-35, FE-133).** Correct `staleTime` tiers. Mutations patch the cache with `setQueryData` from the response; no broad prefix invalidation. Only server-computed aggregates may be marked stale with `exact: true, refetchType: "none"`.
4. **Pagination (FE-112, FE-125, FE-146).** No unbounded `.map`, no client-side filter/slice over a full download, no "Load more"/"Show N more" buttons: use `TablePagination`/`DataTable` pagination or an infinite-scroll sentinel (`InfiniteScrollSentinel`). Remove hardcoded `limit` from hooks (FE-31). If the endpoint has no server pagination yet, do not invent params; list it under "Needs paired contract lane".
5. **Duplicate keys (FE-143).** Delete alias fields, props and params in your files; pick the canonical name and migrate every reader you own. Aliases that come from the backend contract are reported, not changed.
6. **Dead and duplicate code.** Delete unused files, hooks, components, functions, exports, schemas, types and CSS in your scope, after a repo-wide grep (including tests and `app/`) proves there are no importers. Merge near-duplicates into one. Tiny single-consumer files merge into their consumer. Delete type re-exports (FE-128). Fix FE-134 unused exports.
7. **React and Next principles.** No render-phase setState or ref access (FE-137), no state mirrored from props/query/URL (FE-138), every effect cleans up (FE-139), `"use client"` only at leaves (FE-01), thin route files (FE-56), awaited params (FE-04). Remove manual `useMemo`/`useCallback`/`React.memo` in EVERY file you edit (FE-114), except `react-window` rows and values that feed an effect's dependency array where removal would change effect timing.
8. **RBAC (FE-147).** Every page keeps or gains its org- and module-level gate (`usePageState` + route-access). Never drop, reorder or short-circuit a gate. Prefetch only behind the same gate.

## Verification you may run
- `pnpm exec eslint <your changed files>` (file list only, never the whole repo).
- `pnpm jest <exact test paths> --runInBand` for tests co-located with or directly covering your files.
- Greps proving deleted or renamed symbols have zero references.

## Report (final message)
1. Per ledger item: done / skipped (why) / needs coordinator.
2. Pages touched with: prefetch added (Y/N), own loading.tsx (Y/N), skeleton shared with PageState (Y/N), gate kept (name it).
3. Files created, deleted, merged.
4. Needs coordinator (shared hot files: sidebar-nav-items, route-access-entries, build-route-manifest, query-key aggregates, check scripts) with exact edits.
5. Needs paired contract lane: endpoint, current shape, needed change.
6. Lint/test commands run and results.

## Targeted cache updates (user rule, overrides anything above)
Touch only the cache entries the mutation changed (FE-148): `setQueryData` on the entity's detail key and the list pages containing it. Never invalidate a module/entity prefix or sibling entities; mark an aggregate stale only if the mutation changes its inputs.

## Lessons from Wave B part 1 (mandatory)
- **Coverage:** every page.tsx you own gets all 8 steps. "Dynamic route" is not a reason to skip prefetch (await params). Neither is "paginated" (prefetch page 1 with default params), "no list key" (export one), "key is private" (export a queryOptions factory), nor "inline Suspense" (prefetch in the server component). Valid skips: pure create forms with no read, localStorage-only pages, input-driven tools. Your report carries a per-page table covering EVERY page.
- **Keys:** a prefetch never restates a query key. Export a `queryOptions` factory (key + fetcher + staleTime) from the owning hook module and use it on both sides. The prefetch's cached shape must equal what the hook's queryFn returns (e.g. `.items`, not the page object). If you change a hook to use `queryOptions`, keep its tests green: partial `jest.mock("@tanstack/react-query")` mocks must spread `jest.requireActual`.
- **Gates:** never loosen, replace or remove a gate that existed before this program. A gate you ADD uses exactly the key(s) the page itself checks on the client (its usePageState/useCan), including any-of.
- **Slots:** a slot prop invoked as a function (`slot?.(props)`) must receive a named render function, never a component (that runs the component's hooks inside the caller and breaks hook order).
- **No comments**, including "changelog" comments in digest/test files.
- Do not edit docs/perf-program/TODO.md.
- **No forwarding functions (user rule):** never write a function whose body only returns another function called with the same arguments (e.g. `cyclesQueryOptions(id) { return cyclePageQuery(id) }`). If a builder already exists, export and use it under one canonical name; delete any such alias you find in your files. Predicates over a module-private Set/Map/regex are exempt.
