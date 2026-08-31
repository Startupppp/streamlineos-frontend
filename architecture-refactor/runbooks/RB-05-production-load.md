# RB-05 Production-Shaped Load (14 Workload Objectives)

**Status: OPEN — operator-blocked**
The load driver guard and browser driver are verified correct by self-test. A passing result requires a production-equivalent cell with real data volumes, a colocated load driver, and actual network/device conditions.

## Preconditions

- A production-shaped dataset exists: run `pnpm seed:build-load` against a staging cell to reach at least 20,000 active organizations with representative ticket/project/member distributions.
- The load driver (`load:drive`) can reach the staging cell from a colocated host (same region — network RTT < 1 ms to the API).
- `APP_BASE_URL` points to the staging cell.
- Chrome is reachable for the browser driver (headless).
- The 14 workload objectives are defined in `src/scripts/run-load-driver.mjs` (see `--list-objectives` if available).
- `LOAD_GEOGRAPHY=us-east-1` and `LOAD_DEVICE=desktop` are set for the primary run; a separate mobile/3G run covers the mobile objective.

## Step 1 — Seed production-shaped data

```bash
cd backend
node --env-file=.env src/scripts/seed-build-load.mjs
node --env-file=.env src/scripts/capture-build-baseline.mjs
# Verify row counts match declared distributions before load test.
```

## Step 2 — Run the full load driver

```bash
cd backend
# Primary run: desktop, good network, warm cache after first 30s
node --env-file=.env src/scripts/run-load-driver.mjs \
  --duration=600 \
  --workers=50 \
  --ramp-up=60 \
  --geography=us-east-1 \
  --device=desktop \
  --network=good \
  > /tmp/load-results.json 2>/tmp/load-stderr.txt

# Secondary run: mobile/3G
node --env-file=.env src/scripts/run-load-driver.mjs \
  --duration=300 \
  --workers=20 \
  --geography=us-east-1 \
  --device=mobile \
  --network=3g \
  >> /tmp/load-results.json

echo "EXIT:$?"
```

## Step 3 — Run the browser driver for FCP / TTFB

```bash
cd backend
node --env-file=.env src/scripts/browser-driver.mjs \
  --url="$APP_BASE_URL/build" \
  --iterations=20 \
  --device=desktop \
  > /tmp/browser-results.json 2>&1
```

## The 14 workload objectives

The load driver enforces these objectives (from `run-load-driver.mjs` internal catalog):
1. Ticket list — p95 < 300 ms
2. Board view — p95 < 300 ms
3. My work — p95 < 300 ms
4. Ticket detail — p95 < 300 ms
5. Sprint create — p95 < 500 ms
6. Ticket create — p95 < 500 ms
7. Global search — p95 < 500 ms
8. Dashboard/Home aggregate — p95 < 800 ms
9. Notification delivery — p95 < 1,000 ms (end-to-end)
10. Bulk import (100 tickets) — p95 < 3,000 ms
11. Report generation — p95 < 5,000 ms
12. AI summary — p95 < 8,000 ms (not counted against infra headroom)
13. Mobile ticket list — p95 < 500 ms (3G)
14. Burst: 2× normal RPS for 60 seconds — zero 5xx, no degraded p95

## Pass threshold

- All 14 objectives met simultaneously.
- Every latency objective met with **at least 40% sustained-resource headroom** (CPU, memory, connection pool < 60% utilization at sustained load).
- Burst target (objective 14) survived with zero 5xx and p95 within 20% of normal.
- `load:drive:self-test` passes (confirmed 2026-08-30):
  `SELF-TEST PASS: a breach is reported as BREACHED and an unsampled objective as NOT_DRIVEN — the guard can fail`
- `browser:measure:self-test` passes (confirmed 2026-08-30):
  `SELF-TEST PASS: 3 navigation(s), min TTFB=1.4ms — the browser driver can measure`

## Evidence recording

Save load-results.json and browser-results.json to `architecture-refactor/runbooks/evidence/RB-05-load-<date>/`.
Include: geography, device, network condition, seed row counts, peak CPU/memory/pool utilization, and the per-objective verdict table.

## Rollback

The load test writes no persistent data (uses disposable seed organizations). Scale the staging cell back to its normal compute tier after the test.
