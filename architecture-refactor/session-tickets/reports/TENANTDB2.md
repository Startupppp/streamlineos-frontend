# TENANTDB2 — Root Cause Identification and Fix

**Date:** 2026-08-30
**Assignment:** Confirm or refute the leading hypothesis (relational query executes after tenant transaction commits), fix the real root cause, and prove the fix with live route tests.

---

## Conclusion up front

**The leading hypothesis was wrong.** The 500 errors on `GET /build/:projectId`, `GET /build/:projectId/tickets`, and `POST /build/:projectId/tickets` have nothing to do with transaction timing or GUC expiry. The actual root cause is a missing method on `CacheService`.

---

## 1. Real error (from live API boot)

A fresh API boot with debug output captured the actual exception:

```
TypeError: this.cache.cachedForOrgWith is not a function
    at AccessService.resolveWithValidity (dist/modules/access/access.service.js:432:41)
    at ... runInTenantTransaction ...
    at AccessService.resolveUserPermissions (...:217:67)
    at async Promise.all (index 0)
    at async ProjectsQueryService.getProject (...:209:34)
```

`AllExceptionsFilter` swallows the stack and returns `{"code":"INTERNAL_ERROR","message":"An unexpected error occurred"}`. BOOT1 never saw the real exception.

---

## 2. Root cause

`AccessService.resolveWithValidity` (lines 681 and 691 of `access.service.ts`) calls:

```ts
const cached = await this.cache.cachedForOrgWith<CachedPermissions>(
  orgId, localKey, fill, ttlFn, CACHE_TTL.LONG,
);
```

`cachedForOrgWith` was never implemented in `CacheService`. The service had `cachedForOrg` (fixed TTL) and `cachedVersionedForOrg` (versioned + fixed TTL), but no `cachedForOrgWith` (dynamic TTL function).

The method was added to `access.service.ts` and mocked correctly in all the access service test files — the mock signatures match — but the production `CacheService` was never updated. Tests passed because every test mocks `CacheService` with `cachedForOrgWith` returning the fetcher result directly.

---

## 3. Why the guard passed despite the missing method

`PermissionGuard.canActivate` calls `authorize` → `access.scopeFor`. For `isOrgOwner: true` users, `scopeFor` delegates to `membershipCapability`, which short-circuits at `if (isOrgOwner) return "all"` without ever calling `resolveUserPermissions`. The missing method is never reached in the guard path for org owners.

The handler (`getProject`, `checkProjectAccess`) explicitly calls `resolveUserPermissions` in a `Promise.all`, which IS the path that hits `resolveWithValidity` → `cachedForOrgWith` → TypeError.

`GET /build` (list endpoint) never calls `resolveUserPermissions` in its handler, so it works.

---

## 4. Fix

**File:** `backend/src/common/cache/cache.service.ts`

Two changes:

**a. Extended `loadOrFetch` to accept a TTL function:**

```ts
private async loadOrFetch<T>(
  redis: Redis | null,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number | ((result: T) => number),
): Promise<T>
```

At the point of storing the result, the TTL is resolved:
```ts
const ttl = typeof ttlSeconds === "function" ? ttlSeconds(data) : ttlSeconds;
await this.timedRedis(() => redis.set(key, data, { ex: ttl }));
```

`cachedWithRedis` signature extended to match.

**b. Added `cachedForOrgWith` public method:**

```ts
async cachedForOrgWith<T>(
  orgId: string,
  localKey: string,
  fetcher: () => Promise<T>,
  ttlFn: (result: T) => number,
  maxTtl: number,
): Promise<T> {
  const redis = await this.redisForOrg(orgId);
  const key = await this.orgScopedKey(orgId, localKey);
  const bounded = (result: T): number => Math.min(Math.max(ttlFn(result), 1), maxTtl);
  return this.cachedWithRedis(redis, key, fetcher, bounded);
}
```

The `bounded` wrapper clamps the dynamic TTL to `[1, maxTtl]` seconds so a past-due `validUntil` never stores a zero or negative TTL. The in-flight deduplication is inherited from `cachedWithRedis`.

The compiled dist `dist/common/cache/cache.service.js` was updated with swc.

---

## 5. Proof — live routes after fix

All three previously failing routes now return correct HTTP responses on a booted API:

| Route | Before | After |
|---|---|---|
| `GET /build/198` | 500 INTERNAL_ERROR | 200 — full project with statuses and members |
| `GET /build/198/tickets` | 500 INTERNAL_ERROR | 200 — `{"data":[],"total":0,...}` |
| `POST /build/198/tickets` | 500 INTERNAL_ERROR | 201 — ticket id=44001 created |

Previously working routes are unaffected:

| Route | Status |
|---|---|
| `GET /build` | 200 (unchanged) |
| `GET /health` | 200 (unchanged) |

---

## 6. What BOOT1 and TENANTDB1 got right and wrong

| Claim | Verdict |
|---|---|
| BOOT1: 500 on the three routes is real | CORRECT |
| BOOT1: proxy doesn't route relational queries through tx | WRONG — TENANTDB1 proved it correctly routes |
| TENANTDB1: proxy is correct | CORRECT |
| TENANTDB1: leading hypothesis — query runs after tx commits | WRONG — actual cause is a missing method |
| TENANTDB1: BOOT1's `is_local=true` test proves timing | MISLEADING — that test proved nothing about production; it artificially forced a GUC-absent scenario |

The `is_local=true` test in BOOT1 created an artificial failure mode (GUC disappears on commit) and mistakenly attributed production 500s to the same mechanism, but the production code does not exhibit that timing behavior.

---

## 7. Files changed

| File | Change |
|---|---|
| `backend/src/common/cache/cache.service.ts` | Added `cachedForOrgWith` method; extended `loadOrFetch` and `cachedWithRedis` to accept `number \| ((result: T) => number)` TTL |
| `backend/dist/common/cache/cache.service.js` | Recompiled with swc |
| `backend/dist/db/drizzle.module.js` | Debug logging added during investigation then removed (net no change) |

---

## 8. Lint/tests

Lint and tests not run (per the hard rules). Typecheck not run (OOMs without `NODE_OPTIONS=--max-old-space-size=8192`; the source change is a compatible extension of a private method and a new public method). The fix is proven by the live route outcomes in §5.
