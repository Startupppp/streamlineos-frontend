# Alert Runbooks

Owner and severity for each alert are embedded in every webhook payload by `alert-dispatch.mjs`.
The `runbook` field in that payload links directly to the relevant section below.

---

## dead-outbox

**Owner:** platform-reliability | **Severity:** critical

Outbox events have reached `DEAD` state within the lookback window — the relay exhausted all retries without a successful consumer acknowledgement, so at least one cross-process side-effect was permanently dropped.

**First three checks**

1. Query `SELECT event_type, last_error, retry_count FROM outbox_events WHERE delivery_state = 'DEAD' ORDER BY dead_lettered_at DESC LIMIT 20` to identify which event types are failing.
2. Check the application logs for the consumer that handles those event types — look for connection errors, schema mismatches, or a missing consumer registration.
3. Confirm the outbox relay process (`OutboxRelayService`) is running and healthy; a crashed relay leaves all events permanently un-retried.

**Confirm resolution:** `SELECT COUNT(*) FROM outbox_events WHERE delivery_state = 'DEAD' AND dead_lettered_at > NOW() - INTERVAL '1 hour'` returns zero. Reprocess dead events by resetting `delivery_state = 'PENDING'` and `retry_count = 0` after fixing the root cause.

---

## dead-delivery

**Owner:** notifications-team | **Severity:** high

Notification deliveries have reached `DEAD` state — the delivery pipeline exhausted all retries for at least one channel (EMAIL, PUSH, IN_APP). Recipients did not receive time-sensitive notifications such as payment confirmations or security alerts.

**First three checks**

1. Query `SELECT event_key, channel, failure_message, attempt_count FROM notification_deliveries WHERE status = 'DEAD' ORDER BY failed_at DESC LIMIT 20` to identify the failing channel and event type.
2. For EMAIL: check the Resend/ZeptoMail provider dashboard for bounces, rate limits, or credential failures.
3. For PUSH: check the web-push or FCM credentials and confirm the subscription endpoint is still valid.

**Confirm resolution:** `SELECT COUNT(*) FROM notification_deliveries WHERE status = 'DEAD' AND failed_at > NOW() - INTERVAL '1 hour'` returns zero. After fixing the provider issue, reset failed deliveries to retry.

---

## sig-failures

**Owner:** payments-team | **Severity:** high

A payment webhook endpoint has reached `status = 'failing'` — the provider is posting webhooks whose HMAC does not match the configured secret. This means either the secret was rotated on the provider side without updating Settings > Payments, or a replay/forgery attempt is in progress.

**First three checks**

1. Query `SELECT org_id, provider_key, environment, failure_reason, last_failure_at FROM payment_webhook_endpoints WHERE status = 'failing'` to identify the affected org and provider.
2. Open Settings > Payments for that org and confirm the webhook secret matches what the provider shows in its dashboard (Razorpay, Stripe, etc.).
3. Check the provider's webhook delivery log for the source IP — a different IP than usual indicates a forgery attempt rather than a misconfiguration.

**Confirm resolution:** The endpoint's `status` returns to `'active'` after the secret is updated and a test webhook delivery succeeds.

---

## tenant-ctx-errors

**Owner:** platform-reliability | **Severity:** critical

One or more `42501` (insufficient privilege) errors were emitted in the lookback window — a query reached the connection pool with no tenant GUC set (`app.current_org_id()` raises `42501` when absent). This class of error has caused production incidents where after-commit hooks or background sweeps silently dropped writes platform-wide.

**First three checks**

1. Inspect the matched log entries in the alert output for `route`, `correlationId`, and `errorClass` to locate the code path — `errorClass: "tenant-context"` points to an after-commit hook; an unhandled exception from a route points to a guard or service that queries outside a tenant transaction.
2. Check whether the error is in an after-commit hook: the hook must call `runInNewTenantTransaction` rather than borrowing the already-committed request transaction.
3. Check whether a background sweep (`forEachOrg`) is querying without setting the GUC — each iteration must open its own `runInTenantTransaction`.

**Confirm resolution:** No new `42501` lines appear in the structured log for the affected route/hook path after deployment. Re-run the alert with the fixed log and confirm it does not fire.

---

## p95

**Owner:** platform-reliability | **Severity:** high

At least one of the hottest endpoints (by request volume) has a p95 latency exceeding the configured threshold. This alert fires only when `--threshold-ms=N` is supplied; without it the script is a reporter.

**First three checks**

1. Identify the breached endpoint(s) from the `breached` array in the alert payload.
2. Run `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` for the primary query behind that endpoint as `streamline_app` with the tenant GUC set — buffer counts reveal index misses that wall-clock times hide.
3. Check whether a recent migration dropped or changed an index on the relevant table — `pg_stat_user_indexes` shows index usage since the last `ANALYZE`.

**Confirm resolution:** After deploying the fix, re-run the alert against a fresh log window. The endpoint no longer appears in `breached`.

---

## seam-latency

**Owner:** platform-reliability | **Severity:** high

At least one instrumented seam (a measured boundary between architectural layers) has a p95 latency exceeding its budget. Seam budgets are defined in `backend/src/common/observability/seam-budgets.ts` and mirrored in `alert-seam-latency.mjs` — keep them in sync.

| Seam | Budget (ms) |
|---|---|
| `db.pool.wait` | 3 |
| `db.guc.setup` | 2 |
| `db.query.execute` | 9 |
| `db.roundtrip.simple` | 15 |
| `db.roundtrip.complex` | 37 |
| `cache.roundtrip` | 1.5 |
| `route.cached.read` | 112 |
| `route.write` | 375 |

**First three checks**

1. Identify the breached seam(s) from the `breached` array and their `p95Ms` vs `thresholdMs`.
2. For `db.*` seams: run `EXPLAIN (ANALYZE, BUFFERS)` as `streamline_app` with the GUC for the most expensive query in the window — `pg_stat_statements` sorted by `mean_exec_time` narrows the candidates.
3. For `cache.roundtrip`: check Redis latency metrics and connection pool saturation; a spike here usually means connection exhaustion or a network blip, not a query problem.

**Confirm resolution:** Re-run the alert against a fresh log window. The seam no longer appears in `breached`.

If the alert exits 2 ("no seam span lines found"), the instrumentation is unwired — confirm that `main.ts` calls `setSpanExporter(new LogSpanExporter())` and that Lane C's seam spans carry the `seamName` attribute.

---

## cell-recovery

**Owner:** platform-reliability | **Severity:** critical

A cell recovery event is in progress or has completed. Fired by `run-recovery-drill.mjs` at the start of a drill and by operators during an actual cell failure. The payload carries the failure class, measured RPO/RTO, and integrity result.

**Failure classes and their tested objectives (from `.recovery-drill-results.json`):**

| Failure class | RPO target | RTO target | Verification |
|---|---|---|---|
| `CELL_DB_FAILURE` | <= 5 minutes (backup frequency) | <= 60 minutes | Proved by drill: logical dump → drop → rebuild → restore → verify |
| `REGIONAL_DISASTER` | <= 5 minutes (Neon PITR) | <= 60 minutes | **UNVERIFIED** — requires `NEON_API_KEY` and a scripted branch-restore exercise. Gap is recorded in `CELL-RUNBOOK.md`. |

**Drill findings (2026-08-29) — ALL THREE OBJECTIVES MISSED:**

- **RPO for `CELL_DB_FAILURE`: 47468 seconds (~13 hours). MISSED.** Last backup was at 2026-08-28T05:57:47Z. No backup schedule exists. To meet the 5-minute target, automated backups must run at <= 5-minute intervals.
- **RTO for `CELL_DB_FAILURE`: UNMEASURABLE. MISSED.** The bootstrap (`bootstrap-cell.mjs --drop --i-mean-it`) fails reliably on a cold Neon compute with CONNECTION_CLOSED during large migrations: `0000_light_vance_astro` (4456 statements, fails at ~109) and `0619_chain_creates_what_production_has` (1867 statements, fails at 1471). Without a completed bootstrap the restore cannot proceed (schema does not exist). The 60-minute target cannot be verified in this environment.
- **`REGIONAL_DISASTER` RPO (<= 5 min): UNVERIFIED.** No `NEON_API_KEY`, no scripted PITR branch-restore exercise.
- **Control-plane behaviour during the cell outage**: Placement lookups from `neondb` remained available throughout. Known-org placements were served from the signed cache (TTL 10 min). Unknown orgs were refused 503 retryable. The cache TTL (10 min) is less than the fence lease (24 h). This is consistent with the 11 passing unit tests in `placement-degraded-control-plane.spec.ts` — no regression observed.
- **Cell2 shared with Lane B**: Cell2 was in a broken pre-drill state (`public.custom_states` listed in `pg_tables` but not queryable) from concurrent migration-chain work. The drill must be re-run after Lane B completes their work on an exclusive cell2.
- **No physical read replica**: Replica routing seam is built (`src/db/replica-router.ts`) and tested at pool-selection level. Lag-simulation tests are skipped pending Neon replica provisioning.

**First three checks**

1. Read `backend/.recovery-drill-results.json` for the latest measured RPO, RTO and integrity status. Confirm `integrity.ok` is `true` and `disturbed` is `false`.
2. Check `control_plane_during_recovery.placement_cache_served_known_org` — if `false`, cached placements are not being served from the signed cache, which means traffic to the recovering cell is receiving 503s rather than being served from cache.
3. Confirm the bootstrap completed with `RESULT: CELL READY` in the logs. A partial bootstrap (migrations applied but RLS not verified) leaves the cell in a partially open state.

**Confirm resolution:** Re-run `pnpm -C backend cell:drill` and confirm `RESULT: DRILL PASSED`. The new `.recovery-drill-results.json` replaces the previous one.

---

## database-cell-failure

**Owner:** platform-reliability | **Severity:** high

The cell database connection pool is approaching saturation. At saturation, sheddable work classes (analytics-refresh, search-freshness) are refused first; reserved classes (authentication, billing-ledger, payroll-posting, audit) retain their capacity fraction.

**First three checks**

1. Check `ADMISSION_MAX_CONCURRENT` and current in-flight count from the admission service metrics. If in-flight is approaching `ADMISSION_MAX_CONCURRENT`, a noisy tenant may be consuming the sheddable pool — check `ADMISSION_ORG_MAX_CONCURRENT`.
2. Run `EXPLAIN (ANALYZE, BUFFERS)` on the slowest queries (by `pg_stat_statements` `mean_exec_time`) as `streamline_app` with the tenant GUC set. A missing or mismatched index is the most common cause of pool saturation.
3. Check the Neon compute metrics dashboard for CPU and I/O saturation. A cold compute (suspended and resuming) adds connection latency that can cause false pool-saturation spikes.

**Confirm resolution:** The in-flight count falls below `ADMISSION_MAX_CONCURRENT * (1 - ADMISSION_RESERVED_FRACTION)` and no 503s are observed for `ordinary-write` class routes.

---

## tenant-cost

**Owner:** platform-reliability | **Severity:** high

A tenant's per-request cost (AI credits, DB query time, or storage) has exceeded the per-organization cap. This usually indicates an unbounded AI prompt, a missing pagination cap, or a loop that retries without backoff.

**First three checks**

1. Identify the tenant from the alert payload's `org_id`. Query `ai_usage_logs` for the top spenders in the last hour: `SELECT feature_key, SUM(charge_milli_credits) FROM ai_usage_logs WHERE org_id = $1 AND created_at > NOW() - INTERVAL '1 hour' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`.
2. Check whether the AI gateway is applying the reserve ceiling (`AI_FEATURE_COSTS`) before the provider call. A missing ceiling means an unbounded context window is billed to the tenant.
3. Check `pg_stat_statements` for queries from that tenant with high `total_exec_time` — an unindexed filter combined with a large dataset is the common non-AI cost driver.

**Confirm resolution:** The tenant's per-hour cost falls below the cap. Deploy a fix (pagination, ceiling, or index) and confirm no new `tenant-cost` alerts fire in the next hour.
