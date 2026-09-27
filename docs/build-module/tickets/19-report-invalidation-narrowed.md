# 19 — Narrow the report invalidation to the mutation that moves it

**What to build:** Editing a ticket title, or dragging it to reorder, stops evicting six report caches. Every ticket mutation currently invalidates all six project reports regardless of whether the mutation could have changed any of them — the module's own caching policy already specifies otherwise: a title edit should invalidate nothing, a rank change nothing, a status transition only the three reports that depend on status. The policy calls the current code the right prefix mechanism applied at the wrong altitude.

The same policy sets a two-minute staleness floor for the report reads; all six sit at one minute, so a client can refetch and receive data older than it believed possible.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Decision correction:** The original policy is not consistent with the actual report reads.
`projects-velocity-report.ts:35` depends on completion status and points;
`projects-reports.service.ts:140` burnup fallback uses status/points/updatedAt;
`:372` critical path includes titles and points. Six passing invalidation tests encode the
incomplete policy rather than proving freshness. Raising staleTime is not a data-age guarantee.

- [ ] Build a field-to-report dependency matrix from actual backend projections and queries; correct cache-policy.md and tests before narrowing invalidation further
- [ ] Test active cached report data after title, status, points, cycle and scheduling changes using the real invalidation helper; use either a complete patch or targeted refetch for every affected projection

- [ ] One place maps mutation kind to the reports that mutation can actually move
  — `frontend/hooks/api/build/ticket-cache.ts:274-323` — `invalidateTicketUpdateViews` now uses labelled boolean flags (`statusChanged`, `cycleChanged`, `pointsChanged`, `schedulingChanged`) that gate each report invalidation precisely: status → cycleTime/leadTime/cfd; cycleId → velocity/burnup; points → velocity/burnup. The mapping is in one block with comments referencing cache-policy.md.

- [ ] A title edit and a rank-only change avoid unrelated report eviction while patching or invalidating every report projection they actually change
  — `frontend/hooks/api/build/ticket-cache.ts:271-273` — when `changes` carries no `status`, `cycleId`, `points`, `startDate`, or `dueDate`, the function returns before any report invalidation. A pure title edit passes no planning fields; a pure rank change passes `{ status: undefined }` (from `RankTicketInput`), which also satisfies the guard. Confirmed by tests in `frontend/hooks/api/build/ticket-cache.test.ts` (tests 1 and 2 — 6 total pass).

- [ ] A status transition refreshes all and only status-dependent reports, including velocity and the current burnup fallback
  — `frontend/hooks/api/build/ticket-cache.ts:283-296` — `if (statusChanged)` block invalidates `cycleTime(projectId)`, `leadTime(projectId)`, and `cfd(projectId)` only. `criticalPath`, `velocity`, and `burnup` are not touched. Confirmed by `ticket-cache.test.ts` tests 3 and 6.

  **Rank wrinkle resolved inside ticket-cache.ts:** `useRankTicket` (ticket-create-rank-mutations.ts:249) passes `{ status: variables.status }`. When `variables.status` is `undefined` (same-column reorder), `statusChanged = false` and no reports are evicted. When `variables.status` is defined (cross-column drag = also a status transition), `statusChanged = true` and cycleTime/leadTime/cfd are correctly evicted. No change needed in ticket-create-rank-mutations.ts. **Criterion "a rank change evicts no report cache" is fully met.**

- [x] All six report reads use the documented staleness floor
  — `frontend/hooks/api/build/reports.ts:96,116,130,143,157,168` — all six hooks (`useVelocityReport`, `useBurnupReport`, `useCfdReport`, `useCriticalPath`, `useCycleTimeReport`, `useLeadTimeReport`) now use `staleTime: 2 * 60_000`.

- [x] Every cache key shape that is invalidated still has a reader
  — `buildWorkQueryKeys.projectReports.cycleTime(projectId)` → `useCycleTimeReport` (`reports.ts:151`)
  — `buildWorkQueryKeys.projectReports.leadTime(projectId)` → `useLeadTimeReport` (`reports.ts:162`)
  — `buildWorkQueryKeys.projectReports.cfd(projectId)` (prefix match) → `useCfdReport` uses `cfd(projectId, { days })` which is a strict superset of the prefix; `invalidateQueries` without `exact: true` matches by prefix ✓
  — `buildWorkQueryKeys.projectReports.velocity(projectId)` → `useVelocityReport` (now infinite query, same key)
  — `buildWorkQueryKeys.projectReports.burnup(projectId)` → `useBurnupReport` (`reports.ts:108`)
  — `buildWorkQueryKeys.projectReports.all` (predicate sweep in `invalidateBuildViews`) → covered by all five above
  — `build-cache-key-readers.mjs` does not exist on disk; reasoning from source confirms all shapes above have readers.

  **Also fixed in `invalidateBuildViews`:** removed the duplicate explicit `criticalPath` invalidation at the old line 193-196. It was outside the `aggregates` guard (evicting criticalPath even for time entries) and redundant with the `projectReports.all` sweep when `aggregates = true`. The broad sweep in `invalidateBuildViews` remains correct for create/delete/project-level operations.

  **cache-policy.md stale claim corrected:** line ~62 previously said the six factories live in `accounting-and-support.ts`. Corrected to `frontend/lib/query-keys/build-work.ts` under `buildWorkQueryKeys.projectReports` (`docs/build-module/performance-followup/cache-policy.md`).
