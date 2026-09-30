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
`ticket-cache.ts` implements **four** of this table's eight rows correctly: status → {velocity, burnup,
cycleTime, leadTime, cfd}; points → {velocity, burnup, criticalPath}; title → {criticalPath}; cycleId →
{velocity, burnup}. The previous note that "the tested policy omits velocity/burnup for status changes"
was inaccurate and is withdrawn. The `updatedAt`-dependent burnup fallback and cycle/lead-time paths
(rank and any edit bump `updatedAt`) remain a known design gap: targeted invalidation of those paths
requires a backend change to remove the generic-timestamp dependency from those report projections. That
gap is documented in ticket 19, not this table.

**2026-09-28 correction — the scope of that claim was too wide, and this was the third document carrying
it.** "Implements this matrix" reads as all eight rows; it is four. Read at
`frontend/hooks/api/build/ticket-cache.ts:231-349`: `invalidateTicketUpdateViews` takes a `changes`
object declaring eight keys (`:236-243`) and derives five flags (`:271-277`), of which four have a
branch. The table's other four rows are not implemented by this function.

- **assignee** — `assigneeId` and `assigneeIds` are parameters with **no branch**. The table says
  `projects.analytics` should be invalidated "only when the board groups by assignee"; in fact
  `projects.analytics(projectId)` sits in the unconditional head (`:258-261`) and is invalidated on
  *every* ticket update, assignee or not, grouping or not. The code is neither assignee-scoped nor
  grouping-conditional, so this row and the code contradict each other in both directions. Narrowing it
  is a behaviour change; either the call moves into a branch or this row is rewritten to describe what
  ships.
- **rank** — not a parameter of this function at all; rank moves are handled elsewhere.
- **dependency add/remove** and **delete** — likewise other helpers.

And a fifth flag, `schedulingChanged` (`:275-277`), is derived from `startDate`/`dueDate` and appears
**only** in the early-return guard at `:278`. It has no branch, so a date edit passes the guard, falls
through all four branches and reaches only `dashboard.activeSprintSummary()` — leaving `criticalPath`,
`cycleTime` and `leadTime` stale, all three of which are date-driven. Both defects are recorded with
owner options in [`../03-api-contracts.md`](../03-api-contracts.md) box 2; they are frontend source
edits and are routed to the orchestrator.

**2026-09-28, third lane — the two defects above are FIXED, a third was found and fixed, and three rows
of the matrix are corrected. Neither the table nor the 2026-09-27/2026-09-28 notes above are deleted:
they record what the code did, and this records what it does.**

- **`schedulingChanged` now has a branch.** `frontend/hooks/api/build/ticket-cache.ts:345-359` invalidates
  `projectReports.criticalPath`, `projectReports.cycleTime` and `projectReports.leadTime` on a
  `startDate`/`dueDate` edit, and deliberately not `velocity` or `burnup`, which are points- and
  cycle-driven. A `startDate` case and a `dueDate` case in `ticket-cache.test.ts` pin it.
- **The `assignee` row is CORRECTED to describe what ships, and the code is the half that was right.**
  The row said `projects.analytics` should be invalidated "only when the board groups by assignee".
  That is wrong, and narrowing the call to match it would have been a correctness regression:
  `GET /build/:projectId/analytics` is, by this document's own § Server caches description, "a health
  score over live ticket state" at `CACHE_TTL.SHORT` (30 s) — a project-wide aggregate that *any*
  ticket edit moves, assignee or not. The unconditional call in the head of
  `invalidateTicketUpdateViews` (`:258-261`) is correct. **Read the row as: assignee → detail and list
  row patched; `projects.analytics` invalidated unconditionally on every ticket update, by design,
  with a 30 s client `staleTime` behind it.** Two tests pin that `assigneeId` and `assigneeIds`
  invalidate `projects.analytics` and no report.
- **The `dependency add/remove` row was NOT implemented, and now is.** This is a third defect, found by
  following the row itself. `useAddTicketRelation` and `useRemoveTicketRelation`
  (`frontend/hooks/api/build/ticket-sub-resources.ts`) invalidated only
  `projects.ticketRelations(ticketId)`; both now also invalidate
  `projectReports.criticalPath(projectId)` with `refetchType: "none"`. Before the fix, adding or
  dropping a blocking edge left the critical path — the one report built from the dependency graph —
  stale until focus or remount.
- **The `delete` row is corrected downward to what ships.** It says "remove from every loaded list".
  `useDeleteTicket` (`ticket-create-rank-mutations.ts:177-203`) does not patch rows out; it calls
  `invalidateBuildViews`, which invalidates the lists, the detail, the counts and every
  `projectReports` key for the project. `removeTicketFromCollections` exists but is used only to roll
  back an optimistic *create* (`:155`). FE-35 permits refetching where the response carries no new
  state, and a delete response carries none, so this is a policy rather than a gap — but the row
  overstated it.
- **The `rank` row and the test that contradicts it: the test is right for this helper.** `rank` is not
  a parameter of `invalidateTicketUpdateViews` at all, so the suite's assertion that a rank change
  evicts no report cache is a true statement *about that function*. The row's point — that any edit
  bumps `updatedAt` and the burnup fallback and cycle/lead-time paths read it — is a statement about
  the backend projections and remains an open design gap (ticket 19), not a defect in this helper.
  Rank's own invalidation goes through `useRankTicket`, covered by
  `ticket-cache-regression.test.ts` ("rank status changes refresh counts, reports and dashboard").
  The two statements are about different code and both stand.

- [ ] Exercise real cache invalidation and report projections after each supported mutation, including filtered counts and optimistic rollback; do not mock away the invalidation helper being verified.
  **NOT EARNED 2026-09-29 — the client half is done (`frontend/hooks/api/build/ticket-cache.test.ts` drives the real helper against a real `QueryClient`, with scheduling, assignee, filtered-count and rollback cases). The server half is not: whether `invalidateNamespace` actually evicts under the right `orgId` after commit needs a Redis, and the only one configured is the production Upstash instance in `backend/.env`. Earned by that assertion against a non-production Redis.**

  **(A) understated what already exists.** A non-mocked test suite runs today: `frontend/hooks/api/build/ticket-cache.test.ts` drives the real `invalidateTicketUpdateViews` against a real `QueryClient`, with `jest.spyOn(client, "invalidateQueries")` calling through rather than replacing it — so the helper under test is not mocked away. Verbatim this lane:

  ```
  $ npx jest hooks/api/build/ticket-cache.test.ts
  PASS hooks/api/build/ticket-cache.test.ts
    19 — invalidateTicketUpdateViews narrows report eviction per cache-policy.md
      √ empty changes (no fields at all) evict no report cache (5 ms)
      √ title-only change evicts only criticalPath (title is projected in the critical-path query) (2 ms)
      √ rank change with undefined status evicts no report cache (1 ms)
      √ status transition evicts cycleTime, leadTime, cfd, velocity, burnup — but not criticalPath (1 ms)
      √ points change evicts velocity, burnup, and criticalPath — but not cycleTime, leadTime, cfd (1 ms)
      √ cycle membership change evicts velocity and burnup — and no other report (1 ms)
      √ status change does not evict criticalPath
  Tests:       7 passed, 7 total
  ```

  This is therefore not a choice between static analysis and an integration stack: the jsdom-reachable half of the box is already instrumented and green.

  **(B) overstated what is needed, and named an instrument that does not exist.** The recorded instrument was "boot via `pnpm dev` in a Docker compose with Redis". There is **no compose file in this repository** — `git ls-files | grep -iE "docker-compose|compose\.ya?ml|Dockerfile"` returns nothing — and the only Redis configured is `UPSTASH_REDIS_REST_URL` in `backend/.env`, the same file whose `APP_DATABASE_URL` names the production RDS host. Booting a local API against that would exercise **production's** cache namespaces. That is a hazard, not a harness.

  **WHAT IS ACTUALLY MISSING, itemised.** The box names three things: one is partly covered, two are not covered at all.

  1. *Per-mutation invalidation* — covered for 4 of this document's 8 mutation rows (`title`, `status`, `points`, `cycle membership`). **Not covered:** `assignee` (a declared parameter with no branch), `rank` (only asserted *not* to evict — see below), `dependency add/remove` and `delete` (other helpers, untested here). Cases for `startDate`/`dueDate` and `assigneeId`/`assigneeIds` need no harness at all — the existing file is the template.
  2. *Filtered counts* — **zero coverage.** Nothing asserts that a status transition moves `projects.columnCounts(projectId)`, which the unconditional-head reading shows is invalidated only inside the `statusChanged` branch.
  3. *Optimistic rollback* — **zero coverage** in this suite. The recipe is at `frontend/hooks/api/build/ticket-update-mutation.ts:93` (FE-37); nothing here asserts every snapshot is restored `onError`.

  **One existing assertion contradicts this document.** The suite's third test, `rank change with undefined status evicts no report cache`, asserts rank is report-neutral. The `rank` row of the table above says the opposite — "not automatically report-neutral", because any edit bumps `updatedAt` and the burnup fallback and cycle/lead-time paths read it. The test as named pins the gap the correction above documents rather than the policy, and the two cannot both stand: either the test's name says it is pinning a known gap, or the row is wrong.

  **DECISION RESOLVED 2026-09-28 — split the box by what each half needs, because (A) and (B) are not the real alternatives.** The *client* invalidation half is earnable today: three added jsdom cases (scheduling, assignee, filtered counts) plus a rollback case, no infrastructure, no browser. The *server* half — does `invalidateNamespace` actually evict, under the right `orgId`, after the transaction commits — needs a Redis that is not the production instance, and this repository has none. Recording that split is the honest outcome. The box stays unticked; the client tests are ordinary work routed to the orchestrator; the server half is blocked on a non-production Redis, the same class of blocker as the non-production PostgreSQL in open question 12.

  **2026-09-28, third lane — the client half of that split is now DONE. The box stays unticked on the server half, and on one word in its own wording.**

  **THREE OF THE FOUR ITEMISED GAPS ARE CLOSED, and the fourth turns out to have been measured against the wrong file.**

  1. *Per-mutation invalidation* — was 4 of 8 rows. **Now 8 of 8.** `scheduling` and `assignee` gained branches-and-tests in `ticket-cache.test.ts`; `dependency add`, `dependency remove` and `delete` gained tests in `ticket-cache-regression.test.ts`, and the dependency pair gained the `criticalPath` invalidation it had never had; `rank` was already covered there. Detail in [`../03-api-contracts.md`](../03-api-contracts.md) box 2.
  2. *Filtered counts* — was **zero coverage**. **Now three cases**, all asserting on `buildWorkQueryKeys.projects.columnCounts(projectId)`: a status transition evicts it, a cycle-membership change evicts it, and a title-only change leaves it alone. The third is the one that makes the first two mean something.
  3. *Optimistic rollback* — **CLAIM CORRECTED. It was never zero; it was measured in the wrong file.** The previous entry said "zero coverage **in this suite**", which is true of `ticket-cache.test.ts` and irrelevant: rollback is covered in the sibling suite `frontend/hooks/api/build/ticket-cache-regression.test.ts`, by three tests — *"a failed edit preserves newer ticket changes, project fields and loaded pages"* (`:14`), *"rolls back filtered multipage boards and paginated lists after failure"* (`:59`), and the infinite-board case at `:45`. And it is covered the way this box demands: that file mocks the **transport** (`jest.mock("@/lib/api-client", …)`) and the access hook, then drives the real `useUpdateTicket` through a real `createAppQueryClient()` — so `patchTicketCollections`, `restoreTicketCollections`, `ticketRollback` and `rollbackTicketFields` all execute for real. **The invalidation helper being verified is not mocked away anywhere in either suite.** The first test even rewrites the cache mid-flight and asserts that the rollback preserves the *newer* value rather than clobbering it with the pre-mutation snapshot, which is the hard case.

  Evidence, verbatim, `frontend/` — 27 tests across the two suites, of which 7 are this lane's:

  ```
  $ nice -n 10 npx jest --maxWorkers=2 hooks/api/build/ticket-cache.test.ts
  Tests:       14 passed, 14 total
  $ nice -n 10 npx jest --maxWorkers=2 hooks/api/build/ticket-cache-regression.test.ts
  Tests:       13 passed, 13 total
  ```

  Full test-name listings are in `../03-api-contracts.md` box 2 rather than duplicated here.

  **WHY IT STILL DOES NOT TICK, and it is now one clause of the criterion rather than a whole half.** The box asks to exercise real cache invalidation **and report projections** after each supported mutation. The invalidation is exercised. A *report projection* is a server-rendered payload — what `GET /build/:projectId/reports/velocity` actually returns after the mutation, read through `cache.cached()` under a key ending `:r<report_revision>`. Observing that requires the API and its Redis, and the only Redis configured is `UPSTASH_REDIS_REST_URL` in `backend/.env`, the same file whose `APP_DATABASE_URL` names the production RDS host. There is still no compose file (`git ls-files | grep -iE "docker-compose|compose\.ya?ml|Dockerfile"` → nothing). So the server half is unchanged and unchangeable here: **whether `invalidateNamespace` evicts, under the right `orgId`, after the transaction commits, and whether the next read returns the new projection, is not observable in this checkout.** Same class of blocker as the non-production PostgreSQL in open question 12.

  **SETTLES WHEN** a non-production Redis and API exist, and one run records, per mutation, the report payload before and after. Until then the client half is complete and the box is unticked on the two words "report projections" — not on invalidation, not on filtered counts, and not on rollback.

  **2026-09-30 REVALIDATION.** The two client suites now pass 29/29, and the seven Build analytics
  suites pass 32/32, including the revision-key cache test. The server clause remains unmeasured:
  there is no local Redis listener or compose fixture, and the only configured Redis URL is the
  production Upstash endpoint. No request was sent to it.
- [ ] Separate client freshness settings, server TTL/revision policy and end-to-end stale-data bounds in measurements; report dataset size, cache hit/miss and p95 latency rather than inferred speedups.
  **NOT EARNED 2026-09-29 — clauses 1 and 2 (client freshness settings, server TTL and revision policy) are recorded below with source lines; clause 3, the end-to-end stale-data bound, has no number because it needs a running app and a database. Earned by reporting dataset size, cache hit/miss and p95 latency against a non-production database.**

  **1. CLIENT FRESHNESS SETTINGS.** All six report hooks declare `staleTime: 2 * 60_000` (`frontend/hooks/api/build/reports.ts:133,149,160,171,181,191`, re-verified this lane). Project analytics is `30_000`. The client-wide defaults, which no report hook overrides, are `staleTime: 1000 * 60 * 2`, `gcTime: 1000 * 60 * 10` and **`refetchOnWindowFocus: false`** (`frontend/components/providers/query-provider.tsx:69-71`). That last one is load-bearing and was never recorded before: TanStack's own focus refetch is switched off app-wide.

  **2. SERVER TTL AND REVISION POLICY.** Each report reads through `cache.cached()` under a key ending `:r<projects.report_revision>`: burnup and velocity at `CACHE_TTL.SHORT`, cycle-time, lead-time and critical-path at `CACHE_TTL.MEDIUM` (`backend/src/modules/build/core/analytics/projects-reports.service.ts`; TTL arguments at `:121`, `:230`, `:323`, `:359`, `:429` as of this run — a sibling lane is editing that file, so verify by cache-key name rather than by line). `CACHE_TTL.SHORT = 30`, `CACHE_TTL.MEDIUM = 300` (`backend/src/common/cache/cache-keys.ts:307-314`), which is the 30 s / 300 s split the § Server caches row states. **The consequence that row does not draw: because the revision is inside the key, the TTL is not a staleness bound at all.** A committed write bumps `report_revision`, the key changes, and the old entry is never read again — it merely expires. The server TTL bounds memory, not freshness.

  **3. END-TO-END STALE-DATA BOUND — there is no number, and the reason is structural, not missing instrumentation.** Client invalidation uses `refetchType: "none"` throughout `ticket-cache.ts`, so it marks stale without refetching; TanStack's focus refetch is off (item 1). What actually refreshes a stale Build report is a hand-rolled listener: `subscribeBuildCacheSync` (`frontend/lib/build-cache-sync.ts:68`, mounted at `frontend/components/providers/query-provider.tsx:113`) registers `window.addEventListener("focus", refreshActiveBuildQueries)` (`:108`) and a `visibilitychange` handler (`:102-104`), and `refreshActiveBuildQueries` calls `client.refetchQueries({ queryKey, type: "active" })` over `BUILD_QUERY_PREFIXES` (`:90`) — which includes `buildWorkQueryKeys.projectReports.all` (`:12`) — throttled to 15 s by `BUILD_FOCUS_REFRESH_THROTTLE_MS` (`:9`). A cross-tab `BroadcastChannel` or `localStorage` message invalidates the same prefixes (`:77`). Remount is the fourth trigger. **None of those four is a clock.** So: for a report left mounted in a tab that keeps focus, the upper bound on data age is *unbounded*; for a user who leaves and returns to the tab, it is their next focus event plus up to 15 s. That is the honest end-to-end bound, and it is a statement about triggers rather than a duration — which is exactly the separation this box asks for, and exactly why a single "freshness" number would have been false.

  **WHY IT STILL DOES NOT TICK.** The second clause asks for dataset size, cache hit/miss and p95 latency, and none is obtainable here. The read-cost harness that would give plan shape and buffer counts autoloads `backend/.env` and therefore defaults to the **production** RDS host — exact evidence and the required override are in [`../02-schemas.md`](../02-schemas.md) box 1 — and the only Redis configured is the production Upstash instance, so `INFO STATS` would be a production observation, not a measurement of this checkout. The missing piece is a fixture-shaped non-production database: on a zero-row target the planner chooses a Seq Scan regardless of indexing, so a local run yields plan shapes that prove nothing about cost, and a p95 from it would be fiction. **Leaving this unticked is the correct outcome — the separation is now recorded, the numbers are not, and a number derived from a zero-row plan would be worse than none.**

  **2026-09-28, third lane — STILL NOT EARNED. The first clause's separation is re-confirmed on disk, and the second clause's blocker is now WORSE than recorded: the harness connects on `--self-test`.**

  **Said plainly: this lane took no latency measurement and read no cache statistics. There are no numbers below and none is substituted.**

  Clause 1 re-verified this lane, unchanged: the six report hooks declare `staleTime: 2 * 60_000`; project analytics `30_000`; the client-wide defaults `staleTime: 1000 * 60 * 2`, `gcTime: 1000 * 60 * 10` and **`refetchOnWindowFocus: false`** (`frontend/components/providers/query-provider.tsx:69-71`), which no report hook overrides. The end-to-end bound is unchanged and is still a statement about triggers rather than a duration — remount, a cross-tab `BroadcastChannel` message, and tab focus/`visibilitychange` through `subscribeBuildCacheSync` throttled to 15 s. None is a clock, so a report left mounted in a focused tab has no upper bound on data age.

  **ONE THING DID CHANGE IN CLAUSE 1, and it belongs here because it is a freshness fact.** A dependency add or remove now invalidates `projectReports.criticalPath` (see the matrix correction above). Before this lane, a dependency edit was a mutation with **no** refresh trigger at all for the report built from it — not even a stale-marking — so the critical path's data age was unbounded in the strong sense rather than the trigger sense. That is now one of the marked-stale paths like the others.

  **CLAUSE 2'S BLOCKER, corrected upward.** [`../02-schemas.md`](../02-schemas.md) box 1 has been recording that `db:check-read-budgets --self-test` "passes with no database", so specs could be authored and their breach detection proven before a fixture exists. **That is false in this checkout, and this lane found it by running it:**

  ```
  $ node src/scripts/run-read-cost-budgets.mjs --self-test
  ◇ injected env (46) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
  RUNNER FAILED: PAM authentication failed for user "streamline_app"
  ```

  Confirmed statically afterwards, not by a second attempt: the connection opens at `run-read-cost-budgets.mjs:359` and the role is queried at `:365`, before the `--self-test` flag read at `:317` has any effect on control flow. **So the one instrument this clause depends on cannot even be self-tested without an explicit non-production `APP_DATABASE_URL` on the command line.** The attempt failed at authentication so no `EXPLAIN` ran, but it was a connection attempt to the production host and must not be repeated. The Redis half is unchanged: the only configured instance is the production Upstash one, so `INFO STATS` would be a production observation.

  **DECISION (B), measurement required, STANDS — and the measurement is now blocked at one level deeper than recorded.** It is not merely that the numbers need a fixture-shaped non-production database; it is that the harness's own dry run needs one too. **NOT A REQUIREMENT:** the absence of dataset size, hit/miss and p95 figures is an unmeasured state, not a waiver, and a p95 derived from a zero-row plan would be worse than none.

  **2026-09-30 REVALIDATION.** No PostgreSQL or Redis listener exists on loopback. Both database
  variables in `backend/.env` resolve to RDS and the configured Redis URL resolves to Upstash, so no
  live measurement or nominal read-budget self-test was run. Offline detector tests passed, but they
  do not provide dataset size, hit/miss, plan buffers, or p95 latency and therefore do not earn this
  criterion.

### Server-side, after commit

Bump the namespace after the transaction commits, never inside it (BE-82, BE-86). `registerAfterCommit` returning `false` means run it inline — do not drop the bump (BE-85).

---

## Optimistic updates

Per FE-36 and the recipe at `hooks/api/build/ticket-update-mutation.ts:93`.

**Optimistic** — title, status, priority, assignee, rank, labels, estimate, story points, watcher, checklist, and inline edits on board, list and card surfaces. Cancel and snapshot every key you patch, patch every cache the view renders, restore every snapshot `onError`, invalidate `onSettled`, and re-call `options?.onSuccess`.

**Never optimistic** — budget and cost figures, approvals, access changes, publication and portal visibility, secret rotation, destructive actions, incident resolution. These are the rows where a rollback the user has already read is worse than a spinner.

**No toast on an optimistic inline edit that already shows its result** (FE-82). The rollback is the error signal.

**Gate the expensive invalidations behind the fields that move them.** A status transition should invalidate cycle-time; a title edit should not. That gating is the whole point of the table above.
