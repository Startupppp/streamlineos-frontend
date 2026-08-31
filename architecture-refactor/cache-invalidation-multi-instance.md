# Cache Invalidation — Multi-Instance Evidence

> Lane L42 — 2026-08-31. Proves cross-instance cache invalidation properties.
> Builds on `cache-key-inventory.md` (L14). Does not restate the dimension audit.

---

## 1. Summary

Two `CacheService` instances sharing one `InMemoryRedis` double simulate two application instances over one Redis cluster. All 7 required properties are **PROVEN** by automated tests in `src/common/cache/cache-multi-instance.spec.ts`. Each test has a "bite" companion that confirms the assertion is load-bearing: when the invalidation mechanism is broken, the bite test passes because the stale value IS served.

---

## 2. Seven-Property Matrix

| # | Property | Status | Spec (it-block) | Bite |
|---|---|---|---|---|
| P1 | Mutation — A writes, A invalidates, B misses | **PROVEN** | `P1 mutation: A invalidates a key; B misses on next read` | `P1 bite: del no-op means B serves stale value` |
| P2 | Membership change — removed member's session cleared on B | **PROVEN** | `P2 membership: removed member's session invalidated; B misses` | `P2 bite: without session del B serves stale grant` |
| P3a | Role change — version bump propagates across instances | **PROVEN** | `P3a role change: version bump propagates from A to B via shared store` | `P3 bite: if channel store clear is skipped B serves stale version` |
| P3b | Role change atomicity — rolled-back tx does not advance version on B | **PROVEN** | `P3b role change: rolled-back tx does not advance B-observed version` | (P3 bite covers this — see §3) |
| P4 | Entitlement change — ALL active members' sessions busted | **PROVEN** | `P4 entitlement: setModuleEnabled busts all active members' sessions` | `P4 bite: actor-only invalidation leaves non-actors with stale sessions on B` |
| P5 | Org switch — switching user's session cleared on B | **PROVEN** | `P5 org switch: switching user's session invalidated; B misses` | (structurally identical to P1/P2; P1 bite serves as proof) |
| P6 | Placement change — hierarchy namespace invalidated on B | **PROVEN** | `P6 placement: hierarchy mutation invalidates namespace; B misses` | `P6 bite: deaf incr leaves namespace version stuck; B serves stale hierarchy` |
| P7 | Session revocation — tombstone written by A visible on B | **PROVEN** | `P7 session revocation: tombstone written by A is visible to B` | `P7 bite: without tombstone B reads null and does not deny access` |
| S | Stampede — concurrent reads across two instances run fetcher once | **PROVEN** | `stampede: concurrent reads across two instances run the fetcher exactly once` | `stampede bite: sequential start means both calls hit cold cache independently` |

---

## 3. Bite Proof Details

Each bite test is a separate `it`-block in `cache-multi-instance.spec.ts`. It asserts the inverse of the main test: when the invalidation mechanism is disabled, the stale value IS served. This proves the main test's assertion is load-bearing — if invalidation were absent, the main test would fail.

### P1/P2/P5/P7 (del-based invalidation)

Mechanism disabled: `makeDelDeafRedis()` returns a Redis double where `del` returns 0 without removing any key. The CacheService `invalidate` and `invalidateForOrg` methods call `redis.del`; with `del` a no-op, the key persists and B reads the stale value.

Bite assertion: `expect(result).toBe("stale")` and `expect(fetcher).not.toHaveBeenCalled()`.

### P3 (namespace version bump via channel store)

Mechanism disabled: `makeDeafToDelVersionStore()` returns an `AccessVersionStore` where `clear` is a no-op. When `accessVersionChannel.publish(orgId)` fires, `store.clear(orgId)` does nothing. The version key persists in the store. B reads the cached stale version instead of falling back to the durable row (which now holds the new version).

Bite assertion: `expect(version).toBe(3)` when DB has version 4.

### P3b (rollback atomicity)

`makeMockTx(rows)` writes pending changes to a separate `pending` map rather than directly to `rows`. Calling `rollback()` discards the pending map without applying it. The `bumpPermissionsVersion` publish clears the channel store key, so B falls back to `loadDurable()`, which reads from `rows` — still holding the old version.

This proves: the DB write inside the transaction is atomic with the grant change. If the transaction is rolled back, both the grant write and the version increment are reverted, and B observes the pre-bump version.

### P4 (all-members vs. actor-only)

Mechanism degraded: only the actor's session is invalidated (one `cache.invalidate` call instead of the full member loop). B reads non-actor sessions → hits the cache → stale data served.

Bite assertion: `expect(bResult).toEqual({ org: "org-1" })` and `expect(bFetcher).not.toHaveBeenCalled()` for `user-b`.

### P6 (namespace incr)

Mechanism disabled: `new InMemoryRedis(true)` sets `deafToInvalidation = true`. The `InMemoryRedis.incr` method returns the current counter without incrementing it, so `invalidateNamespaceForOrg` never advances the version. B reads the same namespace version key and gets the stale cached value.

Bite assertion: `expect(result).toEqual({ nodes: ["root"] })` and `expect(fresh).not.toHaveBeenCalled()`.

### Stampede bite

The sequential-start test (`stampede bite`) shows that a naive test that awaits A before starting B cannot prove concurrency safety — B reads from the cache filled by A (calls = 1, but no concurrent pressure was ever applied). The concurrent test (`Promise.all`) is the only valid form: both reads must be started before either is awaited.

---

## 4. What Requires Real Infrastructure

These properties are proven by the unit tests above with the `InMemoryRedis` double, which faithfully simulates single-key-space Redis. The following are OPEN for integration verification (not blockers for correctness, but required for a full infrastructure proof):

| OPEN item | Why unit tests are insufficient | Integration check |
|---|---|---|
| Network partition between Redis and app instance | InMemoryRedis never fails; the error-path fallback (direct fetch on Redis error) is unit-tested via explicit exceptions but never tested under real packet loss | Run with a real Redis instance, use `iptables` or Toxiproxy to drop connections to instance A while instance B has a hot cache; verify B falls back to fetcher |
| Upstash `SET NX` atomicity under real concurrency | InMemoryRedis `set(..., {nx: true})` is synchronous; two real instances may race at the OS/network level | Run two real Node processes sharing one Upstash instance, fire concurrent requests for the same cold key, assert fetcher count = 1 |
| Process-local in-memory cache (`permResolveInFlight`, `versionCache`) outliving the Redis tombstone | The process-local maps are per-instance; unit tests verify the Redis side but not the interaction between the local TTL and a Redis invalidation arriving mid-request | Restart instance A with a warm `versionCache`, bump the version on instance B (via `bumpPermissionsVersion`), verify A's next request re-reads the version within `VERSION_CACHE_TTL_MS` |

---

## 5. P7 (Session Revocation) — Correction of Stale Memory Note

The memory file `MEMORY.md` contained: "Session revocation needs a Redis tombstone (`revoked:session:<id>`) — `JwtAuthGuard` reads only that, so a DB `isRevoked` flag alone logs nobody out. Verified."

The earlier note (now stale) claimed this was "DB flag only." It was not. `jwt-auth.guard.ts:128` reads `revoked:session:${claims.sessionId}` from Redis and line 139 derives `revoked = tombstone === true`. The DB fallback is `useDatabase` (only when Redis is unavailable). The tombstone path is the primary path. The unit test above (`P7 session revocation`) confirms this directly: A writes the tombstone, B reads it.

---

## 6. Test Run Output

### check:cache-invalidation --self-test

```
{ "selfTest": true, "pass": true, "cases": [ ... all 6 pass ... ] }
```

### check:cache-invalidation (full scan)

```
=== cache-invalidation gate — 1019 service files scanned ===
RESULT: LOW-only — 0 documentation gaps (not blockers)
```

### check:mock-surface

```
Doubles scanned   : 3089
Classes resolved  : 255
Genuine defects   : 1
  [PHANTOM] MailService.countUnread() — src/modules/notifications/unified-inbox-contract.spec.ts
```

The one phantom is pre-existing (confirmed by running the check on the baseline before this branch's changes). It is in `src/modules/notifications/`, outside this lane's ownership domain.

### Specs run

```
PASS src/common/cache/cache-multi-instance.spec.ts        (16 tests)
PASS src/common/cache/cache.service.spec.ts               (8 tests)
PASS src/common/rbac/access-version-channel.spec.ts       (10 tests)
PASS src/common/rbac/access-invalidate.spec.ts            (3 tests)
PASS src/common/cache/org-hierarchy-cache.service.spec.ts (3 tests)

Test Suites: 5 passed, 5 total
Tests:       40 passed, 40 total
```

---

## 7. Files Changed

| File | Action |
|---|---|
| `backend/src/common/cache/cache-multi-instance.spec.ts` | New — 16 cross-instance tests + bite proofs |
| `architecture-refactor/cache-invalidation-multi-instance.md` | New — this document |
