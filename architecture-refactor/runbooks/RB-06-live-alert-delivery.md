# RB-06 Live Alert Delivery + Acknowledgement

**Status: OPEN — operator-blocked**
All 12 alert guard self-tests pass (11 delivery/dispatch probes + `check-alert-ack` guard). Live delivery requires `ALERT_WEBHOOK_URL`, `APP_RELEASE`, and a production log stream to be configured. Alert acknowledgement must be recorded by a human operator entering the drill nonce.

**Acknowledgement is now code-complete.** `drill-alert-system.mjs` sends a nonce to the webhook, prompts the operator to enter it from the alert channel, and writes `{ delivered, acked, nonce, sentAt, ackedAt }` to a state file. `check-alert-ack.mjs` reads that file and **exits 1** (LOUDLY fails) if no human has confirmed receipt. An unacknowledged critical alert is a silent failure mode — this check makes it visible and blocking.

## Preconditions

- `ALERT_WEBHOOK_URL` is set to a PagerDuty Events API v2 endpoint (or equivalent: OpsGenie, Slack with an integration key, or a generic webhook receiver).
- `APP_RELEASE` is set to the current deployed git SHA (`git rev-parse --short HEAD`).
- A production log stream (Axiom, Datadog, Loki, or equivalent) is ingesting application logs from the running API and the background worker process.
- Log format is structured JSON. Every log line includes: `release`, `cell`, `orgId`, `correlationId`, `route`, `message`.
- The on-call rotation is active in the chosen alerting platform.

## Step 1 — Configure environment

```bash
export ALERT_WEBHOOK_URL="https://events.pagerduty.com/v2/enqueue"
export ALERT_WEBHOOK_ROUTING_KEY="<your-pd-routing-key>"
export APP_RELEASE="$(git -C backend rev-parse --short HEAD)"
export CELL_ID="cell-us-01"
```

## Step 2 — Send a test event through every alert type

```bash
cd backend

# Send one test event through the dispatch system (verifies the webhook path):
node --env-file=.env src/scripts/alert-dispatch.mjs --test-event

# Then test each individual alert's predicate against a real emission:
node --env-file=.env src/scripts/alert-dead-outbox.mjs
node --env-file=.env src/scripts/alert-dead-delivery.mjs
node --env-file=.env src/scripts/alert-sig-failures.mjs
node --env-file=.env src/scripts/alert-tenant-ctx-errors.mjs
node --env-file=.env src/scripts/alert-p95.mjs
node --env-file=.env src/scripts/alert-seam-latency.mjs
node --env-file=.env src/scripts/alert-queue-age.mjs
node --env-file=.env src/scripts/alert-pool-saturation.mjs
node --env-file=.env src/scripts/alert-tenant-cost.mjs
```

## Step 3 — Verify predicate against a real log emission

Each alert reads from the live log stream. To confirm the predicate is not a hand-written fixture:

```bash
# 1. Deliberately trigger a 42501 (missing tenant GUC) in a dev/staging call:
#    POST to an endpoint without the GUC header, or cause a background job to run
#    without a tenant context.
# 2. Confirm the alert fires within the aggregation window (typically 60s).
# 3. Check that ALERT_WEBHOOK_URL receives the payload.
# 4. In the alerting platform, confirm the on-call engineer receives a notification.

# Alert predicate validation (from self-tests):
# alert:tenant-ctx-errors pattern: "permission denied for table outbox_events" OR "missing tenant context"
# alert:dead-outbox: looks for outbox_events rows older than 5 minutes with status != 'processed'
# alert:p95: reads from the metrics endpoint or structured trace log for p95 computation
```

## Step 4 — Record acknowledgement (interactive drill)

```bash
cd backend

# Run the interactive drill — sends a nonce to the webhook and waits for you to confirm it.
# Must be run in an interactive terminal (not CI/pipe).
node --env-file=.env src/scripts/drill-alert-system.mjs

# The script will:
#   1. Send a JSON payload with a unique nonce to ALERT_WEBHOOK_URL.
#   2. Prompt: "Enter the nonce from your alert channel to confirm ACK (or 'skip')"
#   3. Check your Slack/PagerDuty/OpsGenie channel — find the drill message.
#   4. Type the nonce and press Enter.
#   5. On match: writes { delivered: true, acked: true, nonce, sentAt, ackedAt } to state file.
#      Exit 0 = ACK confirmed.
#   6. On mismatch: writes { acked: false } and exits 1 — a 200 into the wrong channel is found.
#   7. Exit 2 = ALERT_WEBHOOK_URL not set (prerequisite missing — nothing was delivered).
#   8. Exit 3 = operator skipped ACK (delivered, not confirmed).

# After the drill, verify the gate passes:
node --env-file=.env src/scripts/check-alert-ack.mjs
# Exit 0 = ACK confirmed and within 24-hour TTL.
# Exit 1 = UNACKNOWLEDGED — the drill ran but no human confirmed the nonce.
# Exit 2 = prerequisite missing (no state file or ALERT_WEBHOOK_URL not set).

# The full alert system check (including ack gate) runs as:
node src/scripts/check-alert-system.mjs
# check-alert-ack.mjs is item 12 in the script list.
```

Pass threshold: `check-alert-ack.mjs` exits 0, meaning a human entered the correct nonce within the last 24 hours.

**Acknowledgement state file location:** `${OS_TMPDIR}/alert-drill-ack.json` (default). Override with `--state-file=` on both scripts.

## Expected output (dispatch self-test, already confirmed)

```json
{"dispatched":true,"alertId":"dead-outbox","dedupKey":"...","owner":"platform-reliability","severity":"critical"}
{"selfTest":true,"pass":true,"checks":{"case1Delivered":true,"case2Suppressed":true,"case3Delivered":true,"serverReceivedExactlyTwo":true,"case1BodyHasOwner":true,"case1BodyHasRunbook":true,"case1BodyHasAlertId":true}}
```

## Pass threshold

- `ALERT_WEBHOOK_URL` is set and the endpoint is reachable.
- `APP_RELEASE` is set to the current deployed SHA.
- Every alert script sends a payload to the webhook on `--test-event`.
- At least one alert fires against a real log emission (not a fixture).
- On-call platform records an acknowledgement within 5 minutes.

## Evidence recording

Save the webhook receiver log and the alerting platform acknowledgement screenshot to `architecture-refactor/runbooks/evidence/RB-06-alert-delivery-<date>/`.

## Self-test results (guard correctness, all confirmed 2026-08-30)

| Script | Self-test result |
|---|---|
| alert:dispatch | PASS — dedup, suppress, delivery, owner/runbook/alertId in body |
| alert:dead-outbox | PASS — fires on dead row, clears on stale row |
| alert:dead-delivery | PASS — fires on dead row, clears on stale row |
| alert:sig-failures | PASS — fires on failing endpoint, clears on stale |
| alert:tenant-ctx-errors | PASS — 2 matched, correct correlationId/orgId/route |
| alert:p95 | PASS — stale excluded, p95/p99 computed correctly |
| alert:seam-latency | PASS — db.query.execute breached, cache.roundtrip not |
| alert:queue-age | PASS — fresh clear, stale breaches, high retry fires |
| alert:pool-saturation | PASS — p95 breach fires, saturation warn fires |
| alert:tenant-cost | PASS — noisy org detected, normal clear |

All predicates are correct. Live delivery requires `ALERT_WEBHOOK_URL` and a production log stream.
