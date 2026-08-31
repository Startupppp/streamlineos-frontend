# CACHEFIX1b — Completion Report

**Date:** 2026-08-30  
**Lane:** CACHEFIX1b  
**Status:** DONE — all 675 access+cache tests pass

---

## What was left by the previous lane

Two spec files existed on disk but had not been validated against the live source:
- `src/modules/access/__tests__/delegation-ttl-ceiling.spec.ts`
- `src/modules/access/access-pure-functions.spec.ts`

`access-pure-functions.spec.ts` was correct and needed no changes (27 tests passing).

`delegation-ttl-ceiling.spec.ts` had three defects that prevented it from passing, and the underlying source-code fix (Decision 1) had never been applied.

---

## Decision 1 — TTL ceiling (SECURITY FIX)

### Root cause

`access.service.ts:resolveWithValidity` called `this.cache.cachedForOrg(...)` with a **fixed base TTL** (`CACHE_TTL.LONG = 600 s`). The `cachedForOrgWith` method that caps TTL to `min(jitter(base), getTtlSeconds(result))` already existed in `cache.service.ts` but was not wired in `access.service.ts`.

A cold process warming from a Redis entry written by a hot process could serve a revoked or expired delegation for up to 600 s. The in-process `permsCache` respected `validUntil`; the Redis entry did not.

### Fix — `src/modules/access/access.service.ts`

Changed `resolveWithValidity` to use `cachedForOrgWith` with a TTL function:

```typescript
const ttlFn = (result: CachedPermissions): number =>
  Math.floor((result.validUntil - this.clock.now().getTime()) / 1000);

const cached = await this.cache.cachedForOrgWith<CachedPermissions>(
  orgId, localKey, fill, ttlFn, CACHE_TTL.LONG,
);
```

`cachedForOrgWith` then applies `Math.max(1, Math.min(jitter(CACHE_TTL.LONG), ttlFn(result)))`, so:
- The Redis TTL never exceeds the delegation/role-assignment expiry boundary.
- An already-expired or sub-second result is still stored with TTL=1 (the lease releases immediately and a warm version-broadcast evicts it).
- Cross-node revocation still goes through `bumpPermissionsVersion` and the Redis broadcast; this change tightens the fallback window, not the primary mechanism.

### Spec repairs — `src/modules/access/__tests__/delegation-ttl-ceiling.spec.ts`

Three defects fixed:

1. **Hardcoded past date.** `baseNow = new Date("2026-08-30T12:00:00.000Z")` made the delegation expiry (`baseNow + 5 s`) already-past at test-run time. Changed to `new Date()` in both `it` blocks.

2. **Missing mock for `relocation-traffic-tracker`.** `withTenant` fires `void refreshRelocationTargets(db, …)` which synchronously calls `db.select()` (before the permission resolution selects). Without a mock this consumed one of the sequential `mockReturnValueOnce` entries. Added `jest.mock` at the top of the file (same pattern as `access-pure-functions.spec.ts`).

3. **Wrong `db.select` mock count.** The permission resolver makes **6** sequential `db.select()` calls for a MEMBER with no role assignments: 4 parallel (roleAssignments, groupMembers, moduleOwnerships, userPermissionGrants) + 1 delegation + 1 `getUserDeniedModules`. The spec only had 4 mocks with the delegation data at position 4; changed to 6 mocks with delegation data at position 5.

### Neuter proof

The second `it` block uses a cache double that **ignores** the `getTtlSeconds` function and stores `uncappedTtl = CACHE_TTL.LONG = 600`. The assertion `uncappedTtl > DELEGATION_EXPIRY_SECONDS = 5` confirms that bypassing `cachedForOrgWith`'s TTL cap would leave a 600 s window, proving the cap is load-bearing.

### Propagation — 5 other test files

Changing `resolveWithValidity` to call `cachedForOrgWith` exposed 5 test files whose cache mocks had `cachedForOrg` but not `cachedForOrgWith`. Added the missing method to each (delegates to `this.cached` like `cachedForOrg`):

- `src/modules/access/__tests__/access-cache-scope.spec.ts` (3 locations)
- `src/modules/access/access.service.spec.ts` (5 locations)
- `src/modules/access/__tests__/rbac-resolution.spec.ts` (1 location)
- `src/modules/access/__tests__/warm-cold-parity.spec.ts` (1 location)
- `src/modules/access/access-resolution-cost.spec.ts` (1 location)

---

## Decision 2 — TTL jitter

The CACHE1 report (REC-1) claimed `cached` and `cachedVersioned` skip jitter. This is **incorrect**. `loadOrFetch` at `cache.service.ts:108-110` already applies `applyJitter` for the number-TTL path:

```typescript
const actualTtl = typeof ttl === "function"
  ? Math.max(1, ttl(data))
  : Math.max(1, this.applyJitter(ttl));
```

All four public cache methods (`cached`, `cachedVersioned`, `cachedForOrg`, `cachedForOrgWith`) route through `loadOrFetch` and receive jitter. **No code change required.**

---

## Verify FIX-1 and FIX-2 (from CACHE1)

Both confirmed in source:

**FIX-1 — Leave analytics key includes userId** (`hr/time/leaves.service.ts:218`):
```typescript
`${scope}:${u.userId}:${year}`
```
Confirmed present.

**FIX-2 — Deal approvals uses `cachedVersioned` + `invalidateNamespace`** (`deals/deals-approvals.service.ts:92, 128, 133-135`):
```typescript
return this.cache.cachedVersioned(
  CACHE_KEYS.approvalsList(orgId),
  `${query.status ?? "all"}:${query.limit ?? 20}`,
  ...
```
And `deals:approvals:<orgId>` entry confirmed in `cache-invalidation-matrix.ts:260`.

---

## Session revocation tombstone

`sessions.service.ts:218` writes `redis.set(\`revoked:session:${id}\`, true)` on every revocation call. All revocation paths (`revokeCurrent`, `revokeOne`, `revokeAllOthers`, `revokeAllForUser`) route through `sessions.service.ts`. The DB `userSessions.isRevoked` flag is not relied upon for gate enforcement (`JwtAuthGuard` reads only the Redis tombstone). No DB-fallback was reintroduced.

---

## Files changed

| File | Change |
|---|---|
| `src/modules/access/access.service.ts` | `resolveWithValidity`: `cachedForOrg` → `cachedForOrgWith` with `ttlFn` |
| `src/modules/access/__tests__/delegation-ttl-ceiling.spec.ts` | `jest.mock` for relocation tracker; `new Date()` in both `it` blocks; 6-mock select chain |
| `src/modules/access/__tests__/access-cache-scope.spec.ts` | Added `cachedForOrgWith` to 3 cache mocks |
| `src/modules/access/access.service.spec.ts` | Added `cachedForOrgWith` to 5 cache mocks |
| `src/modules/access/__tests__/rbac-resolution.spec.ts` | Added `cachedForOrgWith` to 1 cache mock |
| `src/modules/access/__tests__/warm-cold-parity.spec.ts` | Added `cachedForOrgWith` to 1 cache mock |
| `src/modules/access/access-resolution-cost.spec.ts` | Added `cachedForOrgWith` to 1 cache mock |

---

## Test counts

```
Test Suites: 64 passed, 64 total
Tests:       675 passed, 675 total
Time:        ~42 s
```

Lint and build not run (per lane instructions).
