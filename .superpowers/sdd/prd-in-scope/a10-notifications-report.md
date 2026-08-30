# A10 — Notifications Completion Gate Report

## Handlers missing `@UseGuards(...PermissionGuard)`: **0**

Every administration controller is correctly structured. Audit:

| Controller | Class-level guard | Handler-level |
|---|---|---|
| `notifications.controller.ts` | `@UseGuards(JwtAuthGuard)` | All handlers `@Universal()` or `@Public()` — correct |
| `notification-providers.controller.ts` | `@UseGuards(JwtAuthGuard, PermissionGuard)` | All handlers `@RequirePermission` — correct |
| `notification-templates.controller.ts` | `@UseGuards(JwtAuthGuard, PermissionGuard)` | All handlers `@RequirePermission` — correct |
| `broadcasts.controller.ts` | `@UseGuards(JwtAuthGuard)` | Admin handlers carry handler-level `@UseGuards(PermissionGuard)` + `@RequirePermission`; inbox/dismiss are `@Universal()` — correct |
| `notification-events.controller.ts` | `@UseGuards(JwtAuthGuard, PermissionGuard)` | All handlers `@RequirePermission` — correct |
| `notification-policy.controller.ts` | `@UseGuards(JwtAuthGuard, PermissionGuard)` | All handlers `@RequirePermission` — correct |
| `notification-preferences.controller.ts` | `@UseGuards(JwtAuthGuard)` | All handlers `@Universal()` — correct |
| `push.controller.ts` | `@UseGuards(JwtAuthGuard)` | `@Public()` vapid key, `@Universal()` subscribe/unsubscribe — correct |
| `webhooks.controller.ts` | `@UseGuards(JwtAuthGuard)` | All admin handlers carry handler-level `@UseGuards(PermissionGuard)` + `@RequirePermission("settings:webhooks:manage")` — correct |

## Cohesive Exception Judgement: `notification-events.catalog.ts` (1,054 lines)

**EXCEPTION GRANTED — do not split.**

The file contains only `notificationEvent()` data calls organized by domain (18 domains inline, 2 already extracted to sub-catalogs: chat + build). There is no delivery logic, policy logic, routing, or behavior mixed in. This is identical in character to the permission catalog exception explicitly called out in CLAUDE.md §7. Splitting into 18 files of ~55 lines each offers no cohesion gain.

Registered in: `backend/src/modules/notifications/notification-catalog-cohesive-exception.ts`

## Before/After Line Counts

| File | Before | After | Notes |
|---|---|---|---|
| `notification-events.catalog.ts` | 1,054 | 1,054 | Cohesive exception — not split |
| `notification-dispatch.service.ts` | 509 | 474 | Extracted 2 pure helpers to `notification-dispatch-keys.ts`; removed unused `CacheService`, `CACHE_TTL`, `NOTIF_CACHE`, `notificationTemplates` imports |
| `notification-dispatch-keys.ts` | — | 21 | NEW: `buildNotifOutboxDedupeKey`, `buildNotifIdempotencyKey` |
| `broadcasts.service.ts` | 527 | 413 | Extracted `resolveRecipients` + `replaceAudienceTargets` to `broadcasts-audience.queries.ts` |
| `broadcasts-audience.queries.ts` | — | 126 | NEW: `resolveBroadcastRecipients`, `replaceBroadcastAudienceTargets` |
| `notification-event.service.ts` | 64 | 103 | Added heartbeat (15s interval), close-signal mechanism, `onModuleDestroy` |
| `notification-catalog-cohesive-exception.ts` | — | 12 | NEW: cohesive-exception register |
| `notification-caller-inventory.ts` | 171 | 182 | Added missing `org-membership-access-revocation.ts` entry |

## Stream-Adapter Contract (for the frontend lane)

The backend provides:

**Token acquisition (POST /notifications/events/token)**
- Authenticated `@Universal()` endpoint — call with the session JWT in `Authorization: Bearer`.
- Returns `{ token: string }` — UUID, single-use, valid for 120 seconds.
- Token is opaque (not a JWT). It is never stored after consumption.

**Stream connection (GET /notifications/events?token=\<token\>)**
- `@Public()` SSE endpoint. Pass the token as query param OR `Authorization: Bearer <token>`.
- Token is consumed immediately on connect. A second use of the same token returns 401.
- On success the server pushes `MessageEvent` objects with `type` in `{ heartbeat | NOTIFICATION_CREATED | NOTIFICATION_READ | FORCE_CLOSE }`.

**Event types the server emits:**
- `type: "heartbeat"`, `data: ""` — emitted every 15 seconds. Client must treat this as a keep-alive, not an error.
- `type: "NOTIFICATION_CREATED"`, `data: JSON({ type, notification })` — new in-app notification.
- `type: "NOTIFICATION_READ"` — notification marked read.
- `type: "FORCE_CLOSE"` — server is requesting the client to close this stream (logout or org-switch). Client MUST close the connection. After `reason: "logout"` do NOT reconnect. After `reason: "org_switch"` acquire a new token for the new org and reconnect.

**Frontend responsibilities (the contract):**
- After 3 consecutive connection failures (with jitter: first retry 1-2s, second 2-4s, third 4-8s), back off to 60s.
- After 10 failed reconnects, stop entirely and prompt the user.
- On receiving `heartbeat` with `data: ""`, reset the dead-connection timer (suggest 30s timeout).
- On JWT expiry: acquire a new session, then call `POST /notifications/events/token` again with the new JWT.
- On logout: close the stream immediately; do not reconnect.
- On org-switch: close the current stream; call `closeStream` on the backend (backend also provides `NotificationEventService.closeStream(userId, orgId)` to force-close all tabs for a user on the server side). Acquire a new token for the new org and reconnect.
- **Never pass the raw session JWT** as the stream token — they are different credentials with different scopes and lifetimes.

## Alert Predicate Proof

All three alert scripts query real schema columns. Predicates verified against schema and service code:

**`alert:queue-age`** (`alert-queue-age.mjs`)
- Queries `outbox_events.delivery_state IN ('PENDING', 'IN_FLIGHT')`.
- Schema (`outbox.ts` line 14-20): `outboxDeliveryStateEnum` includes `PENDING` and `IN_FLIGHT`. ✅
- Self-test builds fixtures with the correct field names (`oldest_queued_at`, `total_retries`). ✅
- Service (`notification-outbox-relay.service.ts`): writes `state: "IN_FLIGHT"` and resets to `state: "PENDING"`. Column name in ORM is `deliveryState` → `delivery_state`. ✅

**`alert:dead-outbox`** (`alert-dead-outbox.mjs`)
- Queries `outbox_events.delivery_state = 'DEAD'` and `dead_lettered_at`.
- Schema: `DEAD` is in the enum; `dead_lettered_at` is a column (`deadLetteredAt`). ✅
- Service: writes `state: "DEAD"` with `deadLetteredAt`. ✅
- Self-test filters fixtures using the same `dead_lettered_at` field that the query uses. ✅

**`alert:dead-delivery`** (`alert-dead-delivery.mjs`)
- Queries `notification_deliveries.status = 'DEAD'` and `failed_at`.
- Schema (`enums.ts` line 93-95): `notificationDeliveryStatusEnum` includes `DEAD`; `notifications-delivery.ts` line 65: `status` column, line 74: `failed_at` column. ✅
- Service (`notification-delivery-worker.service.ts` line 405): writes `status: "DEAD", failedAt: now`. ✅
- Self-test uses the same field name `failed_at`. ✅
- NOTE: The alert intentionally over-reports (it alerts on ALL dead deliveries, not only mandatory ones) because `mandatory` is a TypeScript catalog property not stored on the delivery row. This is documented in the script. A future improvement is to persist `mandatory` on delivery rows at dispatch time.

**NO alert with a predicate matching a string that no log line ever emits was found.** All three scripts query database states, not log strings.

## Premise Verdicts

| Claim | Status | Evidence |
|---|---|---|
| "catalog is ~1,027 lines" | VERIFIED (1,054) | `wc -l` |
| "`PermissionGuard` is NOT global" | VERIFIED | `backend/CLAUDE.md §4` + module scan |
| "personal inbox stays universal" | VERIFIED | `@Universal()` on all inbox handlers |
| "frontend permissions may be missing" | FALSE | frontend catalog has all 10 keys, backend/frontend both at 690 keys |
| "billing-webhook.spec.ts was passing" | UNVERIFIED (pre-existing failure) | `BillingProfileService` missing from `RootTestModule` — billing module, outside my ownership |

## Frontend Permission Keys I Must Add

**None.** Backend and frontend permission catalogs are in sync. All `notifications:*` keys exist verbatim in `frontend/lib/rbac/permissions/notifications.ts` and in `permission-key-business.ts`:

- `notifications:events:view` / `notifications:events:manage`
- `notifications:providers:view` / `notifications:providers:manage`
- `notifications:policy:view` / `notifications:policy:manage`
- `notifications:templates:view` / `notifications:templates:manage`
- `notifications:broadcasts:view` / `notifications:broadcasts:manage`

## Required SQL Migrations

**None.** All changes are TypeScript-only. No schema additions.

## Validation Output (verbatim)

```
pnpm typecheck:
  (no output — clean)

pnpm check:route-classification:
  Total handlers : 3533
  public         : 208
  universal      : 95
  permissioned   : 3183
  in-service     : 47
  UNDECLARED     : 0
  RESULT: ALL ROUTES CLASSIFIED

pnpm check:permission-keys:
  Scanned  3094 @RequirePermission usages  (621 unique keys)
  Backend catalog   690 keys
  Frontend PermissionKey union  690 keys
  OK — every @RequirePermission key resolves and exists in both catalogs.

pnpm check:log-secrets:
  Scanned    2675 source files
  TIERS map  73 entries
  OK — no plaintext secret logging found and all @UseRateLimit keys are in TIERS.

Jest (notification|push|webhook):
  Test Suites: 1 failed (billing-webhook.spec.ts — pre-existing, outside ownership), 29 passed, 30 total
  Tests:       32 failed (all in billing-webhook.spec.ts), 234 passed, 266 total
  Note: notification-delivery-class.spec.ts now PASSES (was failing before; fixed by adding
        org-membership-access-revocation.ts to DIRECT_EMAIL_CALLER_INVENTORY)
```
