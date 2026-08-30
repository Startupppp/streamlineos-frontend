# Failure Runbooks — StreamlineOS Platform

Companion to [`c28 RUNBOOKS.md`](../../../c28-cell-based-platform-at-20m/RUNBOOKS.md) (alert runbooks for dead-outbox, dead-delivery, sig-failures, tenant-ctx-errors, p95, seam-latency) and [`CELL-RUNBOOK.md`](../../../c28-cell-based-platform-at-20m/CELL-RUNBOOK.md) (cell bootstrap, isolation, backup/restore, relocation).

This file covers five operational failure scenarios. Each section anchors to an `alert-dispatch.mjs` runbook reference and cross-references the c28 degradation tests from ticket 31, which proved each dependency can be removed without an application stub.

---

## #provider-outage

**What fires:** `dead-outbox` (critical, platform-reliability) and/or `dead-delivery` (high, notifications-team) within one retry cycle of the provider timing out.

**Detection signal:** `alert-dead-outbox.mjs` fires when any `delivery_state = 'DEAD'` outbox rows appear in the last N hours. The relay exhausts retries with exponential backoff bounded by `OUTBOX_RETRY_MAX_MS`; dead-letter happens at `OUTBOX_MAX_RETRIES`. For email specifically, `alert-dead-delivery.mjs` fires on `notification_deliveries.status = 'DEAD'`.

The degradation test in ticket 31 (email/outbox row) proved:
- The row commits `PENDING`; retry backoff is exponential and bounded.
- `shouldDeadLetter` bites at `OUTBOX_MAX_RETRIES`.
- The durable path is untouched when the provider is unavailable.

**First five minutes**

```bash
# 1. Identify which event types and orgs are failing
node backend/src/scripts/alert-dead-outbox.mjs --hours=2

# 2. Check dead notification deliveries and which channel
node backend/src/scripts/alert-dead-delivery.mjs --hours=2

# 3. Identify current queue depth (pending events accumulating)
node backend/src/scripts/alert-queue-age.mjs

# 4. Inspect provider status and recent errors in logs
# (grep the structured log for the failing event type and last_error)

# 5. Confirm the outbox relay is running and not crashed
```

**Containment:** The outbox relay retries automatically. If the provider is down, no action stops the retry cycle — it will succeed once the provider recovers. Do not manually reset `delivery_state`; wait for the relay.

**Recovery:** Once the provider recovers, the relay delivers the queued events within one relay tick. Confirm with:

```sql
SELECT COUNT(*) FROM outbox_events WHERE delivery_state IN ('PENDING', 'IN_FLIGHT');
SELECT COUNT(*) FROM outbox_events WHERE delivery_state = 'DEAD'
  AND dead_lettered_at > NOW() - INTERVAL '1 hour';
```

**Verification:** `alert-dead-outbox.mjs --hours=1` exits 0. `alert-dead-delivery.mjs --hours=1` exits 0.

---

## #queue-backlog

**What fires:** `queue-age` (high, platform-reliability) when the oldest PENDING outbox row exceeds 300 seconds old, or when total retry pressure exceeds 500.

**Detection signal:** `alert-queue-age.mjs` queries `outbox_events` directly. A queue age breach means the relay is not processing the queue — either the relay process crashed, the consumer for that event type is missing, or a DB connectivity issue is blocking the relay.

**First five minutes**

```bash
# 1. Check the current queue state and worst offenders
node backend/src/scripts/alert-queue-age.mjs

# 2. Check if any events are in DEAD state (companion to queue age)
node backend/src/scripts/alert-dead-outbox.mjs --hours=1

# 3. Check relay logs for errors
# journalctl -u streamlineos-api --since "30 minutes ago" | grep -i "outbox"

# 4. Check that OutboxRelayService is registered and the cron endpoint is reachable
# curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/cron/outbox-events-metrics
```

**Containment:** If the relay is not running, restart the API process. If the event type has no consumer (`no consumer registered for event type` in `last_error`), register the consumer and restart.

**Recovery:** After the relay resumes, pending events drain automatically. Verify:

```sql
SELECT delivery_state, COUNT(*), MIN(created_at) AS oldest
FROM outbox_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY delivery_state;
```

**Verification:** `alert-queue-age.mjs` exits 0 with `ageBreached: false`.

---

## #cache-loss

**What fires:** No direct alert for cache loss — Redis falling back to database is transparent to correctness. Observable signals are:

- `seam-latency` fires (`cache.roundtrip` seam p95 spikes if Redis is unreachable and the client errors fast)
- `p95` fires (every request now hits the DB for permission resolution, increasing `route.cached.read` latency)
- Application logs show Redis connection errors

**Detection signal:** The degradation test in ticket 31 (Redis row) proved:
- `CacheService` falls through to the fetcher on ECONNREFUSED — correctness stays database-backed.
- The rate limiter falls back in-memory and **still denies** past the limit.
- No writes are lost; Redis is a read-cache only.

**First five minutes**

```bash
# 1. Confirm Redis connectivity
redis-cli -u $REDIS_URL PING

# 2. Check cache.roundtrip seam latency
# (pipe recent logs through alert-seam-latency.mjs)
journalctl -u streamlineos-api --since "30 minutes ago" -o cat | \
  node backend/src/scripts/alert-seam-latency.mjs

# 3. Confirm the API is still serving (correctness not affected)
curl -s http://localhost:3000/health
```

**Containment:** None required — the application degrades gracefully. DB-backed permission resolution handles all requests until Redis recovers.

**Recovery:** When Redis reconnects, the cache warms automatically on the next cache-miss for each key. No manual intervention needed.

**Verification:** `alert-seam-latency.mjs` exits 0 after Redis is restored and the log window clears.

**Cache flush (operator-initiated, for emergency cache poisoning):**

```bash
# DESTRUCTIVE — drops ALL tenant caches including permissions and sessions.
# Run ONLY on a dedicated dev Redis or with explicit operator consent.
redis-cli -u $REDIS_URL FLUSHDB
```

---

## #database-cell-failure

**What fires:** `pool-saturation` (high, platform-reliability) when `db.pool.wait` p95 exceeds 3 ms or pool saturation warnings appear in logs. `tenant-ctx-errors` (critical) when 42501 errors appear.

**Detection signal:** `alert-pool-saturation.mjs` reads structured log lines. Pool saturation warnings are emitted by `pool-telemetry.ts` at most every 30 s when `inFlight >= max`. 42501 errors are emitted by `alert-tenant-ctx-errors.mjs`.

The degradation test in ticket 31 (control plane and DB rows) proved:
- A throwing `lookupOrgRegion` refuses unknown and stale placement without caching the failure.
- The placement signed-cache path survives a control-plane outage.

See [`CELL-RUNBOOK.md`](../../../c28-cell-based-platform-at-20m/CELL-RUNBOOK.md) for:
- Cell bootstrap from nothing: `pnpm -C backend cell:bootstrap`
- Org placement: `pnpm -C backend cell:place-org`
- Isolation check: `pnpm -C backend cell:isolation`
- Degraded control plane: `pnpm -C backend cell:degraded`
- Backup and restore: `pnpm -C backend cell:backup`

**First five minutes**

```bash
# 1. Check pool saturation signal
journalctl -u streamlineos-api --since "30 minutes ago" -o cat | \
  node backend/src/scripts/alert-pool-saturation.mjs

# 2. Check DB health endpoint
curl -s -H "x-internal-secret: $INTERNAL_API_SECRET" http://localhost:3000/health/db | jq .

# 3. Check for 42501 tenant-context errors
journalctl -u streamlineos-api --since "30 minutes ago" -o cat | \
  node backend/src/scripts/alert-tenant-ctx-errors.mjs

# 4. If a cell database is suspected: check cell isolation
pnpm -C backend cell:isolation --region=cell-2

# 5. If the control plane is suspected: check placement resolution
pnpm -C backend cell:degraded --region=cell-2 --org=<known-placed-org-id>
```

**Containment:** If a cell database is unreachable, the signed-placement cache allows the primary cell to keep serving placed organizations without the control plane. Unknown organizations are refused (not guessed). See `CELL-RUNBOOK.md #exercise-the-degraded-control-plane`.

**Recovery (full cell failure):**

```bash
pnpm -C backend cell:backup --region=cell-2 --restore
pnpm -C backend cell:backup --region=cell-2 --verify
```

**Verification:** `alert-pool-saturation.mjs` exits 0. `alert-tenant-ctx-errors.mjs` exits 0 over a fresh log window.

---

## #bad-release

**What fires:** No alert fires for a bad release directly. Detection is by correlation: a spike in `p95`, `seam-latency`, `tenant-ctx-errors` or `dead-outbox` correlated with a recent deploy, identified by the `release` field on every log line.

**Detection signal:** Every log line emitted inside a request now carries the `release` field (stamped at entry from `APP_RELEASE` by `correlation-id.middleware.ts`). A log aggregator can group errors by `release` to identify which deploy introduced a regression. The `log-context-completeness.spec.ts` unit test asserts this field is always present.

**First five minutes**

```bash
# 1. Identify the release in current logs
# (look for "release" field on any recent log line)

# 2. Confirm what release is running
curl -s http://localhost:3000/health | jq .

# 3. Check latency alerts over the current log window
journalctl -u streamlineos-api --since "30 minutes ago" -o cat | \
  node backend/src/scripts/alert-seam-latency.mjs

# 4. Check outbox for events that would indicate a broken write path
node backend/src/scripts/alert-queue-age.mjs

# 5. Roll back the release if the regression is confirmed
# (restart the API with the previous build / image tag)
```

**Containment:** Roll back to the previous release immediately if the regression is confirmed. The outbox relay and background sweeps recover automatically once the good build is running.

**Recovery:** After rollback, verify:

```bash
# Wait one log window, then confirm alerts clear
journalctl -u streamlineos-api --since "10 minutes ago" -o cat | \
  node backend/src/scripts/alert-seam-latency.mjs
node backend/src/scripts/alert-queue-age.mjs
```

**Verification:** All alerts exit 0 over a fresh window. Log lines carry the correct (rolled-back) `release` value.

---

## #tenant-cost

**What fires:** `tenant-cost` (high, platform-reliability) when one org's AI credit spend over the window exceeds `multiplier × median` org spend. This is a noisy-neighbour signal, not an absolute cost threshold.

**Detection signal:** `alert-tenant-cost.mjs` queries `ai_usage_logs.credits_milli` per org. The alert fires only when at least `min-orgs` (default 3) distinct orgs have usage in the window, so a single tenant cannot trigger a relative comparison against itself.

**Measurable in `ai_usage_logs`:** AI token/credit spend per org (credits_milli, total_tokens, feature, model).

**Not measurable by this alert:** CPU, memory, network, DB query cost, Redis memory, or object storage per tenant. Those metrics have no per-tenant ledger in the current schema. See `CELL-RUNBOOK.md` for what each shared resource currently lacks in per-cell attribution.

**First five minutes**

```bash
# 1. Identify the noisy tenant
node backend/src/scripts/alert-tenant-cost.mjs --window-hours=1

# 2. Check which feature is driving the usage
# (the alert reports top_feature per org)

# 3. Check if the org has an active AI credit balance or is spending the shared reserve
# GET /billing/entitlements for the org (requires org context)

# 4. Contact the org or throttle via the rate-limit tier for their AI feature
```

**Containment:** The `ai_usage_logs` table records all spend; the credit reserve/consume gateway already gates each call. If a tenant is abusing the system, revoke their AI feature access at the module level (`setModuleEnabled`).

**Recovery:** No recovery needed once the abuse is contained. Historical spend is already recorded.

**Verification:** `alert-tenant-cost.mjs` exits 0 after the noisy tenant's usage normalises.
