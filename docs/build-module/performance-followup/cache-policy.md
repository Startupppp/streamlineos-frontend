# Build cache policy — recommended

Concrete key, stale time, invalidation and optimistic-update policy for the Build surfaces this pass audited. Rows marked **today** describe current behaviour; **recommended** is the change.

**2026-09-27 correction:** Unless explicitly reverified below, "today" describes the earlier
snapshot, not this checkout. This is a policy proposal, not proof of measured latency or correct
invalidation. Ticket 19 remains open because its previous field-to-report mapping omitted real
dependencies. Authorize every cache read; share across actors only for identical authorized data
projections, never merely because two callers have the same organization ID.

Server namespaces follow BE-121: read with `cachedVersioned`, bump with `invalidateNamespace`. Client keys follow FE-19 and FE-20 — the array is tenant-free, the scope lives in the hash via `scopedQueryKeyHashFn`.

---

## Server caches

### `GET /build/:projectId/reports/{burnup,velocity,cycle-time,lead-time,critical-path}`

| | |
|---|---|
| Today | `cache.cached()` with an exact key ending `:r<projects.report_revision>`; TTL 30 s (burnup, velocity) or 300 s (the rest) |
| Key | `projects:<report>:<orgId>:<projectId>[:<discriminator>]:r<revision>` |
| Shaping inputs in key | burnup: `cycleId` · velocity: `limit`, `cursor` · the other three: none needed |
| Invalidation | the `report_revision` column, bumped by the `1073` statement triggers |
| Recommended | keep the revision-in-key design — it is correct and survives a Redis flush. Fix P0-1 before `a-sprint-cycle-04-detach` runs, or the revision stops moving. Narrow the trigger set per P2-4 once measured. |

Revision-in-key means there is no explicit eviction, by design. The new analyser reports such shapes separately from true orphans for exactly this reason.

### `GET /build/billing-summary`

| | |
|---|---|
| Today | `cachedVersioned("build:billing-summary:<orgId>", "<userId>:<all\|self>:<start>:<end>")`, default TTL 300 s |
| Invalidation | `invalidateNamespace` at `timesheets.service.ts:185, :221, :493` |
| Verdict | correct. The gate's three findings against it are false (P2-3). |
| Recommended | no change. State the 300 s TTL explicitly at the call site rather than relying on the default. |

### `GET /build/:projectId/analytics`

| | |
|---|---|
| Today | uncached; nine `del` calls evict a key nothing writes (P1-1) |
| Recommended key | `cachedVersioned("build:analytics:<orgId>", "<projectId>")` |
| Recommended TTL | `CACHE_TTL.SHORT` (30 s) — the payload is a health score over live ticket state |
| Recommended invalidation | replace all nine `cache.del(\`projects:analytics:…\`)` with `invalidateNamespace(\`build:analytics:${orgId}\`)` at the same nine sites |
| Scope | project-wide aggregate behind `assertProjectInOrg`; safe to share across actors in the org, so the actor must **not** enter the key |

### `GET /build/resource-allocation`

Do not cache before it is paginated (P2-2). An unbounded response is the defect; caching it hides the growth instead of bounding it.

---

## Client query keys and stale times

Stale times follow the FE-24 ladder. The six report hooks now declare `2 * 60_000`; this source
change is not proof of a maximum data-age bound or of fresh reports after every mutation.

| Hook | Key today | Recommended key | Stale time |
|---|---|---|---|
| `useVelocityReport` | `projectReports.velocity(projectId)` | unchanged — `useInfiniteQuery` manages pages under this single key via internal `pageParam`; no cursor segment needed in the key | `2 * 60_000` |
| `useBurnupReport` | `projectReports.burnup(projectId, sprintId?)` | `buildWork.projectReports.burnup(projectId, cycleId?)` — rename the parameter | `2 * 60_000` |
| `useCfdReport` | `projectReports.cfd(projectId, { days })` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useCriticalPath` | `projectReports.criticalPath(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useCycleTimeReport` | `projectReports.cycleTime(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useLeadTimeReport` | `projectReports.leadTime(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| project analytics | `buildWork.projects.analytics(projectId)` | unchanged | `30_000` |

Every one of these factories lives in `frontend/lib/query-keys/build-work.ts` today under `buildWorkQueryKeys.projectReports`. Consumers import the domain module directly, never the aggregate (FE-18).

**Decision — velocity cursor in key (2026-09-27):** cache-policy.md previously prescribed `velocity(projectId, { limit, cursor })` — a cursor literally in the query key. The board (`useProjectBoardTickets`) manages pagination via `useInfiniteQuery`'s internal `pageParam` with no cursor in the key, per the pattern ticket 33 explicitly requires to match. Following the board: `useVelocityReport` uses `useInfiniteQuery`; all pages accumulate under `projectReports.velocity(projectId)` without a cursor segment. "Pages do not collide" is satisfied by TanStack storing each page at a distinct offset within one cache entry, not by a literal cursor in the key. The cursor-in-key row above is corrected accordingly.

`staleTime` controls when the client considers a query stale; it neither triggers a refetch by itself nor bounds the age of the server response. Raising it can delay freshness. Validate revision advancement, all read dependencies and refetch triggers together before claiming an end-to-end freshness bound.

---

## Invalidation on mutation

### Ticket mutations

A ticket write already fans out further than it needs to. The rule is: patch what the response carries, invalidate only what the mutation can move.

| Mutation | `setQueryData` | `invalidateQueries` |
|---|---|---|
| title, description | detail and rendered list rows; patch matching report labels where the projection is known | affected search counts; critical-path title projection unless patched; account for current burnup updatedAt fallback |
| status transition | detail, list row, board membership and counts only where patching is exact | cycleTime, leadTime, cfd, velocity and current burnup fallback |
| assignee | detail, list row | `projects.analytics` only when the board groups by assignee |
| rank | board order | current updatedAt-dependent burnup fallback and cycle/lead-time results when affected; not automatically report-neutral |
| points, storyPoints, estimate | detail, list row | map the actual persisted field first: points and storyPoints are distinct; invalidate only the projections consuming it or updatedAt |
| cycle membership | detail, list row, both cycles' membership lists | `projectReports.velocity`, `projectReports.burnup` |
| dependency add/remove | detail relations | `projectReports.criticalPath` |
| delete | remove from every loaded list | the reports the ticket contributed to |

**2026-09-27 correction (ticket 19):** The dependency matrix above is derived from the actual backend
projections (`projects-velocity-report.ts:31-40`, `projects-reports.service.ts:125-177,363-419`).
`ticket-cache.ts` now implements this matrix correctly: status → {velocity, burnup, cycleTime, leadTime,
cfd}; points → {velocity, burnup, criticalPath}; title → {criticalPath}; cycleId → {velocity, burnup}.
The previous note that "the tested policy omits velocity/burnup for status changes" was inaccurate and
is withdrawn. The `updatedAt`-dependent burnup fallback and cycle/lead-time paths (rank and any edit
bump `updatedAt`) remain a known design gap: targeted invalidation of those paths requires a backend
change to remove the generic-timestamp dependency from those report projections. That gap is documented
in ticket 19, not this table.

- [ ] Exercise real cache invalidation and report projections after each supported mutation, including filtered counts and optimistic rollback; do not mock away the invalidation helper being verified. **2026-09-27:** The invalidation matrix in `ticket-cache.ts:281-348` is implemented correctly (status→{velocity,burnup,cycleTime,leadTime,cfd}; points→{velocity,burnup,criticalPath}; title→{criticalPath}; cycleId→{velocity,burnup}). Actual end-to-end verification — that invalidation causes refetches, that counts update, and that rollback restores state — requires integration tests against a running API with a real Redis instance. CI is dead (lapsed billing) so this cannot be automatically confirmed.
- [ ] Separate client freshness settings, server TTL/revision policy and end-to-end stale-data bounds in measurements; report dataset size, cache hit/miss and p95 latency rather than inferred speedups. **2026-09-27:** Client stale times are documented in the table above (all report hooks at `2 * 60_000`, verified `frontend/hooks/api/build/reports.ts:133,149,160,171,181,191`). Server TTLs are documented for billing-summary (300 s) and report-revision-keyed endpoints (30 s burnup/velocity, 300 s others). End-to-end measurements (cache hit/miss ratios, p95 latency from RUM) require a production-connected profiling run — not available in this session.

### Server-side, after commit

Bump the namespace after the transaction commits, never inside it (BE-82, BE-86). `registerAfterCommit` returning `false` means run it inline — do not drop the bump (BE-85).

---

## Optimistic updates

Per FE-36 and the recipe at `hooks/api/build/ticket-update-mutation.ts:93`.

**Optimistic** — title, status, priority, assignee, rank, labels, estimate, story points, watcher, checklist, and inline edits on board, list and card surfaces. Cancel and snapshot every key you patch, patch every cache the view renders, restore every snapshot `onError`, invalidate `onSettled`, and re-call `options?.onSuccess`.

**Never optimistic** — budget and cost figures, approvals, access changes, publication and portal visibility, secret rotation, destructive actions, incident resolution. These are the rows where a rollback the user has already read is worse than a spinner.

**No toast on an optimistic inline edit that already shows its result** (FE-82). The rollback is the error signal.

**Gate the expensive invalidations behind the fields that move them.** A status transition should invalidate cycle-time; a title edit should not. That gating is the whole point of the table above.
