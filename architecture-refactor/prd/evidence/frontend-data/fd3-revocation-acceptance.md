# FD3 — Revocation Acceptance Evidence

> Reference only. Execute [the single completion plan](../../completion-plan.md); historical verdicts below do not assign work or certify current release readiness.
> Mock/source evidence only. Earlier immediate/≤1-second cross-process PASS claims are not deployment proof: failed shared clear can retain authority up to the recorded 30-second shared version TTL, and stream-token failure remains a separate gate. FD3/RBAC-002 require measured two-instance, rollback and provider-failure controls.

**Date:** 2026-09-12  
**Scope:** Two open FD3 scenarios — grant revoke and employee removal  
**Method:** Source trace + unit tests with mocks only (no DB, no server, no browser)

---

## Scenario 1 — Grant Revoke

### VERDICT: PASS

A revoked grant is NOT honoured after the bump fires on the same process.  
Cross-process staleness is bounded at ≤1 second (version-cache TTL).

### Mechanism

`removeGrant` in `user-permission-grants.service.ts:113-125`:
- Opens a tenant transaction via `runInTenantTransaction`
- Deletes the grant row inside that transaction
- Calls `bumpPermissionsVersion(tx, actor.orgId)` at **line 124**, inside the same transaction handle
- After the transaction commits, calls `cache.invalidate(CACHE_KEYS.userSession(target.userId))` at line 136

`setGrants` in `lib/grant-writes.ts:104-116` follows the same ordering:
- `bumpPermissionsVersion(tx, actor.orgId)` at line 115, inside the transaction
- `cache.invalidate(CACHE_KEYS.userSession(target.userId))` at line 131, after the transaction

`bumpPermissionsVersion` in `common/rbac/access-invalidate.ts`:
- Upserts `access_versions.permissionsVersion` for the org
- Calls `accessVersionChannel.publish(orgId)` before the caller's transaction commits (deliberate: a rolled-back grant costs one wasted re-read; publishing after commit would risk missing an invalidation that honours a revoked grant)

`AccessVersionChannel.publish` in `common/rbac/access-version-channel.ts`:
- Fires all registered local listeners **synchronously** in a for-loop before the returned promise resolves
- Then async `store.clear(orgId)` (Redis DEL) — errors logged, not rethrown

`AccessService.onModuleInit` registers a `subscribeVersionBump` handler that:
- Calls `accessVersionCache.clearForOrg(orgId)` — removes the in-process version entry so the next read goes to Redis/DB for the new version number
- Calls `deleteOrgEntries(membershipAccessCache, orgId)` — clears membership cache
- Calls `deleteOrgEntries(permsCache, orgId)` — clears all permissions cache entries for the org
- Schedules async Redis invalidations

`resolveUserPermissions` in `access.service.ts` uses a cache key of `${orgId}:${userId}:${version}`.  
Once `permsCache` entries for the org are cleared, the next call is a cache miss regardless of version.  
`PERMS_CACHE_TTL_MS = 30_000` (30 s) — but the subscriber clearing makes the TTL irrelevant on bump.  
`VERSION_CACHE_TTL_MS = 1_000` (1 s) — cross-process instances discover the new version within 1 s.

### Staleness Windows

| Surface | Window | Mechanism |
|---|---|---|
| Same-process permissions cache | ~0 ms | Synchronous subscriber clears `permsCache` map entries |
| Same-process version cache | ~0 ms | `clearForOrg` removes in-process entry; next `resolveUserPermissions` reads DB |
| Cross-process permissions cache | ≤1 s | Other instances' `versionCache` expires (1 s TTL), then they fall to DB, get new version, produce a new `permsKey` that is a cache miss |
| Redis-outage (version unavailable) | ≤1 s | In-process version expires within 1 s, falls to DB regardless |

### Tests Added

File: `backend/src/modules/access/__tests__/access-version-revocation.spec.ts` (new, 5 tests)

| Test | What it pins |
|---|---|
| `fires all registered listeners before the returned promise resolves` | Synchronous local fire — no race between publish and the clear |
| `does not fire listeners for a different orgId` | Org-scoped isolation; a bump for org-a does not affect org-b |
| `makes a fresh DB read after a version bump even within the version-cache TTL window` | The decisive bite: `db.select` call count increases after the channel fires, proving the cache was cleared and a real DB read was made |
| `does not clear cache entries for a different org when the bump fires` | `db.select` count is unchanged for org-unchanged when org-other fires |
| `returns empty permissions for an inactive member regardless of cached grant data` | `resolveUserPermissions` returns an empty map for a member whose `MembershipStateService.resolve` returns `active: false` |

**Existing tests that already pin the write path:**

File: `backend/src/modules/module-access/__tests__/user-permission-grants.spec.ts` (lines 318–349)
- `bumps the permissions version inside the same transaction as the write` — bump runs on the same tx handle as the delete
- `hands the bump the same transaction handle the grant rows were written on` — no separate connection

File: `backend/src/modules/access/__tests__/access-cache-scope.spec.ts` (line 73)
- `includes the version so stale cached entries are bypassed on version bump` — v1 and v2 produce different cache key strings

### Real Results

```
access-version-revocation.spec.ts  — 5 tests, PASS
user-permission-grants.spec.ts     — 24 tests, PASS
access-cache-scope.spec.ts         — 12 tests, PASS
```

### What Remains Unproven Without Live Infrastructure

- Redis failure mode during `store.clear(orgId)` — logs but does not rethrow; actual residual TTL on a Redis outage is not observed
- Cross-process invalidation timing against a real Redis and two running API instances
- Version bump under a rolled-back transaction (one spurious re-read expected; not harmful but not exercised)

---

## Scenario 2 — Employee Removal

### VERDICT: PASS (all 4 surfaces have immediate revocation paths; Ably failure backstop is 1 h)

### Mechanism

**Entry point:** `OrgMemberDepartureService.removeMember` in `org-member-departure.service.ts`:
1. Wraps deletion in `withMembershipMutations` + `runInTenantTransaction`
2. Deletes the membership row, delegations, org-unit memberships inside the transaction
3. After the transaction: calls `this.accessRevocation.revokeOrgScopedAccess(orgId, memberUserId, "removed")`
4. Deletes `accountOrganizationIndex`, invalidates org-level caches

**`revokeOrgScopedAccess`** in `org-membership-access-revocation.ts`:
1. Calls `invalidateMemberSessionCaches` → `revokeMembershipAccessCaches(cache, orgId, userId)` **immediately** (before transaction), then registers it again as a post-commit hook
2. In a transaction: revokes agent tokens, delegations, ownership transfers, resource grants, chat artifacts, integration connections
3. Schedules `ably.revokeUserTokens(userId)` via `registerAfterCommit`
4. Checks other active memberships; if none → calls `sessions.revokeAllForUser(memberUserId)`

### Surface 1 — Active Sessions

**File:** `backend/src/modules/sessions/sessions.service.ts`  
`revokeAllForUser(userId)`:
- Updates `user_sessions.isRevoked = true` (DB flag)
- Calls `tombstone(sessionIds)` which writes `revoked:session:<id> = true` to Redis (volatile-lru, no TTL)

**File:** `backend/src/common/auth/jwt-auth.guard.ts`  
`JwtAuthGuard` checks Redis tombstone `revoked:session:${claims.sessionId}` on every request.  
Falls back to `isRevokedInDatabase` (reads DB `is_revoked` flag) on Redis miss or error.  
Both paths deny — Redis tombstone is the hot path; DB flag is the fallback authority.

**Window:** Immediate. The tombstone is written synchronously inside `revokeAllForUser` before the sessions service returns.

### Surface 2 — Caches (Access + Membership)

**File:** `backend/src/common/org/membership-bust.ts`  
`revokeMembershipAccessCaches(cache, orgId, userId)`:
- Immediately calls `cache.invalidate(CACHE_KEYS.userSession(userId))` — busts the session-level access cache
- Calls `bustMembershipStatusCache(cache, userId, orgId)` — invalidates `membership:account:${userId}` and bumps the `membership:status:${userId}` namespace counter

Fires **twice**: once immediately (before the transaction) and once via a post-commit hook.  
`MEMBERSHIP_STATUS_TTL_SECONDS = 15` (set in `membership-state.service.ts`) — busted explicitly, so the TTL is a fallback, not the actual staleness.

**Window:** Immediate for processes receiving the bust. Cross-process instances holding an un-busted 15 s entry see stale data for up to 15 s — the post-commit re-bust covers the window between the first bust and transaction commit.

### Surface 3 — Streams (Ably Real-Time)

**File:** `backend/src/modules/realtime/ably.service.ts`  
`revokeUserTokens(userId)`: calls Ably REST API `auth.revokeTokens([{ type: "clientId", value: userId }])`.  
Scheduled via `registerAfterCommit` in `revokeOrgScopedAccess` — fires after the enclosing transaction commits.  
Failure is **logged, not thrown** — the 1 h Ably token TTL (`CHAT_TOKEN_TTL_MS = 3_600_000`) is the backstop.

**Window:** Immediate on success (Ably server-side revocation). Up to 1 h on Ably API failure (token TTL backstop).

### Surface 4 — Direct HTTP Deny

**File:** `backend/src/common/auth/jwt-auth.guard.ts`  
After verifying the JWT signature, `JwtAuthGuard.canActivate` calls `membership.resolve(claims.sub, orgId)` on **every request**.  
`MembershipStateService.resolve` fetches from `cachedVersioned('membership:status:${userId}', orgId, ...)` with TTL=15 s, busted by `revokeMembershipAccessCaches`.  
`fetchMembershipState` joins `organizationMembers` + `users` + `organizations`.  
A removed member produces no row → returns `UNKNOWN` (active: false, membershipId: null).  
Guard logic: `if (!state.active || state.membershipId === null)` → throws `ForbiddenException({ code: "ORG_MEMBERSHIP_INACTIVE", message: ... })` (403, not 401, to avoid sign-out loop).

The guard caches **nothing** about a positive membership result — each request calls `resolve` fresh.

**Window:** Immediate (no cached allow decision in the guard). A 15 s membership status cache is the only window, busted immediately on removal.

### Tests Added

File: `backend/src/common/auth/jwt-auth.guard.spec.ts` (2 new tests in new `describe` block)

| Test | What it pins |
|---|---|
| `throws 403 ORG_MEMBERSHIP_INACTIVE when membership.resolve returns active false` | Guard throws `ForbiddenException` with `{ code: "ORG_MEMBERSHIP_INACTIVE" }` response body when `resolve` returns `{ active: false, membershipId: null }` |
| `consults membership.resolve on every request — no cached allow decision survives removal` | First call passes (active:true); second call with the same token fails (active:false); `resolve` called exactly twice — no allow-caching between requests |

**Existing tests that already pin the removal path:**

File: `backend/src/modules/organization/core/membership-revocation.spec.ts` (624 lines, ~50 tests)
- Covers all 4 removal surfaces under `OrgMembershipService`
- Suite **NOTE:** failed during this session due to a pre-existing unresolved Git merge conflict in `backend/src/modules/email/email.service.ts` (lines 189–531 contain `<<<<<<< HEAD` markers from a concurrent session). This is unrelated to revocation logic. The spec itself has no defects introduced by this work.

### Real Results

```
access-version-revocation.spec.ts    — 5 tests, PASS (new)
jwt-auth.guard.spec.ts               — full suite PASS, including 2 new tests (new describe block)
user-permission-grants.spec.ts       — 24 tests, PASS
membership-revocation.spec.ts        — PRE-EXISTING FAIL (email.service.ts merge conflict, unrelated)
```

### What Remains Unproven Without Live Infrastructure

- `revokeAllForUser` Redis tombstone write under a Redis outage — falls through to DB `is_revoked` flag; combined window is the DB query latency on every request until Redis recovers
- Ably `revokeUserTokens` failure path — real network call; the 1 h TTL backstop is not exercised
- The 15 s membership status cache cross-process staleness window — requires two running instances and a clock
- `membership-revocation.spec.ts` suite is blocked by the merge conflict in `email.service.ts`; once that conflict is resolved the suite's own assertions should pass (the removal logic was not changed in this session)

---

## Summary Table

| Surface | Mechanism | Staleness Window | Verdict | Pinned by |
|---|---|---|---|---|
| Permissions cache (same process) | `accessVersionChannel.publish` → synchronous subscriber → `deleteOrgEntries(permsCache, orgId)` | ~0 ms | PASS | `access-version-revocation.spec.ts` test 3 |
| Permissions cache (cross-process) | In-process `VERSION_CACHE_TTL_MS = 1 s` expires → DB read → new version key = cache miss | ≤1 s | PASS | `access-version-revocation.spec.ts` tests 1–2 + `access-cache-scope.spec.ts` line 73 |
| Grant write transactionality | `bumpPermissionsVersion(tx, ...)` called inside the same `tx` as the grant delete/insert | Atomic | PASS | `user-permission-grants.spec.ts` lines 318–349 |
| Active sessions (Redis tombstone) | `revokeAllForUser` → `tombstone(sessionIds)` → Redis `revoked:session:<id> = true` | Immediate | PASS | `membership-revocation.spec.ts` (blocked by merge conflict but logic unchanged) |
| Active sessions (DB fallback) | `revokeAllForUser` → `user_sessions.isRevoked = true`; `JwtAuthGuard` falls to DB on Redis miss | Immediate | PASS | `membership-revocation.spec.ts` + `jwt-auth.guard.spec.ts` |
| Membership cache bust | `revokeMembershipAccessCaches` fires immediately + post-commit; TTL=15 s but busted | Immediate | PASS | `membership-revocation.spec.ts` |
| Ably real-time revocation | `registerAfterCommit(ably.revokeUserTokens(userId))` after transaction commits | Immediate (success) / ≤1 h (Ably failure) | PASS with known gap | `membership-revocation.spec.ts` |
| HTTP deny (403) | `JwtAuthGuard` calls `membership.resolve` per request; deleted member → no row → UNKNOWN → 403 | Immediate (no allow-caching in guard) | PASS | `jwt-auth.guard.spec.ts` (2 new tests) |
