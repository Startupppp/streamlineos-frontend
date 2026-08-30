# Alert self-test evidence

All commands run in `backend/` on 2026-08-29. `ALERT_WEBHOOK_URL` is unset — real delivery is operator-blocked.

---

## alert-queue-age.mjs --self-test

```
$ node src/scripts/alert-queue-age.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"freshRowClear":true,"staleRowAgeBreaches":true,"highRetryBreachesRetryPressure":true,"combinedPicksUpStale":true,"worstOrgsOrdered":true},"thresholdSecs":300,"retryPressureThreshold":500}
```

Exit 0. Both firing cases (stale row, high retry count) and the non-firing case (fresh row) verified.

---

## alert-pool-saturation.mjs --self-test

```
$ node src/scripts/alert-pool-saturation.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"case1P95BreachFiresWhenSingleOutlierPushesP95Over3ms":true,"case2AllUnder3msClear":true,"case3SaturationWarnFires":true,"case4StaleSpanExcluded":true},"budget":{"seam":"db.pool.wait","thresholdMs":3}}
```

Exit 0. p95 breach (10ms over 3ms budget), saturation-warn detection, stale-span exclusion, and clear path all pass.

---

## alert-tenant-cost.mjs --self-test

```
$ node src/scripts/alert-tenant-cost.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"noisyOrgDetected":true,"allNormalClear":true,"tooFewOrgsClear":true},"case1":{"fired":true,"noisy":[{"org_id":"org_noisy","total_credits":10000,"request_count":1000,"top_feature":"bulk-summarise"}],"medianCredits":100}}
```

Exit 0. Noisy-neighbour detection fires (10000 vs. median 100, threshold 300 at 3x). All-normal-clear and too-few-orgs-clear cases both pass.

---

## alert-dispatch.mjs --self-test

```
$ node src/scripts/alert-dispatch.mjs --self-test
{"dispatched":true,"alertId":"dead-outbox","dedupKey":"cab11b2602e8ba76","owner":"platform-reliability","severity":"critical"}
{"dispatched":false,"suppressed":true,"dedupKey":"cab11b2602e8ba76","alertId":"dead-outbox","suppressedUntil":"..."}
{"dispatched":true,"alertId":"dead-outbox","dedupKey":"0ae2b6548684acd6","owner":"platform-reliability","severity":"critical"}
{"selfTest":true,"pass":true,"checks":{"case1Delivered":true,"case2Suppressed":true,"case3Delivered":true,"serverReceivedExactlyTwo":true,"case1BodyHasOwner":true,"case1BodyHasRunbook":true,"case1BodyHasAlertId":true,"case3BodyDifferentBreach":true}}
```

Exit 0. Delivery, deduplication, and suppression all confirmed. HTTP server received exactly 2 payloads (same breach suppressed, different breach delivered). Note: `ALERT_WEBHOOK_URL` was NOT used — the self-test spins up its own `node:http` server on an ephemeral port. Real delivery is operator-blocked until `ALERT_WEBHOOK_URL` is set.

---

## failure-drill.mjs --self-test

```
$ node src/scripts/failure-drill.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"allFiveDrillsPresent":true,"allDrillsReturnDryRunWithoutExecuteFlag":true,"cacheLossBlockedInExecuteMode":true},"drills":["provider-outage","queue-backlog","cache-loss","database-cell-failure","bad-release"]}
```

Exit 0. All five drills present, dry-run by default, cache-loss blocked in execute mode.

---

## Secret exposure check

None of the scripts emit `DATABASE_URL`, `INTERNAL_API_SECRET`, `ALERT_WEBHOOK_URL`, passwords, tokens, or correlation IDs from real requests. All output fields are structural (`fired`, `rows`, `checks`, etc.). The redactor in `logger.service.ts` strips keys matching `password`, `secret`, `token`, `authorization`, `apikey`, `credential`, and `connectionstring`; `log-context-completeness.spec.ts` asserts this path for the logger.

`DATABASE_URL` is consumed by the postgres driver; it is never written to stdout or stderr.
