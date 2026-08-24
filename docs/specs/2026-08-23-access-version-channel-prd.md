# PRD — Make cache coherence the access path's job, not the database's

Status: ready-for-agent
Date: 2026-08-23
Scope: candidate C1 from the re-verified 2026-08-20 architecture review (`architecture-review-20260820-2.html`)
Supersedes: the "establish tenant context once per request and have the guard chain reuse it" section of the module-access ladder PRD (2026-08-20), which cannot be built as written — see Further Notes
Sequenced before: the module registry PRD and any work that adds modules, permissions or guards

## Problem Statement

Every authenticated request in the product passes through a guard chain that answers three questions: is this session live, is this module enabled, and may this person do this. The answers are cached in each running instance, which is correct — they change rarely and are read constantly.

The problem is how those caches learn they are wrong.

They learn by polling. `AccessService` holds the organization's permissions version for **five seconds**, and reading it on a miss opens a full tenant transaction against Postgres — begin, set the tenant setting, select one integer, commit — on a pooled connection. That read is the first line of the permission resolution that runs on every permission-checked request. The membership state cache, the denied-modules cache and the module entitlement cache each poll on their own timers in the same way.

Five seconds looks like a tuning constant. It is not. The in-process invalidation channel is a plain set of listeners held in module scope and notified synchronously inside the writing process. **Nothing crosses the process boundary.** When an organization owner revokes a grant on instance A, instance B never hears about it, and the only reason B ever stops honouring the revoked grant is that its five-second timer expires and it goes back to the database.

### This is a correctness problem, not a cost problem

The 2026-08-20 architecture review framed this as "three to four transactions per request". **That framing is superseded and must not be carried into the work.** The phase-one ticket set already fixed the warm path: the caches are read before any transaction is opened, and a request-cost gate exists that measures as a non-owner, subtracts background borrows, and pins ceilings of roughly one tenant transaction per request — which is the handler's own. The warm authorization path already costs zero extra transactions.

The five-second poll survives that gate for a reason worth stating plainly: a hundred-request measurement run finishes well inside a five-second window, so the version cache stays warm for its whole duration and the poll never appears. Its true cost is one transaction per organization per instance per five seconds, which at any real traffic level amortises to nearly nothing.

So the cost argument is largely already won, and this PRD should not be sold on it. **The argument that remains is correctness**, and it is the stronger one:

- The in-process listener set is the only push mechanism, and it does not cross a process boundary.
- The five-second poll is therefore the *entire* cross-instance revocation mechanism.
- Nobody can lengthen it, because lengthening it lengthens the window in which a revoked grant is still honoured.
- Nobody can shorten it either, because shortening it multiplies the one cost it does have.

A permission revoked on one instance is honoured by every other instance for up to five seconds, and the only thing stopping that window from being longer is a timer nobody can safely touch. Per-person grants land in the same caches, so the same window applies to them.

For an organization owner this shows up as: "I removed their access and they could still do it." For a security reviewer it shows up as a revocation window that is set by a caching constant rather than by a policy decision.

## Solution

Move cache coherence off the database and onto the cache.

The organization's access version becomes a shared counter in Redis rather than a row in Postgres that each instance polls. A grant change increments the counter. Every instance reads the counter, and because the counter is shared, reading it *is* the cross-instance channel — a bump on one instance is visible to all the others the next time they look.

That single change flips both problems at once:

- **The read gets cheap.** One Redis round trip replaces a pooled Postgres transaction. Postgres leaves the hot authorization path entirely.
- **Because it is cheap, it can be frequent.** The staleness window stops being set by what the database can afford and starts being set by how fresh revocation needs to be. It can shrink rather than grow.

This is not a new mechanism. `CacheService` already implements exactly this pattern — `cachedVersioned` reads a namespace generation counter and `invalidateNamespace` bumps it with a single increment, and `MembershipStateService` already uses it for membership status. The access version is the one coherence counter in the system that did not get the treatment. The work is to bring it in line, not to invent anything.

From the outside, nothing changes except that revoking someone's access takes effect noticeably sooner, and every authenticated request gets slightly faster.

## Goals

- A permission, role or per-person grant changed on one instance is honoured by every other instance within a bounded, stated window that is shorter than today's five seconds.
- The revocation window is a policy decision with a written value, not a side effect of a cache constant.
- The cold authorization path performs at most one Redis round trip rather than a Postgres transaction, so shortening the window costs less than it does today.
- The warm authorization path continues to perform zero extra Postgres transactions. This is already true and must not regress.
- The existing request-cost gate runs automatically rather than by hand, so the ceiling it pins cannot silently regress.
- No behaviour change to who is allowed to do what.

## Non-Goals

- Changing any permission key, role, scope or grant semantics.
- Changing the tenant transaction model for request handlers.
- Introducing a new Redis client, a second Redis connection, or a message broker.
- Making the system tolerate a total Redis outage with better freshness than it has today.

## User Stories

1. As an organization owner, I want a permission I revoke to stop working everywhere within seconds, so that removing someone's access is a real action rather than an eventual one.
2. As an organization owner, I want a role I delete to stop granting anything immediately, so that I am not relying on a timer for a security decision.
3. As an organization owner, I want a member I suspend to lose module access on every server handling my traffic, not just the one that processed my click, so that suspension means suspension.
4. As a module owner, I want the grants I author to take effect for my module admins promptly, so that I can fix a wrong grant without telling someone to wait.
5. As a module owner, I want removing someone from my module to be effective immediately, so that offboarding is not a two-step process.
6. As a member, I want a permission I have just been given to work on my next click, so that I do not have to sign out and back in.
7. As a member, I want the product to feel fast on every page, so that authorization is invisible to me.
8. As an operator, I want authenticated requests not to open a database transaction just to check a version number, so that database compute tracks real work.
9. As an operator, I want the authorization path's cost to stay flat as I add application instances, so that scaling out does not multiply database load.
10. As an operator, I want connection-pool pressure on the database to drop, so that a traffic spike does not exhaust the pool on authorization overhead.
11. As an operator, I want to know the exact staleness window for a permission change, so that I can answer a security question with a number rather than a guess.
12. As an operator, I want the system to keep serving requests when Redis is unavailable, so that a cache outage is a degradation and not an outage.
13. As an operator, I want a Redis outage to fail towards the database rather than towards granting access, so that unavailability never becomes elevation.
14. As a developer, I want one place that owns "how does an access change reach every instance", so that I do not have to find and reason about four independent timers.
15. As a developer, I want adding a new access-derived cache to be a matter of joining the existing coherence scheme, so that I do not invent a fifth timer.
16. As a developer, I want a test that fails if a request starts opening more transactions than agreed, so that a future change cannot quietly reintroduce the cost.
17. As a developer, I want the invalidation channel to be testable without booting two servers, so that the property is cheap enough to assert on every run.
18. As a coding agent, I want the coherence rule stated in one module with one interface, so that I can change access logic without having to discover the caching contract from five call sites.
19. As a security reviewer, I want the revocation window documented and asserted, so that I can review it rather than infer it.
20. As a security reviewer, I want over-invalidation to be the failure mode rather than under-invalidation, so that the worst case is a wasted read and never a honoured revoked grant.
21. As a support engineer, I want "they still have access" to have a bounded, explainable answer, so that I can distinguish a caching window from a real grant.
22. As a platform admin, I want an organization's access changes to be isolated to that organization's coherence key, so that one busy tenant does not invalidate everyone else's caches.

## Implementation Decisions

### The counter moves to Redis

- The organization's access version is read from a Redis key namespaced per organization. `CacheService` already owns this shape via its namespace generation counters; the access version joins that scheme rather than adding a parallel one.
- `bumpPermissionsVersion` keeps writing the Postgres row — it stays the durable record and the source of truth for a cold start — and additionally increments the Redis counter.
- On a Redis miss (cold key, evicted key, outage), the reader falls back to the existing Postgres read and repopulates. Postgres remains authoritative; Redis is the fast path and the channel.

### There is no pub/sub, and none is needed

- The only Redis client in the repository is the Upstash HTTP client, which cannot hold a subscription. **A design that depends on `SUBSCRIBE` is not buildable here and must not be specified.** This is the correction that made this PRD necessary; the architecture review's first draft said "Redis pub/sub" without checking the client.
- A shared counter is a pull channel, and a pull channel is sufficient because the pull is now cheap. Coherence comes from the counter being *shared*, not from it being *pushed*.
- If a future deployment adds a protocol-level Redis connection, push can be layered behind the same interface without changing a caller.

### Invalidation fires before commit, deliberately

- The version bump already runs inside the writing transaction and notifies listeners synchronously. That ordering means a rolled-back grant change still invalidates caches.
- That is the correct trade. Over-invalidation costs one wasted re-read; under-invalidation honours a revoked grant. Keep the bump where it is and state the reason, rather than moving it to an after-commit hook to save a read.
- The after-commit hook that already exists on the tenant context is **not** the right home for this, for exactly that reason.

### The listener set stays, one level down

- The in-process listener set is not deleted. It becomes the local fan-out behind the new interface: a bump on this instance still clears this instance's maps synchronously, which is strictly faster than waiting for a read.
- The new module's interface is the seam: publish a bump for an organization, and subscribe to bumps. Everything else — Redis key shape, fallback, TTL backstop — sits behind it.

### The TTL becomes a backstop

- The in-process version TTL stops being the coherence mechanism and becomes a safety net for the case where both the Redis counter and the listener fan-out fail.
- Its value is now a freshness decision rather than a cost decision, and it should be **shortened**, not lengthened. The exact value is set during implementation against the measured cost of a Redis read.
- The other access caches — permissions, denied modules, membership access state — are already keyed by the version where they can be. Any that are not should be brought into the same keying so that one bump invalidates the whole family. The membership access state cache is the known exception and should be fixed as part of this work.

### What is explicitly not done here

- Guards continue to run before interceptors and continue not to share the request's tenant transaction. The stage-two "request-scoped unit of work" is deferred; see Further Notes for why it is both harder and less valuable than it appeared.

## Testing Decisions

A good test here asserts externally observable behaviour: what a caller is allowed to do after a change, and how much the system spent finding out. It does not assert that a particular map was cleared or that a particular key was written.

**Seam 1 — the coherence module's own interface.** The new publish/subscribe module is unit-tested directly against a Redis double. This is where cross-instance behaviour is proven, without booting two servers:

- Two subscribers built over one shared Redis double: a bump published through one is observed by the other.
- A bump published while the Redis double is throwing still clears the local listeners, and the reader falls back to the durable row.
- A cold counter falls back to Postgres and repopulates rather than reporting version zero.
- A bump for one organization does not disturb another organization's counter.

**Seam 2 — the existing request-cost gate, plus an in-process counterpart.** A gate already exists and is thorough: it measures as a non-owner (an owner short-circuits before permission resolution, so measuring as one tests the wrong path), reads borrows from pool telemetry via the health endpoint, subtracts background borrow rate, and issues requests concurrently. Its ceilings are already met. Two gaps, and only these two are in scope:

- **It is manual.** It needs a running API and a seeded database and nothing runs it automatically, so the ceiling it pins can regress unnoticed. This is already recorded as a carried-forward gap from the phase-one ticket set. Wiring it into CI is the honest fix.
- **It cannot see the cold path.** A hundred-request run completes inside the five-second version window, so the poll under change here never appears in its numbers. The cold path needs an in-process assertion instead: reset pool telemetry, drive a cold authorization resolution, assert the borrow count; then drive a warm one and assert zero. `poolTelemetry` already exposes reset and snapshot and the health controller specs already use them, so there is no new harness.

**This is a correction to the seam originally proposed for this work.** The controller e2e harness cannot carry a cost assertion at all, because it replaces `AccessService`, `EntitlementsService` and `MembershipStateService` with stubs — precisely the three services that would open the transactions being counted.

**Seam 3 — the existing controller e2e harness, for outcomes.** The guard-tier e2e specs stay as they are and keep proving that 401, 402 and 403 land where they should. Their job in this work is regression: authorization outcomes must not move. They prove nothing about cost and should not be asked to.

Prior art to follow: the existing access service specs for the resolution-level assertions, the module-access controller e2e specs for the guard tier, and the tenant transaction specs for the transaction-shape assertions. Note that `e2e-spec` files are excluded from the default Jest run and execute only under the e2e script — a route table added there is not executed coverage for the default suite.

Two traps this area has hit before, both of which must be avoided in new specs: a `db.transaction` mock that is a bare stub never invokes its callback, which silently voids every assertion inside it; and adding a new database read to a service breaks every existing spec mock for it, so the mock surface must be updated in the same change.

## Out of Scope

- The request-scoped unit of work — opening one connection per request and sharing it across guards and handler. Deferred to a separate spec if this work proves insufficient.
- Any change to what permissions exist, what they mean, or who holds them by default.
- Rate limiting, MFA policy, and the session revocation tombstone, which have their own coherence mechanisms and are not in this family.
- Replacing the Upstash client or adding a protocol-level Redis connection.
- The organization-level entitlement and plan-limit caches, unless they are already keyed by the access version.

## Further Notes

**Why the earlier proposal was withdrawn.** The 2026-08-20 review recommended establishing tenant context once at the earliest point in the request and having the guard chain reuse it. On re-verification that is not buildable and would not have paid:

- The tenant context interceptor is registered as a global interceptor, and interceptors run *after* guards. A guard can never reuse a context an interceptor establishes.
- The tenant identifier comes from a verified token plus a membership row, both resolved inside the authentication guard. There is no earlier point at which the organization is known, so "establish it first" has no first.
- The transaction helper is callback-scoped. Spanning the guard-to-handler boundary means hand-managing a borrowed connection with a manual begin and commit plus an exception filter to roll back — a substantially riskier change than the recommendation implied.
- Most importantly, sharing one transaction removes only the begin/commit envelope. Every query inside it still runs. The cost being complained about is the queries.

The module-access ladder PRD of 2026-08-20 opens with that proposal as its first sequenced deliverable. That section is superseded by this document.

**Why this is worth doing first, restated honestly.** The original argument was "the security fix and the cost fix are the same commit". After re-verification against the existing request-cost gate, the cost half is largely already won — the warm path costs one transaction, which is the handler's own, and a gate pins it. The remaining argument is narrower and still worth acting on: cross-instance revocation currently depends entirely on a timer that cannot be safely moved in either direction, and this change turns that timer into a policy value. A reviewer asking "how long is a revoked permission still honoured across your fleet" should get a number chosen deliberately, not a number chosen by what a Postgres read costs.

**Per-person grants raise the stakes.** The phase-one work added per-person permission grants that narrow capability without inventing a role, and folded them into the same resolution path. They land in the same caches and inherit the same window, so the surface this window applies to is larger than it was when the constant was chosen.

**One adjacent inconsistency, worth a line while in the area.** Ten AI controllers carry the no-tenant-transaction opt-out; the chat assistant controller does not, and its handler returns as soon as it hands the stream to the response, so the request transaction commits mid-stream. It is not currently a bug — the tools are individually wrapped in fresh tenant transactions and the completion hook opens its own — but the handler's safety rests entirely on every future tool remembering the wrapper. Adding the opt-out makes it the same as its ten siblings.
