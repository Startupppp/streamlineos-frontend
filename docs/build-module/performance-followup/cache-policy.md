# Build cache policy — recommended

Concrete key, stale time, invalidation and optimistic-update policy for the Build surfaces this pass audited. Rows marked **today** describe current behaviour; **recommended** is the change.

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

Stale times follow the FE-24 ladder. All six report hooks currently sit at `60_000`, which is the standard-entity rung, not the slow-list rung the aggregates belong on.

| Hook | Key today | Recommended key | Stale time |
|---|---|---|---|
| `useVelocityReport` | `projectReports.velocity(projectId)` | `buildWork.projectReports.velocity(projectId, { limit, cursor })` | `2 * 60_000` |
| `useBurnupReport` | `projectReports.burnup(projectId, sprintId?)` | `buildWork.projectReports.burnup(projectId, cycleId?)` — rename the parameter | `2 * 60_000` |
| `useCfdReport` | `projectReports.cfd(projectId, { days })` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useCriticalPath` | `projectReports.criticalPath(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useCycleTimeReport` | `projectReports.cycleTime(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| `useLeadTimeReport` | `projectReports.leadTime(projectId)` | unchanged, moved to `build-work` | `2 * 60_000` |
| project analytics | `buildWork.projects.analytics(projectId)` | unchanged | `30_000` |

Every one of these factories lives in `accounting-and-support.ts` today and should move to `build-work.ts` (P2-7). Consumers import the domain module directly, never the aggregate (FE-18).

`staleTime` is a client-side freshness floor, not a staleness bound. With a 300 s server cache behind a 60 s client stale time, a refetch the client considers fresh can still return data five minutes old. Raising the client stale time to `2 * 60_000` narrows the gap between what the two layers promise; the revision key is what actually bounds correctness.

---

## Invalidation on mutation

### Ticket mutations

A ticket write already fans out further than it needs to. The rule is: patch what the response carries, invalidate only what the mutation can move.

| Mutation | `setQueryData` | `invalidateQueries` |
|---|---|---|
| title, description | the ticket detail and its row in every loaded list | nothing |
| status transition | detail, list row, board column membership, column counts | `projectReports.cycleTime`, `projectReports.leadTime`, `projectReports.cfd` |
| assignee | detail, list row | `projects.analytics` only when the board groups by assignee |
| rank | board order | nothing |
| story points, estimate | detail, list row | `projectReports.velocity`, `projectReports.burnup` |
| cycle membership | detail, list row, both cycles' membership lists | `projectReports.velocity`, `projectReports.burnup` |
| dependency add/remove | detail relations | `projectReports.criticalPath` |
| delete | remove from every loaded list | the reports the ticket contributed to |

`ticket-cache.ts:224` currently invalidates `projectReports.all` with a length predicate. That is the right prefix mechanism (FE-34) applied at the wrong altitude — it evicts all six reports for a title edit. Narrow it to the table above.

### Server-side, after commit

Bump the namespace after the transaction commits, never inside it (BE-82, BE-86). `registerAfterCommit` returning `false` means run it inline — do not drop the bump (BE-85).

---

## Optimistic updates

Per FE-36 and the recipe at `hooks/api/build/ticket-update-mutation.ts:93`.

**Optimistic** — title, status, priority, assignee, rank, labels, estimate, story points, watcher, checklist, and inline edits on board, list and card surfaces. Cancel and snapshot every key you patch, patch every cache the view renders, restore every snapshot `onError`, invalidate `onSettled`, and re-call `options?.onSuccess`.

**Never optimistic** — budget and cost figures, approvals, access changes, publication and portal visibility, secret rotation, destructive actions, incident resolution. These are the rows where a rollback the user has already read is worse than a spinner.

**No toast on an optimistic inline edit that already shows its result** (FE-82). The rollback is the error signal.

**Gate the expensive invalidations behind the fields that move them.** A status transition should invalidate cycle-time; a title edit should not. That gating is the whole point of the table above.
