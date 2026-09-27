# 20 — Stop a project rename from refetching the whole board

**What to build:** Renaming a project, or editing its description, no longer causes every mounted ticket query to refetch. The update currently issues a targeted set of invalidations and then also invalidates a prefix that sits above every query in the module, so all loaded board pages refetch and the board visibly flashes — even though no ticket data changed.

**Blocked by:** None — can start immediately.

**Status:** partial — the module-wide broadcast is gone, but the renamed project's own ticket collections are still invalidated. See the correction below.

**Verification correction (2026-09-27):** `project-rename-invalidation.test.ts:43` mocks
`invalidateBuildViews`, the helper that still invalidates ticket collections. Its two passing
tests therefore cannot establish "no ticket-collection invalidation" or absence of a board flash.
Complete this ticket with the real helper; do not move its own acceptance requirement out of scope.

- [ ] Renaming a project invalidates project metadata and membership, not ticket collections
  — **Not met.** `queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all })` was removed from `useUpdateProject.onSettled` (`frontend/hooks/api/build/projects.ts`), and the `onMutate` cancel was narrowed from `projects.all` to `projects.list()` plus `projects.detail(projectId)`. Both are real improvements. But `onSettled` still calls `invalidateBuildViews(queryClient, variables.projectId)`, and that function invalidates three ticket collections: `projects.tickets({ projectId })` (`ticket-cache.ts:179`), `projects.allWorkAll` (`:191`) and `columnCounts(projectId)` (`:217`). A ticket collection scoped to one project is still a ticket collection.
- [ ] The board does not refetch or flash on a project rename
  — **Partly met.** Boards for *other* projects no longer refetch, which is what the module-wide prefix was causing. The renamed project's own board still refetches its ticket page and its column counts through `invalidateBuildViews`.
- [x] Project detail and the project list still update immediately
  — `invalidateBuildViews` already invalidates `projects.list()` (all list variants) and `projects.detail(projectId)`. The explicit `projects.detail(variables.projectId)` call in `onSettled` is redundant with `invalidateBuildViews` but harmless; it remains. The optimistic patch in `onMutate` still updates `projects.list()` and `projects.detail(projectId)` cache entries synchronously so the UI reflects the new name before the server confirms.
- [ ] A test asserts no ticket-collection query is invalidated by a project metadata update
  — `frontend/hooks/api/build/project-rename-invalidation.test.ts` — two tests: "does not invalidate buildWorkQueryKeys.projects.all after a project rename" (asserts the broad key is absent from all `invalidateQueries` calls) and "still invalidates project detail and members after a rename" (asserts the narrow keys remain). Both pass (exit 0, 342 ms and 16 ms).

**Remaining scope (2026-09-27):** The renamed project's own ticket collections still refetch. Remove that coupling for metadata-only updates and test the real helper. Narrower invalidation is an improvement, not evidence that board flashing is eliminated.
