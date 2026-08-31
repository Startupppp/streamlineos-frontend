# Cache Key Inventory

> Lane L14 — produced 2026-08-31. Covers PRD items 876 (dimension audit), 877 (invalidation proof), 878 (stampede protection).

---

## A. Dimension Inventory

Key: **P** = present, **R** = required (affects result), **—** = not applicable or deliberate absence. A cell with **MISS** marks a correctness bug.

### Notation

- `orgId` — tenant discriminator (all `cachedForOrg` / `cachedVersionedForOrg` wrappers enforce this by construction)
- `permVer` — the `access:version:<orgId>` counter; a bump invalidates derived caches
- `userId` — per-user discriminator where results differ per user
- `locale` — affects language/date formatting in the response
- `tz` — timezone; affects "today" date boundaries and calendar rendering
- `filters` — request-specific params (status, date range, pagination cursor, etc.)

### Shared-utility methods

| Method | Tenant isolation mechanism |
|---|---|
| `cached(key, …)` | Caller owns the key — must embed orgId manually |
| `cachedForOrg(orgId, localKey, …)` | Prepends `<orgId>:` (or `<cellPrefix>:<orgId>:`) by construction |
| `cachedVersioned(ns, key, …)` | Caller owns namespace — must embed orgId in ns |
| `cachedVersionedForOrg(orgId, ns, key, …)` | Namespace is scoped to org by construction |

`CACHE_KEYS` factory: **tenant-safe by construction** — every factory receives `orgId` (or `userId` for cross-org auth data) as its first argument and embeds it literally in the key string. A previous attempt to "migrate" this was tried and reverted; it is correct as-is.

---

### RBAC / Auth keys

| Key factory / namespace | orgId | permVer | userId | locale | tz | filters | Verdict |
|---|---|---|---|---|---|---|---|
| `user:session:<userId>` | — | — | **P** | — | — | — | OK — cross-org key by design |
| `membership:account:<userId>` | — | — | **P** | — | — | — | OK |
| `access:version:<orgId>` | **P** | — | — | — | — | — | OK — counter only |
| `access:perms:<orgId>:<userId>:v<ver>` | **P** | **P** | **P** | — | — | — | OK |
| `access:members-with-perm:<orgId>:<permKey>:v<ver>` | **P** | **P** | — | — | — | permKey+page | OK |
| `rbac:matrix:<orgId>:v<ver>` | **P** | **P** | — | — | — | — | OK |
| `rbac:role-perms:<orgId>:<roleId>:v<ver>` | **P** | **P** | — | — | — | — | OK |
| `rbac:members:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK — invalidated on permVer bump |
| `org:roles:<orgId>` | **P** | — | — | — | — | — | OK |
| `mfa:org-policy:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK |
| `mfa:user-totp:<userId>` | — | — | **P** | — | — | — | OK |
| `feature-flags:all` | — | — | — | — | — | — | OK — global config, no tenant |
| `module-access:roles:<orgId>:<moduleKey>:v<ver>` | **P** | **P** | — | — | — | moduleKey | OK |
| `module-access:groups:<orgId>:<moduleKey>:v<ver>` | **P** | **P** | — | — | — | moduleKey | OK |
| `module-access:group-members:<orgId>:<moduleKey>:<groupId>:v<ver>` | **P** | **P** | — | — | — | moduleKey+groupId | OK |
| `module-access:members:<orgId>:<moduleKey>:v<ver>:limit:…:cursor:…:userId` | **P** | **P** | optional | — | — | limit+cursor | OK |
| `module-access:candidates:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK — invalidated via bumpPermissionsVersion callback |
| `module-access:ownership:<orgId>:<moduleKey>` | **P** | — | — | — | — | moduleKey | OK |
| `ownership:modules:<orgId>` | **P** | — | — | — | — | — | OK |
| `ownership:module:<orgId>:<moduleKey>` | **P** | — | — | — | — | moduleKey | OK |
| `ownership:transfers:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `ownership:incoming:<orgId>:<userId>` | **P** | — | **P** | — | — | — | OK |

### Dashboard / Org keys

| Key factory / namespace | orgId | permVer | userId | locale | tz | filters | Verdict |
|---|---|---|---|---|---|---|---|
| `dashboard-home:v<ver>:<resource>` (via `buildOrgDashboardCacheKey`) | **P** (in `cachedForOrg`) | **P** | — | — | — | resource+dimension | OK |
| `dashboard-home:u<userId>:v<ver>:<resource>:<scope>` (via `buildScopedDashboardCacheKey`) | **P** (in `cachedForOrg`) | **P** | **P** | optional | — | scope+resource | OK — locale param available but not wired for all callers |
| `dashboard:stats:<orgId>` (CACHE_KEYS, dead factory) | **P** | — | — | — | — | — | Dead factory — no service uses it |
| `dashboard:executive:<orgId>` | **P** | — | — | — | — | — | TTL-only; aggregate |
| `dashboard:announcements:<orgId>` | **P** | — | — | — | — | — | OK |
| `org:profile:<orgId>` (via `cachedVersionedForOrg`) | **P** | — | — | — | — | — | OK |
| `org:members:list:<orgId>` (via `cachedVersionedForOrg`) | **P** | — | — | — | — | page/filters | OK |
| `org:settings:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK — canonical key for timezone+locale settings |
| `org:units:<orgId>:<kind>` (via `cachedForOrg`) | **P** | — | — | — | — | kind | OK |
| `org:hierarchy:<orgId>` (via `cachedVersionedForOrg`) | **P** | — | — | — | — | — | OK |
| `users:stats:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK |
| `branches:list:<orgId>` (via `cachedForOrg`) | **P** | — | — | — | — | — | OK |

**Correctness bug — `stats-attendance` date dimension uses server UTC, not org timezone.**

`dashboard-stats.service.ts:49` calls `getTodayString()` (UTC wall-clock) to build the cache key for today's attendance count. An org in UTC+14 crosses its local midnight 14 hours before the UTC key changes. The SHORT TTL (30 s) limits the stale window, but the cached "today" count can differ from the org's local date for up to 30 seconds. **File**: `src/modules/dashboard/dashboard-stats.service.ts:49`. **Fix**: pass org timezone (from the cached `org:settings` key) into `buildOrgDashboardCacheKey` as the `dimension` arg, replacing `today` with `${orgTz}:${today}`.

### CRM keys

| Key factory / namespace | orgId | permVer | userId | locale | tz | filters | Verdict |
|---|---|---|---|---|---|---|---|
| `crm:contacts:list:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `crm:organizations:list:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `crm:organizations:detail:<orgId>` (namespace-versioned) | **P** | — | — | — | — | id | OK |
| `sales:dashboard:<orgId>` | **P** | — | — | — | — | — | TTL-only acceptable |
| `sales:kpis:<orgId>` (namespace `sales:kpis:<orgId>`, sub-key `from:to:repId`) | **P** | — | — | — | — | from+to+repId | OK — date range and rep in sub-key |
| `ce:dashboard:<orgId>` | **P** | — | — | — | — | — | TTL-only acceptable |
| `deals:list:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `deals:forecast:<orgId>` | **P** | — | — | — | — | — | OK |
| `deals:approvals:<orgId>` | **P** | — | — | — | — | — | OK |
| `clients:health:<orgId>` (via `cachedVersionedForOrg`, sub-key `userId:scope:status:limit`) | **P** | — | **P** | — | — | scope+status+limit | OK — userId in sub-key |
| `clients:churn:<orgId>` (via `cachedVersionedForOrg`, sub-key `userId:scope`) | **P** | — | **P** | — | — | scope | OK — userId in sub-key |
| `sales:quotas:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `sales:commissions:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `quotes:list:<orgId>` (namespace-versioned) | **P** | — | — | — | — | hash | OK |
| `invoices:list:<orgId>` (via `cachedVersionedForOrg`) | **P** | — | — | — | — | status+clientId+limit+offset | OK |
| `search:<orgId>:<userId>:<hash>` | **P** | — | **P** | — | — | hash | OK — user-scoped |
| `leads:list`, `leads:detail`, `leads:board`, `leads:stats`, `targets:list`, `targets:leaderboard`, `quotes:detail`, `invoices:detail`, `invoices:stats` | **P** | — | — | — | — | — | Dead factories — no service calls them; TTL-only in matrix |

### Finance / Accounting keys

| Key factory / namespace | orgId | permVer | userId | locale | tz | filters | Verdict |
|---|---|---|---|---|---|---|---|
| `acc:settings:<orgId>` | **P** | — | — | — | — | — | OK |
| `acc:setup-status:<orgId>` | **P** | — | — | — | — | — | OK |
| `acc:coa:tree:<orgId>` | **P** | — | — | — | — | — | OK |
| `acc:dimensions:<orgId>` | **P** | — | — | — | — | — | OK |
| `accounting:periods:<orgId>` | **P** | — | — | — | — | — | OK |
| `acc:statements:<orgId>` | **P** | — | — | — | — | asOf+type | OK — date range is caller filter, raw-string key |
| `fin:reports:<orgId>` | **P** | — | — | — | — | namespace bump covers all | OK |
| `fin:bva:<orgId>:<budgetId>` | **P** | — | — | — | — | budgetId | OK |
| `fin:forecast:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:banking:accounts:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:assets:list:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:asset-categories:<orgId>` | **P** | — | — | — | — | — | TTL-only; low-churn |
| `fin:tax-codes:<orgId>` | **P** | — | — | — | — | — | TTL-only; low-churn |
| `fin:tax-payments:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:tax-dashboard:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:tax-reports:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:expense-policies:<orgId>` | **P** | — | — | — | — | — | OK |
| `fin:insights:anomalies:<orgId>:<from>:<to>` | **P** | — | — | — | — | from+to | OK — date range in key |
| `fin:insights:digest:<orgId>` | **P** | — | — | — | — | — | TTL-only; AI aggregate |
| `fin:cat-suggest:<orgId>:<merchant>` | **P** | — | — | — | — | merchant | OK |
| `hr:expenses:<orgId>` (namespace) | **P** | — | — | — | — | userId+admin flag | OK — sub-keyed |

### Inventory keys

All inventory keys live in `src/modules/inventory/` and use `cachedForOrg` / `invalidateForOrg` / namespace patterns. The orgId dimension is **P** for all; no locale or timezone sensitivity (inventory values are unit-count, money-integer). Filters are embedded in the sub-key hash where relevant.

| Namespace | Verdict |
|---|---|
| `inv:products:list:<orgId>` | OK |
| `inv:products:detail:<orgId>:<id>` | OK |
| `inv:stock:summary:<orgId>` | OK |
| `inv:low-stock:<orgId>` | OK |
| `inv:warehouses:detail:<orgId>:<id>` | OK |
| `inv:po:list:<orgId>`, `inv:po:detail:<orgId>:<id>` | OK |
| `inv:grn:list:<orgId>` | OK |
| `inv:vendors:list:<orgId>` | OK |
| `inv:so:list:<orgId>`, `inv:so:detail:<orgId>:<id>` | OK |
| `inv:vret:list/<detail>:<orgId>` | OK |
| `inv:cret:list/<detail>:<orgId>` | OK |
| `inv:dashboard:<orgId>` | TTL-only; acceptable |
| `inv:replenishment:suggestions:<orgId>` | TTL-only; expensive aggregate |
| `inv:reorder:<orgId>`, `inv:reorder:paged:<orgId>` | OK |
| `inv:stock:summary-report:<orgId>` | OK |
| `inv:valuation:report:<orgId>` | OK |
| `inv:slow-moving:<orgId>` | TTL-only |
| `inv:expiry:report:<orgId>` | TTL-only; date-driven |
| `inv:cycle-counts:list/<detail>:<orgId>` | OK |
| `inv:quality:inspections/<holds>/<recalls>:<orgId>` | OK |
| `inv:packages/<shipments>/<loads>/<carriers>:<orgId>` | OK |
| `inv:channels:list/<detail>:<orgId>` | OK |
| `inv:3pl:list:<orgId>` | OK |
| `inv:import-jobs/<export-jobs>:list:<orgId>` | OK |
| `inv:settings:<orgId>`, `inv:numseq:<orgId>` | OK |
| `inv:ai-insights:<orgId>` | OK |

### HR / Payroll keys

| Namespace | Verdict |
|---|---|
| `hr:headcount:<orgId>` (namespace) | OK |
| `hr:leave-analytics:<orgId>` (namespace, sub-key `scope:userId:year`) | OK — year is caller-supplied integer |
| `hr:expenses:<orgId>` (namespace) | OK |
| `timesheets:payroll:summary:<orgId>` (namespace, hash sub-key) | OK |
| `timesheets:payroll:exports:<orgId>` | OK |
| `timesheets:payroll:settings:<orgId>` | OK |
| `timesheets:settings:<orgId>` | OK |
| `timesheets:rates:<orgId>` | OK |

### Mail / Calendar / Other

| Namespace | Verdict |
|---|---|
| `mail:messages:<accountId>` (namespace-versioned by accountId) | OK — accountId is the right discriminator, not userId (one user can have multiple accounts) |
| `integrations:extevents:<connectionId>:<startIso>:<endIso>` | OK — absolute ISO timestamps, no TZ issue |
| `calendar:events:<orgId>` (CACHE_KEYS factory) | Dead factory — no service calls it; TTL-only in matrix |
| `support:dashboard/<reports>/<list>/<detail>:<orgId>` | TTL-only / dead factories; acceptable |
| `tasks:list/<detail>`, `projects:labels`, `projects:customStates`, `tickets:list` | Dead factories in CACHE_KEYS — no service calls them |

---

## B. Invalidation Matrix

### Trigger coverage

| Trigger | Mechanism | Cross-instance | Verdict |
|---|---|---|---|
| **Mutation** (data write) | `invalidateNamespace` / `invalidateForOrg` / `invalidate(key)` on write path | Redis INCR or DEL propagates to all instances | DONE — all `kind:"write"` entries in matrix |
| **Membership change** | `invalidateNamespaceForOrg(orgId,'org:members:list')` + `invalidate(CACHE_KEYS.userSession(userId))` + `bustMembershipStatusCache(userId)` | Redis DEL/INCR reaches all instances | DONE |
| **Role change** | `bumpPermissionsVersion(tx, orgId)` → `access_versions` DB bump → `subscribeVersionBump` callback → `invalidateForOrg(orgId,'rbac:members')` + process-local `permsCache/versionCache` clear | Version bump increments DB; each instance re-reads version on next request, gets cache miss on `access:perms:...:v<newVersion>` | DONE |
| **Entitlement change** (`setModuleEnabled`) | `invalidateForOrg(orgId,'entitlements:module:<key>')` + `invalidateForOrg(orgId,'entitlements:modules')` + `invalidate(CACHE_KEYS.userSession(m.userId))` for **every ACTIVE member** | Redis DEL for each member's session key | DONE — F03 check passes; code busts all active members, not just the actor |
| **Organization switch** | `invalidate(CACHE_KEYS.userSession(userId))` in `OrgProfileService.switchOrg` | Redis DEL | DONE |
| **Placement change** (org-unit / hierarchy mutation) | `OrgHierarchyCacheService.invalidateAfterMutation` → `invalidateNamespaceForOrg(orgId, 'org:hierarchy')` + `hrHeadcountNamespace` + `org:units` | Redis INCR | DONE |

### Session revocation

The Redis tombstone (`revoked:session:<id>`) is what actually revokes a session — `JwtAuthGuard` reads only that, so a DB `isRevoked` flag alone logs nobody out. Verified in `backend/CLAUDE.md §4` and confirmed in `backend/src/modules/access/access.service.ts`. The tombstone path is distinct from the `userSession` aggregate cache.

### `check:cache-invalidation` script

**Before fix:** 0 CRITICAL, 0 MEDIUM, 75 LOW (all false positives — see below).  
**After fix:** 0 CRITICAL, 0 MEDIUM, 0 LOW.

#### Script output — `--self-test` (both before and after)

```
{ "selfTest": true, "pass": true, "cases": [ ... all 6 pass ... ] }
```

#### Script output — full scan (after fix)

```
=== cache-invalidation gate — 1017 service files scanned ===
RESULT: LOW-only — 0 documentation gaps (not blockers)
```

#### Root cause of 75 false LOW gaps (now fixed)

`parseMatrixNamespacePrefixes` only read `cache-invalidation-matrix.ts` directly. The matrix is spread across 5 files; the 4 imported sub-files (`cache-invalidation-rbac-auth.ts`, `cache-invalidation-finance.ts`, `cache-invalidation-inventory.ts`, `cache-invalidation-crm.ts`) were never scanned. Every factory family defined only in a sub-file appeared to be uncovered. Fix: `parseMatrixNamespacePrefixes` now reads all 5 files.

#### Additional script gaps fixed

1. **4 stale factory names in `KEY_TO_NAMESPACE_PREFIX`** (`invWarehousesList`, `clientsHealth`, `churnAlerts`, `rbacDiscoveryMembers`) referenced factories that do not exist in `cache-keys.ts` — those services use raw string keys. Removed.
2. **3 missing factory entries added** to `KEY_TO_NAMESPACE_PREFIX`: `finInsightsAnomalies`, `finInsightsDigest`, `finCategorizeSuggest`.
3. **24 inventory factory entries added** to `KEY_TO_NAMESPACE_PREFIX` (carrier, channel, 3pl, import/export jobs, settings, numseq, AI insights, vendor returns, customer returns, cycle count detail, quality holds/recalls, reorder, stock reports, valuation, slow-moving, expiry).
4. **`MISSING_INVALIDATION_CHECKS`** read patterns updated to match actual service code (raw string `"clients:health"` / `"clients:churn"` instead of `CACHE_KEYS.clientsHealth` factory name).
5. **`KEY_MISMATCH_CHECKS`** for `rbacDiscoveryMembers` removed — the described bug was already fixed (`rbac.service.ts` already uses `cachedForOrg(orgId,'rbac:members',…)`).
6. **Stale matrix description** for `rbac:members:<orgId>` updated — the "targets wrong key" note was from before the fix; the key formats now match.

### Gaps NOT covered by the script

The script does not verify:

- Accounting module raw-string keys (`acc:settings`, `acc:coa:tree`, `accounting:periods`, `acc:statements`, etc.) — these services write raw strings rather than `CACHE_KEYS` factories. The matrix entries exist; the script has no factory reference to check against.
- `org:settings:<orgId>` (used via `cachedForOrg(orgId,'org:settings')`) — not in `KEY_TO_NAMESPACE_PREFIX`.
- Dashboard keys built by `buildOrgDashboardCacheKey` / `buildScopedDashboardCacheKey` — composite keys not tied to a single factory.

---

## C. Stampede Protection

### Current implementation (already in `CacheService`)

**In-process single-flight** (`cache.service.ts:31-40`):

```typescript
const existing = this.inFlight.get(key);
if (existing) return existing as Promise<T>;
const request = this.loadOrFetch(redis, key, fetcher, ttlSeconds);
this.inFlight.set(key, request);
try {
  return await request;
} finally {
  if (this.inFlight.get(key) === request) this.inFlight.delete(key);
}
```

N concurrent misses within one process share the same `Promise`. The fetcher runs exactly once.

**Distributed fill lease** (`cache.service.ts:82-127`):

```typescript
const leaseKey = `cache:fill-lease:${key}`;
const leaseToken = randomUUID();
acquired = redis.set(leaseKey, leaseToken, { ex: 10, nx: true }) === "OK";

if (!acquired) {
  // poll up to 2 s at 50 ms intervals; fall back to direct fetch on timeout
}
// lease holder: compute, store, then release lease with a compare-and-delete Lua script
```

A Redis `SET NX` lease (10 s TTL) ensures that across N app instances, only the lease holder computes the value. Other instances wait up to 2 seconds, polling every 50 ms. If the lease holder crashes, the lease expires and any waiter falls back to a direct fetch. The lease release uses a Lua compare-and-delete to avoid releasing another instance's lease on a race.

**Both mechanisms apply to every `cached*` call site** — all `cachedForOrg`, `cachedVersionedForOrg`, `cachedVersioned`, and `cached` paths go through `cachedWithRedis → loadOrFetch`.

**TTL jitter** (`applyJitter`): ±15% on all `cachedForOrg` / `cachedForOrgWith` fills prevents thundering-herd re-expiry.

### Stale-data tolerance per read model

| Read model | TTL | Stampede protection | Notes |
|---|---|---|---|
| `access:perms:…` | 0 s (explicit invalidation) | In-process `permResolveInFlight` Map + distributed lease | Security; no tolerance |
| `user:session:…` | Short (30 s) or explicit invalidation | Distributed lease | Security; near-zero tolerance |
| `org:hierarchy:…` | Medium (5 min) | Distributed lease | Structural; 5 min tolerated |
| `acc:statements:…` | Medium (5 min) | Distributed lease | Expensive multi-join; 5 min OK |
| `fin:reports:…` | Medium (5 min) | Distributed lease | Multi-source aggregate; 5 min OK |
| `inv:stock:summary:…` | Medium (5 min) | Distributed lease | Expensive aggregate; 5 min OK |
| `hr:leave-analytics:…` | Medium (5 min) | Distributed lease | Date-range aggregate; 5 min OK |
| `sales:kpis:…` | Medium (5 min) | Distributed lease | Rep-scoped KPI; 5 min OK |
| `fin:insights:anomalies:…` | Long (ANOMALY_TTL) | Distributed lease | AI aggregate; tolerance = ANOMALY_TTL |
| `dashboard:*` aggregates | Short (30 s) TTL-only | Distributed lease | Acceptable; 30 s tolerance |
| `inv:replenishment:…` | Medium (5 min) TTL-only | Distributed lease | Expensive; 5 min OK |
| `rbac:matrix:…`, `rbac:role-perms:…` | Version-gated (no TTL expiry) | Distributed lease | Immediately stale on bump |

### Expensive shared read models — coverage

All of the following go through `cachedForOrg` or `cachedVersionedForOrg` and therefore have full stampede protection:

| Read model | Service | Covered |
|---|---|---|
| Financial statements (`acc:statements`) | `AccountingStatementsService` | YES |
| Finance reports (`fin:reports`) | `FinanceReportsService` | YES |
| Permission resolution (`access:perms`) | `AccessService` (+ in-process `permResolveInFlight`) | YES |
| Inventory stock summary (`inv:stock:summary`) | `StockService` | YES |
| Leave analytics (`hr:leave-analytics`) | `LeavesService` | YES |
| Client health / churn (`clients:health`, `clients:churn`) | `ClientsService` | YES |
| Sales KPIs (`sales:kpis`) | `SalesDashboardService` | YES |
| AI insights (`fin:insights:anomalies`) | `FinanceInsightsService` | YES |
| Org hierarchy (`org:hierarchy`) | `OrgHierarchyCacheService` | YES |

**None outstanding** — all expensive shared read models already route through `CacheService` methods that have stampede protection.

---

## Open items

1. **`stats-attendance` date key uses UTC, not org timezone** (`src/modules/dashboard/dashboard-stats.service.ts:49`) — correctness bug, window ≤30 s. Fix: embed org timezone in the cache key dimension for attendance-count queries.
2. **Dead factories in `cache-keys.ts`** should be removed to prevent future confusion: `orgMembers`, `usersStats`, `orgUnits`, `branchesList`, `dashboardStats`, `tasksList`, `taskDetail`, `supportTicketsList`, `supportTicketDetail`, `calendarEvents`, `projectLabels`, `customStates`, `ticketsList`, `leadsList`, `leadDetail`, `leadBoard`, `leadStats`, `targetsList`, `targetLeaderboard`, `quoteDetail`, `invoiceDetail`, `invoiceStats`. Each is documented as dead in the matrix. Removal is safe only after confirming zero source-file references (beyond the matrix itself).
3. **`staleToleranceSeconds` fields** are declared only on RBAC/auth entries. All other matrix entries omit this field. The dimension table above provides per-model guidance; adding the field to remaining entries is a documentation task.
4. **`org:settings` not in `KEY_TO_NAMESPACE_PREFIX`** — the script does not verify this key family. Low risk (it has explicit `invalidateForOrg` in `OrganizationSettingsService`), but adding it closes the gap.
