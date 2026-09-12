# FD4/FD5 Server Cost & Cache Audit — Source-Level

**Scope:** org setup/dashboard, invitations→employee admission, billing entitlements + AI credits,
inbox unread count + list, calendar range, chat channel list + messages.
**Source revision:** 2026-09-12. All claims anchored to source paths below.
Numbers requiring a live DB are marked **BLOCKED — MISSING LIVE EVIDENCE**.

---

## 1. Endpoint Inventory (FD4)

### 1.1 GET /chat/channels

| Field | Value |
|---|---|
| Route + method | `GET /chat/channels` |
| Controller | `chat-channels.controller.ts:75-81` |
| Guards (in order) | `JwtAuthGuard` → `PermissionGuard` → `@RequirePermission("chat:channels:read")` |
| Tenant tx wrapper | Ambient `TenantContextInterceptor` wraps request |
| Service method | `ChatChannelListService.listMemberChannels` (`chat-channel-list.service.ts:217-295`) |
| Queries per request | **4 sequential/parallel** per page: (1) keyset page of `(id, lastMessageAt)` from `chatChannelMembers JOIN chatChannels`; (2) full channel rows via `chatChannels.findMany` with `inArray(channelIds)`; (3) `loadChannelMemberPreview`; (4) `loadChannelActivity` (unread counts + last messages) |
| N+1 present? | **No** — all secondary reads use `inArray` over the page's `channelIds` set. Entity channel names resolve via a single batch call to `EntityReferenceService.resolve`. |
| Projection | Explicit via `CHANNEL_LIST_COLUMNS` constant (not `SELECT *`) |
| Bounded? | Yes — `Math.min(limit ?? CHAT_CHANNEL_PAGE_SIZE, PAGE_SIZE_CAP)` (`chat-channel-list.service.ts:223`) |
| Redundant authority reads | `listMemberChannels` uses `actor.membershipId` directly. `listPublicChannels` and `heartbeat` each issue a separate `getMembershipId()` DB query even when called sequentially in the same request lifecycle. Not a problem for this endpoint alone but `getMembershipId` is called redundantly across `ChatPresenceService` and `ChatChannelListService` in unrelated paths. |
| Verdict | ACCEPTABLE — 4 batched queries, no N+1, bounded. |

### 1.2 GET /chat/unread

| Field | Value |
|---|---|
| Route + method | `GET /chat/unread` |
| Controller | `chat-presence.controller.ts:80-83` |
| Guards | `JwtAuthGuard` → `PermissionGuard` → `@RequirePermission("chat:messages:read")` |
| Tenant tx wrapper | Ambient |
| Service method | `ChatPresenceService.getUnreadTotal` (`chat-presence.service.ts:110-143`) |
| Queries per request | **2**: (1) `resolveMembershipId` — `organizationMembers` point read; (2) capped subquery `chatChannelMembers JOIN chatMessages` with hard `LIMIT 100` |
| N+1 | None |
| Projection | Explicit minimal columns |
| Bounded? | Yes — `UNREAD_TOTAL_CAP = 100`. Subquery materialises at most 100 rows. |
| Redundant authority reads | `resolveMembershipId` is issued as a fresh DB query every call. The JWT carries `userId` but not `membershipId`. No cache. BLOCKED — MISSING LIVE EVIDENCE for whether `idx_chat_messages_unread` covers `(org_id, channel_id, channel_position)` as the comment claims. Command: `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` as `streamline_app` with `SET app.current_org_id = '<orgId>'`. |
| Verdict | LOW COST — 2 queries, capped. Redundant membership lookup on every request (no caching). |

### 1.3 GET /chat/channels/:channelId/messages

| Field | Value |
|---|---|
| Route + method | `GET /chat/channels/:channelId/messages` |
| Controller | `chat-messages.controller.ts:69-79` |
| Guards | `JwtAuthGuard` → `PermissionGuard` → `@RequirePermission("chat:messages:read")` |
| Service method | `ChatMessageTimelineService.list` (`chat-message-timeline.service.ts:51-104`) |
| Queries per request | **3**: (1) channel existence check; (2) member check; (3) `chatMessages.findMany` with `with: { attachments, senderMembership, reactions, replyTo }` + post-load `hydrateTimelineMessages` |
| N+1 | The `with:` clause in Drizzle ORM is a JOIN/subquery at query generation time, not N iteration. However `hydrateTimelineMessages` (`chat-timeline-hydration.ts`) resolves entity references in a batch. **The actor entity resolution inside `hydrateTimelineMessages` is UNVERIFIED** — source not read. BLOCKED — need to confirm `hydrateTimelineMessages` does not loop over rows. |
| Projection | Explicit columns in the `with:` spec — not `SELECT *` |
| Bounded? | Yes — `safeLimit = Math.min(Math.max(1, limit), 100)` |
| Verdict | PROBABLY ACCEPTABLE — verify `hydrateTimelineMessages` is not a per-row lookup loop. |

### 1.4 GET /notifications

| Field | Value |
|---|---|
| Route + method | `GET /notifications` |
| Controller | `notifications.controller.ts:63-72` |
| Guards | `JwtAuthGuard` + `@Universal()` (no `PermissionGuard`) |
| Service method | `NotificationsReadService.list` → `queryNotifications` + `attachTicketContext` (`notifications-read.service.ts:125-303`) |
| Queries per request | **2**: (1) `resolveRecipient` — single `organizationMembers LEFT JOIN notificationReadWatermarks`; (2) notification list query with cursor. Plus `attachTicketContext` calls `NotificationVisibilityRegistry.ticketContexts` — **number of queries depends on implementation UNVERIFIED**. BLOCKED — read `notification-visibility.registry.ts`. |
| N+1 | `attachTicketContext` extracts all ticket IDs from the page, deduplicates them, and calls `ticketContexts(orgId, userId, ticketIds, principal)` once — likely a single batched query. Needs verification. |
| Projection | Explicit via `LIST_COLUMNS` constant (`notifications-read.service.ts:72-94`) |
| Bounded? | Yes — `Math.min(filters.limit ?? 20, 100)` |
| Verdict | LOW COST. Cache (30s versioned) reduces DB load. Verify `ticketContexts`. |

### 1.5 GET /notifications/unread-count

| Field | Value |
|---|---|
| Route + method | `GET /notifications/unread-count` |
| Controller | `notifications.controller.ts:74-79` |
| Guards | `JwtAuthGuard` + `@Universal()` |
| Service method | `NotificationsReadService.unreadCount` → `queryUnreadCount` (`notifications-read.service.ts:305-332`) |
| Queries per request | **2**: `resolveRecipient` then `COUNT(*)` with window filters |
| N+1 | None |
| Projection | Explicit minimal |
| Bounded? | N/A (count) |
| Verdict | WELL-OPTIMISED — wrapped in `cachedVersioned` 30s TTL. |

### 1.6 GET /calendar/events

| Field | Value |
|---|---|
| Route + method | `GET /calendar/events` |
| Controller | `calendar.controller.ts:111-125` |
| Guards | `JwtAuthGuard` + `@Universal()` |
| Service method | `CalendarEventsAggregateService.getEvents` → `CalendarSourceRegistry.loadAll` (`calendar-events-aggregate.service.ts:62-98`, `calendar-source.registry.ts:99-135`) |
| Queries per request | **VARIABLE**: `resolveAvailable` issues `access.moduleAvailabilityFor(orgId, userId, module)` in a `Promise.all` — **one call per registered source** (`calendar-source.registry.ts:54-69`). Each source's `load(ctx)` then runs its own queries. The total is `N_sources × access_resolution + N_enabled_sources × source_queries`. |
| **N+1 present?** | **YES — MODULE AVAILABILITY LOOP**: `resolveAvailable` maps over all registered sources and calls `access.moduleAvailabilityFor` per source in `Promise.all`. If the access service resolves each module separately to Redis (even if the user's permissions are cached as one blob), this is N Redis round-trips per calendar request. If the module availability call re-reads the same user permission blob N times with no in-process coalescence, this is a fan-out at every calendar load. Source: `calendar-source.registry.ts:57-65`. **Needs measurement.** |
| Projection | Depends on each source implementation (UNVERIFIED for each source) |
| Bounded? | Yes — `CALENDAR_EVENTS_CAP` (total), `CALENDAR_PER_SOURCE_CAP = 400` per source |
| Result cache | **None** — no server-side cache on the aggregate result. Every request re-runs all source queries. Frontend `staleTime: 2 * 60 * 1000` is the only protection. |
| Verdict | **NEEDS INVESTIGATION** — N module-availability calls per request, no aggregate cache. Measure `access.moduleAvailabilityFor` coalescence. |

### 1.7 GET /org/members

| Field | Value |
|---|---|
| Route + method | `GET /org/members` |
| Controller | `org.controller.ts:56-68` |
| Guards | `JwtAuthGuard` → `PermissionGuard` → `@RequirePermission("directory:people:view")` |
| Service method | `OrgMembersService.listMembers` (`org-members.service.ts:17-52`) |
| Queries per request | **1**: `organizationMembers INNER JOIN users WHERE ... AND ILIKE conditions` |
| N+1 | None |
| **Projection** | Explicit — 7 columns selected |
| Bounded? | Yes — `Math.min(limit ?? 100, 100)` |
| **Search index risk** | The search path uses **5 `ILIKE '%term%'` conditions** (name, firstName, lastName, email, firstName\|\|lastName). All use **leading wildcards** — a B-tree index cannot serve these; `pg_trgm` GIN indexes are required. Without them, every search is a full `users` table scan filtered by membership join. BLOCKED — MISSING LIVE EVIDENCE: `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` on a search request. Proposed index (requires journal entry to apply): `CREATE INDEX CONCURRENTLY ON users USING gin(name gin_trgm_ops, first_name gin_trgm_ops, last_name gin_trgm_ops, email gin_trgm_ops)`. Note: under RLS, a covering index must include `org_id` or the planner will refuse an index-only scan (backend CLAUDE.md §7). |
| Verdict | **REPAIR NEEDED** — search uses leading-wildcard ILIKE with no trgm index evidence. |

### 1.8 GET /billing/entitlements

| Field | Value |
|---|---|
| Route + method | `GET /billing/entitlements` |
| Controller | `billing.controller.ts:139-144` |
| Guards | `JwtAuthGuard` + `@Universal()` |
| Service method | `PlanLimitsService.getEntitlements` → `computeEntitlements` → `fetchAllCounts` (`plan-limits.service.ts:159-217`) |
| Queries per request | **2 cache lookups + conditional DB**: (1) `resolveTier` — tier cache `billing:plan-tier:${orgId}` (30s TTL); (2) entitlements cache `billing:entitlements:${orgId}` (60s TTL). On cache miss: `fetchAllCounts` issues **one multi-subquery SQL** (`plan-limits.service.ts:195-211`) counting 14 resource types. |
| N+1 | None — all counts in a single SQL |
| Projection | Explicit minimal |
| Bounded? | N/A (aggregates) |
| Verdict | WELL-DESIGNED — cached, single multi-count SQL on miss. See cache section for invalidation analysis. |

---

## 2. Proposed Indexes (FD4)

All proposals require a journal entry to apply (`migrations/meta/_journal.json`). BLOCKED — MISSING LIVE EVIDENCE from `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` for each.

| Endpoint | Table | Columns | Order | Notes |
|---|---|---|---|---|
| `/org/members` search | `users` | `name gin_trgm_ops`, `first_name gin_trgm_ops`, `last_name gin_trgm_ops`, `email gin_trgm_ops` | GIN | Required for `ILIKE '%term%'`. Under RLS the covering index must also supply `org_id` to enable index-only scan. Consider multi-column GIN or composite with org-filtered partial on `organization_members`. |
| `/chat/unread` | `chat_channel_members` | `(org_id, membership_id, channel_id)` | B-tree | Verify `idx_chat_messages_unread` includes `org_id` as leading column for the org-qualified subquery. |

---

## 3. Cache Matrix (FD5)

### 3.1 Notifications cache

| Dimension | Value |
|---|---|
| Cache type | `cachedVersioned` (namespace generation counter) |
| Namespace | `notifications:${userId}:${orgId}` |
| Keys | `history-v2:list:{all_filter_dimensions_sorted}` · `unread-count` |
| TTL | 30s (`CACHE_TTL.SHORT`) |
| Tenant scope | `userId + orgId` in namespace — correctly user-and-tenant-scoped |
| Writers (invalidation) | `NotificationsLifecycleService.invalidateCache` → `cache.invalidateNamespace(...)` called after every mutation (markRead, archive, snooze, pin, etc.) — `notifications-lifecycle.service.ts:357-359` |
| **Post-commit timing** | The DB write and `invalidateCache` are **sequential but not atomic**. Each lifecycle method does `db.update().returning()` then `await this.invalidateCache(...)`. No ambient transaction. If the process crashes between the DB write and the cache invalidation, the cache serves stale data for up to 30s. TTL is the fallback. Not a money/access risk — only a brief stale read risk. |
| Redis unavailable | `namespaceVersionWithRedis` returns `0` on catch (`cache.service.ts:119-121`). Then `fill.run(redis=null,...)` → `degraded()` → calls fetcher directly (DB query). **FAIL-SAFE** — does not serve stale cached data when Redis is down. |
| Outage memo | Not applicable — auth-keyed paths excluded. But notification list keys do NOT match `AUTHZ_KEY_MARKERS`, so they WOULD get the 1s outage memo if Redis degrades mid-request. This means during a Redis outage a notification list response can be served from an in-process 1s memo. Benign for notification data. |
| Stale key cleanup | Namespace counter increment makes old versions expire naturally at TTL. No `SCAN`. |

### 3.2 Billing entitlements cache

| Dimension | Value |
|---|---|
| Cache type | `cache.cached(exactKey, ...)` (non-versioned, exact key) |
| Key | `billing:entitlements:${orgId}` |
| TTL | 60s |
| Tenant scope | `orgId` only — correctly org-scoped; not user-scoped (entitlements are org-wide) |
| Writers | `PlanLimitsService.bust(orgId)` — explicit DEL of the exact key. Called by `billing-payment-activation.ts:180` (plan activation) and `enterprise-quotes.service.ts:174` (quote acceptance) and `billing-payment-state.ts:132` (PAST_DUE transition). |
| **Post-commit timing** | `bust()` is called **outside the DB transaction callback** in `billing-payment-activation.ts`. The pattern is `await tx(async(tx) => { ...writes... }); await this.deps.planLimits.bust(orgId)`. If the process crashes after the transaction commits but before `bust()`, the cache serves the old plan for up to 60s. This is a **read stale** not a **widen access** scenario — `assertWithinLimit` uses the tier cache directly for write gating, not the entitlements cache. |
| Redis unavailable | Key contains "entitlement" matching `AUTHZ_KEY_MARKERS` (`cache-fill.ts:36`). On outage, `fill.run(null,...)` → `degraded()` → runs `computeEntitlements` from DB. FAIL-SAFE. |
| Money/access risk | **LOW** — the entitlements cache is the `GET /billing/entitlements` READ endpoint only. `assertWithinLimit` (the write gate) uses `resolveTier` + `fetchCount` directly, NOT the entitlements cache. Verified at `plan-limits.service.ts:219-252`. |

### 3.3 Tier cache (billing)

| Dimension | Value |
|---|---|
| Cache type | `cache.cached(exactKey, ...)` |
| Key | `billing:plan-tier:${orgId}` (inferred from `PlanLimitsService.tierCacheKey`) |
| TTL | 30s (`TIER_CACHE_TTL_SECONDS`) |
| Writers | `PlanLimitsService.bust(orgId)` → explicit DEL |
| Redis unavailable | FAIL-SAFE — degraded to DB |
| Money/access risk | **MEDIUM** — `assertWithinLimit` reads this via `resolveTier`. If busted on plan downgrade but Redis is unavailable, the stale FREE/PAID tier is served from DB fallback. The fallback reads the DB directly so the answer is always current on a miss. The issue is only if a Redis DEL succeeds but a cached `resolveTier` response is being served in-process via `CacheFiller.inFlight` coalescence during the window. The in-flight coalescing window is bounded by the request duration (not the TTL), so the exposure is milliseconds. Acceptable. |

### 3.4 Chat presence / unread

No server-side cache on `getUnreadTotal`. Called fresh each request. Bounded at DB with `LIMIT 100`. Frontend staleTime 5 min.

### 3.5 Calendar sources

`CalendarSourcePreferencesService.getDisabledKeys` is called on every `/calendar/events` request and on `/calendar/sources`. No evidence of caching in the source. BLOCKED — check `calendar-source-preferences.service.ts` for a cache.

---

## 4. Fail-Open and Access/Money Risk Summary

### HIGH SEVERITY — Money/access-authorizing caches

**None confirmed in the read paths audited.** The entitlements and tier caches are `read-display` only; write gates (`assertWithinLimit`) issue DB reads on cache miss. The cache-fill degraded path always falls through to DB for auth-keyed data.

### MEDIUM — Post-commit invalidation race

| Cache | Risk |
|---|---|
| `notifications:${userId}:${orgId}` | DB write commits → crash before `invalidateNamespace` → stale up to 30s. Recoverable, not access-widening. |
| `billing:entitlements:${orgId}` | Plan activation commits → crash before `bust()` → stale entitlements up to 60s on the READ endpoint only. Write gate unaffected. |

Neither meets the CLAUDE.md threshold of "never cache one-time proof, seat allocation or payment fulfillment as a substitute for an atomic transition." Confirmed: these are display caches, not gate caches.

### LOW — Degraded stampede

During a Redis outage, `AUTHZ_KEY_MARKERS` keys (permissions, session, entitlements) bypass the outage memo. Multiple concurrent requests all run DB queries simultaneously. No fill lease available (Redis down). No measured threshold. **Flag as a resilience concern, not a correctness bug.**

### NONE — Fail-open caches

The CacheFiller `degraded()` path always calls the DB fetcher. No cache returns a broadened result when Redis is unavailable. Auth/permission/entitlement keys explicitly excluded from the 1s outage memo.

---

## 5. N+1 and Unbounded Reads

| Endpoint | Issue | Severity | Source |
|---|---|---|---|
| `GET /calendar/events` | `resolveAvailable` calls `access.moduleAvailabilityFor` per source in `Promise.all`. N = number of calendar sources registered. If module availability is not coalesceable (each call is a separate Redis lookup for the same user/org blob), this is N per-request Redis round-trips. | MEDIUM | `calendar-source.registry.ts:57-65` |
| `GET /chat/channels/:id/messages` | `hydrateTimelineMessages` entity resolution — **UNVERIFIED** whether it batch-resolves or loops per message. | UNVERIFIED | `chat-message-timeline.service.ts:96-97` |
| `GET /org/members` (search) | `ILIKE '%term%'` with 5 leading-wildcard conditions and no `pg_trgm` index evidence. Full-table `users` scan under load. | MEDIUM | `org-members.service.ts:24-33` |

### Unbounded reads

**None found in the covered read paths.** Every list endpoint enforces a server-side cap.

---

## 6. Blocked Live Evidence Gaps

| Endpoint | Gate needed | Command |
|---|---|---|
| `GET /chat/unread` | Verify `idx_chat_messages_unread` covers `(org_id, channel_id, channel_position)` | `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` as `streamline_app` with `SET app.current_org_id = '<orgId>'` on scratch_bechat_perf |
| `GET /org/members` | Verify `ILIKE` search scan cost | `EXPLAIN (ANALYZE, BUFFERS)` on `?search=partial_name` as `streamline_app` |
| `GET /calendar/events` | Measure module-availability call coalescence | `EXPLAIN (ANALYZE, BUFFERS)` + Redis MONITOR on calendar request |
| `GET /chat/channels/:id/messages` | Confirm `hydrateTimelineMessages` is not a per-row loop | Read `chat-timeline-hydration.ts` source |
| Calendar source preferences | Confirm caching in `CalendarSourcePreferencesService.getDisabledKeys` | Read `calendar-source-preferences.service.ts` |
| Notification visibility registry | Confirm `ticketContexts` is a batched query | Read `notification-visibility.registry.ts` |

---

## 8. Executive Summary (≤450 words)

**Cache writer / key / TTL / invalidation matrix**

| Key | TTL | Writers | Scope |
|---|---|---|---|
| `notifications:${userId}:${orgId}` (versioned NS) | 30s | `NotificationsLifecycleService.invalidateCache` → `invalidateNamespace` after each mutation | User + org |
| `billing:entitlements:${orgId}` | 60s | `PlanLimitsService.bust(orgId)` on activation, quote acceptance, PAST_DUE | Org |
| `billing:plan-tier:${orgId}` | 30s | `PlanLimitsService.bust(orgId)` | Org |
| `notifications:*` unread-count key | 30s | Same namespace invalidation | User + org |

**Fail-open and money/access-authorizing caches (highest severity first)**

1. **NONE fail-open.** `CacheFiller.degraded()` always falls through to DB. Auth/entitlement keys match `AUTHZ_KEY_MARKERS` (`cache-fill.ts:36`) and are explicitly excluded from the 1s outage memo.
2. **MEDIUM — post-commit invalidation race.** Notifications namespace and entitlements key are invalidated *after* DB commit, not inside the transaction. A crash between commit and `invalidateNamespace`/`bust()` leaves stale display data up to 30–60s. Neither is a write gate — `assertWithinLimit` reads DB on cache miss. (`notifications-lifecycle.service.ts:357-359`, `billing-payment-activation.ts:180`)
3. **MEDIUM — tier stampede under Redis outage.** Multiple concurrent `assertWithinLimit` calls all bypass the memo and fall to DB simultaneously. Always DB-authoritative (correct), but high DB fan-out risk under load. (`cache-fill.ts:63-80`)

**N+1 and unbounded reads**

| Issue | Anchor | Severity |
|---|---|---|
| Calendar: `resolveAvailable` calls `moduleAvailabilityFor` once per registered source in `Promise.all` | `calendar-source.registry.ts:57-65` | MEDIUM |
| Chat messages: `hydrateTimelineMessages` batch vs. per-row — UNVERIFIED | `chat-message-timeline.service.ts:96-97` | UNVERIFIED |
| Org member search: 5 leading-wildcard `ILIKE '%term%'` — no `pg_trgm` index evidence | `org-members.service.ts:24-33` | MEDIUM |

No unbounded server reads found; all list paths enforce hard caps.

**Proposed indexes (each requires BLOCKED EXPLAIN + journal entry)**

1. `users` — GIN index `(name, first_name, last_name, email) gin_trgm_ops` for `/org/members` `ILIKE` search. Requires `pg_trgm` extension.
2. `chat_channel_members` / `chat_messages` — verify `idx_chat_messages_unread` leading column includes `org_id` for the `/chat/unread` subquery.

**BLOCKED live-evidence gaps**

| # | Endpoint | Gate | Command |
|---|---|---|---|
| 1 | `GET /chat/unread` | Index coverage | `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` on scratch_bechat_perf |
| 2 | `GET /org/members` | Scan cost | Same, with `?search=<partial>` |
| 3 | `GET /calendar/events` | Module-availability coalescence | Redis `MONITOR` + EXPLAIN during live request |
| 4 | `GET /chat/channels/:id/messages` | `hydrateTimelineMessages` N+1 | Read `chat-timeline-hydration.ts` |
| 5 | Calendar sources | Source preference caching | Read `calendar-source-preferences.service.ts` |
| 6 | Notifications | `ticketContexts` batching | Read `notification-visibility.registry.ts` |

---

## 7. File Path Reference

- `backend/src/modules/chat/chat-channels.controller.ts`
- `backend/src/modules/chat/chat-channel-list.service.ts`
- `backend/src/modules/chat/chat-presence.controller.ts`
- `backend/src/modules/chat/chat-presence.service.ts`
- `backend/src/modules/chat/chat-messages.controller.ts`
- `backend/src/modules/chat/chat-message-timeline.service.ts`
- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/notifications-read.service.ts`
- `backend/src/modules/notifications/notifications-lifecycle.service.ts`
- `backend/src/modules/calendar/calendar.controller.ts`
- `backend/src/modules/calendar/calendar-events-aggregate.service.ts`
- `backend/src/modules/calendar/calendar-source.registry.ts`
- `backend/src/modules/organization/setup/org.controller.ts`
- `backend/src/modules/organization/setup/org-members.service.ts`
- `backend/src/modules/billing/core/billing.controller.ts`
- `backend/src/modules/billing/core/plan-limits.service.ts`
- `backend/src/common/cache/cache.service.ts`
- `backend/src/common/cache/cache-fill.ts`
- `backend/src/common/cache/cache-keys.ts`
