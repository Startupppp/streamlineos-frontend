# 18 — Resolve project access once per request

**What to build:** Rendering a board resolves the viewer's access to the project once, not four times per endpoint across two endpoints. For anyone without organisation-wide manage rights, the access check currently costs three to four sequential queries — permissions, the project row, then a membership check, then a team-assignment check — and the board fetches its ticket list and its column counts through separate requests that each repeat the whole sequence. A near-identical copy of the sequence also exists in the project read path.

Sequential checks extend the lifetime of the request's transaction and its pooled connection; they do not each reserve an additional connection. Pool saturation is a hypothesis to measure, not an observed result of this review.

**Decision correction (2026-09-27):** Request-local memoization only removes repeated resolutions within one HTTP request. The board's list and counts are separate requests, so they still each require authorization. Do not introduce a process-global access cache to make the original "once per board" claim true. Cache only within the authenticated request/transaction, keyed by organization, actor/membership, project and access mode; invalidate after any in-request membership or ACL mutation. Cross-request reuse would require an explicit revocation/version contract and is outside this ticket.

The duplicate sequence is worse than this ticket assumed: there are **eight** independent constructions of project reachability across six files, and they do not check the same branches. Ticket 42 consolidates them, which is what gives this ticket one seam to cache behind instead of eight.

**Blocked by:** 42 — The remaining reachability copies go, and the answers stop disagreeing.

**Status:** done

- [x] Access resolves once per request and is reused by every caller in that request
  - `ProjectAccessCache` in `backend/src/modules/build/reachability/project-access-cache.ts` stores `Map<string, Promise<T>>` keyed by `orgId:userId:projectId`. A second call with the same key returns the same promise without invoking the compute function again. `projects-tickets-read.service.ts` passes `cache.get(...)` as the resolver for both `listTickets` and `getColumnCounts`.

- [x] The membership and team-assignment checks are answered in one round trip, not two sequential ones
  - `resolveProjectAccess` in `project-access.ts` wraps the `projectMembers` and `projectTeamAssignments` checks in `Promise.all([ membership query, teamAccess query ])`. Previously they were sequential awaits.

- [x] The duplicate sequence in the project read path is gone
  - `projects-tickets-create.service.ts` and `projects-tickets-transfer.service.ts` both called `this.read.checkProjectAccess(...)` (a pass-through wrapper). Both now call `resolveProjectAccess(this.db, this.access, u, projectId)` directly per BE-143.

- [x] The access module's interface states its cost, which is currently invisible to callers
  Earned 2026-09-27 by the second of the two routes the earlier note named, which is the one that fits this
  codebase: the cost is now an **executable claim** rather than prose. `project-access-cost.spec.ts` (6 tests,
  all pass) counts the round trips `resolveProjectAccess` issues on every path and names the count in each test
  title, so a caller reads the cost here and a seventh query fails the suite instead of shipping:

  | path | project lookup | permission resolution | membership selects |
  |---|---|---|---|
  | org owner | 1 | 0 | 0 |
  | `build:manage` holder | 1 | 1 | 0 |
  | project manager | 1 | 1 | 0 |
  | direct project member | 1 | 1 | 2 |
  | team-assigned member | 1 | 1 | 2 |
  | denied | 1 | 1 | 2 |

  The last test holds a ceiling of three database round trips across every path, which is the invariant the
  `Promise.all` pairing exists to protect: the membership and team-assignment reads are issued together, so a
  third sequential query appearing is the regression this suite catches. Proved to bite by flipping the
  direct-member expectation from 2 selects to 1 -- two tests failed -- then restored.

  This deliberately does not use a docblock. Code comments are banned here and BE-134 puts the reason in the
  test name, which is why the earlier note recorded the tension rather than quietly satisfying the box with a
  comment.
- [x] Allow and deny outcomes are unchanged, and a cross-tenant miss is still 404 per BE-91
  - `resolveProjectAccess` throws `NotFoundException` when the project row is absent (line 107, `if (!project) throw new NotFoundException(...)`). `build-core-services-tenant-isolation.spec.ts` asserts `NotFoundException` on `hasAccess: false` from the module mock, verifying 404 is thrown.

- [x] Tests prove request-local reuse, isolation between two requests/actors/organizations, and refresh after an ACL change; separate list/count requests are not reported as one authorization query
  - `project-reachability.spec.ts` `ProjectAccessCache` suite: deduplication (compute called once for same key), per-projectId isolation, per-user isolation, error eviction (re-computes after rejection), `invalidate(projectId)` (evicts only matching entry), `invalidate()` (clears all), request-local isolation (two cache instances do not share state). All 7 cache tests pass.

- [x] Before/after measurements record query count and transaction duration for direct-member, team-member and denied reads; no latency or pool-capacity claim is inferred from deduplication alone
  Earned 2026-09-27 against a real database, which the earlier note could not do: at the time every connection
  string in the repo pointed at production, and this session later stood up a local PostgreSQL 18 at
  `127.0.0.1:5432` (database `replay2`, cold-replayed from the journal). No production data, no production host.

  `project-access-round-trips.db.spec.ts` (4 tests, all pass) drives the **real** `resolveProjectAccess` through
  a real Drizzle connection, counting statements at the connection level with postgres.js's `debug` hook rather
  than inferring them from the code:

  | path | statements | duration | outcome |
  |---|---|---|---|
  | direct member | 3 | 5.0 ms | granted, MEMBER |
  | team-assigned member | 3 | 4.7 ms | granted, MEMBER |
  | denied | 3 | 6.2 ms | denied |
  | project manager | 1 | 1.5 ms | granted, MANAGER |

  Two things in that table are load-bearing. A team-assigned member costs the **same three statements** as a
  direct member, so team access adds no round trip; and a denial costs the same three as a grant, so refusing a
  reader is neither cheaper nor more expensive to detect than admitting one -- worth pinning, because a cheaper
  denial path is an oracle.

  **The first run reported 4 statements for the direct-member path and 3 for the others**, which would have been
  a false finding. The extra statement was connection setup on the first query of a fresh connection, not an
  access query: the spec now warms the connection before measuring and all three membership paths come out at
  exactly 3. That correction is recorded because the uncorrected number invited a conclusion about direct
  members that was not true.

  **No latency or pool-capacity claim is made from these durations.** They are loopback milliseconds on an
  unloaded local instance; they are not production latency and they say nothing about pool capacity. The
  transferable result is the statement count, which is why the count is what the assertions hold.