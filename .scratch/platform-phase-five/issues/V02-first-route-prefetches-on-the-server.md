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
**Status:** ready-for-agent

- [ ] The chosen route and feature are named here before any edit, so no other ticket can collide with them.
- [ ] Prefetch lives **with the query key**, so a page cannot prefetch under a key its hook does not read.
- [ ] The page prefetches on the server and passes a dehydrated cache through `HydrationBoundary`.
- [ ] **The hook, the query key and the presentation component are unchanged.** If any needs editing, the seam is the wrong shape — stop and say so rather than adapting the hook to fit.
- [ ] Access is still enforced server-side with `requirePermission()`, and the API still enforces its own gate. A prefetch is not an authorization decision.
- [ ] The prefetch is gated on the same permission as the client query. **Never fire an API the role cannot access** — it 403-spams and burns Neon CPU.
- [ ] A test asserts the hook does **not** refetch on mount when the cache was hydrated. This is the mutation check — drop the `HydrationBoundary` and it fails.
- [ ] A test asserts rows appear in the server-rendered output.
- [ ] Verified with `next build && next start`, **never `next dev`** — v16 cache behaviour differs between them.
- [ ] The loading, empty, error and no-permission states all still work, and the skeleton still matches the real shape.
- [ ] Pagination stays server-side and filters still update the URL and reset the page.
- [ ] Web `tsc --noEmit` exit 0 and the 77-suite web run passes.
- [ ] **Record what it bought.** Time to first row before and after, however roughly measured — and if it was not measured, say so rather than claiming the improvement. A seam nobody can show a gain from will not be adopted 342 more times.

**Not in this ticket:** converting any other page, or widening `generateMetadata`.
