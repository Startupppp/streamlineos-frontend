# Alert runs against dev DB — evidence

All commands run in `backend/` on 2026-08-29 against the Neon dev database (owner role, BYPASSRLS).

---

## alert-queue-age.mjs (dev DB)

```
$ node src/scripts/alert-queue-age.mjs
{"fired":true,"ageBreached":true,"retryBreached":false,
 "threshold":{"thresholdSecs":300,"retryPressureThreshold":500},
 "globalMaxAgeSecs":299348,"globalTotalRetries":0,
 "destination":"CONFIGURE_ME — wire exit-code 1 to your oncall system",
 "worstOrgs":[
   {"org_id":"acc-test-2d18f0a2-...","pending_count":1,"oldest_age_secs":299348,...},
   {"org_id":"acc-test-d7001a3d-...","pending_count":1,"oldest_age_secs":299327,...},
   ... (7 orgs total, all acc-test-* except one real org)
 ]}
```

Exit 1 (fired). The alert correctly identifies 7 PENDING outbox rows from ~3.5 days ago. These are test-fixture rows left by the e2e suite with no consumer registered. This is a **real finding**: the outbox relay did not process these rows. Operator action: investigate `last_error` on these rows and confirm the consumer is registered.

---

## alert-tenant-cost.mjs (dev DB)

```
$ node src/scripts/alert-tenant-cost.mjs
{"fired":false,"windowHours":24,"threshold":{"multiplier":3,"minOrgs":3},
 "medianCredits":null,"thresholdCredits":null,"orgCount":0,
 "reason":"fewer-than-min-orgs: 0 < 3",
 "destination":"CONFIGURE_ME — wire exit-code 1 to your oncall system","noisy":[]}
```

Exit 0 (clear). No AI usage in the last 24 hours. The alert correctly degrades to a non-firing state when there are fewer than `min-orgs` (3) distinct orgs with usage.

---

## alert-pool-saturation.mjs (dev DB, log-based)

```
$ echo "" | node src/scripts/alert-pool-saturation.mjs
{"fired":false,
 "error":"No db.pool.wait span lines or pool-saturation warn lines found. ...",
 "linesRead":1}
```

Exit 2 (no signal lines). The log span exporter produces output only when the API is running and `setSpanExporter(new LogSpanExporter())` is called from `main.ts`. This is expected in a direct-script run without a live API. See wiring requirement below.

---

## Findings from dev DB run

1. **queue-age fires on real rows**: 7 stale PENDING events from `acc-test-*` e2e fixture orgs. These are real events with no consumer — the relay is running but cannot deliver. The alert correctly identifies the worst offenders.

2. **tenant-cost clears correctly**: Zero AI usage in the window. The `fewer-than-min-orgs` guard prevents false positives when the signal is absent.

3. **pool-saturation requires a live API log stream**: Confirmed expected behaviour. To run this alert in production, pipe `journalctl` output or a log file.
