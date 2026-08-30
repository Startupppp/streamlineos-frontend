# CACHE1 — Cache Correctness Audit Report

**Date:** 2026-08-31  
**Scope:** Backend cache key discriminator correctness across ~199 cached read sites

---

## Method

1. Read `cache-keys.ts`, `cache.service.ts`, and `cache-invalidation-matrix.ts` to understand the caching architecture.
2. Searched all `cachedVersioned`, `cachedForOrg`, and `cached()` call sites in `src/modules/**`.
3. For each site with a scope-dependent, user-dependent, or cursor-migrated query, read the service implementation and compared the WHERE clause discriminators against the cache key.
4. Targeted `jest` on all affected specs before and after the fix.

---

## Finding: Leave analytics cross-user disclosure (FIXED)

**File:** `backend/src/modules/hr/time/leaves.service.ts:216`

**Root cause:** `LeavesService.analytics` caches under sub-key `${scope}:${year}`. When `scope === "own"` or `scope === "team"`, the query filters by `actorUserId` via `leaveApprovalScope` — `"own"` maps to `WHERE approver_id = actorUserId`, `"team"` to `WHERE approver_id = actorUserId AND team-membership`. Two different managers who both hold `scope === "own"` collide on the same key (`own:2026`) within the same org namespace. The first manager's analytics (scoped to their own team) are served to the second manager.

**Key before:**
```
hr:leave-analytics:<orgId>:v<ver>:own:2026
```

**Key after:**
```
hr:leave-analytics:<orgId>:v<ver>:own:<userId>:2026
```
(`all` scope is kept without userId since the query is org-wide for all `all`-scope callers.)

**Fix applied in:** `leaves.service.ts:218`

```ts
scope === "all" ? `${scope}:${year}` : `${scope}:${u.userId}:${year}`,
```

**Biting test added:** `leave-analytics-filtered-refresh.spec.ts`

```
"two managers with scope=own within the same org get distinct cache keys and isolated results"
```

Asserts:
- `keyA !== keyB` (keys differ by userId)
- Both keys exist in the store (both are cached independently)
- Manager B's result reflects their own query (count=7, not manager A's count=3)

The existing `"keys the cached view by scope and year beneath the tenant namespace"` assertion was updated to match the new key shape (`team:hr-1:2026` instead of `team:2026`).

---

## Test results

```
PASS src/modules/hr/time/__tests__/leave-analytics-filtered-refresh.spec.ts
  ✓ serves a filtered view from cache, then refreshes it after a write
  ✓ refreshes a second year's view the same write invalidated, not only the one just read
  ✓ keys the cached view by scope and year beneath the tenant namespace
  ✓ two managers with scope=own within the same org get distinct cache keys and isolated results
  ✓ does not serve one tenant's cached view to another

Tests: 5 passed, 5 total
```

Matrix spec (cache-invalidation-matrix.spec.ts): **41 passed, 41 total** — no regressions.

---

## Other sites checked — clean

| Area | Notes |
|---|---|
| `payrollSummaryService.getPeriodSummary` | Hash includes `scope` + `actorUserId`. Correct. |
| `supportTicketsService.listTickets` | Key includes `scope` + `userId`. Correct. |
| `expensesService.list` | Sub-key includes `userId` + `isAdmin` flag. Correct. |
| `projectsQueryService.listProjects` | Key includes `userId` + `scope`. Correct. |
| `moduleAccessRosterService.listMembers` | Key uses cursor or page/pageSize via conditional in `CACHE_KEYS.moduleAccessMembers`. Correct. |
| `mailService.fetchMessagesForAccount` | Namespace is `mail:messages:<accountId>` — tied to one user's connection. Correct. |
| `notificationsReadService.list` | Namespace is `notifications:<userId>:<orgId>`. Correct. |
| `kbAccessService.getAccessibleSpaceIds` | Sub-key is `userId`. Correct. |
| `dashboardLeaveService.getPendingApprovals` | Key includes `audience = scope === "all" ? "org" : userId`. Correct. |
| `invWarehousesService.listWarehouses` | `scopeKey` is a sorted warehouse-id set. Correct. |
| `salesAnalyticsService.getCycleLength` | Key includes `repId ?? "all"`. Correct. |
| Cursor migration (build roadmap, mail) | Roadmap has no caching. Mail key uses cursor value directly. No stale page/pageSize keys. |
| `CACHE_KEYS.payrollExportsList` | Dead key — defined but never called. No correctness risk (unused). Not removed here as knip is required to prove it fully dead. |

---

## Files changed

- `backend/src/modules/hr/time/leaves.service.ts` — fix discriminator gap (1 line)
- `backend/src/modules/hr/time/__tests__/leave-analytics-filtered-refresh.spec.ts` — update key assertion + add biting test (25 lines)
