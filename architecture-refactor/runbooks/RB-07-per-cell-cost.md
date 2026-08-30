# RB-07 Per-Cell Cost and Saturation Forecast

**Status: OPEN — operator-blocked**
The unit-cost and capacity guards are verified correct by self-test. Producing real trended cost data requires live infrastructure with real usage.

## Preconditions

- At least one cell is running with real or production-shaped workload (see RB-05).
- `CELL_DB_URL` (and optionally `CELL_REDIS_URL`, `CELL_R2_SPEND_API`) are set with the credentials to query per-cell usage.
- The infrastructure billing APIs (Neon project usage, Upstash usage, Cloudflare R2 usage) are accessible with API keys.
- `pnpm cell:cost:record` and `pnpm cell:capacity:record` are scheduled to run daily (e.g. via cron or a CI schedule).
- A time-series store (Prometheus, Axiom, or a simple append-only JSONL file per cell) is configured for trend storage.

## Step 1 — Capture a baseline cost snapshot

```bash
cd backend
# Unit cost (per active org, member, message, job):
node --env-file=.env src/scripts/run-cell-unit-cost.mjs --record-only

# Capacity snapshot:
node --env-file=.env src/scripts/run-cell-capacity.mjs --record-only
```

## Step 2 — Schedule daily recording

Add to the CI/CD pipeline or a dedicated cron job:

```bash
# Daily at 02:00 UTC
0 2 * * * cd /app/backend && node --env-file=.env src/scripts/run-cell-unit-cost.mjs --record-only >> /var/log/cell-cost.jsonl 2>&1
0 2 * * * cd /app/backend && node --env-file=.env src/scripts/run-cell-capacity.mjs --record-only >> /var/log/cell-capacity.jsonl 2>&1
```

## Step 3 — Run the cost and capacity checks manually

```bash
cd backend
# Full cost report (JSON):
node --env-file=.env src/scripts/run-cell-unit-cost.mjs
node --env-file=.env src/scripts/run-cell-capacity.mjs --json

# Collect S7 evidence:
node --env-file=.env src/scripts/collect-s7-evidence.mjs
```

## Step 4 — Produce a saturation forecast

The capacity script outputs projected time-to-saturation for each resource dimension.
Record:
- **Per active organization**: compute (CPU-ms), storage (GB), AI credits consumed.
- **Per active member**: message delivery count, notification count, session count.
- **Per message**: outbox events, delivery attempts, realtime channel messages.
- **Per background job**: queue time, execution time, retries.
- **Saturation forecast**: at current growth rate, when does each dimension saturate?

```bash
node --env-file=.env src/scripts/run-cell-capacity.mjs --json \
  | jq '{
      saturation_forecast_days: .saturation_forecast_days,
      compute_utilization_pct: .compute_utilization_pct,
      storage_utilization_pct: .storage_utilization_pct,
      connection_pool_utilization_pct: .connection_pool_utilization_pct
    }'
```

## Step 5 — Verify the tenant-cost alert fires on anomalous spend

```bash
# Configure a test org with artificially high credit spend, then run:
node --env-file=.env src/scripts/alert-tenant-cost.mjs
# Expected: noisy org detected, alert dispatched.
# Self-test confirmed (2026-08-30): fires on 500-credit outlier.
```

## Expected output (unit cost)

```json
{
  "cell": "cell-us-01",
  "timestamp": "2026-08-30T02:00:00Z",
  "active_orgs": 1200,
  "active_members": 18500,
  "messages_24h": 340000,
  "jobs_24h": 12000,
  "cost_per_active_org_usd": 0.042,
  "cost_per_active_member_usd": 0.0027,
  "cost_per_message_usd": 0.000015,
  "cost_per_job_usd": 0.00008,
  "trend_7d_pct": "+3.2%",
  "saturation_forecast_days": 180
}
```

## Pass threshold

- `cell:unit-cost:self-test` passes (confirmed 2026-08-30):
  `SELF-TEST PASS: anomaly detector fired on 500-cost outlier — guard can fail`
- `cell:capacity:self-test` passes (confirmed 2026-08-30):
  `SELF-TEST PASS: breach detected — guard can fail`
- At least 7 daily snapshots exist (one week of trend data).
- Cost per active org, member, message and job are published.
- Saturation forecast is approved by the operator.
- `alert:tenant-cost` fires when a noisy org exceeds the threshold.

## Evidence recording

Save daily JSONL to `architecture-refactor/runbooks/evidence/RB-07-cost-trend-<cell>-<date>.jsonl`.
Save the saturation forecast to `architecture-refactor/runbooks/evidence/RB-07-saturation-forecast-<date>.json`.

## Self-test results (guard correctness, confirmed 2026-08-30)

`cell:unit-cost:self-test` PASSED: anomaly detector fires on 500-cost outlier.
`cell:capacity:self-test` PASSED: breach detected and reported.
`alert:tenant-cost:self-test` PASSED: noisy org detected, normal orgs clear.

Live data requires a running cell with real usage.
