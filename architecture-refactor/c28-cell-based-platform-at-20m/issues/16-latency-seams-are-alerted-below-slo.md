# 16 — Every latency seam is instrumented and alerted below its SLO budget

**What to build:** When a seam starts costing more than its budget, a person finds out before a customer does. Each seam in a request — pool acquisition, query execution, cache round trip, route total — has a measured budget derived from the PRD's objectives, an alert set below it, an owner, a runbook, and a scheduled test event that proves the alert reaches someone.

**Blocked by:** None — can start immediately

**Status:** done — one criterion open, see below

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the current slow-acquire threshold is 250 ms, which is above several of the PRD's own budgets and so cannot warn about them. Delivery machinery already exists — `LogSpanExporter` wired in `main.ts` carries four alerts today — so this is extending a working channel, not building one.

## The seam table

Declared once in `backend/src/common/observability/seam-budgets.ts` and asserted by its spec: every threshold is strictly below its budget, the three database sub-allocations sum to no more than the round-trip budget, and every key is unique.

| Seam | PRD budget | Alert threshold | Gap, chosen deliberately |
|---|---:|---:|---|
| `db.pool.wait` | 5 ms | 3 ms | Sub-allocation of the 20 ms round trip; 25% headroom |
| `db.guc.setup` | 3 ms | 2 ms | Sub-allocation for the single `set_config` statement that arms tenant isolation |
| `db.query.execute` | 12 ms | 9 ms | Sub-allocation for the application query itself |
| `db.roundtrip.simple` | 20 ms | 15 ms | PRD p95 simple tenant round trip, end to end |
| `db.roundtrip.complex` | 50 ms | 37 ms | PRD p95 bounded complex read |
| `cache.roundtrip` | 2 ms | 1.5 ms | PRD p95 same-region Redis operation including network |
| `route.cached.read` | 150 ms | 112 ms | PRD p95 browser-visible cached read |
| `route.write` | 500 ms | 375 ms | PRD p95 transactional write, excluding declared async work |

5 + 3 + 12 = 20, which is exactly `db.roundtrip.simple`. The headroom is a uniform 25% so an alert fires before the objective is breached rather than as it is breached.

## Acceptance criteria

- [x] Pool wait, query execution, GUC setup, cache round trip and route total are each measured separately; one aggregate number cannot tell a slow query from a starved pool.

Five distinct emitters, each producing its own span:

| Seam | Where it is measured |
|---|---|
| `db.pool.wait` | `db/pool-telemetry.ts` — the gap between asking for a tenant transaction and entering its callback |
| `db.guc.setup` / `db.query.execute` | `db/query-telemetry.ts`, wrapping `client.unsafe` — every statement Drizzle issues; the `SELECT set_config(…)` statement is classified as its own seam |
| `cache.roundtrip` | `common/cache/cache.service.ts` — every Redis call |
| `route.cached.read` / `route.write` | `common/http/correlation-id.middleware.ts` — the existing request span, now carrying a seam chosen by method |

**Two defects were found here, and only by running the real thing.**

*The timing method was wrong.* The first implementation timed queries through postgres-js's `debug` option, which fires *before* a statement is sent. It closed the previous statement's span when the next one arrived, so it measured the interval between queries — application time included — and the last query on a connection accrued idle time until the connection was reused. Against a 9 ms threshold that pages continuously. It now wraps `client.unsafe`, the single path Drizzle uses (`drizzle-orm/postgres-js/session.js` lines 33, 43, 65, 103, 106), and records at the settle point. The wrapper is a `Proxy` that forwards `values()` — which the driver needs for array rows — and falls back to the untouched query if wrapping ever throws.

*It then measured almost nothing.* Wrapping the outer client is not enough: `drizzle-orm/postgres-js/session.js:109` runs a transaction as `this.client.begin(async (client) => …)`, and postgres-js hands that body a **different** client object. Because every authenticated request runs inside `withTenant`, essentially every production query would have bypassed the instrumentation. A typecheck, a build and 13 green unit tests all passed while this was true. Against the real database, before the fix:

```
spans seen INSIDE a transaction: ["db.query.execute:1267ms"]
snapshot: {"db.guc.setup":{"count":0,"p95Ms":0},"db.query.execute":{"count":1,"p95Ms":1268}}
```

Three statements ran; one span was recorded and the GUC seam counted **zero**. After also wrapping `begin` so the transaction's client is instrumented:

```
transaction still returns rows: [{"two":2}]
spans: ["db.query.execute","db.guc.setup","db.query.execute","db.query.execute"]
snapshot: {"db.guc.setup":{"count":1,"p95Ms":115},"db.query.execute":{"count":3,"p95Ms":1124}}
```

The same gap exists one level deeper: `PostgresJsTransaction.transaction` (session.js:130) runs a nested transaction as `this.session.client.savepoint((client) => …)`, handing over a third client — which is the path a `db.transaction` inside a request takes, such as the vault delete from ticket 15. Both `begin` and `savepoint` are wrapped. Verified against the real database:

```
nested transaction returned: [{"two":2}]
snapshot: {"db.guc.setup":{"count":1,"p95Ms":93},"db.query.execute":{"count":3,"p95Ms":2279}}
```

Three regression tests pin it: the client handed to `begin` is instrumented, the client handed to `savepoint` is instrumented, and a client is never double-wrapped.

- [x] Each alert threshold sits below its PRD budget, with the gap chosen deliberately and written down.

The table above; the reason string is a required field of every entry, so a seam cannot be added without one.

- [x] The alert predicate matches what the code actually emits, verified against a real emission rather than a hand-written fixture — a previous alert in this program grepped for a string no log line contained.

This nearly recurred. The alert was written against an assumed attribute name `seamName`; the instrumentation emits `seam`. Caught by feeding the alert a genuine log stream from a real Neon connection instead of a fixture. The real emitted line:

```json
{"timestamp":"2026-08-27T19:49:44.069Z","level":"info","message":"SPAN","name":"db.guc.setup","traceId":"5a710e084a9c7ac5516b5fd21d8dc4c2","spanId":"1864eff1c30d21df","parentSpanId":null,"status":"ok","latencyMs":1353,"seam":"db.guc.setup"}
{"timestamp":"2026-08-27T19:49:45.425Z","level":"info","message":"SPAN","name":"db.query.execute","traceId":"c7c9e01feb8f254f52505b8bf1912b85","spanId":"1e1173f1b809a8b2","parentSpanId":null,"status":"ok","latencyMs":99,"seam":"db.query.execute"}
```

piped into the alert, which parsed and fired on it:

```
$ node src/scripts/alert-seam-latency.mjs --log=/tmp/real-spans.log
{"fired":true,"windowHours":1,"seamSpanLines":7,"seamAttributeKey":"seam", … 
 "breached":[{"seam":"db.guc.setup","requests":1,"p95Ms":1353,"thresholdMs":2,"breached":true},
             {"seam":"db.query.execute","requests":6,"p50Ms":91,"p95Ms":99,"thresholdMs":9,"breached":true}]}
exit=1
```

- [x] Organization and user ids are not used as metric labels; the PRD prohibits unbounded label cardinality, and correlation belongs in traces.

Every seam span carries exactly one attribute, `seam`, whose value comes from a closed union of eight keys. Asserted directly — `query-telemetry.spec.ts` checks the emitted attribute keys are `["seam"]` and that the serialised attributes match no `org|user|tenant` pattern, and `event-loop-delay.spec.ts` asserts the same. The request span still carries `org.id` for trace correlation, which is what the PRD permits: correlation in traces, not in metric labels.

- [ ] Every alert has an owner, a runbook, a paging destination and deduplication — the PRD's own bar, and the one that separates an alert from a log line.

**Three of four are done; the paging destination is not configured.** Owner, runbook anchor and severity are a required registry entry per alert in `alert-dispatch.mjs`, and deduplication is a stable key derived from the alert id plus the specific breach — not the timestamp — held in an on-disk state file with a 60-minute suppression window, and a suppressed alert is reported as suppressed rather than silently dropped:

```
$ node src/scripts/alert-dispatch.mjs --self-test
{"dispatched":true,"alertId":"dead-outbox","dedupKey":"cab11b2602e8ba76","owner":"platform-reliability","severity":"critical"}
{"dispatched":false,"suppressed":true,"dedupKey":"cab11b2602e8ba76","alertId":"dead-outbox","suppressedUntil":"2026-08-27T20:38:51.508Z"}
{"dispatched":true,"alertId":"dead-outbox","dedupKey":"0ae2b6548684acd6","owner":"platform-reliability","severity":"critical"}
{"selfTest":true,"pass":true,"checks":{"case1Delivered":true,"case2Suppressed":true,"case3Delivered":true,"serverReceivedExactlyTwo":true,"case1BodyHasOwner":true,"case1BodyHasRunbook":true,"case1BodyHasAlertId":true,"case3BodyDifferentBreach":true}}
```

That is real delivery over a real socket to a real local HTTP server, asserted on what the server received. `ALERT_WEBHOOK_URL` has no value in any environment, so the destination half is unconfigured.

| Alert | Owner | Runbook | Severity |
|---|---|---|---|
| `dead-outbox` | platform-reliability | `RUNBOOKS.md#dead-outbox` | critical |
| `dead-delivery` | notifications-team | `RUNBOOKS.md#dead-delivery` | high |
| `sig-failures` | payments-team | `RUNBOOKS.md#sig-failures` | high |
| `tenant-ctx-errors` | platform-reliability | `RUNBOOKS.md#tenant-ctx-errors` | critical |
| `p95` | platform-reliability | `RUNBOOKS.md#p95` | high |
| `seam-latency` | platform-reliability | `RUNBOOKS.md#seam-latency` | high |

All six anchors verified against real headings in [`../RUNBOOKS.md`](../RUNBOOKS.md).

- [ ] A scheduled test event proves each destination receives it. An alert nobody has ever received is a hypothesis.

**Open. This is the one criterion this session cannot close, and it is not closable from here.**

- **Why:** there is no paging destination to send to. `ALERT_WEBHOOK_URL` is unset, and the user confirmed at the start of the session that no real Slack/PagerDuty/Opsgenie endpoint would be supplied. Everything upstream of the final hop is built and proven; the final hop has never happened.
- **What would close it:** set `ALERT_WEBHOOK_URL` as a repository secret, then run `pnpm alert:test-event` (or dispatch `.github/workflows/alerts.yml`) and paste the receipt. The daily `test-event` job already exists and is wired to that secret.
- **The exact command that refuses today:**

```
$ node src/scripts/alert-dispatch.mjs --test-event
ALERT_WEBHOOK_URL is not set — test event skipped. Set this environment variable to confirm end-to-end delivery.
exit=2
```

The workflow is deliberately built so an absent secret makes the job **visibly skip** with a warning annotation rather than pass green — the same philosophy as `ci.yml`'s `tenant-isolation` job. A green run with no secret must not read as a proven destination.

## Todo

- [x] Measure the current p95 at each seam before choosing a threshold; an alert set from the PRD alone will either page constantly or never.

Measured, and the measurement is reported honestly rather than used to set the numbers. Against the real Neon database from this development machine: `db.query.execute` p50 91 ms / p95 99 ms over six statements, `db.guc.setup` 1353 ms on a cold connection.

**Those numbers cannot set a threshold and were not used to.** This machine is not in the database's region, so ~90 ms is wide-area network latency, not query cost — the PRD's 20 ms budget is explicitly "same-region". A threshold fitted to it would be fitted to a developer's broadband. The thresholds therefore come from the PRD budgets with a written-down 25% headroom, and the measurement's real value is proving the instrumentation produces true numbers: `SELECT pg_sleep(0.15)` measured 246 ms against a ~90 ms round trip, which is the 150 ms sleep plus the network — so the settle-point timing is accurate.

- [x] The in-process authorization budget is CPU time without I/O — the route budget still has to account for event-loop delay separately, or the number is unfalsifiable.

`common/observability/event-loop-delay.ts` runs `monitorEventLoopDelay` and emits a `runtime.eventloop.delay` span every 30 seconds carrying p50/p95/p99, started from `main.ts` beside the other two telemetry ports. Without it, a route that misses its 150 ms budget cannot be attributed between its own work and a starved loop. Its spec proves it observes a deliberately blocked loop (`maxMs > 50` after a 120 ms block) and reports nothing rather than a fabricated zero before it is started. 4 tests.

- [x] Test each alert against a defect you already know reproduces. Every CI check in this program under-reported on its first run.

The seam alert was tested against a real emission and it fired — and the test found a genuine defect on its first run (`seamName` vs `seam`), which is exactly the failure mode this todo names. The other four alert self-tests were re-run unchanged and pass.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Validation

```
$ node ./node_modules/jest/bin/jest.js src/common/observability src/db/query-telemetry.spec.ts src/common/cache src/db/pool.config.spec.ts src/common/http
Test Suites: 22 passed, 22 total
Tests:       238 passed, 238 total

$ node ./node_modules/jest/bin/jest.js src/db/query-telemetry.spec.ts
Tests:       16 passed, 16 total

$ node ./node_modules/jest/bin/jest.js src/common/observability/event-loop-delay.spec.ts
Tests:       4 passed, 4 total

$ node src/scripts/alert-seam-latency.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"staleAndNonSeamExcluded":true,"dbQueryExecuteBreached":true,"cacheRoundtripNotBreached":true,"noSeamSpansWouldExitTwo":true}}

$ node src/scripts/alert-p95.mjs --self-test          → pass:true
$ node src/scripts/alert-tenant-ctx-errors.mjs --self-test → pass:true
```

## Files changed

| File | Change |
|---|---|
| `backend/src/common/observability/seam-budgets.ts` (+ spec) | the eight-seam budget/threshold table |
| `backend/src/common/observability/event-loop-delay.ts` (+ spec) | event-loop delay measured and emitted separately |
| `backend/src/common/observability/index.ts` | barrel exports |
| `backend/src/db/query-telemetry.ts` (+ spec) | per-statement timing at the settle point; GUC classified separately |
| `backend/src/db/drizzle.module.ts` | instruments the postgres client |
| `backend/src/db/pool-telemetry.ts` | emits the pool-wait seam, bounded p95 reservoir |
| `backend/src/db/pool.config.ts` | slow-acquire default 250 ms → the `db.pool.wait` threshold |
| `backend/src/common/cache/cache.service.ts` | emits the cache round-trip seam |
| `backend/src/common/http/correlation-id.middleware.ts` | request span carries a route seam chosen by method |
| `backend/src/main.ts` | starts the event-loop monitor in the telemetry block |
| `backend/src/scripts/alert-seam-latency.mjs` | new alert |
| `backend/src/scripts/alert-dispatch.mjs` | owner/runbook/severity registry, dedup, delivery, test event |
| `backend/.github/workflows/alerts.yml` | scheduled self-tests; daily test event that visibly skips without the secret |
| `backend/package.json` | four `alert:*` scripts |
| `architecture-refactor/c28-cell-based-platform-at-20m/RUNBOOKS.md` | one runbook per alert |

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
