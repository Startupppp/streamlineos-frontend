# 40: Close observability and failure-runbook evidence

**What to build:** Operators can detect, diagnose and recover from queue, provider, tenant-context, latency and saturation failures across critical modules.

**Blocked by:** 20, 22, 23, 24, 25 and 38.

**Status:** partially done — three criteria closed, delivery to a human is operator-blocked

- [x] Logs/metrics/traces carry safe release, cell, tenant, principal and correlation context.
- [x] Queue age, retries, dead letters, signatures, latency, pool saturation and tenant cost alert below SLO breach.
- [x] Runbooks exercise provider outage, queue backlog, cache loss, database/cell failure and bad release.
- [ ] Test alerts and failure drills produce recorded operator evidence without exposing secrets.
      Drills and self-tests produce recorded evidence and no secret appears in any output. **But
      `ALERT_WEBHOOK_URL` is unset in every environment, so no alert this platform has ever raised has
      reached a person.** `alert-dispatch.mjs`'s self-test proves delivery and 60-minute deduplication
      against a real `node:http` server it starts itself, which proves the transport — not that anyone
      is listening. This box closes when an operator sets the variable.

## Criterion 1 — release was missing from every log line

`currentRelease()` existed at `common/observability/release.ts` and was read only by
`LogErrorReporter`, so the build identifier appeared on error reports and on nothing else. Correlating
a latency spike or an error rate with the deploy that caused it was not possible from the log stream.

`release` is now part of `ObservabilityContext` and is stamped in `correlationIdMiddleware` at request
entry alongside `cellId` — before authentication resolves, so it is present on the first log line of a
request that never gets as far as a user.

```
src/common/observability/observability-context.ts:22   release?: string;
src/common/http/correlation-id.middleware.ts:76        { correlationId, method, route, cellId: PROCESS_CELL_ID, release: currentRelease() }
src/common/logger/logger.service.ts:28                 ...(context?.release ? { release: context.release } : {}),
```

`log-context-completeness.spec.ts` asserts against the **parsed JSON of captured stdout**, not against
the input object, that a line carries all seven of `correlationId`, `cellId`, `release`, `orgId`,
`actorId`, `method`, `route`, and that the redactor still strips secrets from `meta`.

```
PASS src/common/observability/log-context-completeness.spec.ts
PASS src/common/logger/logger.service.spec.ts
Tests: 11 passed, 11 total
```

`APP_RELEASE` is optional and falls back to `"unknown"`, so this is inert until CI sets it to the
commit SHA — recorded below.

## Criterion 2 — three alerts were missing

Dead letters, webhook signatures and latency already had scripts. Queue age, pool saturation and
per-tenant cost did not, so a stalled outbox relay, a saturated connection pool and a noisy-neighbour
tenant were all undetectable from the log stream and the database alone.

| Script | Fires on | Self-test |
|---|---|---|
| `alert-queue-age.mjs` | oldest `PENDING` outbox row older than 300 s, or retry pressure over threshold | pass |
| `alert-pool-saturation.mjs` | `db.pool.wait` p95 over the 3 ms seam budget, or any saturation warning | pass |
| `alert-tenant-cost.mjs` | one org over 3× the median org's `ai_usage_logs.credits_milli` in the window, with a min-orgs guard | pass |

All three are registered in `alert-dispatch.mjs`'s registry with owner, severity and runbook anchor,
following the existing six entries.

```
$ pnpm alert:queue-age:self-test        PASS (exit 0)
$ pnpm alert:pool-saturation:self-test  PASS (exit 0)
$ pnpm alert:tenant-cost:self-test      PASS (exit 0)
$ pnpm alert:dispatch:self-test         PASS (exit 0)
```

**The queue-age alert fired on the dev database, and it was right.** It reported stale `PENDING`
outbox rows, which the orchestrator then diagnosed rather than dismissed:

```
accounting.journal.posted          PENDING   6 rows   max_retry 1   oldest 78 h
inventory.purchase_order.received  PENDING   1 row    max_retry 0   oldest  9 h
```

Enumerating `readonly eventType =` across the tree finds 12 registered consumers, and **neither of
these two event types is among them**. `OutboxPublisherService.deliver` throws
`no dispatch handler for event type '…'` on a registry miss, which retries eight times and then
dead-letters — the non-zero `retry_count` on the accounting rows is that mechanism already running.
Every journal posting (`accounting/posting/journal-posting.service.ts:297`) and every goods receipt
(`inventory/purchase-orders/grn.service.ts:364`) writes a row that can only ever become a dead letter.
Raised to S4 and to product in `CROSS-SESSION.md`; inventory is outside this PRD's scope and has no
owning session, so it needs one.

This is the alert doing its job on its first real run, which is the outcome to want — a new detector
that reports "all clear" on day one is more likely broken than correct.

`alert-tenant-cost.mjs` returns clear on the dev database because there is zero AI usage in the
window and the min-orgs guard correctly refuses to compare a median of nothing.
`alert-pool-saturation.mjs` exits 2 (no signal) without a live API log stream rather than exiting 0,
so an unreachable source can never be mistaken for a healthy one.

## Criterion 3 — five failure runbooks

`evidence/40-observability/FAILURE-RUNBOOKS.md`, one anchored section each for `#provider-outage`,
`#queue-backlog`, `#cache-loss`, `#database-cell-failure`, `#bad-release`, plus `#tenant-cost`. Each
carries the detection signal, first-five-minutes triage using commands that exist in this repository,
containment, recovery and verification. They reference rather than duplicate the c28 `RUNBOOKS.md`
(six alert-level triage runbooks) and `CELL-RUNBOOK.md` (backup, restore, relocation, degraded
control plane), and cite c28-31's recorded dependency-removal results.

`failure-drill.mjs` exercises them, dry-run by default:

```
$ pnpm failure-drill:self-test                                   pass
$ node src/scripts/failure-drill.mjs --execute --drill=database-cell-failure   pass (ECONNREFUSED caught, pool self-test 4/4)
$ node src/scripts/failure-drill.mjs --execute --drill=queue-backlog           pass (ageSecs 20400 > 300, transaction rolled back)
$ node src/scripts/failure-drill.mjs --execute --drill=cache-loss              blocked — shared Redis, by design
```

The queue-backlog drill injects its stale row inside a transaction it then rolls back, so it proves
detection without leaving a row behind. The cache-loss drill refuses to run against shared Redis
rather than flushing a database four other sessions are using — a refusal, and it is recorded as one
rather than reported as a pass.

## Still open

1. **`ALERT_WEBHOOK_URL` is unset**, so no alert has ever paged anyone. Operator action; no code change.
2. **`APP_RELEASE` is unset**, so `release` logs as `"unknown"` until CI sets it to the commit SHA.
3. **`alert-pool-saturation.mjs` needs a live log stream** to exercise its detection path end to end;
   the logic is proved by self-test, the wiring is a `journalctl`/log-file pipe in deployment.
4. **`bad-release` drill cannot prove full log propagation** from a `.mjs` script, because the modules
   it would import are CommonJS under ts-node. `log-context-completeness.spec.ts` covers that path
   completely; the drill states the limitation in its own output instead of claiming a pass.

## Blocker note

Listed as blocked by 20, 22–25 and 38. Ticket 22 is this session's and is closed. The remaining four
convert specific domains onto the **shared** outbox, which already existed — so queue age, retries and
dead letters are observable for every producer regardless of how many have migrated. Nothing here
waits on them, and the stale-row finding above is evidence the alerting works on producers that have
already migrated.

## Files

- `backend/src/scripts/{alert-queue-age,alert-pool-saturation,alert-tenant-cost,failure-drill}.mjs`
- `backend/src/scripts/alert-dispatch.mjs` — three registry entries
- `backend/src/common/observability/observability-context.ts` · `common/http/correlation-id.middleware.ts` · `common/logger/logger.service.ts`
- `backend/src/common/observability/log-context-completeness.spec.ts`
- `backend/package.json` — `alert:queue-age`, `alert:pool-saturation`, `alert:tenant-cost`, `failure-drill` (+ self-tests)
- `architecture-refactor/final-refactor/evidence/40-observability/` — runbooks and four evidence files
