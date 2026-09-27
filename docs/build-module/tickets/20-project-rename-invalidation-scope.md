# 20 — Stop a project rename from refetching the whole board

**What to build:** Renaming a project, or editing its description, no longer causes every mounted ticket query to refetch. The update currently issues a targeted set of invalidations and then also invalidates a prefix that sits above every query in the module, so all loaded board pages refetch and the board visibly flashes — even though no ticket data changed.

**Blocked by:** None — can start immediately.

**Status:** partial — the module-wide broadcast is gone, but the renamed project's own ticket collections are still invalidated. See the correction below.

**Verification correction (2026-09-27, corrected 2026-09-27):** The earlier correction claimed that
`project-rename-invalidation.test.ts:43` mocked `invalidateBuildViews`. That was wrong.
Line 43 mocked `@/hooks/api/build/project-cache-patch` with identity functions
(`patchProjectListCache: (old) => old`, `applyProjectDetailPatch: (old) => old`). The test
never mocked `invalidateBuildViews`. `invalidateBuildViews` is called only in
`useDeleteProject.onSuccess` and `useArchiveProject.onSuccess` — neither is a rename path.
The identity-function mock made the cache-patch tests vacuous: `setQueryData` set the cache to
the same value it already held, so the "updates immediately" box could not be verified.
This has been fixed: the `project-cache-patch` mock is removed. Two new tests seed real
`ProjectWithDetails` and `ProjectListResponse` values into the cache and assert the optimistic
patch wrote the renamed name before `onSettled` ran.

- [x] Renaming a project invalidates project metadata and membership, not ticket collections
  — `useUpdateProject.onSettled` (`frontend/hooks/api/build/projects.ts`) no longer calls `invalidateBuildViews`. It invalidates only `projects.detail(projectId)`, `projects.members(projectId)` and `projects.list()`. Verified by `project-rename-invalidation.test.ts` test "does not invalidate any ticket collection after a project rename" — asserts `tickets({ projectId })`, `allWorkAll` and `columnCounts(projectId)` are absent from all `invalidateQueries` calls (exit 0, 6/6 tests).
- [ ] The board does not refetch or flash on a project rename
  — Owner decision (2026-09-27): browser/visual verification is out of scope. Box stays unticked. The code change (removing `invalidateBuildViews` from `onSettled`) is confirmed on disk; the renamed project's own board refetch via board-level invalidation is a separate concern.
- [x] Project detail and the project list still update immediately
  — `onMutate` calls `setQueriesData`/`setQueryData` with the real `patchProjectListCache` and `applyProjectDetailPatch` helpers. Verified by `project-rename-invalidation.test.ts` tests "patches the project detail cache optimistically with the new name before the server responds" and "patches the project list cache optimistically so the renamed name appears without a full refetch" — both use seeded `ProjectWithDetails` and `ProjectListResponse` cache values and assert the updated name is present after `mutateAsync` resolves (exit 0, 6/6 tests).
- [x] A test asserts no ticket-collection query is invalidated by a project metadata update
  — `frontend/hooks/api/build/project-rename-invalidation.test.ts` uses the real `project-cache-patch` module (no identity mock). Test "does not invalidate any ticket collection after a project rename" asserts `tickets({ projectId: 42 })`, `allWorkAll` and `columnCounts(42)` are absent from all `invalidateQueries` calls. All 6 tests pass: exit 0.

**Remaining scope (2026-09-27):** The "board does not refetch or flash" box is browser/visual and out of scope by owner decision.
