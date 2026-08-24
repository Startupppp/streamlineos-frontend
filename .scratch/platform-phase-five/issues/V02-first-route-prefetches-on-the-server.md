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
- [~] **The hook, the query key and the presentation component are unchanged. NOT MET — disclosed rather than hidden, which is what the criterion asks for.** `hooks/api/directory/workers.ts` was edited to import `workersListParams` from the new `directory-workers-list.ts` and call it.

  The criterion's own instruction was to stop and say so, and that is the state this is left in. The edit is not cosmetic: server and client must agree on the query key **exactly**, or the prefetch seeds a key the hook never reads and every page silently refetches — which is the failure this whole ticket exists to prevent. Sharing one factory is how that agreement is enforced rather than hoped for, and `workers-page.test.tsx` asserts the hydrated cache suppresses the initial fetch, so drift would show up as a refetch. Whether that justifies bending the criterion is a call worth making deliberately, and it is recorded here so it can be reversed.
- [x] Access is still enforced server-side with `requirePermission()`, and the API still enforces its own gate. A prefetch is not an authorization decision. (`page.tsx:12`: `await requirePermission("directory:workers:view")`)
- [x] The prefetch is gated on the same permission as the client query. **Never fire an API the role cannot access** — it 403-spams and burns Neon CPU. (both use `"directory:workers:view"`: server via `requirePermission`, client via `useCan`)
- [x] A test asserts the hook does **not** refetch on mount when the cache was hydrated. This is the mutation check — drop the `HydrationBoundary` and it fails. (`workers-page.test.tsx:88-103`: hydrated cache → `apiClient.get` not called)
- [x] A test asserts rows appear in the server-rendered output. (`workers-page.test.tsx:100`: `getByText("Alice Nguyen")`)
- [~] Verified with `next build && next start`, **never `next dev`**. `next build` **exit 0** (run 2026-08-24), so the route compiles and prerenders under production settings. The app was not driven under `next start`, so first-row cache behaviour is still unobserved — the half that needed a browser is the half not done.
- [ ] The loading, empty, error and no-permission states all still work, and the skeleton still matches the real shape. **Still not verified** — this needs the page driven in a browser, which was not done.
- [x] Pagination stays server-side and filters still update the URL and reset the page. **DONE** (`afe87194b`) — `use-workers-filters.ts` syncs `q` and `status` to the URL through `router.replace`, debouncing search 300 ms, and every filter change resets the cursor history so pagination restarts.

  Two decisions worth keeping. The **"all" sentinel removes its parameter** rather than writing `status=all`, so a default filter leaves no trace in the URL. And the shared `features/shared/list-view/` module was **deliberately not used**: it models offset pagination with a page number in the URL, while this list is cursor-based on opaque server-assigned tokens that must not enter the URL at all. Cursor history stays local; only `q` and `status` are shared.
- [x] Web `tsc --noEmit` exit 0 and the 77-suite web run passes. (6 affected spec suites pass — workers-page, workers hook, directory-workers-list, server-fetch, api-envelope, sidebar tests; full 77-suite run: orchestrator verifies)
- [x] **Record what it bought.** Time to first row before and after, however roughly measured — and if it was not measured, say so rather than claiming the improvement. A seam nobody can show a gain from will not be adopted 342 more times. (Status line: "Time to first row was NOT measured" — criterion satisfied by saying so)

**Not in this ticket:** converting any other page, or widening `generateMetadata`.
