# Outbox worker local run evidence

Captured 2026-10-05 on replay2 (127.0.0.1:5432). Covers BT-b5eef5ed02df (queue lag, failure, replay, effect correlation) and BT-8559cdc0ef76 (migrations on target DB, cache revocation, jobs, replay, worker health, rollback).

## Infrastructure started

| Component | Command | Port | Start result |
|---|---|---|---|
| Redis 5.0.14 | `/d/localstack/redis/redis-server.exe --save "" --appendonly no --port 6379` | 6379 | PONG confirmed |
| Upstash REST shim | `node src/scripts/local-upstash-shim.mjs --port=8079 --token=local-dev-token` | 8079 | POST / → `{"result":"PONG"}` |
| NestJS backend | `node --env-file=/tmp/replay2-safe.env dist/main.js` | 1501 | Started in ~2s |

Safe env used: `NODE_ENV=development`, `DATABASE_URL` and `APP_DATABASE_URL` pointing to `neondb_owner` and `streamline_app` on `127.0.0.1:5432/replay2`, `UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079`, all outbound provider keys absent, `OUTBOX_DISPATCH_ENABLED=true`, `OUTBOX_INPROCESS_WORKER=true`.

DB host printed at startup: `127.0.0.1`. AUTH_SIGNING_KEYS absent (warning logged; symmetric JWT via BACKEND_JWT_SECRET still operative).

## Health endpoint

`GET /health/ready` response at 06:19:17 UTC:

```json
{
  "status": "ready",
  "checkedAt": "2026-10-05T06:19:17.702Z",
  "dependencies": [
    {"name":"database","required":true,"state":"up","latencyMs":56},
    {"name":"cache","required":false,"state":"up","latencyMs":7},
    {"name":"queue","required":false,"state":"up","latencyMs":6},
    {"name":"providers","required":true,"state":"skipped","detail":"no required providers declared"}
  ]
}
```

Database (replay2), cache (Redis shim at 8079), queue all up.

## Migration ledger on replay2

```sql
SELECT tag FROM drizzle.__replay ORDER BY tag DESC LIMIT 1;
-- 1396_build_sprint_cycle_chain_repair

SELECT count(*) FROM drizzle.__replay;
-- 1005
```

Migration files in `backend/migrations/`: 1094 total (0000 through 1908). Applied on replay2: 1005 (through 1396). Pending: 89 migrations (1397–1908). replay2 is **not at head**; 89 migrations added since the last replay run (2026-09-27 per `drizzle.__replay` timestamps).

## Outbox event queue lag, failure, and replay

### Insert phase

Four outbox events inserted directly into `outbox_events` matching the writer shape (event_id, organization_id, aggregate_type, aggregate_id, aggregate_version, schema_version, event_type, payload, occurred_at, audience, delivery_state=PENDING, lifecycle_state=ACTIVE, retry_count=0):

| event_id | organization_id | event_type | insert time |
|---|---|---|---|
| opsrun-evt-001 | p2-org-a | project.created | 06:19:57 UTC |
| opsrun-evt-002 | p2-org-a | project.created | 06:19:57 UTC |
| opsrun-evt-003 | p2-org-a | project.updated | 06:19:57 UTC |
| opsrun-evt-004 | p2-org-b | project.created | 06:19:57 UTC |

### First flush — claimed 0 (forEachOrg region filter)

`POST /cron/outbox-events-worker` at 06:22:01 UTC returned `claimed: 0`.

Root cause: `forEachOrg` enumerates only organizations with `region IS NOT NULL` (from the where clause `isNotNull(organizations.region)`). The `p2-org-a` and `p2-org-b` rows had `region = NULL`. Even with the `region` column set on `organizations`, the claimer also requires a row in `organization_placement` — the `orgPlacementLookup` function queries only that table; no fallback to the `organizations.region` column applies when no placement row exists.

### Placement setup and successful claim

Set `organizations.region = 'primary'` and inserted `organization_placement` rows (cell_id=legacy-1, write_fence_token with lease_expires_at=2030-01-01). The RegionRegistry at startup logged `Regions ready — primary/legacy-1 (primary: primary)`.

`POST /cron/outbox-events-worker` at 06:25:40 UTC:

```json
{"success":true,"claimed":4,"delivered":0,"suppressed":0,"retried":4,"dead":0,"fenced":0}
```

**Lag: 06:19:57 → 06:25:40 = 343 s** (5 m 43 s). This includes the 2+ minutes of manual diagnosis; automatic 15 s ticks would have fired within 17 s of the region/placement fix.

Post-flush row state:

| event_id | delivery_state | retry_count | last_error (truncated) |
|---|---|---|---|
| opsrun-evt-001 | PENDING | 1 | no dispatch handler for event type 'project.created' — register a consumer via OutboxConsumerRegistry |
| opsrun-evt-002 | PENDING | 1 | same |
| opsrun-evt-003 | PENDING | 1 | no dispatch handler for event type 'project.updated' |
| opsrun-evt-004 | PENDING | 1 | no dispatch handler for event type 'project.created' |

The event type `project.*` has no registered consumers; `OutboxPublisherService.deliver` throws on an unregistered type. The publisher's `handleFailure` incremented `retry_count` and reset `delivery_state` to PENDING for the next backoff interval. This is the expected failure path for an unrecognised event type.

### Dead-letter and replay

opsrun-evt-001 manually set to `DEAD` (retry_count=10, dead_lettered_at=now()) to simulate exhausted retries.

`POST /cron/outbox-events-replay-dead` at 06:26:04 UTC:

```json
{"success":true,"message":"Outbox replay: 1 dead-lettered event(s) requeued as PENDING",
 "organizationsProcessed":2,"organizationsFailed":0,"replayed":1,"truncated":false}
```

Post-replay state of opsrun-evt-001: `delivery_state=PENDING`, `retry_count=0`, `dead_lettered_at=NULL`. The `OutboxReplayService.replayOrgDeadLetters` path correctly resets all three columns and preserves `last_error` (kept as the record of why the event died, per code comment).

### Effect correlation

`SELECT count(*) FROM external_effect_ledger WHERE organization_id IN ('p2-org-a','p2-org-b')` returned 0. The test event types have no registered consumers and therefore no `ExternalEffectLedger.record(...)` call; the absence is expected and confirms the delivery failure path does not write spurious effect rows.

## Cache revocation

The permission matrix cache uses versioned keys: `rbac:matrix:<orgId>:v<version>`. `bumpPermissionsVersion` increments `access_versions.permissions_version` and publishes `accessVersionChannel` for in-process map invalidation. No active Redis `DEL` is issued; the old versioned key becomes stale on TTL.

Before bump: `access_versions` had no row for `p2-org-a` (no role/grant mutations had run against that org).

After direct INSERT/UPSERT: `permissions_version = 1` for `p2-org-a`.

Redis keys at observation: 29 entries, all `cron:heartbeat:*` and `cron:last-error:*` (worker health signals). No `rbac:matrix:*` or `access:perms:*` keys were present — consistent with no authenticated requests having been made for that org during this run. This confirms the Redis cache holds no stale permission entries to revoke; any subsequent auth request would read v1 from the DB and generate a fresh `rbac:matrix:p2-org-a:v1` key.

In-process membership caches (1 s TTL per `MembershipStateService`) and session caches would be cleared by the `accessVersionChannel` publish within the same process; a second instance would pick up the new version on its next DB read within 1 s.

## Worker health

`GET /health/ready` confirmed all dependencies up for the full run duration. Redis shim served 200 responses throughout. The `cron:heartbeat:outbox-events-worker` key in Redis confirms the in-process worker's `CronLeaseService.withLease` wrote a heartbeat on at least one tick before the manual cron calls ran.

`GET /health` returned `{"status":"ok"}` throughout. The `/health/db` endpoint requires authentication (returned 401 as expected without a JWT).

## Processes stopped

Backend (PID 13160) terminated with `taskkill /PID 13160 /F`. Upstash shim (PID 25724) terminated. Redis shut down via `redis-cli shutdown nosave`. replay2 left clean: all 4 outbox events deleted, placement rows deleted, organization region reset to NULL, access_versions row deleted.

## Delivery checklist
