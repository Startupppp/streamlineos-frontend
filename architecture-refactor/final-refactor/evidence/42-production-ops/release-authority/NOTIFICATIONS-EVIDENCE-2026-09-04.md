# PRD-C132 — Notifications Verification Evidence
**Date:** 2026-09-04  
**Lane:** C (Parallel release-verification fan-out)  
**Scope:** provider-response schemas · tenant-fair delivery/backpressure · consent and suppression enforcement · durable retry/DLQ · offline/revocation UI · cross-tenant notification delivery E2E

---

## VERDICT: OPEN

**Single blocking sub-claim:** Cross-tenant notification delivery E2E — PRD-C127 records a live API test failure (`verify:chat-mentions` returns "Alex should receive exactly 1 mention, got 0" and "@everyone notified nobody — the send path never expands it"). That failure is unresolved at current HEAD per the PRD record, meaning end-to-end notification delivery cannot be re-verified as working.

All other sub-claims are VERIFIED in current source.

---

## Sub-claim Status Table

| Sub-claim | Status | File : line | Mechanism |
|---|---|---|---|
| Provider-response schemas | VERIFIED | `backend/src/modules/notifications/notification-delivery-worker.service.ts:314` | `providerSendResultSchema.safeParse(rawSendResult)`; invalid shape → logged + treated as retryable FAILED, not swallowed |
| Tenant-fair delivery/backpressure | VERIFIED | `notification-delivery-worker.service.ts:24,174` · `notification-outbox-relay.service.ts:30,67` | `forEachOrg` with `ORG_BATCH_CAP = 10` and in-process rotating cursor (`cursorOrgId`) prevents one tenant taking the whole tick budget |
| Consent enforcement (SMS/WhatsApp) | VERIFIED | `notification-routing-computation.ts:51,99–102` | `CONSENT_REQUIRED_CHANNELS = ["SMS", "WHATSAPP"]`; consent is the first gate — checked before quiet hours, mute, channel preference, and even mandatory routing; absent consent → `SUPPRESS(CONSENT_MISSING)` |
| Suppression enforcement | VERIFIED | `notification-routing-computation.ts:106–107` · `db/schema/common/notifications-delivery.ts:183–201` | `suppressedChannels.get(channel)` checked per channel; `notification_suppression_rules` table with composite FK and `idx_notification_suppression_lookup` |
| Durable retry / DLQ | VERIFIED | `db/schema/common/notifications-delivery.ts:246` · `notification-outbox-relay.service.ts:159–178` · `notification-delivery-worker.service.ts:360–396` | Outbox state machine `PENDING \| IN_FLIGHT \| PROCESSED \| DEAD` (4 states, not boolean); `processedAt` present; lease-based at-least-once; `MAX_ATTEMPTS = 5` then → DEAD; delivery worker: `maxAttempts` per delivery row, backoff with jitter, circuit breaker |
| Offline/revocation UI | VERIFIED | `frontend/features/notifications/inbox/notifications-inbox-page.tsx:100,182–187,238–243` · `frontend/app/(authenticated)/notifications/error.tsx:1` | `useOnlineStatus()` → offline warning banner; `isError` → `ErrorState` with retry; route-level `ReportingRouteErrorBoundary`; `apiClient` 401 → retry once + sign-out |
| Cross-tenant delivery E2E | STILL PENDING | PRD-C127 (open) | Live API test failure: chat mention delivery yields 0 recipients for both explicit mention and `@everyone`. Source code for mention resolution (`chat-mentions.ts:39–70`) and delivery (`chat-notifications.service.ts:109–165`) looks structurally correct but the gate-proven failure means this path cannot be declared working |

---

## Known Trap Verdicts

### Trap 1 — FK microsecond truncation (23503 on every delivery)

**Reported:** `notification_deliveries.notification_created_at` FK against `notifications.created_at` truncates microseconds from a JS `Date`, causing every insert to 23503.

**Current state:** FIXED — two independent fixes in place.

1. **Type match:** Migration `0426_notification_timestamptz.sql` converted all 39 timestamp columns across 13 notification tables from `timestamp without time zone` to `timestamp with time zone`. Both sides of the FK are now `timestamptz` (verified in `db/schema/common/notifications-delivery.ts:58` and `notifications.ts:41`).

2. **No JS Date in the FK path:** `notification-dispatch-persistence.service.ts:145–149` sets `notificationCreatedAt` via a SQL subquery:
   ```sql
   notificationCreatedAt: sql`(select created_at from notifications where id = ${notificationId})`
   ```
   The value is never passed through a JavaScript `Date` object. The same pattern is used for channel deliveries at line 167–170. JS `Date` has millisecond precision; a DB subquery preserves full microsecond precision and guarantees an exact FK match.

### Trap 2 — Event ledger defeats its own retry (boolean state, missing processedAt)

**Reported:** `notification_outbox` lacks a `processed_at` column and uses a boolean state, so retries cannot distinguish PENDING from DONE.

**Current state:** FIXED.

- `state` field: `text.$type<"PENDING" | "IN_FLIGHT" | "PROCESSED" | "DEAD">()` — 4 states, not boolean (`db/schema/common/notifications-delivery.ts:246`).
- `processedAt` column present at line 251.
- `leaseExpiresAt` enables lease-based reclaim: the relay claims with `state = 'PENDING' OR (state = 'IN_FLIGHT' AND lease_expires_at < now)` (`notification-outbox-relay.service.ts:101–104`).
- `markIntentProcessed` sets `{ state: "PROCESSED", processedAt: new Date() }` (`notification-dispatch.service.ts:157–163`).

### Trap 3 — After-commit hooks have no tenant context

**Reported:** `registerAfterCommit` hooks run after the request transaction commits; the ambient handle carries no tenant GUC, so every read/write dies with 42501.

**Current state:** FIXED on the notification dispatch path.

`notification-dispatch.service.ts:118–123` shows the after-commit hook:
```typescript
registerAfterCommit(async () => {
  await this.emitNow({ ...chunkInput, replayKey: dedupeKey });
  await this.markIntentProcessed(input.orgId, dedupeKey);
});
```

`emitNow` (line 167) calls `runInNewTenantTransaction(this.db, input.orgId, ...)` — opens its own tenant transaction with the correct GUC. `markIntentProcessed` (line 155) also calls `runInNewTenantTransaction`. Neither borrows the dead request handle. The comment at line 166 explicitly states why: "Cannot borrow the caller's transaction: by the time this runs it has often committed, and the released handle carries no tenant GUC."

### Trap 4 — RLS absent on notification tables (silent cross-tenant hole)

**Reported:** notification tables without RLS policies are readable org-wide.

**Current state:** VERIFIED — all notification tables have RLS.

Coverage path by table:
- `notifications` (parent + 50 monthly partitions): migration `0592_notifications_tenant_isolation.sql` — explicit `ENABLE ROW LEVEL SECURITY` + `tenant_isolation` policy on each partition.
- `notification_outbox`: migration `0419_notification_outbox.sql:64`.
- `notification_preference_rules`, `notification_consents`, `notification_consent_events`: migration `0422_preference_rules_and_consent.sql:45,92,122`.
- `notification_digest_items`, `notification_digest_runs`: migration `0429_digest_queue_broadcast_audience.sql:63,89`.
- `notification_deliveries`, `notification_queue`, `notification_events`, `notification_templates`, `notification_preferences`, `notification_policy_defaults`, `notification_provider_accounts`, `notification_suppression_rules`, `notification_audit_logs`: covered by migration `0378_rls_remaining_tenant_tables.sql` — a dynamic DO block that enables RLS on every `public` relation with a `text`-typed `org_id` column that does not already have RLS.

All delivery workers use `forEachOrg`/`withTenant`/`runInNewTenantTransaction` to set the GUC before touching these tables.

### Trap 5 — Alert predicate matches no emitted log line

**Current state:** No alert predicate was cited as evidence in this lane. The delivery worker uses `this.logger.error(...)` with string-interpolated messages, and `forEachOrg` logs and continues on transient errors — no regex-matched alert was presented as proof, so this trap does not apply here.

---

## Optimistic Mutation Rollback (Previously Verified)

The PRD text at line 569–571 records that 11 of 14 `useMutation` sites in `frontend/hooks/api/notifications-inbox.ts` pair `onMutate` with `onError` + `onSettled`. The two remaining (`useApproveNotification`, `useRejectNotification`) carry no optimistic state and correctly only invalidate in `onSettled`. This was audited by ticket 40 (2026-09-03) and was the trigger for the `onError` checkbox above C132 being checked. This lane confirms the file structure and hook architecture in `notifications-inbox.ts` is consistent with that finding.

---

## Files Examined

| File | Purpose |
|---|---|
| `backend/src/db/schema/common/notifications-delivery.ts` | All delivery-side schema: outbox, deliveries, queue, consents, suppression, preference rules, digest |
| `backend/src/db/schema/common/notifications.ts` | Notification inbox schema, templates, audit logs, preferences |
| `backend/src/modules/notifications/notification-dispatch-persistence.service.ts` | FK subquery pattern (microsecond fix) |
| `backend/src/modules/notifications/notification-dispatch.service.ts` | After-commit tenant context fix, outbox-first emission |
| `backend/src/modules/notifications/notification-delivery-worker.service.ts` | Provider response schema validation, retry/DLQ, tenant-fair backpressure |
| `backend/src/modules/notifications/notification-outbox-relay.service.ts` | Outbox relay: 4-state machine, tenant-fair backpressure |
| `backend/src/modules/notifications/notification-routing-computation.ts` | Consent gate, suppression gate |
| `backend/src/modules/notifications/notification-routing.service.ts` | Routing orchestration, consent lookup |
| `backend/src/modules/notifications/dto/provider-result.schemas.ts` | `providerSendResultSchema` |
| `backend/migrations/0426_notification_timestamptz.sql` | Timestamp type fix |
| `backend/migrations/0592_notifications_tenant_isolation.sql` | RLS on notifications + all 50 partitions |
| `backend/migrations/0378_rls_remaining_tenant_tables.sql` | Bulk RLS for notification_deliveries, notification_queue, etc. |
| `backend/migrations/0419_notification_outbox.sql` | RLS on notification_outbox |
| `backend/migrations/0422_preference_rules_and_consent.sql` | RLS on consents and preference rules |
| `backend/src/modules/chat/chat-mentions.ts` | Mention resolution logic |
| `backend/src/modules/chat/chat-notifications.service.ts` | Chat mention delivery via Ably |
| `backend/src/modules/chat/chat-message-fanout.service.ts` | Fanout dispatch path |
| `frontend/features/notifications/inbox/notifications-inbox-page.tsx` | Offline/revocation UI |
| `frontend/app/(authenticated)/notifications/error.tsx` | Route-level error boundary |
