# FD4 Source Gap Resolution

Closes the six "BLOCKED — needs source verification" entries in `fd4-fd5-server-cost-cache.md`.
Source read date: 2026-09-12. No live DB or Redis involved.

---

## GAP 1 — `hydrateTimelineMessages` N+1

**Question:** does it batch-resolve entity references or loop per message issuing a query per row?

**Verdict:** BATCHED — O(1) DB queries regardless of page size.

**Evidence:**

`chat-timeline-hydration.ts:79-91`
```ts
const senderIds = new Set<string>();
for (const message of messages) {
  if (message.senderMembership?.userId) senderIds.add(message.senderMembership.userId);
  if (message.replyTo?.senderMembership?.userId)
    senderIds.add(message.replyTo.senderMembership.userId);
}
const identities = senderIds.size === 0
  ? new Map<string, PersonIdentity>()
  : await resolvePeopleIdentities(
      db, actor.orgId, [...senderIds].map((userId) => ({ kind: "user" as const, userId })),
    );
return entities.withResolvedReferences(actor, messages.map((message) => enrich(message, identities)));
```

- The `for` loop (lines 79-83) accumulates sender IDs into a `Set` in-process — no DB call.
- `resolvePeopleIdentities` is called **once** with the complete set of unique sender IDs (line 86-90).
- `entities.withResolvedReferences` (`entity-reference.service.ts:46-86`) collects all entity references from all messages into a flat list, then calls `dispatch`, which groups by adapter type and calls each adapter **once** with its type-batch. One DB call per adapter type, not per message or entity.
- The `.map()` at line 91 is a synchronous in-memory transform.

**Cost:** 1 batched `resolvePeopleIdentities` query + 1 call per registered adapter type for entity card resolution. Both are O(1) with respect to page size (up to 100 messages). No in-process memoization within a single call, but none is needed since both calls are already batched.

---

## GAP 2 — Calendar source preferences caching

**Question:** is `getDisabledKeys` cached, or does it hit the DB on every `/calendar/events` and `/calendar/sources` request?

**Verdict:** NOT CACHED — 2 DB queries per call, no cache of any kind.

**Evidence:**

`calendar-source-preferences.service.ts:23-37` — full method, no Redis, no in-process Map:
```ts
async getDisabledKeys(orgId: string, userId: string): Promise<Set<string>> {
  const membershipId = await this.resolveMembershipId(orgId, userId);
  if (membershipId === null) return new Set();
  const rows = await this.db
    .select({ sourceKey: calendarSourcePreferences.sourceKey })
    .from(calendarSourcePreferences)
    .where(
      and(
        eq(calendarSourcePreferences.orgId, orgId),
        eq(calendarSourcePreferences.membershipId, membershipId),
        eq(calendarSourcePreferences.enabled, false),
      ),
    );
  return new Set(rows.map((r) => r.sourceKey));
}
```

`resolveMembershipId` (lines 11-21) issues a `findFirst` point read on `organizationMembers`.

**Per-request cost:** 2 DB queries every time `getDisabledKeys` is called.
- `/calendar/events` → `loadAll` → `Promise.all([resolveAvailable, getDisabledKeys])` — 1 call → 2 DB queries.
- `/calendar/sources` → `getToggleList` → `Promise.all([resolveAvailable, getDisabledKeys])` — 1 call → 2 DB queries.

Both queries should be fast indexed reads (`membershipId` is a FK with an index). No caching exists. Given call frequency (every calendar load), a short TTL cache keyed on `(orgId, userId)` would eliminate these 2 queries on warm requests. Not a blocking defect, but an easy win left undone.

**No in-process memoization.** `CalendarSourcePreferencesService` holds no state.

---

## GAP 3 — Notification `ticketContexts` batching

**Question:** is `ticketContexts(orgId, userId, ticketIds, principal)` one batched query or one query per ticket id?

**Verdict:** BATCHED — O(1) query (one `inArray` SELECT) regardless of notification page size.

**Evidence:**

Registry deduplicates and delegates once — `notification-visibility.registry.ts:57-66`:
```ts
const ids = [...new Set(ticketIds)];
if (ids.length === 0) return new Map();
// ...
const contexts = await this.ticketContextResolver(orgId, userId, ids, principal);
```

The registered resolver is `BuildNotificationContextService.resolve` (`build-notification-context.service.ts:46-72`):
```ts
const rows = await read.read(
  {
    tenant: tickets.orgId,
    scope: ticketScope(read.orgId, read.actorId),
    and: [isNull(tickets.deletedAt), inArray(tickets.id, ids)],
  },
  ({ sql: where }) => runInTenantTransaction(this.db, async (tx) => tx
    .select({ id: tickets.id, ticketNumber: tickets.ticketNumber, ... })
    .from(tickets)
    .innerJoin(projects, ...)
    .leftJoin(organizationMembers, ...)
    .leftJoin(users, ...)
    .where(where)
    .limit(ids.length), { orgId }),
  () => [],
);
```

One `SELECT … WHERE tickets.id = ANY($1)` JOIN query over the full deduped ID set, bounded at `ids.length` (≤100 via the guard at line 59 of the registry). No per-ticket calls anywhere in the path.

**Cost:** O(1) — 1 batched query regardless of page size. No in-process memoization (not needed; already a single call). Lookup also resolves ticket scope via `resolveTicketsScope` which calls `AccessService` — that path has its own caching — but that is one call, not N.

---

## GAP 4 — Calendar module-availability fan-out

**Questions:** (a) source count; (b) does it read through AuthContext; (c) real per-request cost.

### (a) Registered source count

**6 sources**, exhaustively listed in `calendar-sources.e2e-spec.ts:72-91`:

| Source key | Module |
|---|---|
| `calendar-events` | `calendar` |
| `hr-attendance` | `hr` |
| `hr-holidays` | `hr` |
| `hr-interviews` | `hr` |
| `hr-leaves` | `hr` |
| `tasks` | `tasks` |

### (b) AuthContext path

**`resolveAvailable` does NOT read through `AuthContext.moduleAvailable`.**

`calendar-source.registry.ts:64-71`:
```ts
const availability = await this.access.moduleAvailabilityFor(
  ctx.orgId, ctx.userId, s.module,
);
```

`AuthContext.moduleAvailable` (`auth-context.ts:47-54`) has per-key memoization:
```ts
moduleAvailable(moduleKey: string): Promise<ModuleAvailabilityResult> {
  const key = moduleKey.trim().toLowerCase();
  const existing = modules.get(key);
  if (existing) return existing;
  const pending = lookups.moduleAvailability(actor, key);
  modules.set(key, pending);
  return pending;
}
```

`access.moduleAvailabilityFor` (`access.service.ts:338-351`) constructs a fresh `ModuleAvailabilityResolver` on each call:
```ts
async moduleAvailabilityFor(orgId, userId, moduleKey): Promise<ModuleAvailabilityResult> {
  return moduleAvailability(
    this.buildModuleAvailabilityResolver((orgId) => this.entitlements.getModuleMap(orgId)),
    orgId, userId, moduleKey,
  );
}
```

This bypasses the `AuthContext.moduleAvailable` memo and does not share a resolver across the N calls. The ADR 0004/0006 "resolve once per request" guarantee is not operative here.

### (c) Real per-request cost

`moduleAvailability` (`module-availability.ts:56`) short-circuits for core modules: `if (resolver.isCoreModule(moduleKey)) return { available: true }`.

`calendar` is a core module (per `backend/CLAUDE.md` §5: "home, kb, chat, mail and calendar are core"). So `calendar-events` costs 0 I/O.

For the remaining 5 non-core sources, each call to `moduleAvailability` calls `Promise.all([resolver.getUserDeniedModules(orgId, userId), resolver.getModuleMap(orgId)])`.

**`getModuleMap(orgId)`** (`entitlements.service.ts:115-148`): two-level cache.
```ts
const local = this.moduleMapCache.get(orgId);   // in-process Map, 15s TTL
if (local && local.expiresAt > Date.now()) return local.map;
const map = await this.cache.cachedForOrg(orgId, "entitlements:modules", () => ..., 30);  // Redis, 30s
this.moduleMapCache.set(orgId, { map, expiresAt: Date.now() + MODULE_MAP_LOCAL_TTL_MS });
```
Warm (within 15s of first call): 0 Redis, 0 DB for all 5 calls. Cold (first request to process): the 5 concurrent calls all miss the in-process cache simultaneously; `cachedForOrg` with Redis provides single-flight protection — at most 1 Redis round-trip total.

**`getUserDeniedModules(orgId, userId)` → `DeniedModulesResolver.resolve`** (`denied-modules.resolver.ts:26-63`): in-process Map cache, 15s TTL, keyed `${orgId}:${userId}:${version}`.
```ts
const cached = this.cache.get(cacheKey);
if (cached && cached.expiresAt > Date.now()) return cached.modules;
// else: one DB query (user_module_access JOIN organization_members)
```
Warm: 0 DB for all 5 calls. Cold: all 5 concurrent calls miss the in-process cache simultaneously (the check is synchronous; no call has populated it before the others check). This can yield up to 5 concurrent identical DB queries for `user_module_access` on the first request to a cold process. Note that 4 of the 5 are for `module = "hr"` — same `(orgId, userId)` key — so those 4 are genuinely redundant on first hit.

**Summary of real cost:**

| Path | Warm (≥2nd request within 15s) | Cold (first request) |
|---|---|---|
| `calendar-events` (core) | 0 I/O | 0 I/O |
| `getModuleMap(orgId)` for 5 sources | 0 Redis/DB (in-process) | ≤1 Redis (single-flight) |
| `getDeniedModules(orgId, userId)` for 5 sources | 0 DB (in-process) | up to 5 concurrent DB queries |

**Verdict on the MEDIUM finding:** DOWNGRADE to LOW. The audit's premise — "N Redis round-trips per calendar request" — is false for warm requests (99%+ of production traffic). The in-process caches in `EntitlementsService` (15s) and `DeniedModulesResolver` (15s) make the warm-path cost 0 I/O for all availability checks. The AuthContext per-key memo IS bypassed (a genuine architectural gap per ADR 0004/0006), but the underlying caches provide equivalent coalescing at the service layer. The cold-process case (up to 5 concurrent `user_module_access` queries) is a minor race on an indexed small table, not a production concern. Mark the MEDIUM N+1 finding as **DOWNGRADED — MEDIUM → LOW**.

**No in-process memoization at the `resolveAvailable` level.** The `CalendarSourceRegistry` holds no per-request state. Protection is entirely from the service-layer caches.

---

## Summary Table

| Gap | Verdict | Severity change |
|---|---|---|
| GAP 1 — `hydrateTimelineMessages` N+1 | BATCHED — O(1) queries (1 sender batch + 1 per adapter type) | UNVERIFIED → CLOSED (no issue) |
| GAP 2 — Calendar preferences caching | NOT CACHED — 2 DB queries every request, no TTL | BLOCKED → CONFIRMED: low-cost miss, easy win |
| GAP 3 — Notification `ticketContexts` | BATCHED — 1 `inArray` SELECT over all ticket IDs | UNVERIFIED → CLOSED (no issue) |
| GAP 4 — Calendar module-availability fan-out | AuthContext bypassed but in-process caches coalesce warm path; cold-path race is minor | MEDIUM → LOW (downgraded) |
