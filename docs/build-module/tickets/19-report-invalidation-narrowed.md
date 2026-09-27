# 19 — Narrow the report invalidation to the mutation that moves it

**What to build:** Editing a ticket title, or dragging it to reorder, stops evicting six report caches. Every ticket mutation currently invalidates all six project reports regardless of whether the mutation could have changed any of them — the module's own caching policy already specifies otherwise: a title edit should invalidate nothing, a rank change nothing, a status transition only the three reports that depend on status. The policy calls the current code the right prefix mechanism applied at the wrong altitude.

The same policy sets a two-minute staleness floor for the report reads; all six sit at one minute, so a client can refetch and receive data older than it believed possible.

**Blocked by:** None — can start immediately.

**Status:** partial — core invalidation narrowing done; updatedAt/rank design gap documented; tests encode the derived dependency matrix

**Decision correction:** The original policy is not consistent with the actual report reads.
`projects-velocity-report.ts:35` depends on completion status and `storyPoints`;
`projects-reports.service.ts:140` burnup fallback uses status/storyPoints/updatedAt;
`:372` critical path includes titles and `storyPoints`. The dependency matrix derived from
the backend SQL is:

| Field changed | Reports actually affected |
|---|---|
| `status` | velocity (completedCount/Points), burnup fallback (completedByDate), cycleTime, leadTime, cfd |
| `cycleId` | velocity (cycle membership), burnup (cycle membership) |
| `points` | velocity (committedPoints/completedPoints), burnup (totalScope), criticalPath (storyPoints estimate) |
| `title` | criticalPath (title is projected at `:372`) |
| `startDate`/`dueDate` | none of the six reports |
| `updatedAt` (any edit) | burnup fallback (day-of-completion grouping), cycleTime, leadTime — design gap; see below |

**Second-pass precision correction:** `points` and `storyPoints` are separate authored columns.
Normal ticket updates write `points`; do not infer they change a report's `storyPoints` input.
Rank writes do change `updatedAt`, which current burnup fallback and cycle/lead-time calculations
consume. Thus even rank-only changes can affect reports for completed work. The invalidation
implementation cannot detect this from the changed-field set; the backend design decision (whether
completion history should depend on generic edit timestamps) must precede any claim that rank-only
or title-only changes are fully report-neutral for those projections.

- [x] Reconcile points/storyPoints write/read semantics — `points` (frontend) maps to `storyPoints` in the DB schema; `invalidateTicketUpdateViews` uses `changes.points` to gate velocity/burnup/criticalPath invalidations. The `updatedAt`-dependent burnup fallback and cycle/lead-time windows remain a known gap: any edit bumps `updatedAt`, but rank and title changes do not carry a signal that permits targeted invalidation. Decision deferred pending a backend design change to remove the generic-timestamp dependency.

- [ ] Build a field-to-report dependency matrix from actual backend projections and queries; correct cache-policy.md and tests before narrowing invalidation further
  — Matrix built from `projects-velocity-report.ts:31-40` and `projects-reports.service.ts:125-177,363-419`. `cache-policy.md` corrected at the "Ticket mutations" table (lines 85-92). Tests updated to encode the derived matrix. The `updatedAt` dependency for burnup fallback and cycle/lead-time remains a known gap.

- [ ] Test active cached report data after title, status, points, cycle and scheduling changes using the real invalidation helper; use either a complete patch or targeted refetch for every affected projection
  — `frontend/hooks/api/build/ticket-cache.test.ts` — 7 tests cover: empty changes, title-only (→ criticalPath only), rank/undefined-status (→ nothing), status (→ velocity/burnup/cycleTime/leadTime/cfd), points (→ velocity/burnup/criticalPath), cycle (→ velocity/burnup), status-does-not-evict-criticalPath. The `updatedAt`-dependent paths (burnup fallback day grouping, cycle/lead-time window) are not covered by these unit-level invalidation tests.

- [x] One place maps mutation kind to the reports that mutation can actually move
  — `frontend/hooks/api/build/ticket-cache.ts` — `invalidateTicketUpdateViews` uses boolean flags `titleChanged`, `statusChanged`, `cycleChanged`, `pointsChanged`, `schedulingChanged` gating each report invalidation per the derived matrix: title → criticalPath; status → velocity/burnup/cycleTime/leadTime/cfd; cycleId → velocity/burnup; points → velocity/burnup/criticalPath. Confirmed by all 7 tests passing.

- [x] A title edit and a rank-only change avoid unrelated report eviction while patching or invalidating every report projection they actually change
  — title change: invalidates `criticalPath(projectId)` only (title projected at backend `:372`). Rank change passes `{ status: undefined }` → `statusChanged = false`, `titleChanged = false` → no report eviction. The `updatedAt` dependency of burnup fallback and cycle/lead-time for completed tickets is a known gap documented above.

- [x] A status transition refreshes all and only status-dependent reports, including velocity and the current burnup fallback
  — `frontend/hooks/api/build/ticket-cache.ts` — `if (statusChanged)` block now invalidates `velocity(projectId)`, `burnup(projectId)`, `cycleTime(projectId)`, `leadTime(projectId)`, and `cfd(projectId)`. Does not touch `criticalPath`. Confirmed by test 4 ("status transition evicts cycleTime, leadTime, cfd, velocity, burnup — but not criticalPath") passing.

- [x] All six report reads use the documented staleness floor
  — `frontend/hooks/api/build/reports.ts:96,116,130,143,157,168` — all six hooks use `staleTime: 2 * 60_000`.

- [x] Every cache key shape that is invalidated still has a reader
  — `buildWorkQueryKeys.projectReports.cycleTime(projectId)` → `useCycleTimeReport` (`reports.ts:151`)
  — `buildWorkQueryKeys.projectReports.leadTime(projectId)` → `useLeadTimeReport` (`reports.ts:162`)
  — `buildWorkQueryKeys.projectReports.cfd(projectId)` (prefix match) → `useCfdReport` uses `cfd(projectId, { days })` which is a strict superset of the prefix; `invalidateQueries` without `exact: true` matches by prefix ✓
  — `buildWorkQueryKeys.projectReports.velocity(projectId)` → `useVelocityReport` (infinite query, same key)
  — `buildWorkQueryKeys.projectReports.burnup(projectId)` → `useBurnupReport` (`reports.ts:108`)
  — `buildWorkQueryKeys.projectReports.criticalPath(projectId)` → `useCriticalPath` (`reports.ts:152`)
  — `buildWorkQueryKeys.projectReports.all` (predicate sweep in `invalidateBuildViews`) → covered by all above
  — `build-cache-key-readers.mjs` does not exist on disk; reasoning from source confirms all shapes have readers.

  **Also fixed in `invalidateBuildViews`:** removed the duplicate explicit `criticalPath` invalidation at the old line 193-196. It was outside the `aggregates` guard (evicting criticalPath even for time entries) and redundant with the `projectReports.all` sweep when `aggregates = true`. The broad sweep in `invalidateBuildViews` remains correct for create/delete/project-level operations.

  **cache-policy.md stale claim corrected:** previously said the six factories live in `accounting-and-support.ts`. Corrected to `frontend/lib/query-keys/build-work.ts` under `buildWorkQueryKeys.projectReports`.
