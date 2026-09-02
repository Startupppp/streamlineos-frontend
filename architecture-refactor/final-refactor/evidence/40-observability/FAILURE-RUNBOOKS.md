# Failure Runbooks — StreamlineOS Platform

Companion to the durable operator runbooks for [live alert delivery](../../../runbooks/RB-06-live-alert-delivery.md), [cell isolation](../../../runbooks/RB-01-cell-isolation.md), [backup/PITR](../../../runbooks/RB-02-pitr-backup.md), and [recovery](../../../runbooks/RB-04-recovery-drill.md).

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

See the [cell-isolation](../../../runbooks/RB-01-cell-isolation.md) and [recovery](../../../runbooks/RB-04-recovery-drill.md) runbooks for:
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

**Containment:** If a cell database is unreachable, the signed-placement cache allows the primary cell to keep serving placed organizations without the control plane. Unknown organizations are refused (not guessed). Follow the degraded-control-plane and recovery procedures in RB-01 and RB-04.

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

**Not measurable by this alert:** CPU, memory, network, DB query cost, Redis memory, or object storage per tenant. Those metrics have no per-tenant ledger in the current schema. Use RB-07 for the required per-cell cost evidence.

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

---

## #dead-outbox

**What fires:** `dead-outbox` when any `outbox_events` row this consumer owns reaches DEAD state inside a 24h window. The objective is zero — a DEAD outbox row is lost domain intent, not a retryable blip.

**Detection signal:** `alert-dead-outbox.mjs` reads `outbox_events` where `delivery_state = 'DEAD'`. DEAD means the relay exhausted its retry ceiling, so `last_error` carries the terminal reason.

**First five minutes**

```bash
# 1. List the dead rows and their terminal errors
node backend/src/scripts/alert-dead-outbox.mjs --hours=24

# 2. Group by event type — a single failing consumer produces one cluster
# 3. Confirm the consumer is registered; an unregistered type dead-letters every row
node backend/src/scripts/check-outbox-consumers.mjs
```

**Containment:** Fix the consumer before replaying. A replay against an unfixed consumer re-deads every row and burns the retry budget again.

**Recovery:** Consumers are idempotent by dedupe key, so a replay cannot double-apply. Reset the affected rows to PENDING and let the relay drain them.

**Verification:** `alert-dead-outbox.mjs` exits 0 with no DEAD rows in the window.

---

## #dead-delivery

**What fires:** `dead-delivery` when a delivery-channel row (notification, email, push) reaches DEAD state inside a 24h window.

**Detection signal:** `alert-dead-delivery.mjs`. Unlike `#dead-outbox`, the intent was persisted successfully and only the outbound provider hop failed, so the domain state is correct and the user simply was not told.

**First five minutes**

```bash
# 1. List dead deliveries by channel and provider
node backend/src/scripts/alert-dead-delivery.mjs --hours=24

# 2. If one provider dominates, treat it as a provider outage first
```

See `#provider-outage` when a single provider accounts for the cluster.

**Containment:** Suppression and bounce state are authoritative — do not replay into a suppressed address, or the provider reputation degrades further.

**Recovery:** Re-queue eligible deliveries. Dedupe keys make redelivery safe for recipients who already received the message.

**Verification:** `alert-dead-delivery.mjs` exits 0 with no DEAD rows in the window.

---

## #job-queue-age

**What fires:** `job-queue-age` when a job-channel row stays QUEUED or RUNNING longer than 900 seconds, or when retry pressure exceeds 500.

**Detection signal:** `alert-job-queue-age.mjs`. A RUNNING row older than the threshold usually means a worker died holding its lease rather than a slow job.

**First five minutes**

```bash
# 1. Show the oldest rows per job table and their state
node backend/src/scripts/alert-job-queue-age.mjs

# 2. Distinguish the two causes:
#    QUEUED and growing  -> no worker is claiming (worker down, or cron not firing)
#    RUNNING and stalled -> a worker died mid-lease; the lease must expire before reclaim
```

**Containment:** Never clear a RUNNING row by hand while a worker may still hold the lease — that is how a job runs twice. Wait for lease expiry, which is what makes reclaim safe.

**Recovery:** Restart the worker. Leases expire and rows return to QUEUED for a clean claim.

**Verification:** `alert-job-queue-age.mjs` exits 0 with `ageBreached: false`.

---

## #tenant-ctx-errors

**What fires:** `tenant-ctx-errors` (critical, platform-reliability) when the log stream carries `permission denied for table …` / `missing tenant context` — a `42501` raised because a query ran without the tenant GUC.

**Detection signal:** `alert-tenant-ctx-errors` reads the structured log. RLS fails closed, so `app.current_org_id()` raises `42501` rather than returning rows from the wrong tenant. **This alert firing means work was dropped, never that data leaked.**

**First five minutes**

```bash
# 1. Find the failing call sites and their org context
node backend/src/scripts/alert-dispatch.mjs --alert=tenant-ctx-errors

# 2. Classify the caller — the three sources have different fixes:
#    guard        -> guards run BEFORE interceptors, so they have no ambient GUC
#    after-commit -> a `void fn()` kept context after the transaction committed
#    background   -> a sweep has no ambient context at all
```

**Containment:** None available at runtime; the code path is broken, not overloaded. Restarting does not help.

**Recovery:** Fix by source: wrap a guard's own queries explicitly, move deferred work into `registerAfterCommit` plus `runInNewTenantTransaction`, and iterate sweeps with `forEachOrg`. Never swallow the failure — a swallowed `42501` is how this class stayed invisible platform-wide.

**Verification:** the alert stops firing and the affected writes appear.

---

## #sig-failures

**What fires:** `sig-failures` (high, payments-team) when an inbound webhook fails HMAC signature verification.

**Detection signal:** `alert-sig-failures.mjs`, primarily `payment_webhook_endpoints.status = 'failing'`.

**Treat as a forgery attempt until proven otherwise.** The benign cause is a provider-side secret rotation that Settings > Payments never received; the malicious cause is replay or forgery. Both look identical in the first minute.

**First five minutes**

```bash
# 1. Identify which endpoint and provider is failing
node backend/src/scripts/alert-sig-failures.mjs

# 2. Confirm whether the secret was rotated provider-side in the last 24h
# 3. If it was NOT rotated, treat the source IP and payloads as hostile
```

**Containment:** Verification already fails closed, so nothing was accepted. Do not disable verification to "unblock" a provider — that converts a contained failure into an open forgery surface.

**Recovery:** Update the stored secret to match the provider. Providers redeliver failed webhooks; idempotency keys make redelivery safe.

**Verification:** `alert-sig-failures.mjs` exits 0 and the endpoint leaves `failing`.

---

## #p95

**What fires:** `p95` (high, platform-reliability) when p95 latency on the ten hottest endpoints exceeds budget.

**Detection signal:** `alert-p95.mjs` computes p95 from the structured log — `LogSpanExporter` writes one `SPAN` line per finished request. There is no APM agent, so the log stream is the only source and a log outage reads as silence, not as health.

**First five minutes**

```bash
# 1. Rank the offending endpoints
node backend/src/scripts/alert-p95.mjs

# 2. Separate application overhead from database time
node backend/src/scripts/alert-seam-latency.mjs
```

**Containment:** If one endpoint dominates, its module's rate-limit tier bounds the blast radius while the cause is found.

**Recovery:** Latency regressions are usually a query plan, not capacity. Re-measure as `streamline_app` with the tenant GUC set — the owner role bypasses RLS and its plans hide the cost. `VACUUM ANALYZE` after any bulk load before concluding an index is unused.

**Verification:** `alert-p95.mjs` exits 0.

---

## #seam-latency

**What fires:** `seam-latency` (high, platform-reliability) when a named seam exceeds its budget: `db.pool.wait` 3ms, `db.guc.setup` 2ms, `db.query.execute` 9ms, `db.roundtrip.simple` 15ms, `db.roundtrip.complex` 37ms, `cache.roundtrip` 1.5ms, `route.cached.read` 112ms, `route.write` 375ms, `runtime.eventloop.delay` 37ms.

**Detection signal:** `alert-seam-latency.mjs`. The seam that breaches names the layer, which is why this is more actionable than `#p95` alone.

**First five minutes**

```bash
# 1. Identify the breaching seam
node backend/src/scripts/alert-seam-latency.mjs

# 2. Read the seam as a diagnosis:
#    db.pool.wait          -> pool exhaustion; connections held across provider calls
#    db.guc.setup          -> tenant transaction setup cost; too many tiny transactions
#    cache.roundtrip       -> Redis degraded; see #cache-loss
#    runtime.eventloop.delay -> CPU work on the request thread
```

**Containment:** For `db.pool.wait`, the cause is almost always a connection held across an external call. Release before the provider hop rather than enlarging the pool, which only defers exhaustion.

**Recovery:** Move CPU/IO-heavy work off the request thread to a durable job.

**Verification:** `alert-seam-latency.mjs` exits 0 for every seam.

---

## #retention-dead-man

**What fires:** `retention-dead-man` (critical, platform-reliability) when any declared
retention sweep has not recorded a successful run inside its own window, when a sweep ran
but failed for one or more tenants, or when no heartbeat can be read at all.

**Detection signal:** `alert-retention-dead-man.mjs` reads two Redis key families and
treats them as two different faults.

- **Staleness** — `cron:heartbeat:<jobKey>` is written by `CronLeaseService` only on a
  successful run. A heartbeat older than that job's `maxAgeMs` (26h for the daily sweeps,
  3h for the hourly GDPR export-artifact sweep) means the sweep is not running. Missing
  entirely counts as stale, not as healthy.
- **Partial failure** — `cron:last-error:<jobKey>` is written by `CronLeaseService` when a
  sweep throws outright, and by `CronSweepFailureSinkService` when `forEachOrg` isolated a
  failing tenant. The heartbeat is still written in the partial case, because the sweep
  genuinely ran, so a staleness check alone would never see a tenant whose retention has
  been failing every night for a month. Records carry `failedOrgIds` and expire after 7
  days; one older than the job's window is ignored, because the sweep has succeeded since.
- **Vacuity** — every heartbeat absent exits **2**, not 0. That is unproven, not healthy:
  it is equally consistent with Redis being unreachable, the scheduler being disabled, and
  nothing ever having run.

Exit codes: `0` healthy · `1` one or more sweeps stale or failing · `2` cannot reach
Redis, env not configured, or the vacuity guard fired.

**Why this alert exists:** every retention drain in the backend was once reachable only as
`POST /cron/<job>` behind `CRON_SECRET`, and no scheduler in either repository ever sent
that request. Eleven correct, fully tested drains were dead. `CronRetentionSchedulerService`
now runs them in process, and this alert is what proves they are still running — the
declaration in `src/modules/cron/retention-schedule.ts` is the single source of truth for
the scheduler, this alert and the README table, and `retention-schedule-parity.spec.ts`
fails if any of the three drift.

**First five minutes**

```bash
# 1. Which sweeps are stale, which are failing, and since when
node backend/src/scripts/alert-retention-dead-man.mjs

# 2. Exit 2 means unproven, not healthy — check Redis before believing anything above
# (confirm UPSTASH_REDIS_REST_URL / _TOKEN are set for this environment)

# 3. Is the in-process scheduler even enabled in this deployment?
# RETENTION_SCHEDULER_ENABLED must not be "false"; RETENTION_SCHEDULER_TICK_MS is the
# due-check interval (default 10 minutes)

# 4. For a sweep reported as PARTIAL, read the failed tenant ids out of the record
# the sink wrote — the alert prints them, capped at 50

# 5. Drive the named sweep by hand and read its result body
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "$BACKEND_ORIGIN/cron/<jobKey>"
```

**Containment:** Nothing here deletes data on its own, and nothing needs stopping — a
stale retention sweep means data is being *kept* past its policy, not lost. The exposure is
regulatory (a retention promise not being met) and operational (unbounded table growth), so
do not disable the scheduler to silence the alert. If one tenant is failing repeatedly,
`forEachOrg` already isolates it: the other tenants keep draining while you investigate.

The one sweep where staleness is a live privacy exposure is
`gdpr-export-artifact-retention`. Its objects are complete JSON dumps of a single
subject's personal data with a 72-hour expiry, so a sweep that has not run in a day means
archives are downloadable past the window they were promised for. Treat that job's
staleness as the highest priority of the set.

**Recovery**

1. **Stale because nothing is scheduled** — confirm `RETENTION_SCHEDULER_ENABLED` is not
   `false` and that the process actually booted `CronRetentionSchedulerService`
   (`[retention-scheduler] disabled` is logged at warn when it is off). Restarting the API
   re-arms it; the first tick is jittered by up to 60s.
2. **Stale because the lease is stuck** — `withLease` refuses a lease while a sweep is
   draining, which is deliberate: the next tick resumes the work whole rather than running
   two drains against the same rows. A lease that outlives its `leaseSeconds` expires on
   its own; do not delete the key while a sweep may still be running.
3. **Failing for specific tenants** — take a `failedOrgId` from the record and drive that
   sweep by hand; the per-tenant error is logged with `orgId`, `correlationId` and
   `cellId`. A `42501` there is a missing tenant GUC, not a retention bug.
4. **Truncated rather than failed** — every drain is bounded by `MAX_BATCHES` and returns
   `truncated: true` when it hit the cap with rows still eligible, recording the flag in
   its `hr_audit_logs` `after` payload. That is not an alertable failure: the next tick
   resumes. A tenant that reports `truncated` on every run has a backlog growing faster
   than one tick can drain, and needs a one-off catch-up rather than a code change.

**Verification:** `alert-retention-dead-man.mjs` exits 0, with a heartbeat inside its
window for every job in `RETENTION_JOBS` and no unexpired `cron:last-error:` record.

---

## #cell-recovery

**What fires:** `cell-recovery` (critical, platform-reliability) when a cell fails its recovery/health assertion.

**Detection signal:** `alert-cell-recovery.mjs`.

**First five minutes**

```bash
# 1. Establish which cell and which assertion failed
node backend/src/scripts/alert-cell-recovery.mjs

# 2. Confirm the blast radius is one cell — cross-cell impact is a placement fault, not a cell fault
```

See `#database-cell-failure` for the database-specific path and RB-01 for the isolation proof.

**Containment:** Keep the failure inside the cell. Never repoint a failing cell's traffic at another cell's resources — that breaks the isolation guarantee RB-01 exists to prove.

**Recovery:** Follow [RB-04](../../../runbooks/RB-04-recovery-drill.md); relocation is [RB-02](../../../runbooks/RB-02-pitr-backup.md).

**Verification:** `alert-cell-recovery.mjs` exits 0 and RB-01 isolation checks still pass.
