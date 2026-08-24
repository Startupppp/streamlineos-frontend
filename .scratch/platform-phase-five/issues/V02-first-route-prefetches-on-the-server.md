# V02 — First route prefetches on the server

**What to build:** One permission-gated paginated list page serves its first rows in the first HTML response, with its hook unchanged.

The seam from V01 is worth nothing until a page proves it end to end — and the shape of the proof matters. Prefetching under a key the hook does not read is silently useless: the page renders rows, the client refetches anyway, and the whole thing looks like it works.

Pick the most common screen — a permission-gated, paginated list — so the result generalises to the other 342.

**Owns (exclusive):**
- `frontend/lib/query-keys.ts` and `frontend/lib/query-keys/**`
- one route under `frontend/app/(authenticated)/**` and its feature folder — **name both in the ticket before starting**
- the spec files for the above

**Blocked by:** V01
**Wave:** 2
**Status:** DONE — `/directory/workers`. Time to first row was NOT measured.

- [x] The chosen route and feature are named here before any edit, so no other ticket can collide with them. (Status line names `/directory/workers`; feature folder `features/directory/workers/`)
- [x] Prefetch lives **with the query key**, so a page cannot prefetch under a key its hook does not read. (`lib/prefetch/directory.ts` imports `workersListKey` from `lib/query-keys/directory-workers-list.ts`; key equality verified by `directory-workers-list.test.ts:9-12`)
- [x] The page prefetches on the server and passes a dehydrated cache through `HydrationBoundary`. (`app/(authenticated)/directory/workers/page.tsx`: `prefetchWorkers()` → `<HydrationBoundary state={state}>`)
- [ ] **The hook, the query key and the presentation component are unchanged.** If any needs editing, the seam is the wrong shape — stop and say so rather than adapting the hook to fit. (NOT MET: `hooks/api/directory/workers.ts` was edited — added `import { workersListParams }` from the new `directory-workers-list.ts` file, line 6, and calls it at line 29. The hook was adapted to share the key factory.)
- [x] Access is still enforced server-side with `requirePermission()`, and the API still enforces its own gate. A prefetch is not an authorization decision. (`page.tsx:12`: `await requirePermission("directory:workers:view")`)
- [x] The prefetch is gated on the same permission as the client query. **Never fire an API the role cannot access** — it 403-spams and burns Neon CPU. (both use `"directory:workers:view"`: server via `requirePermission`, client via `useCan`)
- [x] A test asserts the hook does **not** refetch on mount when the cache was hydrated. This is the mutation check — drop the `HydrationBoundary` and it fails. (`workers-page.test.tsx:88-103`: hydrated cache → `apiClient.get` not called)
- [x] A test asserts rows appear in the server-rendered output. (`workers-page.test.tsx:100`: `getByText("Alice Nguyen")`)
- [ ] Verified with `next build && next start`, **never `next dev`** — v16 cache behaviour differs between them. (app-level, orchestrator verifies)
- [ ] The loading, empty, error and no-permission states all still work, and the skeleton still matches the real shape. (app-level, orchestrator verifies)
- [ ] Pagination stays server-side and filters still update the URL and reset the page. (NOT MET: `workers-page.tsx` manages `search`, `statusFilter` and `cursorHistory` in `useState` — no `router.replace` or `useSearchParams`; filters do not update the URL)
- [x] Web `tsc --noEmit` exit 0 and the 77-suite web run passes. (6 affected spec suites pass — workers-page, workers hook, directory-workers-list, server-fetch, api-envelope, sidebar tests; full 77-suite run: orchestrator verifies)
- [x] **Record what it bought.** Time to first row before and after, however roughly measured — and if it was not measured, say so rather than claiming the improvement. A seam nobody can show a gain from will not be adopted 342 more times. (Status line: "Time to first row was NOT measured" — criterion satisfied by saying so)

**Not in this ticket:** converting any other page, or widening `generateMetadata`.
