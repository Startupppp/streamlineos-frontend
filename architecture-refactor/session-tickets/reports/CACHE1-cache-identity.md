# CACHE1 — Cache Key Identity Audit

**Scope:** `backend/src` — all `cachedVersioned`, `cached`, `cachedForOrg`, `cachedVersionedForOrg` call sites.  
**Date:** 2026-08-30

---

## Summary

216 cache call sites across modules were swept. Two confirmed under-identification bugs were fixed in-place. No cross-tenant leaks were found. The caching layer infrastructure (single-flight, fill lease, jitter on `*ForOrg` wrappers) is sound. Two design-level recommendations are raised.

---

## CHANGED

### FIX-1 — Leave analytics: `own`/`team` scopes share a key across different users (data disclosure)

**File:** `backend/src/modules/hr/time/leaves.service.ts:218`

**Before:**
```
`${scope}:${year}`
```

**After:**
```
`${scope}:${u.userId}:${year}`
```

**Root cause:** `queryAnalytics` passes `actorUserId` to `leaveApprovalScope`, which generates:
- `own` → `eq(leaveRequests.approverId, actorUserId)` — user-specific
- `team` → `eq(leaveRequests.approverId, actorUserId)` + dept-scope — user-specific

Two users with the same scope and year produced the same sub-key, so User B got User A's scoped leave analytics. For `own` scope this means personal leave-approval data crosses user boundaries. Namespace is `hr:leave-analytics:${orgId}` (versioned); invalidation via `invalidateNamespace` on any create/approve/reject is correct and unchanged.

**Blast radius (pre-fix):** Any two users in the same org with scope=`own` or scope=`team`. Whoever warms the key first wins; all subsequent same-scope callers in the same namespace generation see that user's results. Since scope=`own` means "leave requests where I am the approver", a lower-privilege user (scope=own) could receive a manager's approver set if the manager called first.

---

### FIX-2 — Deal approvals list: status and limit filters absent from key

**Files:**
- `backend/src/modules/deals/deals-approvals.service.ts:133` — read changed to `cachedVersioned`
- `backend/src/modules/deals/deals-approvals.service.ts:92,128` — both `invalidate` changed to `invalidateNamespace`
- `backend/src/common/cache/cache-invalidation-matrix.ts` — new `deals:approvals:<orgId>` entry added

**Before (read):**
```typescript
return this.cache.cached(
  CACHE_KEYS.approvalsList(orgId),   // "deals:approvals:{orgId}" — no filter discriminator
  () => { /* filters by query.status and query.limit */ },
  CACHE_TTL.MEDIUM,
);
```

**After (read):**
```typescript
return this.cache.cachedVersioned(
  CACHE_KEYS.approvalsList(orgId),
  `${query.status ?? "all"}:${query.limit ?? 20}`,
  () => { /* same fetcher */ },
  CACHE_TTL.MEDIUM,
);
```

**Before (writes):**
```typescript
await this.cache.invalidate(CACHE_KEYS.approvalsList(orgId));
```

**After (writes):**
```typescript
await this.cache.invalidateNamespace(CACHE_KEYS.approvalsList(orgId));
```

**Root cause:** `listApprovals` accepts `query.status` (optional filter) and `query.limit` (page cap), both of which alter the SQL `WHERE` and `LIMIT` clauses. A call with `status=pending` cached pending-only rows under the bare org key; a subsequent call without a status filter returned that narrow set as if it were the full approval list (and vice versa). Both callers hold the same org permission so this is not a privilege-escalation, but it is wrong data at scale — an approver acting on the cached "all" list might miss newly-created approvals that were filtered out of another caller's warm key.

Switching from `cached`+`invalidate` to `cachedVersioned`+`invalidateNamespace` means all filter-specific sub-entries under the namespace are atomically superseded by any write, restoring O(1) invalidation without pattern-scan.

---

## RECOMMENDED

### REC-1 — `cached` and `cachedVersioned` do not apply TTL jitter

`cachedForOrg` and `cachedVersionedForOrg` apply `applyJitter(baseTtl)` = `baseTtl × (0.85..1.15)`. The plain `cached` and `cachedVersioned` paths do not; they pass `ttlSeconds` directly to `redis.set`.

Hot shared keys that use the plain paths (e.g., `acc:settings:<orgId>`, `dashboard:announcements:<orgId>`) all expire at the same absolute second across a cohort of orgs that were seeded in the same deploy window. The fill-lease mechanism handles the stampede correctly, but all the lease-waiting callers pile up waiting on the one lease-holder.

**Decision needed:** Whether to apply `applyJitter` inside `loadOrFetch` for all paths (safe additive change, slightly increases average staleness by ±15%) or to leave jitter as an opt-in property of `*ForOrg` variants.

### REC-2 — Access-permission cache TTL ceiling vs. delegation/role expiry

`snapshotValidUntil` (`modules/access/snapshot-validity.ts`) correctly caps the permission snapshot TTL at the earliest upcoming delegation or role-assignment expiry. However the Redis entry is written at `PERMS_CACHE_TTL_MS = 30_000 ms` (30 s) fixed TTL inside `cachedForOrg`, not at the computed `validUntil`. The in-process `permsCache` respects `validUntil`; the Redis cache does not.

If a delegation expires in 5 seconds but the Redis TTL is 30 s, a cold process that warms from Redis will serve the revoked delegation for up to 25 s before its own version-bump check kicks in. This window shrinks to `VERSION_CACHE_TTL_MS = 1_000 ms` when the version-bump is broadcast correctly, but the fallback is the full 30 s.

**Decision needed:** Whether to propagate `validUntil` as the Redis TTL inside `access.service.ts:688` (requires computing `validUntil` before the `cachedForOrg` call and converting it to a second-delta) or to accept the 30 s worst-case with the existing version-broadcast as the primary coherence mechanism.

---

## Task 2 — Invalidation Completeness

All `cachedVersioned` namespaces were cross-checked against `CACHE_INVALIDATION_MATRIX` and the writer services. No writer was found that mutates underlying rows and skips namespace invalidation. Selected findings:

| Namespace | Writers that invalidate | Status |
|---|---|---|
| `leads:${orgId}` | `lead-status.service.ts` → `invalidateNamespace`, `leads-write.service.ts` → same | OK |
| `deals:list:${orgId}` | `deals-crud.service.ts`, `deals.service.ts` → `invalidateNamespace` | OK |
| `support:tickets:${orgId}` | `support-tickets.service.ts`, `support-ticket-operations.service.ts` → `invalidateNamespace` | OK |
| `deals:approvals:${orgId}` | was exact-key `invalidate` (bug) → changed to `invalidateNamespace` | FIXED (FIX-2) |
| `hr:leave-analytics:${orgId}` | `leaves-write.service.ts` → `invalidateNamespace`, `leave-decision-effects.service.ts` → same | OK |
| `fin:reports:${orgId}` | posting + invoices services → `invalidateNamespace` | OK |

**`invalidatePattern` / wildcard SCAN usage:** No new request-path `invalidatePattern` or SCAN calls were introduced or found outside the legacy compatibility shim. The `mailMessagesPattern`, `quotasListPattern`, `commissionsListPattern`, `ownershipTransfersPattern`, `incomingTransfersPattern` constants in `cache-keys.ts` are defined but no call site in the sweep invokes them via wildcard SCAN. They appear to be planned but unused — no new usage was added.

---

## Task 3 — Stampede Protection

| Protection | `cached` / `cachedVersioned` | `cachedForOrg` / `cachedVersionedForOrg` |
|---|---|---|
| In-process single-flight | Yes (`inFlight` map, `cache.service.ts:30`) | Yes (same path) |
| Distributed fill lease | Yes (`FILL_LEASE_SECONDS=10`, `cache.service.ts:83`) | Yes (same path) |
| TTL jitter | **No** | Yes (`applyJitter`, `cache.service.ts:181`) |
| Stale-while-revalidate | No (fail-closed on Redis errors, falls back to fetcher) | No |

Hot shared keys that lack jitter and use the plain `cached` path:
- `acc:settings:<orgId>` — `accounting-settings.service.ts:45`
- `dashboard:announcements:<orgId>` — `dashboard-announcements.service.ts:21`
- `feature-flags:all` — declared in `cache-keys.ts` but not actually used (settings service reads directly from DB; key is dead)
- All `hr:analytics:*` and `hr:dashboard:*` keys — `hr-analytics.service.ts`, `hr-dashboard.service.ts`, `hr-dashboard-reports.service.ts`

The fill lease prevents thundering-herd database hits for individual keys. The no-jitter issue means cluster-wide expiry waves are possible after a cold start or namespace version bump, but each lease-holder absorbs the DB hit and waiting threads drain from the poll loop. This is an efficiency concern, not a correctness one. See REC-1.

**Access-resolution TTL vs. delegation expiry:** Covered in REC-2. The in-process cache respects `validUntil`; Redis TTL is a fixed 30 s ceiling.

---

## Non-Issues (confirmed clean)

- **`CACHE_KEYS` factory is already tenant-safe.** Every factory takes `orgId` as a required typed parameter. The `*ForOrg` migration was attempted and reverted; this audit did not re-raise it.
- **Notification cache** (`notifications:${userId}:${orgId}`) — userId is the namespace discriminator; correct.
- **Chat unread** (`chat:unread:${orgId}` namespace, `userId` sub-key) — correct.
- **Employee list** (`hr:employees:cursor:${orgId}:${userId}:${scope}:...`) — userId and scope are in the key; correct.
- **KB accessible-space cache** (`kb:acc-spaces:${orgId}` namespace, `user.userId` sub-key) — correct.
- **Warehouse list** (`inv:warehouses:${orgId}:${scopeKey}`) — scope serialised into key; correct.
- **Leave dashboard pending-approvals** — key includes scope and audience/userId; correct.
- **Support tickets** — key includes scope and userId; correct.
- **Module access members** — key includes version; correct.
- **`accessPerms` key** — includes `orgId:userId:v${version}`; correct.
- **Search results** — key includes `orgId:userId:hash`; correct.
- **Deals list** — key includes `userId` and `scope` in hash; correct.
