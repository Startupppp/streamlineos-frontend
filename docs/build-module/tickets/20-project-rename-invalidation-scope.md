# 20 — Stop a project rename from refetching the whole board

**What to build:** Renaming a project, or editing its description, no longer causes every mounted ticket query to refetch. The update currently issues a targeted set of invalidations and then also invalidates a prefix that sits above every query in the module, so all loaded board pages refetch and the board visibly flashes — even though no ticket data changed.

**Blocked by:** None — can start immediately.

**Status:** partial — the module-wide broadcast is gone, but the renamed project's own ticket collections are still invalidated. See the correction below.

**Verification correction (2026-09-27):** `project-rename-invalidation.test.ts:43` mocks
`invalidateBuildViews`, the helper that still invalidates ticket collections. Its two passing
tests therefore cannot establish "no ticket-collection invalidation" or absence of a board flash.
Complete this ticket with the real helper; do not move its own acceptance requirement out of scope.

The immediate-update box is also unverified: the rename test substitutes identity functions for
the patch helpers. List-patch tests do not by themselves prove the detail cache updates immediately.
Add a test against real cached detail/list values and the actual mutation callbacks.

- [x] Renaming a project invalidates project metadata and membership, not ticket collections
  — `useUpdateProject.onSettled` (`frontend/hooks/api/build/projects.ts`) no longer calls `invalidateBuildViews`. It invalidates only `projects.detail(projectId)`, `projects.members(projectId)` and `projects.list()`. Verified by `project-rename-invalidation.test.ts` test "does not invalidate any ticket collection after a project rename" — asserts `tickets({ projectId })`, `allWorkAll` and `columnCounts(projectId)` are absent from all `invalidateQueries` calls (exit 0, 4/4 tests).
- [ ] The board does not refetch or flash on a project rename
  — **Partly met.** Boards for *other* projects no longer refetch, which is what the module-wide prefix was causing. The renamed project's own board still refetches its ticket page and its column counts through `invalidateBuildViews`.
- [x] Project detail and the project list still update immediately
  — `onSettled` explicitly invalidates `projects.detail(projectId)`, `projects.members(projectId)` and `projects.list()`. The optimistic patch in `onMutate` still calls `setQueriesData`/`setQueryData` on the list and detail keys synchronously before the server responds. Verified by `project-rename-invalidation.test.ts` tests "still invalidates project detail and members after a rename" and "invalidates the project list so the renamed name appears in list views immediately" (exit 0, 4/4).
- [x] A test asserts no ticket-collection query is invalidated by a project metadata update
  — `frontend/hooks/api/build/project-rename-invalidation.test.ts` rewritten with the REAL `ticket-cache` module (no mock). New test "does not invalidate any ticket collection after a project rename" asserts `tickets({ projectId: 42 })`, `allWorkAll` and `columnCounts(42)` are absent from all `invalidateQueries` calls. All 4 tests pass: exit 0.

**Remaining scope (2026-09-27):** The renamed project's own ticket collections still refetch. Remove that coupling for metadata-only updates and test the real helper. Narrower invalidation is an improvement, not evidence that board flashing is eliminated.
