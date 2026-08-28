# Failure drill evidence

Commands run in `backend/` on 2026-08-29. DATABASE_URL = owner role (Neon dev). No data was permanently changed.

---

## --self-test (dry-run mode, all drills)

```
$ node src/scripts/failure-drill.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"allFiveDrillsPresent":true,"allDrillsReturnDryRunWithoutExecuteFlag":true,"cacheLossBlockedInExecuteMode":true},"drills":["provider-outage","queue-backlog","cache-loss","database-cell-failure","bad-release"]}
```

Exit 0.

---

## --execute --drill=database-cell-failure

Attempts an invalid Postgres connection (ECONNREFUSED), confirms error class is caught, and runs pool-saturation self-test.

```
$ node src/scripts/failure-drill.mjs --execute --drill=database-cell-failure
{"drill":"database-cell-failure","outcome":"pass","detail":{
  "connectionErrorCaught":true,
  "errorClass":"ECONNREFUSED",
  "poolSelfTest":{
    "selfTest":true,"pass":true,
    "checks":{
      "case1P95BreachFiresWhenSingleOutlierPushesP95Over3ms":true,
      "case2AllUnder3msClear":true,
      "case3SaturationWarnFires":true,
      "case4StaleSpanExcluded":true
    }
  }
}}
```

Exit 0. ECONNREFUSED is the expected class for an unreachable DB host. Pool-saturation self-test passes (4/4 checks).

---

## --execute --drill=queue-backlog

Inserts a synthetic PENDING outbox row with a 20400-second-old timestamp inside a transaction, reads it back, confirms age > 300 s threshold, then rolls back.

```
$ node src/scripts/failure-drill.mjs --execute --drill=queue-backlog
{"drill":"queue-backlog","outcome":"pass","detail":{
  "insertedEventId":"79fe54ba-0ec9-4f57-915b-1a6e74fa45b2",
  "ageSecs":20400,
  "rowCount":1
}}
```

Exit 0. The row was found inside the transaction (ageSecs 20400 > 300), confirming the queue-age alert would fire. The transaction was intentionally rolled back — no row persists in the database.

---

## --execute --drill=cache-loss

```
$ node src/scripts/failure-drill.mjs --execute --drill=cache-loss
{"drill":"cache-loss","outcome":"blocked","detail":{
  "reason":"FLUSHDB on a shared Redis drops every org's permissions and sessions. Execute only against a dedicated dev Redis. Command: redis-cli -u $REDIS_URL FLUSHDB",
  "detectSignal":"..."
}}
```

Blocked by design. Cache-loss execute mode is intentionally refused on a shared Redis to prevent dropping all permissions and sessions across orgs. The command is documented for operator use on a dedicated dev Redis.

---

## Operator note: ALERT_WEBHOOK_URL

`ALERT_WEBHOOK_URL` is unset in this environment. Alert scripts fire (exit 1) when their threshold is exceeded but cannot deliver to an oncall system. Set this env var in the deployment environment to wire exit-code 1 to PagerDuty, Opsgenie, a Slack webhook, etc.

The `alert-dispatch.mjs --self-test` proves delivery works by spinning up its own `node:http` server on an ephemeral port. That path is confirmed; the production delivery requires the env var.
