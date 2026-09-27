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

- [ ] The access module's interface states its cost, which is currently invisible to callers
  - Not earned, and the obvious way to earn it is forbidden. The natural reading is a docblock on the exported function saying it costs one round trip — but code comments are banned in this repo, with the reason required to live in a test name instead (BE-134). Recording the tension rather than quietly satisfying the box with a comment or quietly dropping it.
  Two ways it could be earned without a comment, neither done: name the cost into the interface so a caller reads it at the call site, or express it as an executable claim — a test named for the round-trip count that fails if a second query is added. The second is the better fit for this codebase, since the membership and team-assignment queries are now issued through one `Promise.all` and a regression would be a third query appearing.
  - Code comments are banned (BE-134); the function signature (`db`, `access`, `u`, `projectId`) and return type (`{ hasAccess: boolean; role: string | null }`) describe the shape. The DB query cost remains implicit to callers. Leaving unchecked.

- [x] Allow and deny outcomes are unchanged, and a cross-tenant miss is still 404 per BE-91
  - `resolveProjectAccess` throws `NotFoundException` when the project row is absent (line 107, `if (!project) throw new NotFoundException(...)`). `build-core-services-tenant-isolation.spec.ts` asserts `NotFoundException` on `hasAccess: false` from the module mock, verifying 404 is thrown.

- [x] Tests prove request-local reuse, isolation between two requests/actors/organizations, and refresh after an ACL change; separate list/count requests are not reported as one authorization query
  - `project-reachability.spec.ts` `ProjectAccessCache` suite: deduplication (compute called once for same key), per-projectId isolation, per-user isolation, error eviction (re-computes after rejection), `invalidate(projectId)` (evicts only matching entry), `invalidate()` (clears all), request-local isolation (two cache instances do not share state). All 7 cache tests pass.

- [ ] Before/after measurements record query count and transaction duration for direct-member, team-member and denied reads; no latency or pool-capacity claim is inferred from deduplication alone
  - Cannot run: all database connections point at production. Leaving unchecked per session start rule.
